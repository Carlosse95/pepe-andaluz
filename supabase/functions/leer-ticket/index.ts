// Lee la foto de un ticket y devuelve los datos del gasto ya escritos:
// en que tienda fue, que dia y cuanto se pago.
//
// La foto ya esta en el bucket privado `tickets`; aqui solo se baja, se le
// pregunta al modelo que dice, y se contesta con los tres datos. Quien decide
// si estan bien sigue siendo Pepe: la app los deja escritos pero editables.
//
// La llave de Anthropic vive en los secretos de Supabase, nunca en el codigo
// ni en el repositorio, que es publico.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import Anthropic from "npm:@anthropic-ai/sdk";

// Un ticket de super rara vez pasa de esto. Poner un tope evita que una foto
// enorme se lleve el tiempo y el dinero de una lectura que igual iba a fallar.
const MAXIMO_BYTES = 5 * 1024 * 1024;

const FORMATOS: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

// Lo que se espera de vuelta. Se pide con esquema para que llegue siempre en
// la misma forma y no haya que adivinar del texto libre.
const ESQUEMA = {
  type: "object",
  properties: {
    tienda: {
      anyOf: [{ type: "string" }, { type: "null" }],
      description:
        "Nombre de la tienda como se lee en el ticket, sin razon social ni sucursal. Ej: Chedraui, Costco, Soriana, Sam's, Aki. null si no se distingue.",
    },
    fecha: {
      anyOf: [{ type: "string" }, { type: "null" }],
      description: "Fecha de la compra en formato AAAA-MM-DD. null si no se distingue.",
    },
    total: {
      anyOf: [{ type: "number" }, { type: "null" }],
      description:
        "El total pagado, el renglon que dice TOTAL (no el subtotal ni el efectivo entregado ni el cambio). Solo el numero. null si no se distingue.",
    },
    confianza: {
      type: "string",
      enum: ["alta", "media", "baja"],
      description: "Que tan clara se ve la foto: alta si se lee sin esfuerzo, baja si esta borrosa o cortada.",
    },
  },
  required: ["tienda", "fecha", "total", "confianza"],
  additionalProperties: false,
};

const INSTRUCCIONES = `Eres quien captura los gastos de un negocio de paellas en Mérida, Yucatán, México.

Te llega la foto de un ticket de compra y devuelves tres cosas: la tienda, la fecha y el total.

Cómo leerlo:
- El **total** es el renglón que dice TOTAL. No es el subtotal, ni el IVA, ni el efectivo que entregó el cliente, ni el cambio. Si aparecen varios, el que vale es el que se cobró.
- La **fecha** viene en formato mexicano (día/mes/año). Devuélvela como AAAA-MM-DD.
- La **tienda** es el nombre comercial tal como lo conoce la gente: "Chedraui", no "Tiendas Chedraui S.A. de C.V. Sucursal Montejo".

Un dato que no se distingue se devuelve como null. Prefiere null antes que adivinar: un número inventado se convierte en un gasto equivocado en las cuentas del negocio, y nadie lo va a notar.`;

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return json({ error: "Usa POST." }, 405);
  }

  const llave = Deno.env.get("ANTHROPIC_API_KEY");
  if (!llave) {
    return json(
      { error: "Falta configurar la llave de lectura. Ponla en Supabase → Edge Functions → Secrets como ANTHROPIC_API_KEY." },
      501,
    );
  }

  let ruta = "";
  try {
    ({ ruta } = await req.json());
  } catch {
    return json({ error: "No se entendió la petición." }, 400);
  }
  if (!ruta || typeof ruta !== "string") {
    return json({ error: "Falta la ruta de la foto." }, 400);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: archivo, error } = await supabase.storage.from("tickets").download(ruta);
  if (error || !archivo) {
    return json({ error: "No se encontró la foto." }, 404);
  }
  if (archivo.size > MAXIMO_BYTES) {
    return json({ error: "La foto pesa demasiado para leerla." }, 413);
  }

  const extension = (ruta.split(".").pop() || "jpg").toLowerCase();
  const tipo = FORMATOS[extension];
  if (!tipo) {
    return json({ error: "Ese tipo de archivo no se puede leer." }, 415);
  }

  const bytes = new Uint8Array(await archivo.arrayBuffer());

  const anthropic = new Anthropic({ apiKey: llave });
  let respuesta;
  try {
    respuesta = await anthropic.messages.create({
      model: "claude-opus-5",
      max_tokens: 8000,
      system: INSTRUCCIONES,
      // Leer un ticket no necesita deliberar; el esfuerzo bajo lo hace más
      // rápido y más barato sin perder precisión en algo tan acotado.
      output_config: {
        effort: "low",
        format: { type: "json_schema", schema: ESQUEMA },
      },
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: tipo, data: base64(bytes) } },
            { type: "text", text: "¿Qué dice este ticket?" },
          ],
        },
      ],
    });
  } catch (e) {
    console.error("Falló la lectura del ticket", e);
    return json({ error: "No se pudo leer el ticket en este momento." }, 502);
  }

  // Una negativa del modelo llega como respuesta buena, no como error: si no
  // se revisa, `content` viene vacío y el siguiente renglón truena.
  if (respuesta.stop_reason === "refusal") {
    return json({ error: "No se pudo leer esta foto." }, 422);
  }

  const texto = respuesta.content.find((b) => b.type === "text");
  if (!texto || texto.type !== "text") {
    return json({ error: "La lectura llegó vacía." }, 502);
  }

  try {
    const datos = JSON.parse(texto.text);
    return json({ datos });
  } catch {
    return json({ error: "La lectura llegó en un formato que no se entiende." }, 502);
  }
});

const base64 = (bytes: Uint8Array) => {
  // En trozos: pasarle el arreglo entero a String.fromCharCode revienta la
  // pila con fotos de unos pocos megas.
  let binario = "";
  const TROZO = 0x8000;
  for (let i = 0; i < bytes.length; i += TROZO) {
    binario += String.fromCharCode(...bytes.subarray(i, i + TROZO));
  }
  return btoa(binario);
};

const json = (cuerpo: unknown, status = 200) =>
  new Response(JSON.stringify(cuerpo), {
    status,
    headers: { "content-type": "application/json" },
  });
