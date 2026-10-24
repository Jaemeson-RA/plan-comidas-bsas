# -*- coding: utf-8 -*-
"""Capturas comparativas de paletas: A (fresco, por defecto) y B (terracota/oliva), home + recetas, escritorio y móvil."""
import os, sys
from playwright.sync_api import sync_playwright
from PIL import Image, ImageDraw
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
BASE = "http://localhost:8765"; OUT = "media/frames"
B_CSS = """:root{--paper:#F7F1E6;--paper2:#EFE6D6;--crema:#FFFCF6;--ink:#2B2522;--ink2:#4A423D;--verde:#6B7F3B;--verde2:#EEF1E1;--verde3:#55672D;--rojo:#C8553D;--rojo2:#F6DDD3;--oro:#E0A458;--oro2:#F8EAD3;--ok:#6B7F3B;--ok2:#EEF1E1;--muted:#75706A;--line:#E3D9C8;--border:#DED3BF;--hard-oro:0 8px 20px rgba(107,127,59,.3)}
.btn{background:var(--rojo)!important;border-color:var(--rojo)!important;box-shadow:0 8px 20px rgba(200,85,61,.3)!important}.btn:hover{background:#B04A34!important}.btn.ghost{background:var(--crema)!important;color:var(--ink)!important;border-color:var(--border)!important}
.brand-ico{background:var(--rojo)!important}.kicker,.kicker::before{color:var(--rojo);background-color:var(--rojo)}.kicker{background:none}.sug-fab{background:var(--verde)!important}.nav .nav-cta{background:var(--verde)!important;border-color:var(--verde)!important}"""
shots = []
with sync_playwright() as p:
    b = p.chromium.launch(channel="msedge", headless=True)
    for variant, css in (("A", ""), ("B", B_CSS)):
        for name, vw, dsf, mobile in (("desk", 1280, 1, False), ("mob", 390, 2, True)):
            ctx = b.new_context(viewport={"width": vw, "height": 900 if not mobile else 844}, device_scale_factor=dsf, is_mobile=mobile, has_touch=mobile, reduced_motion="reduce")
            pg = ctx.new_page()
            for url, key in (("index.html", "home"), ("recetas.html", "rec")):
                pg.goto(f"{BASE}/{url}"); pg.wait_for_selector(".rc, .today .meal img"); pg.wait_for_timeout(1200)
                if css: pg.add_style_tag(content=css); pg.wait_for_timeout(300)
                if key == "rec": pg.evaluate("window.scrollTo(0, document.querySelector('#rapidas').getBoundingClientRect().top + scrollY - 80)"); pg.wait_for_timeout(600)
                f = f"{OUT}/_theme_{variant}_{name}_{key}.png"; pg.screenshot(path=f, full_page=False); shots.append((variant, name, key, f))
            ctx.close()
    b.close()
# hoja: fila por variante
def load(f, w): im = Image.open(f).convert("RGB"); return im.resize((w, int(im.height * w / im.width)))
rows = []
for variant in ("A", "B"):
    imgs = [load(f, 640 if n == "desk" else 220) for v, n, k, f in shots if v == variant]
    h = max(i.height for i in imgs); row = Image.new("RGB", (sum(i.width for i in imgs) + 10 * (len(imgs) - 1), h + 30), "white"); x = 0
    for i in imgs: row.paste(i, (x, 30)); x += i.width + 10
    ImageDraw.Draw(row).text((4, 6), f"Variante {variant}: " + ("fresco · verde albahaca + tomate + miel · Young Serif / Outfit" if variant == "A" else "terracota · oliva + terracota + arena · Young Serif / Outfit"), fill="black")
    rows.append(row)
sheet = Image.new("RGB", (max(r.width for r in rows), sum(r.height for r in rows) + 20), "white"); y = 0
for r in rows: sheet.paste(r, (0, y)); y += r.height + 20
sheet.save(f"{OUT}/_theme_compare.jpg", quality=85); print("OK", sheet.size)
