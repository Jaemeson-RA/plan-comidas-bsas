/* Plan de comidas · Buenos Aires — lógica compartida por todas las páginas */
(function () {
  const D = window.DATA;
  const R = D.recipes;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const page = $("main")?.dataset.page || "inicio";
  const todayISO = new Date().toISOString().slice(0, 10);
  const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  const longDate = (iso) => { const [y, m, d] = iso.split("-").map(Number); const dt = new Date(y, m - 1, d); return ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"][dt.getDay()] + " " + d + " de " + MESES[m - 1]; };

  // ---------- nav activa ----------
  $$("[data-nav]").forEach((a) => a.classList.toggle("on", a.dataset.nav === page));
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
  function renderMoney() {
    $$("[data-ars]").forEach((el) => { el.textContent = fmt(+el.dataset.ars); });
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
    return `<button class="${cls}" data-rec="${id}"><img src="${r.img}" alt="" loading="lazy"><span>${esc(r.name)}</span></button>`;
  }
  const ICON = { desayuno: "🌅", almuerzo: "☀️", merienda: "🧉", cena: "🌙" };

  // ---------- modal ----------
  const modal = $("#modal");
  function qty(i) {
    const q = i.q, u = i.u; const n = Number.isInteger(q) ? q : q.toLocaleString("es-AR");
    if (u === "u") return n; if (u === "pizca") return ""; return n + " " + u;
  }
  function openRecipe(id) {
    const r = R[id];
    $("#modalContent").innerHTML = `
      <img class="rm-img" src="${r.img}" alt="${esc(r.name)}">
      <div class="rm">
        <h2>${esc(r.name)}</h2>
        <div class="meta"><span>⏱ <b>${r.tiempo} min</b></span><span>🍽 <b>${r.porciones} porciones</b></span><span>🔥 <b>${r.kcal} kcal</b> aprox./porción</span><span>💸 <b data-ars="${r.cost}"></b> aprox./porción</span></div>
        <div class="rm-cols">
          <div><h3>Ingredientes</h3><ul>${r.ing.map((i) => `<li>${qty(i) ? `<b>${qty(i)}</b> ` : ""}${esc(i.n)}</li>`).join("")}</ul></div>
          <div><h3>Preparación</h3><ol>${r.pasos.map((p) => `<li>${esc(p)}</li>`).join("")}</ol><div class="tip">💡 ${esc(r.tip)}</div></div>
        </div>
        <div class="yt"><h3>Video</h3><button class="yt-thumb" data-yt="${r.yt}" aria-label="Reproducir video"><img src="https://i.ytimg.com/vi/${r.yt}/hqdefault.jpg" alt="" loading="lazy"></button></div>
        <p class="credit">Foto: <a href="${r.credit.page}" target="_blank" rel="noopener">${esc(r.credit.title)}</a> · ${esc(r.credit.artist || "Wikimedia Commons")} · ${esc(r.credit.license)} (Wikimedia Commons). El costo se calcula con precios de supermercados online de Buenos Aires de octubre 2026 y es orientativo.</p>
      </div>`;
    modal.hidden = false; document.body.style.overflow = "hidden"; $(".modal-box").scrollTop = 0; hidePop(); renderMoney();
  }
  function closeModal() { modal.hidden = true; document.body.style.overflow = ""; $("#modalContent").innerHTML = ""; }
  document.addEventListener("click", (e) => {
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
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !modal.hidden) closeModal(); });

  // ---------- popover (hover) ----------
  const pop = $("#pop");
  let popTimer = null;
  function showPop(el) {
    if (!pop || window.matchMedia("(hover: none)").matches) return;
    const r = R[el.dataset.rec]; if (!r) return;
    pop.innerHTML = `<img src="${r.img}" alt=""><div class="pb"><b>${esc(r.name)}</b><span>⏱ ${r.tiempo} min · 🔥 ${r.kcal} kcal · 💸 ${fmt(r.cost)}/porción</span><em>${r.tags.slice(0, 3).map(esc).join(" · ")}</em><small>clic para abrir la receta</small></div>`;
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

  // ---------- inicio ----------
  if (page === "inicio") {
    const day = D.weeks.flatMap((w) => w.days).find((d) => d.date === todayISO);
    const first = D.weeks[0].days[0];
    const d = day || first;
    const title = day ? "Hoy, " + longDate(d.date) : "El plan arranca el " + longDate(first.date);
    $("#today").innerHTML = `<p class="kicker">${day ? "Menú de hoy" : "Primer día del plan"}</p><h3>${title}</h3>
      ${["desayuno", "almuerzo", "cena"].map((m) => `<div class="t-row"><small>${ICON[m]} ${m}</small>${mealBtn(d[m])}</div>`).join("")}
      <div class="t-row"><small>🧉 merienda</small><span class="muted">${esc(d.merienda)}</span></div>
      <a class="btn small-btn" href="plan.html">Ver toda la semana →</a>`;
  }

  // ---------- plan: calendario + semana ----------
  function renderWeekTabs(containerId, onPick) {
    const c = $(containerId); if (!c) return; c.innerHTML = "";
    D.weeks.forEach((w) => {
      const b = document.createElement("button"); b.textContent = w.label; b.classList.toggle("on", w.n === state.week);
      b.addEventListener("click", () => { state.week = w.n; onPick(); }); c.appendChild(b);
    });
  }
  function renderCalendar() {
    const c = $("#calendar"); if (!c) return;
    const dows = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
    let html = `<div class="cal-head">${dows.map((d) => `<div>${d}</div>`).join("")}</div>`;
    D.weeks.forEach((w) => {
      html += `<div class="cal-week-label"><span>${esc(w.label)}</span><a class="mini-btn" href="compras.html#semana-${w.n}">🛒 Lista de compras de la semana ${w.n}</a></div>`;
      html += `<div class="cal-row">` + w.days.map((d) => {
        const n = +d.date.slice(8), m = +d.date.slice(5, 7);
        const first = n === 1 || d === D.weeks[0].days[0];
        return `<div class="cal-cell${d.date === todayISO ? " today" : ""}${d.dow === "Sábado" || d.dow === "Domingo" ? " wk" : ""}">
          <div class="cal-date"><b>${n}</b>${first ? `<span>${MESES[m - 1].slice(0, 3)}</span>` : ""}${d.date === todayISO ? `<span class="hoy">hoy</span>` : ""}</div>
          ${["desayuno", "almuerzo", "cena"].map((k) => `<button class="cm" data-rec="${d[k]}" title="${esc(R[d[k]].name)}"><i>${ICON[k]}</i><img src="${R[d[k]].img}" alt="" loading="lazy"><span>${esc(R[d[k]].name)}</span></button>`).join("")}
          <div class="cm mer"><i>🧉</i><span>${esc(d.merienda)}</span></div>
        </div>`; }).join("") + `</div>`;
    });
    c.innerHTML = html;
  }
  function renderWeek() {
    if (!$("#planTable")) return;
    renderWeekTabs("#weekTabs", renderWeek);
    const w = D.weeks[state.week - 1];
    $("#planTable tbody").innerHTML = w.days.map((d) => `
      <tr><td class="day${d.date === todayISO ? " today" : ""}">${d.dow}<span>${d.label.replace(d.dow + " ", "")}</span></td>
        <td>${mealBtn(d.desayuno)}</td><td>${mealBtn(d.almuerzo)}</td><td class="muted">${esc(d.merienda)}</td><td>${mealBtn(d.cena)}</td></tr>`).join("");
    $("#planCards").innerHTML = w.days.map((d) => `
      <article class="dc${d.date === todayISO ? " today" : ""}"><h4>${esc(d.label)}</h4>
        <div class="row"><small>Desayuno</small>${mealBtn(d.desayuno)}</div><div class="row"><small>Almuerzo</small>${mealBtn(d.almuerzo)}</div>
        <div class="row"><small>Merienda</small><span class="muted">${esc(d.merienda)}</span></div><div class="row"><small>Cena</small>${mealBtn(d.cena)}</div></article>`).join("");
  }
  if (page === "plan") {
    const cur = D.weeks.find((w) => todayISO >= w.start && todayISO <= w.end); if (cur) state.week = cur.n;
    renderCalendar(); renderWeek();
    const isMobile = window.matchMedia("(max-width: 720px)").matches;
    const setView = (v) => { $("#calendar").hidden = v !== "cal"; $("#weekView").hidden = v !== "week"; $$("#viewSeg button").forEach((b) => b.classList.toggle("on", b.dataset.view === v)); localStorage.setItem("planView", v); };
    setView(localStorage.getItem("planView") || (isMobile ? "week" : "cal"));
    $("#viewSeg").addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) setView(b.dataset.view); });
  }

  // ---------- recetas por categoría ----------
  const CATS = [
    { id: "desayunos", t: "Desayunos", d: "Cuatro opciones que rotan toda la semana: dos sin cocción, dos con sartén. Entre 5 y 15 minutos.", ids: ["tostadas", "yogur", "revueltos", "panqueques"] },
    { id: "rapidas", t: "Rápidas para la semana", d: "Listas en 25 minutos o menos, con una sartén o sin cocinar. Son las cenas de lunes a viernes.", ids: ["merluza", "atun", "omelette", "wok"] },
    { id: "horno", t: "Al horno, una sola fuente", d: "Se arman en 10 minutos y el horno hace el resto. Conviene hacer el doble: lo que sobra es la vianda del día siguiente.", ids: ["pollohorno", "milanesas", "tarta", "salmon"] },
    { id: "ollas", t: "Ollas y guisos", d: "Las más económicas y las que mejor se congelan en porciones.", ids: ["sopa", "lentejas"] },
    { id: "clasicos", t: "Clásicos argentinos del finde", d: "Llevan más tiempo y más mesa: quedan para sábado y domingo.", ids: ["empanadas", "bife", "zapallitos", "pastel"] },
  ];
  function card(r) {
    return `<button class="rc" data-rec="${r.id}"><img src="${r.img}" alt="${esc(r.name)}" loading="lazy"><div class="b"><h4>${esc(r.name)}</h4>
      <div class="meta"><span>⏱ <b>${r.tiempo} min</b></span><span>🔥 <b>${r.kcal}</b> kcal</span><span>💸 <b data-ars="${r.cost}"></b>/porción</span></div>
      <div>${r.tags.map((t) => `<span class="tag">${esc(t)}</span>`).join("")}</div></div></button>`;
  }
  if (page === "recetas") {
    $("#catNav").innerHTML = CATS.map((c) => `<a href="#${c.id}">${esc(c.t)} <small>${c.ids.length}</small></a>`).join("");
    $("#recSections").innerHTML = CATS.map((c) => `<section class="cat" id="${c.id}"><div class="cat-head"><h2>${esc(c.t)}</h2><p class="muted">${esc(c.d)}</p></div><div class="grid">${c.ids.map((id) => card(R[id])).join("")}</div></section>`).join("");
  }

  // ---------- compras ----------
  function renderShopping() {
    if (!$("#shopGrid")) return;
    renderWeekTabs("#shopTabs", renderShopping);
    const w = D.weeks[state.week - 1], list = D.shopping[state.week];
    const n = list.reduce((a, c) => a + c.items.length, 0);
    const key = (c, nm) => `shop:${state.week}:${c}:${nm}`;
    const done = list.reduce((a, c) => a + c.items.filter((i) => localStorage.getItem(key(c.cat, i.n)) === "1").length, 0);
    $("#shopSummary").innerHTML = `<div class="card ss"><div><b>${esc(w.label)}</b><span class="muted"> · ${n} productos en ${list.length} góndolas · ${done} tildados</span></div><div class="ss-actions"><a class="mini-btn" href="plan.html">📅 ver esa semana</a><a class="mini-btn" href="supermercados.html">🚚 dónde pedir</a><button class="mini-btn" id="clearWeek">↺ destildar todo</button></div></div>`;
    $("#clearWeek").addEventListener("click", () => { list.forEach((c) => c.items.forEach((i) => localStorage.removeItem(key(c.cat, i.n)))); renderShopping(); });
    $("#shopGrid").innerHTML = list.map((cat) => `<div class="shop-cat"><h4>${esc(cat.cat)} <small>${cat.items.length}</small></h4>
      ${cat.items.map((i) => { const dn = localStorage.getItem(key(cat.cat, i.n)) === "1"; return `<label class="${dn ? "done" : ""}"><input type="checkbox" data-k="${esc(key(cat.cat, i.n))}" ${dn ? "checked" : ""}><span>${esc(i.n)}</span><em class="q">${esc(i.q)}</em></label>`; }).join("")}</div>`).join("");
    $("#pantryList").innerHTML = D.pantry.map((p) => `<li>${esc(p)}</li>`).join("");
  }
  if (page === "compras") {
    const h = location.hash.match(/semana-(\d)/); const cur = D.weeks.find((w) => todayISO >= w.start && todayISO <= w.end);
    state.week = h ? +h[1] : cur ? cur.n : 1;
    renderShopping();
    $("#shopGrid").addEventListener("change", (e) => {
      const cb = e.target; if (cb.type !== "checkbox") return;
      localStorage.setItem(cb.dataset.k, cb.checked ? "1" : "0"); cb.closest("label").classList.toggle("done", cb.checked);
      const s = $("#shopSummary .muted"); if (s) { const list = D.shopping[state.week]; const key = (c, nm) => `shop:${state.week}:${c}:${nm}`; const done = list.reduce((a, c) => a + c.items.filter((i) => localStorage.getItem(key(c.cat, i.n)) === "1").length, 0); s.textContent = s.textContent.replace(/\d+ tildados/, done + " tildados"); }
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

  renderMoney(); liveRates();
})();
