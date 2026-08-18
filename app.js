import { firebaseConfig, ALLOWED_UID } from "./firebase-config.js";

/* ==========================================================================
   Benefit catalogue — American Express Gold Card (personal), 2026
   Total: ($10 + $10 + $7) x 12 + $100 Resy = $424 / year
   ========================================================================== */

const MONTHLY = [
  {
    id: "dining",
    label: "Dining Credit",
    amount: 10,
    note: "Grubhub, Five Guys, The Cheesecake Factory, Goldbelly and Wine.com. Enrollment required.",
  },
  {
    id: "uber",
    label: "Uber Cash",
    amount: 10,
    note: "Uber Eats orders and Uber rides in the U.S. Add the Gold Card in the Uber app — the credit lands as Uber Cash on the 1st.",
  },
  {
    id: "dunkin",
    label: "Dunkin'",
    amount: 7,
    note: "U.S. Dunkin' locations, on purchases of $7 or more. Enrollment required.",
  },
];

const RESY = {
  id: "resy",
  label: "Resy Credit",
  amount: 50,
  note: "Dining at U.S. Resy restaurants — $50 for Jan–Jun and $50 for Jul–Dec, paid with the Gold Card. Enrollment required.",
};

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const MONTH_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const YEAR_TOTAL = MONTHLY.reduce((s, b) => s + b.amount * 12, 0) + RESY.amount * 2;

/* ==========================================================================
   Date / period helpers
   ========================================================================== */

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };

const monthKey = (y, m) => `${y}-${String(m + 1).padStart(2, "0")}`;
const halfKey = (y, h) => `${y}-H${h}`;

function monthBounds(y, m) {
  return { start: new Date(y, m, 1), end: new Date(y, m + 1, 0) };
}
function halfBounds(y, h) {
  return h === 1
    ? { start: new Date(y, 0, 1), end: new Date(y, 5, 30) }
    : { start: new Date(y, 6, 1), end: new Date(y, 11, 31) };
}

/** "past" | "current" | "future" relative to today */
function phaseOf({ start, end }) {
  const t = today();
  if (t < start) return "future";
  if (t > end) return "past";
  return "current";
}

/** Sensible default date to stamp when marking a period used. */
function defaultDate(bounds) {
  const t = today();
  if (t < bounds.start) return iso(bounds.start);
  if (t > bounds.end) return iso(bounds.end);
  return iso(t);
}

/* ==========================================================================
   Storage — Firestore when configured, localStorage otherwise
   ========================================================================== */

const HAS_FIREBASE = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

const store = {
  mode: HAS_FIREBASE ? "firebase" : "local",
  uid: null,
  fs: null,        // firestore module namespace
  db: null,
  unsub: null,
};

let state = { year: new Date().getFullYear(), periods: {} };
let onChange = () => {};

function localKey(year) {
  return `amex-benefits:${store.uid || "local"}:${year}`;
}

async function loadYear(year) {
  state.year = year;
  if (store.unsub) { store.unsub(); store.unsub = null; }

  if (store.mode === "local") {
    try {
      state.periods = JSON.parse(localStorage.getItem(localKey(year)) || "{}");
    } catch {
      state.periods = {};
    }
    onChange();
    return;
  }

  const { doc, onSnapshot } = store.fs;
  const ref = doc(store.db, "users", store.uid, "years", String(year));
  store.unsub = onSnapshot(
    ref,
    (snap) => {
      state.periods = (snap.exists() && snap.data().periods) || {};
      onChange();
    },
    (err) => {
      console.error("Firestore read failed:", err);
      const hint = err.code === "permission-denied"
        ? "Firestore rejected this account. Publish firestore.rules with your own UID in the Firebase console."
        : err.message;
      alert(`Could not read your data from Firestore:\n\n${hint}`);
    }
  );
}

/** value === null clears the mark. */
async function writeUsage(periodKey, benefitId, value) {
  // optimistic local update so the UI never lags behind a click
  if (value === null) {
    if (state.periods[periodKey]) delete state.periods[periodKey][benefitId];
  } else {
    state.periods[periodKey] = { ...(state.periods[periodKey] || {}), [benefitId]: value };
  }
  onChange();

  if (store.mode === "local") {
    localStorage.setItem(localKey(state.year), JSON.stringify(state.periods));
    return;
  }

  const { doc, setDoc, updateDoc, deleteField } = store.fs;
  const ref = doc(store.db, "users", store.uid, "years", String(state.year));
  try {
    if (value === null) {
      await updateDoc(ref, { [`periods.${periodKey}.${benefitId}`]: deleteField() });
    } else {
      await setDoc(ref, { periods: { [periodKey]: { [benefitId]: value } } }, { merge: true });
    }
  } catch (err) {
    console.error("Firestore write failed:", err);
    alert(`Could not save that change:\n\n${err.message}`);
  }
}

const usageFor = (periodKey, benefitId) => state.periods?.[periodKey]?.[benefitId] || null;

/* ==========================================================================
   Rendering
   ========================================================================== */

const $ = (id) => document.getElementById(id);

function renderMonthly() {
  const table = $("monthlyTable");
  const y = state.year;

  const head = document.createElement("thead");
  const hr = document.createElement("tr");
  hr.appendChild(el("th", { class: "month-col", textContent: "Month" }));
  for (const b of MONTHLY) {
    const th = el("th");
    th.appendChild(document.createTextNode(b.label));
    th.appendChild(el("span", { class: "amt", textContent: `$${b.amount}/mo` }));
    hr.appendChild(th);
  }
  hr.appendChild(el("th", { textContent: "Captured" }));
  head.appendChild(hr);

  const body = document.createElement("tbody");
  for (let m = 0; m < 12; m++) {
    const bounds = monthBounds(y, m);
    const phase = phaseOf(bounds);
    const pk = monthKey(y, m);

    const tr = el("tr", { class: phase === "current" ? "is-current" : phase === "future" ? "is-future" : "" });
    tr.appendChild(el("td", { class: "month-cell", textContent: MONTH_NAMES[m] }));

    let captured = 0;
    for (const b of MONTHLY) {
      const u = usageFor(pk, b.id);
      if (u) captured += b.amount;
      tr.appendChild(benefitCell(b, pk, bounds, phase));
    }

    const possible = MONTHLY.reduce((s, b) => s + b.amount, 0);
    tr.appendChild(el("td", { class: "total-cell", textContent: `$${captured} / $${possible}` }));
    body.appendChild(tr);
  }

  table.replaceChildren(head, body);
}

function benefitCell(benefit, periodKey, bounds, phase) {
  const td = el("td");
  const wrap = el("div", { class: "cell" });
  const u = usageFor(periodKey, benefit.id);

  const mark = el("button", {
    class: "mark" + (u ? " on" : ""),
    textContent: "✓",
    title: u ? `Used ${u.date} — click to clear` : `Mark ${benefit.label} used`,
  });
  mark.setAttribute("aria-pressed", u ? "true" : "false");
  mark.setAttribute("aria-label", `${benefit.label}, ${MONTH_SHORT[bounds.start.getMonth()]} ${bounds.start.getFullYear()}`);
  if (phase === "future") mark.disabled = true;
  mark.addEventListener("click", () => {
    writeUsage(periodKey, benefit.id, u ? null : { date: defaultDate(bounds) });
  });
  wrap.appendChild(mark);

  if (u) {
    const date = el("input", { type: "date", value: u.date });
    date.min = iso(bounds.start);
    date.max = iso(bounds.end);
    date.title = "Date you used this credit";
    date.addEventListener("change", () => {
      if (date.value) writeUsage(periodKey, benefit.id, { date: date.value });
    });
    wrap.appendChild(date);
  } else if (phase === "past") {
    wrap.appendChild(el("span", { class: "tag lost", textContent: `$${benefit.amount} lost` }));
  } else if (phase === "current") {
    wrap.appendChild(el("span", { class: "tag open", textContent: "open" }));
  }

  td.appendChild(wrap);
  return td;
}

function renderResy() {
  const host = $("resyCards");
  const y = state.year;
  const cards = [1, 2].map((h) => {
    const bounds = halfBounds(y, h);
    const phase = phaseOf(bounds);
    const pk = halfKey(y, h);
    const u = usageFor(pk, RESY.id);

    const cls = u ? "is-done" : phase === "past" ? "is-lost" : phase === "current" ? "is-current" : "";
    const card = el("div", { class: `half ${cls}` });
    card.appendChild(el("div", { class: "half-title", textContent: h === 1 ? "First half" : "Second half" }));
    card.appendChild(el("div", {
      class: "half-range",
      textContent: h === 1 ? `Jan 1 – Jun 30, ${y}` : `Jul 1 – Dec 31, ${y}`,
    }));

    const bodyRow = el("div", { class: "half-body" });
    const mark = el("button", {
      class: "mark" + (u ? " on" : ""),
      textContent: "✓",
      title: u ? `Used ${u.date} — click to clear` : "Mark Resy credit used",
    });
    mark.setAttribute("aria-pressed", u ? "true" : "false");
    mark.setAttribute("aria-label", `Resy credit, ${h === 1 ? "first" : "second"} half of ${y}`);
    if (phase === "future") mark.disabled = true;
    mark.addEventListener("click", () => {
      writeUsage(pk, RESY.id, u ? null : { date: defaultDate(bounds) });
    });
    bodyRow.appendChild(mark);

    if (u) {
      const date = el("input", { type: "date", value: u.date });
      date.min = iso(bounds.start);
      date.max = iso(bounds.end);
      date.addEventListener("change", () => {
        if (date.value) writeUsage(pk, RESY.id, { date: date.value });
      });
      bodyRow.appendChild(date);
    } else if (phase === "past") {
      bodyRow.appendChild(el("span", { class: "tag lost", textContent: "$50 lost" }));
    } else if (phase === "current") {
      bodyRow.appendChild(el("span", { class: "tag open", textContent: "open" }));
    }

    bodyRow.appendChild(el("span", { class: "half-amt", textContent: `$${RESY.amount}` }));
    card.appendChild(bodyRow);
    return card;
  });
  host.replaceChildren(...cards);
}

function renderSummary() {
  const y = state.year;
  let captured = 0, lost = 0, left = 0;

  for (let m = 0; m < 12; m++) {
    const bounds = monthBounds(y, m);
    const phase = phaseOf(bounds);
    const pk = monthKey(y, m);
    for (const b of MONTHLY) {
      if (usageFor(pk, b.id)) captured += b.amount;
      else if (phase === "past") lost += b.amount;
      else left += b.amount;
    }
  }
  for (const h of [1, 2]) {
    const phase = phaseOf(halfBounds(y, h));
    if (usageFor(halfKey(y, h), RESY.id)) captured += RESY.amount;
    else if (phase === "past") lost += RESY.amount;
    else left += RESY.amount;
  }

  const pct = Math.round((captured / YEAR_TOTAL) * 100);

  $("summary").replaceChildren(
    stat("Captured in " + y, `$${captured}`, `of $${YEAR_TOTAL} possible · ${pct}%`, "good", pct),
    stat("Still available", `$${left}`, "this month onward — go spend it"),
    stat("Expired unused", `$${lost}`, lost ? "gone for good" : "nothing missed so far", lost ? "bad" : "")
  );
}

function stat(label, value, sub, cls = "", barPct = null) {
  const d = el("div", { class: `stat ${cls}` });
  d.appendChild(el("div", { class: "stat-label", textContent: label }));
  d.appendChild(el("div", { class: "stat-value", textContent: value }));
  d.appendChild(el("div", { class: "stat-sub", textContent: sub }));
  if (barPct !== null) {
    const bar = el("div", { class: "bar" });
    const fill = el("i");
    fill.style.width = `${Math.min(100, barPct)}%`;
    bar.appendChild(fill);
    d.appendChild(bar);
  }
  return d;
}

function renderNotes() {
  const items = [...MONTHLY, RESY].map((b) => {
    const li = el("li");
    li.appendChild(el("strong", { textContent: `${b.label} — $${b.amount} ${b.id === "resy" ? "per half-year" : "per month"}: ` }));
    li.appendChild(document.createTextNode(b.note));
    return li;
  });
  $("benefitNotes").replaceChildren(...items);
}

function renderAll() {
  $("yearLabel").textContent = String(state.year);
  renderSummary();
  renderMonthly();
  renderResy();
}

function el(tag, props = {}) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === "class") { if (v) n.className = v; }
    else if (k === "textContent") n.textContent = v;
    else n.setAttribute(k, v);
  }
  return n;
}

/* ==========================================================================
   Access control

   ALLOWED_UID below only decides what the UI does. It is not the security
   boundary and cannot be -- this file ships to every visitor. The real check
   is the identical UID in firestore.rules, enforced by Google on every read
   and write, so a stranger who edits this constant still gets nothing back.
   ========================================================================== */

/** Setup mode: no UID configured yet, so show the user theirs. */
function showSetup(user, signOut) {
  $("setupEmail").textContent = user.email || "this account";
  $("setupUid").textContent = user.uid;
  $("setup").hidden = false;
  $("signInBtn").hidden = true;
  $("copyUid").onclick = async () => {
    try {
      await navigator.clipboard.writeText(user.uid);
      $("copyUid").textContent = "Copied";
      setTimeout(() => ($("copyUid").textContent = "Copy UID"), 1500);
    } catch {
      getSelection().selectAllChildren($("setupUid"));
    }
  };
  $("setupOut").onclick = signOut;
}

/* ==========================================================================
   Boot
   ========================================================================== */

onChange = renderAll;

function showApp(labelText) {
  $("gate").hidden = true;
  $("app").hidden = false;
  $("whoami").textContent = labelText;
  $("syncState").textContent = store.mode === "firebase" ? "synced" : "this device only";
  renderNotes();
}

$("prevYear").addEventListener("click", () => loadYear(state.year - 1));
$("nextYear").addEventListener("click", () => loadYear(state.year + 1));

if (!HAS_FIREBASE) {
  const msg = $("gateMsg");
  msg.className = "gate-msg info";
  msg.textContent = "Firebase isn't configured yet — continuing saves data in this browser only.";
  const btn = $("signInBtn");
  btn.textContent = "Continue without sign-in";
  btn.addEventListener("click", () => {
    store.uid = "local";
    showApp("local mode");
    loadYear(new Date().getFullYear());
  });
  $("signOutBtn").addEventListener("click", () => location.reload());
} else {
  const [{ initializeApp }, authMod, fsMod] = await Promise.all([
    import("https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js"),
    import("https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js"),
    import("https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js"),
  ]);

  const app = initializeApp(firebaseConfig);
  const auth = authMod.getAuth(app);
  store.fs = fsMod;
  store.db = fsMod.getFirestore(app);

  const provider = new authMod.GoogleAuthProvider();

  $("signInBtn").addEventListener("click", async () => {
    $("gateMsg").className = "gate-msg";
    $("gateMsg").textContent = "";
    try {
      await authMod.signInWithPopup(auth, provider);
    } catch (err) {
      $("gateMsg").textContent = err.code === "auth/popup-closed-by-user" ? "Sign-in cancelled." : err.message;
    }
  });

  $("signOutBtn").addEventListener("click", () => authMod.signOut(auth));

  authMod.onAuthStateChanged(auth, async (user) => {
    if (!user) {
      if (store.unsub) { store.unsub(); store.unsub = null; }
      store.uid = null;
      $("app").hidden = true;
      $("setup").hidden = true;
      $("signInBtn").hidden = false;
      $("gate").hidden = false;
      return;
    }
    if (!ALLOWED_UID) {
      showSetup(user, () => authMod.signOut(auth));
      return;
    }
    if (user.uid !== ALLOWED_UID) {
      await authMod.signOut(auth);
      $("gateMsg").className = "gate-msg";
      $("gateMsg").textContent = `${user.email} is not authorised to use this tracker.`;
      return;
    }
    store.uid = user.uid;
    showApp(user.email || "signed in");
    loadYear(new Date().getFullYear());
  });
}
