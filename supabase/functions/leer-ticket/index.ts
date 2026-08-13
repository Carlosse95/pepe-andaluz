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
    folio: {
      anyOf: [{ type: "string" }, { type: "null" }],
      description:
        "El numero con el que el portal de esa tienda identifica la compra, sin espacios. null si no se distingue.",
    },
    folio2: {
      anyOf: [{ type: "string" }, { type: "null" }],
      description:
        "Segundo numero cuando el ticket trae dos (Sam's: el TR#). null cuando no aplica.",
    },
    confianza: {
      type: "string",
      enum: ["alta", "media", "baja"],
      description: "Que tan clara se ve la foto: alta si se lee sin esfuerzo, baja si esta borrosa o cortada.",
    },
  },
  required: ["tienda", "fecha", "total", "folio", "folio2", "confianza"],
  additionalProperties: false,
};

const INSTRUCCIONES = `Eres quien captura los gastos de un negocio de paellas en Mérida, Yucatán, México.

Te llega la foto de un ticket de compra. Devuelves los datos con los que después se pide la factura.

**El total** es el renglón que dice TOTAL. No es el subtotal, ni el IVA, ni el efectivo que entregó el cliente, ni el cambio. Si aparecen varios, el que vale es el que se cobró.

**La fecha** viene en formato mexicano (día/mes/año). Devuélvela como AAAA-MM-DD.

**La tienda** es el nombre comercial tal como lo conoce la gente: "Chedraui", no "Tiendas Chedraui S.A. de C.V. Sucursal Montejo".

**El folio** es el número con el que el portal de esa tienda identifica la compra. Cambia según la tienda:

- **Chedraui**: el folio de 19 dígitos, hasta abajo, arriba del código de barras. Suele venir como ***FOLIO:2608 0811 1200 7803 0106***. Devuélvelo sin espacios ni asteriscos.
- **Costco**: el número de ticket, debajo del código de barras.
- **Soriana**: el número de ticket, justo debajo del código de barras.
- **Sam's**: trae DOS. En \`folio\` va el TC# de 20 dígitos (abajo, sobre el código de barras) y en \`folio2\` el TR# de 3 o 4 dígitos (arriba).
- **Aki**: el número de ticket o folio que aparezca.
- Otra tienda: el número que más se parezca a un folio de ticket.

Un dato que no se distingue se devuelve como null. Prefiere null antes que adivinar: un número inventado se convierte en un gasto equivocado en las cuentas del negocio, o en una factura que el portal rechaza sin decir por qué, y nadie lo va a notar.`;

// El navegador NO manda la petición de una: primero pregunta con un OPTIONS si
// tiene permiso (porque van cabeceras de sesión y JSON). Si esa pregunta no se
// contesta con permiso, la petición de verdad nunca sale, y desde la app se ve
// como si la lectura no hubiera entendido nada — que es justo lo que pasaba.
const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, x-client-info, apikey, content-type",
  "access-control-allow-methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }
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
    headers: { ...CORS, "content-type": "application/json" },
  });
