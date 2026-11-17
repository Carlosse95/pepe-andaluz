// Menú público para la página web (pepeandaluz.com).
//
// La página lo pide cada vez que alguien la abre, así que lo que se cambia en
// la app (precios, platillos nuevos, el switch "Se ve en la página web") se
// ve en la página en menos de un minuto, sin volver a publicarla.
//
// Es público a propósito (no pide sesión), por eso SOLO devuelve lo que ya se
// ve en el menú: nombre, precio, unidad y categoría. `config-productos` trae
// también datos fiscales y bancarios: esos NUNCA salen de aquí. Cada campo se
// copia a mano (lista blanca), nunca el objeto completo.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const CABECERAS = {
  "content-type": "application/json; charset=utf-8",
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, OPTIONS",
  // Un minuto en caché: la página se ve al día y la nube casi no trabaja.
  "cache-control": "public, max-age=60, s-maxage=60",
};

type Producto = Record<string, unknown>;
const texto = (v: unknown) => (typeof v === "string" ? v.trim().replace(/\s+/g, " ") : "");
const numero = (v: unknown) => (typeof v === "number" && isFinite(v) ? v : Number(v) || 0);
const visible = (p: Producto) => p && !p.ocultoWeb && texto(p.nombre).length > 0;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CABECERAS });
  if (req.method !== "GET") return new Response(JSON.stringify({ error: "Solo GET" }), { status: 405, headers: CABECERAS });

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data, error } = await supabase
    .from("almacen").select("valor, updated_at").eq("clave", "config-productos").maybeSingle();
  if (error || !data) {
    return new Response(JSON.stringify({ error: "No se pudo leer el menú" }), { status: 503, headers: CABECERAS });
  }
  const c = (data.valor || {}) as Record<string, Producto[]>;

  const menu = {
    actualizado: data.updated_at,
    paellas: (c.paellas || []).filter(visible).map((p) => ({
      id: String(p.id), nombre: texto(p.nombre), precioKg: numero(p.precioKg),
    })),
    extrasPaella: (c.extrasPaella || []).filter(visible).map((e) => ({
      id: String(e.id), nombre: texto(e.nombre), precio: numero(e.precio),
    })),
    platillos: (c.extras || []).filter(visible).map((e) => ({
      id: String(e.id), nombre: texto(e.nombre), precio: numero(e.precio),
      unidad: texto(e.unidad), categoria: texto(e.categoria) || "platillo",
    })),
  };
  return new Response(JSON.stringify(menu), { headers: CABECERAS });
});
