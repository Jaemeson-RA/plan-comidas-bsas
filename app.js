/* Plan de comidas · Buenos Aires — lógica de la página */
(function () {
  const D = window.DATA;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // ---------- moneda ----------
  const state = { cur: localStorage.getItem("cur") || "ARS", mode: localStorage.getItem("mode") || "blue", week: 1, filter: "all" };
  const rates = Object.assign({}, D.rates); // valores de respaldo, se actualizan en vivo
  function rate() {
    if (state.cur === "ARS") return 1;
    if (state.cur === "USD") return state.mode === "blue" ? rates.usd_blue : rates.usd_oficial;
    return state.mode === "blue" ? rates.eur_blue : rates.eur_oficial;
  }
  function fmt(ars, opts = {}) {
    const v = ars / rate();
    if (state.cur === "ARS") return "$ " + Math.round(v).toLocaleString("es-AR");
    const sym = state.cur === "USD" ? "US$ " : "€ ";
    const dec = v < 20 ? 2 : v < 200 ? 1 : 0;
    return sym + v.toLocaleString("es-AR", { minimumFractionDigits: dec, maximumFractionDigits: dec });
  }
  function renderMoney() {
    $$("[data-ars]").forEach((el) => { el.textContent = fmt(+el.dataset.ars); });
    $("#rUsd").textContent = "$ " + (state.mode === "blue" ? rates.usd_blue : rates.usd_oficial).toLocaleString("es-AR");
    $("#rEur").textContent = "$ " + (state.mode === "blue" ? rates.eur_blue : rates.eur_oficial).toLocaleString("es-AR");
  }
  $("#curSeg").addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    state.cur = b.dataset.cur; localStorage.setItem("cur", state.cur);
    $$("#curSeg button").forEach((x) => x.classList.toggle("on", x === b));
    renderMoney();
  });
  $("#modeSeg").addEventListener("click", (e) => {
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
      note.textContent = "En vivo · dolarapi.com · " + d.toLocaleDateString("es-AR") + " " + d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }) + " · venta. Euro blue estimado con la relación EUR/USD oficial.";
    } catch (e) {
      note.textContent = "Sin conexión con dolarapi.com: se usan las cotizaciones del " + D.rates.date + " (venta).";
    }
    renderMoney();
  }

  // ---------- helpers de receta ----------
  const R = D.recipes;
  const isToday = (iso) => iso === new Date().toISOString().slice(0, 10);
  function mealBtn(id) {
    const r = R[id];
    return `<button class="meal" data-rec="${id}"><img src="${r.img}" alt="" loading="lazy"><span>${esc(r.name)}</span></button>`;
  }

  // ---------- plan ----------
  function renderWeekTabs(containerId, onPick) {
    const c = $(containerId); c.innerHTML = "";
    D.weeks.forEach((w) => {
      const b = document.createElement("button"); b.textContent = w.label; b.dataset.w = w.n;
      b.classList.toggle("on", w.n === state.week);
      b.addEventListener("click", () => { state.week = w.n; onPick(); });
      c.appendChild(b);
    });
  }
  function renderPlan() {
    renderWeekTabs("#weekTabs", renderAll);
    const w = D.weeks[state.week - 1];
    $("#planTable tbody").innerHTML = w.days.map((d) => `
      <tr>
        <td class="day${isToday(d.date) ? " today" : ""}">${d.dow}<span>${d.label.replace(d.dow + " ", "")}</span></td>
        <td>${mealBtn(d.desayuno)}</td>
        <td>${mealBtn(d.almuerzo)}</td>
        <td class="muted">${esc(d.merienda)}</td>
        <td>${mealBtn(d.cena)}</td>
      </tr>`).join("");
    $("#planCards").innerHTML = w.days.map((d) => `
      <article class="dc${isToday(d.date) ? " today" : ""}">
        <h4>${esc(d.label)}</h4>
        <div class="row"><small>Desayuno</small>${mealBtn(d.desayuno)}</div>
        <div class="row"><small>Almuerzo</small>${mealBtn(d.almuerzo)}</div>
        <div class="row"><small>Merienda</small><span class="muted">${esc(d.merienda)}</span></div>
        <div class="row"><small>Cena</small>${mealBtn(d.cena)}</div>
      </article>`).join("");
  }

  // ---------- recetas ----------
  function matches(r) {
    const f = state.filter;
    if (f === "all") return true;
    if (f === "desayuno" || f === "plato") return r.tipo === f;
    if (f === "rápido") return r.tiempo <= 20;
    if (f === "económico") return r.cost <= 2500;
    return true;
  }
  function renderRecipes() {
    const order = Object.values(R).sort((a, b) => (a.tipo === b.tipo ? a.tiempo - b.tiempo : a.tipo === "desayuno" ? -1 : 1));
    $("#recGrid").innerHTML = order.filter(matches).map((r) => `
      <button class="rc" data-rec="${r.id}">
        <img src="${r.img}" alt="${esc(r.name)}" loading="lazy">
        <div class="b">
          <h4>${esc(r.name)}</h4>
          <div class="meta"><span>⏱ <b>${r.tiempo} min</b></span><span>🔥 <b>${r.kcal}</b> kcal</span><span>💸 <b data-ars="${r.cost}"></b>/porción</span></div>
          <div>${r.tipo === "desayuno" ? '<span class="tag des">desayuno</span>' : ""}${r.tags.map((t) => `<span class="tag">${esc(t)}</span>`).join("")}</div>
        </div>
      </button>`).join("");
    renderMoney();
  }
  $("#recChips").addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    state.filter = b.dataset.f;
    $$("#recChips button").forEach((x) => x.classList.toggle("on", x === b));
    renderRecipes();
  });

  // ---------- modal ----------
  const modal = $("#modal");
  function qty(i) {
    const q = i.q, u = i.u;
    const n = Number.isInteger(q) ? q : q.toLocaleString("es-AR");
    if (u === "u") return n;
    if (u === "pizca") return "";
    return n + " " + u;
  }
  function openRecipe(id) {
    const r = R[id];
    $("#modalContent").innerHTML = `
      <img class="rm-img" src="${r.img}" alt="${esc(r.name)}">
      <div class="rm">
        <h2>${esc(r.name)}</h2>
        <div class="meta"><span>⏱ <b>${r.tiempo} min</b></span><span>🍽 <b>${r.porciones} porciones</b></span><span>🔥 <b>${r.kcal} kcal</b> aprox./porción</span><span>💸 <b data-ars="${r.cost}"></b> aprox./porción</span></div>
        <div class="rm-cols">
          <div>
            <h3>Ingredientes</h3>
            <ul>${r.ing.map((i) => `<li>${qty(i) ? `<b>${qty(i)}</b> ` : ""}${esc(i.n)}</li>`).join("")}</ul>
          </div>
          <div>
            <h3>Preparación</h3>
            <ol>${r.pasos.map((p) => `<li>${esc(p)}</li>`).join("")}</ol>
            <div class="tip">💡 ${esc(r.tip)}</div>
          </div>
        </div>
        <div class="yt">
          <h3>Video</h3>
          <button class="yt-thumb" data-yt="${r.yt}" aria-label="Reproducir video"><img src="https://i.ytimg.com/vi/${r.yt}/hqdefault.jpg" alt="" loading="lazy"></button>
        </div>
        <p class="credit">Foto: <a href="${r.credit.page}" target="_blank" rel="noopener">${esc(r.credit.title)}</a> · ${esc(r.credit.artist || "Wikimedia Commons")} · ${esc(r.credit.license)} (Wikimedia Commons). El costo se calcula con precios de supermercados online de Buenos Aires de octubre 2026 y es orientativo.</p>
      </div>`;
    modal.hidden = false; document.body.style.overflow = "hidden";
    $(".modal-box").scrollTop = 0;
    renderMoney();
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

  // ---------- compras ----------
  function renderShopping() {
    renderWeekTabs("#shopTabs", renderAll);
    const list = D.shopping[state.week];
    const key = (c, n) => `shop:${state.week}:${c}:${n}`;
    $("#shopGrid").innerHTML = list.map((cat) => `
      <div class="shop-cat"><h4>${esc(cat.cat)}</h4>
        ${cat.items.map((i) => { const done = localStorage.getItem(key(cat.cat, i.n)) === "1"; return `
        <label class="${done ? "done" : ""}"><input type="checkbox" data-k="${esc(key(cat.cat, i.n))}" ${done ? "checked" : ""}><span>${esc(i.n)}</span><em class="q">${esc(i.q)}</em></label>`; }).join("")}
      </div>`).join("");
    $("#pantryList").innerHTML = D.pantry.map((p) => `<li>${esc(p)}</li>`).join("");
  }
  $("#shopGrid").addEventListener("change", (e) => {
    const cb = e.target; if (cb.type !== "checkbox") return;
    localStorage.setItem(cb.dataset.k, cb.checked ? "1" : "0");
    cb.closest("label").classList.toggle("done", cb.checked);
  });

  // ---------- supermercados ----------
  const B = D.basket;
  const siteNames = Object.keys(B.sites);
  const totals = siteNames.map((s) => ({ s, t: B.totals[s] })).sort((a, b) => a.t - b.t);
  function renderStores() {
    $("#basketDate").textContent = B.date.split("-").reverse().join("/");
    const max = totals[totals.length - 1].t, min = totals[0].t;
    $("#ranking").innerHTML = `<h3>Ranking del changuito semanal (20 productos)</h3>
      <p class="muted small">Mismo changuito en las 7 cadenas, sin contar el envío. Diferencia entre la más barata y la más cara: <b data-ars="${max - min}"></b> (${Math.round((max / min - 1) * 100)} %).</p>
      ${totals.map((x, i) => `<div class="rank-row${i === 0 ? " best" : ""}"><span class="n">${i + 1}. ${esc(x.s)}</span><div class="bar"><i style="width:${Math.round(x.t / max * 100)}%"></i></div><span class="v"><span data-ars="${x.t}"></span><small>${i === 0 ? "la más barata" : "+" + Math.round((x.t / min - 1) * 100) + " %"}</small></span></div>`).join("")}`;
    const pos = Object.fromEntries(totals.map((x, i) => [x.s, i + 1]));
    const nameMap = { carrefour: "Carrefour", dia: "Día", jumbo: "Jumbo", disco: "Disco", vea: "Vea", coto: "Coto", changomas: "ChangoMás" };
    $("#stores").innerHTML = D.stores.map((s) => {
      const key = nameMap[s.id]; const p = pos[key];
      return `<article class="store">
        <header><h4>${esc(s.name)} ${p ? `<span class="pos">#${p} en precio</span>` : ""}</h4><a href="${s.url}" target="_blank" rel="noopener">ir al sitio ↗</a></header>
        <dl>
          <div><dt>Costo de envío</dt><dd>${esc(s.envio)}</dd></div>
          <div><dt>Compra mínima</dt><dd>${esc(s.minimo)}</dd></div>
          <div><dt>Envío gratis</dt><dd>${esc(s.gratis)}</dd></div>
          <div><dt>Plazo</dt><dd>${esc(s.plazo)}</dd></div>
          <div><dt>Cobertura</dt><dd>${esc(s.cobertura)}</dd></div>
        </dl>
        <p class="nota">${esc(s.nota)} <a class="small" href="${s.fuente}" target="_blank" rel="noopener">fuente</a></p>
      </article>`; }).join("");
    $("#apps").innerHTML = D.apps.map((a) => `<article class="app"><h4><a href="${a.url}" target="_blank" rel="noopener">${esc(a.name)} ↗</a></h4><p>${esc(a.desc)}</p></article>`).join("");

    // tabla
    const cols = totals.map((x) => x.s);
    let html = `<thead><tr><th>Producto<br><span style="font-weight:500;text-transform:none;letter-spacing:0">cantidad en el changuito</span></th>${cols.map((c) => `<th>${esc(c)}</th>`).join("")}</tr></thead><tbody>`;
    B.products.forEach((p) => {
      const row = cols.map((c) => B.sites[c][p.id]);
      const best = Math.min(...row.map((x) => x.unitprice));
      html += `<tr><td>${esc(p.label)}<small>${esc(p.qtylabel)} · ${esc(row[0].ulab.replace("estimado", "por unidad"))}</small></td>` + row.map((x) => {
        const cls = x.unitprice === best ? " best" : "";
        const inner = `<span data-ars="${x.unitprice}"></span>${x.estimated ? '<span class="est">*</span>' : ""}`;
        const title = esc(x.name) + (x.raw ? ` — precio publicado: $ ${Math.round(x.raw).toLocaleString("es-AR")} ${x.rawunit === "kg" ? "por kg" : "por unidad"}` : "");
        return `<td class="${cls}" title="${title}">${x.link ? `<a href="${x.link}" target="_blank" rel="noopener">${inner}</a>` : inner}</td>`;
      }).join("") + "</tr>";
    });
    html += `</tbody><tfoot><tr><td>Total changuito semanal</td>${cols.map((c, i) => `<td class="${i === 0 ? "best" : ""}"><span data-ars="${B.totals[c]}"></span></td>`).join("")}</tr></tfoot>`;
    $("#basketTable").innerHTML = html;
  }

  // ---------- fuentes ----------
  function renderSources() {
    $("#sources").innerHTML = D.sources.map((s) => `<li>${s.u ? `<a href="${s.u}" target="_blank" rel="noopener">${esc(s.t)}</a>` : esc(s.t)}</li>`).join("");
  }

  function renderAll() { renderPlan(); renderShopping(); renderMoney(); }
  // semana actual por defecto
  const today = new Date().toISOString().slice(0, 10);
  const cur = D.weeks.find((w) => today >= w.start && today <= w.end); if (cur) state.week = cur.n;
  $("#periodLabel").textContent = D.period.label;
  renderPlan(); renderRecipes(); renderShopping(); renderStores(); renderSources(); renderMoney(); liveRates();
})();
