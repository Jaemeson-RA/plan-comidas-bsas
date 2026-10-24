# -*- coding: utf-8 -*-
"""Capturas de la app para la página «La app» (img/app/*.webp, 720×1480, el formato exacto del marco de teléfono).

Se toman del sitio publicado como se ve dentro de la app (?app=1), con cada bloque arrancando arriba de la pantalla.
    python build_app_shots.py
"""
import os, sys
from PIL import Image
from playwright.sync_api import sync_playwright
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
SITE = "https://jaemeson-ra.github.io/plan-comidas-bsas/"
OUT = os.path.join(ROOT, "img", "app"); os.makedirs(OUT, exist_ok=True)
W, H = 360, 740

# lleva el bloque `q` justo debajo de la barra de la app (fija arriba)
TOP = "(q) => { const e = document.querySelector(q); const h = document.querySelector('.appbar')?.offsetHeight || 0; if (e) window.scrollTo(0, e.getBoundingClientRect().top + scrollY - h - 8); }"
NUT = ("() => { const f = (i, v) => { const e = document.getElementById(i); e.value = v; e.dispatchEvent(new Event('input', {bubbles: true})); e.dispatchEvent(new Event('change', {bubbles: true})); };"
       " f('pEdad', '32'); f('pAltura', '175'); f('pPeso', '74'); const fm = document.getElementById('profForm'); fm.requestSubmit ? fm.requestSubmit() : fm.submit(); }")
SHOTS = [
    ("1-hoy", "index.html", []),
    ("2-semana", "plan.html", [("click", "#viewSeg button:last-child"), ("top", "#weekView")]),
    ("3-receta", "recetas.html", [("js", "() => document.querySelector('[data-rec]').click()")]),
    ("5-promos", "promos.html", []),
    ("6-nutricion", "nutricion.html", [("js", NUT), ("wait", 4500), ("top", "#scoreBox")]),
]
HIDE = ".sug-fab, .toast, #netPill { display: none !important; } * { scroll-behavior: auto !important; }"

with sync_playwright() as pw:
    b = pw.chromium.launch(channel="msedge")
    ctx = b.new_context(viewport={"width": W, "height": H}, device_scale_factor=2, is_mobile=True, has_touch=True,
                        reduced_motion="reduce", locale="es-AR")
    pg = ctx.new_page()
    for name, page, steps in SHOTS:
        pg.goto(SITE + page + "?app=1", wait_until="networkidle"); pg.add_style_tag(content=HIDE); pg.wait_for_timeout(2000)
        for kind, arg in steps:
            if kind == "top": pg.evaluate(TOP, arg)
            elif kind == "click": pg.click(arg)
            elif kind == "js": pg.evaluate(arg)
            elif kind == "wait": pg.wait_for_timeout(arg)
            pg.wait_for_timeout(1200)
        pg.evaluate("document.querySelectorAll('.reveal').forEach(e => e.classList.add('in', 'now'))"); pg.wait_for_timeout(500)
        png = os.path.join(OUT, name + ".png"); pg.screenshot(path=png)
        Image.open(png).convert("RGB").save(os.path.join(OUT, name + ".webp"), "WEBP", quality=80, method=6); os.remove(png)
        print("ok", name, os.path.getsize(os.path.join(OUT, name + ".webp")) // 1024, "KB")
    b.close()
