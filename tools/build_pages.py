# Ensambla las páginas HTML: _head.html + tools/pages/<p>.body.html + _foot.html
import os, sys, json
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
root = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
head = open(os.path.join(root, "icons.svg"), encoding="utf-8").read() + "\n" + open(os.path.join(root, "_head.html"), encoding="utf-8").read()
FAVICON = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Ccircle cx='12' cy='12' r='12' fill='%232F8F5B'/%3E%3Cg fill='none' stroke='%23FFF9EE' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M5.5 10.5h13'/%3E%3Cpath d='M6.5 10.5v4.5a3 3 0 0 0 3 3h5a3 3 0 0 0 3-3v-4.5'/%3E%3Cpath d='M12 7.5v3M10.2 7.5h3.6'/%3E%3Cpath d='M9.8 5c0-1 .9-1 .9-2M13.3 5c0-1 .9-1 .9-2'/%3E%3C/g%3E%3C/svg%3E"
foot = open(os.path.join(root, "_foot.html"), encoding="utf-8").read()
META = {
 "index": ("Menuario · Plan de comidas en Buenos Aires", "Menuario: plan de comidas continuo para Buenos Aires: recetas fáciles, lista de compras, precios de supermercados con envío y alertas. Se instala como app."),
 "plan": ("Calendario · Menuario", "Qué se come cada día: plan continuo mes por mes, con recetas, fotos y videos."),
 "recetas": ("Recetas · Menuario", "30 recetas fáciles para una persona, con foto, video, nutrición y costo, y un buscador por lo que hay en tu heladera."),
 "compras": ("Lista de compras · Menuario", "Lista de compras semanal armada por góndola a partir de las recetas del plan."),
 "supermercados": ("Supermercados · Menuario", "Comparativa de 7 supermercados de Buenos Aires con envío a domicilio: condiciones y precios en ARS, USD y EUR."),
 "temporada": ("Productos de estación · Menuario", "Frutas y verduras de estación en Argentina, mes por mes, y los platos del plan que las aprovechan."),
 "nutricion": ("Nutrición · Menuario", "Calorías, proteínas, fibra y sal de tu calendario por semana y por mes, con aportes recomendados y nota sobre 10."),
 "promos": ("Promos de hoy · Menuario", "Ofertas en góndola de Coto, Día, Carrefour, Jumbo, Disco, Vea y ChangoMás, actualizadas cada 3 horas."),
 "terminos": ("Términos de uso · Menuario", "Condiciones de uso del sitio: salud, precios, cuentas, contenido de usuarios y propiedad intelectual."),
 "privacidad": ("Política de privacidad · Menuario", "Qué datos se guardan, para qué, quién los procesa y cómo borrarlos, según la Ley 25.326."),
 "mi-plan": ("Mi plan · Menuario", "Creá tu cuenta y armá tu propio calendario de comidas eligiendo las recetas que quieras."),
 "pasos": ("Pasos · Menuario", "Tus pasos de cada día con un objetivo a tu medida, kilómetros, calorías y gráficos. Con la app de Android se cuentan solos."),
 "app": ("La app · Menuario", "Bajá la app para Android o agregala al inicio del iPhone: el plan, las recetas y la lista de compras a pantalla completa y sin conexión."),
 "404": ("Página no encontrada · Menuario", "Esa página no existe: volvé al plan, las recetas o la lista de compras."),
}
SITE = "https://jaemeson-ra.github.io/plan-comidas-bsas/"
# Firebase: se conecta y se baja el SDK en paralelo con el resto (antes esperaba a cuenta.js)
FB = "https://www.gstatic.com/firebasejs/10.14.1/"
FB_HINTS = ("<link rel=\"preconnect\" href=\"https://www.gstatic.com\" crossorigin>\n<link rel=\"preconnect\" href=\"https://viaje-del-amor-default-rtdb.europe-west1.firebasedatabase.app\">\n"
            + "".join(f"<link rel=\"modulepreload\" href=\"{FB}{m}.js\">\n" for m in ("firebase-app", "firebase-auth", "firebase-database")))
import datetime, hashlib, base64, subprocess
# script en línea del <head>: marca el modo app antes de pintar (sin parpadeo)
EARLY_JS = ('try{if(matchMedia("(display-mode: standalone)").matches||navigator.standalone||/[?&]app=1/.test(location.search)||/^android-app:/.test(document.referrer)'
            '||sessionStorage.getItem("inApp")==="1"){document.documentElement.classList.add("is-app");sessionStorage.setItem("inApp","1")}}catch(e){}')
# navegación casi instantánea: Chrome (y la app) bajan la página de un enlace interno al apoyar el dedo o el mouse encima
SPEC_JS = json.dumps({"prefetch": [{"where": {"and": [{"href_matches": "/plan-comidas-bsas/*.html"}, {"not": {"selector_matches": "[download], [target=_blank]"}}]}, "eagerness": "moderate"}]}, separators=(",", ":"))
sha = lambda s: "'sha256-" + base64.b64encode(hashlib.sha256(s.encode("utf-8")).digest()).decode() + "'"
# Política de seguridad: scripts solo de este sitio, de Firebase/reCAPTCHA (Google) y de las dos bibliotecas de cdnjs/jsDelivr
CSP = ('<meta http-equiv="Content-Security-Policy" content="default-src \'self\'; '
       f"script-src 'self' {sha(EARLY_JS)} {sha(SPEC_JS)} https://www.gstatic.com https://www.google.com https://cdnjs.cloudflare.com https://cdn.jsdelivr.net https://*.firebasedatabase.app; "
       "style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; img-src 'self' data: blob: https:; font-src 'self'; media-src 'self'; "
       "connect-src 'self' https: wss:; frame-src https://www.youtube-nocookie.com https://www.google.com https://recaptcha.google.com https://viaje-del-amor.firebaseapp.com; "
       "worker-src 'self'; manifest-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self' https://script.google.com\">\n")
for page, (title, desc) in META.items():
    body = open(os.path.join(root, "tools", "pages", f"{page}.body.html"), encoding="utf-8").read()
    body = body.replace("<main ", '<main id="main" ', 1)
    url = SITE + ("" if page == "index" else f"{page}.html")
    social = (  # vista previa al compartir en WhatsApp, redes y buscadores
        f"<link rel=\"canonical\" href=\"{url}\">\n"
        "<meta property=\"og:type\" content=\"website\">\n<meta property=\"og:locale\" content=\"es_AR\">\n<meta property=\"og:site_name\" content=\"Menuario\">\n"
        f"<meta property=\"og:title\" content=\"{title}\">\n<meta property=\"og:description\" content=\"{desc}\">\n<meta property=\"og:url\" content=\"{url}\">\n"
        f"<meta property=\"og:image\" content=\"{SITE}img/og.jpg\">\n<meta property=\"og:image:width\" content=\"1200\">\n<meta property=\"og:image:height\" content=\"630\">\n"
        "<meta property=\"og:image:alt\" content=\"Menuario: recetas, lista de compras y precios de supermercados\">\n"
        "<meta name=\"twitter:card\" content=\"summary_large_image\">\n")
    if page == "404": social = "<base href=\"/plan-comidas-bsas/\">\n<meta name=\"robots\" content=\"noindex\">\n"
    html = (
        "<!DOCTYPE html>\n<html lang=\"es-AR\">\n<head>\n<meta charset=\"UTF-8\">\n"
        "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n"
        f"<title>{title}</title>\n<meta name=\"description\" content=\"{desc}\">\n" + social +
        f"<link rel=\"icon\" href=\"{FAVICON}\">\n"
        "<link rel=\"preload\" href=\"fonts/young-serif-v2-latin_latin-ext-regular.woff2\" as=\"font\" type=\"font/woff2\" crossorigin>\n"
        "<link rel=\"preload\" href=\"fonts/outfit-v15-latin_latin-ext-regular.woff2\" as=\"font\" type=\"font/woff2\" crossorigin>\n"
        "<link rel=\"preload\" href=\"fonts/outfit-v15-latin_latin-ext-600.woff2\" as=\"font\" type=\"font/woff2\" crossorigin>\n"
        + (FB_HINTS if page in ("mi-plan", "nutricion", "pasos") else "") +
        "<link rel=\"manifest\" href=\"manifest.webmanifest\">\n<meta name=\"theme-color\" content=\"#2F8F5B\">\n"
        "<link rel=\"apple-touch-icon\" href=\"img/icons/apple-touch-180.png\">\n<meta name=\"apple-mobile-web-app-capable\" content=\"yes\">\n"
        "<meta name=\"apple-mobile-web-app-title\" content=\"Menuario\">\n<meta name=\"apple-mobile-web-app-status-bar-style\" content=\"default\">\n"
        f"<script>{EARLY_JS}</script>\n<script type=\"speculationrules\">{SPEC_JS}</script>\n<link rel=\"stylesheet\" href=\"menuario.min.css\">\n</head>\n<body>\n<a class=\"skip\" href=\"#main\">Saltar al contenido</a>\n" + head + "\n" + body + "\n" + foot)
    html = html.replace("<head>\n<meta charset=\"UTF-8\">\n", "<head>\n<meta charset=\"UTF-8\">\n" + CSP + "<meta name=\"referrer\" content=\"strict-origin-when-cross-origin\">\n", 1)
    if page not in ("compras", "promos", "supermercados"):
        html = html.replace('<script src="ahorro.js" data-only="compras promos supermercados"></script>\n', "")
    if page not in ("mi-plan", "nutricion", "pasos"):
        html = html.replace('<script type="module" src="cuenta.js" data-only="miplan nutricion pasos"></script>\n', "")
    # se sirven las versiones minificadas (las fuentes quedan legibles en el repositorio)
    for js in ("app", "ahorro", "cuenta"):
        html = html.replace(f'src="{js}.js"', f'src="{js}.min.js"')
    open(os.path.join(root, f"{page}.html"), "w", encoding="utf-8").write(html)
    print("OK", page + ".html", len(html))

# buscadores: robots.txt y sitemap.xml
hoy = datetime.date.today().isoformat()
pages = [p for p in META if p != "404"]
prio = {"index": "1.0", "plan": "0.9", "recetas": "0.9", "compras": "0.8", "promos": "0.8", "supermercados": "0.8", "nutricion": "0.7", "temporada": "0.6", "mi-plan": "0.6", "app": "0.7", "terminos": "0.2", "privacidad": "0.2"}
open(os.path.join(root, "sitemap.xml"), "w", encoding="utf-8").write('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + "".join(
    f"  <url><loc>{SITE}{'' if p == 'index' else p + '.html'}</loc><lastmod>{hoy}</lastmod><changefreq>{'daily' if p in ('promos', 'plan') else 'weekly'}</changefreq><priority>{prio.get(p, '0.5')}</priority></url>\n" for p in pages) + "</urlset>\n")
open(os.path.join(root, "robots.txt"), "w", encoding="utf-8").write(f"User-agent: *\nAllow: /\nDisallow: /plan-comidas-bsas/tools/\nSitemap: {SITE}sitemap.xml\n")

# JS y CSS minificados con esbuild (npx): menos peso y, en el CSS, un solo pedido en vez de tres
def esb(*args): subprocess.run(["npx", "--yes", "esbuild@0.28.2", *args, "--log-level=warning"], cwd=root, check=True, shell=(os.name == "nt"))
for js in ("app", "ahorro"): esb(f"{js}.js", "--minify", "--target=es2020", f"--outfile={js}.min.js")
esb("cuenta.js", "--minify", "--target=es2020", "--format=esm", "--outfile=cuenta.min.js")
css = "".join(open(os.path.join(root, f), encoding="utf-8").read() + "\n" for f in ("style.css", "motion.css", "gami.css"))
open(os.path.join(root, "tools", "_bundle.css"), "w", encoding="utf-8").write(css)
esb("tools/_bundle.css", "--minify", "--loader:.css=css", "--outfile=menuario.min.css"); os.remove(os.path.join(root, "tools", "_bundle.css"))
for f in ("app.min.js", "ahorro.min.js", "cuenta.min.js", "menuario.min.css"): print("OK", f, os.path.getsize(os.path.join(root, f)) // 1024, "KB")

# PWA: el service worker se versiona con el contenido de los archivos recién generados
subprocess.run([sys.executable, os.path.join(root, "tools", "build_pwa.py"), "--no-icons"], check=False)
