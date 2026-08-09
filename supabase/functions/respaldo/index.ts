// Devuelve una copia completa de la tabla `almacen` para guardarla en la
// computadora de Carlos. No usa la sesion de nadie: se abre con una llave
// propia que solo esta en su maquina.
//
// En este archivo NO va la llave, solo su huella (sha-256). De la huella no
// se puede sacar la llave, asi que este codigo puede vivir en el repositorio
// publico sin abrir nada.
//
// Se llama asi:
//   curl -H "x-llave-respaldo: LA_LLAVE" \
//        https://sykfhnznbneuipibatmx.supabase.co/functions/v1/respaldo
//
// El script que lo usa esta en ~/Documents/Respaldos-Pepe-Andaluz/respaldar.sh
// (fuera del repositorio, porque ahi si vive la llave).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const HUELLA_LLAVE = "fe7b8f2b7cd1657ca275ce3e0e6f044a894833809de2f39f29fa9f3706c790c3";

const huellaDe = async (texto: string) => {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(texto));
  return Array.from(new Uint8Array(bytes)).map((b) => b.toString(16).padStart(2, "0")).join("");
};

// Compara sin delatar en cuantos caracteres coincidio.
const igual = (a: string, b: string) => {
  if (a.length !== b.length) return false;
  let dif = 0;
  for (let i = 0; i < a.length; i++) dif |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return dif === 0;
};

Deno.serve(async (req: Request) => {
  const llave = req.headers.get("x-llave-respaldo") || "";
  if (!llave || !igual(await huellaDe(llave), HUELLA_LLAVE)) {
    return new Response(JSON.stringify({ error: "Llave incorrecta." }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const { data, error } = await supabase.from("almacen").select("clave, valor, updated_at");
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }

  const copia: Record<string, unknown> = {};
  for (const fila of data ?? []) copia[fila.clave] = fila.valor;

  return new Response(JSON.stringify({ tomado: new Date().toISOString(), datos: copia }), {
    headers: { "content-type": "application/json" },
  });
});
