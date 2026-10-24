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
    if (state.cur === "ARS") return "$ " + Math.round(v).toLocaleString("es-AR");
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
    if ($("#rUsd")) $("#rUsd").textContent = "$ " + (state.mode === "blue" ? rates.usd_blue : rates.usd_oficial).toLocaleString("es-AR");
    if ($("#rEur")) $("#rEur").textContent = "$ " + (state.mode === "blue" ? rates.eur_blue : rates.eur_oficial).toLocaleString("es-AR");
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
    const nutLine = n.kcal ? `<div class="nut-line">${ic("flame")} <b>${Math.round(n.kcal)} kcal</b> · ${n.prot} g proteínas · ${n.carb} g carbohidratos${n.sug != null ? ` (${n.sug} g azúcar)` : ""} · ${n.fat} g grasas${n.sat != null ? ` (${n.sat} g sat.)` : ""} · ${n.fib} g fibra · ${n.sal} g sal <small>por porción${n.source === "ingredientes" ? ", calculado con los ingredientes" : ", estimado"}</small></div>` : "";
    $("#modalContent").innerHTML = `
      <img class="rm-img" src="${r.img}"${r.srcset ? ` srcset="${r.srcset}" sizes="(max-width:720px) 100vw, 640px"` : ""} alt="${esc(r.name)}">
      <div class="rm">
        <h2>${esc(r.name)}</h2>
        ${r.custom ? `<p class="muted small">Receta de la comunidad, creada por <b>${esc(r.ownerName)}</b>.</p>` : ""}
        <div class="meta"><span>${ic("clock")}<b>${r.tiempo} min</b></span><span>${ic("plate")}<b>${r.porciones} ${r.porciones === 1 ? "porción" : "porciones"}</b></span>${r.cost ? `<span>${ic("tag")}<b data-ars="${r.cost}"></b> aprox./porción</span>` : ""}</div>
        ${nutLine}
        <div class="rm-actions">${r.pasos.length ? `<button class="btn small-btn" type="button" data-cook="${r.id}">${ic("play")} Modo cocina</button>` : ""}<a class="mini-btn" href="mi-plan.html?add=${encodeURIComponent(r.id)}">${ic("calendar")} Agregar a mi plan</a></div>
        ${r.ut?.length ? `<div class="rm-ut"><h3>Utensilios</h3>${utHtml(r)}</div>` : ""}
        <div class="rm-cols">
          <div><h3 class="ing-h">Ingredientes <span class="rm-porc"><button type="button" data-porc="-1" aria-label="Una porción menos">−</button><b id="porcN">${r.porciones}</b><small>${r.porciones === 1 ? "porción" : "porc."}</small><button type="button" data-porc="1" aria-label="Una porción más">+</button></span></h3><ul id="ingList">${ingHtml(r, 1)}</ul></div>
          <div><h3>Preparación</h3>${r.pasos.length ? `<ol>${r.pasos.map((p) => `<li>${esc(p)}</li>`).join("")}</ol>` : `<p class="muted">Sin pasos cargados.</p>`}${r.tip ? `<div class="tip">${ic("bulb")} ${esc(r.tip)}</div>` : ""}</div>
        </div>
        ${r.yt ? `<div class="yt"><h3>Video</h3><button class="yt-thumb" data-yt="${r.yt}" aria-label="Reproducir video"><img src="https://i.ytimg.com/vi/${r.yt}/hqdefault.jpg" alt="" loading="lazy"></button></div>` : ""}
        ${r.credit ? `<p class="credit">Foto: <a href="${r.credit.page}" target="_blank" rel="noopener">${esc(r.credit.title)}</a> · ${esc(r.credit.artist || "Wikimedia Commons")} · ${esc(r.credit.license)} (Wikimedia Commons). El costo se calcula con precios de supermercados online de Buenos Aires de octubre 2026 y es orientativo.</p>` : ""}
      </div>`;
    curRec = r; curPorc = r.porciones; modal.classList.remove("closing");
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
  function closeCook() { if (!cookEl) return; timers.forEach(clearInterval); timers = []; cookEl.remove(); cookEl = null; if (modal.hidden) document.body.style.overflow = ""; try { wake?.release(); } catch (e) {} wake = null; }
  function openCook(id) {
    const r = R[id]; if (!r || !r.pasos.length) return; closeCook(); let k = 0;
    const f = curRec === r ? curPorc / r.porciones : 1;
    cookEl = document.createElement("div"); cookEl.className = "cook"; cookEl.setAttribute("role", "dialog"); cookEl.setAttribute("aria-label", "Modo cocina: " + r.name);
    cookEl.innerHTML = `<header class="cook-top"><div><small>Modo cocina</small><b>${esc(r.name)}</b></div><button class="cook-x" aria-label="Salir del modo cocina">×</button></header>
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
    };
    const go = (d) => { if (d > 0 && k === r.pasos.length - 1) { closeCook(); toastG("¡Buen provecho!"); return; } const nk = Math.max(0, Math.min(r.pasos.length - 1, k + d)); if (nk === k) return; k = nk; show(d); };
    cookEl.addEventListener("click", (e) => {
      if (e.target.closest(".cook-x")) { closeCook(); return; }
      if (e.target.closest("[data-cnext]")) go(1); else if (e.target.closest("[data-cprev]")) go(-1);
      const tb = e.target.closest(".cook-timer"); if (tb && !tb.dataset.run) startTimer(tb);
    });
    let x0 = null; cookEl.addEventListener("touchstart", (e) => { if (!e.target.closest("details")) x0 = e.touches[0].clientX; }, { passive: true });
    cookEl.addEventListener("touchend", (e) => { if (x0 == null) return; const dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 60) go(dx < 0 ? 1 : -1); x0 = null; });
    show(1);
  }
  document.addEventListener("keydown", (e) => { if (!cookEl) return; if (e.key === "ArrowRight") cookEl.querySelector("[data-cnext]").click(); if (e.key === "ArrowLeft" && !cookEl.querySelector("[data-cprev]").disabled) cookEl.querySelector("[data-cprev]").click(); if (e.key === "Escape") closeCook(); });


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
    week.days.forEach((d) => ["desayuno", "almuerzo", "cena"].forEach((s) => (R[d[s]]?.ing || []).forEach((i) => { if (i.c === "pantry") return; const k = `${i.c}|${i.n}|${i.u}`; agg.set(k, (agg.get(k) || 0) + i.q); })));
    [["lact|yogur natural (pote)|u", 2], ["verd|fruta de estación (manzana, naranja, banana)|u", 4], ["pan|pan integral (rodajas)|u", 4]].forEach(([k, q]) => agg.set(k, (agg.get(k) || 0) + q));  // meriendas
    const fmtq = (q, u) => { q = Math.round(q * 10) / 10; if ((u === "g" || u === "ml") && q >= 1000) return `${q / 1000} ${u === "g" ? "kg" : "L"}`; return u === "u" ? `${q} u` : `${q} ${u}`; };
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
    if (vid && window.matchMedia("(max-width: 720px)").matches) { vid.poster = "media/intro-vertical-poster.jpg"; vid.querySelector("source").src = "media/intro-vertical.mp4"; vid.classList.add("vertical"); vid.load(); }
    const d = houseDay(todayISO);
    $("#today").innerHTML = `<div class="t-head"><p class="kicker">Menú de hoy</p><h3>${"Hoy, " + longDate(d.date)}</h3></div>
      ${["desayuno", "almuerzo", "cena"].map((m) => `<div class="t-row"><small>${ICON[m]} ${m}</small>${mealBtn(d[m])}</div>`).join("")}
      <div class="t-row mer"><small>${ICON.merienda} merienda</small><span class="muted">${esc(d.merienda)}</span></div>
      <a class="btn small-btn" href="plan.html">Ver la semana →</a><a class="mini-btn" href="plan.html?dia=${addDays(todayISO, 1)}">${ic("arrow")} Mañana: ${esc(R[houseDay(addDays(todayISO, 1)).almuerzo].name)}</a>`;
  }

  // ---------- plan: calendario + semana ----------
  function renderWeekTabs(containerId, onPick) {
    const c = $(containerId); if (!c) return; c.innerHTML = "";
    D.weeks.forEach((w) => {
      const b = document.createElement("button"); const t = weekTag(w); b.innerHTML = (t ? `<small>${t} · </small>` : "") + esc(w.label); b.classList.toggle("on", w.start === state.week);
      b.addEventListener("click", () => { state.week = w.start; vt(onPick); b.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" }); }); c.appendChild(b);
    });
  }
  function renderCalendar() {
    const c = $("#calendar"); if (!c) return;
    let html = `<div class="cal-head">${DOWS.map((d) => `<div>${d}</div>`).join("")}</div>`;
    D.weeks.forEach((w) => {
      html += `<div class="cal-week-label"><span>${weekTag(w) ? weekTag(w) + " · " : ""}${esc(w.label)}</span><a class="mini-btn" href="compras.html#semana-${w.start}">${ic("compras")} Lista de compras de esta semana</a></div>`;
      html += `<div class="cal-row">` + w.days.map((d) => {
        const n = +d.date.slice(8), m = +d.date.slice(5, 7); const out = d.date.slice(0, 7) !== state.ym;
        return `<div class="cal-cell${d.date === todayISO ? " today" : ""}${d.dow === "Sábado" || d.dow === "Domingo" ? " wk" : ""}${out ? " out" : ""}">
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
      <tr><td class="day${d.date === todayISO ? " today" : ""}">${d.dow}<span>${lab(d.date)}</span></td>
        <td>${mealBtn(d.desayuno)}</td><td>${mealBtn(d.almuerzo)}</td><td class="muted">${esc(d.merienda)}</td><td>${mealBtn(d.cena)}</td></tr>`).join("");
    $("#planCards").innerHTML = w.days.map((d) => `
      <article class="dc${d.date === todayISO ? " today" : ""}"><h4>${esc(d.label)}${d.date === todayISO ? ' <span class="hoy">hoy</span>' : ""}</h4>
        <div class="row"><small>Desayuno</small>${mealBtn(d.desayuno)}</div><div class="row"><small>Almuerzo</small>${mealBtn(d.almuerzo)}</div>
        <div class="row"><small>Merienda</small><span class="muted">${esc(d.merienda)}</span></div><div class="row"><small>Cena</small>${mealBtn(d.cena)}</div></article>`).join("");
  }
  if (page === "plan") {
    const qs = new URLSearchParams(location.search); const want = qs.get("semana") || qs.get("dia");
    state.ym = (want || todayISO).slice(0, 7); state.week = mondayOf(want || todayISO);
    const renderPlanPage = () => {
      D.weeks = monthWeeks(state.ym); if (!D.weeks.some((w) => w.start === state.week)) state.week = D.weeks[0].start;
      $("#monthLabel").textContent = monthLabel(state.ym); renderCalendar(); renderWeek();
    };
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
    { id: "desayunos", t: "Desayunos", d: "Cuatro opciones que rotan toda la semana: dos sin cocción, dos con sartén. Entre 5 y 15 minutos.", ids: ["tostadas", "yogur", "revueltos", "panqueques"] },
    { id: "rapidas", t: "Rápidas para la semana", d: "Listas en 25 minutos o menos, con una sartén o sin cocinar. Las cenas de lunes a viernes.", ids: ["merluza", "atun", "omelette", "wok", "wrap", "garbanzos", "gramajo"] },
    { id: "horno", t: "Al horno, una sola fuente", d: "Se arman en 10 minutos y el horno hace el resto. Conviene hacer el doble: lo que sobra es la vianda del día siguiente.", ids: ["pollohorno", "milanesas", "tarta", "salmon", "pescadohorno", "berenjenas", "hamburguesas"] },
    { id: "ollas", t: "Ollas, guisos y arroces", d: "Las más económicas, las que mejor rinden y las que mejor se congelan en porciones.", ids: ["sopa", "lentejas", "curry", "arrozpollo", "albondigas"] },
    { id: "clasicos", t: "Clásicos argentinos y pastas del finde", d: "Llevan más tiempo y más mesa: quedan para sábado y domingo (y los ñoquis, para el 29).", ids: ["empanadas", "bife", "zapallitos", "pastel", "noquis", "tortilla", "carbonara"] },
  ];
  function card(r) {
    return `<button class="rc" data-rec="${r.id}"><img src="${r.img}"${srcs(r)} alt="${esc(r.name)}" loading="lazy"><div class="b"><h4>${esc(r.name)}</h4>
      <div class="meta"><span>${ic("clock")}<b>${r.tiempo} min</b></span><span>${ic("flame")}<b>${r.kcal}</b> kcal</span><span>${ic("tag")}<b data-ars="${r.cost}"></b>/porción</span></div>
      <div>${r.tags.map((t) => `<span class="tag">${esc(t)}</span>`).join("")}</div></div></button>`;
  }
  if (page === "recetas") {
    const h1 = $(".page-head h1"); if (h1) h1.innerHTML = `${Object.keys(R).length} recetas, <mark>cinco categorías</mark>`;
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
  function renderShopping() {
    if (!$("#shopGrid")) return;
    renderWeekTabs("#shopTabs", renderShopping);
    const w = D.weeks.find((x) => x.start === state.week) || D.weeks[0], list = shoppingFor(w);
    window.__shop = { label: "Lista de compras · " + w.label, start: w.start, list }; window.dispatchEvent(new Event("shoplist"));
    const n = list.reduce((a, c) => a + c.items.length, 0);
    const key = (c, nm) => `shop:${w.start}:${c}:${nm}`;
    const done = list.reduce((a, c) => a + c.items.filter((i) => localStorage.getItem(key(c.cat, i.n)) === "1").length, 0);
    $("#shopSummary").innerHTML = `<div class="card ss"><div><b>${weekTag(w) ? weekTag(w) + " · " : ""}${esc(w.label)}</b><span class="muted"> · ${n} productos en ${list.length} góndolas · ${done} tildados</span></div><div class="ss-actions"><a class="mini-btn" href="plan.html?semana=${w.start}">${ic("calendar")} ver esa semana</a><a class="mini-btn" href="supermercados.html">${ic("super")} dónde pedir</a><button class="mini-btn" id="copyList">${ic("copy")} Copiar lista</button><button class="mini-btn" id="dlList">${ic("external")} Bajar con enlaces</button>${navigator.share ? `<button class="mini-btn" id="shareList">${ic("external")} Compartir</button>` : ""}<button class="mini-btn" id="printList">${ic("printer")} Imprimir</button><button class="mini-btn" id="clearWeek">${ic("refresh")} destildar todo</button></div></div>`;
    $("#printList")?.addEventListener("click", () => window.print());
    $("#clearWeek").addEventListener("click", () => { list.forEach((c) => c.items.forEach((i) => localStorage.removeItem(key(c.cat, i.n)))); renderShopping(); });
    // texto plano de la lista (solo lo que falta comprar; si no hay nada tildado, todo) para pegar en Notas o WhatsApp
    const listText = () => {
      const anyDone = list.some((c) => c.items.some((i) => localStorage.getItem(key(c.cat, i.n)) === "1"));
      const lines = ["Lista de compras · " + w.label, ""];
      list.forEach((c) => {
        const items = c.items.filter((i) => !anyDone || localStorage.getItem(key(c.cat, i.n)) !== "1");
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
    $("#dlList").addEventListener("click", () => window.downloadListHtml("Lista de compras · " + w.label, list, `lista-compras-${w.start}.html`));
    $("#copyList").addEventListener("click", async () => {
      const { text, partial } = listText();
      const ok = await copyText(text);
      toast(ok ? (partial ? "Lista copiada (solo lo que falta). Pegala en Notas o WhatsApp." : "Lista copiada. Pegala en Notas o WhatsApp.") : "No se pudo copiar: mantené apretado para seleccionar.");
    });
    $("#shareList")?.addEventListener("click", async () => {
      const { text } = listText();
      try { await navigator.share({ title: "Lista de compras · " + w.label, text }); } catch (e) { if (e && e.name !== "AbortError") { await copyText(text); toast("Lista copiada."); } }
    });
    $("#shopGrid").innerHTML = list.map((cat) => `<div class="shop-cat"><h4>${esc(cat.cat)} <small>${cat.items.length}</small></h4>
      ${cat.items.map((i) => { const dn = localStorage.getItem(key(cat.cat, i.n)) === "1"; return `<label class="${dn ? "done" : ""}"><input type="checkbox" data-k="${esc(key(cat.cat, i.n))}" ${dn ? "checked" : ""}><span>${esc(i.n)}</span><em class="q">${esc(i.q)}</em></label>`; }).join("")}</div>`).join("");
    $("#pantryList").innerHTML = D.pantry.map((p) => `<li>${esc(p)}</li>`).join("");
  }
  if (page === "compras") {
    const h = location.hash.match(/semana-(\d{4}-\d{2}-\d{2})/); const base = mondayOf(todayISO);
    state.week = h ? mondayOf(h[1]) : base;
    D.weeks = [-1, 0, 1, 2, 3].map((i) => weekAt(addDays(base, i * 7)));
    if (!D.weeks.some((w) => w.start === state.week)) { D.weeks.push(weekAt(state.week)); D.weeks.sort((a, b) => a.start.localeCompare(b.start)); }
    renderShopping();
    $("#shopGrid").addEventListener("change", (e) => {
      const cb = e.target; if (cb.type !== "checkbox") return;
      localStorage.setItem(cb.dataset.k, cb.checked ? "1" : "0"); cb.closest("label").classList.toggle("done", cb.checked);
      const s = $("#shopSummary .muted"); if (s) { const w = D.weeks.find((x) => x.start === state.week); const list = shoppingFor(w); const key = (c, nm) => `shop:${w.start}:${c}:${nm}`; const done = list.reduce((a, c) => a + c.items.filter((i) => localStorage.getItem(key(c.cat, i.n)) === "1").length, 0); s.textContent = s.textContent.replace(/\d+ tildados/, done + " tildados"); }
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
        <li><b>Reposición de la semana:</b> Día (mínimo bajo, $ 12.000, y marca propia barata) o el Disco / Coto que tengas a dos cuadras, para frescos y verdura.</li>
        <li><b>Si pedís seguido en Jumbo o Disco:</b> Jumbo Prime ($ 5.500/mes) se paga solo con dos pedidos de más de $ 60.000, porque cada envío sale $ 3.999.</li>
        <li><b>Coto</b> pide $ 30.000 de mínimo para enviar: sirve para la compra grande, no para reponer. ${esc(second)} es la segunda opción en precio.</li>
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
  function getApp() {
    $("#moreMenu") && ($("#moreMenu").hidden = true);
    if (!isIOS) { const a = document.createElement("a"); a.href = APK; a.download = "menuario.apk"; document.body.appendChild(a); a.click(); a.remove(); }
    let sh = $("#appSheet");
    if (!sh) { sh = document.createElement("div"); sh.id = "appSheet"; sh.className = "share-sheet app-sheet"; document.body.appendChild(sh); }
    const steps = (l) => `<ol class="as-steps">${l.map((t, i) => `<li><span>${i + 1}</span><p>${t}</p></li>`).join("")}</ol>`;
    const desk = !isIOS && !isAndroid;
    sh.innerHTML = `<div class="sh-bg" data-shx></div><div class="sh-box as-box" role="dialog" aria-modal="true" aria-labelledby="asT">
      <button class="as-x" type="button" data-shx aria-label="Cerrar">×</button>
      <span class="as-ico"><img src="img/icons/icon-192.png" alt="" width="64" height="64"></span>
      ${isIOS ? `<h3 id="asT">Agregá Menuario a tu inicio</h3><p class="muted small">En iPhone no hace falta bajar nada: queda como una app desde Safari.</p>
        ${steps(["Abrí esta página en <b>Safari</b>.", "Tocá <b>Compartir</b>, el cuadrado con la flecha para arriba.", "Elegí <b>«Agregar a inicio»</b> y después <b>Agregar</b>."])}`
      : desk ? `<h3 id="asT">Se está bajando Menuario</h3><p class="muted small">El archivo es para teléfonos Android. Lo más fácil: escaneá el código con el teléfono y bajala ahí.</p>
        <img class="as-qr" src="img/qr-app.svg" width="150" height="150" alt="Código QR para abrir la página en el teléfono">
        ${installEvt ? `<button class="btn ghost as-pwa" type="button" data-pwa>También podés instalarla en esta compu</button>` : ""}`
      : `<h3 id="asT">Se está bajando Menuario</h3><p class="muted small">Pesa poco más de 1 MB. Cuando termine:</p>
        ${steps(["Abrí <b>menuario.apk</b> desde la notificación o desde Descargas.", "Si te pide permiso para «instalar apps desconocidas», dáselo al navegador.", "Tocá <b>Instalar</b>. El ícono aparece en tu pantalla de inicio."])}`}
      <div class="as-act">${isIOS ? "" : `<a class="mini-btn" href="${APK}" download="menuario.apk">${ic("download")} Bajar de nuevo</a>`}<button class="btn" type="button" data-shx>Listo</button></div>
    </div>`;
    sh.hidden = false; document.body.classList.add("no-scroll");
    const close = () => { sh.hidden = true; document.body.classList.remove("no-scroll"); };
    sh.onclick = async (e) => {
      if (e.target.closest("[data-shx]")) return close();
      if (e.target.closest("[data-pwa]") && installEvt) { installEvt.prompt(); const r = await installEvt.userChoice.catch(() => null); installEvt = null; if (r?.outcome === "accepted") { showInstall(false); close(); } }
    };
    sh.onkeydown = (e) => { if (e.key === "Escape") close(); };
    sh.querySelector(".as-x").focus();
  }
  document.addEventListener("click", (e) => { if (e.target.closest(".install-btn, [data-get-app]")) { e.preventDefault(); getApp(); } });
  const net = () => {
    let p = $("#netPill"); if (navigator.onLine) { if (p) { p.classList.add("back"); setTimeout(() => p.remove(), 1200); } return; }
    if (!p) { p = document.createElement("div"); p.id = "netPill"; p.className = "net-pill"; p.setAttribute("role", "status"); p.innerHTML = `${ic("refresh")} Sin conexión: ves lo último guardado`; document.body.appendChild(p); }
  };
  window.addEventListener("online", net); window.addEventListener("offline", net); net();

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
