/*! Menuario · © 2026 Jaemeson Dieu · Todos los derechos reservados · ver LICENSE */
/* Menuario — lógica compartida por todas las páginas */
(function () {
  const D = window.DATA;
  const R = D.recipes;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const page = $("main")?.dataset.page || "inicio";
  const todayISO = (() => { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); })();  // hora local, no UTC
  const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  const longDate = (iso) => { const [y, m, d] = iso.split("-").map(Number); const dt = new Date(y, m - 1, d); return ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"][dt.getDay()] + " " + d + " de " + MESES[m - 1]; };

  // ---------- nav activa ----------
  $$("[data-nav]").forEach((a) => a.classList.toggle("on", a.dataset.nav === page));

  // ---------- movimiento: aparición al hacer scroll, fundido de imágenes, header ----------
  const io = "IntersectionObserver" in window ? new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { rootMargin: "0px 0px -6% 0px", threshold: 0.05 }) : null;
  const T0 = performance.now();
  function animateIn() {
    const els = $$(".rc, .entry, .store, .shop-cat, .cal-cell, .steps li, .app, .dc, .cat-head, .ranking, .verdict, .explain, .today");
    let i = 0; const late = performance.now() - T0 > 2500;
    els.forEach((el) => { if (el.classList.contains("reveal")) return;
      if (late && el.getBoundingClientRect().top < innerHeight) { el.classList.add("reveal", "now", "in"); return; }  // ya está a la vista: sin animación
      el.classList.add("reveal"); el.style.setProperty("--d", ((i++) % 6) * 40 + "ms"); if (io) io.observe(el); else el.classList.add("in"); });
    $$("img").forEach((im) => { if (im.complete && im.naturalWidth > 0) im.classList.add("ld"); });
  }
  document.addEventListener("load", (e) => { if (e.target.tagName === "IMG") e.target.classList.add("ld"); }, true);
  // fotos de productos de las cadenas que no cargan: un ícono en vez del recuadro vacío
  document.addEventListener("error", (e) => { const im = e.target; if (im.tagName !== "IMG" || !/^https?:/.test(im.getAttribute("src") || "") || im.dataset.broken) return; im.dataset.broken = "1"; const s = document.createElement("span"); s.className = "img-ph"; s.innerHTML = '<svg class="ic"><use href="#i-tag"/></svg>'; im.replaceWith(s); }, true);
  const toastG = (msg) => { let t = $("#toast"); if (!t) { t = document.createElement("div"); t.id = "toast"; t.className = "toast"; document.body.appendChild(t); } t.textContent = msg; t.classList.add("show"); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove("show"), 3600); };
  const vt = (fn) => { if (document.startViewTransition && !matchMedia("(prefers-reduced-motion: reduce)").matches) { const t = document.startViewTransition(fn); [t.finished, t.ready, t.updateCallbackDone].forEach((p) => p?.catch?.(() => {})); return t; } return fn(); };
  const onScroll = () => $(".top")?.classList.toggle("scrolled", window.scrollY > 8);
  window.addEventListener("scroll", onScroll, { passive: true }); onScroll();
  if ($("#periodLabel")) $("#periodLabel").textContent = D.period.label;
  if ($("#basketDate")) $("#basketDate").textContent = D.basket.date.split("-").reverse().join("/");

  // ---------- moneda ----------
  const state = { cur: localStorage.getItem("cur") || "ARS", mode: localStorage.getItem("mode") || "blue", week: 1 };
  const rates = Object.assign({}, D.rates);
  function rate() {
    if (state.cur === "ARS") return 1;
    if (state.cur === "USD") return state.mode === "blue" ? rates.usd_blue : rates.usd_oficial;
    return state.mode === "blue" ? rates.eur_blue : rates.eur_oficial;
  }
  function fmt(ars) {
    const v = ars / rate();
    if (state.cur === "ARS") return "$ " + Math.round(v).toLocaleString("es-AR");
    const sym = state.cur === "USD" ? "US$ " : "€ ";
    const dec = v < 20 ? 2 : v < 200 ? 1 : 0;
    return sym + v.toLocaleString("es-AR", { minimumFractionDigits: dec, maximumFractionDigits: dec });
  }
  function countUp(el) {
    const to = +el.dataset.ars; el.dataset.counted = "1";
    if (!to || document.hidden || matchMedia("(prefers-reduced-motion: reduce)").matches) { el.textContent = fmt(to); return; }
    el.textContent = fmt(0); setTimeout(() => { el.textContent = fmt(to); }, 900);  // por si el navegador pausa las animaciones
    const t0 = performance.now(), d = 750; const step = (t) => { const k = Math.min(1, (t - t0) / d), e = 1 - Math.pow(1 - k, 3); el.textContent = fmt(to * e); if (k < 1) requestAnimationFrame(step); else el.textContent = fmt(to); }; requestAnimationFrame(step);
  }
  function renderMoney() {
    $$("[data-ars]").forEach((el) => { if (el.dataset.count !== undefined && !el.dataset.counted) countUp(el); else el.textContent = fmt(+el.dataset.ars); });
    if ($("#rUsd")) $("#rUsd").textContent = "$ " + (state.mode === "blue" ? rates.usd_blue : rates.usd_oficial).toLocaleString("es-AR");
    if ($("#rEur")) $("#rEur").textContent = "$ " + (state.mode === "blue" ? rates.eur_blue : rates.eur_oficial).toLocaleString("es-AR");
  }
  $("#curSeg")?.addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    state.cur = b.dataset.cur; localStorage.setItem("cur", state.cur);
    $$("#curSeg button").forEach((x) => x.classList.toggle("on", x === b));
    renderMoney();
  });
  $("#modeSeg")?.addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    state.mode = b.dataset.mode; localStorage.setItem("mode", state.mode);
    $$("#modeSeg button").forEach((x) => x.classList.toggle("on", x === b));
    renderMoney();
  });
  $$("#curSeg button").forEach((x) => x.classList.toggle("on", x.dataset.cur === state.cur));
  $$("#modeSeg button").forEach((x) => x.classList.toggle("on", x.dataset.mode === state.mode));

  async function liveRates() {
    const note = $("#ratesNote");
    try {
      const get = (u) => fetch(u, { cache: "no-store" }).then((r) => { if (!r.ok) throw 0; return r.json(); });
      const [blue, ofi, eur] = await Promise.all([
        get("https://dolarapi.com/v1/dolares/blue"), get("https://dolarapi.com/v1/dolares/oficial"), get("https://dolarapi.com/v1/cotizaciones/eur")]);
      rates.usd_blue = Math.round(blue.venta); rates.usd_oficial = Math.round(ofi.venta); rates.eur_oficial = Math.round(eur.venta);
      rates.eur_blue = Math.round(rates.usd_blue * eur.venta / ofi.venta);
      const d = new Date(blue.fechaActualizacion);
      if (note) note.textContent = "En vivo desde dolarapi.com (" + d.toLocaleDateString("es-AR") + ", venta). Blue = cambio de efectivo en cuevas; oficial = bancos. El euro blue se estima con la relación EUR/USD oficial.";
    } catch (e) {
      if (note) note.textContent = "Sin conexión con dolarapi.com: se usan las cotizaciones del " + D.rates.date + " (venta).";
    }
    renderMoney();
  }

  // ---------- helpers de receta ----------
  function mealBtn(id, cls = "meal") {
    const r = R[id];
    return `<button class="${cls}" data-rec="${id}"><img src="${r.img}"${srcs(r)} alt="" loading="lazy"><span>${esc(r.name)}</span></button>`;
  }
  const ic = (n, cls = "") => `<svg class="ic ${cls}"><use href="#i-${n}"/></svg>`;
  // ---------- cuántos comen en casa («Somos N») ----------
  const HOG = () => Math.min(6, Math.max(1, Math.round(+localStorage.getItem("hogar") || 1)));
  window.HOG = HOG;
  const setHog = (n) => { try { localStorage.setItem("hogar", String(n)); } catch (e) {} window.dispatchEvent(new Event("hogar")); };
  const hogHTML = () => `<span class="muted small">Somos</span><div class="seg hog-seg">${[1, 2, 3, 4, 5, 6].map((n) => `<button type="button" data-hog="${n}" class="${HOG() === n ? "on" : ""}">${n}</button>`).join("")}</div>`;
  document.addEventListener("click", (e) => { const b = e.target.closest("[data-hog]"); if (!b) return; setHog(+b.dataset.hog); $$(".hog-seg button").forEach((x) => x.classList.toggle("on", +x.dataset.hog === HOG())); });
  // ---------- cambios propios al plan de la casa (sin cuenta) ----------
  const SWK = "cambiosPlan"; let swCache = null;
  const swGet = () => { if (swCache) return swCache; try { swCache = JSON.parse(localStorage.getItem(SWK) || "{}"); } catch (e) { swCache = {}; } return swCache; };
  const swSet = (v) => { swCache = v; try { localStorage.setItem(SWK, JSON.stringify(v)); } catch (e) {} };
  const swapBtn = (date, slot, on) => `<button type="button" class="sw-btn${on ? " on" : ""}" data-swap="${date}|${slot}" aria-label="Cambiar este plato" title="Cambiar este plato">${ic("swap")}</button>`;
  // ---------- preferencias alimentarias y alergias ----------
  // localStorage «prefsComida» = {dieta: "todo"|"vegetariana"|"vegana"|"pescetariana", sin: ["gluten","lactosa"], alergias: [...]}
  // Lo que lleva cada receta se detecta en los nombres de sus ingredientes (sirve también para las recetas de la comunidad).
  const DIET = (() => {
    const nz = (s) => String(s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const RULES = {
      carne: /\b(carne|nalga|bife|picada|cuadril|vacio|osobuco|peceto|lomo|matambre|chorizo|jamon|panceta|bondiola|cerdo|salchich|hamburguesa|morcilla|bacon|carre|costilla|asado|ternera|roast)/,
      ave: /\b(pollo|pechuga|muslo|pavo|suprema)/,
      pescado: /\b(merluza|salmon|atun|pescado|abadejo|sardina|caballa|trucha|anchoa|bacalao|filet de)/,
      mariscos: /\b(langostino|camaron|calamar|mejillon|marisco|pulpo|cornalito)/,
      huevo: /\b(huevo|yema|clara de|claras|mayonesa)/,
      lacteos: /\b(leche(?! de (coco|almendra|soja|avena|arroz))|queso|yogur(?! vegetal)|manteca|crema(?! de (coco|mani|arroz))|ricota|muzzarella|mozzarella|parmesano|reggianito|dulce de leche|provoleta|provolone)/,
      gluten: /\b(harina(?! de (arroz|maiz|garbanzo|almendra|mandioca))|pan\b(?! de arroz)|fideo|spaghetti|espagueti|tallarin|penne|mono|noqui|tapas? (de|para) (tarta|empanada)|discos? de (tarta|empanada)|masa\b|galleta|avena|cebada|centeno|salsa de soja|cerveza|tortilla(s)? de (harina|trigo)|rapiditas|pan rallado|semola|cuscus|couscous|wrap|trigo|bulgur|seitan|rebozador)/,
      frutos_secos: /\b(nuez(?! moscada)|nueces|almendra|avellana|castana|pistacho|frutos secos|caju)/,  // la nuez moscada es una especia
      mani: /\bmani\b/,
      soja: /\b(soja|tofu|edamame|tempeh)/,
      sesamo: /\b(sesamo|tahin)/,
      miel: /\bmiel\b/,
    };
    const LBL = { carne: "carne", ave: "pollo", pescado: "pescado", mariscos: "mariscos", huevo: "huevo", lacteos: "lácteos", gluten: "gluten", frutos_secos: "frutos secos", mani: "maní", soja: "soja", sesamo: "sésamo", miel: "miel" };
    const BY_DIET = { vegana: ["carne", "ave", "pescado", "mariscos", "huevo", "lacteos", "miel"], vegetariana: ["carne", "ave", "pescado", "mariscos"], pescetariana: ["carne", "ave"] };
    const cache = new Map();
    const flags = (r) => {
      if (!r) return new Set();
      if (cache.has(r.id) && !r.custom) return cache.get(r.id);
      const f = new Set();
      (r.ing || []).forEach((i) => { const n = nz(i.n); if (/sin tacc|sin gluten/.test(n)) return Object.keys(RULES).forEach((k) => { if (k !== "gluten" && RULES[k].test(n)) f.add(k); }); Object.entries(RULES).forEach(([k, re]) => { if (re.test(n)) f.add(k); }); });
      if (!r.custom) cache.set(r.id, f);
      return f;
    };
    const prefs = () => { try { return Object.assign({ dieta: "todo", sin: [], alergias: [] }, JSON.parse(localStorage.getItem("prefsComida") || "{}")); } catch (e) { return { dieta: "todo", sin: [], alergias: [] }; } };
    const banned = (P = prefs()) => { const b = new Set(BY_DIET[P.dieta] || []); if (P.sin.includes("gluten")) b.add("gluten"); if (P.sin.includes("lactosa")) b.add("lacteos"); P.alergias.forEach((a) => b.add(a)); return b; };
    const why = (r, P) => { const b = banned(P); return [...flags(r)].filter((k) => b.has(k)).map((k) => LBL[k]); };
    const ok = (r, P) => why(r, P).length === 0;
    const active = (P = prefs()) => banned(P).size > 0;
    const summary = (P = prefs()) => [P.dieta !== "todo" && P.dieta, P.sin.includes("gluten") && "sin TACC", P.sin.includes("lactosa") && "sin lactosa", ...P.alergias.map((a) => "sin " + LBL[a])].filter(Boolean).join(" · ");
    return { flags, prefs, why, ok, active, summary, LBL };
  })();
  window.DIET = DIET;
  const andList = (l) => (l.length > 1 ? l.slice(0, -1).join(", ") + " y " + l[l.length - 1] : l[0] || "");
  function dietNote(r) {
    if (!DIET.active()) return "";
    const w = DIET.why(r); if (!w.length) return `<p class="diet-ok">${ic("check")} Va con tu perfil (${esc(DIET.summary())}).</p>`;
    const same = (x) => (x.tipo === "desayuno") === (r.tipo === "desayuno");
    const ingSet = new Set((r.ing || []).map((i) => i.n));
    const alt = Object.values(R).filter((x) => x.id !== r.id && same(x) && DIET.ok(x)).map((x) => ({ x, sc: (x.ing || []).filter((i) => ingSet.has(i.n)).length - Math.abs((x.tiempo || 0) - (r.tiempo || 0)) / 30 })).sort((a, b) => b.sc - a.sc).slice(0, 3);
    return `<div class="diet-warn">${ic("x")}<div><b>No va con tu perfil: lleva ${esc(andList(w))}.</b>${alt.length ? `<span>Probá en su lugar:</span><div class="diet-alt">${alt.map(({ x }) => `<button type="button" data-rec="${x.id}"><img src="${x.img}" alt="" loading="lazy">${esc(x.name)}</button>`).join("")}</div>` : ""}</div></div>`;
  }
  // marca en toda la página los platos que no van con el perfil (tarjetas, calendario, Hoy)
  function markDiet(root = document) {
    const on = DIET.active();
    root.querySelectorAll("[data-rec]").forEach((el) => {
      const r = R[el.dataset.rec]; if (!r) return;
      const w = on ? DIET.why(r) : [];
      el.classList.toggle("diet-x", w.length > 0);
      if (w.length) el.dataset.dietWhy = "Lleva " + andList(w); else delete el.dataset.dietWhy;
    });
  }
  window.markDiet = markDiet;
  let dietPend = 0;  // una pasada por cuadro, aunque cambien muchas cosas juntas
  new MutationObserver((ms) => { if (!dietPend && ms.some((m) => m.addedNodes.length)) dietPend = requestAnimationFrame(() => { dietPend = 0; markDiet(); }); }).observe(document.body, { childList: true, subtree: true });
  window.addEventListener("prefs", () => markDiet());
  setTimeout(markDiet, 0);
  // el panel de preferencias (Nutrición, Perfil, Recetas y «Más»)
  const DIETAS = [["todo", "Como de todo"], ["vegetariana", "Vegetariana"], ["vegana", "Vegana"], ["pescetariana", "Pescetariana"]];
  const ALERG = [["huevo", "Huevo"], ["lacteos", "Lácteos"], ["frutos_secos", "Frutos secos"], ["mani", "Maní"], ["soja", "Soja"], ["pescado", "Pescado"], ["mariscos", "Mariscos"], ["sesamo", "Sésamo"]];
  function prefsHTML() {
    const P = DIET.prefs(), n = Object.values(R).filter((r) => !r.custom).length, nOk = Object.values(R).filter((r) => !r.custom && DIET.ok(r)).length;
    const chip = (attr, val, label, on) => `<button type="button" class="pchip${on ? " on" : ""}" ${attr}="${val}" aria-pressed="${on}">${label}</button>`;
    return `<div class="pref-g"><h4>Cómo comés</h4><div class="chips">${DIETAS.map(([v, l]) => chip("data-dieta", v, l, P.dieta === v)).join("")}</div></div>
      <div class="pref-g"><h4>Sin…</h4><div class="chips">${chip("data-sin", "gluten", "Sin TACC (celiaquía)", P.sin.includes("gluten"))}${chip("data-sin", "lactosa", "Sin lactosa", P.sin.includes("lactosa"))}</div></div>
      <div class="pref-g"><h4>Alergias</h4><div class="chips">${ALERG.map(([v, l]) => chip("data-alerg", v, l, P.alergias.includes(v))).join("")}</div></div>
      <p class="pref-sum small">${DIET.active() ? `${ic("check")} <b>${nOk} de ${n} recetas</b> van con tu perfil. Recetas, Mi plan y el mes a medida usan solo esas.` : "Sin restricciones: se muestran todas las recetas."}</p>`;
  }
  function bindPrefs(box) {
    box.innerHTML = prefsHTML();
    box.onclick = (e) => {
      const b = e.target.closest("[data-dieta],[data-sin],[data-alerg]"); if (!b) return;
      const P = DIET.prefs();
      if (b.dataset.dieta) P.dieta = b.dataset.dieta;
      if (b.dataset.sin) P.sin = P.sin.includes(b.dataset.sin) ? P.sin.filter((x) => x !== b.dataset.sin) : [...P.sin, b.dataset.sin];
      if (b.dataset.alerg) P.alergias = P.alergias.includes(b.dataset.alerg) ? P.alergias.filter((x) => x !== b.dataset.alerg) : [...P.alergias, b.dataset.alerg];
      try { localStorage.setItem("prefsComida", JSON.stringify(P)); } catch (x) {}
      $$("[data-prefs]").forEach(bindPrefs); window.dispatchEvent(new Event("prefs"));
    };
  }
  $$("[data-prefs]").forEach(bindPrefs);
  window.bindPrefs = bindPrefs;
  window.addEventListener("prefs-remote", () => $$("[data-prefs]").forEach(bindPrefs));
  function openPrefs() {
    let sh = $("#prefSheet"); if (!sh) { sh = document.createElement("div"); sh.id = "prefSheet"; sh.className = "share-sheet app-sheet"; document.body.appendChild(sh); }
    sh.innerHTML = `<div class="sh-bg" data-shx></div><div class="sh-box as-box pref-box" role="dialog" aria-modal="true" aria-labelledby="pfT"><button class="as-x" type="button" data-shx aria-label="Cerrar">×</button><h3 id="pfT">Preferencias y alergias</h3><p class="muted small">Las recetas, Mi plan y el mes a medida se arman solo con lo que podés comer.</p><div data-prefs></div><div class="as-act"><button class="btn" type="button" data-shx>Listo</button></div></div>`;
    bindPrefs(sh.querySelector("[data-prefs]")); sh.hidden = false; document.body.classList.add("no-scroll");
    sh.onclick = (e) => { if (e.target.closest("[data-shx]")) { sh.hidden = true; document.body.classList.remove("no-scroll"); } };
  }
  document.addEventListener("click", (e) => { if (e.target.closest("[data-open-prefs]")) { e.preventDefault(); $("#appMore") && ($("#appMore").hidden = true); openPrefs(); } });
  const ICON = { desayuno: ic("desayuno"), almuerzo: ic("almuerzo"), merienda: ic("merienda"), cena: ic("cena") };

  // ---------- modal ----------
  const modal = $("#modal");
  function qty(i, f = 1) {
    let q = i.q * f; const u = i.u; if (u === "pizca") return "";
    if (f !== 1) { if (u === "g" || u === "ml") q = q >= 50 ? Math.round(q / 5) * 5 : Math.round(q); else if (u === "u") q = Math.max(0.5, Math.round(q * 2) / 2); else q = Math.round(q * 10) / 10; }
    const n = Number.isInteger(q) ? q : q.toLocaleString("es-AR", { maximumFractionDigits: 1 });
    return u === "u" ? n : n + " " + u;
  }
  const ingHtml = (r, f) => r.ing.map((i) => `<li>${qty(i, f) ? `<b>${qty(i, f)}</b> ` : ""}${esc(i.n)}</li>`).join("");
  let curRec = null, curPorc = 1;
  function openRecipe(id) {
    const r = R[id]; if (!r) return;
    const n = r.nut || {};
    const dc = (x) => String(x).replace(".", ",");  // decimales con coma
    const nutLine = n.kcal ? `<div class="nut-line">${ic("flame")} <b>${Math.round(n.kcal)} kcal</b> · ${dc(n.prot)} g proteínas · ${dc(n.carb)} g carbohidratos${n.sug != null ? ` (${dc(n.sug)} g azúcar)` : ""} · ${dc(n.fat)} g grasas${n.sat != null ? ` (${dc(n.sat)} g sat.)` : ""} · ${dc(n.fib)} g fibra · ${dc(n.sal)} g sal <small>por porción${n.source === "ingredientes" ? ", calculado con los ingredientes" : ", estimado"}</small></div>` : "";
    $("#modalContent").innerHTML = `
      <img class="rm-img" src="${r.img}"${r.srcset ? ` srcset="${r.srcset}" sizes="(max-width:720px) 100vw, 640px"` : ""} alt="${esc(r.name)}">
      <div class="rm">
        <h2>${esc(r.name)}</h2>
        ${dietNote(r)}
        ${r.custom ? `<p class="muted small">Receta de la comunidad, creada por <b>${esc(r.ownerName)}</b>.</p>` : ""}
        <div class="meta"><span>${ic("clock")}<b>${r.tiempo} min</b></span><span>${ic("plate")}<b>${r.porciones} ${r.porciones === 1 ? "porción" : "porciones"}</b></span>${r.cost ? `<span>${ic("tag")}<b data-ars="${r.cost}"></b> aprox./porción</span>` : ""}</div>
        ${nutLine}
        <div class="rm-actions">${r.pasos.length ? `<button class="btn small-btn" type="button" data-cook="${r.id}">${ic("play")} Modo cocina</button>` : ""}<a class="mini-btn" href="mi-plan.html?add=${encodeURIComponent(r.id)}">${ic("calendar")} Agregar a mi plan</a></div>
        ${r.ut?.length ? `<div class="rm-ut"><h3>Utensilios</h3>${utHtml(r)}</div>` : ""}
        <div class="rm-cols">
          <div><h3 class="ing-h">Ingredientes <span class="rm-porc"><button type="button" data-porc="-1" aria-label="Una porción menos">−</button><b id="porcN">${r.porciones * HOG()}</b><small>${r.porciones * HOG() === 1 ? "porción" : "porc."}</small><button type="button" data-porc="1" aria-label="Una porción más">+</button></span></h3><ul id="ingList">${ingHtml(r, HOG())}</ul></div>
          <div><h3>Preparación</h3>${r.pasos.length ? `<ol>${r.pasos.map((p) => `<li>${esc(p)}</li>`).join("")}</ol>` : `<p class="muted">Sin pasos cargados.</p>`}${r.tip ? `<div class="tip">${ic("bulb")} ${esc(r.tip)}</div>` : ""}</div>
        </div>
        ${r.yt ? `<div class="yt"><h3>Video</h3><button class="yt-thumb" data-yt="${r.yt}" aria-label="Reproducir video"><img src="https://i.ytimg.com/vi/${r.yt}/hqdefault.jpg" alt="" loading="lazy"></button></div>` : ""}
        ${r.credit ? `<p class="credit">Foto: <a href="${r.credit.page}" target="_blank" rel="noopener">${esc(r.credit.title)}</a> · ${esc(r.credit.artist || "Wikimedia Commons")} · ${esc(r.credit.license)} (Wikimedia Commons). El costo se calcula con precios de supermercados online de Buenos Aires de octubre 2026 y es orientativo.</p>` : ""}
      </div>`;
    curRec = r; curPorc = r.porciones * HOG(); modal.classList.remove("closing");
    modal.hidden = false; document.body.style.overflow = "hidden"; $(".modal-box").scrollTop = 0; hidePop(); renderMoney();
    if (!history.state?.modal) history.pushState({ modal: 1 }, "");
  }
  function closeModal(fromPop) {
    if (modal.hidden || modal.classList.contains("closing")) return;
    const done = () => { modal.classList.remove("closing"); modal.hidden = true; document.body.style.overflow = ""; $("#modalContent").innerHTML = ""; curRec = null; };
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) done(); else { modal.classList.add("closing"); setTimeout(done, 210); }
    if (fromPop !== true && history.state?.modal) history.back();
  }
  window.addEventListener("popstate", () => { if (!modal.hidden) closeModal(true); });
  // enlace directo a una receta (lo usan las notificaciones): index.html?rec=<id>
  { const q = new URLSearchParams(location.search).get("rec"); if (q && R[q]) setTimeout(() => openRecipe(q), 350); }
  document.addEventListener("click", (e) => {
    const pb = e.target.closest("[data-porc]");
    if (pb && curRec) { curPorc = Math.min(12, Math.max(1, curPorc + +pb.dataset.porc)); $("#porcN").textContent = curPorc; $("#porcN").nextElementSibling.textContent = curPorc === 1 ? "porción" : "porc."; const ul = $("#ingList"); ul.innerHTML = ingHtml(curRec, curPorc / curRec.porciones); ul.classList.remove("bump"); void ul.offsetWidth; ul.classList.add("bump"); return; }
    const ck = e.target.closest("[data-cook]"); if (ck) { openCook(ck.dataset.cook); return; }
    const rec = e.target.closest("[data-rec]"); if (rec) { openRecipe(rec.dataset.rec); return; }
    if (e.target.closest("[data-close]")) closeModal();
    const yt = e.target.closest("[data-yt]");
    if (yt) {
      const f = document.createElement("iframe");
      f.src = `https://www.youtube-nocookie.com/embed/${yt.dataset.yt}?autoplay=1&rel=0`;
      f.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"; f.allowFullscreen = true;
      yt.replaceWith(f);
    }
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !modal.hidden && !cookEl) closeModal(); });
  // ---------- modo cocina: un paso por pantalla, timers, pantalla siempre encendida ----------
  let cookEl = null, wake = null, timers = [];
  const short = (n) => String(n).replace(/ \(.*\)/, "").replace(/ o .*/, "");
  const utHtml = (r) => (r.ut?.length ? `<ul class="ut-list">${r.ut.map((u) => `<li title="${esc(u.n)}"><span class="ut-ic">${ic(u.ic)}</span><small>${esc(short(u.n))}</small></li>`).join("")}</ul>` : "");
  async function lockWake() { try { wake = await navigator.wakeLock?.request("screen"); } catch (e) {} }
  document.addEventListener("visibilitychange", () => { if (cookEl && document.visibilityState === "visible") lockWake(); });
  function beep() {
    try { const a = new (window.AudioContext || window.webkitAudioContext)(); [0, 0.35, 0.7].forEach((t) => { const o = a.createOscillator(), g = a.createGain(); o.frequency.value = 880; o.connect(g); g.connect(a.destination); g.gain.setValueAtTime(0.0001, a.currentTime + t); g.gain.exponentialRampToValueAtTime(0.25, a.currentTime + t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + t + 0.3); o.start(a.currentTime + t); o.stop(a.currentTime + t + 0.32); }); } catch (e) {}
    try { navigator.vibrate?.([200, 100, 200]); } catch (e) {}
  }
  const timersIn = (txt) => { const out = []; const re = /(\d+)(?:\s*(?:-|–|a)\s*(\d+))?\s*(minutos|minuto|min|horas|hora|h)\b/gi; let m; while ((m = re.exec(txt))) { const v = +(m[2] || m[1]); const s = /^h/i.test(m[3]) ? v * 3600 : v * 60; if (s >= 60 && s <= 4 * 3600 && !out.some((x) => x.s === s)) out.push({ s, label: m[0] }); } return out; };
  function startTimer(tb) {
    let left = +tb.dataset.secs; tb.dataset.run = "1"; tb.classList.add("run"); cookEl.querySelector(".cook-running").appendChild(tb); const sp = tb.querySelector("span");
    const tick = () => { const m = Math.floor(left / 60), s = left % 60; sp.textContent = `${m}:${String(s).padStart(2, "0")}`; if (left-- <= 0) { clearInterval(iv); tb.classList.remove("run"); tb.classList.add("done"); sp.textContent = "¡Tiempo!"; beep(); toastG("¡Terminó el timer!"); } };
    const iv = setInterval(tick, 1000); timers.push(iv); tick();
  }
  function closeCook() { if (!cookEl) return; cookEl._stopVoice?.(); timers.forEach(clearInterval); timers = []; cookEl.remove(); cookEl = null; if (modal.hidden) document.body.style.overflow = ""; try { wake?.release(); } catch (e) {} wake = null; }
  const SRV = window.SpeechRecognition || window.webkitSpeechRecognition;  // reconocimiento de voz (Chrome, Edge, Safari)
  function openCook(id) {
    const r = R[id]; if (!r || !r.pasos.length) return; closeCook(); let k = 0, voiceOn = false, rec = null;
    const say = (t) => { try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(t); u.lang = "es-AR"; speechSynthesis.speak(u); } catch (e) {} };
    const f = curRec === r ? curPorc / r.porciones : 1;
    cookEl = document.createElement("div"); cookEl.className = "cook"; cookEl.setAttribute("role", "dialog"); cookEl.setAttribute("aria-label", "Modo cocina: " + r.name);
    cookEl.innerHTML = `<header class="cook-top"><div><small>Modo cocina</small><b>${esc(r.name)}</b></div>${SRV ? `<button class="cook-mic" type="button" aria-pressed="false" aria-label="Manejar con la voz" title="Manejar con la voz">${ic("mic")}</button>` : ""}<button class="cook-x" aria-label="Salir del modo cocina">×</button></header><p class="cook-vhint" hidden>Decí <b>«siguiente»</b>, <b>«anterior»</b>, <b>«repetir»</b>, <b>«timer»</b> o <b>«salir»</b>.</p>
      <div class="cook-bar"><i></i></div><div class="cook-running"></div>
      <div class="cook-body"><p class="cook-n"></p><p class="cook-step" aria-live="polite"></p><div class="cook-timers"></div></div>
      <details class="cook-ing"><summary>${ic("recetas")} Ingredientes${r.ut?.length ? " y utensilios" : ""}</summary><ul>${ingHtml(r, f)}</ul>${utHtml(r)}</details>
      <footer class="cook-nav"><button class="mini-btn" data-cprev>← Anterior</button><button class="btn" data-cnext>Siguiente →</button></footer>`;
    document.body.appendChild(cookEl); document.body.style.overflow = "hidden"; lockWake();
    const show = (dir) => {
      const st = cookEl.querySelector(".cook-step"); st.classList.remove("in-l", "in-r"); void st.offsetWidth; st.classList.add(dir < 0 ? "in-l" : "in-r");
      st.textContent = r.pasos[k]; cookEl.querySelector(".cook-n").textContent = `Paso ${k + 1} de ${r.pasos.length}`;
      cookEl.querySelector(".cook-bar i").style.width = ((k + 1) / r.pasos.length) * 100 + "%";
      cookEl.querySelector(".cook-timers").innerHTML = timersIn(r.pasos[k]).map((t) => `<button class="cook-timer" data-secs="${t.s}">${ic("clock")} <span>Timer de ${esc(t.label)}</span></button>`).join("");
      cookEl.querySelector("[data-cprev]").disabled = k === 0;
      cookEl.querySelector("[data-cnext]").innerHTML = k === r.pasos.length - 1 ? `${ic("check")} ¡Listo!` : "Siguiente →";
      if (voiceOn) say(`Paso ${k + 1}. ${r.pasos[k]}`);
    };
    const go = (d) => { if (d > 0 && k === r.pasos.length - 1) { closeCook(); toastG("¡Buen provecho!"); return; } const nk = Math.max(0, Math.min(r.pasos.length - 1, k + d)); if (nk === k) return; k = nk; show(d); };
    cookEl.addEventListener("click", (e) => {
      if (e.target.closest(".cook-x")) { closeCook(); return; }
      const mic = e.target.closest(".cook-mic");
      if (mic) {
        voiceOn = !voiceOn; mic.setAttribute("aria-pressed", voiceOn); mic.classList.toggle("on", voiceOn); cookEl.querySelector(".cook-vhint").hidden = !voiceOn;
        if (!voiceOn) { try { rec && rec.stop(); speechSynthesis.cancel(); } catch (x) {} return; }
        const nzv = (s) => String(s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        rec = new SRV(); rec.lang = "es-AR"; rec.continuous = true; rec.interimResults = false;
        rec.onresult = (ev) => { const t = nzv(ev.results[ev.results.length - 1][0].transcript);
          if (/siguiente|proximo|dale|listo|avanza/.test(t)) go(1); else if (/anterior|atras|volve/.test(t)) go(-1);
          else if (/repet|lee|leer|que dice|otra vez/.test(t)) say(r.pasos[k]); else if (/timer|temporizador|reloj|arranca/.test(t)) cookEl.querySelector(".cook-timer:not([data-run])")?.click();
          else if (/salir|cerrar|terminar/.test(t)) closeCook(); };
        rec.onerror = (ev) => { if (ev.error === "not-allowed" || ev.error === "service-not-allowed") { voiceOn = false; mic.classList.remove("on"); mic.setAttribute("aria-pressed", "false"); cookEl.querySelector(".cook-vhint").hidden = true; toastG("Sin permiso para el micrófono: activalo en los ajustes del navegador."); } };
        rec.onend = () => { if (voiceOn && cookEl) { try { rec.start(); } catch (x) {} } };  // Chrome corta después de un silencio: se vuelve a escuchar
        try { rec.start(); } catch (x) {} say(`Paso ${k + 1}. ${r.pasos[k]}`);
        cookEl._stopVoice = () => { voiceOn = false; try { rec.stop(); speechSynthesis.cancel(); } catch (x) {} };
        return;
      }
      if (e.target.closest("[data-cnext]")) go(1); else if (e.target.closest("[data-cprev]")) go(-1);
      const tb = e.target.closest(".cook-timer"); if (tb && !tb.dataset.run) startTimer(tb);
    });
    let x0 = null; cookEl.addEventListener("touchstart", (e) => { if (!e.target.closest("details")) x0 = e.touches[0].clientX; }, { passive: true });
    cookEl.addEventListener("touchend", (e) => { if (x0 == null) return; const dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 60) go(dx < 0 ? 1 : -1); x0 = null; });
    show(1);
  }
  document.addEventListener("keydown", (e) => { if (!cookEl) return; if (e.key === "ArrowRight") cookEl.querySelector("[data-cnext]").click(); if (e.key === "ArrowLeft" && !cookEl.querySelector("[data-cprev]").disabled) cookEl.querySelector("[data-cprev]").click(); if (e.key === "Escape") closeCook(); });


  // ---------- cambiar un plato del plan de la casa ----------
  const SLOT_L = { desayuno: "desayuno", almuerzo: "almuerzo", cena: "cena" };
  function openSwap(date, slot) {
    const day = houseDay(date), base = houseDayBase(date)[slot], cur = day[slot], rc = R[cur];
    const pool = Object.values(R).filter((r) => !r.custom && r.id !== cur && ((slot === "desayuno") === (r.tipo === "desayuno")));
    const finde = ["Sábado", "Domingo"].includes(day.dow);
    const score = (r) => (DIET.ok(r) ? 0 : 100) + Math.abs((r.tiempo || 30) - (rc?.tiempo || 30)) / 10 + (!finde && r.tiempo > 45 ? 3 : 0);
    const list = pool.sort((a, b) => score(a) - score(b));
    let sh = $("#swapSheet"); if (!sh) { sh = document.createElement("div"); sh.id = "swapSheet"; sh.className = "share-sheet app-sheet"; document.body.appendChild(sh); }
    const dt = new Date(date + "T12:00");
    const item = (r) => `<button type="button" class="sw-opt${DIET.ok(r) ? "" : " diet-x"}" data-swpick="${r.id}"><img src="${r.img}"${srcs(r)} alt="" loading="lazy"><span><b>${esc(r.name)}</b><small>${r.tiempo} min · ${Math.round(r.nut?.kcal || r.kcal)} kcal${DIET.ok(r) ? "" : " · " + esc(DIET.why(r).join(", "))}</small></span></button>`;
    sh.innerHTML = `<div class="sh-bg" data-shx></div><div class="sh-box as-box sw-box" role="dialog" aria-modal="true" aria-labelledby="swT">
      <button class="as-x" type="button" data-shx aria-label="Cerrar">×</button>
      <h3 id="swT">Cambiar el ${SLOT_L[slot]}</h3><p class="muted small">${esc(day.dow)} ${dt.getDate()}/${dt.getMonth() + 1} · ahora: <b>${esc(rc?.name || "")}</b>. El cambio queda en este dispositivo y la lista de compras se ajusta sola.</p>
      ${cur !== base ? `<button type="button" class="mini-btn sw-reset" data-swpick="${base}">${ic("refresh")} Volver al plato del plan: ${esc(R[base].name)}</button>` : ""}
      <input class="sw-q" type="search" placeholder="Buscar: lentejas, pollo, sin horno…" aria-label="Buscar receta">
      <div class="sw-list">${list.map(item).join("")}</div></div>`;
    sh.hidden = false; document.body.classList.add("no-scroll");
    const close = () => { sh.hidden = true; document.body.classList.remove("no-scroll"); };
    const nz = (s) => String(s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    sh.querySelector(".sw-q").oninput = (e) => { const q = nz(e.target.value); sh.querySelectorAll(".sw-opt").forEach((b) => { const r = R[b.dataset.swpick]; b.hidden = q && !nz(r.name + " " + r.tags.join(" ") + " " + r.ing.map((i) => i.n).join(" ")).includes(q); }); };
    sh.onkeydown = (e) => { if (e.key === "Escape") close(); };
    sh.onclick = (e) => {
      if (e.target.closest("[data-shx]")) return close();
      const p = e.target.closest("[data-swpick]"); if (!p) return;
      const v = Object.assign({}, swGet()), d = Object.assign({}, v[date] || {});
      if (p.dataset.swpick === base) delete d[slot]; else d[slot] = p.dataset.swpick;
      if (Object.keys(d).length) v[date] = d; else delete v[date];
      // se limpian los cambios de hace más de dos meses
      const min = addDays(todayISO, -60); Object.keys(v).forEach((k) => { if (k < min) delete v[k]; });
      swSet(v); close(); toastG(p.dataset.swpick === base ? "Volvió el plato del plan." : `Listo: ${R[p.dataset.swpick].name}.`);
      window.dispatchEvent(new Event("plan-swap"));
    };
  }
  document.addEventListener("click", (e) => { const b = e.target.closest("[data-swap]"); if (!b) return; e.preventDefault(); e.stopPropagation(); const [d, s] = b.dataset.swap.split("|"); openSwap(d, s); }, true);
  window.addEventListener("plan-swap", () => { window.notifSnap?.(); });

  // ---------- popover (hover) ----------
  const pop = $("#pop");
  let popTimer = null;
  function showPop(el) {
    if (!pop || window.matchMedia("(hover: none)").matches) return;
    const r = R[el.dataset.rec]; if (!r) return;
    pop.innerHTML = `<img src="${r.img}"${srcs(r)} alt=""><div class="pb"><b>${esc(r.name)}</b><span>${ic("clock")} ${r.tiempo} min · ${ic("flame")} ${r.kcal} kcal · ${ic("tag")} ${fmt(r.cost)}/porción</span><em>${r.tags.slice(0, 3).map(esc).join(" · ")}</em><small>tocá para abrir la receta</small></div>`;
    pop.hidden = false;
    const b = el.getBoundingClientRect(), pw = pop.offsetWidth, ph = pop.offsetHeight;
    let x = b.left + b.width / 2 - pw / 2, y = b.top - ph - 10;
    if (y < 8) y = b.bottom + 10;
    x = Math.max(8, Math.min(x, window.innerWidth - pw - 8));
    pop.style.left = x + "px"; pop.style.top = y + "px";
  }
  function hidePop() { if (pop) pop.hidden = true; }
  if (pop) {
    document.addEventListener("mouseover", (e) => {
      const el = e.target.closest(".cm[data-rec]");
      if (el) { clearTimeout(popTimer); popTimer = setTimeout(() => showPop(el), 120); }
    });
    document.addEventListener("mouseout", (e) => {
      const el = e.target.closest(".cm[data-rec]");
      if (el && !el.contains(e.relatedTarget)) { clearTimeout(popTimer); hidePop(); }
    });
    window.addEventListener("scroll", hidePop, { passive: true });
  }

  // ---------- plan continuo: se genera desde las rotaciones de data.js (nunca se termina) ----------
  const ROT = D.rot, DOWS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"], MES3 = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  const parseISO = (iso) => { const [y, m, d] = iso.split("-").map(Number); return new Date(y, m - 1, d, 12); };
  const fmtISO = (d) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  const addDays = (iso, n) => { const d = parseISO(iso); d.setDate(d.getDate() + n); return fmtISO(d); };
  const mondayOf = (iso) => { const d = parseISO(iso); d.setDate(d.getDate() - (d.getDay() + 6) % 7); return fmtISO(d); };
  const mod = (a, b) => ((a % b) + b) % b;
  const EPOCH = mondayOf(ROT.epoch);
  const lab = (iso) => `${+iso.slice(8)} ${MES3[+iso.slice(5, 7) - 1]}`;
  function houseDay(iso) {
    const o = houseDayBase(iso), sw = swGet()[iso];
    if (sw) ["desayuno", "almuerzo", "cena"].forEach((k) => { if (sw[k] && R[sw[k]]) { o[k] = sw[k]; (o.sw = o.sw || {})[k] = 1; } });
    return o;
  }
  function houseDayBase(iso) {
    const idx = Math.round((parseISO(iso) - parseISO(EPOCH)) / 864e5); const w = Math.floor(idx / 7), d = mod(idx, 7);
    let lunch, dinner;
    if (d >= 5) [lunch, dinner] = (d === 5 ? ROT.sat : ROT.sun)[mod(w, ROT.sat.length)];
    else { const k = w * 5 + d; lunch = ROT.lunch[mod(k, ROT.lunch.length)]; dinner = ROT.dinner[mod(k, ROT.dinner.length)]; }
    if (iso.slice(8) === "29") { if (dinner === "noquis") dinner = "sopa"; lunch = "noquis"; }  // ñoquis del 29
    return { date: iso, dow: DOWS[d], label: `${DOWS[d]} ${lab(iso)}`, desayuno: ROT.break[mod(d + w, 7)], almuerzo: lunch, merienda: ROT.merienda[mod(d + w, 7)], cena: dinner };
  }
  function weekAt(monday) { const days = Array.from({ length: 7 }, (_, i) => houseDay(addDays(monday, i))); return { start: monday, end: days[6].date, label: `${lab(monday)} → ${lab(days[6].date)}`, days }; }
  function monthWeeks(ym) { const out = []; let m = mondayOf(ym + "-01"); while (m.slice(0, 7) <= ym && out.length < 6) { out.push(weekAt(m)); m = addDays(m, 7); } return out; }
  const SHOP_CATS = { verd: "Verdulería", carne: "Carnicería y pescadería", lact: "Lácteos y huevos", alm: "Almacén", pan: "Panadería" };
  function shoppingFor(week) {
    const agg = new Map();
    const N = HOG();
    week.days.forEach((d) => ["desayuno", "almuerzo", "cena"].forEach((s) => (R[d[s]]?.ing || []).forEach((i) => { if (i.c === "pantry") return; const k = `${i.c}|${i.n}|${i.u}`; agg.set(k, (agg.get(k) || 0) + i.q * N); })));
    [["lact|yogur natural (pote)|u", 2], ["verd|fruta de estación (manzana, naranja, banana)|u", 4], ["pan|pan integral (rodajas)|u", 4]].forEach(([k, q]) => agg.set(k, (agg.get(k) || 0) + q * N));  // meriendas
    const fmtq = (q, u) => { const dec = (x) => String(x).replace(".", ","); if (u === "u") return `${Math.max(1, Math.ceil(q - 0.05))} u`; q = Math.round(q * 10) / 10; if ((u === "g" || u === "ml") && q >= 1000) return `${dec(Math.round(q / 100) / 10)} ${u === "g" ? "kg" : "L"}`; return `${dec(q)} ${u}`; };
    const out = Object.keys(SHOP_CATS).map((c) => ({ c, cat: SHOP_CATS[c], items: [] }));
    [...agg.entries()].forEach(([k, q]) => { const [c, n, u] = k.split("|"); (out.find((x) => x.c === c) || out[3]).items.push({ n, q: fmtq(q, u), raw: q, u }); });
    out.forEach((c) => c.items.sort((a, b) => a.n.localeCompare(b.n)));
    return out.filter((c) => c.items.length).map(({ c, cat, items }) => ({ c, cat, items }));
  }
  const srcs = (r) => (r && r.srcset ? ` srcset="${r.srcset}" sizes="(max-width:720px) 46vw, 320px"` : "");
  window.PLAN = { houseDay, weekAt, monthWeeks, shoppingFor, mondayOf, addDays, lab };
  const monthLabel = (ym) => MESES[+ym.slice(5, 7) - 1][0].toUpperCase() + MESES[+ym.slice(5, 7) - 1].slice(1) + " " + ym.slice(0, 4);
  const weekTag = (w) => { const cur = mondayOf(todayISO); return w.start === cur ? "Esta semana" : w.start === addDays(cur, 7) ? "La que viene" : w.start === addDays(cur, -7) ? "La pasada" : ""; };


  // ---------- inicio ----------
  if ((page === "inicio" || page === "404") && $("#today")) {
    const vid = $("#introVideo");
    if (vid && !document.documentElement.classList.contains("is-app")) { const v = window.matchMedia("(max-width: 720px)").matches; vid.poster = v ? "media/intro-vertical-poster.jpg" : "media/intro-poster.jpg"; if (v) { vid.querySelector("source").src = "media/intro-vertical.mp4"; vid.classList.add("vertical"); vid.load(); } }
    const d = houseDay(todayISO);
    $("#today").innerHTML = `<div class="t-head"><p class="kicker">Menú de hoy</p><h3>${"Hoy, " + longDate(d.date)}</h3></div>
      ${["desayuno", "almuerzo", "cena"].map((m) => `<div class="t-row"><small>${ICON[m]} ${m}</small>${mealBtn(d[m])}</div>`).join("")}
      <div class="t-row mer"><small>${ICON.merienda} merienda</small><span class="muted">${esc(d.merienda)}</span></div>
      <a class="btn small-btn" href="plan.html">Ver la semana →</a><a class="mini-btn" href="plan.html?dia=${addDays(todayISO, 1)}">${ic("arrow")} Mañana: ${esc(R[houseDay(addDays(todayISO, 1)).almuerzo].name)}</a>`;
  }

  // ---------- plan: calendario + semana ----------
  // la pestaña elegida queda centrada en su fila (sin mover la página); si la fila todavía está oculta, espera a que aparezca
  const centerOn = (c) => {
    const go = () => { const on = c.querySelector(".on"); if (!on || c.scrollWidth <= c.clientWidth) return; const a = c.getBoundingClientRect(), r = on.getBoundingClientRect(); c.scrollLeft += r.left - a.left - (a.width - r.width) / 2; };
    if (c.clientWidth) requestAnimationFrame(go); else if (window.ResizeObserver) { const ro = new ResizeObserver(() => { if (c.clientWidth) { ro.disconnect(); go(); } }); ro.observe(c); }
  };
  function renderWeekTabs(containerId, onPick) {
    const c = $(containerId); if (!c) return; c.innerHTML = "";
    D.weeks.forEach((w) => {
      const b = document.createElement("button"); const t = weekTag(w); b.innerHTML = (t ? `<small>${t} · </small>` : "") + esc(w.label); b.classList.toggle("on", w.start === state.week);
      b.addEventListener("click", () => { state.week = w.start; vt(onPick); }); c.appendChild(b);
    });
    centerOn(c);
  }
  function renderCalendar() {
    const c = $("#calendar"); if (!c) return;
    let html = `<div class="cal-head">${DOWS.map((d) => `<div>${d}</div>`).join("")}</div>`;
    D.weeks.forEach((w) => {
      html += `<div class="cal-week-label"><span>${weekTag(w) ? weekTag(w) + " · " : ""}${esc(w.label)}</span><a class="mini-btn" href="compras.html#semana-${w.start}">${ic("compras")} Lista de compras de esta semana</a></div>`;
      html += `<div class="cal-row">` + w.days.map((d) => {
        const n = +d.date.slice(8), m = +d.date.slice(5, 7); const out = d.date.slice(0, 7) !== state.ym;
        return `<div class="cal-cell${d.date === todayISO ? " is-today" : ""}${d.dow === "Sábado" || d.dow === "Domingo" ? " wk" : ""}${out ? " out" : ""}">
          <div class="cal-date"><b>${n}</b>${n === 1 || out ? `<span>${MESES[m - 1].slice(0, 3)}</span>` : ""}${d.date === todayISO ? `<span class="hoy">hoy</span>` : ""}</div>
          ${["desayuno", "almuerzo", "cena"].map((k) => `<button class="cm" data-rec="${d[k]}" title="${esc(R[d[k]].name)}"><i>${ICON[k]}</i><img src="${R[d[k]].img}"${srcs(R[d[k]])} alt="" loading="lazy"><span>${esc(R[d[k]].name)}</span></button>`).join("")}
          <div class="cm mer"><i>${ICON.merienda}</i><span>${esc(d.merienda)}</span></div>
        </div>`; }).join("") + `</div>`;
    });
    c.innerHTML = html;
  }
  function renderWeek() {
    if (!$("#planTable")) return;
    renderWeekTabs("#weekTabs", renderWeek);
    const w = D.weeks.find((x) => x.start === state.week) || D.weeks[0];
    $("#planTable tbody").innerHTML = w.days.map((d) => `
      <tr><td class="day${d.date === todayISO ? " is-today" : ""}">${d.dow}<span>${lab(d.date)}</span></td>
        <td><div class="td-sw">${mealBtn(d.desayuno)}${swapBtn(d.date, "desayuno", d.sw?.desayuno)}</div></td><td><div class="td-sw">${mealBtn(d.almuerzo)}${swapBtn(d.date, "almuerzo", d.sw?.almuerzo)}</div></td><td class="muted">${esc(d.merienda)}</td><td><div class="td-sw">${mealBtn(d.cena)}${swapBtn(d.date, "cena", d.sw?.cena)}</div></td></tr>`).join("");
    $("#planCards").innerHTML = w.days.map((d) => `
      <article class="dc${d.date === todayISO ? " is-today" : ""}"><h4>${esc(d.label)}${d.date === todayISO ? ' <span class="hoy">hoy</span>' : ""}</h4>
        <div class="row"><small>Desayuno</small>${mealBtn(d.desayuno)}${swapBtn(d.date, "desayuno", d.sw?.desayuno)}</div><div class="row"><small>Almuerzo</small>${mealBtn(d.almuerzo)}${swapBtn(d.date, "almuerzo", d.sw?.almuerzo)}</div>
        <div class="row"><small>Merienda</small><span class="muted">${esc(d.merienda)}</span></div><div class="row"><small>Cena</small>${mealBtn(d.cena)}${swapBtn(d.date, "cena", d.sw?.cena)}</div></article>`).join("");
    renderBatch();
  }
  // ---------- batch cooking del domingo: qué adelantar de la semana ----------
  const BASES = [
    { k: "granos", t: "Cociná de una vez", re: /\b(arroz|quinoa|lentejas secas|garbanzos secos|porotos secos|maiz blanco)/, how: (n) => `${n}: hervilo y guardalo en la heladera (hasta 4 días)` },
    { k: "horno", t: "Horneá juntas en una placa", re: /\b(calabaza|zapallo|papa|batata|berenjena|morron)/, how: (n) => `${n}: en cubos, al horno 200 °C unos 35 minutos` },
    { k: "picar", t: "Picá y guardá en frascos", re: /\b(cebolla|zanahoria|ajo|morron|puerro|cebolla de verdeo|perejil)/, how: (n) => `${n}: picada, en un frasco en la heladera (3 días)` },
  ];
  function renderBatch() {
    const box = $("#batch"); if (!box) return;
    let w = D.weeks.find((x) => x.start === state.week) || D.weeks[0]; if (!w) return;
    // el sábado y el domingo se adelanta la semana que viene (no la que termina)
    const dowNow = new Date().getDay(); if (w.start === mondayOf(todayISO) && (dowNow === 0 || dowNow === 6)) w = weekAt(addDays(w.start, 7));
    const nzb =(s) => String(s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const lab2 = (iso) => { const d = new Date(iso + "T12:00"); return ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"][d.getDay()]; };
    const uses = new Map();
    w.days.slice(0, 5).forEach((d) => ["almuerzo", "cena"].forEach((s) => { const r = R[d[s]]; if (!r) return; const u = uses.get(r.id) || { r, days: [] }; u.days.push(d.date); uses.set(r.id, u); }));
    const good = (r) => r.porciones >= 2 || r.tags.some((t) => /batch|rinde|olla|horno/.test(nzb(t))) || r.tiempo >= 35;
    const pick = [...uses.values()].filter((u) => good(u.r)).sort((a, b) => b.days.length * b.r.tiempo - a.days.length * a.r.tiempo).slice(0, 4);
    if (!pick.length) { box.innerHTML = ""; return; }
    const N = HOG(), ports = pick.reduce((a, u) => a + u.days.length * N, 0);
    const oven = pick.filter((u) => u.r.tags.some((t) => /horno/.test(nzb(t))) || (u.r.ut || []).some((x) => (x.k || x) === "horno"));
    const stove = pick.filter((u) => !oven.includes(u));
    const total = Math.round((Math.max(oven.reduce((a, u) => Math.max(a, u.r.tiempo), 0), Math.ceil(stove.reduce((a, u) => a + u.r.tiempo, 0) / 2)) + 25) / 5) * 5;
    // bases que aparecen en dos o más platos de lunes a viernes
    const weekR = [...uses.values()].map((u) => u.r);
    const bases = BASES.map((B) => { const m = new Map(); weekR.forEach((r) => r.ing.forEach((i) => { const n = nzb(i.n); const hit = n.match(B.re); if (hit) { const key = i.n.replace(/\s*\(.*?\)/g, "").split(/[,/]/)[0].trim(); const e = m.get(key) || new Set(); e.add(r.name); m.set(key, e); } })); return { B, items: [...m.entries()].filter(([, s]) => s.size >= 2) }; }).filter((x) => x.items.length);
    const dayList = (u) => { const l = u.days.map(lab2); return l.length > 1 ? l.slice(0, -1).join(", el ") + " y el " + l[l.length - 1] : l[0]; };
    const steps = [
      oven.length && `Prendé el horno a 200 °C y meté ${oven.map((u) => `<b>${esc(u.r.name.toLowerCase())}</b>`).join(" y ")}${bases.some((b) => b.B.k === "horno") ? ", y en otra placa las verduras para asar" : ""}.`,
      stove.length && `En las hornallas: ${stove.map((u) => `<b>${esc(u.r.name.toLowerCase())}</b>`).join(", ")}. Si tenés dos, van a la vez.`,
      bases.some((b) => b.B.k === "granos") && "En una olla aparte, el arroz o las legumbres que se repiten en la semana.",
      bases.some((b) => b.B.k === "picar") && "Mientras se cocina, picá la cebolla, la zanahoria y lo demás que se repite.",
      `Dejá enfriar, porcioná en <b>${ports} ${ports === 1 ? "recipiente" : "recipientes"}</b> con etiqueta: a la heladera lo de lunes a miércoles y al freezer lo de jueves y viernes.`,
    ].filter(Boolean);
    box.innerHTML = `<div class="card bt-card">
      <div class="bt-head"><span class="hel-ico">${ic("pot")}</span><div><p class="kicker">Domingo de batch cooking</p><h2>Adelantá la semana del ${esc(w.label.split(" → ")[0])}</h2>
        <p class="muted small">Con unas horas el domingo, de lunes a viernes solo calentás. Para ${N === 1 ? "una persona" : N + " personas"}.</p></div></div>
      <div class="bt-kpis"><div><b>${total >= 60 ? `${Math.floor(total / 60)} h${total % 60 ? " " + (total % 60) : ""}` : total + " min"}</b><small>en total</small></div><div><b>${pick.length}</b><small>${pick.length === 1 ? "plato" : "platos"}</small></div><div><b>${ports}</b><small>porciones</small></div></div>
      <h3>Qué cocinar</h3>
      <div class="bt-list">${pick.map((u) => `<button type="button" class="bt-item" data-rec="${u.r.id}"><img src="${u.r.img}"${srcs(u.r)} alt="" loading="lazy"><span><b>${esc(u.r.name)}</b><small>${u.r.tiempo} min · para el ${dayList(u)}</small></span></button>`).join("")}</div>
      <h3>Paso a paso</h3><ol class="bt-steps">${steps.map((s) => `<li>${s}</li>`).join("")}</ol>
      ${bases.length ? `<h3>Bases que se repiten</h3>${bases.map(({ B, items }) => `<div class="bt-base"><b>${B.t}</b><ul>${items.map(([n, s]) => `<li>${esc(B.how(n))} <small class="muted">(${esc([...s].join(", "))})</small></li>`).join("")}</ul></div>`).join("")}` : ""}
      <p class="muted small bt-tip">${ic("bulb")} Lo cocido dura 3 a 4 días en la heladera y hasta 3 meses en el freezer. Descongelá en la heladera la noche anterior.</p></div>`;
  }
  if (page === "plan") {
    const qs = new URLSearchParams(location.search); const want = qs.get("semana") || qs.get("dia");
    state.ym = (want || todayISO).slice(0, 7); state.week = mondayOf(want || todayISO);
    const renderPlanPage = () => {
      D.weeks = monthWeeks(state.ym); if (!D.weeks.some((w) => w.start === state.week)) state.week = D.weeks[0].start;
      $("#monthLabel").textContent = monthLabel(state.ym); renderCalendar(); renderWeek();
    };
    window.addEventListener("plan-swap", () => renderPlanPage());
    const shiftMonth = (n) => { const d = parseISO(state.ym + "-01"); d.setMonth(d.getMonth() + n); state.ym = fmtISO(d).slice(0, 7); state.week = n === 0 ? mondayOf(todayISO) : mondayOf(state.ym + "-01"); vt(renderPlanPage); };
    $("#mPrev").addEventListener("click", () => shiftMonth(-1)); $("#mNext").addEventListener("click", () => shiftMonth(1)); $("#mHoy").addEventListener("click", () => shiftMonth(0));
    renderPlanPage();
    const isMobile = window.matchMedia("(max-width: 720px)").matches;
    const viewKey = isMobile ? "planView_m" : "planView_d";
    const setView = (v) => { $("#calendar").hidden = v !== "cal"; $("#weekView").hidden = v !== "week"; $$("#viewSeg button").forEach((b) => b.classList.toggle("on", b.dataset.view === v)); localStorage.setItem(viewKey, v); animateIn(); };
    setView(localStorage.getItem(viewKey) || (isMobile ? "week" : "cal"));
    if (isMobile && !$("#calendar").hidden && state.ym === todayISO.slice(0, 7)) setTimeout(() => $(".cal-cell.today")?.scrollIntoView({ block: "center" }), 250);
    $("#viewSeg").addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) vt(() => setView(b.dataset.view)); });
  }

  // ---------- recetas por categoría ----------
  const CATS = [
    { id: "desayunos", t: "Desayunos", d: "Diez opciones entre 5 y 25 minutos: sin cocción, con sartén, cuatro veganas y dos sin TACC.", ids: ["tostadas", "yogur", "revueltos", "panqueques", "avenamanzana", "tostadafrancesa", "chipa", "licuadobanana", "chiabanana", "tofurevuelto"] },
    { id: "rapidas", t: "Rápidas para la semana", d: "Listas en 25 minutos o menos, con una sartén o sin cocinar. Las cenas de lunes a viernes.", ids: ["merluza", "atun", "omelette", "wok", "wrap", "garbanzos", "gramajo", "revueltozapallitos", "woktofu"] },
    { id: "horno", t: "Al horno, una sola fuente", d: "Se arman en 10 minutos y el horno hace el resto. Conviene hacer el doble: lo que sobra es la vianda del día siguiente.", ids: ["pollohorno", "milanesas", "tarta", "salmon", "pescadohorno", "berenjenas", "hamburguesas", "pizzacasera", "cerdobatata", "milanesasberenjena", "falafel", "empanadaslentejas"] },
    { id: "ollas", t: "Ollas, guisos y arroces", d: "Las más económicas, las que mejor rinden y las que mejor se congelan en porciones.", ids: ["sopa", "lentejas", "curry", "arrozpollo", "albondigas", "guisofideos", "pollodisco", "locrovegano", "currylentejas", "chiliporotos"] },
    { id: "clasicos", t: "Clásicos argentinos y pastas del finde", d: "Llevan más tiempo y más mesa: quedan para sábado y domingo (y los ñoquis, para el 29).", ids: ["empanadas", "bife", "zapallitos", "pastel", "noquis", "tortilla", "carbonara", "bifecriolla"] },
    { id: "verdes", t: "Verdes y de legumbres", d: "Sin carne y con legumbres, verduras o polenta: veganas o vegetarianas, económicas y que llenan.", ids: ["polenta", "hamblentejas", "garbanzosespinaca", "pastabrocoli", "bunuelosacelga"] },
  ];
  function card(r) {
    return `<button class="rc" data-rec="${r.id}"><img src="${r.img}"${srcs(r)} alt="${esc(r.name)}" loading="lazy"><div class="b"><h4>${esc(r.name)}</h4>
      <div class="meta"><span>${ic("clock")}<b>${r.tiempo} min</b></span><span>${ic("flame")}<b>${r.kcal}</b> kcal</span><span>${ic("tag")}<b data-ars="${r.cost}"></b>/porción</span></div>
      <div>${r.tags.map((t) => `<span class="tag">${esc(t)}</span>`).join("")}</div></div></button>`;
  }
  if (page === "recetas") {
    const h1 = $(".page-head h1"); if (h1) h1.innerHTML = `${Object.values(R).filter((r) => !r.custom).length} recetas, <mark>${CATS.length === 6 ? "seis" : CATS.length} categorías</mark>`;
    $("#catNav").innerHTML = CATS.map((c) => `<a href="#${c.id}">${esc(c.t)} <small>${c.ids.length}</small></a>`).join("");
    // ---------- «¿qué hay en tu heladera?»: recetas que aprovechan lo que tenés ----------
    const normH = (s) => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\(.*?\)/g, " ").replace(/[,.]/g, " ").replace(/\s+/g, " ").trim();
    const STOP = new Set(["con", "de", "del", "la", "las", "los", "el", "para", "sin", "en", "y"]);
    const words = (s) => normH(s).split(" ").filter((w) => w.length >= 3 && !STOP.has(w));
    const sameWord = (a, b) => a === b || a === b + "s" || a === b + "es" || b === a + "s" || b === a + "es";
    const has = (ingName, item) => { const iw = words(ingName), tw = words(item); return tw.length > 0 && tw.every((t) => iw.some((w) => sameWord(w, t))); };
    const ingOf = (r) => r.ing.filter((i) => i.c !== "pantry");
    const HKEY = "heladera";
    let hel = (() => { try { return JSON.parse(localStorage.getItem(HKEY) || "[]"); } catch (e) { return []; } })();
    const saveHel = () => { try { localStorage.setItem(HKEY, JSON.stringify(hel)); } catch (e) {} };
    const base = Object.values(R).filter((r) => !r.custom);
    $("#helList").innerHTML = [...new Set(base.flatMap((r) => ingOf(r).map((i) => normH(i.n))))].sort().map((n) => `<option value="${esc(n)}">`).join("");
    const QUICK = ["huevos", "papa", "cebolla", "arroz", "pollo", "tomate", "zapallito", "zanahoria", "queso", "atún", "lentejas", "carne picada", "espinaca", "fideos"];
    function renderHel() {
      $("#helChips").innerHTML = hel.length ? hel.map((h, i) => `<button class="hel-chip" data-hdel="${i}" aria-label="Quitar ${esc(h)}">${esc(h)} <span aria-hidden="true">×</span></button>`).join("") + `<button class="mini-btn" data-hclear>Vaciar</button>` : "";
      $("#helQuick").innerHTML = `<small class="muted">Rápido:</small>` + QUICK.filter((q) => !hel.some((h) => normH(h) === normH(q))).slice(0, 10).map((q) => `<button class="hel-q" data-hadd="${esc(q)}">+ ${esc(q)}</button>`).join("");
      if (!hel.length) { $("#helRes").innerHTML = ""; return; }
      const scored = Object.values(R).map((r) => { const ings = ingOf(r); const ok = ings.filter((i) => hel.some((h) => has(i.n, h))); return { r, ok, miss: ings.filter((i) => !ok.includes(i)), cov: ings.length ? ok.length / ings.length : 0 }; })
        .filter((x) => x.ok.length).sort((a, b) => b.cov - a.cov || b.ok.length - a.ok.length || a.miss.length - b.miss.length).slice(0, 9);
      $("#helRes").innerHTML = scored.length ? `<p class="small hel-sum">${scored.length === 9 ? "Las 9 recetas" : scored.length === 1 ? "La receta" : `Las ${scored.length} recetas`} que más aprovechan lo que tenés:</p><div class="hel-grid">${scored.map((x) => `<button class="hel-card" data-rec="${x.r.id}"><img src="${x.r.img}"${srcs(x.r)} alt="" loading="lazy"><div><b>${esc(x.r.name)}</b>
          <div class="hel-bar" aria-label="${Math.round(x.cov * 100)} % de los ingredientes"><i style="width:${Math.round(x.cov * 100)}%"></i></div>
          <small class="ok">Usás: ${esc(x.ok.map((i) => i.n.replace(/\s*\(.*?\)/g, "")).join(", "))}</small>
          ${x.miss.length ? `<small class="miss">Te falta: ${esc(x.miss.slice(0, 4).map((i) => i.n.replace(/\s*\(.*?\)/g, "")).join(", "))}${x.miss.length > 4 ? ` y ${x.miss.length - 4} más` : ""}</small>` : `<small class="ok"><b>¡Tenés todo!</b></small>`}</div></button>`).join("")}</div>`
        : `<p class="muted small">Ninguna receta usa eso todavía. Probá con otro nombre (por ejemplo «zapallito» en vez de «calabacín»).</p>`;
    }
    const addHel = (v) => { v = String(v || "").trim(); if (!v || hel.some((h) => normH(h) === normH(v))) return; hel.push(v); saveHel(); renderHel(); };
    $("#helForm").addEventListener("submit", (e) => { e.preventDefault(); String($("#helQ").value).split(/[,;]/).forEach(addHel); $("#helQ").value = ""; });
    $("#heladera").addEventListener("click", (e) => {
      const a = e.target.closest("[data-hadd]"), d = e.target.closest("[data-hdel]"), c = e.target.closest("[data-hclear]");
      if (a) addHel(a.dataset.hadd); if (d) { hel.splice(+d.dataset.hdel, 1); saveHel(); renderHel(); } if (c) { hel = []; saveHel(); renderHel(); }
    });
    renderHel();
    $("#recSections").innerHTML = CATS.map((c) => `<section class="cat" id="${c.id}"><div class="cat-head"><h2>${esc(c.t)}</h2><p class="muted">${esc(c.d)}</p></div><div class="grid">${c.ids.map((id) => card(R[id])).join("")}</div></section>`).join("");
  }

  // ---------- peso: registro, gráfico, IMC y objetivo (Nutrición) ----------
  if (page === "nutricion" && $("#pesoBox")) {
    const PK = "pesos";
    const pGet = () => { try { return JSON.parse(localStorage.getItem(PK) || "{}"); } catch (e) { return {}; } };
    const pSet = (v) => { try { localStorage.setItem(PK, JSON.stringify(v)); } catch (e) {} };
    const prof = () => { try { return JSON.parse(localStorage.getItem("perfil-nutricion") || "null"); } catch (e) { return null; } };
    const fmt1 = (n) => (+n).toLocaleString("es-AR", { maximumFractionDigits: 1 });
    function renderPeso() {
      const st = pGet(), days = Object.keys(st).sort(), p = prof(), meta = +localStorage.getItem("pesoMeta") || null;
      const last = days.length ? st[days[days.length - 1]] : p?.peso || null;
      const ago = (n) => { const lim = addDays(todayISO, -n); const d = days.filter((x) => x <= lim).pop(); return d ? st[d] : null; };
      const d30 = ago(30), d7 = ago(7);
      const imc = last && p?.altura ? last / ((p.altura / 100) ** 2) : null;
      const imcT = !imc ? "" : imc < 18.5 ? "bajo peso" : imc < 25 ? "peso saludable" : imc < 30 ? "sobrepeso" : "obesidad";
      // gráfico de los últimos 90 días
      const pts = days.filter((d) => d >= addDays(todayISO, -90)).map((d) => [d, st[d]]);
      let svg = "";
      if (pts.length >= 2) {
        const vs = pts.map((x) => x[1]).concat(meta ? [meta] : []), lo = Math.min(...vs) - 1, hi = Math.max(...vs) + 1, W = 320, H = 130;
        const t0 = new Date(pts[0][0]).getTime(), t1 = new Date(pts[pts.length - 1][0]).getTime() || t0 + 1;
        const X = (d) => 8 + (W - 16) * ((new Date(d).getTime() - t0) / Math.max(1, t1 - t0)), Y = (v) => 10 + (H - 24) * (1 - (v - lo) / (hi - lo));
        svg = `<svg class="pz-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Peso de los últimos 90 días">
          ${meta ? `<line x1="0" x2="${W}" y1="${Y(meta)}" y2="${Y(meta)}" class="goal"/><text x="${W - 4}" y="${Y(meta) - 4}" text-anchor="end">objetivo ${fmt1(meta)}</text>` : ""}
          <polyline points="${pts.map(([d, v]) => `${X(d).toFixed(1)},${Y(v).toFixed(1)}`).join(" ")}"/>
          ${pts.map(([d, v]) => `<circle cx="${X(d).toFixed(1)}" cy="${Y(v).toFixed(1)}" r="3"><title>${d.slice(8)}/${d.slice(5, 7)}: ${fmt1(v)} kg</title></circle>`).join("")}
          <text x="8" y="${H - 2}">${pts[0][0].slice(8)}/${pts[0][0].slice(5, 7)}</text><text x="${W - 8}" y="${H - 2}" text-anchor="end">${pts[pts.length - 1][0].slice(8)}/${pts[pts.length - 1][0].slice(5, 7)}</text></svg>`;
      }
      const delta = (a) => (a == null || last == null ? "—" : `${last - a > 0 ? "+" : ""}${fmt1(last - a)} kg`);
      $("#pesoBox").innerHTML = `<h3>${ic("scale")} Tu peso</h3>
        <form class="pz-form" id="pzForm"><label><span>Peso hoy (kg)</span><input id="pzKg" type="number" step="0.1" min="30" max="250" inputmode="decimal" placeholder="${last ? fmt1(last) : "Ej.: 72,5"}" required></label>
          <label><span>Día</span><input id="pzDate" type="date" value="${todayISO}" max="${todayISO}"></label><button class="btn" type="submit">Guardar</button></form>
        ${last ? `<div class="pz-kpis"><div><b>${fmt1(last)} kg</b><small>ahora</small></div><div><b>${delta(d7)}</b><small>en 7 días</small></div><div><b>${delta(d30)}</b><small>en 30 días</small></div><div><b>${imc ? fmt1(imc) : "—"}</b><small>IMC${imcT ? " · " + imcT : ""}</small></div></div>` : `<p class="muted small">Cargá tu peso cada tanto (mejor a la mañana, en ayunas): vas a ver cómo cambia y el mes a medida se ajusta a tu peso actual.</p>`}
        ${svg || (days.length === 1 ? `<p class="muted small">Con dos o más registros aparece el gráfico.</p>` : "")}
        <div class="pz-meta"><label><span>Peso objetivo (opcional)</span><input id="pzMeta" type="number" step="0.5" min="30" max="250" inputmode="decimal" value="${meta || ""}" placeholder="kg"></label>
          ${meta && last ? `<p class="small">${Math.abs(last - meta) < 0.5 ? `${ic("trophy")} ¡Llegaste a tu objetivo!` : `Te ${last > meta ? "faltan bajar" : "faltan subir"} <b>${fmt1(Math.abs(last - meta))} kg</b>. Un ritmo sano es de 0,25 a 0,5 kg por semana.`}</p>` : ""}</div>
        <p class="muted small pz-note" id="pzNote" hidden></p>`;
    }
    renderPeso();
    window.addEventListener("pesos", renderPeso);
    $("#pesoBox").addEventListener("submit", (e) => {
      if (e.target.id !== "pzForm") return; e.preventDefault();
      const kg = Math.round(+String($("#pzKg").value).replace(",", ".") * 10) / 10, d = $("#pzDate").value || todayISO;
      if (!(kg >= 30 && kg <= 250)) return;
      const st = pGet(); st[d] = kg; pSet(st);
      // el perfil (y con él el mes a medida, las calorías de los pasos y el análisis) usa el último peso
      const lastDay = Object.keys(st).sort().pop(); const p = (() => { try { return JSON.parse(localStorage.getItem("perfil-nutricion") || "null"); } catch (x) { return null; } })();
      if (p && lastDay === d) { p.peso = kg; localStorage.setItem("perfil-nutricion", JSON.stringify(p)); if ($("#pPeso")) $("#pPeso").value = kg; }
      renderPeso(); window.dispatchEvent(new Event("pesos-guardado"));
      const n = $("#pzNote"); if (n && p) { n.hidden = false; n.innerHTML = `Listo: tu análisis y el mes a medida ya usan ${fmt1(kg)} kg. <a href="#medida" data-md-recalc>Volver a armar mi mes</a>`; }
      toastG(`Peso guardado: ${fmt1(kg)} kg.`);
    });
    $("#pesoBox").addEventListener("change", (e) => { if (e.target.id !== "pzMeta") return; const v = +String(e.target.value).replace(",", "."); if (v >= 30 && v <= 250) localStorage.setItem("pesoMeta", v); else localStorage.removeItem("pesoMeta"); renderPeso(); window.dispatchEvent(new Event("pesos-guardado")); });
    document.addEventListener("click", (e) => { if (e.target.closest("[data-md-recalc]")) setTimeout(() => $("#mdGo")?.click(), 400); });
  }

  // ---------- recetas: solo las que van con el perfil (con «ver todas») ----------
  if (page === "recetas" && $("#dietBar")) {
    let all = false;
    const bar = () => {
      const on = DIET.active(), main = $("main");
      main.classList.toggle("diet-hide", on && !all);
      $("#dietBar").hidden = false;
      const n = Object.values(R).filter((r) => !r.custom).length, nOk = Object.values(R).filter((r) => !r.custom && DIET.ok(r)).length;
      $("#dietBar").innerHTML = on ? `${ic("leaf")}<span><b>${all ? `Todas las recetas (${n})` : `${nOk} de ${n} recetas`}</b> · ${esc(DIET.summary())}</span><button type="button" class="mini-btn" data-diet-all>${all ? "Solo las que van conmigo" : "Ver todas"}</button><button type="button" class="mini-btn" data-open-prefs>Cambiar</button>`
        : `${ic("leaf")}<span>¿Sos vegetariano/a, celíaco/a o tenés alguna alergia?</span><button type="button" class="mini-btn" data-open-prefs>Elegí tus preferencias</button>`;
    };
    bar(); window.addEventListener("prefs", bar);
    $("#dietBar").addEventListener("click", (e) => { if (e.target.closest("[data-diet-all]")) { all = !all; bar(); } });
  }

  // ---------- recetas: búsqueda y filtros ----------
  if (page === "recetas" && $("#recQ")) {
    const nz = (s) => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    const F = [["rapidas", "Hasta 20 min", (r) => r.tiempo <= 20], ["veg", "Vegetarianas", (r) => r.tags.includes("vegetariano")], ["horno", "Al horno", (r) => r.tags.includes("horno")],
      ["eco", "Económicas", (r) => r.cost && r.cost <= 2500], ["prot", "Proteicas", (r) => r.tags.includes("proteico") || (r.nut?.prot || 0) >= 35], ["liv", "Livianas", (r) => r.kcal < 450], ["sinc", "Sin cocción", (r) => r.tags.includes("sin cocción")]];
    const on = new Set();
    $("#recF").innerHTML = F.map(([k, t]) => `<button class="pchip" type="button" data-f="${k}" aria-pressed="false">${t}</button>`).join("");
    const run = () => {
      const raw = $("#recQ").value.trim(), q = nz(raw), act = !!(q || on.size);
      $("#recSections").hidden = act; $("#catNav").hidden = act; $("#recFound").hidden = !act; if (!act) return;
      const list = Object.values(R).filter((r) => !r.custom && [...on].every((k) => F.find((f) => f[0] === k)[2](r)) && (!q || q.split(/\s+/).every((w) => nz(r.name + " " + r.tags.join(" ") + " " + r.ing.map((i) => i.n).join(" ")).includes(w))));
      $("#recFound").innerHTML = list.length ? `<p class="muted small rec-count">${list.length === 1 ? "1 receta" : list.length + " recetas"}${raw ? ` con «${esc(raw)}»` : ""} · <button class="linkish" type="button" data-fclear>ver todas</button></p><div class="grid">${list.map(card).join("")}</div>`
        : `<div class="card empty"><p>Ninguna receta cumple todo eso a la vez.</p><button class="mini-btn" type="button" data-fclear>Limpiar la búsqueda</button></div>`;
      renderMoney();
    };
    $("#recF").addEventListener("click", (e) => { const b = e.target.closest("[data-f]"); if (!b) return; const k = b.dataset.f; if (on.has(k)) on.delete(k); else on.add(k); b.classList.toggle("on", on.has(k)); b.setAttribute("aria-pressed", String(on.has(k))); run(); });
    let tq; $("#recQ").addEventListener("input", () => { clearTimeout(tq); tq = setTimeout(run, 150); });
    document.addEventListener("click", (e) => { if (!e.target.closest("[data-fclear]")) return; on.clear(); $$("#recF .pchip").forEach((b) => { b.classList.remove("on"); b.setAttribute("aria-pressed", "false"); }); $("#recQ").value = ""; run(); });
  }

  // ---------- compras ----------
  // ---------- compras: origen de la lista (plan de la casa o mi calendario) y heladera ----------
  const FKEY = "heladera";  // la misma que «¿Qué hay en tu heladera?» de Recetas
  const fNorm = (x) => String(x).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\(.*?\)/g, " ").replace(/[,.]/g, " ").replace(/\s+/g, " ").trim();
  const fStop = new Set(["con", "de", "del", "la", "las", "los", "el", "para", "sin", "en", "y"]);
  const fWords = (x) => fNorm(x).split(" ").filter((w) => w.length >= 3 && !fStop.has(w));
  const fSame = (a, b) => a === b || a === b + "s" || a === b + "es" || b === a + "s" || b === a + "es";
  const fHas = (ing, entry) => { const iw = fWords(ing), tw = fWords(entry); return tw.length > 0 && tw.every((t) => iw.some((w) => fSame(w, t))); };
  const fGet = () => { try { return JSON.parse(localStorage.getItem(FKEY) || "[]"); } catch (e) { return []; } };
  const fAtGet = () => { try { return JSON.parse(localStorage.getItem("heladeraAt") || "{}"); } catch (e) { return {}; } };
  const fSet = (v) => { try { localStorage.setItem(FKEY, JSON.stringify(v)); const at = fAtGet(), now = Date.now(), keep = {}; v.forEach((h) => { const k = fNorm(h); keep[k] = at[k] || now; }); localStorage.setItem("heladeraAt", JSON.stringify(keep)); const ve = JSON.parse(localStorage.getItem("heladeraVence") || "{}"), vk = {}; v.forEach((h) => { const k = fNorm(h); if (ve[k]) vk[k] = ve[k]; }); localStorage.setItem("heladeraVence", JSON.stringify(vk)); } catch (e) {} window.notifResync?.(); };
  const fVGet = () => { try { return JSON.parse(localStorage.getItem("heladeraVence") || "{}"); } catch (e) { return {}; } };
  const fVSet = (v) => { try { localStorage.setItem("heladeraVence", JSON.stringify(v)); } catch (e) {} window.notifResync?.(); };
  const fVence = (h) => fVGet()[fNorm(h)] || null;
  const daysTo = (iso) => Math.round((new Date(iso + "T12:00") - new Date(todayISO + "T12:00")) / 864e5);
  const venceTxt = (d) => { const n = daysTo(d); return n < 0 ? "vencido" : n === 0 ? "vence hoy" : n === 1 ? "vence mañana" : `vence ${d.slice(8)}/${d.slice(5, 7)}`; };
  window.Heladera = window.Heladera || {};
  Object.assign(window.Heladera, {
    list: () => fGet(),
    add: (name, date) => { name = String(name || "").trim(); if (!name) return; const hel = fGet(); if (!hel.some((h) => fNorm(h) === fNorm(name))) { hel.push(name); fSet(hel); } if (date) { const ve = fVGet(); ve[fNorm(name)] = date; fVSet(ve); } },
    remove: (name) => fSet(fGet().filter((h) => fNorm(h) !== fNorm(name))),
  });
  const fAge = (h) => { const t = fAtGet()[fNorm(h)]; return t ? Math.floor((Date.now() - t) / 864e5) : null; };
  Object.assign(window.Heladera, { get: fGet, has: (name) => fGet().some((h) => fHas(name, h)), toggle: (name) => { const hel = fGet(); if (hel.some((h) => fHas(name, h))) fSet(hel.filter((h) => !fHas(name, h))); else fSet([...hel, name.replace(/\s*\(.*?\)\s*/g, " ").trim()]); } });
  const xKey = (mon) => `extras:${mon}`;  // productos que agrega cada uno a la lista de esa semana
  const xGet = (mon) => { try { return JSON.parse(localStorage.getItem(xKey(mon)) || "[]"); } catch (e) { return []; } };
  const xSet = (mon, v) => { try { if (v.length) localStorage.setItem(xKey(mon), JSON.stringify(v)); else localStorage.removeItem(xKey(mon)); } catch (e) {} };
  const inFridge = (name, hel) => hel.some((h) => fHas(name, h));
  const cleanName = (n) => n.replace(/\s*\(.*?\)\s*/g, " ").trim();
  const myLists = () => { try { return JSON.parse(localStorage.getItem("miListas") || "null"); } catch (e) { return null; } };
  state.src = new URLSearchParams(location.search).get("lista") === "mi" ? "mi" : (localStorage.getItem("shopSrc") || "casa");
  // tildes de la lista: en este dispositivo, o compartidos en tiempo real si la lista es compartida
  const shCtx = () => { const S = window.SH; if (!S || !S.uid) return null; if (state.src && state.src.startsWith("sh:")) { const o = state.src.slice(3); return S.others?.[o] ? { owner: o, data: S.others[o] } : null; } if (S.mine && Object.keys(S.mine.members || {}).some((u) => u !== S.uid)) return { owner: S.uid, data: S.mine }; return null; };
  const tkHash = (k) => { let h = 5381; for (let i = 0; i < k.length; i++) h = ((h << 5) + h + k.charCodeAt(i)) | 0; return (h >>> 0).toString(36); };
  const isDone = (k) => { const c = shCtx(); if (c) return !!c.data.ticks?.[k.split(":")[1]]?.[tkHash(k)]; return localStorage.getItem(k) === "1"; };
  const setDone = (k, v) => { const c = shCtx(); if (c) { window.SH.tick(c.owner, k.split(":")[1], tkHash(k), v); return; } if (v) localStorage.setItem(k, "1"); else localStorage.removeItem(k); };
  function renderShopping() {
    if (!$("#shopGrid")) return;
    renderWeekTabs("#shopTabs", renderShopping);
    const w = D.weeks.find((x) => x.start === state.week) || D.weeks[0], my = myLists();
    const shO = state.src && state.src.startsWith("sh:") ? window.SH?.others?.[state.src.slice(3)] : null;  // la lista que me compartieron
    const mine = !shO && state.src === "mi" && !!my, mw = mine ? my.weeks?.[w.start] : null;  // si cuenta.js todavía no trajo el calendario, se muestra el de la casa y se cambia solo cuando llega
    const extras = xGet(w.start);
    const full = shO ? (shO.weeks?.[w.start]?.list || []) : [...(mine ? (mw ? mw.list : []) : shoppingFor(w)), ...(extras.length ? [{ c: "otros", cat: "Otros (agregados por vos)", items: extras.map((x, k) => ({ n: x.n, q: x.q || "", extra: k })) }] : [])];
    // si comparto mi lista, la publico para que la vean y la tilden (solo si cambió)
    if (!shO && window.SH?.mine && Object.keys(window.SH.mine.members || {}).some((u) => u !== window.SH.uid)) window.SH.publish(w.start, { label: w.label, list: full });
    const hel = fGet();
    // origen de la lista: solo aparece si hay un calendario propio guardado en este dispositivo
    const srcBox = $("#shopSrc");
    const shOthers = Object.entries(window.SH?.others || {});
    if (srcBox) { srcBox.hidden = !my && !shOthers.length; srcBox.innerHTML = `<span class="muted small">Lista de</span><div class="seg"><button type="button" data-src="casa" class="${!mine && !shO ? "on" : ""}">Plan de la casa</button>${my ? `<button type="button" data-src="mi" class="${mine ? "on" : ""}">Mi calendario</button>` : ""}${shOthers.map(([o, x]) => `<button type="button" data-src="sh:${o}" class="${state.src === "sh:" + o ? "on" : ""}">${ic("users")} ${esc(x.name || "compartida")}</button>`).join("")}</div>${shCtx() ? `<span class="sh-live">${ic("users")} compartida</span>` : ""}`; }
    // lo que está en la heladera no se compra: fuera de la cuenta, del comparador y del texto copiado
    const list = full.map((c) => ({ ...c, items: c.items.filter((i) => !inFridge(i.n, hel)) })).filter((c) => c.items.length);
    const label = (shO ? `Lista de ${shO.name} · ` : mine ? "Mi calendario · " : "Lista de compras · ") + w.label;
    window.__shop = { label, start: w.start, list, src: state.src }; window.dispatchEvent(new Event("shoplist"));
    const n = list.reduce((a, c) => a + c.items.length, 0), nf = full.reduce((a, c) => a + c.items.length, 0) - n;
    const key = (c, nm) => `shop:${w.start}:${c}:${nm}`;
    const done = list.reduce((a, c) => a + c.items.filter((i) => isDone(key(c.cat, i.n))).length, 0);
    $("#shopSummary").innerHTML = `<div class="card ss"><div><b>${weekTag(w) ? weekTag(w) + " · " : ""}${esc(w.label)}</b><span class="muted">${HOG() > 1 ? ` · para ${HOG()}` : ""} · ${n} productos${nf ? ` · <span class="ss-fr">${ic("snow")} ${nf} en la heladera</span>` : ""} · ${done} tildados</span></div><div class="ss-actions"><a class="mini-btn" href="${mine ? "mi-plan.html" : `plan.html?semana=${w.start}`}">${ic("calendar")} ver esa semana</a><a class="mini-btn" href="supermercados.html">${ic("super")} dónde pedir</a><button class="mini-btn" id="copyList">${ic("copy")} Copiar lista</button><button class="mini-btn" id="dlList">${ic("external")} Bajar con enlaces</button>${navigator.share ? `<button class="mini-btn" id="shareList">${ic("external")} Compartir</button>` : ""}<button class="mini-btn" id="printList">${ic("printer")} Imprimir</button><button class="mini-btn" id="clearWeek">${ic("refresh")} destildar todo</button>${done ? `<button class="mini-btn ss-tofr" id="toFridge">${ic("snow")} Guardar lo tildado en la heladera</button>` : ""}</div></div>`;
    $("#toFridge")?.addEventListener("click", () => { const hel = fGet(); let k = 0; list.forEach((c) => c.items.forEach((i) => { if (isDone(key(c.cat, i.n))) { if (!inFridge(i.n, hel)) { hel.push(cleanName(i.n)); k++; } setDone(key(c.cat, i.n), false); } })); fSet(hel); renderShopping(); toastG(k === 1 ? "1 producto guardado en la heladera." : `${k} productos guardados en la heladera.`); });
    $("#printList")?.addEventListener("click", () => window.print());
    $("#clearWeek").addEventListener("click", () => { full.forEach((c) => c.items.forEach((i) => setDone(key(c.cat, i.n), false))); renderShopping(); });
    // texto plano de la lista (solo lo que falta comprar; si no hay nada tildado, todo) para pegar en Notas o WhatsApp
    const listText = () => {
      const anyDone = list.some((c) => c.items.some((i) => isDone(key(c.cat, i.n))));
      const lines = [label, ""];
      list.forEach((c) => {
        const items = c.items.filter((i) => !anyDone || !isDone(key(c.cat, i.n)));
        if (!items.length) return;
        lines.push(c.cat.toUpperCase());
        items.forEach((i) => lines.push("- " + i.n + " · " + i.q));
        lines.push("");
      });
      lines.push("Menuario · " + location.origin + location.pathname.replace(/[^/]*$/, "compras.html#semana-" + w.start));
      return { text: lines.join("\n"), partial: anyDone };
    };
    const toast = (msg) => { let t = $("#toast"); if (!t) { t = document.createElement("div"); t.id = "toast"; t.className = "toast"; document.body.appendChild(t); } t.textContent = msg; t.classList.add("show"); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove("show"), 2600); };
    const copyText = async (text) => {
      try { await navigator.clipboard.writeText(text); return true; }
      catch (e) { const ta = document.createElement("textarea"); ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0"; document.body.appendChild(ta); ta.select(); let ok = false; try { ok = document.execCommand("copy"); } catch (err) {} ta.remove(); return ok; }
    };
    $("#dlList").addEventListener("click", () => window.downloadListHtml(label, list, `lista-compras-${w.start}.html`));
    $("#copyList").addEventListener("click", async () => {
      const { text, partial } = listText();
      const ok = await copyText(text);
      toast(ok ? (partial ? "Lista copiada (solo lo que falta). Pegala en Notas o WhatsApp." : "Lista copiada. Pegala en Notas o WhatsApp.") : "No se pudo copiar: mantené apretado para seleccionar.");
    });
    $("#shareList")?.addEventListener("click", async () => {
      const { text } = listText();
      try { await navigator.share({ title: label, text }); } catch (e) { if (e && e.name !== "AbortError") { await copyText(text); toast("Lista copiada."); } }
    });
    $("#shopGrid").innerHTML = full.length ? full.map((cat) => `<div class="shop-cat"><h4>${esc(cat.cat)} <small>${cat.items.filter((i) => !inFridge(i.n, hel)).length}</small></h4>
      ${cat.items.map((i) => { const fz = inFridge(i.n, hel), dn = !fz && isDone(key(cat.cat, i.n));
        return `<div class="sh-row${fz ? " fz" : ""}"><label class="${dn ? "done" : ""}"><input type="checkbox" data-k="${esc(key(cat.cat, i.n))}" ${dn ? "checked" : ""}${fz ? " disabled" : ""}><span>${esc(i.n)}</span><em class="q">${esc(i.q)}</em></label>${i.extra != null ? `<button type="button" class="x-del" data-xdel="${i.extra}" aria-label="Sacar ${esc(i.n)} de la lista">×</button>` : ""}${fz ? `<button type="button" class="fz-btn" data-fz="${esc(i.n)}" aria-pressed="true" title="Está en tu heladera (tocá para sacarlo)" aria-label="Sacar ${esc(i.n)} de la heladera">${ic("snow")}</button>` : ""}</div>`; }).join("")}</div>`).join("")
      : shO ? `<div class="card shop-empty"><p><b>${esc(shO.name)} todavía no armó la lista de esa semana.</b></p><p class="muted small">Aparece acá apenas la abra en Compras.</p></div>` : `<div class="card shop-empty"><p><b>Tu calendario no tiene platos esa semana.</b></p><p class="muted small">Armala en <a href="mi-plan.html">Mi plan</a> o mirá la lista del plan de la casa.</p></div>`;
    $("#shopGrid").insertAdjacentHTML("beforeend", `<form class="card x-form" id="xForm"><label for="xQ"><b>¿Falta algo?</b> <span class="muted small">Sumalo a la lista de esta semana: se copia, se comparte y entra en el comparador.</span></label><div><input id="xQ" placeholder="Ej.: café, papel higiénico, detergente" autocomplete="off"><input id="xN" placeholder="Cantidad" autocomplete="off" aria-label="Cantidad (opcional)"><button class="btn" type="submit">Agregar</button></div></form>`);
    $("#pantryList").innerHTML = D.pantry.map((p) => `<li>${esc(p)}</li>`).join("");
    // la tarjeta de la heladera
    if ($("#frChips")) {
      const old = hel.filter((h) => (fAge(h) ?? 0) >= 14).length;
      $("#frChips").innerHTML = hel.length ? hel.map((h, k) => { const a = fAge(h), v = fVence(h), dv = v ? daysTo(v) : null; return `<button type="button" class="fr-chip${dv != null && dv <= 1 ? " soon" : a != null && a >= 14 ? " old" : ""}" data-fredit="${k}" aria-label="${esc(h)}: cambiar el vencimiento o sacarlo"${a != null ? ` title="Guardado hace ${a} ${a === 1 ? "día" : "días"}"` : ""}>${ic("snow")}${esc(h)}${v ? `<small>${venceTxt(v)}</small>` : a != null && a >= 2 ? `<small>${a} d</small>` : ""}</button>`; }).join("") + (old ? `<button type="button" class="mini-btn" data-frold>Sacar lo de hace +2 semanas (${old})</button>` : "") + `<button type="button" class="mini-btn fr-clear" data-frclear>Vaciar</button>` : `<p class="muted small fr-empty">Vacía. Tocá el ${ic("snow")} de lo que ya tenés.</p>`;
      $("#frList").innerHTML = [...new Set(full.flatMap((c) => c.items.map((i) => cleanName(i.n))))].sort().map((x) => `<option value="${esc(x)}">`).join("");
    }
  }
  if (page === "compras") {
    const h = location.hash.match(/semana-(\d{4}-\d{2}-\d{2})/); const base = mondayOf(todayISO);
    state.week = h ? mondayOf(h[1]) : base;
    D.weeks = [-1, 0, 1, 2, 3].map((i) => weekAt(addDays(base, i * 7)));
    if (!D.weeks.some((w) => w.start === state.week)) { D.weeks.push(weekAt(state.week)); D.weeks.sort((a, b) => a.start.localeCompare(b.start)); }
    renderShopping();
    window.addEventListener("milistas", () => renderShopping());  // cuenta.js trajo (o borró) el calendario propio
    window.addEventListener("shared", () => renderShopping());  // la lista compartida cambió (tildes de otros, miembros)
    const reweeks = () => { D.weeks = [-1, 0, 1, 2, 3].map((i) => weekAt(addDays(base, i * 7))); if (!D.weeks.some((w) => w.start === state.week)) { D.weeks.push(weekAt(state.week)); D.weeks.sort((a, b) => a.start.localeCompare(b.start)); } renderShopping(); };
    window.addEventListener("plan-swap", reweeks); window.addEventListener("hogar", reweeks);
    if ($("#shopHog")) $("#shopHog").innerHTML = hogHTML();
    // cuenta.js (y el SDK de Firebase) solo si hay una cuenta abierta en este dispositivo: sin cuenta, Compras no baja nada de más
    if (localStorage.getItem("acct") === "1") import("./cuenta.min.js").catch(() => {});
    $("#shopSrc")?.addEventListener("click", (e) => { const b = e.target.closest("[data-src]"); if (!b) return; state.src = b.dataset.src; try { localStorage.setItem("shopSrc", state.src); } catch (x) {} renderShopping(); });
    $("#shopGrid").addEventListener("click", (e) => {
      const b = e.target.closest("[data-fz]"); if (!b) return; e.preventDefault();
      const name = b.dataset.fz, hel = fGet();
      if (inFridge(name, hel)) fSet(hel.filter((h) => !fHas(name, h))); else fSet([...hel, cleanName(name)]);
      renderShopping();
    });
    $("#shopGrid").addEventListener("click", (e) => { const x = e.target.closest("[data-xdel]"); if (!x) return; e.preventDefault(); const mon = state.week, v = xGet(mon); v.splice(+x.dataset.xdel, 1); xSet(mon, v); renderShopping(); });
    $("#shopGrid").addEventListener("submit", (e) => { if (e.target.id !== "xForm") return; e.preventDefault(); const n = $("#xQ").value.trim(), q = $("#xN").value.trim(); if (!n) return; const mon = state.week, v = xGet(mon); n.split(/[,;]/).map((x) => x.trim()).filter(Boolean).forEach((nm) => { if (!v.some((x) => fNorm(x.n) === fNorm(nm))) v.push({ n: nm, q }); }); xSet(mon, v); renderShopping(); setTimeout(() => $("#xQ")?.focus(), 0); });
    $("#fridge")?.addEventListener("click", (e) => {
      if (e.target.closest("[data-frold]")) { fSet(fGet().filter((h) => (fAge(h) ?? 0) < 14)); renderShopping(); return; }
      const ed = e.target.closest("[data-fredit]");
      if (ed) {
        const hel = fGet(), name = hel[+ed.dataset.fredit]; if (!name) return;
        let sh = $("#frSheet"); if (!sh) { sh = document.createElement("div"); sh.id = "frSheet"; sh.className = "share-sheet app-sheet"; document.body.appendChild(sh); }
        const v = fVence(name), a = fAge(name);
        sh.innerHTML = `<div class="sh-bg" data-shx></div><div class="sh-box as-box" role="dialog" aria-modal="true" aria-labelledby="frT"><button class="as-x" type="button" data-shx aria-label="Cerrar">×</button>
          <h3 id="frT">${ic("snow")} ${esc(name)}</h3><p class="muted small">${a != null ? `En la heladera hace ${a} ${a === 1 ? "día" : "días"}.` : "En tu heladera."} ${v ? esc(venceTxt(v)[0].toUpperCase() + venceTxt(v).slice(1)) + "." : ""}</p>
          <label class="fr-edit"><span>Vence el</span><input type="date" id="frEd" value="${v || ""}"></label>
          <div class="as-act"><button type="button" class="mini-btn" data-frout>Ya no lo tengo</button><button type="button" class="btn" data-frsave>Guardar</button></div></div>`;
        sh.hidden = false; document.body.classList.add("no-scroll");
        const close = () => { sh.hidden = true; document.body.classList.remove("no-scroll"); };
        sh.onclick = (ev) => {
          if (ev.target.closest("[data-shx]")) return close();
          if (ev.target.closest("[data-frout]")) { fSet(fGet().filter((h) => fNorm(h) !== fNorm(name))); close(); renderShopping(); return; }
          if (ev.target.closest("[data-frsave]")) { const ve = fVGet(), d = $("#frEd").value; if (d) ve[fNorm(name)] = d; else delete ve[fNorm(name)]; fVSet(ve); close(); renderShopping(); }
        };
        return;
      }
      const d = e.target.closest("[data-frdel]"), c = e.target.closest("[data-frclear]");
      if (d) { const hel = fGet(); hel.splice(+d.dataset.frdel, 1); fSet(hel); renderShopping(); }
      if (c) { fSet([]); renderShopping(); }
    });
    $("#frForm")?.addEventListener("submit", (e) => { e.preventDefault(); const hel = fGet(), dv = $("#frD")?.value, names = String($("#frQ").value).split(/[,;]/).map((x) => x.trim()).filter(Boolean); names.forEach((v) => { if (!hel.some((h) => fNorm(h) === fNorm(v))) hel.push(v); }); fSet(hel); if (dv) { const ve = fVGet(); names.forEach((v) => { ve[fNorm(v)] = dv; }); fVSet(ve); } $("#frQ").value = ""; if ($("#frD")) $("#frD").value = ""; renderShopping(); });
    $("#shopGrid").addEventListener("change", (e) => {
      const cb = e.target; if (cb.type !== "checkbox") return;
      setDone(cb.dataset.k, cb.checked); cb.closest("label").classList.toggle("done", cb.checked);
      const s = $("#shopSummary .muted"); if (s) { const w = D.weeks.find((x) => x.start === state.week); const list = window.__shop?.list || shoppingFor(w); const key = (c, nm) => `shop:${w.start}:${c}:${nm}`; const done = list.reduce((a, c) => a + c.items.filter((i) => isDone(key(c.cat, i.n))).length, 0); s.textContent = s.textContent.replace(/\d+ tildados/, done + " tildados"); }
    });
  }

  // ---------- supermercados ----------
  if (page === "supermercados") {
    const B = D.basket, names = Object.keys(B.sites);
    const totals = names.map((s) => ({ s, t: B.totals[s] })).sort((a, b) => a.t - b.t);
    const max = totals[totals.length - 1].t, min = totals[0].t;
    $("#ranking").innerHTML = `<h3>Mismo changuito semanal, siete cadenas</h3><p class="muted small">Sin contar el envío. Entre la más barata y la más cara hay <b data-ars="${max - min}"></b> de diferencia (${Math.round((max / min - 1) * 100)} %).</p>
      ${totals.map((x, i) => `<div class="rank-row${i === 0 ? " best" : ""}"><span class="n">${i + 1}. ${esc(x.s)}</span><div class="bar"><i style="width:${Math.round(x.t / max * 100)}%"></i></div><span class="v"><span data-ars="${x.t}"></span><small>${i === 0 ? "la más barata" : "+" + Math.round((x.t / min - 1) * 100) + " %"}</small></span></div>`).join("")}`;
    const byName = Object.fromEntries(D.stores.map((s) => [s.name.replace(" Digital", ""), s]));
    const cheapest = totals[0].s, second = totals[1].s;
    $("#verdict").innerHTML = `<h3>En pocas palabras</h3>
      <ul class="v-list">
        <li><b>Compra grande del mes:</b> ${esc(cheapest)}. Es la más barata del changuito y, como el envío se paga una sola vez, conviene concentrar ahí lo pesado (aceite, arroz, yerba, carne para congelar).</li>
        <li><b>Reposición de la semana:</b> Día (mínimo bajo, $ 12.000, y marca propia barata) o el Disco / Coto que tengas a dos cuadras, para frescos y verdura.</li>
        <li><b>Si pedís seguido en Jumbo o Disco:</b> Jumbo Prime ($ 5.500/mes) se paga solo con dos pedidos de más de $ 60.000, porque cada envío sale $ 3.999.</li>
        <li><b>Coto</b> pide $ 30.000 de mínimo para enviar: sirve para la compra grande, no para reponer. ${esc(second)} es la segunda opción en precio.</li>
        <li><b>Frescos:</b> verdura, fruta y carne salen más baratos y mejores en la verdulería y la carnicería del barrio que en cualquier súper online.</li>
      </ul>`;
    const pos = Object.fromEntries(totals.map((x, i) => [x.s, i + 1]));
    const nameMap = { carrefour: "Carrefour", dia: "Día", jumbo: "Jumbo", disco: "Disco", vea: "Vea", coto: "Coto", changomas: "ChangoMás" };
    const GROUPS = [
      { t: "Hipermercados: para la compra grande", d: "Mucho surtido y precios bajos en almacén; el envío conviene cuando el pedido es grande.", ids: ["carrefour", "coto", "jumbo", "changomas"] },
      { t: "Súper de barrio: para reponer en la semana", d: "Mínimos más bajos, sucursal cerca, entrega rápida. Ideales para frescos y lo que falta.", ids: ["dia", "disco", "vea"] },
    ];
    const storeCard = (s) => { const p = pos[nameMap[s.id]]; return `<article class="store"><header><h4>${esc(s.name)} ${p ? `<span class="pos">#${p} en precio</span>` : ""}</h4><a href="${s.url}" target="_blank" rel="noopener">ir al sitio ↗</a></header>
      <dl><div><dt>Costo de envío</dt><dd>${esc(s.envio)}</dd></div><div><dt>Compra mínima</dt><dd>${esc(s.minimo)}</dd></div><div><dt>Envío gratis</dt><dd>${esc(s.gratis)}</dd></div><div><dt>Plazo</dt><dd>${esc(s.plazo)}</dd></div><div><dt>Cobertura</dt><dd>${esc(s.cobertura)}</dd></div></dl>
      <p class="nota">${esc(s.nota)} <a class="small" href="${s.fuente}" target="_blank" rel="noopener">fuente</a></p></article>`; };
    $("#storeGroups").innerHTML = GROUPS.map((g) => `<div class="sgroup"><h3>${esc(g.t)}</h3><p class="muted small">${esc(g.d)}</p><div class="stores">${g.ids.map((id) => storeCard(D.stores.find((s) => s.id === id))).join("")}</div></div>`).join("");
    $("#apps").innerHTML = D.apps.map((a) => `<article class="app"><h4><a href="${a.url}" target="_blank" rel="noopener">${esc(a.name)} ↗</a></h4><p>${esc(a.desc)}</p></article>`).join("");

    const PCATS = [
      { t: "Verdulería", ids: ["calabaza", "tomate", "banana", "acelga"] },
      { t: "Carnicería y pescadería", ids: ["pollo", "picada", "nalga", "merluza"] },
      { t: "Lácteos y huevos", ids: ["leche", "huevos", "yogur", "untable"] },
      { t: "Almacén", ids: ["arroz", "lentejas", "avena", "pan", "girasol", "oliva", "atun", "yerba"] },
    ];
    const cols = totals.map((x) => x.s), prod = Object.fromEntries(B.products.map((p) => [p.id, p]));
    let html = `<thead><tr><th>Producto<br><span class="thsub">cantidad semanal · unidad de precio</span></th>${cols.map((c) => `<th>${esc(c)}</th>`).join("")}</tr></thead><tbody>`;
    PCATS.forEach((g) => {
      html += `<tr class="grp"><td colspan="${cols.length + 1}">${esc(g.t)}</td></tr>`;
      g.ids.forEach((id) => {
        const p = prod[id], row = cols.map((c) => B.sites[c][id]); const best = Math.min(...row.map((x) => x.unitprice));
        html += `<tr><td>${esc(p.label)}<small>${esc(p.qtylabel)} · ${esc((row.find((x) => !x.estimated) || row[0]).ulab)}</small></td>` + row.map((x) => {
          const inner = `<span data-ars="${x.unitprice}"></span>${x.estimated ? '<span class="est">*</span>' : ""}`;
          const title = esc(x.name) + (x.raw ? ` — precio publicado: $ ${Math.round(x.raw).toLocaleString("es-AR")} ${x.rawunit === "kg" ? "por kg" : "por unidad"}` : "");
          return `<td class="${x.unitprice === best ? "best" : ""}" title="${title}">${x.link ? `<a href="${x.link}" target="_blank" rel="noopener">${inner}</a>` : inner}</td>`; }).join("") + "</tr>";
      });
    });
    html += `</tbody><tfoot><tr><td>Total changuito semanal</td>${cols.map((c, i) => `<td class="${i === 0 ? "best" : ""}"><span data-ars="${B.totals[c]}"></span></td>`).join("")}</tr></tfoot>`;
    $("#basketTable").innerHTML = html;
    $("#sources").innerHTML = D.sources.map((s) => `<li>${s.u ? `<a href="${s.u}" target="_blank" rel="noopener">${esc(s.t)}</a>` : esc(s.t)}</li>`).join("");
  }

  // ---------- sugerencias de platos (botón flotante) ----------
  const CFG = window.CONFIG || {};
  const SUG_TO = CFG.adminEmail || "jaemeson.dieu@gmail.com";
  // notify(): manda un evento al Apps Script (si está configurado) que reenvía todo por correo al admin
  window.notifyAdmin = async (payload) => {
    if (!CFG.notifyUrl) return false;
    if (/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname)) { console.info("[aviso no enviado en local]", payload.type); return true; }  // pruebas locales: no mandar correos
    try { await fetch(CFG.notifyUrl, { method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(Object.assign({ at: new Date().toISOString(), page: location.href }, payload)) }); return true; }
    catch (e) { return false; }
  };
  const fab = $("#sugFab"), panel = $("#sugPanel");
  if (fab && panel) {
    const fields = ["sugNombre", "sugLink", "sugIng", "sugTips", "sugDe"];
    const v = (id) => ($("#" + id).value || "").trim();
    const toggle = (open) => { panel.hidden = !open; fab.classList.toggle("open", open); fab.setAttribute("aria-expanded", open); if (open) $("#sugNombre").focus(); };
    fab.addEventListener("click", () => toggle(panel.hidden));
    $("#moreSug")?.addEventListener("click", () => { const mm = $("#moreMenu"); if (mm) mm.hidden = true; toggle(true); });
    $("#sugClose").addEventListener("click", () => toggle(false));
    fields.forEach((id) => { const el = $("#" + id); el.value = localStorage.getItem("sug:" + id) || ""; el.addEventListener("input", () => localStorage.setItem("sug:" + id, el.value)); });
    const body = () => `Plato: ${v("sugNombre")}\nReceta (link): ${v("sugLink") || "-"}\n\nIngredientes:\n${v("sugIng") || "-"}\n\nTips:\n${v("sugTips") || "-"}\n\nDe: ${v("sugDe") || "-"}\n\n(enviado desde ${location.href})`;
    $("#sugForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const sent = await window.notifyAdmin({ type: "sugerencia", title: v("sugNombre"), plato: v("sugNombre"), link: v("sugLink"), ingredientes: v("sugIng"), tips: v("sugTips"), de: v("sugDe") });
      if (sent) {
        $("#sugOk").textContent = "¡Gracias! La sugerencia ya le llegó a Jaemeson. Podés mandar otra cuando quieras.";
        fields.forEach((id) => { $("#" + id).value = ""; localStorage.removeItem("sug:" + id); });
      } else {
        location.href = `mailto:${SUG_TO}?subject=${encodeURIComponent("Sugerencia de plato: " + v("sugNombre"))}&body=${encodeURIComponent(body())}`;
      }
      $("#sugOk").hidden = false;
    });
    $("#sugCopy").addEventListener("click", async () => {
      const b = $("#sugCopy"), t = b.textContent;
      try { await navigator.clipboard.writeText(body()); b.textContent = "¡Copiado!"; } catch (err) { b.textContent = "No se pudo copiar"; }
      setTimeout(() => { b.textContent = t; }, 1600);
    });
  }

  // ---------- enlaces a tiendas, descarga de la lista con links, buscador en vivo ----------
  const STORE_SEARCH = { Carrefour: (q) => `https://www.carrefour.com.ar/${encodeURIComponent(q)}?_q=${encodeURIComponent(q)}&map=ft`, "Día": (q) => `https://diaonline.supermercadosdia.com.ar/${encodeURIComponent(q)}?_q=${encodeURIComponent(q)}&map=ft`,
    Jumbo: (q) => `https://www.jumbo.com.ar/${encodeURIComponent(q)}?_q=${encodeURIComponent(q)}&map=ft`, Disco: (q) => `https://www.disco.com.ar/${encodeURIComponent(q)}?_q=${encodeURIComponent(q)}&map=ft`, Vea: (q) => `https://www.vea.com.ar/${encodeURIComponent(q)}?_q=${encodeURIComponent(q)}&map=ft`,
    "ChangoMás": (q) => `https://www.masonline.com.ar/${encodeURIComponent(q)}?_q=${encodeURIComponent(q)}&map=ft`, Coto: (q) => `https://www.cotodigital.com.ar/sitios/cdigi/browse?Ntt=${encodeURIComponent(q)}` };
  const ING2PROD = [[/leche/, "leche"], [/huevo/, "huevos"], [/pollo|suprema|pechuga/, "pollo"], [/picada/, "picada"], [/nalga|bife/, "nalga"], [/merluza/, "merluza"], [/^arroz/, "arroz"], [/lenteja/, "lentejas"], [/avena/, "avena"], [/pan integral|pan lactal/, "pan"], [/yogur/, "yogur"], [/untable/, "untable"], [/girasol|^aceite$/, "girasol"], [/oliva/, "oliva"], [/zapallo|calabaza/, "calabaza"], [/^tomate$|tomate redondo/, "tomate"], [/banana/, "banana"], [/acelga/, "acelga"], [/at[uú]n/, "atun"], [/yerba/, "yerba"]];
  const B0 = D.basket, STORES = Object.keys(B0.sites), cheapestStore = Object.entries(B0.totals).sort((x, y) => x[1] - y[1])[0][0];
  function cheapestFor(name) {
    const n = name.toLowerCase().replace(/\(.*?\)/g, "").trim();
    const hit = ING2PROD.find(([re]) => re.test(n));
    if (hit) {
      const pid = hit[1]; const cands = STORES.map((s) => ({ s, x: B0.sites[s][pid] })).filter((c) => c.x && !c.x.estimated && c.x.link).sort((p, q) => p.x.unitprice - q.x.unitprice);
      if (cands.length) return { store: cands[0].s, link: cands[0].x.link, price: cands[0].x.unitprice, ulab: cands[0].x.ulab, product: cands[0].x.name, exact: true };
    }
    return { store: cheapestStore, link: STORE_SEARCH[cheapestStore](name.replace(/\(.*?\)/g, "").trim()), exact: false };
  }
  window.buildListHtml = (title, list) => {
    const rows = list.map((c) => `<h2>${esc(c.cat)}</h2><ul>${c.items.map((i) => { const h = cheapestFor(i.n); return `<li><a href="${h.link}" target="_blank" rel="noopener">${esc(i.n)}</a> <b>${esc(i.q)}</b> <small>· ${h.exact ? `${esc(h.store)} · $ ${Math.round(h.price).toLocaleString("es-AR")} ${esc(h.ulab)} · ${esc(h.product)}` : `buscar en ${esc(h.store)}`}</small></li>`; }).join("")}</ul>`).join("");
    return `<!DOCTYPE html><html lang="es-AR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><style>body{font-family:system-ui,sans-serif;max-width:720px;margin:1.5rem auto;padding:0 1rem;color:#1F2D2A;background:#FBF7F0}h1{font-size:1.5rem}h2{font-size:.85rem;text-transform:uppercase;letter-spacing:.08em;color:#2F8F5B;margin:1.4rem 0 .4rem;border-bottom:1px dashed #E2D8C6;padding-bottom:.2rem}ul{list-style:none;padding:0;margin:0}li{padding:.4rem 0;border-bottom:1px solid #EFE7D8}a{color:#1F2D2A;font-weight:600}small{color:#6B7772;display:block}b{color:#2F8F5B}p.note{font-size:.8rem;color:#6B7772;margin-top:1.5rem}</style></head><body><h1>${esc(title)}</h1><p>Cada ingrediente lleva al producto más barato de las siete cadenas según los precios del ${esc(B0.date.split("-").reverse().join("/"))} (o a la búsqueda en ${esc(cheapestStore)}, la cadena más barata del changuito). Tocá el nombre para abrirlo.</p>${rows}<p class="note">Generado por Menuario · jaemeson-ra.github.io/plan-comidas-bsas · los precios cambian seguido: verificá en el carrito.</p></body></html>`;
  };
  window.downloadListHtml = (title, list, filename) => { const blob = new Blob([window.buildListHtml(title, list)], { type: "text/html;charset=utf-8" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = filename; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); };

  if (page === "supermercados" && $("#buscarForm")) {
    const res = $("#buscarRes");
    $("#buscarForm").addEventListener("submit", async (e) => {
      e.preventDefault(); const q = $("#buscarQ").value.trim(); if (q.length < 2) return;
      if (!CFG.priceApi) { res.innerHTML = `<p class="muted">El buscador en vivo todavía no está activado (falta la URL del proxy de precios en config.js). Mientras tanto, abrí la búsqueda en cada cadena: ${Object.keys(STORE_SEARCH).map((s) => `<a href="${STORE_SEARCH[s](q)}" target="_blank" rel="noopener">${esc(s)}</a>`).join(" · ")}.</p>`; return; }
      res.innerHTML = `<p class="muted">Buscando «${esc(q)}» en las siete cadenas…</p>`;
      try {
        const j = await (await fetch(`${CFG.priceApi.replace(/\/$/, "")}/search?q=${encodeURIComponent(q)}`)).json();
        const normS = (s) => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
        const qn = normS(q).split(/\s+/).map((w) => w.replace(/[,.]/g, "")).filter((w) => w.length > 2 && !/^\d+$/.test(w));
        // cada palabra de la búsqueda tiene que estar en el nombre del producto (saca "barra proteica" cuando buscás "aceite de girasol")
        const rows = (j.results || []).filter((r) => { const n = normS(r.name); return qn.every((w) => n.includes(w) || n.includes(w.replace(/s$/, ""))); }).sort((a, b) => a.price - b.price);
        window.__lastRows = rows; window.__lastQ = q; const tracked = new Set(getAlerts().map((a) => a.link));
        const byStore = {}; rows.forEach((r) => { (byStore[r.store] = byStore[r.store] || []).push(r); });
        const bsItem = (r) => `<div class="bs-item"><a class="bs-row" href="${r.link}" target="_blank" rel="noopener">${r.img ? `<img src="${r.img}" alt="" loading="lazy">` : ""}<span>${esc(r.name)}</span><b data-ars="${r.price}"></b>${r.unit === "kg" ? (r.mult && Math.abs(r.mult - 1) > 0.01 ? `<small>${Math.round(r.mult * 1000)} g</small>` : "<small>/kg</small>") : ""}</a><button class="bell${tracked.has(r.link) ? " on" : ""}" type="button" data-track="${rows.indexOf(r)}" aria-label="Avisarme si baja" title="Avisarme si baja">${ic("bell")}</button></div>`;
        const best = rows[0];
        res.innerHTML = rows.length ? `<p class="small">${rows.length} resultados · el más barato: <b>${esc(best.name)}</b> en <b>${esc(best.store)}</b> a <b data-ars="${best.price}"></b>${best.unit === "kg" ? " por kg" : ""} · <a href="${best.link}" target="_blank" rel="noopener">comprar ↗</a></p>
          <div class="buscar-grid">${Object.entries(byStore).sort((a, b) => a[1][0].price - b[1][0].price).map(([s, list]) => `<div class="card bs"><h4>${esc(s)} <small>${list.length}</small></h4>${list.slice(0, 3).map(bsItem).join("")}${list.length > 3 ? `<details class="bs-more"><summary>ver ${Math.min(list.length, 8) - 3} más</summary>${list.slice(3, 8).map(bsItem).join("")}</details>` : ""}</div>`).join("")}</div>
          <p class="muted small">Precios leídos recién de los catálogos online (${new Date(j.at).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}). Las cadenas que no aparecen no tienen ese producto o no respondieron.</p>` : `<p class="muted">Nada con ese nombre en ninguna cadena. Probá con menos palabras (ej. «yerba» en vez de «yerba mate con palo 1 kg»).</p>`;
        renderMoney();
      } catch (err) { res.innerHTML = `<p class="muted">No se pudo consultar el proxy de precios. Abrí la búsqueda en cada cadena: ${Object.keys(STORE_SEARCH).map((s) => `<a href="${STORE_SEARCH[s](q)}" target="_blank" rel="noopener">${esc(s)}</a>`).join(" · ")}.</p>`; }
    });
  }

  // ---------- menú "Más" (móvil) ----------
  const moreBtn = $("#moreBtn"), moreMenu = $("#moreMenu");
  if (moreBtn && moreMenu) {
    if (["compras", "supermercados", "promos", "temporada", "nutricion"].includes(page)) moreBtn.classList.add("on");
    moreBtn.addEventListener("click", (e) => { e.stopPropagation(); moreMenu.hidden = !moreMenu.hidden; moreBtn.setAttribute("aria-expanded", !moreMenu.hidden); });
    document.addEventListener("click", (e) => { if (!moreMenu.hidden && !e.target.closest("#moreMenu")) moreMenu.hidden = true; });
  }

  // ---------- productos de estación ----------
  if (page === "temporada" && D.temporada) {
    const nowM = new Date().getMonth() + 1;
    const order = [...D.temporada].sort((a, b) => ((a.m - nowM + 12) % 12) - ((b.m - nowM + 12) % 12));
    const normS = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    const stem = (p) => normS(p).replace(/\s*\(.*\)\s*/g, "").split(" ")[0].replace(/s$/, "");
    const matches = (mes) => { const stems = [...mes.f, ...mes.v].map(stem).filter((x) => x.length > 3); return Object.values(R).filter((r) => r.ing.some((i) => stems.some((st) => normS(i.n).includes(st)))).slice(0, 8); };
    $("#mesNav").innerHTML = order.map((m) => `<a href="#mes-${m.m}">${m.n}${m.m === nowM ? " <small>ahora</small>" : ""}</a>`).join("");
    $("#meses").innerHTML = order.map((m) => { const pl = matches(m); return `<details class="card mes" id="mes-${m.m}" ${m.m === nowM ? "open" : ""}><summary><h2>${m.n}</h2>${m.m === nowM ? '<span class="now">este mes</span>' : ""}<span class="cnt">${m.f.length} frutas · ${m.v.length} verduras</span></summary>
      <div class="cols"><div><h4>Frutas</h4>${m.f.map((p) => `<span class="prod f">${esc(p)}</span>`).join("")}</div><div><h4>Verduras</h4>${m.v.map((p) => `<span class="prod v">${esc(p)}</span>`).join("")}</div></div>
      <div class="tip">${ic("leaf")} ${esc(m.tip)}</div>
      ${pl.length ? `<div class="platos"><h4>Platos del plan que los aprovechan</h4><div class="grid mini">${pl.map((r) => `<button class="rc" data-rec="${r.id}"><img src="${r.img}"${srcs(r)} alt="" loading="lazy"><div class="b"><h4>${esc(r.name)}</h4></div></button>`).join("")}</div></div>` : ""}
    </details>`; }).join("");
  }


  // ---------- app instalable (PWA), sin conexión y recordatorio diario ----------
  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) navigator.serviceWorker.register("sw.js").catch(() => {});
  const standalone = matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isAndroid = /android/i.test(navigator.userAgent);
  // un solo botón «Instalar la app» en todo el sitio; dentro de la app (TWA de Android o instalada) no aparece
  const inApp = standalone || /^android-app:/.test(document.referrer) || /[?&]app=1/.test(location.search) || sessionStorage.getItem("inApp") === "1";
  if (inApp) { try { sessionStorage.setItem("inApp", "1"); } catch (e) {} }
  let installEvt = null;
  const showInstall = (on) => $$(".install-btn").forEach((b) => { b.hidden = !on; });
  showInstall(!inApp && page !== "app");
  window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); installEvt = e; });
  window.addEventListener("appinstalled", () => { installEvt = null; showInstall(false); toastG("¡Listo! La app quedó en tu pantalla de inicio."); });
  if (page === "app") {
    if (isAndroid) $("#appAndroid")?.classList.add("hl"); else if (isIOS) $("#appIos")?.classList.add("hl");
    fetch("descargas/menuario.apk", { method: "HEAD" }).then((r) => { const n = +r.headers.get("content-length"); if (r.ok && n) $("#apkSize").textContent = "· " + (n / 1048576).toLocaleString("es-AR", { maximumFractionDigits: 1 }) + " MB"; }).catch(() => {});
  }
  const APK = "descargas/menuario.apk";
  const dlApk = () => { const a = document.createElement("a"); a.href = APK; a.download = "menuario.apk"; document.body.appendChild(a); a.click(); a.remove(); };
  // Android: lo primero es la instalación del navegador (Chrome arma una app firmada por Google: sin avisos de «fuente desconocida»).
  // Si el navegador no la ofrece, se explica cómo hacerlo desde su menú, y el APK queda como respaldo.
  async function getApp(mode) {
    $("#moreMenu") && ($("#moreMenu").hidden = true);
    if (mode !== "apk" && installEvt && !isIOS) {
      installEvt.prompt(); const r = await installEvt.userChoice.catch(() => null); installEvt = null;
      if (r?.outcome === "accepted") { showInstall(false); toastG("¡Listo! Menuario se está instalando: en unos segundos aparece en tu pantalla de inicio."); return; }
    }
    if (mode === "apk") dlApk();
    let sh = $("#appSheet");
    if (!sh) { sh = document.createElement("div"); sh.id = "appSheet"; sh.className = "share-sheet app-sheet"; document.body.appendChild(sh); }
    const steps = (l) => `<ol class="as-steps">${l.map((t, i) => `<li><span>${i + 1}</span><p>${t}</p></li>`).join("")}</ol>`;
    const desk = !isIOS && !isAndroid;
    const chrome = /Chrome\//.test(navigator.userAgent) && !/EdgA|SamsungBrowser|OPR|Firefox|FxiOS/.test(navigator.userAgent);
    const apkLink = `<div class="as-alt"><p class="muted small">¿No te aparece la opción o usás otro navegador?</p><button type="button" class="mini-btn" data-get-apk>${ic("download")} Bajar el APK (1,2 MB)</button></div>`;
    sh.innerHTML = `<div class="sh-bg" data-shx></div><div class="sh-box as-box" role="dialog" aria-modal="true" aria-labelledby="asT">
      <button class="as-x" type="button" data-shx aria-label="Cerrar">×</button>
      <span class="as-ico"><img src="img/icons/icon-192.png" alt="" width="64" height="64"></span>
      ${isIOS ? `<h3 id="asT">Agregá Menuario a tu inicio</h3><p class="muted small">En iPhone no hace falta bajar nada: queda como una app desde Safari.</p>
        ${steps(["Abrí esta página en <b>Safari</b>.", "Tocá <b>Compartir</b>, el cuadrado con la flecha para arriba.", "Elegí <b>«Agregar a inicio»</b> y después <b>Agregar</b>."])}`
      : mode === "apk" ? `<h3 id="asT">Se está bajando Menuario</h3><p class="muted small">Pesa poco más de 1 MB. Cuando termine:</p>
        ${steps(["Abrí <b>menuario.apk</b> desde la notificación o desde Descargas.", "Si te pide permiso para «instalar apps desconocidas», dáselo al navegador.", "Tocá <b>Instalar</b>. El ícono aparece en tu pantalla de inicio."])}`
      : desk ? `<h3 id="asT">Menuario va en tu teléfono</h3><p class="muted small">Escaneá el código con la cámara del teléfono: abre esta página ahí y la instalás en un toque.</p>
        <img class="as-qr" src="img/qr-app.svg" width="150" height="150" alt="Código QR para abrir la página en el teléfono">
        ${installEvt ? `<button class="btn ghost as-pwa" type="button" data-pwa>Instalarla también en esta compu</button>` : ""}`
      : `<h3 id="asT">Instalala desde ${chrome ? "Chrome" : "el navegador"}</h3><p class="muted small">Así queda como una app más, sin avisos de seguridad ni archivos para bajar.</p>
        ${steps([chrome ? "Tocá los <b>tres puntitos ⋮</b> arriba a la derecha." : "Abrí esta página en <b>Chrome</b> y tocá los <b>tres puntitos ⋮</b> arriba a la derecha.", "Elegí <b>«Instalar app»</b> (o <b>«Agregar a la pantalla principal»</b>).", "Confirmá con <b>Instalar</b>: el ícono de Menuario aparece en tu inicio."])}
        ${apkLink}`}
      <div class="as-act">${mode === "apk" ? `<a class="mini-btn" href="${APK}" download="menuario.apk">${ic("download")} Bajar de nuevo</a>` : desk ? `<a class="mini-btn" href="${APK}" download="menuario.apk">${ic("download")} APK para Android</a>` : ""}<button class="btn" type="button" data-shx>Listo</button></div>
    </div>`;
    sh.hidden = false; document.body.classList.add("no-scroll");
    const close = () => { sh.hidden = true; document.body.classList.remove("no-scroll"); };
    sh.onclick = async (e) => {
      if (e.target.closest("[data-shx]")) return close();
      if (e.target.closest("[data-get-apk]")) { close(); return getApp("apk"); }
      if (e.target.closest("[data-pwa]") && installEvt) { installEvt.prompt(); const r = await installEvt.userChoice.catch(() => null); installEvt = null; if (r?.outcome === "accepted") { showInstall(false); close(); } }
    };
    sh.onkeydown = (e) => { if (e.key === "Escape") close(); };
    sh.querySelector(".as-x").focus();
  }
  document.addEventListener("click", (e) => { const t = e.target.closest(".install-btn, [data-get-app], [data-get-apk]"); if (!t || !t.isConnected || t.closest(".share-sheet")) return; e.preventDefault(); getApp(t.matches("[data-get-apk]") ? "apk" : ""); });
  const net = () => {
    let p = $("#netPill"); if (navigator.onLine) { if (p) { p.classList.add("back"); setTimeout(() => p.remove(), 1200); } return; }
    if (!p) { p = document.createElement("div"); p.id = "netPill"; p.className = "net-pill"; p.setAttribute("role", "status"); p.innerHTML = `${ic("refresh")} Sin conexión: ves lo último guardado`; document.body.appendChild(p); }
  };
  window.addEventListener("online", net); window.addEventListener("offline", net); net();

  // ---------- recordatorios por notificación (Web Push vía el Worker) ----------
  // Preferencias en localStorage «notifPrefs»: {on, c: {d: [días 0-6], h}, k: hora | null, m: hora | null}.
  // La página deja en la caché «menuario-notif» el menú de los próximos 14 días y la lista de cada semana:
  // el service worker arma el texto con eso cuando llega el push (que viene vacío).
  const NP = "notifPrefs", API = (window.CONFIG || {}).priceApi, VAPID = (window.CONFIG || {}).vapidPublicKey;
  const npGet = () => { try { return JSON.parse(localStorage.getItem(NP) || "null"); } catch (e) { return null; } };
  const npSet = (v) => { try { localStorage.setItem(NP, JSON.stringify(v)); } catch (e) {} };
  const pushOk = () => "serviceWorker" in navigator && "PushManager" in window && "Notification" in window && !!API && !!VAPID;
  const u8 = (b) => Uint8Array.from(atob(b.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
  const wireP = (p) => ({ c: p.c && p.c.d.length ? p.c : null, k: p.k || null, m: p.m || null, v: p.v || null, pr: !!p.pr });
  // lo que necesita el servidor para las alertas: los productos de la lista de esta semana (sin lo de la heladera) y lo que se vence
  function notifData() {
    try {
      const hel = fGet(), mon = mondayOf(todayISO); let list = shoppingFor(weekAt(mon));
      const my = myLists(); if (localStorage.getItem("shopSrc") === "mi" && my?.weeks?.[mon]) list = my.weeks[mon].list;
      const items = list.flatMap((c) => c.items.map((i) => i.n)).concat(xGet(mon).map((x) => x.n)).filter((n) => !inFridge(n, hel));
      const vence = {}; hel.forEach((h) => { const v = fVence(h); if (v) vence[h] = v; });
      return { items, vence };
    } catch (e) { return { items: [], vence: {} }; }
  }
  async function notifSnap() {
    const p = npGet(); if (!p?.on || !("caches" in window)) return;
    let mine = null; try { mine = JSON.parse(localStorage.getItem("notifMine") || "null"); } catch (e) {}
    const nm = (id) => R[id]?.name || "";
    const days = {}; for (let i = 0; i < 14; i++) {
      const iso = addDays(todayISO, i), h = houseDay(iso), m = mine?.days?.[iso] || {};
      const a = R[m.almuerzo] ? m.almuerzo : h.almuerzo, c = R[m.cena] ? m.cena : h.cena;
      days[iso] = { a: nm(a), ai: a, c: nm(c), me: h.merienda };
    }
    const weeks = {}; [0, 7].forEach((o) => {
      const mon = addDays(mondayOf(todayISO), o), mw = mine?.weeks?.[mon];
      weeks[mon] = mw ? { n: mw.n, url: "mi-plan.html" } : { n: shoppingFor(weekAt(mon)).reduce((t, c) => t + c.items.length, 0), url: `compras.html#semana-${mon}` };
    });
    const vence = fGet().map((h) => ({ n: h, d: fVence(h) })).filter((x) => x.d).map((x) => ({ ...x, r: Object.values(R).filter((r) => !r.custom && DIET.ok(r) && r.ing.some((i) => fHas(i.n, x.n))).slice(0, 2).map((r) => r.name) }));
    const snap = { at: new Date().toISOString(), prefs: wireP(p), days, weeks, vence, api: API, vapid: VAPID };
    try { await (await caches.open("menuario-notif")).put("snap", new Response(JSON.stringify(snap), { headers: { "Content-Type": "application/json" } })); } catch (e) {}
  }
  window.notifSnap = notifSnap;
  async function notifSub(create) {
    const reg = await navigator.serviceWorker.ready; let sub = await reg.pushManager.getSubscription();
    if (!sub && create) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: u8(VAPID) });
    return sub;
  }
  const notifPost = (path, body) => fetch(API + path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then((r) => r.json().then((j) => ({ ok: r.ok, ...j })));
  // una vez por día: renueva la suscripción en el Worker (si no, vence a los 120 días) y el menú guardado
  (async () => {
    const p = npGet(); if (!p?.on || !pushOk() || Notification.permission !== "granted") return;
    await notifSnap();
    if (localStorage.getItem("notifSync") === todayISO) return;
    try { const sub = await notifSub(false); if (sub) { await notifPost("/push/sub", { endpoint: sub.endpoint, prefs: wireP(p), data: notifData() }); localStorage.setItem("notifSync", todayISO); } } catch (e) {}
  })();
  // cuando cambia la heladera o la lista, el servidor se entera (como mucho una vez cada 5 segundos)
  let resyncT = 0;
  window.notifResync = () => { clearTimeout(resyncT); resyncT = setTimeout(async () => { const p = npGet(); if (!p?.on || !pushOk() || Notification.permission !== "granted") return; await notifSnap(); try { const sub = await notifSub(false); if (sub) await notifPost("/push/sub", { endpoint: sub.endpoint, prefs: wireP(p), data: notifData() }); } catch (e) {} }, 5000); };
  window.addEventListener("plan-swap", () => window.notifResync()); window.addEventListener("hogar", () => window.notifResync());

  const DOWL = [[1, "Lu"], [2, "Ma"], [3, "Mi"], [4, "Ju"], [5, "Vi"], [6, "Sá"], [0, "Do"]];
  const HOURS = Array.from({ length: 36 }, (_, i) => { const m = 360 + i * 30; return `${String(Math.floor(m / 60)).padStart(2, "0")}:${m % 60 ? "30" : "00"}`; });
  const hourSel = (id, v) => `<select id="${id}" class="nt-h" aria-label="Hora">${HOURS.map((h) => `<option${h === v ? " selected" : ""}>${h}</option>`).join("")}</select>`;
  function openNotif() {
    $("#moreMenu") && ($("#moreMenu").hidden = true);
    const p = Object.assign({ on: false, c: { d: [6], h: "10:00" }, k: "11:30", m: null }, npGet() || {});
    const cOn = !!(p.c && p.c.d.length), c = p.c && p.c.d.length ? p.c : { d: [6], h: "10:00" };
    let sh = $("#notifSheet");
    if (!sh) { sh = document.createElement("div"); sh.id = "notifSheet"; sh.className = "share-sheet app-sheet"; document.body.appendChild(sh); }
    const iosNeedsHome = isIOS && !standalone;
    const blocked = !pushOk() || iosNeedsHome;
    sh.innerHTML = `<div class="sh-bg" data-shx></div><div class="sh-box as-box nt-box" role="dialog" aria-modal="true" aria-labelledby="ntT">
      <button class="as-x" type="button" data-shx aria-label="Cerrar">×</button>
      <h3 id="ntT">${ic("bell")} Recordatorios</h3>
      <p class="muted small">Te llegan como notificación aunque la app esté cerrada. Elegí cuáles querés y a qué hora.</p>
      ${iosNeedsHome ? `<p class="nt-warn">En iPhone los avisos funcionan con Menuario agregada al inicio: en Safari tocá <b>Compartir → Agregar a inicio</b>, abrila desde el ícono y volvé acá.</p>`
        : !pushOk() ? `<p class="nt-warn">Este navegador no permite notificaciones. Probá con Chrome en Android o con la app instalada.</p>`
        : Notification.permission === "denied" ? `<p class="nt-warn">Las notificaciones están bloqueadas para Menuario. Activalas en los ajustes del navegador (el candado junto a la dirección, o Ajustes → Apps → Menuario → Notificaciones) y volvé a intentar.</p>` : ""}
      <div class="nt-list"${blocked ? " inert" : ""}>
        <section class="nt-row"><label class="nt-sw"><input type="checkbox" id="ntC"${cOn ? " checked" : ""}><span class="nt-ico">${ic("compras")}</span><span><b>Hacer las compras</b><small>Con la cantidad de productos de tu lista.</small></span></label>
          <div class="nt-opts"><div class="nt-days" role="group" aria-label="Días">${DOWL.map(([n, t]) => `<button type="button" class="pchip${c.d.includes(n) ? " on" : ""}" data-dow="${n}" aria-pressed="${c.d.includes(n)}">${t}</button>`).join("")}</div>${hourSel("ntCh", c.h)}</div></section>
        <section class="nt-row"><label class="nt-sw"><input type="checkbox" id="ntK"${p.k ? " checked" : ""}><span class="nt-ico">${ic("recetas")}</span><span><b>Qué se come hoy</b><small>El almuerzo y la cena, con la receta a un toque.</small></span></label>
          <div class="nt-opts">${hourSel("ntKh", p.k || "11:30")}</div></section>
        <section class="nt-row"><label class="nt-sw"><input type="checkbox" id="ntM"${p.m ? " checked" : ""}><span class="nt-ico">${ic("check")}</span><span><b>Marcar el día</b><small>Para no cortar la racha en Mi plan.</small></span></label>
          <div class="nt-opts">${hourSel("ntMh", p.m || "21:30")}</div></section>
        <section class="nt-row"><label class="nt-sw"><input type="checkbox" id="ntV"${p.v ? " checked" : ""}><span class="nt-ico">${ic("snow")}</span><span><b>Lo que se vence</b><small>Solo si algo de tu heladera se vence hoy o mañana, con recetas para usarlo.</small></span></label>
          <div class="nt-opts">${hourSel("ntVh", p.v || "10:00")}</div></section>
        <section class="nt-row"><label class="nt-sw"><input type="checkbox" id="ntP"${p.pr ? " checked" : ""}><span class="nt-ico">${ic("tag")}</span><span><b>Promos de tu lista</b><small>Cuando algo de tu lista está en oferta. Como mucho uno por día, entre las 9 y las 21.</small></span></label></section>
      </div>
      <p class="nt-msg small" id="ntMsg" role="status"></p>
      <div class="as-act">${p.on ? `<button class="mini-btn" type="button" data-ntoff>Apagar todo</button><button class="mini-btn" type="button" data-nttest>${ic("bell")} Probar</button>` : ""}<button class="btn" type="button" data-ntsave${blocked ? " disabled" : ""}>${p.on ? "Guardar" : "Activar recordatorios"}</button></div>
    </div>`;
    sh.hidden = false; document.body.classList.add("no-scroll");
    const close = () => { sh.hidden = true; document.body.classList.remove("no-scroll"); };
    const msg = (t, bad) => { const m = $("#ntMsg"); m.textContent = t; m.classList.toggle("bad", !!bad); };
    const sync = () => sh.querySelectorAll(".nt-row").forEach((r) => r.classList.toggle("off", !r.querySelector("input").checked));
    sync(); sh.onchange = sync;
    sh.onkeydown = (e) => { if (e.key === "Escape") close(); };
    sh.onclick = async (e) => {
      if (e.target.closest("[data-shx]")) return close();
      const d = e.target.closest("[data-dow]"); if (d) { d.classList.toggle("on"); d.setAttribute("aria-pressed", d.classList.contains("on")); $("#ntC").checked = !!sh.querySelector("[data-dow].on"); sync(); return; }
      const btn = e.target.closest("[data-ntsave],[data-nttest],[data-ntoff]"); if (!btn) return;
      btn.disabled = true;
      try {
        if (btn.matches("[data-ntoff]")) {
          const sub = await notifSub(false); if (sub) { await notifPost("/push/unsub", { endpoint: sub.endpoint }).catch(() => {}); await sub.unsubscribe(); }
          npSet({ ...npGet(), on: false }); toastG("Listo: no te mandamos más recordatorios."); return close();
        }
        if (btn.matches("[data-nttest]")) {
          const sub = await notifSub(false); if (!sub) { msg("Primero activá los recordatorios.", true); return; }
          const r = await notifPost("/push/test", { endpoint: sub.endpoint }); msg(r.ok ? "Enviado: en unos segundos te llega una notificación de prueba." : "No se pudo mandar la prueba. Guardá de nuevo y reintentá.", !r.ok); return;
        }
        const np = { on: true, c: $("#ntC").checked ? { d: [...sh.querySelectorAll("[data-dow].on")].map((b) => +b.dataset.dow).sort(), h: $("#ntCh").value } : null, k: $("#ntK").checked ? $("#ntKh").value : null, m: $("#ntM").checked ? $("#ntMh").value : null, v: $("#ntV").checked ? $("#ntVh").value : null, pr: $("#ntP").checked };
        if (!np.c && !np.k && !np.m && !np.v && !np.pr) { msg("Elegí al menos un recordatorio, o tocá «Apagar todo».", true); return; }
        const perm = await Notification.requestPermission();
        if (perm !== "granted") { msg("Sin permiso no te podemos avisar. Aceptá las notificaciones cuando el teléfono pregunte.", true); return; }
        const sub = await notifSub(true);
        const r = await notifPost("/push/sub", { endpoint: sub.endpoint, prefs: wireP(np), data: notifData() });
        if (!r.ok) { msg("No se pudo guardar en el servidor. Probá de nuevo en un rato.", true); return; }
        npSet(np); localStorage.setItem("notifSync", todayISO); await notifSnap();
        const parts = [np.c && `compras ${np.c.d.map((n) => DOWL.find((x) => x[0] === n)[1].toLowerCase()).join(", ")} a las ${np.c.h}`, np.k && `menú a las ${np.k}`, np.m && `marcar el día a las ${np.m}`, np.v && `vencimientos a las ${np.v}`, np.pr && "promos de tu lista"].filter(Boolean);
        toastG(`Recordatorios activados: ${parts.join(" · ")}.`); close(); renderNotifState();
      } catch (ex) { msg("Algo falló al activar las notificaciones en este navegador.", true); }
      finally { btn.disabled = false; }
    };
  }
  function renderNotifState() {
    const p = npGet(), on = p?.on && pushOk() && Notification.permission === "granted";
    $$(".notif-state").forEach((el) => { el.textContent = on ? "activados" : ""; el.hidden = !on; });
  }
  renderNotifState();
  document.addEventListener("click", (e) => { if (e.target.closest(".notif-btn")) { e.preventDefault(); openNotif(); } });

  // ---------- modo app: barra propia, pestañas, tablero «Hoy» y «Más» con todas las funciones ----------
  if (document.documentElement.classList.contains("is-app")) {
    const H = new Date().getHours();
    const TITLES = { inicio: ["", H < 12 ? "Buen día" : H < 20 ? "Buenas tardes" : "Buenas noches"], plan: ["", "Plan"], recetas: ["", "Recetas"], compras: ["", "Compras"],
      supermercados: ["Comprar", "Súper"], promos: ["Comprar", "Promos"], temporada: ["Cocinar", "Estación"], nutricion: ["Vos", "Nutrición"], miplan: ["Vos", "Mi plan"], pasos: ["Vos", "Pasos"],
      app: ["Menuario", "La app"], terminos: ["Menuario", "Términos de uso"], privacidad: ["Menuario", "Privacidad"], "404": ["Menuario", "No encontrada"] };
    const TABS = ["inicio", "plan", "recetas", "compras"];
    const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"], MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
    const now = new Date(), fecha = `${DIAS[now.getDay()]} ${now.getDate()} de ${MESES[now.getMonth()]}`;
    const [sub, title] = TITLES[page] || ["Menuario", document.title.split(" · ")[0]];
    const bar = document.createElement("header"); bar.className = "appbar";
    bar.innerHTML = `${TABS.includes(page) ? "" : `<a class="ab-btn ab-back" href="index.html" aria-label="Volver">${ic("arrow")}</a>`}
      <div class="ab-tt"><small>${esc(page === "inicio" ? fecha : sub)}</small><h1>${esc(title)}</h1></div>
      <div class="ab-act"><button type="button" class="ab-btn notif-btn" aria-label="Recordatorios">${ic("bell")}</button><a class="ab-btn${page === "miplan" ? " on" : ""}" href="mi-plan.html" aria-label="Mi plan">${ic("users")}</a></div>`;
    document.body.prepend(bar);
    bar.querySelector(".ab-back")?.addEventListener("click", (e) => { if (history.length > 1 && document.referrer.startsWith(location.origin)) { e.preventDefault(); history.back(); } });
    const onScroll = () => bar.classList.toggle("sc", scrollY > 8); addEventListener("scroll", onScroll, { passive: true }); onScroll();
    const tb = $(".tabbar a[data-nav='inicio']"); if (tb) tb.lastChild.textContent = "Hoy";
    // todas las funciones, por categoría
    const CATS_APP = [
      ["Cocinar", "c1", [["plan.html", "calendar", "Plan del mes"], ["recetas.html", "recetas", "Recetas"], ["nutricion.html#medida", "settings", "Mes a medida"], ["temporada.html", "leaf", "Estación"], ["plan.html#batch", "pot", "Batch del domingo"]]],
      ["Comprar", "c2", [["compras.html", "compras", "Lista"], ["compras.html#comparar", "coin", "Comparar precios"], ["promos.html", "tag", "Promos"], ["supermercados.html#mapa", "pin", "Sucursales"]]],
      ["Vos", "c3", [["mi-plan.html", "users", "Mi plan"], ["mi-plan.html#prog", "chart", "Progreso"], ["nutricion.html", "flame", "Nutrición"], ["mi-plan.html#rank", "trophy", "Ranking"], ["pasos.html", "bolt", "Pasos"], ["mi-plan.html#rank", "target", "Desafíos"]]],
    ];
    const grid = () => CATS_APP.map(([t, c, items]) => `<section class="ap-cat ${c}"><h2>${t}</h2><div class="ap-grid">${items.map(([href, i, l]) => `<a class="ap-tile" href="${href}"><span class="ap-ic">${ic(i)}</span><span class="ap-l">${l}</span></a>`).join("")}</div></section>`).join("");
    const renderAppHome = () => {
      const mon = mondayOf(todayISO), n = shoppingFor(weekAt(mon)).reduce((t, c) => t + c.items.length, 0);
      const week = Array.from({ length: 7 }, (_, i) => houseDay(addDays(mon, i)));
      const td = houseDay(todayISO), tm = houseDay(addDays(todayISO, 1));
      const meal = (k, lbl, ico) => { const r = R[td[k]]; return `<div class="ap-mrow"><button type="button" class="ap-meal" data-rec="${td[k]}"><span class="ap-mk">${ic(ico)}${lbl}</span><img src="${r.img}"${srcs(r)} alt="" loading="lazy"><span class="ap-mn">${esc(r.name)}</span></button>${swapBtn(todayISO, k, td.sw?.[k])}</div>`; };
      $("#appHome").innerHTML = `
        <section class="ap-today"><div class="ap-h"><h2>Menú de hoy</h2><a href="plan.html">Semana</a></div>
          <div class="ap-meals">${meal("desayuno", "Desayuno", "desayuno")}${meal("almuerzo", "Almuerzo", "almuerzo")}${meal("cena", "Cena", "cena")}
            <div class="ap-meal ap-mer"><span class="ap-mk">${ic("merienda")}Merienda</span><span class="ap-mn">${esc(td.merienda)}</span></div></div>
          <button type="button" class="ap-tmw" data-rec="${tm.almuerzo}">Mañana: <b>${esc(R[tm.almuerzo].name)}</b>${ic("arrow")}</button></section>
        ${(() => { const hel = fGet().map((h) => ({ h, v: fVence(h) })).filter((x) => x.v && daysTo(x.v) <= 2).sort((a, b) => a.v.localeCompare(b.v)); if (!hel.length) return "";
          const recs = Object.values(R).filter((r) => !r.custom && DIET.ok(r)).map((r) => ({ r, n: hel.filter((x) => r.ing.some((i) => fHas(i.n, x.h))).length })).filter((x) => x.n).sort((a, b) => b.n - a.n).slice(0, 3);
          return `<section class="ap-use"><div class="ap-h"><h2>Usá primero</h2><a href="compras.html#fridge">Heladera</a></div><div class="ap-use-items">${hel.map((x) => `<span class="fr-chip soon">${ic("snow")}${esc(x.h)}<small>${venceTxt(x.v)}</small></span>`).join("")}</div>${recs.length ? `<div class="ap-use-recs">${recs.map(({ r }) => `<button type="button" class="bt-item" data-rec="${r.id}"><img src="${r.img}"${srcs(r)} alt="" loading="lazy"><span><b>${esc(r.name)}</b><small>${r.tiempo} min</small></span></button>`).join("")}</div>` : ""}</section>`; })()}
        ${localStorage.getItem("tutorialHecho") ? "" : `<a class="ap-tuto" href="mi-plan.html?tutorial=1"><span class="ap-tuto-ic">${ic("trophy")}</span><span><b>Primeros pasos</b><small>Tus datos, tu heladera y tu semana en 5 pasos. Al final ganás tu primer nivel.</small></span>${ic("arrow")}</a>`}
        <div class="ap-quick">
          <a class="ap-q" href="compras.html">${ic("compras")}<span><b>Tu lista</b><small>${n} productos</small></span></a>
          <a class="ap-q" href="pasos.html">${ic("bolt")}<span><b>Pasos</b><small class="ap-psq">Hoy</small></span></a>
          <a class="ap-q" href="mi-plan.html">${ic("check")}<span><b>Marcar el día</b><small>Sumá XP</small></span></a>
          <button type="button" class="ap-q notif-btn">${ic("bell")}<span><b>Avisos</b><small class="ap-nstate">Elegí cuándo</small></span></button>
        </div>
        <section class="ap-week"><div class="ap-h"><h2>Esta semana</h2><a href="plan.html">Ver el plan</a></div>
          <div class="ap-days">${week.map((d) => { const r = R[d.almuerzo]; return `<button type="button" class="ap-day${d.date === todayISO ? " is-today" : ""}" data-rec="${d.almuerzo}"><span class="ap-dw">${d.date === todayISO ? "Hoy" : d.dow.slice(0, 3)} <b>${+d.date.slice(8)}</b></span><img src="${r.img}"${srcs(r)} alt="" loading="lazy"><span class="ap-dn">${esc(r.name)}</span></button>`; }).join("")}</div></section>
        ${grid()}`;
      const p = npGet(); if (p?.on) $$(".ap-nstate").forEach((x) => { x.textContent = "Activados"; });
      const psq = () => { let s = 0; try { s = JSON.parse(localStorage.getItem("pasos") || "{}")[todayISO]?.s || 0; } catch (e) {} const g = window.pasosGoal?.() || 8000; $$(".ap-psq").forEach((x) => { x.textContent = s ? `${s.toLocaleString("es-AR")} de ${g.toLocaleString("es-AR")}` : "Hoy"; }); };
      setTimeout(psq, 0); if (!window.__psq) { window.__psq = 1; window.addEventListener("pasos", () => $$(".ap-psq").length && psq()); }  // después de que cargue el bloque de pasos (objetivo)
      { const t = $(".ap-day.is-today"), row = $(".ap-days"); if (t && row) row.scrollLeft = t.offsetLeft - row.offsetLeft - (row.clientWidth - t.offsetWidth) / 2; }  // centra hoy sin mover la página
    };
    if (page === "inicio" && $("#appHome")) { renderAppHome(); window.addEventListener("plan-swap", renderAppHome); window.addEventListener("hogar", renderAppHome); }
    // «Más»: hoja con todas las funciones, moneda y ajustes
    const moreB = $("#moreBtn");
    if (moreB) moreB.addEventListener("click", (e) => {
      e.stopImmediatePropagation(); $("#moreMenu") && ($("#moreMenu").hidden = true);
      let sh = $("#appMore"); if (!sh) { sh = document.createElement("div"); sh.id = "appMore"; sh.className = "share-sheet app-sheet"; document.body.appendChild(sh); }
      const cur = $("#curSeg .on")?.dataset.cur || "ARS";
      sh.innerHTML = `<div class="sh-bg" data-shx></div><div class="sh-box as-box ap-more" role="dialog" aria-modal="true" aria-label="Todas las funciones">
        <span class="ap-grab" aria-hidden="true"></span>${grid()}
        <div class="ap-set">
          <button type="button" class="ap-row notif-btn">${ic("bell")}<span>Recordatorios</span>${ic("arrow")}</button>
          <button type="button" class="ap-row" data-open-prefs>${ic("leaf")}<span>Preferencias y alergias</span>${ic("arrow")}</button>
          <div class="ap-row"><span class="ap-ri">${ic("users")}</span><span>Cuántos comen</span><div class="ap-cur">${hogHTML()}</div></div>
          <div class="ap-row"><span class="ap-ri">${ic("coin")}</span><span>Moneda</span><div class="seg ap-cur">${["ARS", "USD", "EUR"].map((c) => `<button type="button" data-apcur="${c}" class="${c === cur ? "on" : ""}">${c}</button>`).join("")}</div></div>
          <button type="button" class="ap-row" data-apsug>${ic("plus")}<span>Sugerir un plato</span>${ic("arrow")}</button>
        </div>
        <p class="ap-legal"><a href="terminos.html">Términos</a> · <a href="privacidad.html">Privacidad</a> · Menuario 1.0</p></div>`;
      sh.hidden = false; document.body.classList.add("no-scroll");
      const close = () => { sh.hidden = true; document.body.classList.remove("no-scroll"); };
      sh.onclick = (ev) => {
        if (ev.target.closest("[data-shx]") || ev.target.closest("a") || ev.target.closest(".notif-btn")) { close(); return; }
        const c = ev.target.closest("[data-apcur]"); if (c) { $(`#curSeg [data-cur="${c.dataset.apcur}"]`)?.click(); sh.querySelectorAll("[data-apcur]").forEach((b) => b.classList.toggle("on", b === c)); return; }
        if (ev.target.closest("[data-apsug]")) { close(); $("#sugFab")?.click(); }
      };
      sh.onkeydown = (ev) => { if (ev.key === "Escape") close(); };
    }, true);
  }

  // ---------- pasos (podómetro de la app de Android, o cargados a mano) ----------
  // localStorage «pasos» = {"2026-10-25": {s: 5234, src: "app" | "mano" | "nube"}}, «pasosMeta» = {meta, paso} (personalizados)
  const PSK = "pasos";
  const psGet = () => { try { return JSON.parse(localStorage.getItem(PSK) || "{}"); } catch (e) { return {}; } };
  const psSet = (v) => { try { localStorage.setItem(PSK, JSON.stringify(v)); } catch (e) {} window.dispatchEvent(new Event("pasos")); };
  const psCfg = () => { try { return JSON.parse(localStorage.getItem("pasosMeta") || "{}"); } catch (e) { return {}; } };
  const psProf = () => { try { return JSON.parse(localStorage.getItem("perfil-nutricion") || "null"); } catch (e) { return null; } };
  // objetivo a medida: según la actividad del perfil (6.000 a 12.000) y la edad; o el que eligió la persona
  function psAutoGoal(p) {
    if (!p) return 8000;
    let g = p.act <= 1.3 ? 6000 : p.act <= 1.45 ? 8000 : p.act <= 1.6 ? 10000 : 12000;
    if (p.edad >= 65) g -= 2000; else if (p.edad >= 50) g -= 1000; else if (p.edad < 18) g += 2000;
    return Math.max(5000, Math.round(g / 500) * 500);
  }
  const psGoal = () => +psCfg().meta || psAutoGoal(psProf());
  // largo del paso: ~41,5 % (varones) o 41,3 % (mujeres) de la altura; o el medido por la persona
  const psStride = () => { const c = +psCfg().paso; if (c) return c / 100; const p = psProf(); return p?.altura ? p.altura * (p.sexo === "m" ? 0.415 : 0.413) / 100 : 0.7; };
  const psKm = (s) => s * psStride() / 1000;
  const psKcal = (s) => Math.round(psKm(s) * (psProf()?.peso || 70) * 0.57);  // caminar: ~0,57 kcal por kg y por km
  const psXP = (s, g) => (s >= g ? 25 : 0) + Math.min(20, Math.floor(s / 2000) * 5);
  window.pasosGoal = psGoal;
  // lo que manda la app de Android en la dirección: ?pasos=20261025:5234,20261024:8012 (o denegado / nosensor / vacio)
  {
    const qs = new URLSearchParams(location.search), raw = qs.get("pasos");
    if (raw) {
      if (/^(denegado|nosensor|vacio)$/.test(raw)) localStorage.setItem("pasosEstado", raw);
      else {
        const st = psGet(); let n = 0;
        raw.split(",").forEach((x) => { const m = /^(\d{4})(\d{2})(\d{2}):(\d{1,6})$/.exec(x); if (!m) return; const iso = `${m[1]}-${m[2]}-${m[3]}`, v = +m[4]; if (v > 0 || !st[iso]) { st[iso] = { s: v, src: "app" }; n++; } });
        localStorage.setItem("pasosEstado", "ok"); localStorage.setItem("pasosSync", Date.now()); if (n) psSet(st);
      }
      qs.delete("pasos"); history.replaceState(history.state, "", location.pathname + (qs.toString() ? "?" + qs : "") + location.hash);
    }
  }
  // ¿hay podómetro? solo en la app de Android 1.0.5 o más nueva (la app abre el sitio con ?v=<versión>)
  if (/^android-app:\/\/ar\.menuario\.app/.test(document.referrer)) { try { sessionStorage.setItem("twa", "1"); sessionStorage.setItem("apkv", new URLSearchParams(location.search).get("v") || "0"); } catch (e) {} }
  const apkV = sessionStorage.getItem("apkv") || "0";
  const psNative = sessionStorage.getItem("twa") === "1" && apkV.split(".").map(Number).reduce((a, x, i) => a + x * [1e6, 1e3, 1][i], 0) >= 1000005;
  const INTENT = (a) => `intent://pasos?accion=${a}#Intent;scheme=menuario;package=ar.menuario.app;end`;

  if (page === "pasos") {
    let range = 7;
    const fmt = (n) => Math.round(n).toLocaleString("es-AR");
    const DOW = ["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sá"];
    function renderPasos() {
      const st = psGet(), g = psGoal(), today = st[todayISO]?.s || 0, pct = Math.min(1, today / g);
      const R0 = 54, C = 2 * Math.PI * R0;
      $("#psToday").innerHTML = `<div class="ps-ring"><svg viewBox="0 0 128 128" aria-hidden="true"><circle cx="64" cy="64" r="${R0}" class="bg"/><circle cx="64" cy="64" r="${R0}" class="fg${today >= g ? " ok" : ""}" style="stroke-dasharray:${C};stroke-dashoffset:${C * (1 - pct)}"/></svg>
          <div><b>${fmt(today)}</b><small>de ${fmt(g)} pasos</small></div></div>
        <div class="ps-kpis"><div><b>${psKm(today).toLocaleString("es-AR", { maximumFractionDigits: 2, minimumFractionDigits: 2 })}</b><small>km</small></div><div><b>${fmt(psKcal(today))}</b><small>kcal</small></div><div><b>${fmt(today / 105)}</b><small>min activos</small></div><div><b>+${psXP(today, g)}</b><small>XP hoy</small></div></div>
        <p class="ps-msg">${today >= g ? `${ic("trophy")} ¡Objetivo cumplido! +25 XP` : today ? `Te faltan <b>${fmt(g - today)}</b> pasos (unos ${fmt((g - today) / 105)} minutos caminando).` : "Todavía no hay pasos de hoy."}</p>`;
      // origen de los datos
      const est = localStorage.getItem("pasosEstado"), sync = +localStorage.getItem("pasosSync") || 0;
      $("#psSrc").innerHTML = psNative
        ? (est === "ok" ? `<div class="pss-row">${ic("check")}<span><b>Podómetro del teléfono activado</b><small>Se actualiza cada vez que abrís la app${sync ? ` · última vez a las ${new Date(sync).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false })}` : ""}</small></span><a class="btn" href="${INTENT("sync")}">${ic("refresh")} Actualizar</a></div>`
          : est === "denegado" ? `<div class="pss-row">${ic("x")}<span><b>Falta el permiso de actividad física</b><small>Sin ese permiso el teléfono no le pasa los pasos a Menuario. Podés darlo ahora o en Ajustes → Apps → Menuario → Permisos.</small></span><a class="btn" href="${INTENT("activar")}">Dar permiso</a></div>`
          : est === "nosensor" ? `<div class="pss-row">${ic("x")}<span><b>Este teléfono no tiene contador de pasos</b><small>Podés cargarlos a mano abajo.</small></span></div>`
          : `<div class="pss-row">${ic("bolt")}<span><b>Contá tus pasos solo</b><small>Menuario usa el contador del teléfono (no gasta batería extra). Te va a pedir el permiso de actividad física.</small></span><a class="btn" href="${INTENT("activar")}">Activar podómetro</a></div>`)
        : `<div class="pss-row">${ic("phone")}<span><b>Los pasos se cuentan solos con la app de Android</b><small>${isAndroid ? "Bajá la app con podómetro (APK). Mientras, cargalos a mano abajo." : "En iPhone o en la compu, cargalos a mano abajo con lo que marca tu teléfono."}</small></span>${isAndroid ? `<button type="button" class="btn ghost" data-get-apk>${ic("download")} Bajar el APK</button>` : ""}</div>`;
      // gráfico
      const days = Array.from({ length: range }, (_, i) => addDays(todayISO, i - range + 1)), vals = days.map((d) => st[d]?.s || 0);
      const top = Math.max(g * 1.15, ...vals, 1);
      $("#psChart").className = "ps-bars r" + range; $("#psChart").setAttribute("aria-label", `Pasos de los últimos ${range} días`);
      $("#psChart").innerHTML = `<i class="ps-goal" style="bottom:${g / top * 100}%"><span>${fmt(g)}</span></i>` + days.map((d, i) => { const v = vals[i], dt = new Date(d + "T12:00"); return `<div class="ps-b${v >= g ? " ok" : ""}${d === todayISO ? " is-today" : ""}" title="${d.slice(8)}/${d.slice(5, 7)}: ${fmt(v)} pasos"><em style="height:${Math.max(v ? 2 : 0, v / top * 100)}%">${range === 7 && v ? `<small>${v >= 1000 ? (v / 1000).toLocaleString("es-AR", { maximumFractionDigits: 1 }) + " k" : v}</small>` : ""}</em><span>${range === 7 ? DOW[dt.getDay()] : (i % 5 === 4 || d === todayISO ? +d.slice(8) : "")}</span></div>`; }).join("");
      const withData = vals.filter((v) => v > 0), avg = withData.length ? withData.reduce((a, b) => a + b, 0) / withData.length : 0;
      const best = Math.max(0, ...vals), okDays = vals.filter((v) => v >= g).length;
      let streak = 0; for (let k = (st[todayISO]?.s || 0) >= g ? 0 : 1; ; k++) { const d = addDays(todayISO, -k); if ((st[d]?.s || 0) >= g) streak++; else break; if (k > 400) break; }
      const totKm = vals.reduce((a, v) => a + psKm(v), 0);
      $("#psStats").innerHTML = `<div><b>${fmt(avg)}</b><small>promedio por día</small></div><div><b>${fmt(best)}</b><small>mejor día</small></div><div><b>${okDays}/${range}</b><small>días con objetivo</small></div><div><b>${streak}</b><small>${streak === 1 ? "día seguido" : "días seguidos"}</small></div><div><b>${totKm.toLocaleString("es-AR", { maximumFractionDigits: 1 })}</b><small>km en total</small></div><div><b>${fmt(vals.reduce((a, v) => a + psKcal(v), 0))}</b><small>kcal quemadas</small></div>`;
      // ajustes
      const cfg = psCfg(), p = psProf(), auto = psAutoGoal(p), autoStride = p?.altura ? Math.round(p.altura * (p.sexo === "m" ? 0.415 : 0.413)) : 70;
      $("#psSet").innerHTML = `<h2>Tu objetivo</h2>
        <p class="muted small">${p ? `Según tu perfil (${p.edad} años, actividad ${p.act <= 1.3 ? "sedentaria" : p.act <= 1.45 ? "ligera" : p.act <= 1.6 ? "moderada" : "alta"}): <b>${fmt(auto)} pasos por día</b>. La OMS recomienda moverse todos los días; entre 7.000 y 10.000 pasos ya bajan mucho los riesgos de salud.` : `Completá tu perfil en <a href="nutricion.html">Nutrición</a> (edad, altura, peso, actividad) y calculamos tu objetivo y el largo de tu paso. Mientras, usamos 8.000 pasos.`}</p>
        <div class="ps-cfg"><label><span>Objetivo diario</span><input type="number" id="psMeta" min="1000" max="40000" step="500" inputmode="numeric" placeholder="${auto}" value="${cfg.meta || ""}"></label>
          <label><span>Largo del paso (cm)</span><input type="number" id="psPaso" min="40" max="120" step="1" inputmode="numeric" placeholder="${autoStride}" value="${cfg.paso || ""}"></label>
          <button type="button" class="mini-btn" id="psReset"${cfg.meta || cfg.paso ? "" : " hidden"}>Volver a lo automático</button></div>
        <p class="muted small">Para medir tu paso: caminá 10 pasos normales, medí la distancia en centímetros y dividila por 10. XP: +25 al llegar al objetivo y +5 cada 2.000 pasos (hasta +20 por día), con la cuenta abierta.</p>`;
    }
    renderPasos(); window.addEventListener("pasos", renderPasos);
    $("#psRange").addEventListener("click", (e) => { const b = e.target.closest("[data-r]"); if (!b) return; range = +b.dataset.r; $$("#psRange button").forEach((x) => x.classList.toggle("on", x === b)); renderPasos(); });
    $("#psSet").addEventListener("change", (e) => {
      if (!e.target.matches("#psMeta, #psPaso")) return;
      const c = psCfg(), m = Math.round(+$("#psMeta").value), pa = Math.round(+$("#psPaso").value);
      c.meta = m >= 1000 && m <= 40000 ? m : null; c.paso = pa >= 40 && pa <= 120 ? pa : null;
      localStorage.setItem("pasosMeta", JSON.stringify(c)); renderPasos(); window.dispatchEvent(new Event("pasos"));
    });
    $("#psSet").addEventListener("click", (e) => { if (!e.target.closest("#psReset")) return; localStorage.removeItem("pasosMeta"); renderPasos(); window.dispatchEvent(new Event("pasos")); });
    const di = $("#psDate"); di.value = todayISO; di.max = todayISO; di.min = addDays(todayISO, -30);
    $("#psForm").addEventListener("submit", (e) => {
      e.preventDefault(); const d = di.value, n = Math.round(+$("#psN").value);
      if (!d || d > todayISO || n < 0 || n > 100000) return;
      const st = psGet(); st[d] = { s: n, src: "mano" }; psSet(st); $("#psN").value = ""; toastG(`Guardado: ${n.toLocaleString("es-AR")} pasos el ${d.slice(8)}/${d.slice(5, 7)}.`);
    });
  }

  // ---------- actualizaciones ----------
  // 1) Sitio: el service worker nuevo toma el control solo (skipWaiting + claim). Si la página ya estaba abierta,
  //    aparece una barra para recargar. Al volver a la app (que en el teléfono queda abierta días) se busca una versión nueva.
  if ("serviceWorker" in navigator) {
    let hadCtl = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!hadCtl) { hadCtl = true; return; }  // primera instalación: no hay nada viejo que recargar
      if ($("#updBar")) return;
      const b = document.createElement("div"); b.id = "updBar"; b.className = "upd-bar"; b.setAttribute("role", "status");
      b.innerHTML = `${ic("refresh")}<span><b>Hay una versión nueva de Menuario</b><small>Tocá para verla. No perdés nada.</small></span><button type="button" class="btn" data-upd>Actualizar</button><button type="button" class="upd-x" aria-label="Más tarde" data-updx>×</button>`;
      b.addEventListener("click", (e) => { if (e.target.closest("[data-updx]")) return b.remove(); location.reload(); });
      document.body.appendChild(b);
    });
    let lastChk = Date.now();
    document.addEventListener("visibilitychange", () => { if (document.hidden || Date.now() - lastChk < 30 * 60e3) return; lastChk = Date.now(); navigator.serviceWorker.getRegistration().then((r) => r && r.update()).catch(() => {}); });
  }
  // 2) App de Android instalada con el APK: cada APK abre el sitio con ?v=<versión>. Si hay uno más nuevo publicado
  //    (descargas/version.json, lo escribe tools/build_android.py), se ofrece bajarlo: se instala encima y no se pierde nada.
  //    Instalada desde Chrome, la app se actualiza sola y esto no aparece.
  {
    const qs = new URLSearchParams(location.search);
    if (/^android-app:\/\/ar\.menuario\.app/.test(document.referrer)) { try { sessionStorage.setItem("twa", "1"); sessionStorage.setItem("apkv", qs.get("v") || "0"); } catch (e) {} }
    const cmpV = (a, b) => { const x = String(a).split(".").map(Number), y = String(b).split(".").map(Number); for (let i = 0; i < 3; i++) { if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) - (y[i] || 0); } return 0; };
    if (sessionStorage.getItem("twa") === "1" && page === "inicio") {
      fetch("descargas/version.json", { cache: "no-store" }).then((r) => r.ok && r.json()).then((v) => {
        const mine = sessionStorage.getItem("apkv") || "0";
        if (!v?.apk || cmpV(v.apk, mine) <= 0 || +(localStorage.getItem("apkSnooze") || 0) > Date.now()) return;
        let sh = $("#apkUpd"); if (!sh) { sh = document.createElement("div"); sh.id = "apkUpd"; sh.className = "share-sheet app-sheet"; document.body.appendChild(sh); }
        sh.innerHTML = `<div class="sh-bg" data-later></div><div class="sh-box as-box" role="dialog" aria-modal="true" aria-labelledby="auT">
          <span class="as-ico"><img src="img/icons/icon-192.png" alt="" width="64" height="64"></span>
          <h3 id="auT">Actualización disponible</h3>
          <p class="muted small">Versión ${esc(v.apk)}${mine !== "0" ? ` (tenés la ${esc(mine)})` : ""}.${v.notes ? ` ${esc(v.notes)}` : ""}</p>
          <ol class="as-steps"><li><span>1</span><p>Tocá <b>Actualizar</b>: se baja la versión nueva (poco más de 1 MB).</p></li><li><span>2</span><p>Abrí <b>menuario.apk</b> desde la notificación y tocá <b>Actualizar</b>.</p></li><li><span>3</span><p>Listo: tu cuenta, tu calendario y tus listas siguen igual.</p></li></ol>
          <div class="as-act"><button type="button" class="mini-btn" data-later>Más tarde</button><button type="button" class="btn" data-apkgo>${ic("download")} Actualizar</button></div></div>`;
        sh.hidden = false;
        sh.onclick = (e) => {
          if (e.target.closest("[data-later]")) { try { localStorage.setItem("apkSnooze", Date.now() + 3 * 864e5); } catch (x) {} sh.hidden = true; return; }  // vuelve a preguntar en 3 días
          if (e.target.closest("[data-apkgo]")) { dlApk(); sh.querySelector("h3").textContent = "Bajando la actualización…"; sh.querySelector("[data-apkgo]").remove(); sh.querySelector("[data-later]").textContent = "Cerrar"; }
        };
      }).catch(() => {});
    }
  }

  const REM = "recordatorio";
  const remGet = () => { try { return JSON.parse(localStorage.getItem(REM) || "null"); } catch (e) { return null; } };
  function downloadIcs(hora) {
    const [h, m] = hora.split(":"); const d = todayISO.replace(/-/g, ""); const url = location.origin + location.pathname.replace(/[^/]*$/, "mi-plan.html");
    const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Menuario//ES", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
      "BEGIN:VTIMEZONE", "TZID:America/Argentina/Buenos_Aires", "BEGIN:STANDARD", "DTSTART:19700101T000000", "TZOFFSETFROM:-0300", "TZOFFSETTO:-0300", "TZNAME:-03", "END:STANDARD", "END:VTIMEZONE",
      "BEGIN:VEVENT", "UID:recordatorio-diario@plan-comidas-bsas", "DTSTAMP:" + new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z",
      `DTSTART;TZID=America/Argentina/Buenos_Aires:${d}T${h}${m}00`, "DURATION:PT10M", "RRULE:FREQ=DAILY",
      "SUMMARY:Marcá tu día · Menuario", `DESCRIPTION:¿Comiste lo que planeaste? Marcalo y sumá XP sin cortar la racha: ${url}`, `URL:${url}`,
      "BEGIN:VALARM", "TRIGGER:PT0M", "ACTION:DISPLAY", "DESCRIPTION:Marcá tu día en Menuario", "END:VALARM", "END:VEVENT", "END:VCALENDAR"].join("\r\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" })); a.download = "recordatorio-plan-comidas.ics"; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    toastG("Abrí el archivo descargado: tu calendario lo agrega como evento diario con alarma.");
  }
  if ($("#remHora")) {
    const r = remGet(); if (r) { $("#remHora").value = r.hora || "21:00"; $("#remApp").checked = !!r.app; }
    const save = () => localStorage.setItem(REM, JSON.stringify({ hora: $("#remHora").value || "21:00", app: $("#remApp").checked }));
    $("#remHora").addEventListener("change", save);
    $("#remApp").addEventListener("change", () => { save(); toastG($("#remApp").checked ? "Listo: si abrís el sitio después de esa hora sin haber marcado el día, te aviso." : "Aviso en el sitio desactivado."); });
    $("#remIcs").addEventListener("click", () => { save(); downloadIcs($("#remHora").value || "21:00"); });
  }
  (() => {  // aviso al abrir el sitio, una vez por día, si ya pasó la hora y el día no está marcado
    const r = remGet(); if (!r?.app) return; const [h, m] = (r.hora || "21:00").split(":").map(Number); const now = new Date();
    if (now.getHours() * 60 + now.getMinutes() < h * 60 + m) return;
    if (localStorage.getItem("diaMarcado") === todayISO || localStorage.getItem("avisoHoy") === todayISO) return;
    localStorage.setItem("avisoHoy", todayISO);
    setTimeout(() => {
      const n = document.createElement("div"); n.className = "nudge"; n.setAttribute("role", "status");
      n.innerHTML = `<span>${ic("clock")} ¿Cumpliste el plan de hoy? Marcalo antes de dormir y la racha sigue.</span><a class="mini-btn" href="mi-plan.html#hoy">Marcar mi día</a><button class="nudge-x" aria-label="Cerrar">×</button>`;
      n.querySelector(".nudge-x").addEventListener("click", () => n.remove()); document.body.appendChild(n);
    }, 1400);
  })();

  // ---------- alertas de precio (en este dispositivo; se revisan al abrir Supermercados, como mucho cada 6 h) ----------
  const AKEY = "alertasPrecio";
  const getAlerts = () => { try { return JSON.parse(localStorage.getItem(AKEY) || "[]"); } catch (e) { return []; } };
  const setAlerts = (l) => { try { localStorage.setItem(AKEY, JSON.stringify(l)); } catch (e) {} };
  const normA = (s) => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const matchQ = (q, rows) => { const qn = normA(q).split(/\s+/).map((w) => w.replace(/[,.]/g, "")).filter((w) => w.length > 2 && !/^\d+$/.test(w)); return rows.filter((r) => { const n = normA(r.name); return qn.every((w) => n.includes(w) || n.includes(w.replace(/s$/, ""))); }).sort((a, b) => a.price - b.price); };
  function renderAlerts() {
    const box = $("#alertasBox"); if (!box) return; const list = getAlerts();
    if (!list.length) { box.innerHTML = ""; return; }
    box.innerHTML = `<div class="card alertas"><div class="al-head"><h3>${ic("bell")} Mis alertas de precio <small>${list.length}</small></h3><button class="mini-btn" id="alCheck">${ic("refresh")} Revisar ahora</button></div>
      <p class="muted small">Se revisan solas cuando abrís esta página (como mucho cada 6 horas) y quedan guardadas en este dispositivo. Si bajan más de 3 %, te avisamos.</p>
      ${list.map((a, i) => { const cur = a.cur ?? a.price; const d = Math.round((cur / a.price - 1) * 100); const st = d <= -3 ? "down" : d >= 3 ? "up" : "eq";
        return `<div class="al-row ${st}">${a.img ? `<img src="${a.img}" alt="" loading="lazy">` : `<span class="al-ph">${ic("tag")}</span>`}<div class="al-txt"><b>${esc(a.name)}</b><small>${esc(a.store)} · seguido desde el ${esc(a.at.split("-").reverse().join("/"))} a <span data-ars="${a.price}"></span>${a.miss ? " · hoy no apareció en la búsqueda" : ""}</small>${a.best ? `<small class="al-alt">Más barato ahora: ${esc(a.best.store)} a <a href="${a.best.link}" target="_blank" rel="noopener" data-ars="${a.best.price}"></a></small>` : ""}</div>
          <div class="al-price"><b data-ars="${cur}"></b>${st === "eq" ? `<em>sin cambios</em>` : `<em>${d > 0 ? "▲" : "▼"} ${Math.abs(d)} %</em>`}</div><div class="al-act"><a class="mini-btn" href="${a.link}" target="_blank" rel="noopener">Ver</a><button class="mini-btn" data-unalert="${i}" aria-label="Dejar de seguir">${ic("x")}</button></div></div>`; }).join("")}</div>`;
    renderMoney();
  }
  async function checkAlerts(force) {
    const list = getAlerts(); if (!list.length || !CFG.priceApi) return;
    const last = +localStorage.getItem("alertasCheck") || 0; if (!force && Date.now() - last < 6 * 36e5) return;
    localStorage.setItem("alertasCheck", String(Date.now())); $("#alCheck") && ($("#alCheck").disabled = true);
    const bajas = [];
    for (const q of [...new Set(list.map((a) => a.q))].slice(0, 8)) {
      try {
        const rs = (await (await fetch(`${CFG.priceApi.replace(/\/$/, "")}/search?q=${encodeURIComponent(q)}`)).json()).results || [];
        list.filter((a) => a.q === q).forEach((a) => {
          const same = rs.find((r) => r.link === a.link) || rs.find((r) => r.store === a.store && normA(r.name) === normA(a.name));
          a.miss = !same; if (same) { if (same.price < (a.cur ?? a.price) * 0.97 && same.price < a.price * 0.97) bajas.push(a); a.cur = same.price; a.curAt = new Date().toISOString(); }
          const alt = matchQ(q, rs).find((r) => r.link !== a.link); a.best = alt && alt.price < (a.cur ?? a.price) * 0.97 ? { store: alt.store, price: alt.price, link: alt.link, name: alt.name } : null;
        });
      } catch (e) {}
    }
    setAlerts(list); renderAlerts();
    if (bajas.length) {
      const txt = `${bajas[0].name} (${bajas[0].store})${bajas.length > 1 ? ` y ${bajas.length - 1} más` : ""}`;
      toastG("Bajó el precio de " + txt + ".");
      try { if ("Notification" in window && Notification.permission === "granted") new Notification("Bajó un precio que seguís", { body: txt, icon: "img/icons/icon-192.png", tag: "precios" }); } catch (e) {}
    }
  }
  if (page === "supermercados" && $("#alertasBox")) {
    renderAlerts(); checkAlerts(false);
    $("#alertasBox").addEventListener("click", (e) => {
      if (e.target.closest("#alCheck")) { checkAlerts(true); return; }
      const u = e.target.closest("[data-unalert]"); if (u) { const l = getAlerts(); l.splice(+u.dataset.unalert, 1); setAlerts(l); renderAlerts(); }
    });
    $("#buscarRes").addEventListener("click", (e) => {
      const b = e.target.closest("[data-track]"); if (!b || !window.__lastRows) return; e.preventDefault();
      const r = window.__lastRows[+b.dataset.track]; const l = getAlerts();
      if (l.some((a) => a.link === r.link)) { toastG("Ya seguís ese producto: está en «Mis alertas de precio»."); return; }
      l.unshift({ q: window.__lastQ, name: r.name, store: r.store, price: r.price, unit: r.unit, link: r.link, img: r.img || null, at: todayISO }); setAlerts(l.slice(0, 20)); renderAlerts();
      b.classList.add("on"); b.setAttribute("aria-pressed", "true");
      toastG(`Listo: te avisamos si ${r.name.length > 40 ? "ese producto" : "«" + r.name + "»"} baja en ${r.store}.`);
      try { if ("Notification" in window && Notification.permission === "default" && standalone) Notification.requestPermission(); } catch (er) {}
    });
  }

  // ---------- volver arriba (páginas largas) ----------
  const top = document.createElement("button"); top.className = "to-top"; top.type = "button"; top.setAttribute("aria-label", "Volver arriba"); top.innerHTML = ic("arrowup"); top.hidden = true; document.body.appendChild(top);
  top.addEventListener("click", () => window.scrollTo({ top: 0, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }));
  window.addEventListener("scroll", () => { const on = window.scrollY > 1400; if (top.hidden === on) top.hidden = !on; }, { passive: true });

  window.renderMoney = renderMoney; window.toastG = toastG;
  renderMoney(); liveRates(); animateIn();
  new MutationObserver(() => { clearTimeout(window.__ai); window.__ai = setTimeout(animateIn, 30); }).observe(document.body, { childList: true, subtree: true });
})();
