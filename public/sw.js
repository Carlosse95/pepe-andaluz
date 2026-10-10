// Trabajador en segundo plano de Pepe El Andaluz. SOLO recibe y enseña los
// avisos (Web Push); no guarda nada en caché ni intercepta descargas, para no
// estorbar a cómo se actualiza la app.

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("push", (e) => {
  let aviso = {};
  try { aviso = e.data ? e.data.json() : {}; } catch { aviso = { body: e.data && e.data.text() }; }
  const titulo = aviso.title || "Pepe El Andaluz";
  e.waitUntil(
    self.registration.showNotification(titulo, {
      body: aviso.body || "",
      icon: "icono-512.png",
      badge: "icono-180.png",
      tag: aviso.tag || undefined,
      renotify: Boolean(aviso.tag),
      data: { url: aviso.url || self.registration.scope },
    })
  );
});

// Tocar el aviso abre la app (o la trae al frente si ya estaba abierta).
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || self.registration.scope;
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((ventanas) => {
      for (const v of ventanas) {
        if (v.url.startsWith(self.registration.scope) && "focus" in v) return v.focus();
      }
      return self.clients.openWindow(url);
    })
  );
});
