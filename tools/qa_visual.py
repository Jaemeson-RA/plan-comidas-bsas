# -*- coding: utf-8 -*-
"""Control visual: todas las páginas en 7 anchos (320 → 1440) + Mi plan con sesión + estados (ficha, modo cocina, comparador, mapa).
Detecta: desborde horizontal, elementos fuera de pantalla, textos que se pisan, botones chicos en táctil, letra muy chica,
imágenes rotas o sin alt y errores de consola. Saca capturas a media/qa/ y arma hojas de contacto.
Uso: python tools/qa_visual.py [http://localhost:8765] [correo] [contraseña]"""
import os, sys, json
from playwright.sync_api import sync_playwright
from PIL import Image, ImageDraw
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8765").rstrip("/")
EMAIL, PASS = (sys.argv[2], sys.argv[3]) if len(sys.argv) > 3 else (None, None)
ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
OUT = os.path.join(ROOT, "media", "qa"); os.makedirs(OUT, exist_ok=True)
PAGES = ["index", "plan", "recetas", "compras", "promos", "supermercados", "temporada", "nutricion", "mi-plan", "terminos", "privacidad", "404"]
VIEWS = [("320", 320, 640, True), ("375", 375, 812, True), ("414", 414, 896, True), ("768", 768, 1024, True), ("1024", 1024, 768, False), ("1280", 1280, 800, False), ("1440", 1440, 900, False)]
SHOTS = {"375", "768", "1280"}
CHECK = r"""(touch) => {
  const W = innerWidth, out = { overflow: document.documentElement.scrollWidth - W, off: [], overlap: [], small: [], tiny: [], img: [] };
  const vis = (el) => { const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity < 0.05) return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const desc = (el) => (el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '') + ' «' + (el.textContent || el.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 30) + '»');
  const clipped = (el) => { for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) { const cs = getComputedStyle(p); if (/(auto|scroll|hidden|clip)/.test(cs.overflowX) || cs.position === 'fixed') return true; } return false; };
  const all = [...document.querySelectorAll('body *')].filter((el) => !el.closest('svg') && !el.closest('[hidden]') && !el.closest('.leaflet-container') && vis(el));
  for (const el of all) { const r = el.getBoundingClientRect(); if ((r.right > W + 1 || r.left < -1) && !clipped(el) && getComputedStyle(el).position !== 'fixed') out.off.push(desc(el) + ` [${Math.round(r.left)}→${Math.round(r.right)}]`); }
  // textos del flujo que se pisan (los absolutos/fijos se ignoran: son superposiciones a propósito)
  const txt = all.filter((el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 1)).filter((el) => { for (let p = el; p && p !== document.body; p = p.parentElement) { const pos = getComputedStyle(p).position; if (pos === 'absolute' || pos === 'fixed' || pos === 'sticky') return false; } return true; }).slice(0, 700);
  const rs = txt.map((el) => { const rg = document.createRange(); rg.selectNodeContents(el); const b = [...rg.getClientRects()].filter((x) => x.width > 2 && x.height > 2); return b; });
  for (let i = 0; i < txt.length; i++) for (let j = i + 1; j < txt.length; j++) {
    const a = txt[i], b = txt[j]; if (a.contains(b) || b.contains(a)) continue;
    let hit = false; for (const ra of rs[i]) { for (const rb of rs[j]) { const ix = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left), iy = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top); if (ix > 3 && iy > 3) { hit = true; break; } } if (hit) break; }
    if (hit) out.overlap.push(desc(a) + '  ×  ' + desc(b));
  }
  if (touch) for (const el of all.filter((e) => e.matches('a, button, input, select, summary, [role=button]'))) {
    if (el.closest('p, li > small, .credit, .lead, .v-list, .legal')) continue;  // enlaces dentro de un texto
    if (el.matches('input[type=checkbox], input[type=radio]') && el.closest('label')) continue;  // la etiqueta entera es el área táctil
    const r = el.getBoundingClientRect(); if (Math.min(r.width, r.height) < 30) out.small.push(desc(el) + ` ${Math.round(r.width)}×${Math.round(r.height)}`);
  }
  for (const el of txt) { const fs = parseFloat(getComputedStyle(el).fontSize); if (fs < (touch ? 11 : 10.5)) out.tiny.push(desc(el) + ' ' + fs + 'px'); }
  for (const im of document.images) { if (!vis(im)) continue; if (!im.hasAttribute('alt')) out.img.push('sin alt: ' + (im.getAttribute('src') || '').slice(0, 60)); else if (im.complete && im.naturalWidth === 0 && im.getAttribute('src')) out.img.push('rota: ' + im.getAttribute('src').slice(0, 70)); }
  const dedup = (a) => [...new Set(a)];
  out.off = dedup(out.off).slice(0, 8); out.overlap = dedup(out.overlap).slice(0, 10); out.small = dedup(out.small); out.tiny = dedup(out.tiny).slice(0, 8); out.img = dedup(out.img).slice(0, 8);
  return out;
}"""
report, shots = {}, {}
def settle(page, pg):
    page.wait_for_timeout(2200 if pg in ("promos",) else 1300)
    if pg == "nutricion":
        page.select_option("#pSexo", "m"); page.fill("#pEdad", "35"); page.fill("#pAltura", "185"); page.fill("#pPeso", "105"); page.select_option("#pAct", "1.3"); page.click("#profForm .btn"); page.wait_for_timeout(600)
        page.click("#mdGo"); page.wait_for_timeout(900)
    if pg == "promos": page.wait_for_selector(".promo:not(.skel-box)", timeout=20000)
def run(ctx, tag, w, h, touch, pages, prefix="", before=None):
    page = ctx.new_page(); errs = []
    page.on("pageerror", lambda e: errs.append("pageerror: " + str(e)[:160]))
    page.on("console", lambda m: errs.append("console: " + m.text[:160]) if m.type == "error" and "favicon" not in m.text else None)
    for pg in pages:
        errs.clear(); url = f"{BASE}/{pg}.html" if pg != "404" else f"{BASE}/no-existe/otra"
        page.goto(url); settle(page, pg)
        if before: before(page, pg)
        r = page.evaluate(CHECK, touch); r["errors"] = list(dict.fromkeys(errs))[:6]
        report[f"{prefix}{pg}@{tag}"] = r
        if tag in SHOTS:
            f = os.path.join(OUT, f"{prefix}{pg}_{tag}.png"); page.screenshot(path=f, full_page=True); shots.setdefault(tag, []).append(f)
        print("ok", prefix + pg, tag, "| overflow", r["overflow"], "| off", len(r["off"]), "| overlap", len(r["overlap"]), "| small", len(r["small"]), "| tiny", len(r["tiny"]), "| img", len(r["img"]), "| err", len(r["errors"]))
    page.close()
with sync_playwright() as p:
    b = p.chromium.launch(channel="msedge", headless=True)
    for tag, w, h, touch in VIEWS:
        ctx = b.new_context(viewport={"width": w, "height": h}, device_scale_factor=1, is_mobile=touch and w < 700, has_touch=touch, locale="es-AR", reduced_motion="reduce", service_workers="block")
        run(ctx, tag, w, h, touch, PAGES); ctx.close()
    # Mi plan con sesión: todas las pestañas + estados
    if EMAIL:
        for tag, w, h, touch in [v for v in VIEWS if v[0] in ("375", "1280")]:
            ctx = b.new_context(viewport={"width": w, "height": h}, device_scale_factor=1, is_mobile=touch and w < 700, has_touch=touch, locale="es-AR", reduced_motion="reduce", service_workers="block")
            pg = ctx.new_page(); pg.goto(f"{BASE}/mi-plan.html"); pg.wait_for_timeout(1500)
            pg.fill("#aEmail", EMAIL); pg.fill("#aPass", PASS); pg.click("#authBtn"); pg.wait_for_selector("#planBox:not([hidden])", timeout=20000); pg.wait_for_timeout(2500)
            for t in ["cal", "rec", "ing", "rank", "prog", "perfil"]:
                pg.click(f'#mpSeg [data-tab="{t}"]'); pg.wait_for_timeout(900)
                r = pg.evaluate(CHECK, touch); report[f"sesion-{t}@{tag}"] = r
                f = os.path.join(OUT, f"sesion-{t}_{tag}.png"); pg.screenshot(path=f, full_page=True); shots.setdefault("ses" + tag, []).append(f)
                print("ok sesion", t, tag, "| overflow", r["overflow"], "| off", len(r["off"]), "| overlap", len(r["overlap"]), "| small", len(r["small"]), "| tiny", len(r["tiny"]))
            pg.close(); ctx.close()
    # estados: ficha de receta, modo cocina, comparador, mapa (375 y 1280)
    for tag, w, h, touch in [v for v in VIEWS if v[0] in ("375", "1280")]:
        ctx = b.new_context(viewport={"width": w, "height": h}, device_scale_factor=1, is_mobile=touch and w < 700, has_touch=touch, locale="es-AR", reduced_motion="reduce", service_workers="block")
        pg = ctx.new_page()
        def snap(name):
            r = pg.evaluate(CHECK, touch); report[f"estado-{name}@{tag}"] = r
            f = os.path.join(OUT, f"estado-{name}_{tag}.png"); pg.screenshot(path=f, full_page=False); shots.setdefault("est" + tag, []).append(f)
            print("ok estado", name, tag, "| overflow", r["overflow"], "| off", len(r["off"]), "| overlap", len(r["overlap"]), "| small", len(r["small"]))
        pg.goto(f"{BASE}/recetas.html"); pg.wait_for_timeout(1200); pg.click('.rc[data-rec="salmon"]'); pg.wait_for_timeout(700); snap("ficha")
        pg.evaluate("document.querySelector('.modal-box').scrollTop = 420"); pg.wait_for_timeout(300); snap("ficha-abajo")
        pg.click("[data-cook]"); pg.wait_for_timeout(500); [pg.click("[data-cnext]") for _ in range(3)]; pg.wait_for_timeout(400); snap("cocina")
        pg.goto(f"{BASE}/compras.html"); pg.wait_for_timeout(1200); pg.click("#cmpGo"); pg.wait_for_selector(".cmp-tile:not(.skel-box)", timeout=90000); pg.wait_for_timeout(800)
        pg.evaluate("document.querySelector('#cmpRes').scrollIntoView()"); pg.wait_for_timeout(300); snap("comparador")
        pg.goto(f"{BASE}/supermercados.html#mapa"); pg.wait_for_timeout(1200); pg.fill("#mapAddr", "Av. Santa Fe 3200, Palermo"); pg.click("#mapForm button"); pg.wait_for_function("!/Buscando/.test(document.querySelector('#mapStatus').textContent) && document.querySelector('#mapStatus').textContent.length > 5", timeout=60000); pg.wait_for_timeout(2500)
        pg.evaluate("document.querySelector('#mapa').scrollIntoView()"); pg.wait_for_timeout(400); snap("mapa")
        pg.close(); ctx.close()
    b.close()
json.dump(report, open(os.path.join(OUT, "_report.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
# hojas de contacto
for tag, files in shots.items():
    tw = 300 if tag.startswith(("375", "ses375", "est375")) else 420
    cols = 4; maxh = 2400; rows = (len(files) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * (tw + 14), rows * (maxh + 28)), "white"); dr = ImageDraw.Draw(sheet)
    for i, f in enumerate(files):
        im = Image.open(f).convert("RGB"); s = tw / im.width; im = im.resize((tw, max(1, int(im.height * s)))).crop((0, 0, tw, min(maxh, int(im.height * s))))
        x, y = (i % cols) * (tw + 14), (i // cols) * (maxh + 28); sheet.paste(im, (x, y)); dr.text((x + 2, y + min(maxh, im.height) + 6), os.path.basename(f), fill="black")
    sheet.save(os.path.join(OUT, f"_sheet_{tag}.jpg"), quality=78)
print("listo:", len(report), "chequeos; capturas en", OUT)
