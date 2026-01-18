// ✅ Firebase v9+（CDN / ESM）
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

import {
  getFirestore,
  collection,
  doc,
  addDoc,
  setDoc,
  getDocs,
  deleteDoc,
  writeBatch,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

/* =========================
  🔥ここを差し替え（FirebaseのWeb設定）
========================= */
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: ".....",
  appId: "....."
};

// init
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// DOM
const el = (id) => document.getElementById(id);

const authCard = el("authCard");
const appCard = el("appCard");
const userPill = el("userPill");
const btnLogout = el("btnLogout");

const emailInput = el("email");
const passInput = el("password");
const btnSignIn = el("btnSignIn");
const btnSignUp = el("btnSignUp");
const authMsg = el("authMsg");

// calendar DOM
const calTitle = el("calTitle");
const btnPrevMonth = el("btnPrevMonth");
const btnNextMonth = el("btnNextMonth");
const btnToday = el("btnToday");
const btnFullscreen = el("btnFullscreen");
const calLayout = el("calLayout");
const calendar = el("calendar");

const dayTitle = el("dayTitle");
const dayList = el("dayList");
const btnCloseDayPanel = el("btnCloseDayPanel");

const titleInput = el("title");
const timeInput = el("time");
const memoInput = el("memo");
const btnAdd = el("btnAdd");
const btnClearInput = el("btnClearInput");

const btnExport = el("btnExport");
const btnDeleteAll = el("btnDeleteAll");

const editDialog = el("editDialog");
const editTitle = el("editTitle");
const editTime = el("editTime");
const editMemo = el("editMemo");
const btnSaveEdit = el("btnSaveEdit");

// State
let currentUser = null;         // firebase user
let events = [];                // current user's events
let currentMonth = new Date();  // first day of month
currentMonth.setDate(1);
let selectedDateKey = null;
let editingId = null;

function pad2(n){ return String(n).padStart(2, "0"); }
function ymd(d){
  return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
}
function ymTitle(d){ return `${d.getFullYear()}年${d.getMonth()+1}月`; }
function fmtDateKey(key){
  const [y,m,dd] = key.split("-").map(Number);
  return `${y}年${m}月${dd}日`;
}
function uid(){ return Math.random().toString(36).slice(2) + Date.now().toString(36); }

// Firestore path: users/{uid}/events/{eventId}
function eventsCol(){
  return collection(db, "users", currentUser.uid, "events");
}

function groupByDate(list){
  const map = {};
  for(const e of list){
    if(!map[e.date]) map[e.date] = [];
    map[e.date].push(e);
  }
  for(const k of Object.keys(map)){
    map[k].sort((a,b)=>{
      const ta = a.time || "99:99";
      const tb = b.time || "99:99";
      return ta.localeCompare(tb);
    });
  }
  return map;
}

/* =========================
  UI 切り替え
========================= */
function showAuth(){
  authCard.style.display = "block";
  appCard.style.display = "none";
  btnLogout.style.display = "none";
  userPill.textContent = "未ログイン";
}
function showApp(){
  authCard.style.display = "none";
  appCard.style.display = "block";
  btnLogout.style.display = "inline-block";
  userPill.textContent = currentUser.email;
}

/* =========================
  Auth
========================= */
async function signUp(){
  authMsg.textContent = "";
  const email = emailInput.value.trim();
  const pass = passInput.value.trim();
  if(!email || !pass){
    authMsg.textContent = "メールとパスワードを入力して。";
    return;
  }
  try{
    await createUserWithEmailAndPassword(auth, email, pass);
    authMsg.textContent = "アカウント作成OK。ログインされました。";
  }catch(e){
    authMsg.textContent = `作成エラー：${e.code}`;
  }
}

async function signIn(){
  authMsg.textContent = "";
  const email = emailInput.value.trim();
  const pass = passInput.value.trim();
  if(!email || !pass){
    authMsg.textContent = "メールとパスワードを入力して。";
    return;
  }
  try{
    await signInWithEmailAndPassword(auth, email, pass);
  }catch(e){
    authMsg.textContent = `ログインエラー：${e.code}`;
  }
}

async function logout(){
  await signOut(auth);
}

/* =========================
  Firestore CRUD
========================= */
async function loadEvents(){
  // 日付順にしたいなら orderBy(date) だが dateが文字列で問題ない
  const q = query(eventsCol(), orderBy("date", "asc"));
  const snap = await getDocs(q);
  const arr = [];
  snap.forEach(d => arr.push({ id: d.id, ...d.data() }));
  events = arr;
}

async function addEventToSelectedDate(){
  if(!selectedDateKey){
    alert("カレンダーで日付を選んでから追加して。");
    return;
  }
  const title = titleInput.value.trim();
  const time = timeInput.value;
  const memo = memoInput.value.trim();

  if(!title){
    alert("予定名は必須。");
    return;
  }

  await addDoc(eventsCol(), {
    title, memo, time,
    date: selectedDateKey,
    updatedAt: new Date().toISOString()
  });

  titleInput.value = "";
  timeInput.value = "";
  memoInput.value = "";

  await loadEvents();
  renderCalendar();
  renderDayPanel(selectedDateKey);
}

async function deleteOne(id){
  if(!confirm("この予定を削除する？")) return;
  await deleteDoc(doc(db, "users", currentUser.uid, "events", id));
  await loadEvents();
  renderCalendar();
  renderDayPanel(selectedDateKey);
}

async function openEdit(id){
  const e = events.find(x=>x.id===id);
  if(!e) return;
  editingId = id;
  editTitle.value = e.title || "";
  editTime.value = e.time || "";
  editMemo.value = e.memo || "";
  editDialog.showModal();
}

async function saveEdit(){
  if(!editingId) return;
  const e = events.find(x=>x.id===editingId);
  if(!e) return;

  const title = editTitle.value.trim();
  const time = editTime.value;
  const memo = editMemo.value.trim();
  if(!title){
    alert("予定名は必須。");
    return;
  }

  await setDoc(doc(db, "users", currentUser.uid, "events", editingId), {
    ...e,
    title, time, memo,
    updatedAt: new Date().toISOString()
  });

  editingId = null;
  editDialog.close();

  await loadEvents();
  renderCalendar();
  renderDayPanel(selectedDateKey);
}

async function deleteAll(){
  if(!confirm("全部消す。本当にいい？")) return;
  const batch = writeBatch(db);
  const snap = await getDocs(eventsCol());
  snap.forEach(d => batch.delete(d.ref));
  await batch.commit();

  selectedDateKey = null;
  await loadEvents();
  renderCalendar();
  dayTitle.textContent = "日付を選択";
  dayList.innerHTML = `<p class="muted">カレンダーの日付をクリックすると、その日の予定が見れます。</p>`;
}

/* =========================
  Calendar
========================= */
function renderCalendar(){
  calTitle.textContent = ymTitle(currentMonth);
  calendar.innerHTML = "";

  const dow = ["日","月","火","水","木","金","土"];
  for(const w of dow){
    const elw = document.createElement("div");
    elw.className = "calDow";
    elw.textContent = w;
    calendar.appendChild(elw);
  }

  const first = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const last  = new Date(currentMonth.getFullYear(), currentMonth.getMonth()+1, 0);

  const byDate = groupByDate(events);

  for(let i=0;i<first.getDay();i++){
    const blank = document.createElement("div");
    blank.className = "calCell blank";
    calendar.appendChild(blank);
  }

  for(let day=1; day<=last.getDate(); day++){
    const d = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    const key = ymd(d);

    const cell = document.createElement("div");
    cell.className = "calCell";
    if(selectedDateKey === key) cell.classList.add("selected");

    const num = document.createElement("div");
    num.className = "calNum";
    num.textContent = day;

    const list = document.createElement("div");
    list.className = "calEvents";

    const evts = byDate[key] || [];
    const show = evts.slice(0,3);
    for(const e of show){
      const pill = document.createElement("div");
      pill.className = "calEvt";
      pill.textContent = e.title || "(無題)";
      list.appendChild(pill);
    }
    if(evts.length > 3){
      const more = document.createElement("div");
      more.className = "calMore";
      more.textContent = `+${evts.length - 3}`;
      list.appendChild(more);
    }

    cell.appendChild(num);
    cell.appendChild(list);

    cell.addEventListener("click", ()=>{
      selectedDateKey = key;
      renderCalendar();
      renderDayPanel(key);
    });

    calendar.appendChild(cell);
  }

  if(!selectedDateKey){
    dayTitle.textContent = "日付を選択";
    dayList.innerHTML = `<p class="muted">カレンダーの日付をクリックすると、その日の予定が見れます。</p>`;
  }
}

function renderDayPanel(dateKey){
  const byDate = groupByDate(events);
  const evts = byDate[dateKey] || [];
  dayTitle.textContent = fmtDateKey(dateKey);

  if(evts.length === 0){
    dayList.innerHTML = `<p class="muted">この日の予定はありません。</p>`;
    return;
  }

  dayList.innerHTML = "";
  for(const e of evts){
    const item = document.createElement("div");
    item.className = "dayItem";

    const top = document.createElement("div");
    top.className = "dayItemTop";

    const t = document.createElement("div");
    t.className = "dayItemTitle";
    t.textContent = e.title || "(無題)";

    const badge = document.createElement("div");
    badge.className = "badgeTime";
    badge.textContent = e.time ? e.time : "時刻なし";

    top.appendChild(t);
    top.appendChild(badge);

    const memo = document.createElement("div");
    memo.className = "dayItemMemo";
    memo.textContent = e.memo ? e.memo : "（メモなし）";

    const btns = document.createElement("div");
    btns.className = "dayItemBtns";

    const bEdit = document.createElement("button");
    bEdit.className = "btn";
    bEdit.textContent = "編集";
    bEdit.addEventListener("click", ()=>openEdit(e.id));

    const bDel = document.createElement("button");
    bDel.className = "btn danger";
    bDel.textContent = "削除";
    bDel.addEventListener("click", ()=>deleteOne(e.id));

    btns.appendChild(bEdit);
    btns.appendChild(bDel);

    item.appendChild(top);
    item.appendChild(memo);
    item.appendChild(btns);
    dayList.appendChild(item);
  }
}

// month nav
function prevMonth(){
  currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth()-1, 1);
  renderCalendar();
}
function nextMonth(){
  currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth()+1, 1);
  renderCalendar();
}
function goToday(){
  currentMonth = new Date();
  currentMonth.setDate(1);
  selectedDateKey = ymd(new Date());
  renderCalendar();
  renderDayPanel(selectedDateKey);
}

// fullscreen
let isFullscreen = false;
function toggleFullscreen(){
  if(!isFullscreen){
    calLayout.classList.add("fullscreenCal");
    isFullscreen = true;
  }else{
    calLayout.classList.remove("fullscreenCal");
    isFullscreen = false;
  }
}

// export
function exportJson(){
  const blob = new Blob([JSON.stringify(events, null, 2)], {type:"application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `yotei_${currentUser.email}_${ymd(new Date())}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/* =========================
  Boot
========================= */
btnSignUp.addEventListener("click", signUp);
btnSignIn.addEventListener("click", signIn);
btnLogout.addEventListener("click", logout);

btnPrevMonth.addEventListener("click", prevMonth);
btnNextMonth.addEventListener("click", nextMonth);
btnToday.addEventListener("click", goToday);
btnFullscreen.addEventListener("click", toggleFullscreen);

btnCloseDayPanel.addEventListener("click", ()=>{
  selectedDateKey = null;
  renderCalendar();
});

btnAdd.addEventListener("click", addEventToSelectedDate);
btnClearInput.addEventListener("click", ()=>{
  titleInput.value = "";
  timeInput.value = "";
  memoInput.value = "";
});

btnExport.addEventListener("click", exportJson);
btnDeleteAll.addEventListener("click", deleteAll);

btnSaveEdit.addEventListener("click", saveEdit);

onAuthStateChanged(auth, async (user)=>{
  if(!user){
    currentUser = null;
    events = [];
    selectedDateKey = null;
    showAuth();
    return;
  }

  currentUser = user;
  showApp();

  // 予定ロード → カレンダー表示
  await loadEvents();
  currentMonth = new Date(); currentMonth.setDate(1);
  selectedDateKey = ymd(new Date());
  renderCalendar();
  renderDayPanel(selectedDateKey);
});
