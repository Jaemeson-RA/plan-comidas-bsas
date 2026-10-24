/*
 * Menuario · recordatorios por notificación (Web Push con VAPID, sin servidor propio).
 *
 * - POST /push/sub    {endpoint, prefs, data}  guarda la suscripción en KV (clave "sub:<hash>"): las preferencias en la
 *                      metadata (la lee el cron sin abrir cada clave) y en el valor los productos de la lista de la semana
 *                      y lo que se vence en la heladera (para las alertas de promos y de vencimientos)
 * - POST /push/unsub  {endpoint}               la borra
 * - POST /push/test   {endpoint}               manda una notificación ya (solo a suscripciones guardadas)
 * - POST /push/why    {endpoint}               el service worker pregunta por qué llegó el push (promos de tu lista o prueba)
 * - cron cada 15 min: recordatorios del cuarto de hora (compras, menú, marcar el día, vencimientos)
 * - cron cada 3 horas (después de juntar las promos): si hay productos de tu lista en promo, un aviso por día como mucho
 *
 * El push va sin contenido (no hace falta cifrarlo): el service worker arma el texto con lo que guardó la página o
 * con lo que le contesta /push/why. La clave privada VAPID es el secreto VAPID_JWK; la pública está en config.js.
 */
const VAPID_PUBLIC = "BBaEc689FQhFfj617h0MN7KJi7iaV01eqNjfmRl28uV2aD-zszRaMDvD8JFmitFkQs6kZOxoXZIabC07uJKdSoY";
const SUBJECT = "https://jaemeson-ra.github.io/plan-comidas-bsas/";
// solo servicios de push conocidos: evita que alguien use el Worker para pegarle a cualquier URL
const PUSH_HOSTS = /^(fcm\.googleapis\.com|android\.googleapis\.com|updates\.push\.services\.mozilla\.com|[a-z0-9-]+\.notify\.windows\.com|web\.push\.apple\.com|[a-z0-9.-]+\.push\.apple\.com)$/i;
const OFFSET_MIN = -180;  // Argentina: UTC-3 todo el año
const H = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type", "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" };
const out = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: H });
const b64u = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const enc = (s) => new TextEncoder().encode(s);
const HHMM = /^([01]\d|2[0-3]):(00|15|30|45)$/;
const ISO = /^\d{4}-\d{2}-\d{2}$/;

async function keyOf(endpoint) { return "sub:" + b64u(await crypto.subtle.digest("SHA-256", enc(endpoint))).slice(0, 32); }
function validEndpoint(e) { try { const u = new URL(e); return u.protocol === "https:" && PUSH_HOSTS.test(u.hostname) && e.length < 800; } catch (x) { return false; } }
const localNow = (t = Date.now()) => new Date(t + OFFSET_MIN * 60000);
const isoLocal = (t) => localNow(t).toISOString().slice(0, 10);

// preferencias: {c: {d: [0..6] (0 = domingo), h}, k, m, v: hora | null, pr: true | false}
function cleanPrefs(p) {
  p = p || {}; const t = (v) => (typeof v === "string" && HHMM.test(v) ? v : null);
  const c = p.c && Array.isArray(p.c.d) && t(p.c.h) ? { d: [...new Set(p.c.d.map(Number).filter((n) => n >= 0 && n <= 6))].sort(), h: p.c.h } : null;
  return { c: c && c.d.length ? c : null, k: t(p.k), m: t(p.m), v: t(p.v), pr: p.pr === true };
}
const anyPref = (p) => !!(p.c || p.k || p.m || p.v || p.pr);
// datos para las alertas: hasta 80 productos (nombres cortos) y hasta 60 vencimientos
function cleanData(d) {
  d = d || {};
  const items = Array.isArray(d.items) ? [...new Set(d.items.filter((x) => typeof x === "string").map((x) => x.slice(0, 60)))].slice(0, 80) : [];
  const vence = {}; if (d.vence && typeof d.vence === "object") Object.entries(d.vence).slice(0, 60).forEach(([k, v]) => { if (typeof v === "string" && ISO.test(v)) vence[String(k).slice(0, 60)] = v; });
  return { items, vence };
}

let vapidKey = null;
async function vapidHeader(env, endpoint) {
  if (!vapidKey) vapidKey = await crypto.subtle.importKey("jwk", { ...JSON.parse(env.VAPID_JWK), ext: true }, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const head = b64u(enc(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const body = b64u(enc(JSON.stringify({ aud: new URL(endpoint).origin, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: SUBJECT })));
  const sig = b64u(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, vapidKey, enc(head + "." + body)));  // WebCrypto ya da r||s (formato JWS)
  return `vapid t=${head}.${body}.${sig}, k=${VAPID_PUBLIC}`;
}
async function sendPush(env, endpoint) {
  const r = await fetch(endpoint, { method: "POST", headers: { Authorization: await vapidHeader(env, endpoint), TTL: "3600", Urgency: "normal", "Content-Length": "0" } });
  return r.status;
}
async function readVal(env, key) { try { return JSON.parse((await env.PROMOS.get(key)) || "{}") || {}; } catch (e) { return {}; } }
async function writeSub(env, key, meta, val) { await env.PROMOS.put(key, JSON.stringify(val), { metadata: meta, expirationTtl: 120 * 86400 }); }

// ---------- promos de tu lista: el mismo criterio que el comparador del sitio (palabras del producto, sin «sabor a…») ----------
const nz = (s) => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
const STOP = new Set(["con", "de", "del", "la", "las", "los", "el", "para", "sin", "en", "y", "x", "un", "una"]);
const EXCL = ["sabor", "saboriz", "galletit", "alfajor", "snack", "helado", "caramelo", "golosina", "mermelada", "dulce de", "salsa", "sopa", "condimento", "aderezo", "pure", "cubos", "polvo", "condensada", "chocolat", "pascua", "kinder", "jugo", "limonada", "ketchup", "shampoo", "jabon", "crema de", "tarta", "pizza", "empanada", "relleno", "rellena", "bocadito", "rebozad", "nuggets", "baby", "bebe", "perro", "gato", "mascota", "deshidrat", "en polvo", "harina de", "aceite de", "vinagre", "licor", "cerveza", "vino", "cerdo", "ciabatta", "medialuna", "tallarin", "fideo", "raviol", "sorrentino", "noqui", "crackers", "gall.", "galleta", "medallon", "baston", "premezcla", "falafel", "aritos", "penne", "rigate", "cereal", "granola", "barrita", "barra de", "hamburguesa", "milanesa", "budin", "torta", "bizcoch", "pan con", "con panceta", "con jamon", "con queso", "relleno de", "mayonesa", "mostaza", "dip ", "pate ", "untable de", "tostadit", "crackin", "verdeo", "rallad", "copos", "bebible", "saborizad", "light sabor"];
function promoHits(items, promos) {
  const hits = [];
  for (const it of items) {
    const q = nz(it.replace(/\(.*?\)/g, " ").split(/[/,]/)[0]); const words = q.split(" ").filter((w) => w.length >= 3 && !STOP.has(w)); if (!words.length) continue;
    let best = null;
    for (const p of promos) {
      const n = " " + nz(p.name) + " ";
      if (!words.every((w) => n.includes(" " + w) || n.includes(" " + w.replace(/s$/, "")))) continue;
      if (EXCL.some((x) => n.includes(x) && !q.includes(x))) continue;
      const g = /(\d+) ?(g|gr|grs)\b/.exec(n); if (g && +g[1] < 80) continue;  // sobrecitos y especias: no es el producto de la lista
      if (!n.trim().split(" ").slice(0, 3).some((w) => w.startsWith(words[0].replace(/s$/, "")))) continue;  // «Leche…», «Dientes de ajo…»: no «café con leche» ni «papas sabor cebolla»
      if (!best || (p.pct || 0) > (best.pct || 0)) best = p;
    }
    if (best && (best.pct || best.promo)) hits.push({ n: it.replace(/\s*\(.*?\)/g, "").trim(), store: best.store, name: String(best.name).slice(0, 80), price: best.price, pct: best.pct || 0, promo: best.promo ? String(best.promo).slice(0, 60) : null });
  }
  return hits.sort((a, b) => (b.pct || 0) - (a.pct || 0));
}

export async function pushRoute(req, env, url) {
  if (req.method === "OPTIONS") return new Response(null, { headers: H });
  if (req.method !== "POST") return out({ error: "usar POST" }, 405);
  if (!env.PROMOS || !env.VAPID_JWK) return out({ error: "push no configurado" }, 503);
  if ((+req.headers.get("content-length") || 0) > 20000) return out({ error: "muy grande" }, 413);
  let b; try { b = await req.json(); } catch (e) { return out({ error: "json" }, 400); }
  const endpoint = String(b.endpoint || "");
  if (!validEndpoint(endpoint)) return out({ error: "endpoint no válido" }, 400);
  const key = await keyOf(endpoint);
  if (url.pathname === "/push/sub") {
    const p = cleanPrefs(b.prefs);
    if (!anyPref(p)) { await env.PROMOS.delete(key); return out({ ok: true, removed: true }); }
    const old = await readVal(env, key), d = cleanData(b.data);
    await writeSub(env, key, { e: endpoint, p, at: Date.now() }, { ...old, items: d.items, vence: d.vence });
    return out({ ok: true, prefs: p });
  }
  if (url.pathname === "/push/unsub") { await env.PROMOS.delete(key); return out({ ok: true }); }
  if (url.pathname === "/push/test") {
    const r = await env.PROMOS.getWithMetadata(key); if (!r.metadata) return out({ error: "no hay suscripción guardada" }, 404);
    const val = (() => { try { return JSON.parse(r.value || "{}") || {}; } catch (e) { return {}; } })();
    await writeSub(env, key, r.metadata, { ...val, why: { type: "test", at: Date.now() } });
    const st = await sendPush(env, endpoint);
    if (st === 404 || st === 410) await env.PROMOS.delete(key);
    return out({ ok: st >= 200 && st < 300, status: st }, st >= 200 && st < 300 ? 200 : 502);
  }
  if (url.pathname === "/push/why") {
    const r = await env.PROMOS.getWithMetadata(key); if (!r.metadata) return out({ type: null });
    const val = (() => { try { return JSON.parse(r.value || "{}") || {}; } catch (e) { return {}; } })();
    const w = val.why;
    if (!w || w.seen || Date.now() - w.at > 3 * 3600e3) return out({ type: null });
    await writeSub(env, key, r.metadata, { ...val, why: { ...w, seen: true } });
    return out(w);
  }
  return out({ error: "ruta" }, 404);
}

async function eachSub(env, fn) {
  let cursor;
  do {
    const page = await env.PROMOS.list({ prefix: "sub:", cursor, limit: 1000 });
    for (const k of page.keys) if (k.metadata?.e && k.metadata.p) await fn(k);
    cursor = page.list_complete ? null : page.cursor;
  } while (cursor);
}

// cron cada 15 minutos: ¿a quién le toca en este cuarto de hora (hora de Buenos Aires)?
export async function pushCron(env, scheduledTime) {
  if (!env.PROMOS || !env.VAPID_JWK) return { sent: 0 };
  const local = localNow(scheduledTime);
  const slot = local.getUTCHours() * 60 + Math.floor(local.getUTCMinutes() / 15) * 15, dow = local.getUTCDay();
  const due = (h) => { if (!h) return false; const [a, b] = h.split(":").map(Number); return a * 60 + b === slot; };
  const today = isoLocal(scheduledTime), tomorrow = isoLocal(scheduledTime + 864e5);
  const jobs = [];
  await eachSub(env, async (k) => {
    const p = k.metadata.p;
    if ((p.c && p.c.d.includes(dow) && due(p.c.h)) || due(p.k) || due(p.m)) { jobs.push([k.name, k.metadata.e]); return; }  // un solo push aunque coincidan dos
    if (due(p.v)) {  // vencimientos: solo si algo se vence hoy o mañana
      const val = await readVal(env, k.name);
      if (Object.values(val.vence || {}).some((d) => d <= tomorrow && d >= today)) jobs.push([k.name, k.metadata.e]);
    }
  });
  let sent = 0, gone = 0;
  for (const [name, e] of jobs.slice(0, 45)) {  // el plan gratis de Workers permite 50 pedidos externos por ejecución
    try { const st = await sendPush(env, e); if (st >= 200 && st < 300) sent++; else if (st === 404 || st === 410) { gone++; await env.PROMOS.delete(name); } } catch (x) {}
  }
  return { slot, dow, due: jobs.length, sent, gone };
}

// cada 3 horas, con las promos recién juntadas: avisa a quien tiene productos de su lista en promo (uno por día, de 9 a 21)
export async function promoAlerts(env, promos, scheduledTime = Date.now()) {
  if (!env.PROMOS || !env.VAPID_JWK || !promos?.items?.length) return { sent: 0 };
  const h = localNow(scheduledTime).getUTCHours(); if (h < 9 || h > 21) return { sent: 0, fuera: true };
  const today = isoLocal(scheduledTime); let sent = 0, n = 0;
  await eachSub(env, async (k) => {
    if (!k.metadata.p.pr || sent >= 40) return;
    const val = await readVal(env, k.name); if (val.lastPromoDay === today || !val.items?.length) return;
    const hits = promoHits(val.items, promos.items); n++;
    const sig = hits.slice(0, 5).map((x) => x.n + "@" + x.store).join("|");
    if (!hits.length || sig === val.lastPromoSig) return;
    await writeSub(env, k.name, k.metadata, { ...val, lastPromoDay: today, lastPromoSig: sig, why: { type: "promos", at: Date.now(), total: hits.length, items: hits.slice(0, 3) } });
    try { const st = await sendPush(env, k.metadata.e); if (st >= 200 && st < 300) sent++; else if (st === 404 || st === 410) await env.PROMOS.delete(k.name); } catch (x) {}
  });
  return { sent, revisadas: n };
}
