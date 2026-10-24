/* Cuenta, calendario personal, recetas e ingredientes de la comunidad, nutrición.
   Firebase Auth (email + contraseña) + Realtime Database. Páginas: mi-plan.html y nutricion.html. */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, sendPasswordResetEmail, updateProfile, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getDatabase, ref, set, update, onValue, get, push, remove } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js";

const D = window.DATA, CFG = window.CONFIG || {}, R = D.recipes;
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const ic = (n) => `<svg class="ic"><use href="#i-${n}"/></svg>`;
const page = $("main").dataset.page;
const ADMIN = (CFG.adminEmail || "").toLowerCase();
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const DOW = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const SLOTS = ["desayuno", "almuerzo", "cena"];
const NUTK = ["kcal", "prot", "carb", "sug", "fat", "sat", "fib", "sal"];
const todayISO = new Date().toISOString().slice(0, 10);
const iso = (d) => d.toISOString().slice(0, 10);
const addDays = (s, n) => { const d = new Date(s + "T12:00:00"); d.setDate(d.getDate() + n); return iso(d); };
const mondayOf = (s) => { const d = new Date(s + "T12:00:00"); const k = (d.getDay() + 6) % 7; d.setDate(d.getDate() - k); return iso(d); };
const label = (s) => { const [y, m, d] = s.split("-").map(Number); return `${d} ${MESES[m - 1]}`; };
const norm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const PLACEHOLDER = "data:image/svg+xml;utf8," + encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 300'><rect width='400' height='300' fill='#F4ECDC'/><g fill='none' stroke='#17302B' stroke-width='10' stroke-linecap='round' stroke-linejoin='round'><path d='M90 150h220'/><path d='M110 150v70a50 50 0 0 0 50 50h80a50 50 0 0 0 50-50v-70'/><path d='M200 95v55M165 95h70'/><path d='M165 55c0-18 18-18 18-36M217 55c0-18 18-18 18-36'/></g></svg>`);
const toast = (msg) => { let t = $("#toast"); if (!t) { t = document.createElement("div"); t.id = "toast"; t.className = "toast"; document.body.appendChild(t); } t.textContent = msg; t.classList.add("show"); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove("show"), 3000); };
const houseDays = Object.fromEntries(D.weeks.flatMap((w) => w.days).map((d) => [d.date, d]));
const copyText = (text) => navigator.clipboard.writeText(text).then(() => true).catch(() => { const ta = document.createElement("textarea"); ta.value = text; ta.style.cssText = "position:fixed;opacity:0"; document.body.appendChild(ta); ta.select(); let ok = false; try { ok = document.execCommand("copy"); } catch (e) {} ta.remove(); return ok; });

// ---------- Firebase ----------
const app = initializeApp(CFG.firebase);
const auth = getAuth(app);
const db = getDatabase(app);
let user = null, cal = null, unsubCal = null;
let community = {}, ingDB = {};   // recetas e ingredientes compartidos (RTDB)
const ERR = {
  "auth/email-already-in-use": "Ya hay una cuenta con ese correo. Probá ingresar.", "auth/invalid-credential": "Correo o contraseña incorrectos.",
  "auth/wrong-password": "Contraseña incorrecta.", "auth/user-not-found": "No hay ninguna cuenta con ese correo.", "auth/weak-password": "La contraseña tiene que tener al menos 6 caracteres.",
  "auth/invalid-email": "Ese correo no parece válido.", "auth/too-many-requests": "Demasiados intentos. Esperá un minuto y volvé a probar.", "auth/network-request-failed": "Sin conexión. Revisá internet y volvé a probar.",
  "auth/operation-not-allowed": "El ingreso con correo todavía no está habilitado en Firebase (paso manual del README: Authentication → Email/Password).",
  "auth/unauthorized-domain": "Este dominio todavía no está autorizado en Firebase (README: Authentication → Settings → Authorized domains).",
  "PERMISSION_DENIED": "La base de datos todavía no tiene las reglas desplegadas (README: docs/firebase-rules.json).",
};
const errMsg = (e) => ERR[e?.code] || ERR[String(e?.message || "").split(":")[0].trim()] || ("No se pudo completar: " + (e?.code || e?.message || e));

// ---------- ingredientes: base + comunidad ----------
function allIngredients() {
  const base = (D.ingredientes || []).map((x) => Object.assign({}, x, { source: "base" }));
  const com = Object.entries(ingDB).map(([id, x]) => Object.assign({}, x, { id: "c_" + id, key: id, source: "comunidad" }));
  return [...base, ...com];
}
function findIng(q, limit = 12) {
  q = norm(q); if (!q) return [];
  return allIngredients().filter((x) => norm(x.n + " " + (x.marca || "") + " " + (x.alias || []).join(" ")).includes(q)).slice(0, limit);
}
function gramsOf(row) { if (row.u === "g" || row.u === "ml") return row.q; if (row.u === "u") return row.q * (row.peso || 100); if (row.u === "cda") return row.q * 10; if (row.u === "cdita") return row.q * 4; return row.q; }
function nutOfRows(rows, porciones) {
  const t = Object.fromEntries(NUTK.map((k) => [k, 0]));
  rows.forEach((r) => { const g = gramsOf(r); NUTK.forEach((k) => { t[k] += (r.por100?.[k] || 0) * g / 100; }); });
  NUTK.forEach((k) => { t[k] = Math.round(t[k] / Math.max(1, porciones) * 10) / 10; });
  t.source = "ingredientes"; return t;
}
// recetas de la comunidad → mismo formato que las del sitio, registradas en R con id "u_<key>"
function adoptCommunity() {
  Object.keys(R).forEach((k) => { if (k.startsWith("u_")) delete R[k]; });
  Object.entries(community).forEach(([key, c]) => {
    const id = "u_" + key;
    R[id] = { id, key, custom: true, owner: c.owner, ownerName: c.ownerName || "alguien de la comunidad", name: c.name, tipo: c.tipo || "plato", tiempo: c.tiempo || 30, kcal: Math.round(c.nut?.kcal || 0), cost: null,
      tags: c.tags || [], porciones: c.porciones || 2, ing: (c.ing || []).map((i) => ({ n: i.n, q: i.q, u: i.u, c: i.c || "alm" })), pasos: c.pasos || [], tip: c.tip || "", yt: null,
      img: c.img || PLACEHOLDER, credit: null, nut: c.nut || {} };
  });
}
onValue(ref(db, "recetas"), (s) => { community = s.val() || {}; adoptCommunity(); render(); }, () => {});
onValue(ref(db, "ingredientes"), (s) => { ingDB = s.val() || {}; render(); }, () => {});

// ---------- auth UI ----------
let mode = "login";
const authBox = $("#authBox");
if (authBox) {
  $("#fName").hidden = true;
  // captcha local: pregunta aritmética + campo trampa + tiempo mínimo (sin servidor; App Check de Firebase agrega la capa fuerte, ver README)
  let captcha = { a: 0, b: 0, t: 0 };
  const newCaptcha = () => { captcha = { a: 2 + Math.floor(Math.random() * 8), b: 1 + Math.floor(Math.random() * 9), t: Date.now() }; $("#captchaQ").textContent = `¿cuánto es ${captcha.a} + ${captcha.b}?`; $("#aCaptcha").value = ""; };
  $("#captchaNew").addEventListener("click", newCaptcha);
  $("#authSeg").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; mode = b.dataset.mode; $$("#authSeg button").forEach((x) => x.classList.toggle("on", x === b)); $("#fName").hidden = mode !== "signup"; $("#fCaptcha").hidden = mode !== "signup"; if (mode === "signup") newCaptcha(); $("#authBtn").textContent = mode === "signup" ? "Crear mi cuenta" : "Ingresar"; $("#aPass").autocomplete = mode === "signup" ? "new-password" : "current-password"; });
  $("#authForm").addEventListener("submit", async (e) => {
    e.preventDefault(); const err = $("#authErr"); err.hidden = true;
    const email = $("#aEmail").value.trim(), pass = $("#aPass").value, name = ($("#aName")?.value || "").trim();
    if (!email || pass.length < 6) { err.textContent = "Completá el correo y una contraseña de al menos 6 caracteres."; err.hidden = false; return; }
    if (mode === "signup") {
      if ($("#aWeb").value) { err.textContent = "No se pudo crear la cuenta."; err.hidden = false; return; }  // campo trampa: solo lo llenan los bots
      if (+$("#aCaptcha").value !== captcha.a + captcha.b) { err.textContent = "La comprobación no coincide: resolvé la suma para crear la cuenta."; err.hidden = false; newCaptcha(); return; }
      if (Date.now() - captcha.t < 1500) { err.textContent = "Muy rápido… volvé a intentar."; err.hidden = false; newCaptcha(); return; }
    }
    $("#authBtn").disabled = true;
    try {
      if (mode === "signup") {
        const cred = await createUserWithEmailAndPassword(auth, email, pass);
        if (name) await updateProfile(cred.user, { displayName: name });
        await set(ref(db, `calendars/${cred.user.uid}/profile`), { name: name || email.split("@")[0], email, createdAt: new Date().toISOString() });
        window.notifyAdmin?.({ type: "nueva_cuenta", title: name || email, name, email });
        toast("¡Cuenta creada! Ya podés armar tu calendario.");
      } else await signInWithEmailAndPassword(auth, email, pass);
    } catch (ex) { err.textContent = errMsg(ex); err.hidden = false; }
    $("#authBtn").disabled = false;
  });
  $("#authReset").addEventListener("click", async () => {
    const email = $("#aEmail").value.trim(); const err = $("#authErr");
    if (!email) { err.textContent = "Escribí tu correo arriba y volvé a tocar «Olvidé mi contraseña»."; err.hidden = false; return; }
    try { await sendPasswordResetEmail(auth, email); toast("Te mandamos un correo para cambiar la contraseña."); } catch (ex) { err.textContent = errMsg(ex); err.hidden = false; }
  });
}
$("#logout")?.addEventListener("click", () => signOut(auth));
onAuthStateChanged(auth, (u) => {
  user = u; if (unsubCal) { unsubCal(); unsubCal = null; }
  if (authBox) authBox.hidden = !!u;
  if (u) {
    unsubCal = onValue(ref(db, `calendars/${u.uid}`), (snap) => { cal = snap.val() || {}; render(); }, (e) => { toast(errMsg(e)); cal = {}; render(); });
    if (u.email && u.email.toLowerCase() === ADMIN && $("#adminBox")) loadAdmin();
  } else { cal = null; render(); }
});
const myName = () => cal?.profile?.name || user?.displayName || (user?.email || "").split("@")[0];

// ---------- compartido ----------
function weekList() {
  const first = mondayOf(todayISO);  // tu calendario arranca en tu semana actual, aunque el plan de la casa empiece después
  return Array.from({ length: 6 }, (_, i) => { const s = addDays(first, i * 7); return { start: s, end: addDays(s, 6), label: `${label(s)} → ${label(addDays(s, 6))}` }; });
}
function dayPlan(dateISO, src) {
  if (src === "mio") { const d = cal?.days?.[dateISO]; return d && SLOTS.some((s) => d[s] && R[d[s]]) ? d : null; }
  const h = houseDays[dateISO]; return h ? { desayuno: h.desayuno, almuerzo: h.almuerzo, cena: h.cena } : null;
}
function aggregateShopping(days) {
  const agg = new Map();
  days.forEach((d) => SLOTS.forEach((s) => { const r = R[d?.[s]]; if (!r) return; r.ing.forEach((i) => { if (i.c === "pantry") return; const k = `${i.c}|${i.n}|${i.u}`; agg.set(k, (agg.get(k) || 0) + i.q); }); }));
  const CATS = { verd: "Verdulería", carne: "Carnicería y pescadería", lact: "Lácteos y huevos", alm: "Almacén", pan: "Panadería" };
  const fmtq = (q, u) => { q = Math.round(q * 10) / 10; if ((u === "g" || u === "ml") && q >= 1000) return `${q / 1000} ${u === "g" ? "kg" : "L"}`; return u === "u" ? `${q} u` : `${q} ${u}`; };
  const out = Object.keys(CATS).map((c) => ({ cat: CATS[c], items: [] }));
  [...agg.entries()].forEach(([k, q]) => { const [c, n, u] = k.split("|"); (out.find((x) => x.cat === CATS[c]) || out[3]).items.push({ n, q: fmtq(q, u) }); });
  out.forEach((c) => c.items.sort((a, b) => a.n.localeCompare(b.n)));
  return out.filter((c) => c.items.length);
}
function render() { if (page === "miplan") { renderMiPlan(); renderMyRecipes(); renderIngredients(); renderRank(); renderWho(); renderPerfil(); renderFriends(); } if (page === "nutricion") renderNut(); }

// =====================================================================
// MI PLAN · calendario
// =====================================================================
let myWeek = null, pickCtx = null, notifyTimer = null;
$("#mpSeg")?.addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; $$("#mpSeg button").forEach((x) => x.classList.toggle("on", x === b)); ["cal", "rec", "ing", "rank", "perfil"].forEach((t) => { $("#tab" + t[0].toUpperCase() + t.slice(1)).hidden = b.dataset.tab !== t; }); localStorage.setItem("mpTab", b.dataset.tab); window.dispatchEvent(new Event("scroll")); });
if (page === "miplan") { const t = location.hash === "#rank" ? "rank" : localStorage.getItem("mpTab"); if (t) $(`#mpSeg [data-tab="${t}"]`)?.click(); }
function renderMiPlan() {
  const box = $("#planBox"); if (!box) return; box.hidden = !user; if (!user) return;
  $("#whoName").textContent = myName(); $("#whoEmail").textContent = "· " + user.email;
  const weeks = weekList(); if (!myWeek || !weeks.some((w) => w.start === myWeek)) myWeek = weeks[0].start;
  $("#myWeekTabs").innerHTML = weeks.map((w) => `<button data-w="${w.start}" class="${w.start === myWeek ? "on" : ""}">${esc(w.label)}</button>`).join("");
  const days = Array.from({ length: 7 }, (_, i) => addDays(myWeek, i));
  $("#myCal").innerHTML = days.map((dt, i) => { const d = cal?.days?.[dt] || {}; return `<article class="my-day${dt === todayISO ? " today" : ""}"><h4>${DOW[i]} <span>${label(dt)}</span></h4>
      ${SLOTS.map((s) => { const r = R[d[s]]; return `<button class="slot${r ? "" : " empty"}" data-date="${dt}" data-slot="${s}">${ic(s)}${r ? `<img src="${r.img}" alt=""><span>${esc(r.name)}${r.custom ? " <small>· receta de " + esc(r.ownerName) + "</small>" : ""}</span>` : `<span>+ elegir ${s}</span>`}</button>`; }).join("")}
      ${dt <= todayISO ? (cal?.libre?.[dt] ? `<span class="done-btn libre">${ic("star")} Día libre (combo a salvo)</span>` : `<span class="done-row"><button class="done-btn${cal?.done?.[dt] ? " on" : ""}" data-done="${dt}">${ic("check")} ${cal?.done?.[dt] ? "Día cumplido" : "Marcar cumplido"}</button>${!cal?.done?.[dt] && fichasDisponibles() > 0 ? `<button class="done-btn ficha" data-libre="${dt}" title="Usar una ficha: el día no suma puntos pero no corta la racha">${ic("coin")} Día libre</button>` : ""}</span>`) : `<span class="done-btn future">${ic("clock")} todavía no</span>`}
    </article>`; }).join("");
  const list = aggregateShopping(days.map((dt) => cal?.days?.[dt]));
  const key = (c, n) => `myshop:${myWeek}:${c}:${n}`;
  $("#myShop").innerHTML = list.length ? list.map((c) => `<div class="shop-cat"><h4>${esc(c.cat)} <small>${c.items.length}</small></h4>${c.items.map((i) => { const dn = localStorage.getItem(key(c.cat, i.n)) === "1"; return `<label class="${dn ? "done" : ""}"><input type="checkbox" data-k="${esc(key(c.cat, i.n))}" ${dn ? "checked" : ""}><span>${esc(i.n)}</span><em class="q">${esc(i.q)}</em></label>`; }).join("")}</div>`).join("")
    : `<p class="muted">Todavía no elegiste platos para esta semana. Tocá «+ elegir» en un día, o copiá el plan de la casa.</p>`;
  $("#myShare").hidden = !navigator.share;
  window.dispatchEvent(new Event("scroll"));
}
$("#myWeekTabs")?.addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) { myWeek = b.dataset.w; renderMiPlan(); } });
$("#myCal")?.addEventListener("click", (e) => { const b = e.target.closest(".slot"); if (b) openPicker(b.dataset.date, b.dataset.slot); });
$("#myShop")?.addEventListener("change", (e) => { const cb = e.target; if (cb.type === "checkbox") { localStorage.setItem(cb.dataset.k, cb.checked ? "1" : "0"); cb.closest("label").classList.toggle("done", cb.checked); } });
$("#fillHouse")?.addEventListener("click", async () => {
  const upd = {}; let n = 0;
  Array.from({ length: 7 }, (_, i) => addDays(myWeek, i)).forEach((dt) => { const h = houseDays[dt]; if (h) { upd[dt] = { desayuno: h.desayuno, almuerzo: h.almuerzo, cena: h.cena }; n++; } });
  if (!n) { toast("Esta semana no está en el plan de la casa (27 oct → 30 nov). Elegí los platos a mano."); return; }
  try { await update(ref(db, `calendars/${user.uid}/days`), upd); touched("Copié el plan de la casa: " + n + " días."); } catch (e) { toast(errMsg(e)); }
});
$("#clearMyWeek")?.addEventListener("click", async () => { const upd = {}; Array.from({ length: 7 }, (_, i) => addDays(myWeek, i)).forEach((dt) => { upd[dt] = null; }); try { await update(ref(db, `calendars/${user.uid}/days`), upd); touched("Semana vaciada."); } catch (e) { toast(errMsg(e)); } });
const myListText = () => { const days = Array.from({ length: 7 }, (_, i) => addDays(myWeek, i)); const lines = [`Lista de compras · ${label(myWeek)} → ${label(addDays(myWeek, 6))}`, ""]; aggregateShopping(days.map((dt) => cal?.days?.[dt])).forEach((c) => { lines.push(c.cat.toUpperCase()); c.items.forEach((i) => lines.push(`- ${i.n} · ${i.q}`)); lines.push(""); }); return lines.join("\n"); };
$("#myDl")?.addEventListener("click", () => { const days = Array.from({ length: 7 }, (_, i) => addDays(myWeek, i)); window.downloadListHtml(`Lista de compras · ${label(myWeek)} → ${label(addDays(myWeek, 6))}`, aggregateShopping(days.map((dt) => cal?.days?.[dt])), `mi-lista-${myWeek}.html`); });
$("#myCopy")?.addEventListener("click", async () => { toast((await copyText(myListText())) ? "Lista copiada. Pegala en Notas o WhatsApp." : "No se pudo copiar."); });
$("#myShare")?.addEventListener("click", async () => { try { await navigator.share({ title: "Mi lista de compras", text: myListText() }); } catch (e) {} });
function touched(msg) {
  if (msg) toast(msg);
  const st = $("#saveState"); if (st) { st.textContent = "guardado ✓"; st.classList.add("show"); setTimeout(() => st.classList.remove("show"), 1800); }
  update(ref(db, `calendars/${user.uid}`), { updatedAt: new Date().toISOString() }).catch(() => {});
  clearTimeout(notifyTimer);
  notifyTimer = setTimeout(() => {
    const days = Array.from({ length: 7 }, (_, i) => addDays(myWeek, i));
    const resumen = days.map((dt, i) => { const d = cal?.days?.[dt] || {}; return `${DOW[i]} ${label(dt)}: ${SLOTS.map((s) => R[d[s]]?.name || "—").join(" / ")}`; }).join("\n");
    window.notifyAdmin?.({ type: "calendario", title: myName(), name: myName(), email: user.email, semana: `${label(myWeek)} → ${label(addDays(myWeek, 6))}`, resumen });
  }, 6000);
}
// selector de platos (sitio + comunidad)
function openPicker(date, slot) {
  pickCtx = { date, slot };
  $("#pickerTitle").textContent = `${slot[0].toUpperCase() + slot.slice(1)} · ${DOW[(new Date(date + "T12:00:00").getDay() + 6) % 7]} ${label(date)}`;
  $("#pickerSearch").value = ""; fillPicker(""); $("#picker").hidden = false; document.body.style.overflow = "hidden"; setTimeout(() => $("#pickerSearch").focus(), 50);
}
function fillPicker(q) {
  q = norm(q);
  const rank = (r) => (r.custom && r.owner === user?.uid ? 0 : r.tipo === (pickCtx.slot === "desayuno" ? "desayuno" : "plato") ? 1 : 2);
  const list = Object.values(R).filter((r) => !q || norm(r.name + " " + r.tags.join(" ") + " " + r.ing.map((i) => i.n).join(" ") + (r.custom ? " mi receta comunidad " + r.ownerName : "")).includes(q)).sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));
  $("#pickerGrid").innerHTML = list.map((r) => `<button class="pick" data-pick="${r.id}"><img src="${r.img}" alt="" loading="lazy"><span><b>${esc(r.name)}</b><small>${r.tiempo} min · ${r.kcal} kcal${r.porciones > 1 ? " · rinde " + r.porciones : ""}${r.tipo === "desayuno" ? " · desayuno" : ""}${r.custom ? " · de " + esc(r.ownerName) : ""}</small></span></button>`).join("") || `<p class="muted">Nada con ese nombre.</p>`;
}
$("#pickerSearch")?.addEventListener("input", (e) => fillPicker(e.target.value));
$("#picker")?.addEventListener("click", async (e) => {
  if (e.target.closest("[data-pclose]")) { closePicker(); return; }
  const p = e.target.closest("[data-pick]");
  if (p && pickCtx) { try { await update(ref(db, `calendars/${user.uid}/days/${pickCtx.date}`), { [pickCtx.slot]: p.dataset.pick }); closePicker(); touched(); } catch (ex) { toast(errMsg(ex)); } }
});
$("#pickerClear")?.addEventListener("click", async () => { if (pickCtx) { await update(ref(db, `calendars/${user.uid}/days/${pickCtx.date}`), { [pickCtx.slot]: null }).catch(() => {}); closePicker(); touched(); } });
function closePicker() { $("#picker").hidden = true; document.body.style.overflow = ""; }

// =====================================================================
// MI PLAN · mis recetas (editor)
// =====================================================================
let edRows = [], edKey = null;
function recipeCard(r, mine) {
  return `<div class="rc-wrap"><button class="rc" data-rec="${r.id}"><img src="${r.img}" alt="" loading="lazy"><div class="b"><h4>${esc(r.name)}</h4><div class="meta"><span>${ic("clock")}<b>${r.tiempo} min</b></span><span>${ic("flame")}<b>${r.kcal}</b> kcal</span><span>${ic("users")}<b>${r.porciones}</b> porc.</span></div><div><span class="tag">${mine ? "mi receta" : "de " + esc(r.ownerName)}</span>${(r.tags || []).slice(0, 2).map((t) => `<span class="tag">${esc(t)}</span>`).join("")}</div></div></button>${mine ? `<button class="mini-btn edit" data-edit="${r.key}">${ic("copy")} Editar</button>` : ""}</div>`;
}
function renderMyRecipes() {
  if (!$("#myRecipes") || !user) return;
  const all = Object.values(R).filter((r) => r.custom).sort((a, b) => (community[b.key]?.createdAt || "").localeCompare(community[a.key]?.createdAt || ""));
  const mine = all.filter((r) => r.owner === user.uid), others = all.filter((r) => r.owner !== user.uid);
  $("#myRecipes").innerHTML = mine.length ? mine.map((r) => recipeCard(r, true)).join("") : `<p class="muted">Todavía no creaste ninguna. Tocá «Nueva receta»: elegís los ingredientes, ponés cantidades y la nutrición se calcula sola.</p>`;
  $("#communityRecipes").innerHTML = others.length ? others.map((r) => recipeCard(r, false)).join("") : `<p class="muted">Todavía no hay recetas de otras personas.</p>`;
  window.dispatchEvent(new Event("scroll"));
}
$("#newRecipe")?.addEventListener("click", () => openEditor(null));
$("#myRecipes")?.addEventListener("click", (e) => { const b = e.target.closest("[data-edit]"); if (b) { e.stopPropagation(); openEditor(b.dataset.edit); } });
function openEditor(key) {
  edKey = key; const c = key ? community[key] : null;
  $("#recEditorTitle").textContent = c ? "Editar receta" : "Nueva receta";
  $("#rName").value = c?.name || ""; $("#rTipo").value = c?.tipo || "plato"; $("#rPorc").value = c?.porciones || 1; $("#rTiempo").value = c?.tiempo || 30; $("#rImg").value = c?.img || "";
  $("#rPasos").value = (c?.pasos || []).join("\n"); $("#rTip").value = c?.tip || ""; $("#rTags").value = (c?.tags || []).join(", ");
  edRows = (c?.ing || []).map((i) => Object.assign({}, i));
  $("#recDelete").hidden = !c; $("#recErr").hidden = true; $("#rIngSearch").value = ""; $("#rIngSugs").hidden = true;
  drawRows(); $("#recEditor").hidden = false; document.body.style.overflow = "hidden";
}
function closeEditor() { $("#recEditor").hidden = true; document.body.style.overflow = ""; }
function drawRows() {
  $("#rIngRows").innerHTML = edRows.map((r, i) => `<div class="ing-row"><span class="n">${esc(r.n)}${r.marca ? ` <small>${esc(r.marca)}</small>` : ""}</span><input type="number" min="0" step="any" value="${r.q}" data-i="${i}" data-f="q"><select data-i="${i}" data-f="u">${["g", "ml", "u", "cda", "cdita"].map((u) => `<option ${u === r.u ? "selected" : ""}>${u}</option>`).join("")}</select><span class="g">${Math.round(gramsOf(r))} g</span><button type="button" class="x" data-del="${i}" aria-label="Quitar">×</button></div>`).join("") || `<p class="muted small">Sin ingredientes todavía.</p>`;
  const n = nutOfRows(edRows, +$("#rPorc").value || 1);
  $("#rNutLive").innerHTML = edRows.length ? `<b>Por porción:</b> ${Math.round(n.kcal)} kcal · ${n.prot} g prot · ${n.carb} g carb (${n.sug} g azúcar) · ${n.fat} g grasa (${n.sat} g sat.) · ${n.fib} g fibra · ${n.sal} g sal` : "";
}
$("#rIngSearch")?.addEventListener("input", (e) => { const res = findIng(e.target.value); const box = $("#rIngSugs"); box.hidden = !res.length; box.innerHTML = res.map((x) => `<button type="button" data-add="${x.id}"><b>${esc(x.n)}</b> <small>${x.marca ? esc(x.marca) + " · " : ""}${x.por100.kcal} kcal/100 g · ${x.source}</small></button>`).join(""); });
$("#rIngSugs")?.addEventListener("click", (e) => { const b = e.target.closest("[data-add]"); if (!b) return; const x = allIngredients().find((y) => y.id === b.dataset.add); if (!x) return; edRows.push({ ref: x.id, n: x.n, marca: x.marca || "", c: x.cat, por100: x.por100, peso: x.u || null, q: x.u ? 1 : 100, u: x.u ? "u" : "g" }); $("#rIngSearch").value = ""; $("#rIngSugs").hidden = true; drawRows(); });
$("#rIngRows")?.addEventListener("input", (e) => { const el = e.target; const i = +el.dataset.i; if (Number.isNaN(i)) return; edRows[i][el.dataset.f] = el.dataset.f === "q" ? +el.value : el.value; drawRows(); });
$("#rIngRows")?.addEventListener("click", (e) => { const b = e.target.closest("[data-del]"); if (b) { edRows.splice(+b.dataset.del, 1); drawRows(); } });
$("#rPorc")?.addEventListener("input", drawRows);
$("#recEditor")?.addEventListener("click", (e) => { if (e.target.closest("[data-eclose]")) closeEditor(); });
$("#recForm")?.addEventListener("submit", async (e) => {
  e.preventDefault(); const err = $("#recErr"); err.hidden = true; const snap = myXP();  // XP antes de guardar
  const name = $("#rName").value.trim(); if (!name) { err.textContent = "Ponele un nombre."; err.hidden = false; return; }
  if (!edRows.length) { err.textContent = "Agregá al menos un ingrediente."; err.hidden = false; return; }
  const porciones = Math.max(1, +$("#rPorc").value || 1);
  const data = { name, tipo: $("#rTipo").value, porciones, tiempo: Math.max(1, +$("#rTiempo").value || 30), img: $("#rImg").value.trim() || null,
    ing: edRows.map((r) => ({ ref: r.ref, n: r.n, marca: r.marca || "", q: +r.q, u: r.u, c: r.c, g: Math.round(gramsOf(r)), peso: r.peso || null, por100: r.por100 })),
    pasos: $("#rPasos").value.split("\n").map((s) => s.trim()).filter(Boolean), tip: $("#rTip").value.trim(), tags: $("#rTags").value.split(",").map((s) => s.trim()).filter(Boolean),
    nut: nutOfRows(edRows, porciones), owner: user.uid, ownerName: myName(), ownerEmail: user.email, createdAt: community[edKey]?.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString() };
  try {
    if (edKey) await update(ref(db, `recetas/${edKey}`), data); else await set(push(ref(db, "recetas")), data);
    closeEditor(); toast("Receta guardada: ya está disponible para todos."); if (!edKey) setTimeout(() => gainXP(80, "receta creada", snap), 700); setTimeout(syncPublic, 1500);
    window.notifyAdmin?.({ type: "receta", title: name, de: myName(), email: user.email, porciones, ingredientes: data.ing.map((i) => `${i.n} ${i.q} ${i.u}`).join(", "), nutricion: data.nut, pasos: data.pasos.join(" | ") });
  } catch (ex) { err.textContent = errMsg(ex); err.hidden = false; }
});
$("#recDelete")?.addEventListener("click", async () => { if (edKey && confirm("¿Borrar esta receta?")) { await remove(ref(db, `recetas/${edKey}`)).catch((e) => toast(errMsg(e))); closeEditor(); } });

// =====================================================================
// MI PLAN · mis ingredientes (lista, Open Food Facts, escáner)
// =====================================================================
let ingQ = "", ingKey = null, stream = null, zxReader = null, scanTimer = null;
function renderIngredients() {
  if (!$("#ingList") || !user) return;
  const all = allIngredients(); const q = norm(ingQ);
  const mine = all.filter((x) => x.source === "comunidad" && x.owner === user.uid), com = all.filter((x) => x.source === "comunidad" && x.owner !== user.uid), base = all.filter((x) => x.source === "base");
  const f = (arr) => arr.filter((x) => !q || norm(x.n + " " + (x.marca || "") + " " + (x.alias || []).join(" ")).includes(q));
  const row = (x, mineRow) => `<div class="ing-item"><div><b>${esc(x.n)}</b>${x.marca ? ` <small>${esc(x.marca)}</small>` : ""}<br><small class="muted">${x.por100.kcal} kcal · ${x.por100.prot} g prot · ${x.por100.carb} g carb · ${x.por100.fat} g grasa · ${x.por100.fib ?? 0} g fibra · ${x.por100.sal ?? 0} g sal (por 100 g)${x.source === "comunidad" ? " · cargado por " + esc(x.ownerName || "la comunidad") : ""}</small></div>${mineRow ? `<button class="mini-btn" data-iedit="${x.key}">Editar</button>` : ""}</div>`;
  $("#ingList").innerHTML = `<h3 class="sub">Mis ingredientes <small class="muted">(${mine.length})</small></h3>${f(mine).map((x) => row(x, true)).join("") || `<p class="muted small">Todavía no cargaste ninguno. Escaneá un paquete o cargalo a mano.</p>`}
    <h3 class="sub">De la comunidad <small class="muted">(${com.length})</small></h3>${f(com).map((x) => row(x, false)).join("") || `<p class="muted small">Nada todavía.</p>`}
    <h3 class="sub">Base del sitio <small class="muted">(${base.length})</small></h3>${f(base).slice(0, q ? 60 : 12).map((x) => row(x, false)).join("")}${!q && base.length > 12 ? `<p class="muted small">… y ${base.length - 12} más: usá el buscador.</p>` : ""}`;
}
$("#ingSearch")?.addEventListener("input", (e) => { ingQ = e.target.value; renderIngredients(); });
$("#ingList")?.addEventListener("click", (e) => { const b = e.target.closest("[data-iedit]"); if (b) openIng(b.dataset.iedit); });
$("#newIng")?.addEventListener("click", () => openIng(null));
$("#scanBtn")?.addEventListener("click", () => { openIng(null); startScan(); });
$("#offSearch")?.addEventListener("click", async () => { const q = $("#ingSearch").value.trim(); if (!q) { toast("Escribí qué buscar primero."); return; } openIng(null); await offSearch(q); });
function fillIngForm(x) {
  $("#iName").value = x.n || ""; $("#iMarca").value = x.marca || ""; $("#iCat").value = x.cat || "alm"; $("#iCode").value = x.barcode || ""; $("#iUnit").value = x.u || "";
  const p = x.por100 || {}; [["nKcal", "kcal"], ["nProt", "prot"], ["nCarb", "carb"], ["nSug", "sug"], ["nFat", "fat"], ["nSat", "sat"], ["nFib", "fib"], ["nSal", "sal"]].forEach(([id, k]) => { $("#" + id).value = p[k] ?? ""; });
}
function openIng(key) {
  ingKey = key; const x = key ? Object.assign({ key }, ingDB[key]) : {};
  $("#ingEditorTitle").textContent = key ? "Editar ingrediente" : "Nuevo ingrediente"; fillIngForm(x);
  $("#ingDelete").hidden = !key; $("#ingErr").hidden = true; $("#offResults").hidden = true; $("#scanArea").hidden = true;
  $("#ingEditor").hidden = false; document.body.style.overflow = "hidden";
}
function closeIng() { stopScan(); $("#ingEditor").hidden = true; document.body.style.overflow = ""; }
$("#ingEditor")?.addEventListener("click", (e) => { if (e.target.closest("[data-iclose]")) closeIng(); });
$("#ingForm")?.addEventListener("submit", async (e) => {
  e.preventDefault(); const err = $("#ingErr"); err.hidden = true; const snap = myXP();
  const n = $("#iName").value.trim(); if (!n) { err.textContent = "Ponele nombre."; err.hidden = false; return; }
  const num = (id) => { const v = $("#" + id).value; return v === "" ? 0 : Math.max(0, +v); };
  const data = { n, marca: $("#iMarca").value.trim(), cat: $("#iCat").value, barcode: $("#iCode").value.trim() || null, u: +$("#iUnit").value || null,
    por100: { kcal: num("nKcal"), prot: num("nProt"), carb: num("nCarb"), sug: num("nSug"), fat: num("nFat"), sat: num("nSat"), fib: num("nFib"), sal: num("nSal") },
    owner: user.uid, ownerName: myName(), source: $("#iCode").value.trim() ? "off" : "manual", createdAt: ingDB[ingKey]?.createdAt || new Date().toISOString() };
  try {
    if (ingKey) await update(ref(db, `ingredientes/${ingKey}`), data); else await set(push(ref(db, "ingredientes")), data);
    closeIng(); toast("Ingrediente guardado: ya lo puede usar todo el mundo."); if (!ingKey) setTimeout(() => gainXP(40, "ingrediente cargado", snap), 700); setTimeout(syncPublic, 1500);
    window.notifyAdmin?.({ type: "ingrediente", title: n, de: myName(), email: user.email, marca: data.marca, codigo: data.barcode, por100: data.por100 });
  } catch (ex) { err.textContent = errMsg(ex); err.hidden = false; }
});
$("#ingDelete")?.addEventListener("click", async () => { if (ingKey && confirm("¿Borrar este ingrediente?")) { await remove(ref(db, `ingredientes/${ingKey}`)).catch((e) => toast(errMsg(e))); closeIng(); } });

// Open Food Facts
const OFF_FIELDS = "code,product_name,product_name_es,brands,quantity,nutriments,serving_quantity";
function offToIng(p) {
  const nu = p.nutriments || {}; const g = (k) => { const v = nu[k + "_100g"]; return v === undefined || v === null || v === "" ? undefined : Math.round(+v * 100) / 100; };
  const kcal = g("energy-kcal") ?? (g("energy") ? Math.round(g("energy") / 4.184) : undefined);
  return { n: (p.product_name_es || p.product_name || "").trim() + (p.quantity ? " " + p.quantity : ""), marca: (p.brands || "").split(",")[0].trim(), barcode: p.code, cat: "alm",
    por100: { kcal: kcal ?? "", prot: g("proteins") ?? "", carb: g("carbohydrates") ?? "", sug: g("sugars") ?? "", fat: g("fat") ?? "", sat: g("saturated-fat") ?? "", fib: g("fiber") ?? "", sal: g("salt") ?? (g("sodium") !== undefined ? Math.round(g("sodium") * 2.5 * 100) / 100 : "") } };
}
async function offLookup(code) {
  const msg = $("#scanMsg"); msg.textContent = "Buscando el código " + code + " en Open Food Facts…";
  try {
    const r = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=${OFF_FIELDS}`); const j = await r.json();
    if (j.status === 1 && j.product) { fillIngForm(offToIng(j.product)); msg.textContent = "Encontrado. Revisá los valores y guardá."; toast("Producto encontrado en Open Food Facts."); $("#scanArea").hidden = true; }
    else { $("#iCode").value = code; msg.textContent = "Ese código no está en Open Food Facts: cargá los valores del paquete a mano (quedan guardados para todos)."; $("#scanArea").hidden = false; }
  } catch (e) { msg.textContent = "No se pudo consultar Open Food Facts. Cargalo a mano."; }
}
async function offSearch(q) {
  const box = $("#offResults"); box.hidden = false; box.innerHTML = `<p class="muted small">Buscando «${esc(q)}» en Open Food Facts (productos vendidos en Argentina)…</p>`;
  try {
    const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=12&tagtype_0=countries&tag_contains_0=contains&tag_0=argentina&fields=${OFF_FIELDS}`;
    const j = await (await fetch(url)).json(); const prods = (j.products || []).filter((p) => p.product_name || p.product_name_es);
    box.innerHTML = prods.length ? `<p class="small"><b>Resultados de Open Food Facts</b> · tocá uno para completar el formulario</p>` + prods.map((p, i) => { const x = offToIng(p); return `<button type="button" data-off="${i}"><b>${esc(x.n)}</b><small>${esc(x.marca)} · ${x.por100.kcal || "?"} kcal/100 g · ${x.por100.sal || "?"} g sal</small></button>`; }).join("") : `<p class="muted small">Nada en Open Food Facts con ese nombre. Cargalo a mano.</p>`;
    box.onclick = (e) => { const b = e.target.closest("[data-off]"); if (b) { fillIngForm(offToIng(prods[+b.dataset.off])); box.hidden = true; } };
  } catch (e) { box.innerHTML = `<p class="muted small">No se pudo consultar Open Food Facts.</p>`; }
}
// escáner de código de barras: BarcodeDetector nativo (Android/Chrome) o ZXing (iPhone y otros)
async function startScan() {
  const area = $("#scanArea"), video = $("#scanVideo"), msg = $("#scanMsg"); area.hidden = false; msg.textContent = "Pidiendo permiso para la cámara…";
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
    video.srcObject = stream; await video.play(); msg.textContent = "Apuntá la cámara al código de barras.";
    if ("BarcodeDetector" in window) {
      const det = new window.BarcodeDetector({ formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128"] });
      scanTimer = setInterval(async () => { try { const codes = await det.detect(video); if (codes.length) { const c = codes[0].rawValue; stopScan(true); offLookup(c); } } catch (e) {} }, 350);
    } else {
      if (!window.ZXing) await new Promise((res, rej) => { const s = document.createElement("script"); s.src = "https://cdn.jsdelivr.net/npm/@zxing/library@0.21.3/umd/index.min.js"; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
      zxReader = new window.ZXing.BrowserMultiFormatReader();
      zxReader.decodeFromStream(stream, video, (result) => { if (result) { const c = result.getText(); stopScan(true); offLookup(c); } });
    }
  } catch (e) { msg.textContent = "No se pudo abrir la cámara (" + (e.name || e) + "). Escribí el código a mano o cargá los valores."; }
}
function stopScan(keepArea) {
  clearInterval(scanTimer); scanTimer = null;
  try { zxReader?.reset(); } catch (e) {} zxReader = null;
  if (stream) { stream.getTracks().forEach((t) => t.stop()); stream = null; }
  const v = $("#scanVideo"); if (v) v.srcObject = null;
  if (!keepArea && $("#scanArea")) $("#scanArea").hidden = true;
}
$("#scanStop")?.addEventListener("click", () => stopScan(false));
$("#scanLookup")?.addEventListener("click", () => { const c = $("#scanManual").value.replace(/\D/g, ""); if (c.length >= 8) { stopScan(true); offLookup(c); } else toast("El código tiene 8 o 13 dígitos."); });
document.addEventListener("keydown", (e) => { if (e.key !== "Escape") return; if ($("#picker") && !$("#picker").hidden) closePicker(); if ($("#recEditor") && !$("#recEditor").hidden) closeEditor(); if ($("#ingEditor") && !$("#ingEditor").hidden) closeIng(); });

async function loadAdmin() {
  try {
    const snap = await get(ref(db, "calendars")); const all = snap.val() || {};
    const rows = Object.entries(all).map(([uid, c]) => ({ uid, name: c.profile?.name || "—", email: c.profile?.email || "—", n: Object.keys(c.days || {}).length, upd: c.updatedAt || c.profile?.createdAt || "" })).sort((a, b) => (b.upd || "").localeCompare(a.upd || ""));
    $("#adminTable").innerHTML = `<thead><tr><th>Nombre</th><th>Correo</th><th>Días armados</th><th>Última actividad</th></tr></thead><tbody>${rows.map((r) => `<tr><td>${esc(r.name)}</td><td style="text-align:left">${esc(r.email)}</td><td>${r.n}</td><td>${r.upd ? new Date(r.upd).toLocaleString("es-AR") : "—"}</td></tr>`).join("")}</tbody>`;
    $("#adminBox").hidden = false;
  } catch (e) { /* reglas sin desplegar */ }
}

// =====================================================================
// MI PLAN · días cumplidos, combos y ladder
// =====================================================================
let ladder = {};
onValue(ref(db, "ladder"), (s) => { ladder = s.val() || {}; renderRank(); }, () => {});
$("#myCal")?.addEventListener("click", async (e) => {
  const b = e.target.closest("[data-done]"); if (!b) return;
  const dt = b.dataset.done; const on = !cal?.done?.[dt]; const snap = myXP();
  try {
    await update(ref(db, `calendars/${user.uid}/done`), { [dt]: on ? true : null });
    const done = Object.assign({}, cal?.done || {}); if (on) done[dt] = true; else delete done[dt];
    const st = computeStats(done);
    await set(ref(db, `ladder/${user.uid}`), { name: myName(), points: st.points, streak: st.streak, best: st.best, days: st.days, weeks: st.weeks, updatedAt: new Date().toISOString() });
    toast(on ? (st.streak >= 7 ? `¡Día cumplido! Combo ×2: racha de ${st.streak} días.` : st.streak >= 3 ? `¡Día cumplido! Combo ×1,5: racha de ${st.streak} días.` : "¡Día cumplido! +10 puntos.") : "Día desmarcado.");
    if (on) gainXP(xpDay(st.streak), "día cumplido", snap);
    touched(); syncPublic();
  } catch (ex) { toast(errMsg(ex)); }
});
function computeStats(done, libre) {
  libre = libre || cal?.libre || {};
  const dates = Object.keys(done || {}).filter((d) => done[d]).sort();
  const bridged = (a, b) => { let d = addDays(a, 1); while (d < b) { if (!libre[d]) return false; d = addDays(d, 1); } return true; };
  let points = 0, run = 0, best = 0, prev = null;
  dates.forEach((d) => { run = (prev && (addDays(prev, 1) === d || bridged(prev, d))) ? run + 1 : 1; prev = d; best = Math.max(best, run); points += 10 * (run >= 7 ? 2 : run >= 3 ? 1.5 : 1); });
  let streak = 0;
  if (dates.length) { const last = dates[dates.length - 1]; let cur = todayISO; while (cur > last && libre[cur]) cur = addDays(cur, -1); if (last === cur || last === addDays(cur, -1)) { let d = last; while (done[d] || libre[d]) { if (done[d]) streak++; d = addDays(d, -1); } } }
  const mondays = new Set(dates.map((d) => mondayOf(d))); let weeks = 0;
  mondays.forEach((m) => { if (Array.from({ length: 7 }, (_, i) => addDays(m, i)).every((d) => done[d])) weeks++; });
  points += weeks * 50;
  return { points: Math.round(points), streak, best, days: dates.length, weeks };
}
function renderRank() {
  if (!$("#rankMe") || !user) return;
  const st = computeStats(cal?.done || {});
  let rows = Object.entries(ladder).map(([uid, x]) => Object.assign({ uid }, x)).sort((a, b) => (b.points || 0) - (a.points || 0) || (b.streak || 0) - (a.streak || 0));
  const allPos = rows.findIndex((r) => r.uid === user.uid) + 1, allN = rows.length;
  if (ladderMode === "amigos") rows = rows.filter((r) => r.uid === user.uid || cal?.friends?.[r.uid]);
  const pos = allPos;
  const mult = st.streak >= 7 ? "×2" : st.streak >= 3 ? "×1,5" : "×1";
  $("#rankMe").innerHTML = `<p class="kicker">Tu puntaje</p><div class="score-num">${st.points.toLocaleString("es-AR")}<small> pts</small></div>
    <div class="rank-chips"><span class="chip hot">${ic("flame")} racha ${st.streak} ${st.streak === 1 ? "día" : "días"} · combo ${mult}</span><span class="chip">${ic("bolt")} mejor racha ${st.best}</span><span class="chip">${ic("check")} ${st.days} días cumplidos</span><span class="chip">${ic("calendar")} ${st.weeks} ${st.weeks === 1 ? "semana perfecta" : "semanas perfectas"}</span></div>
    <p class="muted small">${pos ? `Estás en el puesto <b>#${pos}</b> de ${allN}.` : "Marcá tu primer día cumplido en el calendario para entrar al ranking."}</p>`;
  const medal = (i) => (i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "#" + (i + 1));
  $("#ladderTable").innerHTML = rows.length ? `<thead><tr><th>Puesto</th><th>Quién</th><th>Nivel</th><th>Puntos</th><th>Racha</th><th>Mejor</th><th>Días</th><th>Semanas</th></tr></thead><tbody>${rows.map((r, i) => `<tr class="${r.uid === user.uid ? "me" : ""}"><td>${medal(i)}</td><td style="text-align:left"><span class="lad-user">${avatarHtml(pub[r.uid] || {}, r.name)}${esc(r.name)}${r.uid === user.uid ? " <small>(vos)</small>" : ""}</span></td><td>${r.level || 1}</td><td><b>${(r.points || 0).toLocaleString("es-AR")}</b></td><td>${r.streak ? `${r.streak} ${r.streak >= 7 ? "×2" : r.streak >= 3 ? "×1,5" : ""}` : "—"}</td><td>${r.best || 0}</td><td>${r.days || 0}</td><td>${r.weeks || 0}</td></tr>`).join("")}</tbody>` : `<tbody><tr><td colspan="8" class="muted">${ladderMode === "amigos" ? "Todavía no agregaste amigos." : "Todavía nadie marcó días cumplidos. ¡Sé el primero!"}</td></tr></tbody>`;
}

// =====================================================================
// NUTRICIÓN
// =====================================================================
let nut = { src: "mio", per: "semana", week: null };
const PROF_KEY = "perfil-nutricion";
const loadProfile = () => { try { return JSON.parse(localStorage.getItem(PROF_KEY) || "null"); } catch (e) { return null; } };
function targets(p) {
  const bmr = 10 * p.peso + 6.25 * p.altura - 5 * p.edad + (p.sexo === "m" ? 5 : -161);
  const kcal = Math.round(bmr * p.act);
  return { kcal, bmr: Math.round(bmr), prot: Math.round(p.peso * 1.0), protMin: Math.round(p.peso * 0.8), protMax: Math.round(p.peso * 1.6), carb: [Math.round(kcal * 0.45 / 4), Math.round(kcal * 0.60 / 4)], fat: [Math.round(kcal * 0.25 / 9), Math.round(kcal * 0.35 / 9)], sat: Math.round(kcal * 0.10 / 9), sug: Math.round(kcal * 0.10 / 4), fib: p.sexo === "m" ? 30 : 25, sal: 5 };
}
function daysForPeriod() {
  const src = nut.src;
  if (nut.per === "mes") {
    let dates;
    if (src === "casa") dates = Object.keys(houseDays);
    else { const keys = Object.keys(cal?.days || {}).sort(); const m = keys.length ? keys[keys.length - 1].slice(0, 7) : todayISO.slice(0, 7); dates = keys.filter((d) => d.startsWith(m)); nut.monthLabel = m; }
    return dates.map((d) => dayPlan(d, src)).filter(Boolean);
  }
  const weeks = nut.src === "casa" ? D.weeks.map((w) => ({ start: w.start })) : weekList();
  if (!nut.week || !weeks.some((w) => w.start === nut.week)) nut.week = weeks[0].start;
  return Array.from({ length: 7 }, (_, i) => dayPlan(addDays(nut.week, i), src)).filter(Boolean);
}
function totals(days) {
  const t = Object.fromEntries(NUTK.map((k) => [k, 0])); const ids = new Set(); let sugKnown = true;
  days.forEach((d) => { SLOTS.forEach((s) => { const r = R[d[s]]; if (!r) return; ids.add(r.id); NUTK.forEach((k) => { const v = r.nut[k]; if ((k === "sug" || k === "sat") && (v === null || v === undefined)) { sugKnown = false; return; } t[k] += v || 0; }); }); Object.keys(D.meriendaNut).forEach((k) => { t[k] += D.meriendaNut[k]; }); });
  const n = days.length || 1; NUTK.forEach((k) => { t[k] = t[k] / n; });
  return { avg: t, n: days.length, distinct: ids.size, sugKnown };
}
function evaluate(avg, T, distinct, n, sugKnown) {
  let score = 10; const good = [], bad = [], sug = new Set();
  const dev = (avg.kcal - T.kcal) / T.kcal;
  if (Math.abs(dev) > 0.25) { score -= 3; bad.push(dev > 0 ? `Energía: ${Math.round(avg.kcal)} kcal/día, un ${Math.round(dev * 100)} % por encima de lo recomendado.` : `Energía: ${Math.round(avg.kcal)} kcal/día, un ${Math.round(-dev * 100)} % por debajo de lo recomendado. Si tenés hambre, no es casualidad.`); sug.add(dev > 0 ? "menos" : "mas"); }
  else if (Math.abs(dev) > 0.12) { score -= 1.5; bad.push(dev > 0 ? `Energía algo alta: ${Math.round(avg.kcal)} kcal/día frente a ${T.kcal}.` : `Energía algo baja: ${Math.round(avg.kcal)} kcal/día frente a ${T.kcal}.`); sug.add(dev > 0 ? "menos" : "mas"); }
  else good.push(`Energía en el punto justo: ${Math.round(avg.kcal)} kcal/día para un objetivo de ${T.kcal}.`);
  if (avg.prot < T.protMin) { score -= 2; bad.push(`Proteínas bajas: ${Math.round(avg.prot)} g/día (mínimo ${T.protMin} g).`); sug.add("prot"); }
  else good.push(`Proteínas bien cubiertas: ${Math.round(avg.prot)} g/día.`);
  const fibR = avg.fib / T.fib;
  if (fibR < 0.6) { score -= 3; bad.push(`Fibra muy baja: ${Math.round(avg.fib)} g/día frente a ${T.fib} g. Faltan legumbres, verduras y cereales integrales.`); sug.add("fib"); }
  else if (fibR < 0.85) { score -= 1.5; bad.push(`Fibra algo baja: ${Math.round(avg.fib)} g/día frente a ${T.fib} g.`); sug.add("fib"); }
  else good.push(`Fibra: ${Math.round(avg.fib)} g/día, dentro de lo recomendado.`);
  if (avg.sal > 6.5) { score -= 2; bad.push(`Sal alta: ${avg.sal.toFixed(1)} g/día (máximo 5 g). Cuidado con embutidos, caldos en cubo, salsa de soja y quesos.`); sug.add("sal"); }
  else if (avg.sal > 5) { score -= 1; bad.push(`Sal un poco por encima del límite: ${avg.sal.toFixed(1)} g/día (máximo 5 g).`); sug.add("sal"); }
  else good.push(`Sal bajo control: ${avg.sal.toFixed(1)} g/día.`);
  if (sugKnown && avg.sug > T.sug * 1.2) { score -= 1; bad.push(`Azúcares: ${Math.round(avg.sug)} g/día, por encima del 10 % de la energía (${T.sug} g). Mirá la miel, los jugos y los yogures saborizados.`); sug.add("azucar"); }
  if (sugKnown && avg.sat > T.sat * 1.2) { score -= 1; bad.push(`Grasas saturadas: ${Math.round(avg.sat)} g/día frente a un máximo de ${T.sat} g. Menos panceta, manteca y quesos duros.`); sug.add("grasa"); }
  const fatPct = avg.fat * 9 / avg.kcal, carbPct = avg.carb * 4 / avg.kcal;
  if (fatPct > 0.38) { score -= 1; bad.push(`Grasas: ${Math.round(fatPct * 100)} % de la energía (ideal 25–35 %).`); sug.add("grasa"); }
  if (carbPct < 0.40) { score -= 0.5; bad.push(`Carbohidratos algo bajos: ${Math.round(carbPct * 100)} % de la energía (ideal 45–60 %).`); sug.add("carb"); }
  if (carbPct > 0.62) { score -= 0.5; bad.push(`Carbohidratos altos: ${Math.round(carbPct * 100)} % de la energía.`); }
  if (n >= 5 && distinct < Math.min(10, n * 1.4)) { score -= 1; bad.push(`Poca variedad: ${distinct} recetas distintas en ${n} días.`); sug.add("variedad"); }
  else if (n >= 5) good.push(`Buena variedad: ${distinct} recetas distintas en ${n} días.`);
  score = Math.max(0, Math.min(10, Math.round(score * 2) / 2));
  return { score, good, bad, sug: [...sug] };
}
const SUGS = {
  fib: { t: "Sumá fibra", ids: ["lentejas", "garbanzos", "sopa", "tarta", "yogur", "panqueques"] },
  prot: { t: "Más proteína", ids: ["pollohorno", "merluza", "atun", "omelette", "bife", "wrap"] },
  sal: { t: "Menos sal: platos frescos", ids: ["garbanzos", "merluza", "salmon", "panqueques", "yogur", "pescadohorno"] },
  azucar: { t: "Menos azúcar", ids: ["revueltos", "omelette", "tostadas", "atun", "merluza", "garbanzos"] },
  menos: { t: "Platos más livianos", ids: ["sopa", "merluza", "garbanzos", "tarta", "omelette", "atun"] },
  mas: { t: "Platos que llenan más", ids: ["carbonara", "arrozpollo", "albondigas", "hamburguesas", "noquis", "curry"] },
  grasa: { t: "Menos grasa", ids: ["merluza", "sopa", "lentejas", "garbanzos", "wok", "pescadohorno"] },
  carb: { t: "Más cereales y legumbres", ids: ["arrozpollo", "noquis", "lentejas", "garbanzos", "panqueques", "yogur"] },
  variedad: { t: "Para variar", ids: ["tortilla", "berenjenas", "gramajo", "curry", "zapallitos", "salmon"] },
};
function renderNut() {
  if (page !== "nutricion") return;
  const p = loadProfile() || cal?.profile?.nut || null;
  if (p) { $("#pSexo").value = p.sexo; $("#pEdad").value = p.edad; $("#pAltura").value = p.altura; $("#pPeso").value = p.peso; $("#pAct").value = p.act; }
  const hasMine = !!(user && cal?.days && Object.values(cal.days).some((d) => SLOTS.some((s) => d[s])));
  if (!hasMine) nut.src = "casa";
  $$("#srcSeg button").forEach((b) => { b.classList.toggle("on", b.dataset.src === nut.src); b.disabled = b.dataset.src === "mio" && !hasMine; });
  $("#srcNote").textContent = !user ? "Ingresá en «Mi plan» para analizar tu propio calendario. Mientras tanto se analiza el plan de la casa." : !hasMine ? "Todavía no tenés platos en tu calendario: se analiza el plan de la casa." : nut.src === "mio" ? "Se analizan los platos que elegiste en tu calendario." : "Se analiza el plan de la casa (27 oct → 30 nov).";
  const weeks = nut.src === "casa" ? D.weeks.map((w) => ({ start: w.start, label: w.label })) : weekList();
  if (!nut.week || !weeks.some((w) => w.start === nut.week)) nut.week = weeks[0].start;
  $("#nutWeekTabs").hidden = nut.per !== "semana";
  $("#nutWeekTabs").innerHTML = weeks.map((w) => `<button data-w="${w.start}" class="${w.start === nut.week ? "on" : ""}">${esc(w.label)}</button>`).join("");
  const res = $("#nutResult");
  if (!p) { res.hidden = true; $("#profState").textContent = "Completá tus datos para ver el análisis."; return; }
  const days = daysForPeriod();
  if (!days.length) { res.hidden = true; $("#profState").textContent = "No hay platos cargados en ese período."; return; }
  $("#profState").textContent = "";
  const T = targets(p), { avg, n, distinct, sugKnown } = totals(days), ev = evaluate(avg, T, distinct, n, sugKnown);
  res.hidden = false;
  const per = nut.per === "mes" ? `el mes (${n} días con comidas)` : `la semana (${n} días)`;
  $("#scoreBox").innerHTML = `<p class="kicker">Nota de ${per}</p><div class="score-num">${ev.score.toLocaleString("es-AR")}<small>/10</small></div><p class="muted">${ev.score >= 8.5 ? "Muy bien: un plan equilibrado." : ev.score >= 6.5 ? "Bien, con un par de cosas para ajustar." : ev.score >= 4.5 ? "Regular: hay desbalances que conviene corregir." : "Flojo: revisá las sugerencias de abajo."}</p>
    <p class="small muted">Objetivo diario: <b>${T.kcal} kcal</b> · proteínas <b>${T.prot} g</b> · fibra <b>${T.fib} g</b> · sal <b>&lt; ${T.sal} g</b> · azúcares <b>&lt; ${T.sug} g</b>. Metabolismo basal estimado: ${T.bmr} kcal.</p>`;
  $("#nutComments").innerHTML = `<h3>Qué está bien y qué no</h3><ul class="v-list">${ev.good.map((g) => `<li>${esc(g)}</li>`).join("")}</ul>${ev.bad.length ? `<ul class="x-list">${ev.bad.map((b) => `<li>${esc(b)}</li>`).join("")}</ul>` : ""}`;
  const bar = (v, lo, hi, unit, name, hint, maxIsLimit) => { const pct = Math.round(v / hi * 100); const ok = maxIsLimit ? v <= hi : v >= lo && v <= hi * 1.12; return `<div class="nut-card${ok ? " ok" : " warn"}"><div class="nc-h"><span>${name}</span><b>${unit === "g" && v < 10 ? v.toFixed(1) : Math.round(v)} ${unit}</b></div><div class="nc-bar"><i style="width:${Math.min(100, pct)}%"></i>${lo ? `<em style="left:${Math.min(100, Math.round(lo / hi * 100))}%"></em>` : ""}</div><small>${hint}</small></div>`; };
  $("#nutGrid").innerHTML = [
    bar(avg.kcal, T.kcal * 0.88, T.kcal, "kcal", "Energía", `recomendado ≈ ${T.kcal} kcal`),
    bar(avg.prot, T.protMin, T.protMax, "g", "Proteínas", `recomendado ${T.protMin}–${T.protMax} g`),
    bar(avg.carb, T.carb[0], T.carb[1], "g", "Carbohidratos", `recomendado ${T.carb[0]}–${T.carb[1]} g (45–60 %)`),
    sugKnown ? bar(avg.sug, 0, T.sug, "g", "Azúcares", `máximo ${T.sug} g (10 % de la energía)`, true) : "",
    bar(avg.fat, T.fat[0], T.fat[1], "g", "Grasas", `recomendado ${T.fat[0]}–${T.fat[1]} g (25–35 %)`),
    sugKnown ? bar(avg.sat, 0, T.sat, "g", "Grasas saturadas", `máximo ${T.sat} g (10 % de la energía)`, true) : "",
    bar(avg.fib, T.fib * 0.85, T.fib * 1.3, "g", "Fibra", `recomendado ≥ ${T.fib} g`),
    bar(avg.sal, 0, T.sal, "g", "Sal", `máximo ${T.sal} g (OMS)`, true),
  ].join("");
  const used = new Set(days.flatMap((d) => SLOTS.map((s) => d[s])));
  $("#nutSugs").innerHTML = ev.sug.map((k) => { const s = SUGS[k]; return `<div class="sug-group"><h4>${esc(s.t)}</h4><div class="grid mini">${s.ids.filter((id) => R[id]).map((id) => { const r = R[id]; return `<button class="rc" data-rec="${id}"><img src="${r.img}" alt="" loading="lazy"><div class="b"><h4>${esc(r.name)}</h4><div class="meta"><span>${Math.round(r.nut.kcal)} kcal</span><span>${r.nut.prot} g prot</span><span>${r.nut.fib} g fibra</span><span>${r.nut.sal} g sal</span>${used.has(id) ? "" : `<span class="tag">no está en tu plan</span>`}</div></div></button>`; }).join("")}</div></div>`; }).join("") || `<p class="muted">Nada que cambiar: seguí así.</p>`;
  window.dispatchEvent(new Event("scroll"));
}
if (page === "nutricion") {
  $("#profForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const p = { sexo: $("#pSexo").value, edad: +$("#pEdad").value, altura: +$("#pAltura").value, peso: +$("#pPeso").value, act: +$("#pAct").value };
    if (!p.edad || !p.altura || !p.peso) { $("#profState").textContent = "Completá edad, altura y peso."; return; }
    localStorage.setItem(PROF_KEY, JSON.stringify(p));
    if (user) update(ref(db, `calendars/${user.uid}/profile`), { nut: p }).catch(() => {});
    renderNut(); toast("Listo: análisis actualizado.");
  });
  $("#srcSeg").addEventListener("click", (e) => { const b = e.target.closest("button"); if (b && !b.disabled) { nut.src = b.dataset.src; nut.week = null; renderNut(); } });
  $("#perSeg").addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) { nut.per = b.dataset.per; $$("#perSeg button").forEach((x) => x.classList.toggle("on", x === b)); renderNut(); } });
  $("#nutWeekTabs").addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) { nut.week = b.dataset.w; renderNut(); } });
  renderNut();
}

// =====================================================================
// GAMIFICACIÓN · XP, niveles, fichas, agua, insignias, perfil, amigos
// =====================================================================
let pub = {}, ladderMode = "todos", myEmailHash = null, lastXP = null;
onValue(ref(db, "public"), (s) => { pub = s.val() || {}; renderRank(); renderFriends(); renderWho(); }, () => {});

// ---- sonido (sintetizado, sin archivos) ----
const SND_KEY = "sonidos";
const soundOn = () => localStorage.getItem(SND_KEY) !== "0";
let actx = null;
function tone(freq, t0, dur, type = "sine", vol = 0.18) {
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)(); if (actx.state === "suspended") actx.resume();
    const o = actx.createOscillator(), g = actx.createGain(); o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, actx.currentTime + t0); g.gain.exponentialRampToValueAtTime(vol, actx.currentTime + t0 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + t0 + dur);
    o.connect(g); g.connect(actx.destination); o.start(actx.currentTime + t0); o.stop(actx.currentTime + t0 + dur + 0.05);
  } catch (e) {}
}
const sfxXP = () => { if (!soundOn()) return; tone(660, 0, 0.12, "triangle", 0.12); tone(990, 0.08, 0.18, "triangle", 0.1); };
const sfxLevel = () => { if (!soundOn()) return; [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.11, 0.35, "triangle", 0.16)); tone(1319, 0.5, 0.6, "sine", 0.12); };
const sfxBadge = () => { if (!soundOn()) return; tone(880, 0, 0.1, "square", 0.06); tone(1175, 0.1, 0.1, "square", 0.06); tone(1760, 0.2, 0.4, "triangle", 0.1); };
const sfxWater = () => { if (!soundOn()) return; tone(900, 0, 0.08, "sine", 0.1); tone(1400, 0.06, 0.14, "sine", 0.08); };

// ---- XP y niveles ----
const xpDay = (streak) => (streak >= 7 ? 100 : streak >= 3 ? 75 : 50);
const levelOf = (xp) => Math.max(1, Math.floor(Math.sqrt(Math.max(0, xp) / 100)) + 1);   // nivel L se alcanza con 100·(L−1)²
const xpForLevel = (L) => 100 * (L - 1) * (L - 1);
function myCounts() {
  const recipes = Object.values(community).filter((c) => c.owner === user?.uid).length;
  const ings = Object.values(ingDB).filter((c) => c.owner === user?.uid).length;
  const agua = cal?.agua || {}; const aguaDays = Object.keys(agua).sort();
  const vasos = aguaDays.reduce((a, d) => a + Math.min(3, agua[d] || 0), 0), full = aguaDays.filter((d) => (agua[d] || 0) >= 3);
  let aguaStreak = 0, best = 0, prev = null, run = 0;
  full.forEach((d) => { run = prev && addDays(prev, 1) === d ? run + 1 : 1; prev = d; best = Math.max(best, run); });
  if (full.length) { const last = full[full.length - 1]; if (last === todayISO || last === addDays(todayISO, -1)) { let d = last; while ((agua[d] || 0) >= 3) { aguaStreak++; d = addDays(d, -1); } } }
  const friends = Object.keys(cal?.friends || {}).length;
  const planDays = Object.values(cal?.days || {}).filter((d) => d && SLOTS.some((s) => d[s])).length;
  return { recipes, ings, vasos, aguaFull: full.length, aguaStreak, aguaBest: best, friends, planDays };
}
function myXP() {
  const st = computeStats(cal?.done || {}); const c = myCounts();
  // XP por día cumplido con el combo del momento
  const done = cal?.done || {}; const libre = cal?.libre || {}; const dates = Object.keys(done).filter((d) => done[d]).sort();
  let xp = 0, run = 0, prev = null;
  const bridged = (a, b) => { let d = addDays(a, 1); while (d < b) { if (!libre[d]) return false; d = addDays(d, 1); } return true; };
  dates.forEach((d) => { run = prev && (addDays(prev, 1) === d || bridged(prev, d)) ? run + 1 : 1; prev = d; xp += xpDay(run); });
  xp += st.weeks * 200 + c.recipes * 80 + c.ings * 40 + c.vasos * 10 + c.aguaFull * 20;
  const level = levelOf(xp);
  return { xp, level, st, c, next: xpForLevel(level + 1), base: xpForLevel(level) };
}
const fichasDisponibles = () => { if (!cal) return 0; const { level } = myXP(); const used = Object.keys(cal?.libre || {}).length; return Math.max(0, (level - 1) - used); };

// ---- animación de XP y subida de nivel ----
function gainXP(delta, reason, snap) {
  const after = myXP();  // XP real con los datos ya guardados
  const before = snap || lastXP || { xp: Math.max(0, after.xp - delta), level: levelOf(Math.max(0, after.xp - delta)) };
  const toXp = after.xp; const toLevel = after.level; delta = Math.max(0, toXp - before.xp) || delta;
  if (delta <= 0 && toLevel <= before.level) { lastXP = { xp: toXp, level: toLevel }; return; }
  let el = $("#xpToast"); if (!el) { el = document.createElement("div"); el.id = "xpToast"; el.className = "xp-toast"; document.body.appendChild(el); }
  const pct = (xp, L) => Math.min(100, Math.round((xp - xpForLevel(L)) / (xpForLevel(L + 1) - xpForLevel(L)) * 100));
  el.innerHTML = `<div class="xt-row"><span class="xt-plus">+${delta} XP</span><span class="xt-why">${esc(reason || "")}</span></div><div class="xp-bar big"><i style="width:${pct(before.xp, before.level)}%"></i></div><small>Nivel ${before.level}</small>`;
  el.classList.add("show"); sfxXP();
  requestAnimationFrame(() => setTimeout(() => {
    const bar = el.querySelector(".xp-bar i");
    if (toLevel > before.level) {
      bar.style.width = "100%";
      setTimeout(() => {
        el.innerHTML = `<div class="xt-level">${ic("trophy")} ¡Nivel ${toLevel}!</div><div class="xt-why">Ganaste una ficha: podés usar un día libre sin perder el combo.</div><div class="xp-bar big"><i style="width:0%"></i></div><small>Nivel ${toLevel}</small>`;
        el.classList.add("level"); sfxLevel(); burst();
        setTimeout(() => { const b2 = el.querySelector(".xp-bar i"); if (b2) b2.style.width = pct(toXp, toLevel) + "%"; }, 150);
      }, 700);
    } else bar.style.width = pct(toXp, toLevel) + "%";
  }, 40));
  clearTimeout(el._h); el._h = setTimeout(() => { el.classList.remove("show", "level"); }, toLevel > before.level ? 4200 : 2600);
  lastXP = { xp: toXp, level: toLevel };
  checkBadges(after.level, toLevel);
}
function burst() {
  const c = document.createElement("div"); c.className = "burst"; document.body.appendChild(c);
  for (let i = 0; i < 26; i++) { const p = document.createElement("i"); p.style.setProperty("--x", (Math.random() * 2 - 1).toFixed(2)); p.style.setProperty("--d", (Math.random() * 0.4).toFixed(2) + "s"); p.style.background = ["#2F8F5B", "#E4572E", "#F2B544", "#9CCBEA"][i % 4]; c.appendChild(p); }
  setTimeout(() => c.remove(), 1800);
}

// ---- barra de usuario (avatar, nivel, XP, agua) ----
function avatarHtml(p, name) { const ini = (name || "?").trim()[0]?.toUpperCase() || "?"; return p?.photo ? `<img class="av" src="${p.photo}" alt="">` : `<span class="av ini">${esc(ini)}</span>`; }
function renderWho() {
  if (page !== "miplan" || !user || !$("#whoLevel")) return;
  const x = myXP(); lastXP = { xp: x.xp, level: x.level };
  $("#whoLevel").textContent = x.level;
  const pct = Math.min(100, Math.round((x.xp - x.base) / (x.next - x.base) * 100));
  $("#xpFill").style.width = pct + "%"; $("#xpText").textContent = `${x.xp.toLocaleString("es-AR")} XP · nivel ${x.level} · faltan ${(x.next - x.xp).toLocaleString("es-AR")} para el ${x.level + 1} · ${fichasDisponibles()} ${fichasDisponibles() === 1 ? "ficha" : "fichas"}`;
  const photo = cal?.profile?.photo; const img = $("#avatarImg"), ini = $("#avatarInit");
  if (photo) { img.src = photo; img.hidden = false; ini.hidden = true; } else { img.hidden = true; ini.hidden = false; ini.textContent = (myName() || "?")[0].toUpperCase(); }
  const n = Math.min(3, cal?.agua?.[todayISO] || 0);
  $("#aguaCups").innerHTML = [0, 1, 2].map((i) => `<svg class="ic cup${i < n ? " on" : ""}"><use href="#i-droplet"/></svg>`).join("");
  $("#aguaTxt").textContent = n >= 3 ? "¡Hidratación del día completa! +20 XP extra" : `${n}/3 vasos de 500 ml hoy · +10 XP cada uno`;
  $("#aguaBtn").disabled = n >= 3;
}
$("#aguaBtn")?.addEventListener("click", async () => {
  const n = Math.min(3, cal?.agua?.[todayISO] || 0); if (n >= 3) return; const snap = myXP();
  try { await update(ref(db, `calendars/${user.uid}/agua`), { [todayISO]: n + 1 }); sfxWater(); gainXP(n + 1 >= 3 ? 30 : 10, n + 1 >= 3 ? "día hidratado" : "vaso de agua", snap); touched(); syncPublic(); } catch (e) { toast(errMsg(e)); }
});
$("#goPerfil")?.addEventListener("click", () => $('#mpSeg [data-tab="perfil"]').click());
$("#avatarBtn")?.addEventListener("click", () => { $('#mpSeg [data-tab="perfil"]').click(); setTimeout(() => $("#setPhoto")?.click(), 200); });
$("#myCal")?.addEventListener("click", async (e) => {
  const b = e.target.closest("[data-libre]"); if (!b) return;
  if (fichasDisponibles() <= 0) { toast("No te quedan fichas: subí de nivel para ganar una."); return; }
  if (!confirm("¿Usar una ficha para marcar este día como libre? No suma puntos, pero tu racha sigue.")) return;
  try { await update(ref(db, `calendars/${user.uid}/libre`), { [b.dataset.libre]: true }); toast("Día libre usado: el combo sigue vivo."); touched(); syncPublic(); } catch (ex) { toast(errMsg(ex)); }
});

// ---- insignias ----
const BADGES = [
  { id: "racha3", t: "Tres seguidos", d: "3 días cumplidos seguidos", ic: "flame", test: (m) => m.st.best >= 3 },
  { id: "racha7", t: "Una semana", d: "7 días seguidos", ic: "flame", test: (m) => m.st.best >= 7 },
  { id: "racha15", t: "Quincena", d: "15 días seguidos", ic: "flame", test: (m) => m.st.best >= 15 },
  { id: "racha30", t: "Un mes entero", d: "30 días seguidos", ic: "flame", test: (m) => m.st.best >= 30 },
  { id: "racha60", t: "Inquebrantable", d: "60 días seguidos", ic: "flame", test: (m) => m.st.best >= 60 },
  { id: "dias10", t: "Primeros diez", d: "10 días cumplidos", ic: "check", test: (m) => m.st.days >= 10 },
  { id: "dias30", t: "Constante", d: "30 días cumplidos", ic: "check", test: (m) => m.st.days >= 30 },
  { id: "dias100", t: "Centenario", d: "100 días cumplidos", ic: "check", test: (m) => m.st.days >= 100 },
  { id: "semana1", t: "Semana perfecta", d: "7 de 7 en una semana", ic: "calendar", test: (m) => m.st.weeks >= 1 },
  { id: "semana4", t: "Mes perfecto", d: "4 semanas perfectas", ic: "calendar", test: (m) => m.st.weeks >= 4 },
  { id: "plan7", t: "Semana armada", d: "7 días con platos en tu calendario", ic: "calendar", test: (m) => m.c.planDays >= 7 },
  { id: "receta1", t: "Primera receta", d: "Creaste una receta", ic: "recetas", test: (m) => m.c.recipes >= 1 },
  { id: "receta5", t: "Cocinero/a", d: "5 recetas creadas", ic: "recetas", test: (m) => m.c.recipes >= 5 },
  { id: "receta15", t: "Chef de la comunidad", d: "15 recetas creadas", ic: "recetas", test: (m) => m.c.recipes >= 15 },
  { id: "ing1", t: "Primer ingrediente", d: "Cargaste un ingrediente", ic: "tag", test: (m) => m.c.ings >= 1 },
  { id: "ing10", t: "Escáner", d: "10 ingredientes cargados", ic: "tag", test: (m) => m.c.ings >= 10 },
  { id: "agua1", t: "Hidratado/a", d: "Un día con los 3 vasos", ic: "droplet", test: (m) => m.c.aguaFull >= 1 },
  { id: "agua7", t: "Semana hidratada", d: "7 días seguidos con 3 vasos", ic: "droplet", test: (m) => m.c.aguaBest >= 7 },
  { id: "agua30", t: "Fuente", d: "30 días seguidos hidratado/a", ic: "droplet", test: (m) => m.c.aguaBest >= 30 },
  { id: "amigo1", t: "En buena compañía", d: "Tu primer amigo/a", ic: "users", test: (m) => m.c.friends >= 1 },
  { id: "amigo5", t: "Mesa llena", d: "5 amigos", ic: "users", test: (m) => m.c.friends >= 5 },
  { id: "nivel5", t: "Nivel 5", d: "Llegaste al nivel 5", ic: "trophy", test: (m) => m.level >= 5 },
  { id: "nivel10", t: "Nivel 10", d: "Llegaste al nivel 10", ic: "trophy", test: (m) => m.level >= 10 },
];
const earnedBadges = () => { if (!cal) return []; const m = myXP(); return BADGES.filter((b) => b.test(m)).map((b) => b.id); };
function checkBadges() {
  const now = earnedBadges(); const seen = new Set(JSON.parse(localStorage.getItem("badges:" + (user?.uid || "")) || "[]"));
  const nuevos = now.filter((id) => !seen.has(id));
  if (nuevos.length && seen.size + nuevos.length !== now.length + 0 || nuevos.length) {
    if (seen.size > 0 || now.length <= 3) nuevos.forEach((id, i) => { const b = BADGES.find((x) => x.id === id); setTimeout(() => { toast(`Insignia nueva: ${b.t}. ${b.d}.`); sfxBadge(); }, 600 * (i + 1)); });
  }
  localStorage.setItem("badges:" + (user?.uid || ""), JSON.stringify(now));
}
function badgeHtml(b, on, shareable) { return `<div class="badge${on ? " on" : ""}" title="${esc(b.d)}"><span class="b-ic"><svg class="ic"><use href="#i-${b.ic}"/></svg></span><b>${esc(b.t)}</b><small>${esc(b.d)}</small>${on && shareable ? `<button class="mini-btn share" data-share="${b.id}">${ic("share")} Compartir</button>` : ""}</div>`; }
async function shareBadge(id) {
  const b = BADGES.find((x) => x.id === id); const url = "https://jaemeson-ra.github.io/plan-comidas-bsas/";
  const text = `Conseguí la insignia «${b.t}» (${b.d}) en Plan de comidas Buenos Aires. ${url}`;
  // tarjeta para compartir (canvas)
  const cv = document.createElement("canvas"); cv.width = 1080; cv.height = 1080; const g = cv.getContext("2d");
  g.fillStyle = "#FBF7F0"; g.fillRect(0, 0, 1080, 1080); g.strokeStyle = "rgba(31,45,42,.06)"; for (let i = 0; i < 1080; i += 40) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 1080); g.moveTo(0, i); g.lineTo(1080, i); g.stroke(); }
  g.fillStyle = "#E3F2E9"; g.beginPath(); g.arc(540, 420, 230, 0, Math.PI * 2); g.fill(); g.fillStyle = "#2F8F5B"; g.beginPath(); g.arc(540, 420, 170, 0, Math.PI * 2); g.fill();
  g.fillStyle = "#fff"; g.font = "700 150px Outfit, sans-serif"; g.textAlign = "center"; g.fillText({ flame: "🔥", check: "✔", calendar: "📅", recetas: "🍳", tag: "🏷", droplet: "💧", users: "👥", trophy: "🏆" }[b.ic] || "★", 540, 475);
  g.fillStyle = "#1F2D2A"; g.font = "400 76px 'Young Serif', Georgia, serif"; g.fillText(b.t, 540, 740);
  g.fillStyle = "#3C4A46"; g.font = "500 40px Outfit, sans-serif"; g.fillText(b.d, 540, 805); g.fillText(`${myName()} · Plan de comidas Buenos Aires`, 540, 900);
  g.fillStyle = "#2F8F5B"; g.font = "600 34px Outfit, sans-serif"; g.fillText("jaemeson-ra.github.io/plan-comidas-bsas", 540, 980);
  const blob = await new Promise((r) => cv.toBlob(r, "image/png")); const file = new File([blob], `insignia-${b.id}.png`, { type: "image/png" });
  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) await navigator.share({ title: b.t, text, files: [file] });
    else if (navigator.share) await navigator.share({ title: b.t, text, url });
    else { const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = file.name; a.click(); await navigator.clipboard?.writeText(text); toast("Imagen descargada y texto copiado para compartir."); }
  } catch (e) { if (e?.name !== "AbortError") toast("No se pudo compartir."); }
}

// ---- perfil y ajustes ----
function renderPerfil() {
  if (page !== "miplan" || !user || !$("#perfilCard")) return;
  const x = myXP(); const on = new Set(earnedBadges());
  $("#perfilCard").innerHTML = `<div class="perfil-head">${avatarHtml(cal?.profile || {}, myName())}<div><p class="kicker">Tu perfil</p><h3>${esc(myName())}</h3><p class="muted small">Nivel ${x.level} · ${x.xp.toLocaleString("es-AR")} XP · ${on.size} ${on.size === 1 ? "insignia" : "insignias"} · ${fichasDisponibles()} ${fichasDisponibles() === 1 ? "ficha" : "fichas"}</p></div></div>
    <div class="xp"><div class="xp-bar"><i style="width:${Math.min(100, Math.round((x.xp - x.base) / (x.next - x.base) * 100))}%"></i></div><small>${(x.next - x.xp).toLocaleString("es-AR")} XP para el nivel ${x.level + 1}</small></div>
    <div class="rank-chips"><span class="chip hot">${ic("flame")} racha ${x.st.streak}</span><span class="chip">${ic("check")} ${x.st.days} días</span><span class="chip">${ic("droplet")} ${x.c.vasos} vasos</span><span class="chip">${ic("recetas")} ${x.c.recipes} recetas</span><span class="chip">${ic("users")} ${x.c.friends} amigos</span></div>
    <label class="snd"><input type="checkbox" id="sndChk" ${soundOn() ? "checked" : ""}> Sonidos al ganar XP, subir de nivel y destrabar insignias</label>`;
  $("#sndChk").addEventListener("change", (e) => { localStorage.setItem(SND_KEY, e.target.checked ? "1" : "0"); if (e.target.checked) sfxXP(); });
  $("#badgesGrid").innerHTML = BADGES.map((b) => badgeHtml(b, on.has(b.id), true)).join("");
  // ajustes
  $("#setName").value = cal?.profile?.name || myName(); $("#setEmail").value = user.email;
  const ph = cal?.profile?.photo; const img = $("#setAvatarImg"), ini = $("#setAvatarInit");
  if (ph) { img.src = ph; img.hidden = false; ini.hidden = true; } else { img.hidden = true; ini.hidden = false; ini.textContent = (myName() || "?")[0].toUpperCase(); }
  const p = cal?.profile?.nut || loadProfile(); if (p) { $("#bSexo").value = p.sexo; $("#bEdad").value = p.edad; $("#bAltura").value = p.altura; $("#bPeso").value = p.peso; $("#bAct").value = p.act; }
}
$("#badgesGrid")?.addEventListener("click", (e) => { const b = e.target.closest("[data-share]"); if (b) shareBadge(b.dataset.share); });
$("#setPhotoBtn")?.addEventListener("click", () => $("#setPhoto").click());
$("#setPhoto")?.addEventListener("change", (e) => {
  const f = e.target.files[0]; if (!f) return;
  const rd = new FileReader(); rd.onload = () => { const im = new Image(); im.onload = async () => {
    const S = 160, cv = document.createElement("canvas"); cv.width = S; cv.height = S; const g = cv.getContext("2d");
    const r = Math.max(S / im.width, S / im.height), w = im.width * r, h = im.height * r; g.drawImage(im, (S - w) / 2, (S - h) / 2, w, h);
    const data = cv.toDataURL("image/jpeg", 0.82);
    try { await update(ref(db, `calendars/${user.uid}/profile`), { photo: data }); toast("Foto actualizada."); syncPublic(); } catch (ex) { toast(errMsg(ex)); }
  }; im.src = rd.result; }; rd.readAsDataURL(f); e.target.value = "";
});
$("#setPhotoDel")?.addEventListener("click", async () => { try { await update(ref(db, `calendars/${user.uid}/profile`), { photo: null }); syncPublic(); toast("Foto quitada."); } catch (ex) { toast(errMsg(ex)); } });
$("#setForm")?.addEventListener("submit", async (e) => {
  e.preventDefault(); const err = $("#setErr"); err.hidden = true; const name = $("#setName").value.trim();
  if (name.length < 2) { err.textContent = "El nombre tiene que tener al menos 2 letras."; err.hidden = false; return; }
  try { await update(ref(db, `calendars/${user.uid}/profile`), { name }); await updateProfile(user, { displayName: name }); toast("Nombre guardado."); syncPublic(); } catch (ex) { err.textContent = errMsg(ex); err.hidden = false; }
});
$("#passForm")?.addEventListener("submit", async (e) => {
  e.preventDefault(); const err = $("#passErr"); err.hidden = true;
  try { await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, $("#passOld").value)); await updatePassword(user, $("#passNew").value); $("#passOld").value = ""; $("#passNew").value = ""; toast("Contraseña cambiada."); }
  catch (ex) { err.textContent = errMsg(ex); err.hidden = false; }
});
$("#bodyForm")?.addEventListener("submit", async (e) => {
  e.preventDefault(); const p = { sexo: $("#bSexo").value, edad: +$("#bEdad").value, altura: +$("#bAltura").value, peso: +$("#bPeso").value, act: +$("#bAct").value };
  if (!p.edad || !p.altura || !p.peso) { toast("Completá edad, altura y peso."); return; }
  localStorage.setItem(PROF_KEY, JSON.stringify(p)); try { await update(ref(db, `calendars/${user.uid}/profile`), { nut: p }); toast("Datos guardados: la nutrición ya los usa."); } catch (ex) { toast(errMsg(ex)); }
});

// ---- amigos ----
async function sha256(s) { const b = new TextEncoder().encode(s.trim().toLowerCase()); const h = await crypto.subtle.digest("SHA-256", b); return [...new Uint8Array(h)].map((x) => x.toString(16).padStart(2, "0")).join(""); }
function renderFriends() {
  if (page !== "miplan" || !user || !$("#friendsList")) return;
  const ids = Object.keys(cal?.friends || {});
  $("#friendsList").innerHTML = ids.length ? ids.map((fid) => { const p = pub[fid] || {}; const bs = (p.badges || []).slice(0, 4); return `<div class="friend">${avatarHtml(p, p.name)}<div><b>${esc(p.name || cal.friends[fid]?.name || "amigo/a")}</b><small class="muted">nivel ${p.level || 1} · ${(p.xp || 0).toLocaleString("es-AR")} XP · racha ${p.streak || 0}</small><div class="f-badges">${bs.map((id) => { const b = BADGES.find((x) => x.id === id); return b ? `<span class="chip" title="${esc(b.d)}">${ic(b.ic)} ${esc(b.t)}</span>` : ""; }).join("")}${(p.badges || []).length > 4 ? `<span class="chip">+${p.badges.length - 4}</span>` : ""}</div></div><button class="mini-btn" data-unfriend="${fid}" title="Quitar">${ic("x")}</button></div>`; }).join("")
    : `<p class="muted small">Todavía no tenés amigos agregados.</p>`;
}
$("#friendForm")?.addEventListener("submit", async (e) => {
  e.preventDefault(); const err = $("#friendErr"); err.hidden = true; const email = $("#friendEmail").value.trim();
  if (email.toLowerCase() === user.email.toLowerCase()) { err.textContent = "Ese sos vos."; err.hidden = false; return; }
  try {
    const h = await sha256(email); const hit = Object.entries(pub).find(([uid, p]) => p.emailHash === h);
    if (!hit) { err.textContent = "No encontramos una cuenta con ese correo (tu amigo/a tiene que haber entrado al menos una vez a Mi plan)."; err.hidden = false; return; }
    await update(ref(db, `calendars/${user.uid}/friends`), { [hit[0]]: { name: hit[1].name || "", since: new Date().toISOString() } });
    $("#friendEmail").value = ""; toast(`${hit[1].name || "Amigo/a"} agregado/a.`); setTimeout(checkBadges, 800); syncPublic();
  } catch (ex) { err.textContent = errMsg(ex); err.hidden = false; }
});
$("#friendsList")?.addEventListener("click", async (e) => { const b = e.target.closest("[data-unfriend]"); if (b && confirm("¿Quitar de tus amigos?")) { await update(ref(db, `calendars/${user.uid}/friends`), { [b.dataset.unfriend]: null }).catch((ex) => toast(errMsg(ex))); syncPublic(); } });
$("#ladderSeg")?.addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; ladderMode = b.dataset.l; $$("#ladderSeg button").forEach((x) => x.classList.toggle("on", x === b)); renderRank(); });

// ---- perfil público (lo que ven los demás) ----
let syncTimer = null;
function syncPublic() {
  if (!user || !cal) return; clearTimeout(syncTimer);
  syncTimer = setTimeout(async () => {
    try {
      if (!myEmailHash) myEmailHash = await sha256(user.email);
      const x = myXP(); const badges = earnedBadges();
      await set(ref(db, `public/${user.uid}`), { name: myName(), photo: cal?.profile?.photo || null, level: x.level, xp: x.xp, streak: x.st.streak, best: x.st.best, days: x.st.days, badges, emailHash: myEmailHash, updatedAt: new Date().toISOString() });
      await update(ref(db, `ladder/${user.uid}`), { name: myName(), level: x.level, xp: x.xp, points: x.st.points, streak: x.st.streak, best: x.st.best, days: x.st.days, weeks: x.st.weeks, updatedAt: new Date().toISOString() });
    } catch (e) { /* reglas sin desplegar */ }
  }, 800);
}
// al entrar: publicar el perfil (así los amigos te encuentran) y recordar el XP actual para las animaciones
onAuthStateChanged(auth, (u) => { if (u) setTimeout(() => { if (cal) { lastXP = null; syncPublic(); checkBadges(); } }, 2500); });
