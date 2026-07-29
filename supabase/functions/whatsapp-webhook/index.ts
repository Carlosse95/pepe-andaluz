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
    "QUIÉN ERES Y HASTA DÓNDE LLEGAS — esto es lo más importante de todo:",
    "El trato personal con Pepe, el dueño, es justamente lo que la gente valora de este negocio. Tú NO vienes a reemplazarlo.",
    "Eres solo una ayuda para lo rutinario: apuntar pedidos claros y dar precios y horarios. Nada más.",
    "NUNCA te hagas pasar por Pepe ni por un familiar. Si te preguntan si eres una persona, di con naturalidad que eres el asistente que apunta los pedidos y que Pepe contesta personalmente.",
    "En cuanto la conversación se salga de lo rutinario, usa la herramienta avisar_a_pepe y deja que él conteste. Eso incluye:",
    "  · quejas, reclamos o algo que salió mal",
    "  · eventos grandes, bodas, banquetes o cotizaciones especiales",
    "  · cambios raros al menú, alergias, o peticiones fuera de lo normal",
    "  · cuando pidan un descuento o negociar el precio",
    "  · cuando el cliente pida hablar con Pepe o con una persona",
    "  · cuando no estés seguro de la respuesta",
    "Al usar avisar_a_pepe, dile al cliente algo breve y cálido, sin inventar tiempos exactos: que Pepe le contesta personalmente en cuanto pueda, y que si es urgente puede marcar a este mismo número.",
    "Es mejor pasarle un mensaje de más a Pepe que contestar tú algo que no te toca.",
    "",
    "Cuando el mensaje SÍ es del negocio y es de lo rutinario, tu trabajo es:",
    "- Ser amable, breve y claro, como alguien del negocio contestando el WhatsApp — no muy formal, sin inventar cosas.",
    "- Ayudar al cliente a armar su pedido: qué paella o platillo, cuántos kilos (paellas) o piezas/órdenes (otros platillos), si es para recoger o a domicilio (si es a domicilio, pedir la dirección), su nombre completo, y la fecha y hora en que lo quiere.",
    "- NO inventes precios ni platillos que no estén en el menú de abajo. Si preguntan por algo que no está, di que no lo manejan.",
    "- Cuando ya tengas TODOS los datos (nombre, al menos un platillo con cantidad, recoger/domicilio, dirección si aplica, fecha y hora) Y el cliente ya confirmó que así está bien, usa la herramienta crear_pedido para registrarlo. Nunca la uses antes de que el cliente confirme.",
    "- Si el cliente solo pregunta precios o dudas generales, contesta normal sin crear ningún pedido.",
    "- Escribes por WhatsApp, NO uses formato Markdown. Para negritas WhatsApp usa UN solo asterisco (*así*), nunca dos (**así** se ve mal). No uses ## ni viñetas con guion medio: si necesitas lista, usa saltos de línea normales.",
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
    {
      name: "avisar_a_pepe",
      description:
        "Marca la conversación para que Pepe, el dueño, la conteste él mismo. Se usa cuando el asunto se sale de apuntar un pedido rutinario: quejas, eventos grandes, peticiones especiales, descuentos, o cuando el cliente pide hablar con una persona.",
      input_schema: {
        type: "object",
        properties: {
          motivo: {
            type: "string",
            description: "En una línea, qué necesita el cliente, para que Pepe sepa de qué se trata sin leer todo el chat.",
          },
        },
        required: ["motivo"],
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
  const resultadosHerramienta = [];
  let pedidoCreado = null;
  let motivoParaPepe = "";

  for (const bloque of data.content || []) {
    if (bloque.type === "text") textoRespuesta += bloque.text;
    if (bloque.type !== "tool_use") continue;

    if (bloque.name === "crear_pedido") {
      console.log("Claude pidio crear pedido: " + JSON.stringify(bloque.input));
      pedidoCreado = await crearPedido(bloque.input, telefono, nombreContacto, paellas, extras);
      resultadosHerramienta.push({
        type: "tool_result",
        tool_use_id: bloque.id,
        content: pedidoCreado
          ? "Pedido registrado con exito. Total: $" + pedidoCreado.total.toFixed(2)
          : "No se pudo registrar el pedido.",
      });
    }

    if (bloque.name === "avisar_a_pepe") {
      motivoParaPepe = (bloque.input && bloque.input.motivo) || "El cliente necesita atencion personal";
      console.log("La IA pide que conteste Pepe: " + motivoParaPepe);
      resultadosHerramienta.push({
        type: "tool_result",
        tool_use_id: bloque.id,
        content: "Avisado. Pepe vera esta conversacion en la app.",
      });
    }
  }

  console.log("Respuesta de la IA: " + JSON.stringify(textoRespuesta));

  // Mensaje personal: no se contesta ni se guarda el historial, para no
  // ensuciar el contexto de futuros pedidos con conversaciones privadas.
  if (!resultadosHerramienta.length && textoRespuesta.trim().indexOf(MARCA_IGNORAR) !== -1) {
    console.log("Mensaje ajeno al negocio. No se contesta.");
    return;
  }

  // A partir de aquí ya se sabe que el mensaje es del negocio, así que se
  // guarda para la bandeja. Los mensajes personales nunca se guardan.
  await guardarMensaje(telefono, "cliente", texto);

  historial.push({ role: "assistant", content: data.content });

  if (resultadosHerramienta.length) {
    historial.push({ role: "user", content: resultadosHerramienta });
    if (!textoRespuesta.trim() && pedidoCreado) {
      textoRespuesta = "¡Listo! Registré tu pedido 🥘 Total: $" + pedidoCreado.total.toFixed(2) + ". En un ratito te confirmamos por aquí los detalles.";
    }
  }

  if (textoRespuesta.trim()) {
    await enviarWhatsApp(telefono, textoRespuesta.trim());
    await guardarMensaje(telefono, "bot", textoRespuesta.trim());
  }

  // La conversación se marca para que Pepe la vea en la app.
  await actualizarConversacion(telefono, nombreContacto, textoRespuesta.trim() || texto, motivoParaPepe);

  const { error: errGuardar } = await supabase.from("whatsapp_chats").upsert({
    telefono,
    historial: historial.slice(-30),
    actualizado_at: new Date().toISOString(),
  });
  if (errGuardar) console.error("Error guardando historial:", JSON.stringify(errGuardar));
}

// Cada mensaje se guarda suelto (uno por fila) para que la app pueda
// mostrar la conversación como un chat normal. El historial de
// `whatsapp_chats` es el contexto técnico de la IA, no sirve para leerlo.
async function guardarMensaje(telefono, de, texto) {
  const { error } = await supabase.from("whatsapp_mensajes").insert({ telefono, de, texto });
  if (error) console.error("Error guardando mensaje:", JSON.stringify(error));
}

// Mantiene al día la lista de conversaciones de la bandeja. `necesita_pepe`
// se prende cuando la IA pide ayuda y solo lo apaga Pepe desde la app.
async function actualizarConversacion(telefono, nombreContacto, ultimoTexto, motivoParaPepe) {
  const fila = {
    telefono,
    ultimo_texto: (ultimoTexto || "").slice(0, 300),
    ultimo_at: new Date().toISOString(),
  };
  if (nombreContacto) fila.nombre = nombreContacto;
  if (motivoParaPepe) {
    fila.necesita_pepe = true;
    fila.motivo_pepe = motivoParaPepe;
  }
  const { error } = await supabase.from("whatsapp_conversaciones").upsert(fila);
  if (error) console.error("Error actualizando conversacion:", JSON.stringify(error));
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

  // Ficha del cliente por si es nuevo. La app decide si lo da de alta o lo
  // vincula con uno que ya exista con el mismo teléfono: aquí no se toca la
  // lista de clientes para no pisar lo que el negocio tenga guardado.
  const cliente = {
    id: crypto.randomUUID(),
    nombre: input.clienteNombre || nombreContacto || "Cliente WhatsApp",
    telefono,
    direccion: input.entrega ? (input.direccion || "") : "",
    ubicacion: "",
    createdAt: new Date().toISOString(),
  };

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

  // El pedido se deja en el buzón, en su propia fila. La app lo recoge de
  // ahí y lo pasa a la lista. Así el bot nunca puede borrar pedidos del
  // negocio, y si algo falla el pedido se queda esperando en vez de perderse.
  const { error } = await supabase.from("pedidos_whatsapp").insert({
    pedido: pedidoObj,
    cliente,
  });
  if (error) {
    console.error("ERROR dejando el pedido en el buzon:", JSON.stringify(error));
    return null;
  }
  console.log("Pedido dejado en el buzon. Total: " + total);
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
