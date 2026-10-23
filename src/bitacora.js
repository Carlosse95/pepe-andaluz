// Apunta en la nube (tabla errores_app) lo que truena en cualquier aparato:
// un botón que "no hace nada" casi siempre es un error escondido. Así se
// puede ver qué pasó en el iPad sin tenerlo en la mano. Como mucho 10 por
// sesión y sin repetir el mismo mensaje.
import { reportarError } from "./nube.js";

const vistos = new Set();
let enviados = 0;
// Ruido de red (sin internet, se cerró la app a media petición): no es falla
// de la app y llenaría la bitácora.
const RUIDO = /Load failed|Failed to fetch|NetworkError|AbortError|aborted|ResizeObserver loop|tope de tiempo/i;

export function anotarError(mensaje, donde) {
  const m = String(mensaje || "").slice(0, 500);
  if (!m || RUIDO.test(m) || vistos.has(m) || enviados >= 10) return;
  vistos.add(m);
  enviados += 1;
  const version = (document.querySelector('script[src*="index-"]')?.src.match(/index-[^/]+\.js/) || [])[0] || "";
  reportarError({
    mensaje: m,
    donde: String(donde || "").slice(0, 1500),
    pantalla: (document.querySelector(".af-header")?.innerText || "").replace("Abrir o cerrar el menú", "").replace(/\s+/g, " ").trim().slice(0, 80),
    // El iPad dice ser una Mac; los puntos táctiles lo delatan.
    agente: (navigator.userAgent + (navigator.maxTouchPoints > 1 ? " · táctil" : "") + ` · ${innerWidth}x${innerHeight}`).slice(0, 300),
    version,
  });
}

export function vigilarErrores() {
  window.addEventListener("error", (e) => anotarError(e.message, e.error?.stack || `${e.filename}:${e.lineno}`));
  window.addEventListener("unhandledrejection", (e) => anotarError(e.reason?.message || e.reason, e.reason?.stack));
}
