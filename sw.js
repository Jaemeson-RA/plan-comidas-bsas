/* Service worker · Menuario (generado por tools/build_pwa.py, no editar a mano) */
const V = "pc-d6cbef6e3e";
const CORE = ["./", "index.html", "plan.html", "recetas.html", "compras.html", "supermercados.html", "temporada.html", "nutricion.html", "mi-plan.html", "terminos.html", "privacidad.html", "promos.html", "app.html", "style.css", "motion.css", "gami.css", "app.js", "ahorro.js", "cuenta.js", "config.js", "data.js", "manifest.webmanifest", "img/icons/icon-192.png", "fonts/outfit-v15-latin_latin-ext-500.woff2", "fonts/outfit-v15-latin_latin-ext-600.woff2", "fonts/outfit-v15-latin_latin-ext-700.woff2", "fonts/outfit-v15-latin_latin-ext-regular.woff2", "fonts/young-serif-v2-latin_latin-ext-regular.woff2"];
self.addEventListener("install", (e) => { e.waitUntil(caches.open(V).then((c) => c.addAll(CORE)).then(() => self.skipWaiting())); });
const NOTIF = "menuario-notif";  // datos para los recordatorios (los escribe app.js): no se borra al actualizar
self.addEventListener("activate", (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== V && k !== NOTIF).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
const STATIC = /\/(img|fonts)\/|\.(webp|jpg|jpeg|png|svg|woff2)$/i;
self.addEventListener("fetch", (e) => {
  const req = e.request; if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) {
    // SDK de Firebase: versión fija, se puede guardar; el resto (base de datos, cotizaciones, precios) va directo
    if (url.hostname === "www.gstatic.com" && url.pathname.startsWith("/firebasejs/")) e.respondWith(cacheFirst(req));
    return;
  }
  if (url.pathname.endsWith(".mp4") || url.pathname.endsWith(".apk")) return;  // videos (piden rangos) y la app de Android: sin caché
  e.respondWith(STATIC.test(url.pathname) ? cacheFirst(req) : networkFirst(req));
});
// ---------- recordatorios (Web Push) ----------
// El Worker manda un push vacío en el cuarto de hora que eligió la persona; acá se arma el texto con lo que
// guardó la página: el menú de los próximos días, cuántos productos tiene la lista y las mismas preferencias.
const readN = async (k) => { try { const r = await (await caches.open(NOTIF)).match(k); return r ? await r.json() : null; } catch (e) { return null; } };
const writeN = async (k, v) => (await caches.open(NOTIF)).put(k, new Response(JSON.stringify(v), { headers: { "Content-Type": "application/json" } }));
const MES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
function localNow() { const d = new Date(Date.now() - 3 * 3600e3); return { iso: d.toISOString().slice(0, 10), min: d.getUTCHours() * 60 + d.getUTCMinutes(), dow: d.getUTCDay(), d }; }
function mondayFrom(d, dow, next) { const x = new Date(d); x.setUTCDate(x.getUTCDate() - ((dow + 6) % 7) + (next ? 7 : 0)); return x.toISOString().slice(0, 10); }
const toMin = (h) => { const [a, b] = String(h).split(":").map(Number); return a * 60 + b; };
const labISO = (iso) => `${+iso.slice(8)} ${MES[+iso.slice(5, 7) - 1]}`;
function buildNotes(snap, shown, now) {
  const p = snap.prefs || {}, notes = [];
  const due = (t, h) => h != null && shown[t] !== now.iso && now.min - toMin(h) >= 0 && now.min - toMin(h) <= 75;  // tolera pushes demorados
  if (p.c && (p.c.d || []).includes(now.dow) && due("c", p.c.h)) {
    const mon = mondayFrom(now.d, now.dow, now.dow >= 5 || now.dow === 0), w = (snap.weeks || {})[mon] || {};
    notes.push({ t: "c", title: "Hoy toca súper 🛒", body: w.n ? `Tu lista de la semana del ${labISO(mon)}: ${w.n} productos. Tocá para verla y ver dónde conviene comprar.` : "Tocá para ver tu lista de la semana y dónde conviene comprar.", url: w.url || `compras.html#semana-${mon}` });
  }
  if (due("k", p.k)) {
    const d = (snap.days || {})[now.iso];
    notes.push(d ? { t: "k", title: `Hoy se come: ${d.a}`, body: `A la noche, ${d.c}.${d.me ? ` Merienda: ${d.me}.` : ""} Tocá para ver la receta.`, url: `index.html?rec=${encodeURIComponent(d.ai)}` }
                 : { t: "k", title: "¿Qué se come hoy?", body: "Mirá el menú del día y las recetas.", url: "index.html" });
  }
  if (due("m", p.m)) notes.push({ t: "m", title: "¿Cumpliste el plan hoy? ✅", body: "Marcá tu día en Mi plan y sumá XP sin cortar la racha.", url: "mi-plan.html" });
  return notes;
}
self.addEventListener("push", (e) => {
  e.waitUntil((async () => {
    const snap = (await readN("snap")) || {}, shown = (await readN("shown")) || {}, now = localNow();
    let notes = buildNotes(snap, shown, now);
    // nada programado ahora: es la prueba desde el panel de recordatorios
    if (!notes.length) notes = [{ t: "test", title: "¡Listo! Así te llegan los recordatorios", body: "Menuario te va a avisar cuando toque hacer las compras o cocinar, aunque la app esté cerrada.", url: "index.html" }];
    for (const n of notes) {
      await self.registration.showNotification(n.title, { body: n.body, icon: "img/icons/icon-192.png", badge: "img/icons/badge-96.png", tag: "menuario-" + n.t, renotify: true, lang: "es-AR", data: { url: n.url } });
      if (n.t !== "test") shown[n.t] = now.iso;
    }
    await writeN("shown", shown);
  })());
});
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = new URL((e.notification.data && e.notification.data.url) || "index.html", self.registration.scope).href;
  e.waitUntil((async () => {
    const cs = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const c = cs.find((x) => x.url.startsWith(self.registration.scope));
    if (c) { try { await c.navigate(url); } catch (err) {} return c.focus(); }
    return self.clients.openWindow(url);
  })());
});
// si el navegador renueva la suscripción, se vuelve a guardar en el Worker con las mismas preferencias
self.addEventListener("pushsubscriptionchange", (e) => {
  e.waitUntil((async () => {
    const snap = await readN("snap"); if (!snap || !snap.api || !snap.vapid) return;
    const key = Uint8Array.from(atob(snap.vapid.replace(/-/g, "+").replace(/_/g, "/")), (ch) => ch.charCodeAt(0));
    const sub = await self.registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
    await fetch(snap.api + "/push/sub", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint, prefs: snap.prefs }) });
  })());
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
