/* Cuenta, calendario personal, recetas e ingredientes de la comunidad, nutrición.
   Firebase Auth (email + contraseña) + Realtime Database. Páginas: mi-plan.html y nutricion.html. */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, sendPasswordResetEmail, updateProfile } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
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
  const first = mondayOf(todayISO < D.period.start ? D.period.start : todayISO);
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
function render() { if (page === "miplan") { renderMiPlan(); renderMyRecipes(); renderIngredients(); } if (page === "nutricion") renderNut(); }

// =====================================================================
// MI PLAN · calendario
// =====================================================================
let myWeek = null, pickCtx = null, notifyTimer = null;
$("#mpSeg")?.addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; $$("#mpSeg button").forEach((x) => x.classList.toggle("on", x === b)); ["cal", "rec", "ing"].forEach((t) => { $("#tab" + t[0].toUpperCase() + t.slice(1)).hidden = b.dataset.tab !== t; }); localStorage.setItem("mpTab", b.dataset.tab); window.dispatchEvent(new Event("scroll")); });
if (page === "miplan") { const t = localStorage.getItem("mpTab"); if (t) $(`#mpSeg [data-tab="${t}"]`)?.click(); }
function renderMiPlan() {
  const box = $("#planBox"); if (!box) return; box.hidden = !user; if (!user) return;
  $("#whoName").textContent = myName(); $("#whoEmail").textContent = "· " + user.email;
  const weeks = weekList(); if (!myWeek || !weeks.some((w) => w.start === myWeek)) myWeek = weeks[0].start;
  $("#myWeekTabs").innerHTML = weeks.map((w) => `<button data-w="${w.start}" class="${w.start === myWeek ? "on" : ""}">${esc(w.label)}</button>`).join("");
  const days = Array.from({ length: 7 }, (_, i) => addDays(myWeek, i));
  $("#myCal").innerHTML = days.map((dt, i) => { const d = cal?.days?.[dt] || {}; return `<article class="my-day${dt === todayISO ? " today" : ""}"><h4>${DOW[i]} <span>${label(dt)}</span></h4>
      ${SLOTS.map((s) => { const r = R[d[s]]; return `<button class="slot${r ? "" : " empty"}" data-date="${dt}" data-slot="${s}">${ic(s)}${r ? `<img src="${r.img}" alt=""><span>${esc(r.name)}${r.custom ? " <small>· receta de " + esc(r.ownerName) + "</small>" : ""}</span>` : `<span>+ elegir ${s}</span>`}</button>`; }).join("")}
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
  $("#pickerGrid").innerHTML = list.map((r) => `<button class="pick" data-pick="${r.id}"><img src="${r.img}" alt="" loading="lazy"><span><b>${esc(r.name)}</b><small>${r.tiempo} min · ${r.kcal} kcal${r.tipo === "desayuno" ? " · desayuno" : ""}${r.custom ? " · de " + esc(r.ownerName) : ""}</small></span></button>`).join("") || `<p class="muted">Nada con ese nombre.</p>`;
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
  $("#rName").value = c?.name || ""; $("#rTipo").value = c?.tipo || "plato"; $("#rPorc").value = c?.porciones || 2; $("#rTiempo").value = c?.tiempo || 30; $("#rImg").value = c?.img || "";
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
  e.preventDefault(); const err = $("#recErr"); err.hidden = true;
  const name = $("#rName").value.trim(); if (!name) { err.textContent = "Ponele un nombre."; err.hidden = false; return; }
  if (!edRows.length) { err.textContent = "Agregá al menos un ingrediente."; err.hidden = false; return; }
  const porciones = Math.max(1, +$("#rPorc").value || 2);
  const data = { name, tipo: $("#rTipo").value, porciones, tiempo: Math.max(1, +$("#rTiempo").value || 30), img: $("#rImg").value.trim() || null,
    ing: edRows.map((r) => ({ ref: r.ref, n: r.n, marca: r.marca || "", q: +r.q, u: r.u, c: r.c, g: Math.round(gramsOf(r)), peso: r.peso || null, por100: r.por100 })),
    pasos: $("#rPasos").value.split("\n").map((s) => s.trim()).filter(Boolean), tip: $("#rTip").value.trim(), tags: $("#rTags").value.split(",").map((s) => s.trim()).filter(Boolean),
    nut: nutOfRows(edRows, porciones), owner: user.uid, ownerName: myName(), ownerEmail: user.email, createdAt: community[edKey]?.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString() };
  try {
    if (edKey) await update(ref(db, `recetas/${edKey}`), data); else await set(push(ref(db, "recetas")), data);
    closeEditor(); toast("Receta guardada: ya está disponible para todos.");
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
  e.preventDefault(); const err = $("#ingErr"); err.hidden = true;
  const n = $("#iName").value.trim(); if (!n) { err.textContent = "Ponele nombre."; err.hidden = false; return; }
  const num = (id) => { const v = $("#" + id).value; return v === "" ? 0 : Math.max(0, +v); };
  const data = { n, marca: $("#iMarca").value.trim(), cat: $("#iCat").value, barcode: $("#iCode").value.trim() || null, u: +$("#iUnit").value || null,
    por100: { kcal: num("nKcal"), prot: num("nProt"), carb: num("nCarb"), sug: num("nSug"), fat: num("nFat"), sat: num("nSat"), fib: num("nFib"), sal: num("nSal") },
    owner: user.uid, ownerName: myName(), source: $("#iCode").value.trim() ? "off" : "manual", createdAt: ingDB[ingKey]?.createdAt || new Date().toISOString() };
  try {
    if (ingKey) await update(ref(db, `ingredientes/${ingKey}`), data); else await set(push(ref(db, "ingredientes")), data);
    closeIng(); toast("Ingrediente guardado: ya lo puede usar todo el mundo.");
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
