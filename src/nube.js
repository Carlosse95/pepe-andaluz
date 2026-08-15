// ---------------------------------------------------------------------
// Módulo de nube: Supabase (base de datos + usuarios).
//
// Si src/config.js no tiene llaves, todo cae en modo local:
// `almacen` delega en window.storage (localStorage) y no hay login.
// ---------------------------------------------------------------------

import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

export const nubeActiva = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const supabase = nubeActiva ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

/* ------------------------- Almacenamiento ------------------------- */
// Misma interfaz que window.storage (get/set devuelven { key, value }),
// para que la app no tenga que distinguir entre local y nube.

export const almacen = {
  // Devuelve null cuando la clave NO EXISTE, y solo lanza error cuando algo
  // salió mal de verdad (sin internet, sesión caída, la base no contesta).
  //
  // La diferencia es crítica: quien llama usa "no existe" para sembrar los
  // valores de fábrica la primera vez. Antes las dos cosas llegaban como
  // error, así que un parpadeo de internet se confundía con "no hay nada" y
  // se sembraban los valores de fábrica ENCIMA del menú real. Así se perdió
  // el menú de Pepe.
  async get(key) {
    if (!nubeActiva) return window.storage.get(key);
    const { data, error } = await supabase.from("almacen").select("valor").eq("clave", key).maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return { key, value: JSON.stringify(data.valor) };
  },

  async set(key, value) {
    if (!nubeActiva) return window.storage.set(key, value);
    const { error } = await supabase
      .from("almacen")
      .upsert({ clave: key, valor: JSON.parse(value), updated_at: new Date().toISOString() });
    if (error) throw error;
    return { key, value };
  },
};

// Escucha cambios hechos desde OTROS dispositivos (tiempo real).
// callback(clave, valorJSONString | null si se borró la fila).
export const suscribirAlmacen = (callback) => {
  if (!nubeActiva) return () => {};
  const canal = supabase
    .channel("almacen-cambios")
    .on("postgres_changes", { event: "*", schema: "public", table: "almacen" }, (payload) => {
      const fila = payload.new && payload.new.clave ? payload.new : payload.old;
      if (!fila || !fila.clave) return;
      callback(fila.clave, payload.new && payload.new.valor !== undefined ? JSON.stringify(payload.new.valor) : null);
    })
    .subscribe();
  return () => supabase.removeChannel(canal);
};

/* ------------- Pedidos que llegan por WhatsApp (bot de IA) ------------- */
// El bot NUNCA escribe en `almacen`. Si lo hiciera tendría que reescribir la
// lista entera de pedidos y borraría los que la app todavía no conocía (ya
// pasó una vez). En vez de eso deja cada pedido en su propia fila, aquí, y
// la app los va pasando a la lista.

// Reclama los pedidos pendientes. El `update ... where incorporado = false`
// hace que, aunque haya varios dispositivos abiertos, cada pedido se lo
// quede uno solo: los demás reciben la lista vacía y no lo duplican.
export const reclamarPedidosWhatsApp = async () => {
  if (!nubeActiva) return [];
  const { data, error } = await supabase
    .from("pedidos_whatsapp")
    .update({ incorporado: true })
    .eq("incorporado", false)
    .select();
  if (error) throw error;
  return data || [];
};

// Si la app no alcanzó a guardarlo, el pedido se devuelve al buzón para
// reintentarlo más tarde en vez de perderse.
export const devolverPedidoWhatsApp = async (id) => {
  if (!nubeActiva) return;
  await supabase.from("pedidos_whatsapp").update({ incorporado: false }).eq("id", id);
};

// Avisa cuando el bot deja un pedido nuevo, para recogerlo al instante.
export const suscribirPedidosWhatsApp = (callback) => {
  if (!nubeActiva) return () => {};
  const canal = supabase
    .channel("pedidos-whatsapp-nuevos")
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "pedidos_whatsapp" }, () => callback())
    .subscribe();
  return () => supabase.removeChannel(canal);
};

/* ------------- Bandeja de WhatsApp (conversaciones con clientes) ------------- */
// El bot solo apunta pedidos rutinarios; lo demás lo contesta Pepe desde
// aquí, porque el trato con él es lo que la gente busca del negocio.

export const listarConversaciones = async () => {
  if (!nubeActiva) return [];
  const { data, error } = await supabase
    .from("whatsapp_conversaciones")
    .select("*")
    .order("ultimo_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return data || [];
};

export const listarMensajes = async (telefono) => {
  if (!nubeActiva) return [];
  const { data, error } = await supabase
    .from("whatsapp_mensajes")
    .select("*")
    .eq("telefono", telefono)
    .order("creado_at")
    .limit(300);
  if (error) throw error;
  return data || [];
};

// El envío pasa por el servidor: el token de WhatsApp no puede estar en la
// app, o cualquiera podría escribir a nombre del negocio.
export const enviarMensajeWhatsApp = async (telefono, texto) => {
  const { data } = await supabase.auth.getSession();
  const jwt = data && data.session && data.session.access_token;
  if (!jwt) throw new Error("Necesitas iniciar sesión para contestar.");

  const r = await fetch(`${SUPABASE_URL}/functions/v1/whatsapp-enviar`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      apikey: SUPABASE_ANON_KEY,
      authorization: `Bearer ${jwt}`,
    },
    body: JSON.stringify({ telefono, texto }),
  });
  const cuerpo = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(cuerpo.error || "No se pudo enviar el mensaje.");
  return true;
};

// Marca la conversación como vista para que deje de aparecer pendiente.
export const marcarConversacionLeida = async (telefono) => {
  if (!nubeActiva) return;
  await supabase
    .from("whatsapp_conversaciones")
    .update({ necesita_pepe: false, leido_at: new Date().toISOString() })
    .eq("telefono", telefono);
};

export const suscribirBandejaWhatsApp = (callback) => {
  if (!nubeActiva) return () => {};
  const canal = supabase
    .channel("bandeja-whatsapp")
    .on("postgres_changes", { event: "*", schema: "public", table: "whatsapp_mensajes" }, () => callback())
    .on("postgres_changes", { event: "*", schema: "public", table: "whatsapp_conversaciones" }, () => callback())
    .subscribe();
  return () => supabase.removeChannel(canal);
};

/* --------------------- Fotos de tickets (facturas) --------------------- */
// Las fotos NO van en `almacen`: ahí cada clave guarda un JSON completo que se
// reescribe entero en cada guardado, así que meter imágenes lo volvería
// pesadísimo. Van en Storage, en un bucket privado, y en el gasto solo se
// guarda la ruta.

// Sube la foto y devuelve la ruta con la que después se recupera.
export const subirTicket = async (archivo) => {
  if (!nubeActiva) throw new Error("Sin conexión a la nube no se pueden guardar fotos.");
  const ext = (archivo.name.split(".").pop() || "jpg").toLowerCase();
  // El nombre lleva la fecha para poder localizarlo desde el panel de Supabase
  // si algún día hay que buscarlo a mano.
  const ruta = `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("tickets").upload(ruta, archivo, {
    contentType: archivo.type || "image/jpeg",
    upsert: false,
  });
  if (error) throw error;
  return ruta;
};

// Lee la foto del ticket y devuelve { tienda, fecha, total, confianza }.
// La lectura corre en el servidor porque la llave que la hace posible no puede
// estar en la app: cualquiera podría sacarla del navegador.
export const leerTicket = async (ruta) => {
  if (!nubeActiva || !ruta) return null;
  const { data, error } = await supabase.functions.invoke("leer-ticket", { body: { ruta } });
  if (error) {
    // El cuerpo del error trae el motivo en español; el genérico no dice nada.
    let motivo = "";
    try { motivo = (await error.context?.json())?.error || ""; } catch { /* sin cuerpo */ }
    throw new Error(motivo || "No se pudo leer el ticket.");
  }
  return data?.datos || null;
};

// El bucket es privado, así que para verla se pide una liga temporal.
export const verTicket = async (ruta) => {
  if (!nubeActiva || !ruta) return null;
  const { data, error } = await supabase.storage.from("tickets").createSignedUrl(ruta, 60 * 60);
  if (error) throw error;
  return data.signedUrl;
};

export const borrarTicket = async (ruta) => {
  if (!nubeActiva || !ruta) return;
  await supabase.storage.from("tickets").remove([ruta]);
};

/* ------------------- Recibos que se mandan al cliente ------------------- */
// WhatsApp no deja adjuntar un archivo desde una liga, así que el recibo se
// sube y en el mensaje va el enlace.

// Días que el enlace sigue sirviendo. Un año: un recibo de pago es el
// comprobante de que el cliente pagó, y lo puede querer buscar meses después
// —para su contabilidad, o porque se le perdió—. Con 30 días el enlace se
// moría antes que la necesidad, y el cliente veía un error sin entender por
// qué. No es eterno porque el recibo trae su nombre y su teléfono.
const DIAS_QUE_DURA_EL_RECIBO = 365;

export const subirRecibo = async (blob, nombreArchivo) => {
  if (!nubeActiva) throw new Error("Sin conexión a la nube no se puede compartir el recibo.");
  // La ruta lleva el pedido: si se vuelve a generar el mismo recibo se
  // reemplaza en vez de dejar copias sueltas acumulándose.
  const ruta = `${nombreArchivo}`.replace(/[^A-Za-z0-9._-]/g, "_");
  const { error } = await supabase.storage
    .from("recibos")
    .upload(ruta, blob, { contentType: "application/pdf", upsert: true });
  if (error) throw error;
  const { data, error: e2 } = await supabase.storage
    .from("recibos")
    .createSignedUrl(ruta, 60 * 60 * 24 * DIAS_QUE_DURA_EL_RECIBO);
  if (e2) throw e2;
  return data.signedUrl;
};

/* ----------------------------- Sesión ----------------------------- */

export const obtenerSesion = async () => {
  const { data } = await supabase.auth.getSession();
  return data.session || null;
};

export const alCambiarSesion = (callback) => {
  const { data } = supabase.auth.onAuthStateChange((_evento, sesion) => callback(sesion));
  return () => data.subscription.unsubscribe();
};

export const iniciarSesion = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.session;
};

export const cerrarSesion = () => supabase.auth.signOut();

/* ----------------------------- Perfiles ---------------------------- */

export const obtenerMiPerfil = async (userId) => {
  const { data, error } = await supabase.from("perfiles").select("*").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  return data;
};

export const listarPerfiles = async () => {
  const { data, error } = await supabase.from("perfiles").select("*").order("created_at");
  if (error) throw error;
  return data || [];
};

// El admin da de alta usuarios desde la app. Se usa un cliente aparte
// (sin persistir sesión) para que el signUp no cierre la sesión del admin.
export const crearUsuario = async (email, password, nombre) => {
  const clienteAlt = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await clienteAlt.auth.signUp({ email, password });
  if (error) throw error;
  if (!data.user) throw new Error("No se pudo crear el usuario.");
  // El trigger de la base crea el perfil desactivado; el admin lo activa y le pone nombre.
  const { error: e2 } = await supabase
    .from("perfiles")
    .update({ nombre: nombre || "", activo: true })
    .eq("user_id", data.user.id);
  if (e2) throw e2;
  return data.user;
};

export const actualizarPerfil = async (userId, cambios) => {
  const { error } = await supabase.from("perfiles").update(cambios).eq("user_id", userId);
  if (error) throw error;
};
