// app1/script.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDocs,
  getDoc,
  deleteDoc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* =========================
   1) ここをあなたの値に置換
========================= */
const firebaseConfig = {
  apiKey: "ここを置換",
  authDomain: "ここを置換",
  projectId: "ここを置換",
  storageBucket: "ここを置換",
  messagingSenderId: "ここを置換",
  appId: "ここを置換",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

/* =========================
   DOM
========================= */
const $ = (id) => document.getElementById(id);

const loginCard = $("loginCard");
const createCard = $("createCard");
const calendarCard = $("calendarCard");

const userPill = $("userPill");
const btnFullscreen = $("btnFullscreen");
const btnLogout = $("btnLogout");

const emailEl = $("email");
const passEl = $("password");
const btnLogin = $("btnLogin");
const btnSignup = $("btnSignup");
const authError = $("authError");

const titleEl = $("title");
const memoEl = $("memo");
const dateEl = $("date");
const timeEl = $("time");
const btnAdd = $("btnAdd");
const btnClearInput = $("btnClearInput");

const btnPrevMonth = $("btnPrevMonth");
const btnNextMonth = $("btnNextMonth");
const btnToday = $("btnToday");
const calTitle = $("calTitle");
const calendar = $("calendar");

const dayPanel = $("dayPanel");
const dayTitle = $("dayTitle");
const dayList = $("dayList");
const btnCloseDayPanel = $("btnCloseDayPanel");

const btnExport = $("btnExport");
const btnDeleteAll = $("btnDeleteAll");
const dataError = $("dataError");

const editDialog = $("editDialog");
const editForm = $("editForm");
const editTitle = $("editTitle");
const editMemo = $("editMemo");
const editDate = $("editDate");
const editTime = $("editTime");
const btnSaveEdit = $("btnSaveEdit");

/* =========================
   State
========================= */
let currentUser = null;
let events = []; // {id, title, memo, date(YYYY-MM-DD), time(HH:MM|""), updatedAt}
let viewYear = null;
let viewMonth = null; // 0-11
let selectedDate = null; // YYYY-MM-DD
let editingId = null;

/* =========================
   Utils
========================= */
function pad2(n){ return String(n).padStart(2,"0"); }
function ymd(d){
  return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
}
function ymTitle(y,m0){
  return `${y}年${m0+1}月`;
}
function toDateObj(ymdStr){
  const [y,m,d] = ymdStr.split("-").map(Number);
  return new Date(y, m-1, d);
}
function sameYMD(a,b){ return a===b; }
function safeText(s){ return (s ?? "").toString(); }

/* =========================
   Firestore paths
   users/{uid}/events/{eventId}
========================= */
function eventsCol(){
  return collection(db, "users", currentUser.uid, "events");
}
function eventDoc(id){
  return doc(db, "users", currentUser.uid, "events", id);
}

/* =========================
   Auth UI
========================= */
function setAuthError(msg){
  authError.textContent = msg || "";
}
function setDataError(msg){
  dataError.textContent = msg || "";
}

function showLoggedOut(){
  currentUser = null;
  userPill.textContent = "未ログイン";
  btnLogout.disabled = true;

  loginCard.hidden = false;
  createCard.hidden = true;
  calendarCard.hidden = true;

  setAuthError("");
  setDataError("");
}

function showLoggedIn(user){
  currentUser = user;
  userPill.textContent = user.email || "ログイン中";
  btnLogout.disabled = false;

  loginCard.hidden = true;
  createCard.hidden = false;
  calendarCard.hidden = false;

  // 初期表示
  const now = new Date();
  viewYear = now.getFullYear();
  viewMonth = now.getMonth();
  selectedDate = ymd(now);

  // 入力も初期化
  dateEl.value = selectedDate;

  loadAllEvents().then(() => {
    renderCalendar();
    openDay(selectedDate);
  });
}

/* =========================
   Auth actions
========================= */
btnLogin.addEventListener("click", async () => {
  setAuthError("");
  const email = emailEl.value.trim();
  const pass = passEl.value;

  if(!email || !pass){
    setAuthError("メールアドレスとパスワードを入れて。");
    return;
  }

  try{
    await signInWithEmailAndPassword(auth, email, pass);
  }catch(e){
    setAuthError(humanAuthError(e));
  }
});

btnSignup.addEventListener("click", async () => {
  setAuthError("");
  const email = emailEl.value.trim();
  const pass = passEl.value;

  if(!email || !pass){
    setAuthError("メールアドレスとパスワードを入れて。");
    return;
  }
  if(pass.length < 6){
    setAuthError("パスワードは6文字以上にして。");
    return;
  }

  try{
    await createUserWithEmailAndPassword(auth, email, pass);
  }catch(e){
    setAuthError(humanAuthError(e));
  }
});

btnLogout.addEventListener("click", async () => {
  await signOut(auth);
});

function humanAuthError(e){
  const code = e?.code || "";
  if(code.includes("auth/invalid-email")) return "メールアドレスが変。";
  if(code.includes("auth/missing-password")) return "パスワードが空。";
  if(code.includes("auth/invalid-credential")) return "メールかパスワードが違う。";
  if(code.includes("auth/email-already-in-use")) return "そのメールは既に使われてる。";
  if(code.includes("auth/weak-password")) return "パスワードが弱い。6文字以上。";
  if(code.includes("auth/network-request-failed")) return "ネットワークエラー。通信を確認して。";
  if(code.includes("auth/api-key-not-valid")) return "FirebaseのapiKeyが無効。firebaseConfigを正しい値にして。";
  return `エラー：${code || e?.message || "unknown"}`;
}

/* =========================
   Firestore load/save
========================= */
async function loadAllEvents(){
  setDataError("");
  events = [];
  try{
    const snap = await getDocs(eventsCol());
    snap.forEach(docu => {
      const d = docu.data();
      events.push({
        id: docu.id,
        title: d.title || "",
        memo: d.memo || "",
        date: d.date || "",
        time: d.time || "",
        updatedAt: d.updatedAt || 0,
      });
    });

    // 日付+時間で並べる
    events.sort((a,b) => {
      const ad = (a.date||"") + " " + (a.time||"");
      const bd = (b.date||"") + " " + (b.time||"");
      return ad.localeCompare(bd);
    });
  }catch(e){
    setDataError("データ取得に失敗。Firestore設定/ルールを確認して。");
    console.error(e);
  }
}

async function addEvent({title, memo, date, time}){
  const id = crypto.randomUUID();
  const payload = {
    title,
    memo,
    date,
    time,
    updatedAt: Date.now(),
  };
  await setDoc(eventDoc(id), payload);
  events.push({ id, ...payload });
}

async function updateEvent(id, patch){
  patch.updatedAt = Date.now();
  await updateDoc(eventDoc(id), patch);
  const idx = events.findIndex(e => e.id === id);
  if(idx >= 0){
    events[idx] = { ...events[idx], ...patch };
  }
}

async function deleteEvent(id){
  await deleteDoc(eventDoc(id));
  events = events.filter(e => e.id !== id);
}

async function deleteAllEvents(){
  // シンプルに全件削除（小規模想定）
  const snap = await getDocs(eventsCol());
  const tasks = [];
  snap.forEach(docu => tasks.push(deleteDoc(docu.ref)));
  await Promise.all(tasks);
  events = [];
}

/* =========================
   Create UI
========================= */
btnClearInput.addEventListener("click", () => {
  titleEl.value = "";
  memoEl.value = "";
  dateEl.value = selectedDate || "";
  timeEl.value = "";
});

btnAdd.addEventListener("click", async () => {
  setDataError("");

  const title = titleEl.value.trim();
  const memo = memoEl.value.trim();
  const date = dateEl.value;
  const time = timeEl.value;

  if(!title){
    setDataError("予定名が空。");
    return;
  }
  if(!date){
    setDataError("日付は必須。");
    return;
  }

  try{
    await addEvent({title, memo, date, time});
    // 入力クリア（dateは維持してもいい）
    titleEl.value = "";
    memoEl.value = "";
    timeEl.value = "";

    // 表示更新
    normalizeSort();
    // 追加した日の詳細を開く
    selectedDate = date;
    // 月が違う場合は移動
    const d = toDateObj(date);
    viewYear = d.getFullYear();
    viewMonth = d.getMonth();

    renderCalendar();
    openDay(date);
  }catch(e){
    setDataError("追加に失敗。Firestore/ルールを確認して。");
    console.error(e);
  }
});

function normalizeSort(){
  events.sort((a,b) => {
    const ad = (a.date||"") + " " + (a.time||"");
    const bd = (b.date||"") + " " + (b.time||"");
    return ad.localeCompare(bd);
  });
}

/* =========================
   Calendar render
========================= */
btnPrevMonth.addEventListener("click", () => {
  if(viewMonth === 0){ viewMonth = 11; viewYear--; }
  else viewMonth--;
  renderCalendar();
});
btnNextMonth.addEventListener("click", () => {
  if(viewMonth === 11){ viewMonth = 0; viewYear++; }
  else viewMonth++;
  renderCalendar();
});
btnToday.addEventListener("click", () => {
  const now = new Date();
  viewYear = now.getFullYear();
  viewMonth = now.getMonth();
  selectedDate = ymd(now);
  dateEl.value = selectedDate;
  renderCalendar();
  openDay(selectedDate);
});

btnCloseDayPanel.addEventListener("click", () => {
  // スマホで邪魔なら閉じる。PCは閉じなくてもいい。
  dayTitle.textContent = "日付を選択";
  dayList.innerHTML = `<p class="muted">カレンダーの日付をクリックすると、その日の予定とメモが見れます。</p>`;
});

function renderCalendar(){
  // タイトル
  calTitle.textContent = ymTitle(viewYear, viewMonth);

  // 曜日ヘッダ
  const week = ["日","月","火","水","木","金","土"];

  // 月の最初の日
  const first = new Date(viewYear, viewMonth, 1);
  const firstDow = first.getDay();

  // カレンダー開始日（前月分含む）
  const start = new Date(viewYear, viewMonth, 1 - firstDow);

  // 6週固定（42マス）
  const cells = [];
  for(let i=0;i<42;i++){
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    cells.push(d);
  }

  // 同月イベントをまとめる
  const monthKey = `${viewYear}-${pad2(viewMonth+1)}`;
  const map = new Map(); // date -> events[]
  for(const ev of events){
    if(!ev.date) continue;
    if(ev.date.startsWith(monthKey)){
      if(!map.has(ev.date)) map.set(ev.date, []);
      map.get(ev.date).push(ev);
    }else{
      // 前後月の表示にも少し載るので、表示範囲に入るなら載せる（雑でOK）
      if(!map.has(ev.date)) map.set(ev.date, []);
      map.get(ev.date).push(ev);
    }
  }
  // 各日の中を時間順
  for(const [k,arr] of map.entries()){
    arr.sort((a,b)=> ((a.time||"").localeCompare(b.time||"")));
  }

  // HTML生成
  const parts = [];
  parts.push(`<div class="calGrid">`);
  for(const w of week){
    parts.push(`<div class="calCellHead">${w}</div>`);
  }
  parts.push(`</div>`);

  parts.push(`<div class="calGrid">`);
  const today = ymd(new Date());

  for(const d of cells){
    const inMonth = (d.getMonth() === viewMonth);
    const ds = ymd(d);
    const isToday = ds === today;
    const isSelected = selectedDate && ds === selectedDate;

    const evs = map.get(ds) || [];
    const lines = evs.slice(0, 3).map(ev => {
      const t = ev.time ? `${ev.time} ` : "";
      return `<div class="itemLine" data-date="${ds}" data-id="${ev.id}" title="${escapeHtml(t + ev.title)}">${escapeHtml(t + ev.title)}</div>`;
    }).join("");

    const more = evs.length > 3 ? `<div class="itemLine" data-date="${ds}" data-more="1">他${evs.length-3}件</div>` : "";

    parts.push(`
      <div class="calDay ${inMonth ? "" : "mutedDay"} ${isSelected ? "selected" : ""}" data-date="${ds}">
        <div class="dayNum">
          <span>${d.getDate()}</span>
          ${isToday ? `<span class="tag today">今日</span>` : ``}
        </div>
        <div class="items">${lines}${more}</div>
      </div>
    `);
  }
  parts.push(`</div>`);

  calendar.innerHTML = parts.join("");

  // クリックイベント
  calendar.querySelectorAll(".calDay").forEach(el => {
    el.addEventListener("click", (e) => {
      const date = el.dataset.date;
      if(!date) return;
      selectedDate = date;
      dateEl.value = date; // 入力も合わせる
      renderCalendar();
      openDay(date);
    });
  });

  // 予定クリック（詳細へ）
  calendar.querySelectorAll(".itemLine").forEach(el => {
    el.addEventListener("click", (e) => {
      e.stopPropagation();
      const date = el.dataset.date;
      if(date){
        selectedDate = date;
        dateEl.value = date;
        renderCalendar();
        openDay(date);
      }
    });
  });
}

function openDay(date){
  selectedDate = date;
  dayTitle.textContent = `${date} の予定`;

  const list = events
    .filter(e => e.date === date)
    .sort((a,b)=> ((a.time||"").localeCompare(b.time||"")));

  if(list.length === 0){
    dayList.innerHTML = `<p class="muted">この日の予定はまだない。</p>`;
    return;
  }

  dayList.innerHTML = list.map(ev => {
    const t = ev.time ? `<span class="muted">${escapeHtml(ev.time)}</span>` : `<span class="muted">--:--</span>`;
    const memo = ev.memo ? `<div class="eventMeta">${escapeHtml(ev.memo)}</div>` : `<div class="eventMeta muted">（メモなし）</div>`;
    return `
      <div class="eventCard">
        <div class="eventTop">
          <div>
            <div class="eventName">${escapeHtml(ev.title)}</div>
            <div class="muted" style="font-size:12px;margin-top:4px">${t}</div>
          </div>
          <div class="eventActions">
            <button class="btn smallBtn" data-edit="${ev.id}">編集</button>
            <button class="btn smallBtn danger" data-del="${ev.id}">削除</button>
          </div>
        </div>
        ${memo}
      </div>
    `;
  }).join("");

  dayList.querySelectorAll("[data-edit]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.edit;
      startEdit(id);
    });
  });
  dayList.querySelectorAll("[data-del]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.del;
      if(!confirm("この予定を削除する？")) return;
      await deleteEvent(id);
      normalizeSort();
      renderCalendar();
      openDay(selectedDate);
    });
  });
}

/* =========================
   Edit
========================= */
function startEdit(id){
  const ev = events.find(e => e.id === id);
  if(!ev) return;

  editingId = id;
  editTitle.value = ev.title || "";
  editMemo.value = ev.memo || "";
  editDate.value = ev.date || "";
  editTime.value = ev.time || "";
  editDialog.showModal();
}

btnSaveEdit.addEventListener("click", async (e) => {
  // form method=dialog なので閉じるが、保存は先に
  if(!editingId) return;

  const title = editTitle.value.trim();
  const memo = editMemo.value.trim();
  const date = editDate.value;
  const time = editTime.value;

  if(!title || !date){
    setDataError("編集：予定名と日付は必須。");
    return;
  }

  await updateEvent(editingId, { title, memo, date, time });
  editingId = null;
  normalizeSort();

  // 反映
  selectedDate = date;
  const d = toDateObj(date);
  viewYear = d.getFullYear();
  viewMonth = d.getMonth();
  dateEl.value = date;

  renderCalendar();
  openDay(date);
});

/* =========================
   Export / Delete All
========================= */
btnExport.addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(events, null, 2)], { type:"application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "events.json";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
});

btnDeleteAll.addEventListener("click", async () => {
  if(!confirm("全部消す。戻せない。OK？")) return;
  await deleteAllEvents();
  renderCalendar();
  openDay(selectedDate || ymd(new Date()));
});

/* =========================
   Fullscreen
========================= */
btnFullscreen.addEventListener("click", async () => {
  // スマホ拡大はブラウザ任せ（user-scalable=yesなのでOK）
  const target = $("calendarCard");
  if(!document.fullscreenElement){
    try{
      await target.requestFullscreen();
    }catch(e){
      // iOS Safariなどはダメなことがある
      alert("このブラウザは全画面にできない場合があります。");
    }
  }else{
    await document.exitFullscreen();
  }
});

/* =========================
   HTML escape
========================= */
function escapeHtml(str){
  return String(str)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

/* =========================
   Auth listener
========================= */
onAuthStateChanged(auth, (user) => {
  if(user){
    showLoggedIn(user);
  }else{
    showLoggedOut();
  }
});
