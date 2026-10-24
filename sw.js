/* Service worker · Menuario (generado por tools/build_pwa.py, no editar a mano) */
const V = "pc-6a87bd8484";
const CORE = ["./", "index.html", "plan.html", "recetas.html", "compras.html", "supermercados.html", "temporada.html", "nutricion.html", "mi-plan.html", "terminos.html", "privacidad.html", "promos.html", "app.html", "style.css", "motion.css", "gami.css", "app.js", "ahorro.js", "cuenta.js", "config.js", "data.js", "manifest.webmanifest", "img/icons/icon-192.png", "fonts/outfit-v15-latin_latin-ext-500.woff2", "fonts/outfit-v15-latin_latin-ext-600.woff2", "fonts/outfit-v15-latin_latin-ext-700.woff2", "fonts/outfit-v15-latin_latin-ext-regular.woff2", "fonts/young-serif-v2-latin_latin-ext-regular.woff2"];
self.addEventListener("install", (e) => { e.waitUntil(caches.open(V).then((c) => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener("activate", (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== V).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
const STATIC = /\/(img|fonts)\/|\.(webp|jpg|jpeg|png|svg|woff2)$/i;
self.addEventListener("fetch", (e) => {
  const req = e.request; if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) {
    // SDK de Firebase: versión fija, se puede guardar; el resto (base de datos, cotizaciones, precios) va directo
    if (url.hostname === "www.gstatic.com" && url.pathname.startsWith("/firebasejs/")) e.respondWith(cacheFirst(req));
    return;
  }
  if (url.pathname.endsWith(".mp4")) return;  // los videos piden rangos: mejor sin caché
  e.respondWith(STATIC.test(url.pathname) ? cacheFirst(req) : networkFirst(req));
});
async function cacheFirst(req) {
  const hit = await caches.match(req); if (hit) return hit;
  try { const res = await fetch(req); if (res.ok || res.type === "opaque") (await caches.open(V)).put(req, res.clone()); return res; }
  catch (err) { return new Response("", { status: 504 }); }
}
async function networkFirst(req) {
  try { const res = await fetch(req, { cache: "no-cache" }); if (res.ok) (await caches.open(V)).put(req, res.clone()); return res; }  // no-cache: revalida siempre (304 si no cambió)
  catch (err) {
    const hit = (await caches.match(req)) || (await caches.match(req, { ignoreSearch: true }));
    if (hit) return hit;
    if (req.mode === "navigate") return (await caches.match("index.html")) || Response.error();
    return Response.error();
  }
}
