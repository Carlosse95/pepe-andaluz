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
  async get(key) {
    if (!nubeActiva) return window.storage.get(key);
    const { data, error } = await supabase.from("almacen").select("valor").eq("clave", key).maybeSingle();
    if (error) throw error;
    if (!data) throw new Error(`almacen: la clave "${key}" no existe`);
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
