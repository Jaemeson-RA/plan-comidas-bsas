# -*- coding: utf-8 -*-
"""Recursos gráficos para las tiendas: gráfico de funciones (store/feature.png, 1024×500)
y capturas de teléfono (store/screens/*.png, 1080×1920) tomadas del sitio publicado.

    python build_store.py "Nombre de la app"
"""
import os, sys
from playwright.sync_api import sync_playwright
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
NAME = sys.argv[1] if len(sys.argv) > 1 else "Menuario"
SITE = "https://jaemeson-ra.github.io/plan-comidas-bsas/"
OUT = os.path.join(ROOT, "store"); os.makedirs(os.path.join(OUT, "screens"), exist_ok=True)
u = lambda p: "file:///" + os.path.join(ROOT, p).replace(os.sep, "/")

FEATURE = f"""<!DOCTYPE html><html><head><meta charset="utf-8"><style>
@font-face{{font-family:YS;src:url('{u("fonts/young-serif-v2-latin_latin-ext-regular.woff2")}')}}
@font-face{{font-family:OU;src:url('{u("fonts/outfit-v15-latin_latin-ext-600.woff2")}');font-weight:600}}
*{{box-sizing:border-box;margin:0}}
body{{width:1024px;height:500px;overflow:hidden;background:#FBF7F0;font-family:OU;color:#1F2D2A;position:relative;
background-image:linear-gradient(rgba(31,45,42,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(31,45,42,.05) 1px,transparent 1px);background-size:36px 36px}}
.l{{position:absolute;left:56px;top:56px;width:520px}}
.brand{{display:flex;align-items:center;gap:14px;font-family:YS;font-size:30px}}
.brand i{{width:56px;height:56px;border-radius:50%;background:#2F8F5B;display:flex;align-items:center;justify-content:center}}
h1{{font-family:YS;font-weight:400;font-size:50px;line-height:1.08;margin:34px 0 22px;letter-spacing:-.5px}}
h1 mark{{background:linear-gradient(transparent 60%,#F2B544 60%,#F2B544 92%,transparent 92%);color:inherit;padding:0 4px}}
.chips{{display:flex;flex-wrap:wrap;gap:10px}}
.chips span{{font-weight:600;font-size:19px;background:#FFFDF9;border:2px solid #E2D8C6;border-radius:999px;padding:7px 16px}}
.chips span.g{{background:#E3F2E9;border-color:#2F8F5B;color:#23704A}}
.ph{{position:absolute;border-radius:26px;object-fit:cover;box-shadow:0 18px 40px rgba(31,45,42,.22);border:6px solid #FFFDF9}}
.p1{{right:50px;top:40px;width:330px;height:240px;transform:rotate(3deg)}}
.p2{{right:220px;top:250px;width:270px;height:200px;transform:rotate(-4deg)}}
.p3{{right:26px;top:285px;width:220px;height:180px;transform:rotate(5deg)}}
</style></head><body>
<div class="l"><div class="brand"><i><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#FFF9EE" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5.5 10.5h13"/><path d="M6.5 10.5v4.5a3 3 0 0 0 3 3h5a3 3 0 0 0 3-3v-4.5"/><path d="M12 7.5v3M10.2 7.5h3.6"/><path d="M9.8 5c0-1 .9-1 .9-2M13.3 5c0-1 .9-1 .9-2"/></svg></i><span>{NAME}</span></div>
<h1>Comé rico, <mark>gastá menos</mark>, sin pensar qué cocinar</h1>
<div class="chips"><span class="g">44 recetas con video</span><span>Lista de compras</span><span>7 súper comparados</span><span>Tu mes a medida</span></div></div>
<img class="ph p1" src="{u('img/w/empanadas-900.webp')}"><img class="ph p2" src="{u('img/w/pollohorno-900.webp')}"><img class="ph p3" src="{u('img/w/lentejas-900.webp')}">
</body></html>"""

# (archivo, página, acción opcional en la página antes de la captura)
GO = "const g=(q)=>{const e=document.querySelector(q); if(e) window.scrollTo(0, e.getBoundingClientRect().top + scrollY - 64)};"
NUT = ("const f=(i,v)=>{const e=document.getElementById(i); e.value=v; e.dispatchEvent(new Event('input',{bubbles:true})); e.dispatchEvent(new Event('change',{bubbles:true}))};"
       "f('pSexo', document.getElementById('pSexo').options[0].value); f('pEdad','32'); f('pAltura','175'); f('pPeso','74');"
       "const fm=document.getElementById('profForm'); fm.requestSubmit ? fm.requestSubmit() : fm.submit();")
SHOTS = [
    ("1-hoy", "index.html", GO + "g('#today')"),
    ("2-plan", "plan.html", GO + "g('#viewSeg')"),
    ("3-receta", "recetas.html", "document.querySelector('[data-rec]').click()"),
    ("4-compras", "compras.html", GO + "g('#shopGrid')"),
    ("5-promos", "promos.html", GO + "g('#promoPlan')"),
    ("6-nutricion", "nutricion.html", NUT + "setTimeout(()=>{" + GO + "g('#scoreBox')}, 600)"),
]

with sync_playwright() as pw:
    b = pw.chromium.launch(channel="msedge")
    pg = b.new_page(viewport={"width": 1024, "height": 500})
    tmp = os.path.join(ROOT, "tools", "_feature.html"); open(tmp, "w", encoding="utf-8").write(FEATURE)
    pg.goto(u("tools/_feature.html")); pg.wait_for_timeout(900)
    pg.screenshot(path=os.path.join(OUT, "feature.png")); os.remove(tmp); print("ok feature.png")
    ctx = b.new_context(viewport={"width": 360, "height": 640}, device_scale_factor=3, is_mobile=True, has_touch=True,
                        reduced_motion="reduce", locale="es-AR")
    pg = ctx.new_page()
    for name, page, act in SHOTS:
        pg.goto(SITE + page + "?app=1", wait_until="networkidle"); pg.wait_for_timeout(2500)
        if act: pg.evaluate(act); pg.wait_for_timeout(5000 if "NUT" in name or "nutricion" in name else 1500)
        pg.screenshot(path=os.path.join(OUT, "screens", name + ".png")); print("ok", name)
    b.close()
