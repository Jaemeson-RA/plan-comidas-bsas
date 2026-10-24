# -*- coding: utf-8 -*-
"""PWA: íconos (img/icons), manifest.webmanifest y sw.js con versión = hash de los archivos del sitio.

Estrategia del service worker:
- HTML, JS, CSS y data.js: primero la red (así un deploy nunca queda viejo), si no hay conexión, lo último guardado.
- Fotos, fuentes, medallas, íconos y el SDK de Firebase: primero la caché (rápido y disponible sin conexión).
- Videos mp4 y todo lo demás de otros dominios (Firebase, dolarapi, proxy de precios): pasan directo a la red."""
import os, sys, hashlib, glob, json
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
OUT = os.path.join(ROOT, "img", "icons"); os.makedirs(OUT, exist_ok=True)

POT = ("<g fill='none' stroke='#FFF9EE' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'>"
       "<path d='M5.5 10.5h13'/><path d='M6.5 10.5v4.5a3 3 0 0 0 3 3h5a3 3 0 0 0 3-3v-4.5'/><path d='M12 7.5v3M10.2 7.5h3.6'/>"
       "<path d='M9.8 5c0-1 .9-1 .9-2M13.3 5c0-1 .9-1 .9-2'/></g>")
ICONS = {
    # nombre: (svg, fondo transparente)
    "icon-192.png": ("<circle cx='12' cy='12' r='12' fill='#2F8F5B'/>" + POT, 192, True),
    "icon-512.png": ("<circle cx='12' cy='12' r='12' fill='#2F8F5B'/>" + POT, 512, True),
    "maskable-512.png": ("<rect width='24' height='24' fill='#2F8F5B'/><g transform='translate(12 11.6) scale(.66) translate(-12 -11)'>" + POT + "</g>", 512, False),
    "apple-touch-180.png": ("<rect width='24' height='24' fill='#2F8F5B'/><g transform='translate(12 11.6) scale(.8) translate(-12 -11)'>" + POT + "</g>", 180, False),
}

def render_icons():
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        b = p.chromium.launch(channel="msedge"); pg = b.new_page()
        for name, (inner, size, transp) in ICONS.items():
            svg = f"<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' width='{size}' height='{size}'>{inner}</svg>"
            pg.set_viewport_size({"width": size, "height": size})
            pg.set_content(f"<html><body style='margin:0;background:transparent'>{svg}</body></html>")
            pg.screenshot(path=os.path.join(OUT, name), omit_background=transp, clip={"x": 0, "y": 0, "width": size, "height": size})
        b.close()
    print("íconos:", ", ".join(ICONS))

MANIFEST = {
    "name": "Plan de comidas · Buenos Aires", "short_name": "Plan BA", "lang": "es-AR",
    "description": "Tu plan de comidas, recetas, lista de compras y precios de supermercados de Buenos Aires.",
    "start_url": "./index.html?app=1", "scope": "./", "display": "standalone", "orientation": "portrait",
    "background_color": "#FBF7F0", "theme_color": "#2F8F5B",
    "icons": [{"src": "img/icons/icon-192.png", "sizes": "192x192", "type": "image/png"},
              {"src": "img/icons/icon-512.png", "sizes": "512x512", "type": "image/png"},
              {"src": "img/icons/maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"}],
    "shortcuts": [{"name": "Menú de hoy", "url": "./plan.html?app=1", "icons": [{"src": "img/icons/icon-192.png", "sizes": "192x192"}]},
                  {"name": "Lista de compras", "url": "./compras.html?app=1", "icons": [{"src": "img/icons/icon-192.png", "sizes": "192x192"}]},
                  {"name": "Mi plan", "url": "./mi-plan.html?app=1", "icons": [{"src": "img/icons/icon-192.png", "sizes": "192x192"}]}],
}

PAGES = ["index.html", "plan.html", "recetas.html", "compras.html", "supermercados.html", "temporada.html", "nutricion.html", "mi-plan.html"]
CORE = ["./"] + PAGES + ["style.css", "motion.css", "gami.css", "app.js", "cuenta.js", "config.js", "data.js", "manifest.webmanifest",
        "img/icons/icon-192.png"] + sorted("fonts/" + os.path.basename(f) for f in glob.glob(os.path.join(ROOT, "fonts", "*.woff2")))

SW = r"""/* Service worker · Plan de comidas Buenos Aires (generado por tools/build_pwa.py, no editar a mano) */
const V = "pc-__V__";
const CORE = __CORE__;
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
  try { const res = await fetch(req); if (res.ok) (await caches.open(V)).put(req, res.clone()); return res; }
  catch (err) {
    const hit = (await caches.match(req)) || (await caches.match(req, { ignoreSearch: true }));
    if (hit) return hit;
    if (req.mode === "navigate") return (await caches.match("index.html")) || Response.error();
    return Response.error();
  }
}
"""

def version():
    h = hashlib.sha1()
    for rel in CORE[1:]:
        p = os.path.join(ROOT, rel)
        if os.path.isfile(p): h.update(open(p, "rb").read())
    return h.hexdigest()[:10]

if __name__ == "__main__":
    if "--no-icons" not in sys.argv: render_icons()
    open(os.path.join(ROOT, "manifest.webmanifest"), "w", encoding="utf-8").write(json.dumps(MANIFEST, ensure_ascii=False, indent=1))
    v = version()
    open(os.path.join(ROOT, "sw.js"), "w", encoding="utf-8").write(SW.replace("__V__", v).replace("__CORE__", json.dumps(CORE)))
    print("manifest + sw.js versión", v, "·", len(CORE), "archivos precargados")
