// Pedidos que hace el cliente en la página (pepeandaluz.com).
//
// La página manda aquí lo que el cliente eligió y sus datos. Esta función:
// 1. Revisa todo (nada de confiar en la página: los PRECIOS se sacan otra vez
//    del menú de la app, `config-productos`; de la página solo se toma qué
//    platillo y cuánto).
// 2. Deja el pedido en el buzón `pedidos_web` (NUNCA escribe en `almacen`:
//    tendría que reescribir la lista entera y podría borrar pedidos).
// 3. Manda el aviso a los celulares del negocio.
// En la app, alguien lo acepta y entonces pasa a la lista de pedidos.
//
// Es pública (la página no tiene sesión). Para que no la llenen de basura:
// límite de pedidos por conexión y por teléfono, campo trampa para robots y
// tamaños máximos en todo.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

const cors = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "content-type",
  "access-control-allow-methods": "POST, OPTIONS",
};
const responder = (cuerpo: unknown, status = 200) =>
  new Response(JSON.stringify(cuerpo), { status, headers: { ...cors, "content-type": "application/json; charset=utf-8" } });

type P = Record<string, unknown>;
const texto = (v: unknown, max: number) => (typeof v === "string" ? v.trim().replace(/\s+/g, " ").slice(0, max) : "");
const numero = (v: unknown) => (typeof v === "number" && isFinite(v) ? v : Number(v) || 0);
const visible = (p: P) => p && !p.ocultoWeb && texto(p.nombre, 200).length > 0;
const uid = () => crypto.randomUUID();
const pesos = (n: number) => "$" + Math.round(n).toLocaleString("es-MX");

// Hoy en Mérida (la nube vive en UTC).
const hoyMerida = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Merida" }).format(new Date());
const masDias = (iso: string, d: number) => {
  const f = new Date(iso + "T12:00:00Z");
  f.setUTCDate(f.getUTCDate() + d);
  return f.toISOString().slice(0, 10);
};
const fechaCorta = (iso: string, hora: string) => {
  const f = new Date(iso + "T12:00:00Z");
  const dia = f.toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
  const [h, m] = hora.split(":").map(Number);
  return `${dia}, ${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
};

async function huella(t: string) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("pepe-web:" + t));
  return Array.from(new Uint8Array(b)).map((x) => x.toString(16).padStart(2, "0")).join("").slice(0, 32);
}

// Aviso propio de los pedidos de la página, distinto a los de pagos y cambios:
// a cada quien le llega con SU nombre ("Carlos, tienes un nuevo pedido").
async function avisar(cuerpo: string, tag: string, soloUsuario = "") {
  const { data: llaves } = await admin.from("push_llaves").select("*").eq("id", 1).maybeSingle();
  if (!llaves) return;
  webpush.setVapidDetails(llaves.contacto, llaves.publica, llaves.privada);
  const { data: activos } = await admin.from("perfiles").select("user_id, nombre").eq("activo", true);
  const nombreDe = new Map((activos || []).map((p) => [p.user_id, String(p.nombre || "").trim().split(/\s+/)[0]]));
  // En una prueba (con la clave secreta) solo le llega a quien la pidió.
  const ids = [...nombreDe.keys()].filter((id) => !soloUsuario || id === soloUsuario);
  if (!ids.length) return;
  const { data: subs } = await admin.from("push_suscripciones").select("*").in("user_id", ids);
  // Si la app está abierta y a la vista en ese aparato, ya le sale el aviso
  // de adentro; no se le manda el de afuera para que no le lleguen dos.
  const ahora = Date.now();
  const destino = (subs || []).filter((s) => !s.en_app_hasta || new Date(s.en_app_hasta).getTime() < ahora);
  let bien = 0, mal = 0;
  await Promise.all(destino.map(async (s) => {
    const nombre = nombreDe.get(s.user_id);
    const titulo = `🛎 ${nombre ? nombre + ", tienes" : "Tienes"} un nuevo pedido`;
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify({ title: titulo, body: cuerpo, tag, url: llaves.contacto, ir: "pedidos-web", fijo: true }),
        { TTL: 60 * 60 * 12, urgency: "high" },
      );
      bien++;
    } catch (e) {
      mal++;
      const estado = (e as { statusCode?: number }).statusCode;
      if (estado === 404 || estado === 410) await admin.from("push_suscripciones").delete().eq("id", s.id);
    }
  }));
  console.log(`Aviso de pedido web: ${bien} enviados, ${mal} fallidos, ${(subs || []).length - destino.length} con la app abierta`);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return responder({ error: "Solo POST" }, 405);

  let d: P = {};
  try {
    const crudo = await req.text();
    if (crudo.length > 20000) return responder({ error: "Pedido demasiado grande" }, 413);
    d = JSON.parse(crudo);
  } catch {
    return responder({ error: "No se entendió el pedido" }, 400);
  }
  // Campo trampa: una persona nunca lo ve ni lo llena; un robot sí.
  if (texto(d.empresa, 100)) return responder({ ok: true });

  // Prueba de punta a punta (solo con la clave de push_llaves): el pedido
  // entra de verdad, pero el aviso solo le llega a `solo_usuario`.
  let soloUsuario = "";
  const secreto = req.headers.get("x-secreto-prueba");
  if (secreto) {
    const { data: ll } = await admin.from("push_llaves").select("secreto_prueba").eq("id", 1).maybeSingle();
    if (!ll || secreto !== ll.secreto_prueba) return responder({ error: "Secreto incorrecto" }, 403);
    soloUsuario = texto(d.solo_usuario, 60) || "nadie";
  }

  // ---------- Datos del cliente ----------
  const nombre = texto(d.nombre, 80);
  const telefono = String(d.telefono || "").replace(/\D/g, "").slice(-10);
  const fecha = texto(d.fecha, 10);
  const hora = texto(d.hora, 5);
  const aDomicilio = d.entrega === "domicilio";
  const direccion = aDomicilio ? texto(d.direccion, 300) : "";
  const ubicacion = aDomicilio ? texto(d.ubicacion, 300) : "";
  const notasCliente = texto(d.notas, 500);
  const hoy = hoyMerida();
  const falta =
    nombre.split(" ").filter((x) => x.length > 1).length < 2 ? "Escribe tu nombre completo." :
    telefono.length !== 10 ? "Revisa tu WhatsApp: deben ser 10 dígitos." :
    !/^\d{4}-\d{2}-\d{2}$/.test(fecha) || fecha < hoy || fecha > masDias(hoy, 180) ? "Revisa el día del pedido." :
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(hora) ? "Revisa la hora del pedido." :
    aDomicilio && direccion.length < 10 ? "Escribe la dirección completa de entrega." :
    aDomicilio && ubicacion && !/^https?:\/\//i.test(ubicacion) && !/^-?\d{1,2}\.\d+,\s*-?\d{1,3}\.\d+$/.test(ubicacion) ? "Revisa la ubicación." : "";
  if (falta) return responder({ error: falta }, 400);

  // ---------- Límite contra abusos ----------
  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "sin-ip";
  const ipHash = await huella(ip);
  const haceUnaHora = new Date(Date.now() - 3600 * 1000).toISOString();
  const [{ count: porIp }, { count: porTel }] = await Promise.all([
    admin.from("pedidos_web").select("id", { count: "exact", head: true }).eq("ip_hash", ipHash).gte("creado_at", haceUnaHora),
    admin.from("pedidos_web").select("id", { count: "exact", head: true }).eq("pedido->>clienteTelefono", telefono).gte("creado_at", haceUnaHora),
  ]);
  if ((porIp || 0) >= 6 || (porTel || 0) >= 4) {
    return responder({ error: "Ya recibimos varios pedidos tuyos en esta hora. Escríbenos por WhatsApp y con gusto te atendemos." }, 429);
  }

  // ---------- Menú vigente (precios de la app, no de la página) ----------
  const { data: conf, error: errConf } = await admin.from("almacen").select("valor").eq("clave", "config-productos").maybeSingle();
  if (errConf || !conf) return responder({ error: "No pudimos leer el menú. Intenta en un momento." }, 503);
  const c = (conf.valor || {}) as Record<string, P[]>;
  const paellas = (c.paellas || []).filter(visible);
  const extrasPaella = (c.extrasPaella || []).filter(visible);
  const platillos = (c.extras || []).filter(visible);
  const buscar = (lista: P[], id: unknown) => lista.find((x) => String(x.id) === String(id));

  const entrada = Array.isArray(d.items) ? (d.items as P[]).slice(0, 40) : [];
  if (!entrada.length) return responder({ error: "Tu pedido está vacío." }, 400);
  const items: P[] = [];
  for (const it of entrada) {
    if (it.tipo === "paella") {
      const p = buscar(paellas, it.id);
      const kg = numero(it.kg);
      if (!p || kg < 1 || kg > 60 || (kg * 2) % 1 !== 0) return responder({ error: "Una paella del pedido ya no está disponible. Recarga la página." }, 409);
      const precioKg = numero(p.precioKg);
      // Los extras de la paella van por kilo (+$X/kg en la página).
      const extras = (Array.isArray(it.extras) ? (it.extras as P[]) : []).slice(0, 15).map((e) => {
        const x = buscar(extrasPaella, e.id);
        return x ? { id: uid(), extraId: String(x.id), nombre: texto(x.nombre, 80), precio: numero(x.precio), cantidad: kg } : null;
      }).filter(Boolean) as P[];
      const sumaExtras = extras.reduce((a, e) => a + numero(e.precio) * numero(e.cantidad), 0);
      items.push({
        id: uid(), tipo: "paella", paellaId: String(p.id), paellaNombre: texto(p.nombre, 80),
        kg, precioKg, extras, subtotal: kg * precioKg + sumaExtras,
        enPaellera: kg >= 3, paelleraDevuelta: false,
      });
    } else {
      const x = buscar(platillos, it.id);
      const cantidad = numero(it.cantidad);
      if (!x || cantidad <= 0 || cantidad > 100 || cantidad % 1 !== 0) return responder({ error: "Un platillo del pedido ya no está disponible. Recarga la página." }, 409);
      const precio = numero(x.precio);
      items.push({
        id: uid(), tipo: "extra", extraId: String(x.id), nombre: texto(x.nombre, 80),
        unidad: texto(x.unidad, 30) || "pieza", piezasPorUnidad: numero(x.piezasPorUnidad),
        cantidad, precio, subtotal: cantidad * precio,
      });
    }
  }
  const total = items.reduce((a, it) => a + numero(it.subtotal), 0);

  // ---------- El pedido, con la misma forma que los de la app ----------
  const cliente = { id: uid(), nombre, telefono, direccion, ubicacion, createdAt: new Date().toISOString() };
  const notas = [
    "🌐 Pedido desde la página web",
    notasCliente,
    aDomicilio ? "Costo de envío: por confirmar con el cliente." : "",
    d.promos ? "Sí quiere recibir promociones." : "",
  ].filter(Boolean).join("\n");
  const pedido = {
    id: uid(), origen: "web",
    clienteId: cliente.id, clienteNombre: nombre, clienteTelefono: telefono,
    items, total, fecha, hora,
    entrega: aDomicilio, direccion, ubicacion,
    envio: 0, recogerPaellera: false, costoRecoleccion: 0, descuentoEnvio: 0, descuentoRecoleccion: 0,
    mostrarPrecioNormal: false, iva: false,
    abonos: [], pagado: 0, saldo: total, estadoPago: "pendiente", estado: "pendiente",
    notas, terminos: "", createdAt: Date.now(),
  };

  const { data: fila, error } = await admin.from("pedidos_web").insert({ pedido, cliente, ip_hash: ipHash }).select("id").single();
  if (error) {
    console.error("No se pudo dejar el pedido web:", JSON.stringify(error));
    return responder({ error: "No pudimos recibir tu pedido. Intenta otra vez o escríbenos por WhatsApp." }, 500);
  }

  // El aviso se manda en segundo plano: el cliente ve "pedido recibido" sin
  // esperar a los celulares. El pedido ya quedó; el aviso no es crítico.
  const envioAviso = avisar(
    `De la página: ${nombre} · ${fechaCorta(fecha, hora)} · ${pesos(total)}${aDomicilio ? " · a domicilio" : ""}`,
    "web-" + fila.id,
    soloUsuario,
  ).catch((e) => console.error("No se pudo mandar el aviso:", String(e)));
  // deno-lint-ignore no-explicit-any
  const rt = (globalThis as any).EdgeRuntime;
  if (rt?.waitUntil) rt.waitUntil(envioAviso);
  else await envioAviso;

  return responder(soloUsuario ? { ok: true, total, id: fila.id } : { ok: true, total });
});
