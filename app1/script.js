/***********************
 * 予定調整くん（LocalStorage版）
 * - ユーザー名で切り替え
 * - 予定：日付＋時間＋タイトル＋メモ
 * - 月カレンダー：日付＋予定名だけ表示（最大3件＋more）
 * - 日付クリックで詳細（メモ表示）
 * - 編集/削除
 * - JSONエクスポート/全削除
 * - カレンダー全画面（ピンチズームOK）
 ************************/

const LS_USER_KEY = "yotei_user";
const LS_EVENTS_PREFIX = "yotei_events_"; // + username

// ===== DOM =====
const el = (id) => document.getElementById(id);

const loginCard = el("loginCard");
const createCard = el("createCard");
const usernameInput = el("username");
const btnLogin = el("btnLogin");
const btnLogout = el("btnLogout");
const userPill = el("userPill");

const titleInput = el("title");
const memoInput = el("memo");
const dateInput = el("date");
const timeInput = el("time");
const btnAdd = el("btnAdd");
const btnClearInput = el("btnClearInput");

const calTitle = el("calTitle");
const btnPrevMonth = el("btnPrevMonth");
const btnNextMonth = el("btnNextMonth");
const btnToday = el("btnToday");
const calendar = el("calendar");

const dayTitle = el("dayTitle");
const dayList = el("dayList");
const btnCloseDayPanel = el("btnCloseDayPanel");

const btnExport = el("btnExport");
const btnDeleteAll = el("btnDeleteAll");

const btnFullscreen = el("btnFullscreen");
const calLayout = el("calLayout");

const editDialog = el("editDialog");
const editForm = el("editForm");
const editTitle = el("editTitle");
const editMemo = el("editMemo");
const editDate = el("editDate");
const editTime = el("editTime");
const btnSaveEdit = el("btnSaveEdit");

// ===== State =====
let currentUser = null;
let currentMonth = new Date();
currentMonth.setDate(1);

let selectedDateKey = null; // "YYYY-MM-DD"
let editingId = null;

// ===== Utils =====
function pad2(n){ return String(n).padStart(2, "0"); }

function ymd(d){
  const y = d.getFullYear();
  const m = pad2(d.getMonth()+1);
  const day = pad2(d.getDate());
  return `${y}-${m}-${day}`;
}

function ymTitle(d){
  return `${d.getFullYear()}年${d.getMonth()+1}月`;
}

function readUser(){
  return localStorage.getItem(LS_USER_KEY);
}

function saveUser(name){
  localStorage.setItem(LS_USER_KEY, name);
}

function clearUser(){
  localStorage.removeItem(LS_USER_KEY);
}

function eventsKey(){
  return LS_EVENTS_PREFIX + currentUser;
}

function loadEvents(){
  if (!currentUser) return [];
  try{
    const raw = localStorage.getItem(eventsKey());
    if(!raw) return [];
    const arr = JSON.parse(raw);
    if(!Array.isArray(arr)) return [];
    return arr;
  }catch(e){
    console.error("loadEvents error", e);
    return [];
  }
}

function saveEvents(arr){
  if(!currentUser) return;
  localStorage.setItem(eventsKey(), JSON.stringify(arr));
}

function uid(){
  return "e_" + Math.random().toString(36).slice(2,10) + "_" + Date.now().toString(36);
}

function groupByDate(events){
  const map = {};
  for(const e of events){
    if(!map[e.date]) map[e.date] = [];
    map[e.date].push(e);
  }
  // 時間順（空は最後）
  for(const k of Object.keys(map)){
    map[k].sort((a,b)=>{
      const ta = a.time || "99:99";
      const tb = b.time || "99:99";
      return ta.localeCompare(tb);
    });
  }
  return map;
}

function fmtDateKey(key){
  // "YYYY-MM-DD" -> "YYYY年M月D日"
  const [y,m,d] = key.split("-").map(Number);
  return `${y}年${m}月${d}日`;
}

function escapeHtml(s){
  return String(s)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

// ===== UI Control =====
function setLoggedInUI(on){
  loginCard.style.display = on ? "none" : "block";
  createCard.style.display = on ? "block" : "none";
  btnLogout.disabled = !on;
  btnFullscreen.disabled = !on;
  btnExport.disabled = !on;
  btnDeleteAll.disabled = !on;
  btnPrevMonth.disabled = !on;
  btnNextMonth.disabled = !on;
  btnToday.disabled = !on;
}

function updateUserPill(){
  userPill.textContent = currentUser ? currentUser : "未ログイン";
}

function clearInputs(){
  titleInput.value = "";
  memoInput.value = "";
  dateInput.value = "";
  timeInput.value = "";
}

function pickDefaultDate(){
  // 今日をデフォルトに入れる（使いやすい）
  const today = new Date();
  dateInput.value = ymd(today);
}

// ===== Calendar Render =====
function renderCalendar(){
  // 途中で死んでもカレンダーを真っ白にしないためのtry
  try{
    const events = loadEvents();
    const byDate = groupByDate(events);

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

    // blank
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
      if (selectedDateKey === key) cell.classList.add("selected");

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
        renderCalendar();        // 選択枠更新
        renderDayPanel(key);     // 右側詳細更新
      });

      calendar.appendChild(cell);
    }

    // 右側：未選択ならメッセージ
    if(!selectedDateKey){
      dayTitle.textContent = "日付を選択";
      dayList.innerHTML = `<p class="muted">カレンダーの日付をクリックすると、その日の予定とメモが見れます。</p>`;
    }else{
      // 選択月を変えた時に、選択日が月外なら解除
      const [y,m] = selectedDateKey.split("-").map(Number);
      if(y !== currentMonth.getFullYear() || (m-1) !== currentMonth.getMonth()){
        selectedDateKey = null;
        dayTitle.textContent = "日付を選択";
        dayList.innerHTML = `<p class="muted">カレンダーの日付をクリックすると、その日の予定とメモが見れます。</p>`;
      }else{
        renderDayPanel(selectedDateKey);
      }
    }
  }catch(e){
    console.error("renderCalendar error", e);
    // 最低限の表示を残す
    calendar.innerHTML = `<div class="muted">カレンダー描画でエラーが出ました。console を確認してください。</div>`;
  }
}

function renderDayPanel(dateKey){
  const events = loadEvents();
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
    bEdit.addEventListener("click", ()=> openEdit(e.id));

    const bDel = document.createElement("button");
    bDel.className = "btn danger";
    bDel.textContent = "削除";
    bDel.addEventListener("click", ()=> deleteOne(e.id));

    btns.appendChild(bEdit);
    btns.appendChild(bDel);

    item.appendChild(top);
    item.appendChild(memo);
    item.appendChild(btns);

    dayList.appendChild(item);
  }
}

// ===== CRUD =====
function addEvent(){
  if(!currentUser){
    alert("ログインしてください");
    return;
  }
  const title = titleInput.value.trim();
  const memo = memoInput.value.trim();
  const date = dateInput.value;
  const time = timeInput.value;

  if(!date){
    alert("日付は必須です");
    return;
  }
  if(!title){
    alert("予定名を入れてください");
    return;
  }

  const events = loadEvents();
  events.push({
    id: uid(),
    title,
    memo,
    date,
    time,
    updatedAt: new Date().toISOString()
  });
  saveEvents(events);

  // 追加した日を選択状態にして見せる
  selectedDateKey = date;

  // 追加後は入力を少し残してもいいが、今回はクリアする
  clearInputs();
  pickDefaultDate();

  // 追加した月へジャンプ
  const [y,m] = date.split("-").map(Number);
  currentMonth = new Date(y, m-1, 1);

  renderCalendar();
}

function deleteOne(id){
  if(!confirm("この予定を削除します。いい？")) return;
  const events = loadEvents().filter(e => e.id !== id);
  saveEvents(events);
  renderCalendar();
}

function openEdit(id){
  const events = loadEvents();
  const e = events.find(x => x.id === id);
  if(!e) return;

  editingId = id;
  editTitle.value = e.title || "";
  editMemo.value = e.memo || "";
  editDate.value = e.date || "";
  editTime.value = e.time || "";

  editDialog.showModal();
}

function saveEdit(){
  if(!editingId) return;

  const title = editTitle.value.trim();
  const memo  = editMemo.value.trim();
  const date  = editDate.value;
  const time  = editTime.value;

  if(!date){
    alert("日付は必須です");
    return;
  }
  if(!title){
    alert("予定名を入れてください");
    return;
  }

  const events = loadEvents();
  const idx = events.findIndex(x => x.id === editingId);
  if(idx < 0) return;

  events[idx] = {
    ...events[idx],
    title, memo, date, time,
    updatedAt: new Date().toISOString()
  };
  saveEvents(events);

  selectedDateKey = date;

  const [y,m] = date.split("-").map(Number);
  currentMonth = new Date(y, m-1, 1);

  renderCalendar();
}

// ===== Export / DeleteAll =====
function exportJson(){
  const events = loadEvents();
  const blob = new Blob([JSON.stringify(events, null, 2)], {type:"application/json"});
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `yotei_${currentUser || "user"}_${ymd(new Date())}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);
}

function deleteAll(){
  if(!currentUser) return;
  if(!confirm("全部消します。本当にいい？")) return;
  saveEvents([]);
  selectedDateKey = null;
  renderCalendar();
}

// ===== Auth (simple) =====
function login(){
  const name = usernameInput.value.trim();
  if(!name){
    alert("ユーザー名を入力してね");
    return;
  }
  currentUser = name;
  saveUser(name);

  updateUserPill();
  setLoggedInUI(true);

  pickDefaultDate();

  // 予定がある月を維持したいが、基本は今月
  currentMonth = new Date();
  currentMonth.setDate(1);

  selectedDateKey = null;
  renderCalendar();
}

function logout(){
  currentUser = null;
  clearUser();
  selectedDateKey = null;

  updateUserPill();
  setLoggedInUI(false);

  // ログアウト時はカレンダーを空の枠だけに戻す
  calendar.innerHTML = "";
  calTitle.textContent = "----";
  dayTitle.textContent = "日付を選択";
  dayList.innerHTML = `<p class="muted">ログインすると予定が表示されます。</p>`;
}

// ===== Calendar Nav =====
function prevMonth(){
  currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth()-1, 1);
  selectedDateKey = null;
  renderCalendar();
}
function nextMonth(){
  currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth()+1, 1);
  selectedDateKey = null;
  renderCalendar();
}
function goToday(){
  currentMonth = new Date();
  currentMonth.setDate(1);
  selectedDateKey = ymd(new Date());
  renderCalendar();
  renderDayPanel(selectedDateKey);
}

// ===== Fullscreen Calendar =====
let isFullscreen = false;
function toggleFullscreen(){
  if(!currentUser) return;

  if(!isFullscreen){
    calLayout.classList.add("fullscreenCal");
    isFullscreen = true;
  }else{
    calLayout.classList.remove("fullscreenCal");
    isFullscreen = false;
  }
}

// ===== Events =====
document.addEventListener("DOMContentLoaded", ()=>{
  // 初期：ログイン状態復元
  const u = readUser();
  if(u){
    currentUser = u;
    updateUserPill();
    setLoggedInUI(true);
    pickDefaultDate();
    currentMonth = new Date();
    currentMonth.setDate(1);
    renderCalendar();
  }else{
    currentUser = null;
    updateUserPill();
    setLoggedInUI(false);
    dayList.innerHTML = `<p class="muted">ログインすると予定が表示されます。</p>`;
  }

  btnLogin.addEventListener("click", login);
  btnLogout.addEventListener("click", logout);

  btnAdd.addEventListener("click", addEvent);
  btnClearInput.addEventListener("click", ()=>{
    clearInputs();
    pickDefaultDate();
  });

  btnPrevMonth.addEventListener("click", prevMonth);
  btnNextMonth.addEventListener("click", nextMonth);
  btnToday.addEventListener("click", goToday);

  btnCloseDayPanel.addEventListener("click", ()=>{
    selectedDateKey = null;
    renderCalendar();
  });

  btnExport.addEventListener("click", exportJson);
  btnDeleteAll.addEventListener("click", deleteAll);

  btnFullscreen.addEventListener("click", toggleFullscreen);

  // 編集保存
  editForm.addEventListener("submit", (e)=>{
    // dialog+formのsubmitが走るので止める
    e.preventDefault();
  });

  btnSaveEdit.addEventListener("click", ()=>{
    // dialogは method=dialog なので閉じる前に保存する
    saveEdit();
    editingId = null;
    // 閉じる
    editDialog.close();
  });
});
