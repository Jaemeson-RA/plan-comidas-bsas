# -*- coding: utf-8 -*-
"""Capturas de pantalla del sitio para el video (Playwright + Edge instalado).
Uso: python tools/video/capturas.py [http://localhost:8765]  -> media/frames/*.png"""
import os, sys, time
from playwright.sync_api import sync_playwright
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8765").rstrip("/")
ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
OUT = os.path.join(ROOT, "media", "frames"); os.makedirs(OUT, exist_ok=True)
W, H = 1440, 900

def shot(page, name):
    page.wait_for_timeout(700)
    page.screenshot(path=os.path.join(OUT, name + ".png"), full_page=False)
    print("shot", name)

with sync_playwright() as p:
    browser = p.chromium.launch(channel="msedge", headless=True)
    ctx = browser.new_context(viewport={"width": W, "height": H}, device_scale_factor=1.5, locale="es-AR", reduced_motion="reduce")
    page = ctx.new_page()
    page.add_init_script("try{localStorage.setItem('cur','ARS');localStorage.setItem('planView_d','cal')}catch(e){}")

    # 01 portada
    page.goto(BASE + "/index.html"); page.wait_for_selector(".today .meal img"); page.wait_for_timeout(1200); shot(page, "01_inicio")
    # 02 calendario con popover · 03 receta abierta
    page.goto(BASE + "/plan.html"); page.wait_for_selector(".cal-cell"); page.click("#viewSeg [data-view=cal]")
    page.evaluate("window.scrollTo(0, document.querySelector('#calendar').getBoundingClientRect().top + scrollY - 90)"); page.wait_for_timeout(800)
    cells = page.query_selector_all(".cal-row .cm[data-rec]"); cells[9].hover(); page.wait_for_timeout(500); shot(page, "02_calendario")
    cells[9].click(); page.wait_for_selector("#modal:not([hidden]) .rm h2"); page.wait_for_timeout(900); shot(page, "03_receta")
    page.keyboard.press("Escape")
    # 04 recetas por categoría
    page.goto(BASE + "/recetas.html"); page.wait_for_selector(".rc img"); page.evaluate("window.scrollTo(0, document.querySelector('#horno').getBoundingClientRect().top + scrollY - 90)"); page.wait_for_timeout(1200); shot(page, "04_recetas")
    # 05 compras con tildes
    page.goto(BASE + "/compras.html#semana-2"); page.wait_for_selector("#shopGrid input")
    for i in range(3): page.query_selector_all("#shopGrid input")[i].click()
    page.evaluate("window.scrollTo(0, document.querySelector('#shopSummary').getBoundingClientRect().top + scrollY - 90)"); shot(page, "05_compras")
    # 06 supermercados en USD
    page.goto(BASE + "/supermercados.html"); page.wait_for_selector(".rank-row"); page.click("#curSeg [data-cur=USD]")
    page.evaluate("window.scrollTo(0, document.querySelector('#ranking').getBoundingClientRect().top + scrollY - 90)"); page.wait_for_timeout(1500); shot(page, "06_super")
    # 07 mi plan: crear cuenta
    page.goto(BASE + "/mi-plan.html"); page.wait_for_selector("#authBox"); page.wait_for_timeout(1500); page.click("#authSeg [data-mode=signup]")
    page.fill("#aName", "Ale"); page.fill("#aEmail", "ale@correo.com"); page.evaluate("window.scrollTo(0, document.querySelector('#authBox').getBoundingClientRect().top + scrollY - 90)"); shot(page, "07_cuenta")
    # 08 editor de recetas (demo estática: se abre el modal y se llenan filas)
    page.evaluate("""() => {
      document.querySelector('#authBox').hidden = true; document.querySelector('#planBox').hidden = false;
      document.querySelector('#whoName').textContent = 'Ale'; document.querySelector('#whoEmail').textContent = '· ale@correo.com';
      document.querySelector('#mpSeg [data-tab=rec]').click();
      const ed = document.querySelector('#recEditor'); ed.hidden = false;
      document.querySelector('#rName').value = 'Ñoquis de ricota con salsa de tomate'; document.querySelector('#rTiempo').value = 40;
      document.querySelector('#rIngRows').innerHTML = [['ricota', 400, 'g', 400], ['harina 0000', 150, 'g', 150], ['huevos', 1, 'u', 55], ['tomate triturado (lata)', 1, 'u', 400], ['queso rallado', 40, 'g', 40]].map(r => `<div class="ing-row"><span class="n">${r[0]}</span><input type="number" value="${r[1]}"><select><option>${r[2]}</option></select><span class="g">${r[3]} g</span><button type="button" class="x">×</button></div>`).join('');
      document.querySelector('#rNutLive').innerHTML = '<b>Por porción:</b> 512 kcal · 24 g prot · 62 g carb (6 g azúcar) · 18 g grasa (9 g sat.) · 4 g fibra · 1.1 g sal';
      document.querySelector('#rPasos').value = 'Mezclar la ricota con el huevo, el queso y la harina.\\nFormar rollos, cortar y marcar.\\nHervir hasta que floten; servir con la salsa.';
    }"""); page.wait_for_timeout(600); shot(page, "08_editor")
    # 09 escáner / ingrediente desde Open Food Facts (formulario lleno)
    page.evaluate("""() => {
      document.querySelector('#recEditor').hidden = true; document.querySelector('#mpSeg [data-tab=ing]').click();
      const ie = document.querySelector('#ingEditor'); ie.hidden = false; document.querySelector('#ingEditorTitle').textContent = 'Nuevo ingrediente · escaneado';
      const v = { iName: 'Yogur natural entero 190 g', iMarca: 'La Serenísima', iCode: '7790742325105', nKcal: 68, nProt: 3.9, nCarb: 5.2, nSug: 5.2, nFat: 3.4, nSat: 2.2, nFib: 0, nSal: 0.12 };
      Object.entries(v).forEach(([k, x]) => { document.querySelector('#' + k).value = x; });
      document.querySelector('#scanArea').hidden = false; document.querySelector('#scanMsg').textContent = 'Encontrado en Open Food Facts. Revisá los valores y guardá.';
      document.querySelector('#scanVideo').style.height = '120px'; document.querySelector('#scanVideo').style.background = 'linear-gradient(90deg,#000 0 4%,#fff 4% 6%,#000 6% 9%,#fff 9% 10%,#000 10% 14%,#fff 14% 17%,#000 17% 19%,#fff 19% 22%,#000 22% 25%,#fff 25% 26%,#000 26% 30%,#fff 30% 32%,#000 32% 35%,#fff 35% 38%,#000 38% 40%,#fff 40% 43%,#000 43% 45%,#fff 45% 46%,#000 46% 50%,#fff 50% 53%,#000 53% 55%,#fff 55% 56%,#000 56% 60%,#fff 60% 62%,#000 62% 65%,#fff 65% 66%,#000 66% 70%,#fff 70% 73%,#000 73% 75%,#fff 75% 76%,#000 76% 80%,#fff 80% 83%,#000 83% 85%,#fff 85% 86%,#000 86% 90%,#fff 90% 92%,#000 92% 96%,#fff 96% 100%)';
    }"""); page.wait_for_timeout(600); shot(page, "09_ingrediente")
    # 09b ranking (demo estática)
    page.evaluate("""() => {
      document.querySelector('#ingEditor').hidden = true; document.querySelector('#mpSeg [data-tab=rank]').click();
      document.querySelector('#rankMe').innerHTML = '<p class="kicker">Tu puntaje</p><div class="score-num">385<small> pts</small></div><div class="rank-chips"><span class="chip hot">racha 5 días · combo ×1,5</span><span class="chip">mejor racha 9</span><span class="chip">23 días cumplidos</span><span class="chip">1 semana perfecta</span></div><p class="muted small">Estás en el puesto <b>#2</b> de 6.</p>';
      document.querySelector('#ladderTable').innerHTML = '<thead><tr><th>Puesto</th><th>Quién</th><th>Puntos</th><th>Racha</th><th>Mejor racha</th><th>Días</th><th>Semanas perfectas</th></tr></thead><tbody>' + [['🥇','Jaemeson',420,'7 ×2',12,26,2],['🥈','Ale (vos)',385,'5 ×1,5',9,23,1],['🥉','Lu',260,'2',6,18,0],['#4','Fede',150,'—',4,12,0],['#5','Caro',90,'1',3,8,0],['#6','Nico',40,'—',2,4,0]].map((r,i) => `<tr class="${i===1?'me':''}"><td>${r[0]}</td><td style="text-align:left">${r[1]}</td><td><b>${r[2]}</b></td><td>${r[3]}</td><td>${r[4]}</td><td>${r[5]}</td><td>${r[6]}</td></tr>`).join('') + '</tbody>';
      window.scrollTo(0, document.querySelector('#tabRank').getBoundingClientRect().top + scrollY - 90);
    }"""); page.wait_for_timeout(600); shot(page, "09b_ranking")
    # 10 nutrición con perfil
    page.goto(BASE + "/nutricion.html"); page.wait_for_selector("#profForm"); page.wait_for_timeout(1500)
    page.select_option("#pSexo", "f"); page.fill("#pEdad", "31"); page.fill("#pAltura", "165"); page.fill("#pPeso", "62"); page.click("#profForm .btn")
    page.wait_for_selector("#nutResult:not([hidden])"); page.evaluate("window.scrollTo(0, document.querySelector('#nutResult').getBoundingClientRect().top + scrollY - 80)"); page.wait_for_timeout(1200); shot(page, "10_nutricion")
    page.evaluate("window.scrollTo(0, document.querySelector('#nutGrid').getBoundingClientRect().top + scrollY - 90)"); page.wait_for_timeout(800); shot(page, "11_nutricion_barras")
    # 12 temporada
    page.goto(BASE + "/temporada.html"); page.wait_for_selector(".mes[open]"); page.evaluate("window.scrollTo(0, document.querySelector('.mes[open]').getBoundingClientRect().top + scrollY - 90)"); page.wait_for_timeout(1200); shot(page, "12_temporada")
    # tarjetas de título (mismo estilo del sitio)
    page.goto(BASE + "/tools/video/cards.html"); page.wait_for_timeout(800)
    for i, cid in enumerate(["c_intro", "c_cuenta", "c_cierre"]):
        page.evaluate(f"document.querySelectorAll('.card-v').forEach(c => c.hidden = c.id !== '{cid}')"); page.wait_for_timeout(300); shot(page, f"00_{cid}")
    # móvil: portada y compras para los insertos
    mob = browser.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, locale="es-AR", is_mobile=True, has_touch=True, reduced_motion="reduce")
    mp = mob.new_page(); mp.goto(BASE + "/index.html"); mp.wait_for_selector(".today .meal img"); mp.wait_for_timeout(1000); mp.screenshot(path=os.path.join(OUT, "m_inicio.png")); print("shot m_inicio")
    mp.goto(BASE + "/compras.html#semana-2"); mp.wait_for_selector("#shopGrid input"); mp.query_selector_all("#shopGrid input")[0].click(); mp.wait_for_timeout(600); mp.screenshot(path=os.path.join(OUT, "m_compras.png")); print("shot m_compras")
    browser.close()
print("OK", OUT)
