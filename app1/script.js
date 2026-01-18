// app1/script.js  (ES Modules)

// Firebase SDK（バージョンは固定。動かなければ数字だけ新しいのに変えてOK）
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

import {
  getFirestore,
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

/* =========================
   1) Firebase設定（ここだけ差し替え）
   ========================= */
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
};

// init
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

/* =========================
   2) DOM
   ========================= */
const el = (id) => document.getElementById(id);

const userPill = el("userPill");
const btnFullscreen = el("btnFullscreen");
const btnLogout = el("btnLogout");

const loginCard = el("loginCard");
const createCard = el("createCard");
const calendarCard = el("calendarCard");

const username = el("username"); // 使わないけどUI維持（消さない）
const btnLogin = el("btnLogin");

const titleInput = el("title");
const memoInput = el("memo");
const dateInput = el("date");
const timeInput = el("time");
const btnAdd = el("btnAdd");
const btnClearInput = el("btnClearInput");

const btnPrevMonth = el("btnPrevMonth");
const btnNextMonth = el("btnNextMonth");
const btnToday = el("btnToday");
const calTitle = el("calTitle");
const calendar = el("calendar");

const dayPanel = el("dayPanel");
const dayTitle = el("dayTitle");
const dayList = el("dayList");
const btnCloseDayPanel = el("btnCloseDayPanel");

const btnExport = el("btnExport");
const btnDeleteAll = el("btnDeleteAll");

const editDialog = el("editDialog");
const editTitle = el("editTitle");
const editMemo = el("editMemo");
const editDate = el("editDate");
const editTime = el("editTime");
const btnSaveEdit = el("btnSaveEdit");

/* =========================
   3) 状態
   ========================= */
let currentUser = null;
let currentMonth = new Date(); // 表示中の月
currentMonth.setDate(1);

let events = []; // 現在月の予定（Firestoreから取得）
let selectedDate = null; // "YYYY-MM-DD"
let editingId = null;

/* =========================
   4) ログインUIをGoogleログインに変更
   ========================= */

// 「ログイン」ボタンをGoogleログインにする（ボタン文言は変えたくなければそのままでもOK）
btnLogin.textContent = "Googleでログイン";
username.placeholder = "Googleログインを使います（ここは未使用）";
username.disabled = true;

btnLogin.addEventListener("click", async () => {
  try {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  } catch (e) {
    alert("ログイン失敗: " + (e?.message ?? e));
  }
});

btnLogout.addEventListener("click", async () => {
  try {
    await signOut(auth);
  } catch (e) {
    alert("ログアウト失敗: " + (e?.message ?? e));
  }
});

onAuthStateChanged(auth, async (user) => {
  currentUser = user ?? null;

  if (!currentUser) {
    userPill.textContent = "未ログイン";
    loginCard.style.display = "";
    createCard.style.display = "none";
    calendarCard.style.display = "none";
    events = [];
    renderCalendar();
    closeDayPanel();
    return;
  }

  userPill.textContent = currentUser.displayName || currentUser.email || "ログイン中";
  loginCard.style.display = "none";
  createCard.style.display = "";
  calendarCard.style.display = "";

  // ログインしたら当月を読み込み
  await loadMonthEvents();
  renderCalendar();
});

/* =========================
   5) Firestore（保存・読み込み）
   ========================= */

function userEventsCol() {
  if (!currentUser) return null;
  return collection(db, "users", currentUser.uid, "events");
}

// 月の範囲（YYYY-MM-DD文字列）
function monthRange(d) {
  const y = d.getFullYear();
  const m = d.getMonth();
  const first = new Date(y, m, 1);
  const last = new Date(y, m + 1, 0);
  return {
    from: toYmd(first),
    to: toYmd(last),
  };
}

async function loadMonthEvents() {
  if (!currentUser) return;

  const { from, to } = monthRange(currentMonth);
  const q = query(
    userEventsCol(),
    where("date", ">=", from),
    where("date", "<=", to)
  );

  const snap = await getDocs(q);
  const list = [];
  snap.forEach((docu) => {
    const data = docu.data();
    list.push({
      id: docu.id,
      title: data.title ?? "",
      memo: data.memo ?? "",
      date: data.date ?? "",
      time: data.time ?? "",
      updatedAt: data.updatedAt ?? null,
    });
  });

  // 同日内は time で並べる（Firestore側で複雑にしない）
  list.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return (a.time || "99:99").localeCompare(b.time || "99:99");
  });

  events = list;

  // 選択日があれば詳細も更新
  if (selectedDate) renderDayPanel(selectedDate);
}

async function addEvent({ title, memo, date, time }) {
  const col = userEventsCol();
  const payload = {
    title,
    memo,
    date,
    time: time || "",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  await addDoc(col, payload);
}

async function updateEvent(id, { title, memo, date, time }) {
  const ref = doc(db, "users", currentUser.uid, "events", id);
  await updateDoc(ref, {
    title,
    memo,
    date,
    time: time || "",
    updatedAt: serverTimestamp(),
  });
}

async function removeEvent(id) {
  const ref = doc(db, "users", currentUser.uid, "events", id);
  await deleteDoc(ref);
}

async function deleteAllEvents() {
  const col = userEventsCol();
  const snap = await getDocs(col);
  const tasks = [];
  snap.forEach((d) => tasks.push(deleteDoc(d.ref)));
  await Promise.all(tasks);
}

/* =========================
   6) 入力・追加
   ========================= */

btnClearInput.addEventListener("click", () => {
  titleInput.value = "";
  memoInput.value = "";
  dateInput.value = "";
  timeInput.value = "";
});

btnAdd.addEventListener("click", async () => {
  if (!currentUser) return alert("ログインしてね");

  const title = titleInput.value.trim();
  const memo = memoInput.value.trim();
  const date = dateInput.value;
  const time = timeInput.value;

  if (!title) return alert("予定名は必須");
  if (!date) return alert("日付は必須");

  try {
    await addEvent({ title, memo, date, time });
    btnClearInput.click();
    await loadMonthEvents();
    renderCalendar();
  } catch (e) {
    alert("保存失敗: " + (e?.message ?? e));
  }
});

/* =========================
   7) カレンダー描画
   ========================= */

btnPrevMonth.addEventListener("click", async () => {
  currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
  await loadMonthEvents();
  renderCalendar();
});

btnNextMonth.addEventListener("click", async () => {
  currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
  await loadMonthEvents();
  renderCalendar();
});

btnToday.addEventListener("click", async () => {
  const now = new Date();
  currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  await loadMonthEvents();
  renderCalendar();
  // 今日を開く
  const today = toYmd(now);
  openDayPanel(today);
});

function renderCalendar() {
  const y = currentMonth.getFullYear();
  const m = currentMonth.getMonth();
  calTitle.textContent = `${y}年${m + 1}月`;

  // 月の1日が何曜日か（0=日）
  const firstDay = new Date(y, m, 1);
  const startWeekday = firstDay.getDay();

  const daysInMonth = new Date(y, m + 1, 0).getDate();

  // 表示は 6週 x 7日 で固定（Googleカレンダーっぽい）
  const totalCells = 42;

  // 前月の末日
  const prevMonthLast = new Date(y, m, 0).getDate();

  calendar.innerHTML = "";

  // 曜日ヘッダ
  const week = ["日", "月", "火", "水", "木", "金", "土"];
  const header = document.createElement("div");
  header.className = "calGrid calWeekHeader";
  week.forEach((w) => {
    const d = document.createElement("div");
    d.className = "calWeekCell";
    d.textContent = w;
    header.appendChild(d);
  });
  calendar.appendChild(header);

  // 本体
  const grid = document.createElement("div");
  grid.className = "calGrid calBody";

  for (let i = 0; i < totalCells; i++) {
    const cell = document.createElement("div");
    cell.className = "calCell";

    let dayNum;
    let cellDate;
    let inMonth = true;

    if (i < startWeekday) {
      // 前月
      inMonth = false;
      dayNum = prevMonthLast - (startWeekday - 1 - i);
      cellDate = toYmd(new Date(y, m - 1, dayNum));
    } else if (i >= startWeekday + daysInMonth) {
      // 次月
      inMonth = false;
      dayNum = i - (startWeekday + daysInMonth) + 1;
      cellDate = toYmd(new Date(y, m + 1, dayNum));
    } else {
      // 当月
      dayNum = i - startWeekday + 1;
      cellDate = toYmd(new Date(y, m, dayNum));
    }

    if (!inMonth) cell.classList.add("mutedMonth");

    // 今日
    const todayStr = toYmd(new Date());
    if (cellDate === todayStr) cell.classList.add("today");

    // 選択日
    if (selectedDate && cellDate === selectedDate) cell.classList.add("selected");

    const top = document.createElement("div");
    top.className = "calDayNum";
    top.textContent = String(dayNum);

    const list = document.createElement("div");
    list.className = "calEvents";

    const dayEvents = events.filter((e) => e.date === cellDate);
    const maxShow = 3;

    dayEvents.slice(0, maxShow).forEach((e) => {
      const item = document.createElement("div");
      item.className = "calEventItem";
      item.textContent = e.time ? `${e.time} ${e.title}` : e.title;
      list.appendChild(item);
    });

    if (dayEvents.length > maxShow) {
      const more = document.createElement("div");
      more.className = "calMore";
      more.textContent = `+${dayEvents.length - maxShow}件`;
      list.appendChild(more);
    }

    cell.appendChild(top);
    cell.appendChild(list);

    cell.addEventListener("click", () => openDayPanel(cellDate));

    grid.appendChild(cell);
  }

  calendar.appendChild(grid);
}

function openDayPanel(ymd) {
  selectedDate = ymd;
  dayPanel.classList.add("open");
  renderCalendar(); // 選択ハイライト更新
  renderDayPanel(ymd);
}

function closeDayPanel() {
  dayPanel.classList.remove("open");
  selectedDate = null;
  renderCalendar();
}

btnCloseDayPanel.addEventListener("click", closeDayPanel);

function renderDayPanel(ymd) {
  dayTitle.textContent = formatYmd(ymd);

  const dayEvents = events
    .filter((e) => e.date === ymd)
    .sort((a, b) => (a.time || "99:99").localeCompare(b.time || "99:99"));

  if (dayEvents.length === 0) {
    dayList.innerHTML = `<p class="muted">この日の予定はありません。</p>`;
    return;
  }

  const wrap = document.createElement("div");
  wrap.className = "dayItems";

  dayEvents.forEach((e) => {
    const card = document.createElement("div");
    card.className = "dayItem";

    const head = document.createElement("div");
    head.className = "day reac";

    const t = document.createElement("div");
    t.className = "dayItemTitle";
    t.textContent = e.time ? `${e.time}  ${e.title}` : e.title;

    const memo = document.createElement("div");
    memo.className = "dayItemMemo";
    memo.textContent = e.memo ? `メモ：${e.memo}` : "メモ：（なし）";

    const actions = document.createElement("div");
    actions.className = "dayActions";

    const editBtn = document.createElement("button");
    editBtn.className = "btn";
    editBtn.textContent = "編集";
    editBtn.addEventListener("click", () => openEdit(e));

    const delBtn = document.createElement("button");
    delBtn.className = "btn danger";
    delBtn.textContent = "削除";
    delBtn.addEventListener("click", async () => {
      if (!confirm("削除する？")) return;
      await removeEvent(e.id);
      await loadMonthEvents();
      renderCalendar();
      renderDayPanel(ymd);
    });

    actions.appendChild(editBtn);
    actions.appendChild(delBtn);

    card.appendChild(t);
    card.appendChild(memo);
    card.appendChild(actions);

    wrap.appendChild(card);
  });

  dayList.innerHTML = "";
  dayList.appendChild(wrap);
}

/* =========================
   8) 編集モーダル
   ========================= */

function openEdit(e) {
  editingId = e.id;
  editTitle.value = e.title || "";
  editMemo.value = e.memo || "";
  editDate.value = e.date || "";
  editTime.value = e.time || "";
  editDialog.showModal();
}

btnSaveEdit.addEventListener("click", async (ev) => {
  ev.preventDefault(); // dialog閉じるのは form method=dialog がやる
  if (!editingId) return;

  const payload = {
    title: editTitle.value.trim(),
    memo: editMemo.value.trim(),
    date: editDate.value,
    time: editTime.value,
  };

  if (!payload.title) return alert("予定名は必須");
  if (!payload.date) return alert("日付は必須");

  try {
    await updateEvent(editingId, payload);
    editingId = null;
    editDialog.close();
    await loadMonthEvents();
    renderCalendar();
    if (selectedDate) renderDayPanel(selectedDate);
  } catch (e) {
    alert("更新失敗: " + (e?.message ?? e));
  }
});

/* =========================
   9) JSONエクスポート / 全削除
   ========================= */

btnExport.addEventListener("click", async () => {
  if (!currentUser) return alert("ログインしてね");

  const snap = await getDocs(userEventsCol());
  const list = [];
  snap.forEach((d) => list.push({ id: d.id, ...d.data() }));

  const blob = new Blob([JSON.stringify(list, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `events_${currentUser.uid}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
});

btnDeleteAll.addEventListener("click", async () => {
  if (!currentUser) return alert("ログインしてね");
  if (!confirm("本当に全削除する？")) return;

  try {
    await deleteAllEvents();
    await loadMonthEvents();
    renderCalendar();
    if (selectedDate) renderDayPanel(selectedDate);
  } catch (e) {
    alert("全削除失敗: " + (e?.message ?? e));
  }
});

/* =========================
   10) 全画面（⛶）
   ========================= */

btnFullscreen.addEventListener("click", async () => {
  const target = document.documentElement;
  try {
    if (!document.fullscreenElement) {
      await target.requestFullscreen();
      document.body.classList.add("isFullscreen");
    } else {
      await document.exitFullscreen();
      document.body.classList.remove("isFullscreen");
    }
  } catch (e) {
    // iOS Safari等でFullscreen APIが効かないことがあるのでCSS fallback
    document.body.classList.toggle("isFullscreen");
  }
});

document.addEventListener("fullscreenchange", () => {
  document.body.classList.toggle("isFullscreen", !!document.fullscreenElement);
});

/* =========================
   11) util
   ========================= */

function pad2(n) {
  return String(n).padStart(2, "0");
}

function toYmd(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function formatYmd(ymd) {
  const [y, m, d] = ymd.split("-");
  return `${y}年${Number(m)}月${Number(d)}日`;
}

// 初回描画（未ログイン状態）
renderCalendar();
