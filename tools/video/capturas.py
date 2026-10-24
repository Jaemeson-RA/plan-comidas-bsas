# -*- coding: utf-8 -*-
"""Capturas del sitio (escritorio y móvil) y cuadros compuestos con texto para el video, en 16:9 y 9:16.
Uso: python tools/video/capturas.py [http://localhost:8765]  -> media/frames/raw_*.png + media/frames/f_h_*.png / f_v_*.png"""
import os, sys
from playwright.sync_api import sync_playwright
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8765").rstrip("/")
ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
OUT = os.path.join(ROOT, "media", "frames"); os.makedirs(OUT, exist_ok=True)

# escenas: id, texto incrustado (kicker, título, subtítulo)
SCENES = [
 ("inicio", "Tu plan", "Un mes de comidas, listo", "Desayunos, almuerzos y cenas para dos, con productos de acá."),
 ("calendario", "Calendario", "Todo el mes de un vistazo", "Tocá un plato y se abre la receta."),
 ("receta", "Recetas", "Con foto, video y costo", "Ingredientes para 2, pasos claros y precio por porción."),
 ("compras", "Compras", "La lista se arma sola", "Por góndola. Copiala a las notas del teléfono."),
 ("super", "Supermercados", "Siete cadenas comparadas", "Precios en pesos, dólares o euros, y dónde conviene pedir."),
 ("editor", "Tus recetas", "Creá las tuyas", "La nutrición se calcula sola con cada ingrediente."),
 ("ingrediente", "Ingredientes", "Escaneá el paquete", "Valores reales por 100 g, disponibles para todos."),
 ("ranking", "Ranking", "Días cumplidos y combos", "Marcá tu día, sumá puntos y subí en la ladder."),
 ("nutricion", "Nutrición", "Tu semana, con nota", "Calorías, proteínas, fibra y sal frente a lo recomendado."),
 ("temporada", "Estación", "Lo que está en temporada", "Frutas y verduras de cada mes, y los platos que las usan."),
]

def demo_editor(page):
    page.evaluate("""() => {
      document.querySelector('#authBox').hidden = true; document.querySelector('#planBox').hidden = false;
      document.querySelector('#whoName').textContent = 'Ale'; document.querySelector('#whoEmail').textContent = '· ale@correo.com';
      document.querySelector('#mpSeg [data-tab=rec]').click();
      const ed = document.querySelector('#recEditor'); ed.hidden = false;
      document.querySelector('#rName').value = 'Ñoquis de ricota con salsa de tomate'; document.querySelector('#rTiempo').value = 40;
      document.querySelector('#rIngRows').innerHTML = [['ricota', 400, 'g', 400], ['harina 0000', 150, 'g', 150], ['huevos', 1, 'u', 55], ['tomate triturado (lata)', 1, 'u', 400], ['queso rallado', 40, 'g', 40]].map(r => `<div class="ing-row"><span class="n">${r[0]}</span><input type="number" value="${r[1]}"><select><option>${r[2]}</option></select><span class="g">${r[3]} g</span><button type="button" class="x">×</button></div>`).join('');
      document.querySelector('#rNutLive').innerHTML = '<b>Por porción:</b> 512 kcal · 24 g prot · 62 g carb (6 g azúcar) · 18 g grasa (9 g sat.) · 4 g fibra · 1.1 g sal';
      document.querySelector('#rPasos').value = 'Mezclar la ricota con el huevo, el queso y la harina.\\nFormar rollos, cortar y marcar.\\nHervir hasta que floten; servir con la salsa.';
    }""")
def demo_ingrediente(page):
    page.evaluate("""() => {
      document.querySelector('#recEditor').hidden = true; document.querySelector('#mpSeg [data-tab=ing]').click();
      const ie = document.querySelector('#ingEditor'); ie.hidden = false; document.querySelector('#ingEditorTitle').textContent = 'Nuevo ingrediente · escaneado';
      const v = { iName: 'Yogur natural entero 190 g', iMarca: 'La Serenísima', iCode: '7790742325105', nKcal: 68, nProt: 3.9, nCarb: 5.2, nSug: 5.2, nFat: 3.4, nSat: 2.2, nFib: 0, nSal: 0.12 };
      Object.entries(v).forEach(([k, x]) => { document.querySelector('#' + k).value = x; });
      document.querySelector('#scanArea').hidden = false; document.querySelector('#scanMsg').textContent = 'Encontrado en Open Food Facts. Revisá los valores y guardá.';
      const bars = Array.from({length: 46}, (_, i) => `${i % 3 === 0 ? '#111' : '#fff'} ${i * 2.17}% ${(i + 1) * 2.17}%`).join(',');
      const v2 = document.querySelector('#scanVideo'); v2.style.height = '120px'; v2.style.background = 'linear-gradient(90deg,' + bars + ')';
    }""")
def demo_ranking(page):
    page.evaluate("""() => {
      document.querySelector('#ingEditor').hidden = true; document.querySelector('#mpSeg [data-tab=rank]').click();
      document.querySelector('#rankMe').innerHTML = '<p class="kicker">Tu puntaje</p><div class="score-num">385<small> pts</small></div><div class="rank-chips"><span class="chip hot">racha 5 días · combo ×1,5</span><span class="chip">mejor racha 9</span><span class="chip">23 días cumplidos</span><span class="chip">1 semana perfecta</span></div><p class="muted small">Estás en el puesto <b>#2</b> de 6.</p>';
      document.querySelector('#ladderTable').innerHTML = '<thead><tr><th>Puesto</th><th>Quién</th><th>Puntos</th><th>Racha</th><th>Mejor</th><th>Días</th></tr></thead><tbody>' + [['🥇','Jaemeson',420,'7 ×2',12,26],['🥈','Ale (vos)',385,'5 ×1,5',9,23],['🥉','Lu',260,'2',6,18],['#4','Fede',150,'—',4,12],['#5','Caro',90,'1',3,8]].map((r,i) => `<tr class="${i===1?'me':''}"><td>${r[0]}</td><td style="text-align:left">${r[1]}</td><td><b>${r[2]}</b></td><td>${r[3]}</td><td>${r[4]}</td><td>${r[5]}</td></tr>`).join('') + '</tbody>';
      window.scrollTo(0, document.querySelector('#tabRank').getBoundingClientRect().top + scrollY - 70);
    }""")

def capture(page, mobile):
    """toma las capturas crudas de las 10 escenas; devuelve {id: ruta}"""
    tag = "m" if mobile else "d"; out = {}
    def shot(name): page.wait_for_timeout(600); f = os.path.join(OUT, f"raw_{tag}_{name}.png"); page.screenshot(path=f, full_page=False); out[name] = f; print("shot", tag, name)
    page.goto(BASE + "/index.html"); page.wait_for_selector(".today .meal img"); page.wait_for_timeout(1200); shot("inicio")
    page.goto(BASE + "/plan.html"); page.wait_for_selector(".cal-cell, .dc")
    if mobile: page.click("#viewSeg [data-view=week]"); page.wait_for_timeout(500); page.evaluate("window.scrollTo(0, document.querySelector('#weekTabs').getBoundingClientRect().top + scrollY - 70)")
    else: page.click("#viewSeg [data-view=cal]"); page.wait_for_timeout(500); page.evaluate("window.scrollTo(0, document.querySelector('#calendar').getBoundingClientRect().top + scrollY - 80)")
    page.wait_for_timeout(600); shot("calendario")
    page.click(".cm[data-rec], .dc .meal"); page.wait_for_selector("#modal:not([hidden]) .rm h2"); page.wait_for_timeout(900)
    if mobile: page.evaluate("document.querySelector('.modal-box').scrollTop = 0")
    shot("receta"); page.keyboard.press("Escape")
    page.goto(BASE + "/compras.html#semana-2"); page.wait_for_selector("#shopGrid input")
    for i in range(3): page.query_selector_all("#shopGrid input")[i].click()
    page.evaluate("window.scrollTo(0, document.querySelector('#shopSummary').getBoundingClientRect().top + scrollY - 70)"); shot("compras")
    page.goto(BASE + "/supermercados.html"); page.wait_for_selector(".rank-row"); page.click("#curSeg [data-cur=USD]")
    page.evaluate("window.scrollTo(0, document.querySelector('#ranking').getBoundingClientRect().top + scrollY - 70)"); page.wait_for_timeout(1400); shot("super")
    page.goto(BASE + "/mi-plan.html"); page.wait_for_selector("#authBox"); page.wait_for_timeout(1500)
    demo_editor(page); page.wait_for_timeout(500); shot("editor")
    demo_ingrediente(page); page.wait_for_timeout(500); shot("ingrediente")
    demo_ranking(page); page.wait_for_timeout(500); shot("ranking")
    page.goto(BASE + "/nutricion.html"); page.wait_for_selector("#profForm"); page.wait_for_timeout(1500)
    page.select_option("#pSexo", "f"); page.fill("#pEdad", "31"); page.fill("#pAltura", "165"); page.fill("#pPeso", "62"); page.click("#profForm .btn")
    page.wait_for_selector("#nutResult:not([hidden])"); page.evaluate("window.scrollTo(0, document.querySelector('#nutResult').getBoundingClientRect().top + scrollY - 70)"); page.wait_for_timeout(1000); shot("nutricion")
    page.goto(BASE + "/temporada.html"); page.wait_for_selector(".mes[open]"); page.evaluate("window.scrollTo(0, document.querySelector('.mes[open]').getBoundingClientRect().top + scrollY - 70)"); page.wait_for_timeout(1000); shot("temporada")
    return out

with sync_playwright() as p:
    browser = p.chromium.launch(channel="msedge", headless=True)
    # 1) capturas crudas
    dctx = browser.new_context(viewport={"width": 1440, "height": 900}, device_scale_factor=1.5, locale="es-AR", reduced_motion="reduce")
    dctx.add_init_script("try{localStorage.setItem('cur','ARS');localStorage.setItem('planView_d','cal')}catch(e){}")
    draw = capture(dctx.new_page(), False); dctx.close()
    mctx = browser.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True, locale="es-AR", reduced_motion="reduce")
    mctx.add_init_script("try{localStorage.setItem('cur','ARS');localStorage.setItem('planView_m','week')}catch(e){}")
    mraw = capture(mctx.new_page(), True); mctx.close()
    # 2) cuadros compuestos (16:9 con captura de escritorio, 9:16 con captura móvil)
    for o, (w, h), raw in (("h", (1920, 1080), draw), ("v", (1080, 1920), mraw)):
        ctx = browser.new_context(viewport={"width": w, "height": h}, device_scale_factor=1)
        pg = ctx.new_page(); pg.goto(BASE + "/tools/video/frame.html"); pg.wait_for_timeout(600)
        def comp(name, spec):
            pg.evaluate("(s) => window.render(s)", spec); pg.wait_for_timeout(250)
            f = os.path.join(OUT, f"f_{o}_{name}.png"); pg.screenshot(path=f, full_page=False); print("frame", o, name)
        comp("00_intro", {"kind": "intro", "o": o})
        for i, (sid, kicker, title, sub) in enumerate(SCENES, 1):
            if sid == "editor": comp("06_cuenta", {"kind": "cuenta", "o": o})
            comp(f"{i:02d}_{sid}", {"kind": "scene", "o": o, "step": i, "kicker": kicker, "title": title, "sub": sub, "img": "/media/frames/" + os.path.basename(raw[sid])})
        comp("99_cierre", {"kind": "cierre", "o": o})
        ctx.close()
    browser.close()
print("OK", OUT)
