// Envía por WhatsApp lo que Pepe escribe desde la bandeja de la app.
//
// Va aparte del navegador a propósito: el token de WhatsApp no puede estar
// en la app (cualquiera podría verlo desde el celular y escribir a nombre
// del negocio). La app solo pide "manda este texto a este número", y aquí
// se comprueba que quien lo pide sea un usuario activo del negocio.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const WHATSAPP_TOKEN = Deno.env.get("WHATSAPP_TOKEN");
const WHATSAPP_PHONE_ID = Deno.env.get("WHATSAPP_PHONE_ID");

const admin = createClient(SUPABASE_URL, SERVICE_KEY);

const cors = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, content-type, apikey",
  "access-control-allow-methods": "POST, OPTIONS",
};

const responder = (cuerpo, status) =>
  new Response(JSON.stringify(cuerpo), {
    status,
    headers: { ...cors, "content-type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return responder({ error: "Metodo no permitido" }, 405);

  // Quien escribe tiene que ser un usuario del negocio, con sesión iniciada
  // y activo. Si no, no se manda nada.
  const auth = req.headers.get("authorization") || "";
  const jwt = auth.replace("Bearer ", "").trim();
  if (!jwt) return responder({ error: "Falta iniciar sesion" }, 401);

  const { data: userData, error: errUser } = await admin.auth.getUser(jwt);
  if (errUser || !userData || !userData.user) {
    return responder({ error: "Sesion no valida" }, 401);
  }

  const { data: perfil } = await admin
    .from("perfiles")
    .select("activo")
    .eq("user_id", userData.user.id)
    .maybeSingle();
  if (!perfil || !perfil.activo) {
    return responder({ error: "Tu usuario no esta activo" }, 403);
  }

  let cuerpo;
  try {
    cuerpo = await req.json();
  } catch {
    return responder({ error: "Peticion mal formada" }, 400);
  }

  const telefono = String((cuerpo && cuerpo.telefono) || "").replace(/\D/g, "");
  const texto = String((cuerpo && cuerpo.texto) || "").trim();
  if (!telefono || !texto) return responder({ error: "Falta el numero o el texto" }, 400);
  if (texto.length > 4000) return responder({ error: "El mensaje es demasiado largo" }, 400);

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

  const respuesta = await r.text();
  if (!r.ok) {
    console.error("ERROR enviando WhatsApp (" + r.status + "): " + respuesta);
    return responder({ error: "WhatsApp no acepto el mensaje", detalle: respuesta }, 502);
  }

  // Se guarda para que quede en la conversación, igual que los del bot.
  await admin.from("whatsapp_mensajes").insert({ telefono, de: "pepe", texto });
  await admin.from("whatsapp_conversaciones").upsert({
    telefono,
    ultimo_texto: texto.slice(0, 300),
    ultimo_at: new Date().toISOString(),
    // Ya contestó una persona: la conversación deja de pedir atención.
    necesita_pepe: false,
    motivo_pepe: "",
    leido_at: new Date().toISOString(),
  });

  return responder({ ok: true }, 200);
});
