# -*- coding: utf-8 -*-
"""Imagen para compartir (img/og.jpg, 1200×630): la vista previa de WhatsApp, redes y buscadores."""
import os, sys
from playwright.sync_api import sync_playwright
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
u = lambda p: "file:///" + os.path.join(ROOT, p).replace("\\", "/")
HTML = f"""<!DOCTYPE html><html><head><meta charset="utf-8"><style>
@font-face{{font-family:YS;src:url('{u("fonts/young-serif-v2-latin_latin-ext-regular.woff2")}')}}
@font-face{{font-family:OU;src:url('{u("fonts/outfit-v15-latin_latin-ext-600.woff2")}');font-weight:600}}
@font-face{{font-family:OU;src:url('{u("fonts/outfit-v15-latin_latin-ext-regular.woff2")}');font-weight:400}}
*{{box-sizing:border-box;margin:0}}
body{{width:1200px;height:630px;overflow:hidden;background:#FBF7F0;font-family:OU;color:#1F2D2A;position:relative;
background-image:linear-gradient(rgba(31,45,42,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(31,45,42,.05) 1px,transparent 1px);background-size:40px 40px}}
.l{{position:absolute;left:70px;top:70px;width:600px}}
.brand{{display:flex;align-items:center;gap:16px;font-family:YS;font-size:30px}}
.brand i{{width:58px;height:58px;border-radius:50%;background:#2F8F5B;display:flex;align-items:center;justify-content:center}}
.brand em{{font-style:normal;color:#23704A}}
h1{{font-family:YS;font-weight:400;font-size:58px;line-height:1.08;margin:40px 0 24px;letter-spacing:-.5px}}
h1 mark{{background:linear-gradient(transparent 60%,#F2B544 60%,#F2B544 92%,transparent 92%);color:inherit;padding:0 4px}}
.chips{{display:flex;flex-wrap:wrap;gap:12px;width:560px}}
.chips span{{font-weight:600;font-size:22px;background:#FFFDF9;border:2px solid #E2D8C6;border-radius:999px;padding:8px 18px}}
.chips span.g{{background:#E3F2E9;border-color:#2F8F5B;color:#23704A}}
.ph{{position:absolute;border-radius:28px;object-fit:cover;box-shadow:0 18px 40px rgba(31,45,42,.22);border:6px solid #FFFDF9}}
.p1{{right:70px;top:60px;width:380px;height:270px;transform:rotate(3deg)}}
.p2{{right:250px;top:300px;width:300px;height:230px;transform:rotate(-4deg)}}
.p3{{right:40px;top:350px;width:250px;height:210px;transform:rotate(5deg)}}
.url{{position:absolute;left:70px;bottom:46px;font-weight:600;font-size:22px;color:#23704A}}
</style></head><body>
<div class="l"><div class="brand"><i><svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#FFF9EE" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5.5 10.5h13"/><path d="M6.5 10.5v4.5a3 3 0 0 0 3 3h5a3 3 0 0 0 3-3v-4.5"/><path d="M12 7.5v3M10.2 7.5h3.6"/><path d="M9.8 5c0-1 .9-1 .9-2M13.3 5c0-1 .9-1 .9-2"/></svg></i><span>Menu<em>ario</em></span></div>
<h1>Comé rico, <mark>gastá menos</mark>, sin pensar qué cocinar</h1>
<div class="chips"><span class="g">44 recetas con video</span><span>Lista de compras</span><span>7 súper comparados</span><span>Tu mes a medida</span></div></div>
<img class="ph p1" src="{u('img/w/empanadas-900.webp')}"><img class="ph p2" src="{u('img/w/pollohorno-900.webp')}"><img class="ph p3" src="{u('img/w/lentejas-900.webp')}">
<div class="url">jaemeson-ra.github.io/plan-comidas-bsas</div>
</body></html>"""
p = os.path.join(ROOT, "tools", "_og.html"); open(p, "w", encoding="utf-8").write(HTML)
with sync_playwright() as pw:
    b = pw.chromium.launch(channel="msedge"); pg = b.new_page(viewport={"width": 1200, "height": 630})
    pg.goto(u("tools/_og.html")); pg.wait_for_timeout(900)
    out = os.path.join(ROOT, "img", "og.jpg"); pg.screenshot(path=out, type="jpeg", quality=86); b.close()
os.remove(p); print("ok", out, os.path.getsize(out) // 1024, "KB")
