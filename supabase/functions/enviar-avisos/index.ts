// Manda los avisos (Web Push) a los DEMÁS aparatos cuando alguien guarda un
// pedido o un pago. Llegan aunque la app esté cerrada.
//
// Cómo se llama:
// - La app, después de subir sus movimientos del Historial, manda aquí sus
//   `claves` (clave_local). Solo se avisa de movimientos que de verdad
//   existen en la nube y que son de quien llama: nadie puede inventar un
//   aviso con texto propio.
// - `prueba_propia: true` manda un aviso de prueba a los aparatos de quien
//   llama (el botón "Probar" de Ajustes).
// - Con el encabezado `x-secreto-prueba` (guardado en push_llaves) se puede
//   mandar un aviso de prueba sin sesión, para revisar que el envío funciona.
//
// Las llaves de firma viven en la tabla push_llaves, que solo se lee con la
// llave de servicio. Nunca en el repo, que es público.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

// De qué se avisa: lo de pedidos y pagos. Gastos y clientes nuevos se ven en
// el Historial pero no ameritan sonar en el celular de todos.
const AVISABLES = ["pedido-nuevo", "pedido-cambio", "pedido-borrado", "estado", "pago", "pago-quitado"];

const cors = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, content-type, apikey, x-client-info, x-secreto-prueba",
  "access-control-allow-methods": "POST, OPTIONS",
};
const responder = (cuerpo: unknown, status = 200) =>
  new Response(JSON.stringify(cuerpo), { status, headers: { ...cors, "content-type": "application/json" } });

// "Registró un pago…" → "registró un pago…", para ir después del nombre.
const minuscula = (t: string) => (t ? t.charAt(0).toLowerCase() + t.slice(1) : t);

type Sus = { id: number; user_id: string; endpoint: string; p256dh: string; auth: string };

async function enviar(subs: Sus[], aviso: Record<string, unknown>) {
  const resultados: { id: number; estado: number | string }[] = [];
  await Promise.all(
    subs.map(async (s) => {
      try {
        const r = await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify(aviso),
          { TTL: 60 * 60 * 12, urgency: "high" },
        );
        resultados.push({ id: s.id, estado: r.statusCode });
        await admin.from("push_suscripciones").update({ ultimo_ok: new Date().toISOString() }).eq("id", s.id);
      } catch (e) {
        const estado = (e as { statusCode?: number }).statusCode || String(e);
        resultados.push({ id: s.id, estado });
        // El aparato ya no existe o quitó el permiso: se borra su dirección.
        if (estado === 404 || estado === 410) await admin.from("push_suscripciones").delete().eq("id", s.id);
      }
    }),
  );
  return resultados;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return responder({ error: "Metodo no permitido" }, 405);

  const { data: llaves } = await admin.from("push_llaves").select("*").eq("id", 1).maybeSingle();
  if (!llaves) return responder({ error: "Faltan las llaves de avisos" }, 500);
  webpush.setVapidDetails(llaves.contacto, llaves.publica, llaves.privada);

  let cuerpo: Record<string, unknown> = {};
  try { cuerpo = await req.json(); } catch { /* cuerpo vacío */ }

  // Prueba sin sesión (solo con el secreto).
  const secreto = req.headers.get("x-secreto-prueba");
  if (secreto) {
    if (secreto !== llaves.secreto_prueba) return responder({ error: "Secreto incorrecto" }, 403);
    const { data: subs } = await admin.from("push_suscripciones").select("*");
    const r = await enviar((subs || []) as Sus[], {
      title: "Pepe El Andaluz", body: String(cuerpo.texto || "Aviso de prueba"), tag: "prueba", url: llaves.contacto,
    });
    return responder({ enviados: r });
  }

  // Con sesión: tiene que ser un usuario activo.
  const jwt = (req.headers.get("authorization") || "").replace("Bearer ", "").trim();
  const { data: u } = await admin.auth.getUser(jwt);
  const yo = u?.user;
  if (!yo) return responder({ error: "Sesion no valida" }, 401);
  const { data: perfil } = await admin.from("perfiles").select("activo").eq("user_id", yo.id).maybeSingle();
  if (!perfil?.activo) return responder({ error: "Tu usuario no esta activo" }, 403);

  if (cuerpo.prueba_propia) {
    const { data: mias } = await admin.from("push_suscripciones").select("*").eq("user_id", yo.id);
    const r = await enviar((mias || []) as Sus[], {
      title: "Pepe El Andaluz", body: "Así te van a llegar los avisos de pedidos y pagos.", tag: "prueba", url: llaves.contacto,
    });
    return responder({ enviados: r });
  }

  const claves = Array.isArray(cuerpo.claves) ? (cuerpo.claves as unknown[]).map(String).slice(0, 50) : [];
  if (!claves.length) return responder({ enviados: [] });
  const hace2dias = new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString();
  const { data: movs } = await admin
    .from("movimientos")
    .select("usuario_nombre, tipo, texto, ref_id, creado_en")
    .in("clave_local", claves)
    .eq("usuario_id", yo.id)
    .in("tipo", AVISABLES)
    .gte("creado_en", hace2dias)
    .order("creado_en");
  if (!movs || !movs.length) return responder({ enviados: [] });

  // A todos los aparatos de los DEMÁS usuarios activos.
  const { data: activos } = await admin.from("perfiles").select("user_id").eq("activo", true);
  const ids = (activos || []).map((p) => p.user_id).filter((id) => id !== yo.id);
  if (!ids.length) return responder({ enviados: [] });
  const { data: subs } = await admin.from("push_suscripciones").select("*").in("user_id", ids);
  if (!subs || !subs.length) return responder({ enviados: [] });

  const quien = movs[0].usuario_nombre || "Alguien";
  const aviso =
    movs.length === 1
      ? { title: "Pepe El Andaluz", body: `${quien} ${minuscula(movs[0].texto)}`, tag: "pedido-" + (movs[0].ref_id || "x"), url: llaves.contacto }
      : {
          title: `${quien} hizo ${movs.length} cambios`,
          body: movs.slice(0, 3).map((m) => m.texto).join(" · ") + (movs.length > 3 ? "…" : ""),
          tag: "varios-" + Date.now(),
          url: llaves.contacto,
        };
  return responder({ enviados: await enviar(subs as Sus[], aviso) });
});
