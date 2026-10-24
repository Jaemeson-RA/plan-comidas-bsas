# -*- coding: utf-8 -*-
"""Revisión visual: capturas de página completa (escritorio y móvil) de todas las páginas → hojas de contacto."""
import os, sys
from playwright.sync_api import sync_playwright
from PIL import Image, ImageDraw
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
BASE = (sys.argv[1] if len(sys.argv) > 1 else "https://jaemeson-ra.github.io/plan-comidas-bsas").rstrip("/")
OUT = "media/frames"; os.makedirs(OUT, exist_ok=True)
PAGES = ["index.html", "plan.html", "recetas.html", "compras.html", "supermercados.html", "temporada.html", "nutricion.html", "mi-plan.html"]
def prep(page, pg):
    page.wait_for_timeout(1800)
    if pg == "nutricion.html":
        page.select_option("#pSexo", "m"); page.fill("#pEdad", "33"); page.fill("#pAltura", "180"); page.fill("#pPeso", "78"); page.click("#profForm .btn"); page.wait_for_timeout(700)
    if pg == "supermercados.html":
        page.fill("#buscarQ", "aceite de girasol"); page.click("#buscarForm .btn"); page.wait_for_timeout(6000)
    if pg == "mi-plan.html":
        page.evaluate("""() => { document.querySelector('#authBox').hidden=true; document.querySelector('#planBox').hidden=false; document.querySelector('#whoName').textContent='Ale'; document.querySelector('#whoEmail').textContent='· ale@correo.com'; document.querySelector('#whoLevel').textContent='3'; document.querySelector('#xpFill').style.width='48%'; document.querySelector('#xpText').textContent='455 XP · nivel 3 · faltan 445 para el 4 · 1 ficha'; document.querySelector('#avatarInit').textContent='A'; document.querySelector('#aguaCups').innerHTML='<svg class="ic cup on"><use href="#i-droplet"/></svg><svg class="ic cup on"><use href="#i-droplet"/></svg><svg class="ic cup"><use href="#i-droplet"/></svg>'; document.querySelector('#aguaTxt').textContent='2/3 vasos de 500 ml hoy · +10 XP cada uno';
          document.querySelector('#myCal').innerHTML = [['Lunes','19 oct',true],['Martes','20 oct',true],['Miércoles','21 oct',false]].map(d => `<article class="my-day${d[2]?'':' today'}"><h4>${d[0]} <span>${d[1]}</span></h4><button class="slot"><svg class="ic"><use href="#i-desayuno"/></svg><img src="img/tostadas.jpg"><span>Tostadas integrales con palta</span></button><button class="slot"><svg class="ic"><use href="#i-almuerzo"/></svg><img src="img/pollohorno.jpg"><span>Pollo al horno con calabaza</span></button><button class="slot empty"><svg class="ic"><use href="#i-cena"/></svg><span>+ elegir cena</span></button><span class="done-row"><button class="done-btn${d[2]?' on':''}">${d[2]?'Día cumplido':'Marcar cumplido'}</button>${d[2]?'':'<button class="done-btn ficha">Día libre</button>'}</span></article>`).join('');
          document.querySelector('#myShop').innerHTML = '<div class="shop-cat"><h4>Verdulería <small>3</small></h4><label><input type="checkbox"><span>palta</span><em class="q">0.5 u</em></label><label><input type="checkbox" checked><span>zapallo anco</span><em class="q">300 g</em></label><label><input type="checkbox"><span>zanahoria</span><em class="q">1 u</em></label></div>'; }""")
        page.wait_for_timeout(500)
def sweep(ctx, tag, w):
    page = ctx.new_page(); out = []
    for pg in PAGES:
        page.goto(f"{BASE}/{pg}"); prep(page, pg)
        f = os.path.join(OUT, f"rev_{tag}_{pg.replace('.html','')}.png"); page.screenshot(path=f, full_page=True); out.append(f); print("rev", tag, pg)
    return out
with sync_playwright() as p:
    b = p.chromium.launch(channel="msedge", headless=True)
    d = b.new_context(viewport={"width": 1280, "height": 900}, device_scale_factor=1, locale="es-AR", reduced_motion="reduce"); d.add_init_script("try{localStorage.setItem('planView_d','cal')}catch(e){}")
    desk = sweep(d, "d", 1280); d.close()
    m = b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True, locale="es-AR", reduced_motion="reduce")
    mob = sweep(m, "m", 390); m.close(); b.close()
for tag, files, tw, maxh in (("d", desk, 420, 2600), ("m", mob, 230, 2600)):
    cols = 4; rows = (len(files) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * (tw + 12), rows * (maxh + 26)), "white"); dr = ImageDraw.Draw(sheet)
    for i, f in enumerate(files):
        im = Image.open(f).convert("RGB"); s = tw / im.width; im = im.resize((tw, int(im.height * s))).crop((0, 0, tw, min(maxh, int(im.height))))
        x = (i % cols) * (tw + 12); y = (i // cols) * (maxh + 26); sheet.paste(im, (x, y)); dr.text((x + 2, y + maxh + 6), os.path.basename(f), fill="black")
    sheet.save(os.path.join(OUT, f"_rev_{tag}.jpg"), quality=80); print("sheet", tag, sheet.size)
