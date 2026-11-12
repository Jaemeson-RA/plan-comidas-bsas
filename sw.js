// Menuario se mudó a https://menuario.com: este service worker borra el viejo, sus cachés y recarga las pestañas
// (la página que se abre manda a menuario.com con los datos del teléfono).
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil((async () => {
  for (const k of await caches.keys()) await caches.delete(k);
  await self.registration.unregister();
  for (const c of await self.clients.matchAll({ type: "window" })) c.navigate(c.url);
})()));
