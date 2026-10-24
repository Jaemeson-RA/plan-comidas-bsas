# -*- coding: utf-8 -*-
"""Audit móvil: para cada página, detecta desborde horizontal y lista los elementos que se pasan del ancho.
Uso: python tools/video/audit_mobile.py [http://localhost:8765] [ancho=375]  -> media/frames/mobile_*.png + informe en consola"""
import os, sys, json
from playwright.sync_api import sync_playwright
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8765").rstrip("/")
W = int(sys.argv[2]) if len(sys.argv) > 2 else 375
ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
OUT = os.path.join(ROOT, "media", "frames"); os.makedirs(OUT, exist_ok=True)
PAGES = ["index.html", "plan.html", "recetas.html", "compras.html", "supermercados.html", "temporada.html", "nutricion.html", "mi-plan.html"]
JS = """() => {
  const vw = document.documentElement.clientWidth; const bad = [];
  document.querySelectorAll('body *').forEach(el => {
    const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden' || cs.position === 'fixed') return;
    const r = el.getBoundingClientRect(); if (r.width === 0) return;
    if (r.right > vw + 1 || r.left < -1) {
      // ignorar hijos de contenedores con scroll horizontal propio
      let p = el.parentElement, scrollable = false; while (p && p !== document.body) { const o = getComputedStyle(p).overflowX; if (o === 'auto' || o === 'scroll') { scrollable = true; break; } p = p.parentElement; }
      if (!scrollable) bad.push({ tag: el.tagName.toLowerCase(), cls: (el.className && el.className.baseVal === undefined ? el.className : '').toString().slice(0, 40), id: el.id, right: Math.round(r.right), left: Math.round(r.left), w: Math.round(r.width) });
    }
  });
  return { vw, sw: document.documentElement.scrollWidth, bad: bad.slice(0, 25) };
}"""
with sync_playwright() as p:
    b = p.chromium.launch(channel="msedge", headless=True)
    ctx = b.new_context(viewport={"width": W, "height": 812}, device_scale_factor=2, is_mobile=True, has_touch=True, locale="es-AR", reduced_motion="reduce")
    page = ctx.new_page()
    for pg in PAGES:
        page.goto(f"{BASE}/{pg}"); page.wait_for_timeout(2200)
        if pg == "nutricion.html":
            page.select_option("#pSexo", "f"); page.fill("#pEdad", "31"); page.fill("#pAltura", "165"); page.fill("#pPeso", "62"); page.click("#profForm .btn"); page.wait_for_timeout(800)
        if pg == "mi-plan.html":
            page.click("#authSeg [data-mode=signup]"); page.wait_for_timeout(300)
            # demo: mostrar el calendario propio y el editor para auditarlos también
            page.evaluate("""() => { document.querySelector('#authBox').hidden=false; document.querySelector('#planBox').hidden=false; document.querySelector('#myCal').innerHTML = `<article class="my-day today"><h4>Lunes <span>27 oct</span></h4><button class="slot"><svg class="ic"><use href="#i-desayuno"/></svg><img src="img/tostadas.jpg"><span>Tostadas integrales con palta o queso untable</span></button><button class="slot empty"><svg class="ic"><use href="#i-almuerzo"/></svg><span>+ elegir almuerzo</span></button><button class="slot empty"><svg class="ic"><use href="#i-cena"/></svg><span>+ elegir cena</span></button><button class="done-btn">Marcar cumplido</button></article>`; }""")
        res = page.evaluate(JS)
        page.screenshot(path=os.path.join(OUT, f"mobile_{pg.replace('.html','')}.png"), full_page=True)
        flag = "OVERFLOW" if res["sw"] > res["vw"] else "ok"
        print(f"== {pg}: viewport {res['vw']} · scrollWidth {res['sw']} · {flag}")
        for x in res["bad"]: print("   ", x)
    # modales de mi-plan (editor de receta e ingrediente) y modal de receta
    page.goto(f"{BASE}/mi-plan.html"); page.wait_for_timeout(1800)
    for mid in ("recEditor", "ingEditor"):
        page.evaluate(f"document.querySelector('#{mid}').hidden=false; document.querySelector('#scanArea') && (document.querySelector('#scanArea').hidden=false)")
        page.wait_for_timeout(300); res = page.evaluate(JS); print(f"== mi-plan modal {mid}: scrollWidth {res['sw']} · {'OVERFLOW' if res['sw'] > res['vw'] else 'ok'}")
        for x in res["bad"]: print("   ", x)
        page.screenshot(path=os.path.join(OUT, f"mobile_modal_{mid}.png"), full_page=False)
        page.evaluate(f"document.querySelector('#{mid}').hidden=true")
    page.goto(f"{BASE}/recetas.html"); page.wait_for_selector(".rc"); page.click(".rc"); page.wait_for_timeout(900)
    res = page.evaluate(JS); print(f"== receta modal: scrollWidth {res['sw']} · {'OVERFLOW' if res['sw'] > res['vw'] else 'ok'}")
    for x in res["bad"]: print("   ", x)
    page.screenshot(path=os.path.join(OUT, "mobile_modal_receta.png"), full_page=False)
    b.close()
print("OK")
