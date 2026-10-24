/**
 * Plan de comidas · proxy de precios (Cloudflare Worker).
 * GET /search?q=harina  -> busca en Jumbo, Disco, Vea, Carrefour, Día, ChangoMás (VTEX) y Coto, y devuelve JSON con CORS.
 * POST /verify      -> comprueba un reCAPTCHA v2 con la clave secreta (variable RECAPTCHA_SECRET del Worker).
 * Los sitios de los súper no permiten llamadas directas desde el navegador (sin CORS); este worker las hace por el sitio.
 */
const VTEX = { Jumbo: "www.jumbo.com.ar", Disco: "www.disco.com.ar", Vea: "www.vea.com.ar", Carrefour: "www.carrefour.com.ar", "Día": "diaonline.supermercadosdia.com.ar", "ChangoMás": "www.masonline.com.ar" };
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36";
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
export default {
  async fetch(req, env) {
    if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
    const url = new URL(req.url);
    if (url.pathname === "/verify") return verify(req, env);
    if (url.pathname !== "/search") return new Response("Plan de comidas · proxy de precios. Usar /search?q=producto", { headers: CORS });
    const q = (url.searchParams.get("q") || "").trim().slice(0, 60);
    if (q.length < 2) return new Response(JSON.stringify({ error: "q muy corto" }), { status: 400, headers: { ...CORS, "Content-Type": "application/json" } });
    const jobs = [...Object.entries(VTEX).map(([s, h]) => vtex(s, h, q).catch(() => [])), coto(q).catch(() => [])];
    const results = (await Promise.all(jobs)).flat();
    return new Response(JSON.stringify({ q, at: new Date().toISOString(), results }), { headers: { ...CORS, "Content-Type": "application/json; charset=utf-8" } });
  },
};
