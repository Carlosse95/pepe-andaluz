// Avisos con la app cerrada (Web Push): qué puede este aparato y cómo se
// activan. En iPhone/iPad Apple solo los permite si la app se agregó a la
// pantalla de inicio y se abrió desde ese ícono.
import { guardarSuscripcionPush, borrarSuscripcionPush } from "./nube.js";

// Llave PÚBLICA de envío (la privada vive solo en la nube).
const LLAVE_PUBLICA = "BGkpIfZqxijjV0tNFsikCjkVq3Xdl3IYwlBhCCmWn04x7uNSje0X-cpFehVxPGoMVVLeIrcuQ_RmBIh4DBe_ySs";

export const esIOS = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
export const abiertaComoApp = () =>
  window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone === true;
export const soportaAvisos = () => "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

const nombreAparato = () => {
  const ua = navigator.userAgent;
  if (/iPhone/.test(ua)) return "iPhone";
  if (/iPad/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)) return "iPad";
  if (/Android/.test(ua)) return "Android";
  if (/Mac/.test(ua)) return "Mac";
  if (/Windows/.test(ua)) return "Windows";
  return "Otro";
};

const deBase64 = (b64) => {
  const relleno = "=".repeat((4 - (b64.length % 4)) % 4);
  const crudo = atob((b64 + relleno).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(crudo, (c) => c.charCodeAt(0));
};

// "activos" | "apagados" | "bloqueados" | "instalar" (iPhone sin agregar a
// inicio) | "no-se-puede"
export const estadoAvisos = async () => {
  if (!soportaAvisos()) return esIOS() && !abiertaComoApp() ? "instalar" : "no-se-puede";
  if (Notification.permission === "denied") return "bloqueados";
  const reg = await navigator.serviceWorker.getRegistration();
  const sus = reg && (await reg.pushManager.getSubscription());
  return sus && Notification.permission === "granted" ? "activos" : "apagados";
};

// Tiene que llamarse desde un toque (Apple no deja pedir permiso solo).
export const activarAvisos = async () => {
  const permiso = await Notification.requestPermission();
  if (permiso !== "granted") return permiso === "denied" ? "bloqueados" : "apagados";
  const reg = (await navigator.serviceWorker.getRegistration()) || (await navigator.serviceWorker.register("./sw.js", { scope: "./" }));
  await navigator.serviceWorker.ready;
  const sus =
    (await reg.pushManager.getSubscription()) ||
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: deBase64(LLAVE_PUBLICA) }));
  await guardarSuscripcionPush(sus, nombreAparato());
  return "activos";
};

export const apagarAvisos = async () => {
  const reg = await navigator.serviceWorker.getRegistration();
  const sus = reg && (await reg.pushManager.getSubscription());
  if (sus) {
    await borrarSuscripcionPush(sus.endpoint).catch(() => {});
    await sus.unsubscribe().catch(() => {});
  }
  return "apagados";
};

// Al entrar con sesión: si este aparato ya tenía avisos, se vuelve a guardar
// su dirección a nombre de quien entró (por si cambió de usuario o la
// dirección se renovó).
export const refrescarSuscripcion = async () => {
  if (!soportaAvisos() || Notification.permission !== "granted") return;
  const reg = await navigator.serviceWorker.getRegistration();
  const sus = reg && (await reg.pushManager.getSubscription());
  if (sus) await guardarSuscripcionPush(sus, nombreAparato()).catch(() => {});
};
