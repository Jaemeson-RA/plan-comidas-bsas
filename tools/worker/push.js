/*
 * Menuario · recordatorios por notificación (Web Push con VAPID, sin servidor propio).
 *
 * - POST /push/sub    {endpoint, prefs}  guarda la suscripción en KV (clave "sub:<hash>", todo en la metadata)
 * - POST /push/unsub  {endpoint}         la borra
 * - POST /push/test   {endpoint}         manda una notificación ya (solo a suscripciones guardadas)
 * - cron cada 15 min: a quien le toca un recordatorio en ese cuarto de hora le manda un push VACÍO.
 *
 * El push va sin contenido (no hace falta cifrarlo): el service worker del sitio arma el texto con lo que
 * guardó el navegador (menú de los próximos días, cantidad de productos de la lista y las mismas preferencias).
 * La clave privada VAPID es el secreto VAPID_JWK (JWK P-256); la pública está en config.js (vapidPublicKey).
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

async function keyOf(endpoint) { return "sub:" + b64u(await crypto.subtle.digest("SHA-256", enc(endpoint))).slice(0, 32); }

function validEndpoint(e) { try { const u = new URL(e); return u.protocol === "https:" && PUSH_HOSTS.test(u.hostname) && e.length < 800; } catch (x) { return false; } }

// preferencias: {c: {d: [0..6] (0 = domingo), h: "10:00"} | null, k: "11:30" | null, m: "21:30" | null}
function cleanPrefs(p) {
  p = p || {}; const t = (v) => (typeof v === "string" && HHMM.test(v) ? v : null);
  const c = p.c && Array.isArray(p.c.d) && t(p.c.h) ? { d: [...new Set(p.c.d.map(Number).filter((n) => n >= 0 && n <= 6))].sort(), h: p.c.h } : null;
  return { c: c && c.d.length ? c : null, k: t(p.k), m: t(p.m) };
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

export async function pushRoute(req, env, url) {
  if (req.method === "OPTIONS") return new Response(null, { headers: H });
  if (req.method !== "POST") return out({ error: "usar POST" }, 405);
  if (!env.PROMOS || !env.VAPID_JWK) return out({ error: "push no configurado" }, 503);
  let b; try { b = await req.json(); } catch (e) { return out({ error: "json" }, 400); }
  const endpoint = String(b.endpoint || "");
  if (!validEndpoint(endpoint)) return out({ error: "endpoint no válido" }, 400);
  const key = await keyOf(endpoint);
  if (url.pathname === "/push/sub") {
    const p = cleanPrefs(b.prefs);
    if (!p.c && !p.k && !p.m) { await env.PROMOS.delete(key); return out({ ok: true, removed: true }); }
    // todo en la metadata (máx. 1 KB) para que el cron no tenga que leer cada clave; se renueva en cada visita
    await env.PROMOS.put(key, "1", { metadata: { e: endpoint, p, at: Date.now() }, expirationTtl: 120 * 86400 });
    return out({ ok: true, prefs: p });
  }
  if (url.pathname === "/push/unsub") { await env.PROMOS.delete(key); return out({ ok: true }); }
  if (url.pathname === "/push/test") {
    const meta = (await env.PROMOS.getWithMetadata(key)).metadata;
    if (!meta) return out({ error: "no hay suscripción guardada" }, 404);
    const st = await sendPush(env, endpoint);
    if (st === 404 || st === 410) await env.PROMOS.delete(key);
    return out({ ok: st >= 200 && st < 300, status: st }, st >= 200 && st < 300 ? 200 : 502);
  }
  return out({ error: "ruta" }, 404);
}

// cron cada 15 minutos: ¿a quién le toca en este cuarto de hora (hora de Buenos Aires)?
export async function pushCron(env, scheduledTime) {
  if (!env.PROMOS || !env.VAPID_JWK) return { sent: 0 };
  const local = new Date(scheduledTime + OFFSET_MIN * 60000);
  const slot = local.getUTCHours() * 60 + Math.floor(local.getUTCMinutes() / 15) * 15, dow = local.getUTCDay();
  const due = (h) => { if (!h) return false; const [a, b] = h.split(":").map(Number); return a * 60 + b === slot; };
  let cursor, sent = 0, gone = 0; const jobs = [];
  do {
    const page = await env.PROMOS.list({ prefix: "sub:", cursor, limit: 1000 });
    for (const k of page.keys) {
      const m = k.metadata; if (!m?.e || !m.p) continue;
      const p = m.p;
      if ((p.c && p.c.d.includes(dow) && due(p.c.h)) || due(p.k) || due(p.m)) jobs.push([k.name, m.e]);  // un solo push aunque coincidan dos
    }
    cursor = page.list_complete ? null : page.cursor;
  } while (cursor);
  // el plan gratis de Workers permite 50 pedidos externos por ejecución
  for (const [name, e] of jobs.slice(0, 45)) {
    try { const st = await sendPush(env, e); if (st >= 200 && st < 300) sent++; else if (st === 404 || st === 410) { gone++; await env.PROMOS.delete(name); } } catch (x) {}
  }
  return { slot, dow, due: jobs.length, sent, gone };
}
