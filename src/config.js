// ---------------------------------------------------------------------
// Configuración de la nube (Supabase).
//
// MIENTRAS ESTÉN VACÍOS, la app funciona en MODO LOCAL: sin login y
// guardando todo en este dispositivo (como hasta ahora).
//
// Para activar el modo nube (login + sincronización entre dispositivos):
//   1. Crea un proyecto en https://supabase.com (gratis).
//   2. En el proyecto: Settings → API.
//   3. Copia "Project URL" y la llave "anon public" aquí abajo.
//
// La llave "anon" está diseñada para ser pública (va en el navegador);
// la seguridad real la ponen las reglas RLS del archivo supabase/setup.sql.
// ---------------------------------------------------------------------

export const SUPABASE_URL = "https://sykfhnznbneuipibatmx.supabase.co";
export const SUPABASE_ANON_KEY = "sb_publishable_A5eYAl9lvTnFJkzVJShH-A_2GhS7n_e";
