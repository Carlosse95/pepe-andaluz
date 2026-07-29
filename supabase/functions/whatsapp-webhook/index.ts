import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const WHATSAPP_TOKEN = Deno.env.get("WHATSAPP_TOKEN");
const WHATSAPP_PHONE_ID = Deno.env.get("WHATSAPP_PHONE_ID");
const VERIFY_TOKEN = Deno.env.get("WHATSAPP_VERIFY_TOKEN");

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const MODELO = "claude-opus-4-8";

// Palabra clave que la IA responde cuando el mensaje no tiene nada que ver con
// el negocio. El teléfono es el personal del dueño: también le escriben cosas
// privadas, y esas NO se contestan solas.
const MARCA_IGNORAR = "NO_ES_PEDIDO";

Deno.serve(async (req) => {
  const url = new URL(req.url);

  // Meta verifica el webhook con una petición GET antes de aceptarlo.
  if (req.method === "GET") {
    const modo = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    if (modo === "subscribe" && token === VERIFY_TOKEN) {
      return new Response(challenge, { status: 200 });
    }
    return new Response("Forbidden", { status: 403 });
  }

  if (req.method === "POST") {
    let body;
    try {
      body = await req.json();
    } catch {
      return new Response("EVENT_RECEIVED", { status: 200 });
    }
    try {
      await manejarWebhook(body);
    } catch (e) {
      console.error("ERROR manejando webhook:", e && e.message ? e.message : String(e));
      console.error("ERROR stack:", e && e.stack ? e.stack : "sin stack");
    }
    // Meta espera 200 rápido; si no, reintenta agresivamente.
    return new Response("EVENT_RECEIVED", { status: 200 });
  }

  return new Response("Method Not Allowed", { status: 405 });
});

async function manejarWebhook(body) {
  const entry = body.entry && body.entry[0];
  const change = entry && entry.changes && entry.changes[0];
  const value = change && change.value;
  const mensaje = value && value.messages && value.messages[0];
  if (!mensaje) {
    console.log("Sin mensaje en el webhook (probablemente un estado de entrega). Se ignora.");
    return;
  }

  const telefono = mensaje.from;
  const nombreContacto = (value.contacts && value.contacts[0] && value.contacts[0].profile && value.contacts[0].profile.name) || "";
  const texto = (mensaje.text && mensaje.text.body) || (mensaje.button && mensaje.button.text) || "";
  console.log("Mensaje recibido de " + telefono + ": " + JSON.stringify(texto));

  if (!texto) {
    // Audio, foto o sticker: no se contesta solo, para no responder algo
    // fuera de lugar en un chat que puede ser personal.
    console.log("Mensaje sin texto. No se contesta.");
    return;
  }

  const { data: chatRow, error: errChat } = await supabase
    .from("whatsapp_chats").select("historial").eq("telefono", telefono).maybeSingle();
  if (errChat) console.error("Error leyendo whatsapp_chats:", JSON.stringify(errChat));
  let historial = (chatRow && chatRow.historial) || [];

  const { data: cfgRow, error: errCfg } = await supabase
    .from("almacen").select("valor").eq("clave", "config-productos").maybeSingle();
  if (errCfg) console.error("Error leyendo config-productos:", JSON.stringify(errCfg));
  const config = (cfgRow && cfgRow.valor) || {};
  const paellas = config.paellas || [];
  const extras = config.extras || [];
  console.log("Menu cargado: " + paellas.length + " paellas, " + extras.length + " extras.");

  const menuTexto = [
    "PAELLAS (precio por kg):",
    ...paellas.map((p) => "- " + p.nombre + ": $" + p.precioKg + "/kg (id: \"" + p.id + "\")"),
    "",
    "OTROS PLATILLOS:",
    ...extras.map((e) => "- " + e.nombre + ": $" + e.precio + " por " + (e.unidad || "pieza") + " (id: \"" + e.id + "\")"),
  ].join("\n");

  historial.push({ role: "user", content: texto });

  const hoyISO = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Merida" });
  const systemPrompt = [
    "Eres el asistente de WhatsApp de \"Pepe Andaluz\", una paellería familiar de comida española en el sureste de México. Contestas a clientes que escriben para pedir informes o hacer un pedido.",
    "",
    "MUY IMPORTANTE — este número de WhatsApp es el teléfono personal del dueño del negocio.",
    "Además de pedidos, aquí le escriben familiares, amigos y conocidos por cosas privadas que NADA tienen que ver con el restaurante.",
    "Tú SOLO debes contestar mensajes relacionados con el negocio: pedidos, precios, menú, disponibilidad, horarios, entregas, dudas sobre platillos, o seguimiento de un pedido.",
    "Si el mensaje NO tiene que ver con el negocio (saludos personales, temas de familia, chismes, recados, invitaciones, política, cadenas, publicidad de otros, cobranza ajena, o cualquier cosa privada),",
    "responde ÚNICAMENTE con esta palabra exacta y nada más: " + MARCA_IGNORAR,
    "No expliques nada, no saludes, no te disculpes: solo esa palabra. El dueño contestará ese mensaje personalmente.",
    "Si tienes duda de si es del negocio o no, prefiere responder " + MARCA_IGNORAR + " y dejar que el dueño conteste.",
    "Un simple \"hola\" o \"buenos días\" sin más contexto NO es suficiente para asumir que es un pedido: en ese caso responde " + MARCA_IGNORAR + ".",
    "",
    "Cuando el mensaje SÍ es del negocio, tu trabajo es:",
    "- Ser amable, breve y claro, como alguien del negocio contestando el WhatsApp — no muy formal, sin inventar cosas.",
    "- Ayudar al cliente a armar su pedido: qué paella o platillo, cuántos kilos (paellas) o piezas/órdenes (otros platillos), si es para recoger o a domicilio (si es a domicilio, pedir la dirección), su nombre completo, y la fecha y hora en que lo quiere.",
    "- NO inventes precios ni platillos que no estén en el menú de abajo. Si preguntan por algo que no está, di que no lo manejan.",
    "- Cuando ya tengas TODOS los datos (nombre, al menos un platillo con cantidad, recoger/domicilio, dirección si aplica, fecha y hora) Y el cliente ya confirmó que así está bien, usa la herramienta crear_pedido para registrarlo. Nunca la uses antes de que el cliente confirme.",
    "- Si el cliente solo pregunta precios o dudas generales, contesta normal sin crear ningún pedido.",
    "- Hoy es " + hoyISO + " (zona horaria de México, sureste). Si dicen \"hoy\", \"mañana\" o un día de la semana, calcula la fecha exacta en formato AAAA-MM-DD.",
    "",
    "MENÚ ACTUAL:",
    menuTexto,
  ].join("\n");

  const tools = [
    {
      name: "crear_pedido",
      description: "Registra un pedido nuevo en el sistema del restaurante. Solo se llama cuando el cliente ya confirmó todos los datos.",
      input_schema: {
        type: "object",
        properties: {
          clienteNombre: { type: "string" },
          fecha: { type: "string", description: "Fecha del pedido en formato AAAA-MM-DD" },
          hora: { type: "string", description: "Hora en formato HH:MM de 24 horas" },
          entrega: { type: "boolean", description: "true si es a domicilio, false si el cliente pasa a recoger" },
          direccion: { type: "string", description: "Dirección o referencia de entrega, solo si entrega es true" },
          items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                tipoId: { type: "string", description: "el id del platillo tal cual aparece en el menú entre paréntesis" },
                esPaella: { type: "boolean" },
                cantidad: { type: "number", description: "kilos si es paella, piezas u órdenes si es otro platillo" },
              },
              required: ["tipoId", "esPaella", "cantidad"],
            },
          },
          notas: { type: "string" },
        },
        required: ["clienteNombre", "fecha", "hora", "entrega", "items"],
      },
    },
  ];

  const mensajesClaude = historial.map((m) => ({ role: m.role, content: m.content }));

  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODELO,
      max_tokens: 1024,
      system: systemPrompt,
      tools,
      messages: mensajesClaude,
    }),
  });

  const data = await resp.json();
  if (data.error) {
    console.error("ERROR de Claude:", JSON.stringify(data.error));
    // No se le escribe nada al cliente: si la IA falla, es mejor quedarse
    // callado y que el dueño conteste, que mandar un mensaje raro.
    return;
  }

  let textoRespuesta = "";
  let bloqueHerramienta = null;
  let pedidoCreado = null;

  for (const bloque of data.content || []) {
    if (bloque.type === "text") textoRespuesta += bloque.text;
    if (bloque.type === "tool_use" && bloque.name === "crear_pedido") {
      bloqueHerramienta = bloque;
      console.log("Claude pidio crear pedido: " + JSON.stringify(bloque.input));
      pedidoCreado = await crearPedido(bloque.input, telefono, nombreContacto, paellas, extras);
    }
  }

  console.log("Respuesta de la IA: " + JSON.stringify(textoRespuesta));

  // Mensaje personal: no se contesta ni se guarda el historial, para no
  // ensuciar el contexto de futuros pedidos con conversaciones privadas.
  if (!bloqueHerramienta && textoRespuesta.trim().indexOf(MARCA_IGNORAR) !== -1) {
    console.log("Mensaje ajeno al negocio. No se contesta.");
    return;
  }

  historial.push({ role: "assistant", content: data.content });

  if (bloqueHerramienta) {
    historial.push({
      role: "user",
      content: [
        {
          type: "tool_result",
          tool_use_id: bloqueHerramienta.id,
          content: pedidoCreado ? "Pedido registrado con exito. Total: $" + pedidoCreado.total.toFixed(2) : "No se pudo registrar el pedido.",
        },
      ],
    });
    if (!textoRespuesta.trim() && pedidoCreado) {
      textoRespuesta = "¡Listo! Registré tu pedido 🥘 Total: $" + pedidoCreado.total.toFixed(2) + ". En un ratito te confirmamos por aquí los detalles.";
    }
  }

  if (textoRespuesta.trim()) {
    await enviarWhatsApp(telefono, textoRespuesta.trim());
  }

  const { error: errGuardar } = await supabase.from("whatsapp_chats").upsert({
    telefono,
    historial: historial.slice(-30),
    actualizado_at: new Date().toISOString(),
  });
  if (errGuardar) console.error("Error guardando historial:", JSON.stringify(errGuardar));
}

async function crearPedido(input, telefono, nombreContacto, paellas, extras) {
  const items = (input.items || []).map((it) => {
    if (it.esPaella) {
      const p = paellas.find((x) => x.id === it.tipoId);
      const precioKg = (p && p.precioKg) || 0;
      const kg = Number(it.cantidad) || 0;
      return {
        id: crypto.randomUUID(),
        tipo: "paella",
        paellaId: it.tipoId,
        paellaNombre: (p && p.nombre) || it.tipoId,
        kg,
        precioKg,
        extras: [],
        subtotal: kg * precioKg,
        enPaellera: false,
        paelleraDevuelta: false,
      };
    }
    const e = extras.find((x) => x.id === it.tipoId);
    const precio = (e && e.precio) || 0;
    const cantidad = Number(it.cantidad) || 0;
    return {
      id: crypto.randomUUID(),
      tipo: "extra",
      extraId: it.tipoId,
      nombre: (e && e.nombre) || it.tipoId,
      unidad: (e && e.unidad) || "pieza",
      piezasPorUnidad: (e && e.piezasPorUnidad) || 0,
      cantidad,
      precio,
      subtotal: cantidad * precio,
    };
  });

  const total = items.reduce((a, it) => a + it.subtotal, 0);

  // Se reutiliza un cliente existente con el mismo teléfono si ya existe,
  // igual que hace la app al buscar coincidencias por nombre.
  const { data: clientesRow } = await supabase.from("almacen").select("valor").eq("clave", "clientes").maybeSingle();
  const clientes = (clientesRow && clientesRow.valor) || [];
  let cliente = clientes.find((c) => (c.telefono || "").replace(/\D/g, "").slice(-10) === telefono.replace(/\D/g, "").slice(-10));
  if (!cliente) {
    cliente = {
      id: crypto.randomUUID(),
      nombre: input.clienteNombre || nombreContacto || "Cliente WhatsApp",
      telefono,
      direccion: input.entrega ? (input.direccion || "") : "",
      ubicacion: "",
      createdAt: new Date().toISOString(),
    };
    const { error } = await supabase.from("almacen").upsert({ clave: "clientes", valor: [cliente, ...clientes], updated_at: new Date().toISOString() });
    if (error) console.error("Error guardando cliente:", JSON.stringify(error));
  }

  const pedidoObj = {
    id: crypto.randomUUID(),
    clienteId: cliente.id,
    clienteNombre: input.clienteNombre || cliente.nombre,
    clienteTelefono: telefono,
    items,
    total,
    fecha: input.fecha,
    hora: input.hora,
    entrega: !!input.entrega,
    direccion: input.entrega ? (input.direccion || "") : "",
    ubicacion: "",
    envio: 0,
    iva: false,
    abonos: [],
    pagado: 0,
    saldo: total,
    estadoPago: "pendiente",
    estado: "pendiente",
    notas: [input.notas || "", "(Pedido tomado por IA vía WhatsApp)"].filter(Boolean).join(" "),
    terminos: "",
    createdAt: Date.now(),
  };

  const { data: pedidosRow } = await supabase.from("almacen").select("valor").eq("clave", "pedidos").maybeSingle();
  const pedidosActuales = (pedidosRow && pedidosRow.valor) || [];
  const { error } = await supabase.from("almacen").upsert({
    clave: "pedidos",
    valor: [pedidoObj, ...pedidosActuales],
    updated_at: new Date().toISOString(),
  });
  if (error) {
    console.error("ERROR guardando pedido:", JSON.stringify(error));
    return null;
  }
  console.log("Pedido guardado. Total: " + total);
  return pedidoObj;
}

async function enviarWhatsApp(telefono, texto) {
  const r = await fetch("https://graph.facebook.com/v21.0/" + WHATSAPP_PHONE_ID + "/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: "Bearer " + WHATSAPP_TOKEN,
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: telefono,
      type: "text",
      text: { body: texto },
    }),
  });
  const cuerpo = await r.text();
  if (!r.ok) {
    console.error("ERROR enviando WhatsApp (" + r.status + "): " + cuerpo);
  } else {
    console.log("WhatsApp enviado a " + telefono + ": " + cuerpo);
  }
}
