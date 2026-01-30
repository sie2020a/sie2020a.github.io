// app1/script.js （ESM）
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
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
const btnFullscreen = $("btnFullscreen");

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

// ---------- helpers ----------
function fmtJP(y, m) { return `${y}年${m}月`; }
function todayYm() {
  const d = new Date();
  return { y: d.getFullYear(), m: d.getMonth() + 1 };
}
function isoOf(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[c]));
}

// ---------- UI ----------
let currentUser = null;
let currentYm = null; // {y,m}
let events = [];
let unsubscribe = null;

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

// ---------- password eye ----------
$("btnPwEye")?.addEventListener("click", () => {
  const t = passEl.type === "password" ? "text" : "password";
  passEl.type = t;
});

// ---------- Auth ----------
function validatePassword(pw) {
  if (pw.length < 6) return "パスワードは6文字以上必要です。";
  if (!/[a-zA-Z]/.test(pw) || !/[0-9]/.test(pw)) {
    return "英字と数字を混ぜてください（例：abc123）。";
  }
  return null;
}

$("btnSignup").addEventListener("click", async () => {
  authError.textContent = "";
  const email = emailEl.value.trim();
  const pass = passEl.value;

  const pwErr = validatePassword(pass);
  if (pwErr) { authError.textContent = pwErr; return; }

  try {
    await createUserWithEmailAndPassword(auth, email, pass);
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

// ---------- Reset Password (A: email link) ----------
const actionCodeSettings = {
  url: "https://sie2020a.github.io/app1/reset.html",
  handleCodeInApp: false,
};

$("btnReset")?.addEventListener("click", async () => {
  authError.textContent = "";
  const email = emailEl.value.trim();
  if (!email) {
    authError.textContent = "メールアドレス入れて";
    return;
  }
  try {
    await sendPasswordResetEmail(auth, email, actionCodeSettings);
    authError.textContent = "リセットメール送信しました（メールのリンクを開いて）";
  } catch (e) {
    authError.textContent = `リセットエラー：${e.code || e.message}`;
  }
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

  // 右側パネルも戻す
  closeDayPanel();
});

// ---------- Calendar core ----------
function buildMonthGrid(y, m) {
  const first = new Date(y, m - 1, 1);
  const firstDow = first.getDay(); // 0 sun
  const daysInMonth = new Date(y, m, 0).getDate();

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
      iso: isoOf(d),
    });
  }
  return { cells, daysInMonth };
}

function closeDayPanel() {
  dayTitle.textContent = "日付を選択";
  dayList.innerHTML = `<p class="muted">カレンダーの日付をクリックすると、その日の予定とメモが見れます。</p>`;
  renderCalendar(); // selected枠を外す
}

$("btnCloseDayPanel")?.addEventListener("click", closeDayPanel);

function renderCalendar() {
  if (!currentYm) currentYm = todayYm();
  const { y, m } = currentYm;

  calTitle.textContent = fmtJP(y, m);
  calendar.innerHTML = "";

  // 曜日ヘッダ
  const head = document.createElement("div");
  head.className = "calWeekHead";
  head.innerHTML = ["日","月","火","水","木","金","土"]
    .map(s => `<div class="calCellHead">${s}</div>`)
    .join("");
  calendar.appendChild(head);

  // グリッド
  const grid = document.createElement("div");
  grid.className = "calGrid";

  const { cells } = buildMonthGrid(y, m);

  // 日付 -> 予定配列
  const byDate = new Map();
  for (const ev of events) {
    if (!byDate.has(ev.date)) byDate.set(ev.date, []);
    byDate.get(ev.date).push(ev);
  }

  // 同日内を時間順
  for (const arr of byDate.values()) {
    arr.sort((a,b) => (a.time||"").localeCompare(b.time||""));
  }

  const todayIso = isoOf(new Date());
  const selectedIso = (dayTitle.textContent && /^\d{4}-\d{2}-\d{2}$/.test(dayTitle.textContent))
    ? dayTitle.textContent
    : null;

  const MAX = 2; // 月表示で見せる予定の最大行数（ごちゃごちゃ防止）

  for (const c of cells) {
    const cell = document.createElement("div");
    cell.className =
      "calDay" +
      (c.inMonth ? "" : " mutedDay") +
      (c.iso === selectedIso ? " selected" : "");
    cell.dataset.iso = c.iso;

    // 日付表示（右上に今日タグ）
    const top = document.createElement("div");
    top.className = "dayNum";

    const left = document.createElement("span");
    left.textContent = String(c.d);

    const right = document.createElement("span");
    right.className = "tag";
    if (c.iso === todayIso) {
      right.textContent = "今日";
      right.classList.add("today");
    } else {
      right.textContent = "";
      right.style.border = "none";
      right.style.background = "transparent";
    }

    top.appendChild(left);
    top.appendChild(right);

    // 予定リスト（月表示には「タイトル（+時間はOK）」だけ。メモは絶対出さない）
    const items = document.createElement("div");
    items.className = "items";

    const list = (byDate.get(c.iso) || []);
    const shown = list.slice(0, MAX);

    for (const ev of shown) {
      const line = document.createElement("div");
      line.className = "itemLine";
      line.textContent = ev.time ? `${ev.time} ${ev.title}` : ev.title;

      line.addEventListener("click", (e) => {
        e.stopPropagation();
        renderDayPanel(c.iso);
      });

      items.appendChild(line);
    }

    if (list.length > MAX) {
      const more = document.createElement("div");
      more.className = "itemLine";
      more.textContent = `+${list.length - MAX}件`;
      more.addEventListener("click", (e) => {
        e.stopPropagation();
        renderDayPanel(c.iso);
      });
      items.appendChild(more);
    }

    cell.appendChild(top);
    cell.appendChild(items);

    // マスクリック → 日パネル
    cell.addEventListener("click", () => renderDayPanel(c.iso));

    grid.appendChild(cell);
  }

  calendar.appendChild(grid);
}

function renderDayPanel(iso) {
  dayTitle.textContent = iso;

  const list = events
    .filter(e => e.date === iso)
    .slice()
    .sort((a,b) => (a.time||"").localeCompare(b.time||""));

  if (!list.length) {
    dayList.innerHTML = `<p class="muted">この日の予定はありません。</p>`;
    renderCalendar();
    return;
  }

  dayList.innerHTML = list.map(e => `
    <div class="eventCard">
      <div class="eventTop">
        <div class="eventName">${escapeHtml(e.title)}</div>
        <div class="eventActions">
          <button class="btn danger smallBtn" data-del="${e.id}">削除</button>
        </div>
      </div>
      <div class="eventMeta">${escapeHtml(e.time || "")}${e.memo ? `\n${escapeHtml(e.memo)}` : ""}</div>
    </div>
  `).join("");

  dayList.querySelectorAll("[data-del]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.del;
      await deleteDoc(doc(db, "users", currentUser.uid, "events", id));
    });
  });

  renderCalendar(); // selected枠を反映
}

// ---------- Month nav ----------
$("btnPrevMonth").addEventListener("click", () => {
  const { y, m } = currentYm || todayYm();
  const d = new Date(y, m - 2, 1);
  currentYm = { y: d.getFullYear(), m: d.getMonth() + 1 };
  renderCalendar();
});
$("btnNextMonth").addEventListener("click", () => {
  const { y, m } = currentYm || todayYm();
  const d = new Date(y, m, 1);
  currentYm = { y: d.getFullYear(), m: d.getMonth() + 1 };
  renderCalendar();
});
$("btnToday").addEventListener("click", () => {
  currentYm = todayYm();
  renderCalendar();
});

// ---------- Fullscreen calendar ----------
btnFullscreen?.addEventListener("click", async () => {
  try {
    const target = calendarCard;
    if (!document.fullscreenElement) {
      await target.requestFullscreen();
      document.body.classList.add("fullscreenCal");
    } else {
      await document.exitFullscreen();
      document.body.classList.remove("fullscreenCal");
    }
  } catch (e) {
    console.error(e);
  }
});
document.addEventListener("fullscreenchange", () => {
  if (!document.fullscreenElement) {
    document.body.classList.remove("fullscreenCal");
  }
});

// ---------- Export ----------
$("btnExport").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(events, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "events.json";
  a.click();
});

// ---------- Listen (Auth + Realtime DB) ----------
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
