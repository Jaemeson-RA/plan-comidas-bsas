/**
 * Plan de comidas · proxy de precios (Cloudflare Worker).
 * GET /search?q=harina  -> busca en Jumbo, Disco, Vea, Carrefour, Día, ChangoMás (VTEX) y Coto, y devuelve JSON con CORS.
 * GET /promos      -> ofertas en góndola de las 7 cadenas por rubro (cron cada 3 h, guardadas en KV «PROMOS»).
 * POST /verify      -> comprueba un reCAPTCHA v2 con la clave secreta (variable RECAPTCHA_SECRET del Worker).
 * Los sitios de los súper no permiten llamadas directas desde el navegador (sin CORS); este worker las hace por el sitio.
 */
const VTEX = { Jumbo: "www.jumbo.com.ar", Disco: "www.disco.com.ar", Vea: "www.vea.com.ar", Carrefour: "www.carrefour.com.ar", "Día": "diaonline.supermercadosdia.com.ar", "ChangoMás": "www.masonline.com.ar" };
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36";
import { pushRoute, pushCron, promoAlerts } from "./push.js";
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type", "Cache-Control": "public, max-age=600" };

async function vtex(store, host, q) {
  const r = await fetch(`https://${host}/api/catalog_system/pub/products/search/?ft=${encodeURIComponent(q)}&_from=0&_to=11`, { headers: { "User-Agent": UA, Accept: "application/json" }, cf: { cacheTtl: 600 } });
  if (!r.ok) return [];
  const data = await r.json(); const out = [];
  for (const p of data) {
    for (const it of p.items || []) {
      for (const s of it.sellers || []) {
        const co = s.commertialOffer || {}; const pr = co.Price || 0;
        if (pr > 0 && co.IsAvailable !== false) { out.push({ store, name: p.productName, price: pr, unit: it.measurementUnit || "un", mult: it.unitMultiplier || 1, link: `https://${host}/${p.linkText}/p`, img: (it.images && it.images[0] && it.images[0].imageUrl) || null }); break; }
      }
    }
  }
  return out;
}
function walk(o, recs) { if (o && typeof o === "object") { if (Array.isArray(o.records)) recs.push(...o.records); for (const v of Object.values(o)) walk(v, recs); } }
async function coto(q) {
  const r = await fetch(`https://www.cotodigital.com.ar/sitios/cdigi/browse/_/N-0?Ntt=${encodeURIComponent(q)}&format=json`, { headers: { "User-Agent": UA, Accept: "application/json" }, cf: { cacheTtl: 600 } });
  if (!r.ok) return [];
  const d = await r.json(); const recs = []; walk(d, recs); const out = [];
  for (const rec of recs.slice(0, 24)) {
    const a = Object.assign({}, rec.attributes || {}); for (const sub of rec.records || []) Object.assign(a, sub.attributes || {});
    const name = (a["product.displayName"] || [""])[0]; if (!name) continue;
    let pr = parseFloat((a["sku.activePrice"] || ["0"])[0]) || 0;
    try { for (const x of JSON.parse((a["product.dtoDescuentos"] || ["[]"])[0])) { const pd = parseFloat(x.precioDesc || 0); if (pd > 0 && !x.textoLlevando) pr = Math.min(pr, pd); } } catch (e) {}
    if (pr <= 0) continue;
    const kg = ((a["product.unidades.descUnidad"] || [""])[0] || "").toUpperCase().startsWith("KG") || /x kg|por kg/i.test(name);
    const rs = ((rec.detailsAction || {}).recordState || "").split("?")[0];
    out.push({ store: "Coto", name, price: pr, unit: kg ? "kg" : "un", mult: 1, link: "https://www.cotodigital.com.ar/sitios/cdigi" + rs, img: (a["product.mediumImage.url"] || [null])[0] });
  }
  return out;
}
// POST /verify {token} -> pregunta a Google si el reCAPTCHA es válido (la clave secreta vive en el Worker: wrangler secret put RECAPTCHA_SECRET)
const HOSTS = ["jaemeson-ra.github.io", "localhost", "127.0.0.1"];
async function verify(req, env) {
  const H = { ...CORS, "Content-Type": "application/json", "Cache-Control": "no-store" };
  const out = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: H });
  if (req.method !== "POST") return out({ ok: false, error: "usar POST" }, 405);
  if (!env.RECAPTCHA_SECRET) return out({ ok: false, error: "falta RECAPTCHA_SECRET" }, 500);
  let token = ""; try { token = String((await req.json()).token || "").slice(0, 4000); } catch (e) {}
  if (!token) return out({ ok: false, error: "sin token" }, 400);
  const body = new URLSearchParams({ secret: env.RECAPTCHA_SECRET, response: token, remoteip: req.headers.get("CF-Connecting-IP") || "" });
  const j = await (await fetch("https://www.google.com/recaptcha/api/siteverify", { method: "POST", body })).json().catch(() => ({}));
  const ok = j.success === true && HOSTS.includes(j.hostname);
  return out({ ok, codes: j["error-codes"] || [], hostname: j.hostname || null });
}
// ---------- PROMOS: ofertas en góndola de las 7 cadenas, por rubro (se recorren cada 3 h con el cron y se guardan en KV) ----------
const RUBROS = ["almacen", "desayuno", "frescos", "carnes", "verduras", "bebidas", "limpieza"];
const CENCOSUD = { almacen: 1, bebidas: 2, verduras: 3, carnes: 4, frescos: 7, limpieza: 13 };
const PCATS = {
  Carrefour: { almacen: 161, desayuno: 222, bebidas: 255, frescos: 292, carnes: 321, verduras: 330, limpieza: 359 },
  "Día": { almacen: 1, desayuno: 80, frescos: 121, bebidas: 164, carnes: 10216, verduras: 10237, limpieza: 282 },
  Jumbo: CENCOSUD, Disco: CENCOSUD, Vea: CENCOSUD,
  "ChangoMás": { almacen: 1000038, desayuno: 1000045, bebidas: 1000041, carnes: 1000042, frescos: 1000049, verduras: 1000050, limpieza: 1000034 },
};
// Jumbo, Disco y Vea tienen precios de lista mal cargados (×100): ahí se ordena por lo más vendido y se filtra
const ORDER = { Jumbo: "OrderByTopSaleDESC", Disco: "OrderByTopSaleDESC", Vea: "OrderByTopSaleDESC" };
const BANK = /tarjeta|banco|bank|visa|master|amex|cuenta|mercado ?pago|modo|naranja|cencopay|mi carrefour|club|cuotas|d[eé]bito|cr[eé]dito|prisma|santander|galicia|bbva|macro|icbc|patagonia|ciudad|nacion|supervielle|hipotecario|comafi|brubank|uala|personal pay/i;
const PROMO_RE = /\d\s*x\s*\d|2do al \d+|segunda (?:unidad )?al \d+|\d{1,2}\s*%|superoferta|oferta|solo x hoy/i;
const CLUSTER_EXCL = /_|prime|cpay|rpa|cencopay|tarjeta|cuota|csi\b|banco|test|prueba|clone|colecci|listado|marcas participantes|lookead|personaliz|verano|invierno|navidad|fiestas|pascua|vacacion|viaje|fin de semana del|enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|veautiful|cmanager|hot sale|cyber|black friday/i;
const clean = (t) => (t ? String(t).replace(/\b(hs|cs|bf)\s*20\d\d\b/gi, "").replace(/\s{2,}/g, " ").trim() : null);
function promoOf(store, rubro, p) {
  const it = (p.items || [])[0]; const s = (it?.sellers || [])[0]; const co = s?.commertialOffer || {};
  const pr = co.Price || 0, lp = co.ListPrice || 0; if (pr <= 0 || co.IsAvailable === false) return null;
  const teasers = [...(co.Teasers || []), ...(co.PromotionTeasers || [])].map((t) => t?.Name).filter((n) => n && !BANK.test(n) && !/ver m[aá]s|^ofertas?\s*s\d+|^s\d+\b|test|prueba/i.test(n));
  const pct = lp > pr ? Math.round((1 - pr / lp) * 100) : 0;
  const okPct = pct >= 5 && pct <= 75 && lp <= pr * 4;
  // Jumbo, Disco y Vea aplican las promos en la caja: vienen como colecciones con nombre («4x2 en Galletitas», «Hasta 2do al 70% en Almacén»)
  let multi = null;
  if (!okPct && !teasers.length && !ORDER[store]) return null;  // las colecciones solo se leen en Jumbo, Disco y Vea
  if (!okPct && !teasers.length) {
    const cl = Object.values(p.productClusters || {}).filter((n) => PROMO_RE.test(n) && !CLUSTER_EXCL.test(n));
    const pick = cl.find((n) => /\d\s*x\s*\d|2do al|segunda/i.test(n)) || cl.find((n) => /oferta|solo x hoy/i.test(n)) || cl[0];
    if (!pick) return null;
    multi = pick.replace(/^hasta\s+/i, "Hasta ").trim();
    let m = pick.match(/(\d)\s*x\s*(\d)/i); const eff = m && +m[1] > +m[2] ? Math.round((1 - +m[2] / +m[1]) * 100) : (m = pick.match(/(?:2do|segunda(?: unidad)?)\s+al\s+(\d+)/i)) ? Math.round(+m[1] / 2) : null;
    return { store, rubro, name: p.productName, price: pr, list: null, pct: /^hasta/i.test(pick) ? null : eff, promo: clean(multi), unit: it.measurementUnit || "un", mult: it.unitMultiplier || 1, link: `https://${VTEX[store]}/${p.linkText}/p`, img: (it.images || [])[0]?.imageUrl || null, caja: true };
  }
  return { store, rubro, name: p.productName, price: pr, list: okPct ? lp : null, pct: okPct ? pct : null, promo: clean(teasers[0]),
    unit: it.measurementUnit || "un", mult: it.unitMultiplier || 1, link: `https://${VTEX[store]}/${p.linkText}/p`, img: (it.images || [])[0]?.imageUrl || null };
}
async function vtexPromos(store) {
  const host = VTEX[store], out = [];
  await Promise.all(Object.entries(PCATS[store]).map(async ([rubro, id]) => {
    try {
      const r = await fetch(`https://${host}/api/catalog_system/pub/products/search?fq=C:/${id}/&O=${ORDER[store] || "OrderByBestDiscountDESC"}&_from=0&_to=49`, { headers: { "User-Agent": UA, Accept: "application/json" } });
      if (!r.ok) return; for (const p of await r.json()) { const x = promoOf(store, rubro, p); if (x) out.push(x); }
    } catch (e) {}
  }));
  return out;
}
const RUBRO_RE = [["carnes", /carne|pollo|cerdo|vacuno|nalga|bife|asado|milanesa|merluza|salm[oó]n|pescado|hamburguesa|chorizo|picada|suprema/i],
  ["frescos", /leche|yogur|queso|manteca|crema|huevo|fiambre|jam[oó]n|salame|dulce de leche|postre|ricota/i],
  ["verduras", /banana|manzana|naranja|mandarina|lim[oó]n|tomate|papa|cebolla|zanahoria|zapall|lechuga|acelga|espinaca|pimiento|morr[oó]n|palta|frutilla|pera|uva|kiwi|batata|ajo|br[oó]coli|pepino|berenjena|choclo|x ?kg/i],
  ["bebidas", /gaseosa|agua|cerveza|vino|jugo|soda|fernet|aperitivo|bebida|cola|t[oó]nica|isot[oó]nica/i],
  ["desayuno", /caf[eé]|yerba|t[eé] |galletit|cereal|mermelada|cacao|az[uú]car|edulcorante|bizcoch|alfajor/i],
  ["limpieza", /detergente|lavandina|jab[oó]n|suavizante|limpiador|desinfectante|esponja|papel higi|rollo de cocina|servilleta|bolsa de residuo|insecticida/i]];
async function cotoPromos() {
  const out = [], seen = new Set();
  await Promise.all([0, 120, 240, 360].map(async (no) => {
    try {
      const r = await fetch(`https://www.cotodigital.com.ar/sitios/cdigi/browse/_/N-0?Nrpp=120&No=${no}&format=json`, { headers: { "User-Agent": UA, Accept: "application/json" } });
      if (!r.ok) return; const recs = []; walk(await r.json(), recs);
      for (const rec of recs) {
        const a = Object.assign({}, rec.attributes || {}); for (const sub of rec.records || []) Object.assign(a, sub.attributes || {});
        const name = (a["product.displayName"] || [""])[0]; if (!name) continue;
        const act = parseFloat((a["sku.activePrice"] || ["0"])[0]) || 0; if (act <= 0) continue;
        let best = null; try { for (const x of JSON.parse((a["product.dtoDescuentos"] || ["[]"])[0])) { const pd = parseFloat(x.precioDesc || 0); if (pd > 0 && pd < act * 0.97 && (!best || pd < best.pd)) best = { pd, txt: String(x.textoDescuento || "").trim(), llev: x.textoLlevando || null }; } } catch (e) {}
        if (!best) continue;
        const rs = ((rec.detailsAction || {}).recordState || "").split("?")[0]; const link = "https://www.cotodigital.com.ar/sitios/cdigi" + rs; if (seen.has(link)) continue; seen.add(link);
        const pct = Math.round((1 - best.pd / act) * 100); if (pct > 75) continue;
        const kg = ((a["product.unidades.descUnidad"] || [""])[0] || "").toUpperCase().startsWith("KG") || /x ?kg|por kg/i.test(name);
        const rubro = (RUBRO_RE.find(([, re]) => re.test(name)) || ["almacen"])[0];
        out.push({ store: "Coto", rubro, name, price: best.pd, list: act, pct, promo: best.llev ? `${best.txt} ${best.llev}`.trim() : best.txt.replace(/Dto$/i, " de descuento") || null,
          unit: kg ? "kg" : "un", mult: 1, link, img: (a["product.mediumImage.url"] || [null])[0] });
      }
    } catch (e) {}
  }));
  return out;
}
async function buildPromos() {
  const lists = await Promise.all([...Object.keys(PCATS).map((s) => vtexPromos(s).catch(() => [])), cotoPromos().catch(() => [])]);
  const seen = new Set(), items = [];
  for (const x of lists.flat()) { const k = x.store + "|" + x.name.toLowerCase(); if (seen.has(x.link) || seen.has(k)) continue; seen.add(x.link); seen.add(k); items.push(x); }
  items.sort((a, b) => (b.pct || 0) - (a.pct || 0));
  const byStore = {}; items.forEach((x) => { byStore[x.store] = (byStore[x.store] || 0) + 1; });
  return { at: new Date().toISOString(), count: items.length, byStore, rubros: RUBROS, items };
}
async function promos(env, ctx, force) {
  const H = { ...CORS, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "public, max-age=900" };
  let data = env.PROMOS && !force ? await env.PROMOS.get("promos", "json") : null;
  const stale = !data || Date.now() - Date.parse(data.at) > 4 * 36e5;
  if (stale) { data = await buildPromos(); if (env.PROMOS) ctx.waitUntil(env.PROMOS.put("promos", JSON.stringify(data))); }
  return new Response(JSON.stringify(data), { headers: H });
}

// ---------- SUCURSALES: puntos de retiro de las cadenas VTEX que los publican (Carrefour, Día, ChangoMás) cerca de un punto ----------
const PICKUP = ["Carrefour", "Día", "ChangoMás"];
async function sucursales(url) {
  const H = { ...CORS, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "public, max-age=86400" };
  const lat = +url.searchParams.get("lat"), lon = +url.searchParams.get("lon");
  if (!isFinite(lat) || !isFinite(lon) || Math.abs(lat + 34.6) > 1.5 || Math.abs(lon + 58.5) > 1.5) return new Response(JSON.stringify({ error: "fuera del AMBA" }), { status: 400, headers: H });
  const out = [], seen = new Set();
  await Promise.all(PICKUP.map(async (store) => {
    try {
      const r = await fetch(`https://${VTEX[store]}/api/checkout/pub/pickup-points?geoCoordinates=${lon.toFixed(5)};${lat.toFixed(5)}`, { headers: { "User-Agent": UA, Accept: "application/json" } });
      if (!r.ok) return;
      for (const it of (await r.json()).items || []) {
        const p = it.pickupPoint || {}, a = p.address || {}, g = a.geoCoordinates || [];
        if (g.length < 2) continue; const k = store + "|" + g[0].toFixed(4) + "|" + g[1].toFixed(4); if (seen.has(k)) continue; seen.add(k);
        const name = String(p.friendlyName || store).replace(/^Retir[aá] en |^Retiro en Tienda ?/i, "").replace(/Mâs/g, "Más").trim() || store;
        out.push({ chain: store, name: /carrefour|d[ií]a|chango/i.test(name) ? name : `${store} ${name}`, lat: g[1], lon: g[0], addr: [a.street, a.number].filter(Boolean).join(" "), hours: "" });
      }
    } catch (e) {}
  }));
  return new Response(JSON.stringify({ at: new Date().toISOString(), items: out }), { headers: H });
}

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    if (req.method === "OPTIONS" && !url.pathname.startsWith("/push/")) return new Response(null, { headers: CORS });
    if (url.pathname.startsWith("/push/")) return pushRoute(req, env, url);
    if (url.pathname === "/verify") return verify(req, env);
    if (url.pathname === "/promos") return promos(env, ctx, false);
    if (url.pathname === "/sucursales") return sucursales(url);
    if (url.pathname !== "/search") return new Response("Menuario · proxy de precios. Usar /search?q=producto, /promos o /push/*", { headers: CORS });
    const q = (url.searchParams.get("q") || "").trim().slice(0, 60);
    if (q.length < 2) return new Response(JSON.stringify({ error: "q muy corto" }), { status: 400, headers: { ...CORS, "Content-Type": "application/json" } });
    const jobs = [...Object.entries(VTEX).map(([s, h]) => vtex(s, h, q).catch(() => [])), coto(q).catch(() => [])];
    const results = (await Promise.all(jobs)).flat();
    return new Response(JSON.stringify({ q, at: new Date().toISOString(), results }), { headers: { ...CORS, "Content-Type": "application/json; charset=utf-8" } });
  },
  // crons (wrangler.toml): cada 3 horas recorre las cadenas y guarda las promos en KV; cada 15 minutos, los recordatorios
  async scheduled(event, env, ctx) {
    if (event.cron === "*/15 * * * *") { await pushCron(env, event.scheduledTime); return; }
    if (!env.PROMOS) return;
    const data = await buildPromos(); await env.PROMOS.put("promos", JSON.stringify(data));
    await promoAlerts(env, data, event.scheduledTime);  // productos de tu lista en promo
  },
};
