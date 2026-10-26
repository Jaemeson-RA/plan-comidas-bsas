/*! Menuario · © 2026 Jaemeson Dieu · Todos los derechos reservados · ver LICENSE */
/* Ahorro: comparador de la lista en las 7 cadenas (repartir en 1, 2 o 3 súper), promos de las cadenas y mapa de sucursales.
   Páginas: compras.html (comparador), promos.html, supermercados.html (mapa). Precios en vivo vía el Worker (CONFIG.priceApi). */
(function () {
  const D = window.DATA, CFG = window.CONFIG || {}, R = D.recipes;
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const ic = (n) => `<svg class="ic"><use href="#i-${n}"/></svg>`;
  const page = $("main")?.dataset.page;
  const API = String(CFG.priceApi || "").replace(/\/$/, "");
  const STORES = ["Carrefour", "Día", "Coto", "Jumbo", "Disco", "Vea", "ChangoMás"];  // nacionales (las que tienen promos y changuito)
  const COLOR = { Carrefour: "#2A6FB8", "Día": "#D93A2B", Coto: "#8E2C48", Jumbo: "#3E9B4F", Disco: "#E58A1F", Vea: "#C99A1E", "ChangoMás": "#5B6BBF", Toledo: "#14808A", Cordiez: "#C2410C" };
  const zs = () => (window.ZONA ? window.ZONA.chains() : STORES);  // cadenas de la zona elegida (app.js)
  const zq = () => (window.ZONA ? window.ZONA.q() : "");
  const norm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const money = () => window.renderMoney && window.renderMoney();
  const toast = (m) => (window.toastG ? window.toastG(m) : alert(m));
  const ls = { get: (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }, set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };
  const pesos = (n) => "$ " + Math.round(n).toLocaleString("es-AR");

  // =====================================================================
  // Qué buscar en el súper para cada ingrediente de las recetas (y alternativas si no aparece)
  // =====================================================================
  const BUY = {
    "pan integral (rodajas)": ["pan lactal integral", "pan integral"], "palta": ["palta"], "queso untable light": ["queso untable"], "tomate": ["tomate"], "limón": ["limon"],
    "leche": ["leche entera", "leche"], "yogur natural (pote)": ["yogur natural", "yogur"], "avena": ["avena"], "banana": ["banana"], "huevos": ["huevos"], "yema de huevo": ["huevos"],
    "suprema de pollo": ["suprema de pollo", "pechuga de pollo"], "zapallo anco / calabaza": ["zapallo anco", "calabaza"], "zanahoria": ["zanahoria"], "cebolla": ["cebolla"],
    "ajo (dientes)": ["ajo"], "filet de merluza": ["merluza"], "espinaca fresca (atado)": ["espinaca"], "nalga / bife magro": ["nalga", "bife"], "atún al natural (lata 170 g)": ["atun al natural", "atun"],
    "lechuga": ["lechuga"], "cebolla morada": ["cebolla morada"], "puerro": ["puerro"], "zapallito": ["zapallito"], "acelga (atado)": ["acelga"], "queso port salut light": ["queso port salut", "queso cremoso"],
    "morrón rojo": ["morron rojo", "pimiento rojo"], "brócoli o zapallito": ["brocoli", "zapallito"], "arroz": ["arroz largo fino", "arroz"], "champiñones": ["champiñon", "hongos"],
    "cebolla de verdeo": ["verdeo"], "pan rallado": ["pan rallado"], "lentejas secas": ["lentejas"], "carne picada magra": ["carne picada"], "tomate triturado (lata)": ["tomate triturado"],
    "zapallitos redondos": ["zapallito redondo", "zapallito"], "salmón (filet)": ["salmon"], "papa": ["papa"], "aceitunas verdes": ["aceitunas verdes"], "tapas para empanadas": ["tapas para empanadas"],
    "harina 0000": ["harina 0000"], "queso rallado": ["queso rallado"], "queso rallado (sardo o parmesano)": ["queso rallado"], "manteca": ["manteca"], "fideos (spaghetti o tallarines)": ["fideos spaghetti", "spaghetti"],
    "spaghetti": ["fideos spaghetti", "spaghetti"], "leche de coco": ["leche de coco"], "pan de hamburguesa": ["pan de hamburguesa", "pan hamburguesa"], "batata": ["batata"], "garbanzos cocidos (lata)": ["garbanzos"],
    "quinoa": ["quinoa"], "pepino": ["pepino"], "berenjena": ["berenjena"], "arvejas (lata o congeladas)": ["arvejas"], "tortillas de harina (rapiditas)": ["rapiditas", "tortillas"],
    "jamón cocido": ["jamon cocido"], "panceta ahumada": ["panceta ahumada", "panceta"], "fruta de estación (manzana, naranja, banana)": ["manzana"],
  };
  const queriesFor = (n) => BUY[n] || [n.replace(/\s*\(.*?\)/g, "").split("/")[0].trim()];
  // palabras que delatan otro producto (salvo que estén en la búsqueda)
  const EXCL = ["sabor", "saboriz", "galletit", "alfajor", "snack", "helado", "caramelo", "golosina", "mermelada", "dulce de", "salsa", "sopa", "condimento", "aderezo", "pure", "cubos", "polvo", "condensada", "chocolat", "pascua", "kinder", "jugo", "limonada", "ketchup", "shampoo", "jabon", "crema de", "tarta", "pizza", "empanada", "relleno", "rellena", "bocadito", "rebozad", "nuggets", "baby", "bebe", "perro", "gato", "mascota", "deshidrat", "en polvo", "harina de", "aceite de", "vinagre", "licor", "cerveza", "vino",
    "cerdo", "ciabatta", "medialuna", "tallarin", "fideo", "raviol", "sorrentino", "noqui", "crackers", "gall.", "galleta", "medallon", "baston", "premezcla", "falafel", "aritos", "penne", "rigate", "cereal", "granola", "barrita", "barra de", "hamburguesa", "milanesa", "budin", "torta", "bizcoch", "pan con", "con panceta", "con jamon", "con queso", "relleno de", "mayonesa", "mostaza", "dip ", "pate ", "untable de"];
  const WEIGHTED = /\bx ?kg\b|por kg|x kilo|\bkg\b$/;
  function matchRows(query, rows) {
    const qn = norm(query), qw = qn.split(/\s+/).filter((w) => w.length > 2);
    const ok = rows.filter((r) => { const n = norm(r.name); return qw.every((w) => n.includes(w) || n.includes(w.replace(/(es|s)$/, ""))) && !EXCL.some((x) => n.includes(x) && !qn.includes(x)); });
    // si hay productos que arrancan con lo buscado («Quinoa blanca 500 g»), van esos y no los que lo mencionan al pasar («Penne de quinoa»)
    const head = (qw[0] || "").replace(/(es|s)$/, "").slice(0, 5);
    const lead = head ? ok.filter((r) => norm(r.name).split(/[\s.,/]+/).slice(0, 3).some((w) => w.startsWith(head))) : [];
    return lead.length ? lead : ok;
  }
  const ING = D.ingredientes || [];
  function weightOf(n) {  // gramos de una unidad
    const k = norm(n), x = ING.find((i) => norm(i.n) === k || (i.alias || []).some((a) => norm(a) === k)) || ING.find((i) => k.startsWith(norm(i.n)) || norm(i.n).startsWith(k.split(" ")[0]));
    return x?.u || (/(huevo|yema)/.test(k) ? 55 : /lata/.test(k) ? 300 : 150);
  }
  function sizeOf(name) {  // presentación leída del nombre: { q, d: "g" | "ml" | "u" }
    const n = norm(name).replace(/(\d),(\d)/g, "$1.$2");
    let m;
    if ((m = n.match(/(\d+(?:\.\d+)?)\s*(kg|kgm|kgs|kilo|kilos)\b/))) return { q: +m[1] * 1000, d: "g" };
    if ((m = n.match(/(\d+(?:\.\d+)?)\s*(g|gr|grs|grm|gramos)\b/))) return { q: +m[1], d: "g" };
    if ((m = n.match(/(\d+(?:\.\d+)?)\s*(l|lt|lts|ltr|litro|litros)\b/))) return { q: +m[1] * 1000, d: "ml" };
    if ((m = n.match(/(\d+(?:\.\d+)?)\s*(ml|cc|cmq|cm3)\b/))) return { q: +m[1], d: "ml" };
    if (/docena/.test(n)) return { q: 12, d: "u" };
    if ((m = n.match(/\bx\s*(\d{1,2})\s*(u|un|uni|unid|unidades)?\b/)) || (m = n.match(/(\d{1,2})\s*(u|un|unid|unidades)\b/))) return { q: +m[1], d: "u" };
    return null;
  }
  function needOf(it) {  // cantidad necesaria en g / ml / u
    const q = +it.raw || parseFloat(String(it.q).replace(",", ".")) || 1, u = it.u || "u";
    if (u === "g") return { g: q, d: "g", q };
    if (u === "ml") return { g: q, d: "ml", q };
    if (u === "cda") return { g: q * 12, d: "g", q: q * 12 };
    if (u === "cdita") return { g: q * 5, d: "g", q: q * 5 };
    return { g: q * weightOf(it.n), d: "u", q };
  }
  function costOf(c, need) {  // precio por la cantidad que hace falta, comprando envases enteros
    const kg = c.unit === "kg" || WEIGHTED.test(norm(c.name));
    if (kg) { const perKg = c.price / (c.mult || 1); const g = Math.max(need.g, 100); return { cost: perKg * g / 1000, how: `${g >= 1000 ? (g / 1000).toLocaleString("es-AR", { maximumFractionDigits: 1 }) + " kg" : Math.round(g / 10) * 10 + " g"} a ${pesos(perKg)}/kg` }; }
    const s = sizeOf(c.name); let packs = 1;
    if (s) { const amount = s.d === "u" ? (need.d === "u" ? need.q : need.g / weightOf(c.name)) : need.g; packs = Math.max(1, Math.ceil(amount / s.q - 1e-9)); }
    else if (need.d === "u") packs = Math.max(1, Math.ceil(need.q - 1e-9));
    packs = Math.min(packs, 12);
    return { cost: packs * c.price, how: packs > 1 ? `${packs} × ${pesos(c.price)}` : "1 envase" };
  }
  async function searchQuery(q) {  // filas filtradas por cadena (las 6 más baratas), con caché de 6 h en el dispositivo
    const key = "px7:" + (window.ZONA?.get() || "") + ":" + norm(q), hit = ls.get(key, null);
    if (hit && Date.now() - hit.at < 6 * 36e5) return hit.rows;
    const j = await (await fetch(`${API}/search?q=${encodeURIComponent(q)}${zq()}`)).json();
    const rows = {}; matchRows(q, j.results || []).forEach((r) => { (rows[r.store] = rows[r.store] || []).push({ name: r.name, price: r.price, unit: r.unit, mult: r.mult, link: r.link, img: r.img || null }); });
    Object.keys(rows).forEach((s) => { rows[s] = rows[s].sort((a, b) => a.price - b.price).slice(0, 6); });
    ls.set(key, { at: Date.now(), rows }); return rows;
  }
  async function priceItem(it) {
    const need = needOf(it); let rows = {}, used = null;
    for (const q of queriesFor(it.n)) { try { rows = await searchQuery(q); } catch (e) { rows = {}; } if (Object.keys(rows).length >= 2) { used = q; break; } used = q; }
    const per = {};
    Object.entries(rows).forEach(([s, list]) => {
      let cands = list; if (it.c === "verd") { const w = list.filter((c) => c.unit === "kg" || WEIGHTED.test(norm(c.name))); if (w.length) cands = w; }
      let best = null; cands.forEach((c) => { const k = costOf(c, need); if (!best || k.cost < best.cost) best = Object.assign({}, c, k); });
      if (best) per[s] = best;
    });
    return { it, need, q: used, per };
  }
  const median = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? (s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : 0; };
  function combos(arr, k) { const out = []; const rec = (i, acc) => { if (acc.length === k) { out.push([...acc]); return; } for (let j = i; j < arr.length; j++) { acc.push(arr[j]); rec(j + 1, acc); acc.pop(); } }; rec(0, []); return out; }
  function plan(res, stores, k) {  // mejor combinación de k cadenas
    let best = null;
    combos(stores, k).forEach((cmb) => {
      let total = 0; const assign = [], est = [];
      res.forEach((r) => {
        const opts = cmb.map((s) => [s, r.per[s]]).filter(([, x]) => x).sort((a, b) => a[1].cost - b[1].cost);
        if (opts.length) { total += opts[0][1].cost; assign.push({ r, store: opts[0][0], x: opts[0][1] }); }
        else { const all = Object.values(r.per).map((x) => x.cost); if (all.length) { const m = median(all); total += m; est.push({ r, cost: m }); } }
      });
      if (!best || total < best.total) best = { stores: cmb, total, assign, est };
    });
    if (best) best.stores = best.stores.filter((s) => best.assign.some((a) => a.store === s));
    return best;
  }

  // =====================================================================
  // COMPARADOR en Compras
  // =====================================================================
  if (page === "compras" && $("#cmpBox")) {
    let src = new URLSearchParams(location.search).get("lista") === "mi" ? "mi" : "casa", last = null, showK = null;
    const mine = () => { const x = ls.get("listaComparar", null); return x && Date.now() - x.at < 14 * 864e5 ? x : null; };
    const fGetCount = () => { try { return JSON.parse(localStorage.getItem("heladera") || "[]").length; } catch (e) { return 0; } };
    const near = () => { const x = ls.get("cercanas", null); return x && x.chains?.length ? x : null; };
    function currentList() {
      const s = window.__shop;
      if (!s && src === "mi" && mine()) { const m = mine(); return { label: m.label, items: m.items }; }  // respaldo: la última lista que mandó Mi plan
      if (!s) return { label: "", items: [] };
      return { label: s.label, items: s.list.flatMap((c) => c.items.map((i) => Object.assign({ c: c.c || "" }, i, { cat: c.cat }))) };
    }
    function renderHead() {
      const m = mine(), nr = near();
      let zb = $("#cmpZona"); if (!zb && $("#cmpNearWrap")) { zb = document.createElement("div"); zb.id = "cmpZona"; $("#cmpNearWrap").before(zb); }
      if (zb && window.zonaBar) zb.innerHTML = window.zonaBar("Comparamos los súper de");
      // el origen se elige arriba de la lista (Plan de la casa / Mi calendario): acá solo se muestra
      const L = currentList(); $("#cmpSrc").innerHTML = `<span class="pill-src">${window.__shop?.src === "mi" ? "Mi calendario" : "Plan de la casa"}</span>`;
      $("#cmpWhat").textContent = `${L.items.length} productos · ${L.label.replace(/^(Lista de compras|Mi calendario) · /, "")}${fGetCount() ? " · sin lo que hay en la heladera" : ""}`;
      $("#cmpNearWrap").innerHTML = nr ? `<label class="snd"><input type="checkbox" id="cmpNear" ${ls.get("cmpNearOn", false) ? "checked" : ""}> Solo las cadenas que tengo cerca (${nr.chains.map(esc).join(", ")}) · <a href="supermercados.html#mapa">cambiar</a></label>` : `<p class="muted small">${ic("pin")} ¿Querés comparar solo las cadenas que tenés cerca? <a href="supermercados.html#mapa">Buscalas en el mapa</a>.</p>`;
    }
    $("#cmpSrc").addEventListener("click", (e) => { const b = e.target.closest("[data-src]"); if (!b) return; src = b.dataset.src; last = null; $("#cmpRes").innerHTML = ""; renderHead(); });
    $("#cmpNearWrap").addEventListener("change", (e) => { if (e.target.id === "cmpNear") { ls.set("cmpNearOn", e.target.checked); if (last) render(); } });
    window.addEventListener("shoplist", () => { last = null; $("#cmpRes").innerHTML = ""; renderHead(); });
    window.addEventListener("zona", () => { last = null; showK = null; $("#cmpRes").innerHTML = ""; renderHead(); });
    renderHead();
    $("#cmpGo").addEventListener("click", async () => {
      if (!API) { toast("Falta configurar el proxy de precios."); return; }
      const L = currentList(); if (!L.items.length) { toast("La lista está vacía."); return; }
      const btn = $("#cmpGo"); btn.disabled = true; const pr = $("#cmpProg"); pr.hidden = false;
      $("#cmpRes").innerHTML = `<div class="cmp-tiles">${[1, 2, 3].map(() => `<div class="cmp-tile skel-box"><span class="skel" style="width:45%;height:12px"></span><span class="skel" style="width:70%;height:28px"></span><span class="skel" style="width:55%;height:12px"></span></div>`).join("")}</div>`;
      const out = new Array(L.items.length); let done = 0, i = 0;
      const step = () => { done++; pr.querySelector("i").style.width = Math.round(done / L.items.length * 100) + "%"; pr.querySelector("small").textContent = `Buscando precios… ${done} de ${L.items.length}`; };
      await Promise.all(Array.from({ length: 5 }, async () => { while (i < L.items.length) { const k = i++; try { out[k] = await priceItem(L.items[k]); } catch (e) { out[k] = { it: L.items[k], need: needOf(L.items[k]), per: {} }; } step(); } }));
      last = { label: L.label, res: out, at: new Date() }; showK = null; pr.hidden = true; btn.disabled = false; btn.innerHTML = `${ic("refresh")} Volver a comparar`;
      render(); $("#cmpRes").scrollIntoView({ behavior: "smooth", block: "start" });
    });
    function render() {
      const nr = near(), only = nr && $("#cmpNear")?.checked ? nr.chains : null;
      const avail = zs().filter((s) => last.res.some((r) => r.per[s]) && (!only || only.includes(s)));
      if (!avail.length) { $("#cmpRes").innerHTML = `<p class="muted">No encontramos precios para esta lista${only ? " en las cadenas que tenés cerca" : ""}. Probá de nuevo en un rato.</p>`; return; }
      const P = [1, 2, 3].filter((k) => k <= avail.length).map((k) => plan(last.res, avail, k));
      const singles = avail.map((s) => { const p = plan(last.res, [s], 1); return { s, total: p.total, found: p.assign.length }; }).sort((a, b) => a.total - b.total);
      // recomendación: sumar un súper solo si ahorra al menos 8 % y $ 3.000
      let rec = 0; for (let k = 1; k < P.length; k++) { const save = P[rec].total - P[k].total; if (save >= Math.max(3000, P[rec].total * 0.08)) rec = k; }
      if (showK === null) showK = rec;
      const sel = P[showK]; const base = P[0].total; const n = last.res.length;
      const tiles = P.map((p, k) => { const save = base - p.total; return `<button class="cmp-tile${k === showK ? " on" : ""}" data-k="${k}">${k === rec ? `<span class="rec">Recomendado</span>` : ""}<small>${k === 0 ? "Todo en un súper" : `Repartido en ${k + 1} súper`}</small><b data-ars="${Math.round(p.total)}" data-count></b><span class="stores">${p.stores.map((s) => `<i style="--c:${COLOR[s]}">${esc(s)}</i>`).join(" + ")}</span>${k ? `<em class="save">ahorrás <span data-ars="${Math.round(save)}"></span> (${Math.round(save / base * 100)} %)</em>` : `<em class="save muted">la más barata para ir a una sola</em>`}</button>`; }).join("");
      const byStore = {}; sel.assign.forEach((a) => { (byStore[a.store] = byStore[a.store] || []).push(a); });
      const cards = sel.stores.map((s) => { const list = byStore[s] || []; const sub = list.reduce((t, a) => t + a.x.cost, 0);
        return `<div class="card cmp-store" style="--c:${COLOR[s]}"><h3><span class="dot"></span>${esc(s)} <small>${list.length} productos</small><b data-ars="${Math.round(sub)}" data-count></b></h3>
          <a class="mini-btn cmp-bought" href="mi-plan.html?gasto=${encodeURIComponent(s)}&monto=${Math.round(sub)}#prog">${ic("check")} Ya compré acá</a>
          ${list.map((a) => `<a class="cmp-row" href="${a.x.link}" target="_blank" rel="noopener">${a.x.img ? `<img src="${a.x.img}" alt="" loading="lazy">` : `<span class="ph">${ic("tag")}</span>`}<span class="t"><b>${esc(a.r.it.n.replace(/\s*\(.*?\)/g, ""))}</b> <small>${esc(a.r.it.q || "")}</small><small class="p">${esc(a.x.name)} · ${esc(a.x.how)}</small></span><span class="c" data-ars="${Math.round(a.x.cost)}"></span></a>`).join("")}</div>`; }).join("");
      const miss = [...sel.est.map((e) => e.r), ...last.res.filter((r) => !Object.keys(r.per).length)];
      $("#cmpRes").innerHTML = `<div class="cmp-tiles">${tiles}</div>
        <p class="muted small">${n} productos de «${esc(last.label.replace(/^Lista de compras · /, ""))}», precios leídos recién (${last.at.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}) para la cantidad que necesitás, en envases enteros. Sin envío: es para ir a comprar.${sel.est.length ? ` ${sel.est.length} sin precio en estas cadenas se calcularon con el promedio de las otras.` : ""}</p>
        <div class="cmp-actions"><button class="mini-btn" id="cmpCopy">${ic("copy")} Copiar recorrido</button><button class="mini-btn" id="cmpDl">${ic("external")} Bajar con enlaces</button></div>
        <div class="cmp-stores">${cards}</div>
        ${(() => { const nm = (r) => esc(r.it.n.replace(/\s*\(.*?\)/g, "")) + (r.it.q ? ` <small>${esc(r.it.q)}</small>` : "");
          const none = last.res.filter((r) => !Object.keys(r.per).length), elsewhere = sel.est.map((e) => e.r);
          return (elsewhere.length ? `<div class="card cmp-miss"><h3>${ic("super")} No están online en ${esc(sel.stores.join(" ni en "))}</h3><p class="muted small">Buscalos en la góndola: online aparecen en otras cadenas. En el total los contamos con el precio promedio.</p><p>${elsewhere.map((r) => nm(r) + ` <small>· ${esc(Object.keys(r.per).join(", "))}</small>`).join(" · ")}</p></div>` : "")
            + (none.length ? `<div class="card cmp-miss"><h3>${ic("leaf")} Mejor en la verdulería o el almacén del barrio</h3><p class="muted small">No los encontramos online en ninguna cadena:</p><p>${none.map(nm).join(" · ")}</p></div>` : ""); })()}
        <details class="card cmp-rank"><summary>Ranking: toda la lista en una sola cadena</summary><table class="basket"><tbody>${singles.map((x, i) => `<tr class="${i === 0 ? "best" : ""}"><td>${i + 1}. ${esc(x.s)}</td><td><b data-ars="${Math.round(x.total)}"></b></td><td class="muted small">${x.found} de ${n} con precio</td></tr>`).join("")}</tbody></table></details>`;
      $$(".cmp-tile").forEach((b) => b.addEventListener("click", () => { showK = +b.dataset.k; render(); }));
      const routeText = () => [`Recorrido de compras · ${last.label.replace(/^Lista de compras · /, "")}`, `Total estimado: ${pesos(sel.total)}`, ""].concat(...sel.stores.map((s) => [`${s.toUpperCase()} (${pesos((byStore[s] || []).reduce((t, a) => t + a.x.cost, 0))})`, ...(byStore[s] || []).map((a) => `- ${a.x.name} · ${a.x.how} · ${pesos(a.x.cost)}`), ""])).concat(miss.length ? ["VERDULERÍA / ALMACÉN DEL BARRIO", ...miss.map((r) => `- ${r.it.n}${r.it.q ? " · " + r.it.q : ""}`)] : []).join("\n");
      $("#cmpCopy").addEventListener("click", async () => { try { await navigator.clipboard.writeText(routeText()); toast("Recorrido copiado: pegalo en Notas o WhatsApp."); } catch (e) { toast("No se pudo copiar."); } });
      $("#cmpDl").addEventListener("click", () => {
        const html = `<!DOCTYPE html><html lang="es-AR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Recorrido de compras</title><style>body{font-family:system-ui,sans-serif;max-width:720px;margin:1.5rem auto;padding:0 1rem;color:#1F2D2A;background:#FBF7F0}h1{font-size:1.4rem}h2{margin:1.4rem 0 .4rem;font-size:1.1rem}li{margin:.3rem 0}a{color:#23704A}small{color:#6B7772}</style></head><body><h1>Recorrido de compras</h1><p>${esc(last.label)} · total estimado <b>${pesos(sel.total)}</b></p>${sel.stores.map((s) => `<h2>${esc(s)} · ${pesos((byStore[s] || []).reduce((t, a) => t + a.x.cost, 0))}</h2><ul>${(byStore[s] || []).map((a) => `<li><a href="${a.x.link}">${esc(a.x.name)}</a> <small>${esc(a.x.how)} · ${pesos(a.x.cost)}</small></li>`).join("")}</ul>`).join("")}${miss.length ? `<h2>Verdulería / almacén del barrio</h2><ul>${miss.map((r) => `<li>${esc(r.it.n)} <small>${esc(r.it.q || "")}</small></li>`).join("")}</ul>` : ""}<p><small>Precios orientativos leídos el ${last.at.toLocaleString("es-AR")}. Menuario.</small></p></body></html>`;
        const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([html], { type: "text/html;charset=utf-8" })); a.download = "recorrido-de-compras.html"; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      });
      money();
    }
    if (location.hash === "#comparar") setTimeout(() => $("#cmpBox").scrollIntoView({ behavior: "smooth", block: "start" }), 300);
  }

  // =====================================================================
  // PROMOS
  // =====================================================================
  // «Hasta 30% en bebidas, desayuno, almacén…» → «Hasta 30%»: las etiquetas largas no entran en la tarjeta
  const promoTxt = (t) => { t = String(t); const [promo, ...resto] = t.split(" · "); const corto = promo.length > 22 ? promo.replace(/\s+en\s+.*$/i, "") : promo; return [corto, ...resto].join(" · "); };
  const RUBRO = { almacen: "Almacén", desayuno: "Desayuno y merienda", frescos: "Lácteos y frescos", carnes: "Carnes y pescados", verduras: "Frutas y verduras", bebidas: "Bebidas", limpieza: "Limpieza" };
  if (page === "promos" && $("#prGrid")) {
    const st = { stores: new Set(ls.get("prStores", STORES)), rubro: "todos", q: "", sort: "pct", shown: 48 }; let data = null;
    const card = (x) => `<a class="promo" href="${x.link}" target="_blank" rel="noopener" style="--c:${COLOR[x.store] || "#2F8F5B"}">
        <span class="pimg">${x.img ? `<img src="${x.img}" alt="" loading="lazy">` : ic("tag")}${x.pct ? `<em class="pct">−${x.pct}%</em>` : ""}</span>
        <span class="pstore">${esc(x.store)}</span><b class="pname">${esc(x.name)}</b>
        ${x.promo ? `<span class="ptag">${esc(promoTxt(x.promo))}${x.caja ? " · en la caja" : ""}</span>` : ""}
        <span class="pprice"><b data-ars="${x.price}"></b>${x.list ? `<s data-ars="${x.list}"></s>` : ""}${x.unit === "kg" ? (x.mult && Math.abs(x.mult - 1) > 0.01 ? `<small>${Math.round(x.mult * 1000)} g</small>` : "<small>/kg</small>") : ""}</span></a>`;
    const zItems = () => { const z = zs(); return data.items.filter((x) => z.includes(x.store)); };  // solo las cadenas de la zona
    const pStores = () => zs().filter((s) => STORES.includes(s));
    function filtered() {
      const qn = norm(st.q).split(/\s+/).filter((w) => w.length > 1);
      return zItems().filter((x) => st.stores.has(x.store) && (st.rubro === "todos" || x.rubro === st.rubro) && (!qn.length || qn.every((w) => norm(x.name).includes(w))))
        .sort((a, b) => (st.sort === "price" ? a.price - b.price : (b.pct || 0) - (a.pct || 0)));
    }
    function render() {
      let zb = $("#prZona"); if (!zb) { zb = document.createElement("div"); zb.id = "prZona"; $("#prStores").before(zb); }
      const reg = zs().filter((s) => !STORES.includes(s));
      zb.innerHTML = (window.zonaBar ? window.zonaBar("Promos de") : "") + (reg.length ? `<p class="muted small">${esc(reg.join(" y "))}: sus ofertas están en su sitio; acá mostramos las de las cadenas nacionales que hay en tu zona.</p>` : "");
      if (![...st.stores].some((s) => pStores().includes(s))) pStores().forEach((s) => st.stores.add(s));
      $("#prStores").innerHTML = pStores().map((s) => `<button class="pchip${st.stores.has(s) ? " on" : ""}" data-store="${esc(s)}" style="--c:${COLOR[s]}">${esc(s)} <small>${data.byStore?.[s] || 0}</small></button>`).join("");
      $("#prRubros").innerHTML = `<button class="pchip${st.rubro === "todos" ? " on" : ""}" data-rubro="todos">Todo</button>` + Object.entries(RUBRO).map(([k, v]) => `<button class="pchip${st.rubro === k ? " on" : ""}" data-rubro="${k}">${v}</button>`).join("");
      const list = filtered();
      $("#prMeta").textContent = `${list.length.toLocaleString("es-AR")} promos · actualizadas ${new Date(data.at).toLocaleString("es-AR", { weekday: "long", hour: "2-digit", minute: "2-digit" })} · se renuevan cada 3 horas. Confirmá el precio final en el sitio de la cadena.`;
      $("#prGrid").innerHTML = list.slice(0, st.shown).map(card).join("") || `<p class="muted">No hay promos con esos filtros.</p>`;
      $("#prMore").hidden = list.length <= st.shown; money();
    }
    function forPlan() {  // promos de los productos de la lista de esta semana
      const P = window.PLAN; if (!P) return;
      const week = P.weekAt(P.mondayOf(new Date(Date.now() - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 10)));
      const items = P.shoppingFor(week).flatMap((c) => c.items.map((i) => Object.assign({ c: c.c }, i))); const hits = [];
      items.forEach((it) => {
        const q = queriesFor(it.n)[0]; let m = matchRows(q, zItems());
        if (it.c === "verd") { const w = m.filter((x) => x.unit === "kg" || WEIGHTED.test(norm(x.name))); m = w.length ? w : m.filter((x) => { const s = sizeOf(x.name); return !s || s.d !== "g" || s.q >= 250; }); }  // verdura suelta, no condimentos
        m.sort((a, b) => (b.pct || 0) - (a.pct || 0)); if (m.length) hits.push({ it, x: m[0], n: m.length });
      });
      $("#promoPlan").hidden = !hits.length;
      $("#promoPlan").innerHTML = `<div class="pp-head"><div><p class="kicker">Para tu lista de esta semana</p><h2>${hits.length} productos del plan están en promo</h2><p class="muted small">La mejor promo de cada uno. Tocá para ir al producto.</p></div><a class="mini-btn" href="compras.html#comparar">${ic("compras")} Comparar mi lista</a></div>
        <div class="promo-grid mini">${hits.slice(0, 12).map((h) => card(Object.assign({}, h.x, { promo: (h.x.promo ? promoTxt(h.x.promo) + " · " : "") + "para " + h.it.n.replace(/\s*\(.*?\)/g, "") }))).join("")}</div>`;
      money();
    }
    $("#prStores").addEventListener("click", (e) => { const b = e.target.closest("[data-store]"); if (!b) return; const s = b.dataset.store; if (st.stores.has(s) && st.stores.size > 1) st.stores.delete(s); else st.stores.add(s); ls.set("prStores", [...st.stores]); st.shown = 48; render(); });
    $("#prRubros").addEventListener("click", (e) => { const b = e.target.closest("[data-rubro]"); if (!b) return; st.rubro = b.dataset.rubro; st.shown = 48; render(); });
    $("#prSort").addEventListener("click", (e) => { const b = e.target.closest("[data-s]"); if (!b) return; st.sort = b.dataset.s; $$("#prSort button").forEach((x) => x.classList.toggle("on", x === b)); render(); });
    let tq = null; $("#prQ").addEventListener("input", (e) => { clearTimeout(tq); tq = setTimeout(() => { st.q = e.target.value; st.shown = 48; render(); }, 180); });
    $("#prMore").addEventListener("click", () => { st.shown += 48; render(); });
    window.addEventListener("zona", () => { if (!data) return; st.stores = new Set(pStores()); st.shown = 48; render(); forPlan(); });
    (async () => {
      $("#prMeta").textContent = "Cargando las promos de las cadenas…";
      $("#prGrid").innerHTML = Array.from({ length: 12 }, () => `<div class="promo skel-box"><span class="skel" style="height:110px"></span><span class="skel" style="width:40%;height:10px"></span><span class="skel" style="height:13px"></span><span class="skel" style="width:70%;height:13px"></span><span class="skel" style="width:35%;height:16px;margin-top:auto"></span></div>`).join("");
      try { data = await (await fetch(`${API}/promos`)).json(); render(); forPlan(); }
      catch (e) { $("#prMeta").textContent = navigator.onLine ? "No se pudieron cargar las promos. Probá de nuevo en un rato." : "Sin conexión: las promos necesitan internet."; }
    })();
  }

  // =====================================================================
  // MAPA de sucursales (Leaflet + OpenStreetMap; datos: sucursales.json, Worker y Nominatim)
  // =====================================================================
  const BRAND = [["Coto", /\bcoto\b/i], ["Carrefour", /carrefour/i], ["Día", /\bd[ií]a\b|supermercados? dia|dia%/i], ["Jumbo", /\bjumbo\b/i], ["Disco", /\bdisco\b/i], ["Vea", /\bvea\b/i], ["ChangoMás", /chango ?m[aá]s|walmart/i]];
  if (page === "supermercados" && $("#mapBox")) {
    const st = { chains: new Set(zs()), radius: ls.get("mapRadius", 1500), center: null, shops: [], map: null, layer: null, me: null };
    const zc = () => window.ZONA?.info()?.c || [-34.6037, -58.3816];  // centro de la zona (o el Obelisco)
    const loadLeaflet = () => window.L ? Promise.resolve() : new Promise((res, rej) => {
      const css = document.createElement("link"); css.rel = "stylesheet"; css.href = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css"; css.integrity = "sha384-c6Rcwz4e4CITMbu/NBmnNS8yN2sC3cUElMEMfP3vqqKFp7GOYaaBBCqmaWBjmkjb"; css.crossOrigin = "anonymous"; document.head.appendChild(css);
      const s = document.createElement("script"); s.src = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"; s.integrity = "sha384-NElt3Op+9NBMCYaef5HxeJmU4Xeard/Lku8ek6hoPTvYkQPh3zLIrJP7KiRocsxO"; s.crossOrigin = "anonymous"; s.onload = res; s.onerror = rej; document.head.appendChild(s);
    });
    const km = (a, b) => { const r = Math.PI / 180, dLa = (b[0] - a[0]) * r, dLo = (b[1] - a[1]) * r; const h = Math.sin(dLa / 2) ** 2 + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin(dLo / 2) ** 2; return 12742 * Math.asin(Math.sqrt(h)); };
    function chips() { $("#mapChains").innerHTML = zs().map((s) => `<button class="pchip${st.chains.has(s) ? " on" : ""}" data-chain="${esc(s)}" style="--c:${COLOR[s]}">${esc(s)}</button>`).join(""); }
    async function ensureMap() {
      if (st.map) return; await loadLeaflet();
      $("#map").classList.add("on");
      st.map = L.map("map", { zoomControl: true, scrollWheelZoom: false }).setView(zc(), 13);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' }).addTo(st.map);
      st.layer = L.layerGroup().addTo(st.map);
    }
    // Fuentes: 1) sucursales.json si existe (extracto de OpenStreetMap), 2) puntos de retiro en vivo de Carrefour, Día y ChangoMás (Worker),
    // 3) si falta alguna cadena en el archivo, Nominatim acotado a la zona (una consulta por cadena, espaciadas 1,1 s como pide su política de uso)
    const tmo = (ms) => { const c = new AbortController(); setTimeout(() => c.abort(), ms); return c.signal; };
    let STATIC = null;
    const loadStatic = async () => { if (STATIC) return STATIC; try { STATIC = (await (await fetch("sucursales.json", { signal: tmo(8000) })).json()).items || []; } catch (e) { STATIC = []; } return STATIC; };
    async function nominatimChain(chain, c, r) {
      const dLat = r / 111000, dLon = r / (111000 * Math.cos(c[0] * Math.PI / 180));
      const u = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=40&countrycodes=ar&bounded=1&viewbox=${c[1] - dLon},${c[0] + dLat},${c[1] + dLon},${c[0] - dLat}&q=${encodeURIComponent(chain === "Día" ? "supermercado dia" : chain)}`;
      const j = await (await fetch(u, { headers: { Accept: "application/json" }, signal: tmo(10000) })).json();
      return j.filter((x) => /shop|supermarket|convenience/.test(x.category + " " + x.type) || /supermerc|hiper|market/i.test(x.display_name))
        .map((x) => ({ chain, name: x.name || chain, lat: +x.lat, lon: +x.lon, addr: String(x.display_name || "").split(",").slice(1, 3).join(",").trim(), hours: "" }));
    }
    async function search(c, label) {
      st.center = c; st.label = label; await ensureMap(); $("#mapStatus").textContent = "Buscando sucursales…";
      const all = [];
      const [stat, live] = await Promise.all([loadStatic(), API ? fetch(`${API}/sucursales?lat=${c[0]}&lon=${c[1]}`, { signal: tmo(12000) }).then((r) => r.json()).then((j) => j.items || []).catch(() => []) : Promise.resolve([])]);
      all.push(...stat.filter((s) => km(c, [s.lat, s.lon]) * 1000 <= st.radius * 1.05), ...live);
      const covered = new Set(stat.map((s) => s.chain).concat(live.map((s) => s.chain)));
      const missing = zs().filter((s) => !covered.has(s));
      for (const ch of missing) { try { all.push(...await nominatimChain(ch, c, st.radius)); } catch (e) {} await new Promise((r) => setTimeout(r, 1100)); }
      const shops = [];
      all.forEach((s) => { s.d = km(c, [s.lat, s.lon]); if (s.d * 1000 > st.radius * 1.05) return; if (shops.some((x) => x.chain === s.chain && km([x.lat, x.lon], [s.lat, s.lon]) < 0.08)) return; shops.push(s); });
      st.shops = shops.sort((a, b) => a.d - b.d);
      if (!st.shops.length && !all.length && !stat.length && !live.length) { $("#mapStatus").textContent = "No pudimos consultar las sucursales ahora. Probá de nuevo en un minuto."; return; }
      ls.set("cercanas", { at: Date.now(), label, chains: [...new Set(st.shops.map((s) => s.chain))], radius: st.radius });
      draw(label);
    }
    function draw(label) {
      st.layer.clearLayers(); const c = st.center;
      L.circle(c, { radius: st.radius, color: "#2F8F5B", weight: 1.5, fillOpacity: 0.05, dashArray: "4 6" }).addTo(st.layer);
      L.circleMarker(c, { radius: 9, color: "#fff", weight: 3, fillColor: "#1F2D2A", fillOpacity: 1 }).addTo(st.layer).bindTooltip("Vos", { permanent: false });
      const list = st.shops.filter((s) => st.chains.has(s.chain));
      list.forEach((s) => {
        const dir = `https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lon}&travelmode=walking`;
        L.circleMarker([s.lat, s.lon], { radius: 8, color: "#fff", weight: 2, fillColor: COLOR[s.chain], fillOpacity: 1 }).addTo(st.layer)
          .bindPopup(`<b>${esc(s.name)}</b><br>${esc(s.addr || s.chain)}<br>${s.d < 1 ? Math.round(s.d * 1000) + " m" : s.d.toFixed(1) + " km"} · ~${Math.max(1, Math.round(s.d * 1000 / 80))} min a pie${s.hours ? `<br><small>${esc(s.hours)}</small>` : ""}<br><a href="${dir}" target="_blank" rel="noopener">Cómo llegar ↗</a>`);
      });
      st.map.invalidateSize(); st.map.fitBounds(L.latLng(c).toBounds(st.radius * 2), { padding: [10, 10] });  // el contenedor cambió de alto al aparecer
      const byChain = {}; list.forEach((s) => { byChain[s.chain] = (byChain[s.chain] || 0) + 1; });
      $("#mapStatus").innerHTML = list.length ? `${list.length} sucursales a menos de ${st.radius >= 1000 ? st.radius / 1000 + " km" : st.radius + " m"}${label ? " de " + esc(label) : ""}: ${Object.entries(byChain).map(([k, v]) => `${esc(k)} ${v}`).join(" · ")}. <a href="compras.html#comparar">Comparar mi lista solo en estas cadenas →</a>`
        : `No hay sucursales de estas cadenas en ese radio. Probá con uno más grande.`;
      $("#mapList").innerHTML = list.slice(0, 30).map((s) => `<div class="msh" style="--c:${COLOR[s.chain]}"><span class="dot"></span><div><b>${esc(s.name)}</b><small>${esc(s.addr || "")}${s.hours ? " · " + esc(s.hours) : ""}</small></div><span class="d">${s.d < 1 ? Math.round(s.d * 1000) + " m" : s.d.toFixed(1) + " km"}</span><a class="mini-btn" href="https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lon}&travelmode=walking" target="_blank" rel="noopener">Cómo llegar</a></div>`).join("");
    }
    chips(); $("#mapRadius").value = String(st.radius);
    window.addEventListener("zona", () => { st.chains = new Set(zs()); chips(); if (st.center) search(st.center, st.label); });
    $("#mapChains").addEventListener("click", (e) => { const b = e.target.closest("[data-chain]"); if (!b) return; const s = b.dataset.chain; if (st.chains.has(s) && st.chains.size > 1) st.chains.delete(s); else st.chains.add(s); chips(); if (st.center) draw(); });
    $("#mapRadius").addEventListener("change", (e) => { st.radius = +e.target.value; ls.set("mapRadius", st.radius); if (st.center) search(st.center); });
    $("#mapLocate").addEventListener("click", () => {
      if (!navigator.geolocation) { toast("Tu navegador no comparte la ubicación: escribí tu dirección."); return; }
      $("#mapStatus").textContent = "Pidiendo tu ubicación…";
      navigator.geolocation.getCurrentPosition((p) => search([p.coords.latitude, p.coords.longitude], "tu ubicación"),
        (err) => { $("#mapStatus").textContent = err.code === 1 ? "No diste permiso de ubicación. Escribí tu dirección arriba." : "No pudimos obtener tu ubicación. Escribí tu dirección arriba."; }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 6e4 });
    });
    const addr = $("#mapAddr"), sug = document.createElement("ul"); sug.id = "mapSug"; sug.className = "addr-sug"; sug.setAttribute("role", "listbox"); sug.hidden = true;
    addr.setAttribute("role", "combobox"); addr.setAttribute("aria-autocomplete", "list"); addr.setAttribute("aria-controls", "mapSug"); addr.setAttribute("aria-expanded", "false"); addr.autocomplete = "off";
    $("#mapForm").style.position = "relative"; $("#mapForm").appendChild(sug);
    let opts = [], act = -1, sugT = null, sugAb = null;
    const labelOf = (pr) => { const calle = [pr.street || (pr.type === "street" ? pr.name : ""), pr.housenumber].filter(Boolean).join(" ");
      const main = calle || pr.name || ""; const lugar = [pr.district || pr.locality, pr.city || pr.county, pr.state].filter((x, i, a) => x && x !== main && a.indexOf(x) === i);
      return { main, sub: lugar.join(", ") }; };
    const closeSug = () => { sug.hidden = true; act = -1; addr.setAttribute("aria-expanded", "false"); };
    const drawSug = () => {
      if (!opts.length) { closeSug(); return; }
      sug.innerHTML = opts.map((o, i) => `<li role="option" id="ms${i}" data-i="${i}" aria-selected="${i === act}">${ic("pin")}<span><b>${esc(o.main)}</b>${o.sub ? `<small>${esc(o.sub)}</small>` : ""}</span></li>`).join("");
      sug.hidden = false; addr.setAttribute("aria-expanded", "true"); if (act >= 0) addr.setAttribute("aria-activedescendant", "ms" + act); };
    const pick = (o) => { addr.value = o.main + (o.sub ? ", " + o.sub : ""); closeSug(); search([o.lat, o.lon], o.main || o.sub); };
    addr.addEventListener("input", () => {
      clearTimeout(sugT); const q = addr.value.trim(); if (q.length < 3) { opts = []; closeSug(); return; }
      sugT = setTimeout(async () => {
        try {
          sugAb?.abort(); sugAb = new AbortController(); const c = zc(), sig = sugAb.signal, prov = window.ZONA?.info()?.prov;
          const dist = (o) => (o.lat - c[0]) ** 2 + ((o.lon - c[1]) * Math.cos(c[0] * Math.PI / 180)) ** 2;
          const title = (t) => String(t || "").toLowerCase().replace(/(^|[\s.(])([a-záéíóúñü])/g, (m, a, b) => a + b.toUpperCase());
          // calle y altura: Georef (normalizador de direcciones del Estado, interpola la altura en todo el país); lugares y calles: Photon
          const geo = /\d/.test(q) ? fetch(`https://apis.datos.gob.ar/georef/api/direcciones?direccion=${encodeURIComponent(q)}${prov ? "&provincia=" + prov : ""}&max=40&aplanar=true&campos=calle.nombre,altura.valor,localidad_censal.nombre,provincia.nombre,ubicacion`, { signal: sig })
            .then((r) => r.json()).then((j) => (j.direcciones || []).filter((d) => d.ubicacion_lat).map((d) => ({ main: `${title(d.calle_nombre)} ${d.altura_valor || ""}`.trim(), sub: [d.localidad_censal_nombre, d.provincia_nombre].filter(Boolean).join(", "), lat: d.ubicacion_lat, lon: d.ubicacion_lon }))).catch(() => []) : Promise.resolve([]);
          const pho = fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=7&lat=${c[0]}&lon=${c[1]}&bbox=-73.6,-55.2,-53.5,-21.7`, { signal: sig })
            .then((r) => r.json()).then((j) => (j.features || []).filter((f) => (f.properties.countrycode || "").toUpperCase() === "AR")
              .map((f) => ({ ...labelOf(f.properties), lat: f.geometry.coordinates[1], lon: f.geometry.coordinates[0] })).filter((o) => o.main || o.sub)).catch(() => []);
          const [g, ph] = await Promise.all([geo, pho]); if (sig.aborted) return;
          g.sort((a, b) => dist(a) - dist(b));
          const seen = new Set(); opts = [...g.slice(0, 4), ...ph].filter((o) => { const k = (o.main + o.sub).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""); if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, 6);
          act = -1; drawSug();
        } catch (er) { if (er.name !== "AbortError") { opts = []; closeSug(); } }
      }, 280);
    });
    addr.addEventListener("keydown", (e) => {
      if (sug.hidden || !opts.length) return;
      if (e.key === "ArrowDown") { e.preventDefault(); act = (act + 1) % opts.length; drawSug(); }
      else if (e.key === "ArrowUp") { e.preventDefault(); act = (act - 1 + opts.length) % opts.length; drawSug(); }
      else if (e.key === "Escape") closeSug();
      else if (e.key === "Enter" && act >= 0) { e.preventDefault(); pick(opts[act]); }
    });
    sug.addEventListener("mousedown", (e) => e.preventDefault());  // que el input no pierda el foco antes del clic
    sug.addEventListener("click", (e) => { const li = e.target.closest("[data-i]"); if (li) pick(opts[+li.dataset.i]); });
    addr.addEventListener("blur", () => setTimeout(closeSug, 150));
    $("#mapForm").addEventListener("submit", async (e) => {
      e.preventDefault(); const q = addr.value.trim(); if (q.length < 3) return;
      if (opts.length && !sug.hidden) { pick(opts[Math.max(0, act)]); return; }
      closeSug(); $("#mapStatus").textContent = "Buscando la dirección…";
      try {
        const c = zc(), z = window.ZONA?.info();
        const u = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&addressdetails=1&countrycodes=ar&accept-language=es&viewbox=${c[1] - 1.5},${c[0] + 1.5},${c[1] + 1.5},${c[0] - 1.5}&q=${encodeURIComponent(q + (z && !/,/.test(q) ? ", " + z.name.replace(/ y .*$/, "") : ""))}`;
        const j = await (await fetch(u, { headers: { Accept: "application/json" } })).json();
        if (!j.length) { $("#mapStatus").textContent = "No encontramos esa dirección. Probá con calle, altura y ciudad (por ejemplo «Córdoba 1500, Rosario») o elegí una de las sugerencias."; return; }
        const ad = j[0].address || {}; const calle = [ad.road, ad.house_number].filter(Boolean).join(" ");
        const found = calle ? [calle, ad.suburb || ad.city_district || ad.neighbourhood || ad.city || ad.town].filter(Boolean).join(", ") : q;  // la dirección que encontró, para poder corregirla
        search([+j[0].lat, +j[0].lon], found);
      } catch (er) { $("#mapStatus").textContent = "No pudimos buscar la dirección ahora. Probá de nuevo."; }
    });
    const prev = ls.get("cercanas", null); if (prev?.label) $("#mapAddr").placeholder = "Última búsqueda: " + prev.label;
    if (location.hash === "#mapa") setTimeout(() => $("#mapa").scrollIntoView({ behavior: "smooth", block: "start" }), 300);
  }
})();
