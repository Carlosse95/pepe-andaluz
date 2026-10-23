// El administrador le pone una contraseña nueva a un usuario (por ejemplo,
// cuando alguien cambió de celular y ya no se acuerda de la suya).
//
// Cambiar la contraseña de OTRA persona necesita la llave de servicio, que no
// puede vivir en la app. Por eso se hace aquí, y solo si quien lo pide es un
// administrador activo. La contraseña no se guarda ni se imprime en ningún
// lado: va directo a Supabase Auth.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

const cors = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, content-type, apikey, x-client-info",
  "access-control-allow-methods": "POST, OPTIONS",
};
const responder = (cuerpo: unknown, status = 200) =>
  new Response(JSON.stringify(cuerpo), { status, headers: { ...cors, "content-type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return responder({ error: "Metodo no permitido" }, 405);

  // ¿Quién lo pide? Tiene que ser un administrador activo.
  const jwt = (req.headers.get("authorization") || "").replace("Bearer ", "").trim();
  const { data: u } = await admin.auth.getUser(jwt);
  const yo = u?.user;
  if (!yo) return responder({ error: "Sesion no valida" }, 401);
  const { data: perfil } = await admin.from("perfiles").select("rol, activo").eq("user_id", yo.id).maybeSingle();
  if (!perfil?.activo || perfil.rol !== "admin") return responder({ error: "Solo el administrador puede cambiar contraseñas" }, 403);

  let cuerpo: { user_id?: string; password?: string } = {};
  try { cuerpo = await req.json(); } catch { /* cuerpo vacío */ }
  const userId = String(cuerpo.user_id || "");
  const password = String(cuerpo.password || "");
  if (!userId) return responder({ error: "Falta el usuario" }, 400);
  if (password.length < 6) return responder({ error: "La contraseña debe tener al menos 6 caracteres" }, 400);

  // Solo usuarios de la app (que tengan perfil).
  const { data: destino } = await admin.from("perfiles").select("user_id").eq("user_id", userId).maybeSingle();
  if (!destino) return responder({ error: "Ese usuario no existe" }, 404);

  const { error } = await admin.auth.admin.updateUserById(userId, { password });
  if (error) return responder({ error: error.message }, 400);
  return responder({ ok: true });
});
