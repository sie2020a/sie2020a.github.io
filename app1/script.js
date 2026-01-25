// app1/script.js （ESM）
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";

import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  onSnapshot,
  query,
  orderBy,
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

// ---------- DOM ----------
const $ = (id) => document.getElementById(id);

const loginCard = $("loginCard");
const createCard = $("createCard");
const calendarCard = $("calendarCard");

const userPill = $("userPill");
const btnLogout = $("btnLogout");

const emailEl = $("email");
const passEl = $("password");
const authError = $("authError");

const titleEl = $("title");
const memoEl = $("memo");
const dateEl = $("date");
const timeEl = $("time");

const dataError = $("dataError");

const calTitle = $("calTitle");
const calendar = $("calendar");
const dayTitle = $("dayTitle");
const dayList = $("dayList");

// ---------- Firebase ----------
const auth = window.firebaseAuth;
const db = window.firebaseDb;

// ---------- State ----------
let currentUser = null;
let currentYm = null; // {y, m}
let events = []; // {id, title, memo, date, time}

function ymKey(y, m) {
  return `${y}-${String(m).padStart(2, "0")}`;
}
function todayYm() {
  const d = new Date();
  return { y: d.getFullYear(), m: d.getMonth() + 1 };
}
function fmtJP(y, m) {
  return `${y}年${m}月`;
}

// ---------- UI ----------
function showLoggedOut() {
  currentUser = null;
  userPill.textContent = "未ログイン";
  btnLogout.disabled = true;

  loginCard.hidden = false;
  createCard.hidden = true;
  calendarCard.hidden = true;

  authError.textContent = "";
  dataError.textContent = "";
}

function showLoggedIn(user) {
  currentUser = user;
  userPill.textContent = user.email ?? "ログイン中";
  btnLogout.disabled = false;

  loginCard.hidden = true;
  createCard.hidden = false;
  calendarCard.hidden = false;

  authError.textContent = "";
  dataError.textContent = "";
}

// ---------- Auth ----------
$("btnSignup").addEventListener("click", async () => {
  authError.textContent = "";
  try {
    await createUserWithEmailAndPassword(auth, emailEl.value.trim(), passEl.value);
  } catch (e) {
    authError.textContent = `作成エラー：${e.code || e.message}`;
  }
});

$("btnLogin").addEventListener("click", async () => {
  authError.textContent = "";
  try {
    await signInWithEmailAndPassword(auth, emailEl.value.trim(), passEl.value);
  } catch (e) {
    authError.textContent = `ログインエラー：${e.code || e.message}`;
  }
});

btnLogout.addEventListener("click", async () => {
  await signOut(auth);
});

// ---------- Firestore path ----------
function userEventsCol(uid) {
  return collection(db, "users", uid, "events");
}

// ---------- Events CRUD ----------
async function addEvent() {
  dataError.textContent = "";

  const title = titleEl.value.trim();
  const memo = memoEl.value.trim();
  const date = dateEl.value; // YYYY-MM-DD
  const time = timeEl.value; // HH:MM or ""

  if (!title || !date) {
    dataError.textContent = "予定名と日付は必須です。";
    return;
  }
  if (!currentUser) return;

  const ref = doc(userEventsCol(currentUser.uid)); // auto id
  await setDoc(ref, { title, memo, date, time, createdAt: Date.now() });

  titleEl.value = "";
  memoEl.value = "";
  timeEl.value = "";
}

$("btnAdd").addEventListener("click", addEvent);

$("btnClearInput").addEventListener("click", () => {
  titleEl.value = "";
  memoEl.value = "";
  dateEl.value = "";
  timeEl.value = "";
});

$("btnDeleteAll").addEventListener("click", async () => {
  if (!currentUser) return;
  const ok = confirm("本当に全削除する？");
  if (!ok) return;

  const snap = await getDocs(userEventsCol(currentUser.uid));
  const jobs = [];
  snap.forEach((d) => jobs.push(deleteDoc(d.ref)));
  await Promise.all(jobs);
});

// ---------- Calendar (minimum) ----------
function buildMonthGrid(y, m) {
  // 1日の曜日
  const first = new Date(y, m - 1, 1);
  const firstDow = first.getDay(); // 0 sun
  const daysInMonth = new Date(y, m, 0).getDate();

  // 6週 x 7日
  const cells = [];
  const start = 1 - firstDow;
  for (let i = 0; i < 42; i++) {
    const day = start + i;
    const d = new Date(y, m - 1, day);
    cells.push({
      y: d.getFullYear(),
      m: d.getMonth() + 1,
      d: d.getDate(),
      inMonth: (d.getMonth() + 1) === m,
      iso: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`
    });
  }
  return { cells, daysInMonth };
}

function renderCalendar() {
  if (!currentYm) currentYm = todayYm();
  const { y, m } = currentYm;

  calTitle.textContent = fmtJP(y, m);
  calendar.innerHTML = "";

  const head = document.createElement("div");
  head.className = "calWeekHead";
  head.innerHTML = ["日","月","火","水","木","金","土"].map(s => `<div class="calDow">${s}</div>`).join("");
  calendar.appendChild(head);

  const grid = document.createElement("div");
  grid.className = "calGrid";

  const { cells } = buildMonthGrid(y, m);

  const byDate = new Map();
  for (const ev of events) {
    if (!byDate.has(ev.date)) byDate.set(ev.date, []);
    byDate.get(ev.date).push(ev);
  }

  for (const c of cells) {
    const cell = document.createElement("button");
    cell.type = "button";
    cell.className = "calCell" + (c.inMonth ? "" : " mutedCell");
    cell.dataset.iso = c.iso;

    const badgeCount = (byDate.get(c.iso) || []).length;

    cell.innerHTML = `
      <div class="calDayNum">${c.d}</div>
      ${badgeCount ? `<div class="calBadge">${badgeCount}</div>` : ``}
    `;

    cell.addEventListener("click", () => renderDayPanel(c.iso));
    grid.appendChild(cell);
  }
  calendar.appendChild(grid);
}

function renderDayPanel(iso) {
  dayTitle.textContent = iso;
  const list = events.filter(e => e.date === iso).sort((a,b) => (a.time||"").localeCompare(b.time||""));

  if (!list.length) {
    dayList.innerHTML = `<p class="muted">この日の予定はありません。</p>`;
    return;
  }

  dayList.innerHTML = list.map(e => `
    <div class="dayItem">
      <div class="dayItemTop">
        <div class="dayItemTitle">${escapeHtml(e.title)}</div>
        <div class="dayItemTime">${escapeHtml(e.time || "")}</div>
      </div>
      ${e.memo ? `<div class="dayItemMemo">${escapeHtml(e.memo)}</div>` : ""}
      <div class="dayItemActions">
        <button class="btn danger small" data-del="${e.id}">削除</button>
      </div>
    </div>
  `).join("");

  dayList.querySelectorAll("[data-del]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.del;
      await deleteDoc(doc(db, "users", currentUser.uid, "events", id));
    });
  });
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[c]));
}

$("btnPrevMonth").addEventListener("click", () => {
  const { y, m } = currentYm;
  const d = new Date(y, m - 2, 1);
  currentYm = { y: d.getFullYear(), m: d.getMonth() + 1 };
  renderCalendar();
});

$("btnNextMonth").addEventListener("click", () => {
  const { y, m } = currentYm;
  const d = new Date(y, m, 1);
  currentYm = { y: d.getFullYear(), m: d.getMonth() + 1 };
  renderCalendar();
});

$("btnToday").addEventListener("click", () => {
  currentYm = todayYm();
  renderCalendar();
});

$("btnCloseDayPanel")?.addEventListener("click", () => {
  dayTitle.textContent = "日付を選択";
  dayList.innerHTML = `<p class="muted">カレンダーの日付をクリックすると、その日の予定とメモが見れます。</p>`;
});

// ---------- Listen ----------
let unsubscribe = null;

onAuthStateChanged(auth, (user) => {
  if (!user) {
    if (unsubscribe) unsubscribe();
    unsubscribe = null;
    events = [];
    showLoggedOut();
    return;
  }

  showLoggedIn(user);
  currentYm = todayYm();

  // Firestore購読（リアルタイム）
  if (unsubscribe) unsubscribe();
  const q = query(userEventsCol(user.uid), orderBy("createdAt", "asc"));
  unsubscribe = onSnapshot(q, (snap) => {
    events = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderCalendar();
  }, (err) => {
    dataError.textContent = `DBエラー：${err.code || err.message}`;
  });

  renderCalendar();
});

// ---------- Export ----------
$("btnExport").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(events, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "events.json";
  a.click();
});
