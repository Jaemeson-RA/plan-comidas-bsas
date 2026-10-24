# -*- coding: utf-8 -*-
"""Audit de superposiciones en móvil: elementos interactivos y fijos que se pisan entre sí.
Uso: python tools/video/audit_overlap.py [http://localhost:8765] [ancho=390]"""
import os, sys
from playwright.sync_api import sync_playwright
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8765").rstrip("/")
W = int(sys.argv[2]) if len(sys.argv) > 2 else 390
PAGES = ["index.html", "plan.html", "recetas.html", "compras.html", "supermercados.html", "temporada.html", "nutricion.html", "mi-plan.html"]
JS = """() => {
  const vis = (el) => { const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) return false; const r = el.getBoundingClientRect(); return r.width > 2 && r.height > 2 && r.bottom > 0 && r.top < innerHeight; };
  const desc = (el) => (el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\\s+/).slice(0, 2).join('.') : '') + ' "' + (el.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 28) + '"');
  const modalOpen = !!document.querySelector('.modal:not([hidden])'); const items = [...document.querySelectorAll('a, button, input, select, textarea, summary, .tabbar, .sug-fab, .ss, .top, .popover, .more-menu')].filter(vis).filter(el => !el.closest('[hidden]') && !el.closest('details:not([open])') && !(modalOpen && !el.closest('.modal')));
  const fixedOf = (el) => { let p = el; while (p && p !== document.body) { const pos = getComputedStyle(p).position; if (pos === 'fixed' || pos === 'sticky') return p; p = p.parentElement; } return null; };
  const out = [];
  for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) {
    const a = items[i], b = items[j]; if (a.contains(b) || b.contains(a)) continue;
    const fa = fixedOf(a), fb = fixedOf(b); if (fa && fb && fa === fb) continue;   // dentro del mismo contenedor fijo
    if (fa && fb) continue;  // dos fijos distintos (header vs tabbar) no se tocan por diseño; se controla aparte
    const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
    const ix = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left), iy = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
    if (ix > 4 && iy > 4) {
      // solo interesa si uno es fijo/sticky (tapa contenido) o si ambos son controles del flujo que se pisan
      const fixedInvolved = !!(fa || fb);
      const bothControls = ['A','BUTTON','INPUT','SELECT','TEXTAREA','SUMMARY'].includes(a.tagName) && ['A','BUTTON','INPUT','SELECT','TEXTAREA','SUMMARY'].includes(b.tagName);
      if (fixedInvolved || bothControls) out.push({ a: desc(fa && fa !== a ? fa : a), b: desc(fb && fb !== b ? fb : b), ix: Math.round(ix), iy: Math.round(iy), scrollY: Math.round(scrollY) });
    }
  }
  // deduplicar
  const seen = new Set(); return out.filter(o => { const k = o.a + '|' + o.b; if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, 12);
}"""
with sync_playwright() as p:
    b = p.chromium.launch(channel="msedge", headless=True)
    ctx = b.new_context(viewport={"width": W, "height": 812}, device_scale_factor=2, is_mobile=True, has_touch=True, locale="es-AR", reduced_motion="reduce")
    page = ctx.new_page(); total = 0
    for pg in PAGES:
        page.goto(f"{BASE}/{pg}"); page.wait_for_timeout(1800)
        if pg == "nutricion.html":
            page.select_option("#pSexo", "f"); page.fill("#pEdad", "31"); page.fill("#pAltura", "165"); page.fill("#pPeso", "62"); page.click("#profForm .btn"); page.wait_for_timeout(600)
        if pg == "mi-plan.html":
            page.evaluate("""() => { document.querySelector('#authBox').hidden=true; document.querySelector('#planBox').hidden=false; document.querySelector('#myCal').innerHTML = `<article class="my-day today"><h4>Lunes <span>27 oct</span></h4><button class="slot"><span>Tostadas integrales</span></button><button class="slot empty"><span>+ elegir almuerzo</span></button><button class="slot empty"><span>+ elegir cena</span></button><button class="done-btn">Marcar cumplido</button></article>`; }""")
        h = page.evaluate("document.documentElement.scrollHeight"); found = []
        for y in range(0, h, 500):
            page.evaluate(f"window.scrollTo(0,{y})"); page.wait_for_timeout(250)
            for o in page.evaluate(JS):
                k = (o["a"], o["b"])
                if k not in [(f["a"], f["b"]) for f in found]: found.append(o)
        print(f"== {pg}: {len(found)} superposiciones"); total += len(found)
        for o in found[:10]: print(f"   {o['a']}  <->  {o['b']}  ({o['ix']}x{o['iy']} px, scroll {o['scrollY']})")
    # modales en móvil
    page.goto(f"{BASE}/recetas.html"); page.wait_for_selector(".rc"); page.click(".rc"); page.wait_for_timeout(900)
    for y in (0, 400, 900, 1400):
        page.evaluate(f"document.querySelector('.modal-box').scrollTop={y}"); page.wait_for_timeout(200)
        for o in page.evaluate(JS): print(f"   [modal receta scroll {y}] {o['a']} <-> {o['b']} ({o['ix']}x{o['iy']})"); total += 1
    b.close()
print("TOTAL", total)
