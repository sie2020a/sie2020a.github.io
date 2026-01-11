// 予定調整くん（カレンダー版）
// - LocalStorageにユーザーごと保存
// - 月表示：日付＋予定名だけ（最大2件＋n）
// - 日をクリックすると、その日の詳細（メモ含む）表示
// - 全画面トグルあり

const $ = (q) => document.querySelector(q);

const loginCard = $("#loginCard");
const createCard = $("#createCard");
const calendarCard = $("#calendarCard");

const userPill = $("#userPill");
const btnLogin = $("#btnLogin");
const btnLogout = $("#btnLogout");

const inUsername = $("#username");
const inTitle = $("#title");
const inMemo = $("#memo");
const inDate = $("#date");
const inTime = $("#time");

const btnAdd = $("#btnAdd");
const btnClearInput = $("#btnClearInput");

const calTitle = $("#calTitle");
const calendarEl = $("#calendar");
const btnPrevMonth = $("#btnPrevMonth");
const btnNextMonth = $("#btnNextMonth");
const btnToday = $("#btnToday");

const dayPanel = $("#dayPanel");
const dayTitle = $("#dayTitle");
const dayList = $("#dayList");
const btnCloseDayPanel = $("#btnCloseDayPanel");

const btnExport = $("#btnExport");
const btnDeleteAll = $("#btnDeleteAll");

const btnFullscreen = $("#btnFullscreen");

const editDialog = $("#editDialog");
const editTitle = $("#editTitle");
const editMemo = $("#editMemo");
const editDate = $("#editDate");
const editTime = $("#editTime");
const btnSaveEdit = $("#btnSaveEdit");

let currentUser = null;
let selectedDate = null; // "YYYY-MM-DD"
let viewYear = new Date().getFullYear();
let viewMonth = new Date().getMonth(); // 0-11
let editingId = null;

function pad2(n){ return String(n).padStart(2, "0"); }
function toYMD(d){
  return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
}
function todayYMD(){ return toYMD(new Date()); }

function storageKey(user){
  return `yotei_kun_v2_${user}`;
}

function loadEvents(){
  if(!currentUser) return [];
  const raw = localStorage.getItem(storageKey(currentUser));
  if(!raw) return [];
  try{
    const arr = JSON.parse(raw);
    if(!Array.isArray(arr)) return [];
    return arr;
  }catch{
    return [];
  }
}

function saveEvents(events){
  localStorage.setItem(storageKey(currentUser), JSON.stringify(events));
}

function setUser(user){
  currentUser = user;
  if(user){
    userPill.textContent = user;
    loginCard.style.display = "none";
    createCard.style.display = "block";
    calendarCard.style.display = "block";
  }else{
    userPill.textContent = "未ログイン";
    loginCard.style.display = "block";
    createCard.style.display = "none";
    calendarCard.style.display = "none";
  }
  render();
}

function init(){
  // 前回ログイン復元
  const last = localStorage.getItem("yotei_kun_last_user");
  if(last){
    setUser(last);
  }else{
    setUser(null);
  }

  // 日付入力はデフォルト今日
  inDate.value = todayYMD();

  btnLogin.addEventListener("click", () => {
    const u = (inUsername.value || "").trim();
    if(!u){
      alert("ユーザー名を入れて。");
      return;
    }
    localStorage.setItem("yotei_kun_last_user", u);
    setUser(u);
  });

  btnLogout.addEventListener("click", () => {
    localStorage.removeItem("yotei_kun_last_user");
    setUser(null);
  });

  btnClearInput.addEventListener("click", () => {
    inTitle.value = "";
    inMemo.value = "";
    inDate.value = todayYMD();
    inTime.value = "";
  });

  btnAdd.addEventListener("click", () => {
    if(!currentUser){
      alert("先にログインして。");
      return;
    }
    const title = (inTitle.value || "").trim();
    const memo = (inMemo.value || "").trim();
    const date = (inDate.value || "").trim();
    const time = (inTime.value || "").trim(); // 任意

    if(!title){
      alert("予定名が空。");
      return;
    }
    if(!date){
      alert("日付が空。");
      return;
    }

    const events = loadEvents();
    const now = new Date();
    const id = crypto?.randomUUID ? crypto.randomUUID() : String(now.getTime()) + Math.random();

    events.push({
      id,
      title,
      memo,
      date,      // YYYY-MM-DD
      time,      // HH:MM or ""
      updatedAt: now.toISOString()
    });

    saveEvents(events);

    // 追加した日を選択状態に
    selectedDate = date;

    // 表示月を合わせる
    const [y,m] = date.split("-").map(Number);
    viewYear = y;
    viewMonth = m - 1;

    inTitle.value = "";
    inMemo.value = "";
    // 日付は維持（連続入力しやすく）
    // 時間は消す
    inTime.value = "";

    render();
    openDayPanel(date);
  });

  btnPrevMonth.addEventListener("click", () => {
    viewMonth--;
    if(viewMonth < 0){ viewMonth = 11; viewYear--; }
    renderCalendar();
  });

  btnNextMonth.addEventListener("click", () => {
    viewMonth++;
    if(viewMonth > 11){ viewMonth = 0; viewYear++; }
    renderCalendar();
  });

  btnToday.addEventListener("click", () => {
    const t = new Date();
    viewYear = t.getFullYear();
    viewMonth = t.getMonth();
    renderCalendar();
    openDayPanel(todayYMD());
  });

  btnCloseDayPanel.addEventListener("click", () => {
    closeDayPanel();
  });

  btnExport.addEventListener("click", () => {
    const events = loadEvents();
    const blob = new Blob([JSON.stringify(events, null, 2)], {type:"application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `yotei_${currentUser}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });

  btnDeleteAll.addEventListener("click", () => {
    if(!currentUser) return;
    const ok = confirm("本当に全削除する？（戻せない）");
    if(!ok) return;
    saveEvents([]);
    selectedDate = null;
    render();
    closeDayPanel(true);
  });

  btnFullscreen.addEventListener("click", () => {
    document.body.classList.toggle("fullscreen");
  });

  // 編集保存
  btnSaveEdit.addEventListener("click", (e) => {
    // dialogのOKで閉じるので、ここで反映だけ
    if(!editingId) return;
    const events = loadEvents();
    const idx = events.findIndex(x => x.id === editingId);
    if(idx === -1) return;

    const title = (editTitle.value || "").trim();
    const memo  = (editMemo.value || "").trim();
    const date  = (editDate.value || "").trim();
    const time  = (editTime.value || "").trim();

    if(!title){
      alert("予定名が空。");
      e.preventDefault();
      return;
    }
    if(!date){
      alert("日付が空。");
      e.preventDefault();
      return;
    }

    events[idx] = {
      ...events[idx],
      title, memo, date, time,
      updatedAt: new Date().toISOString()
    };
    saveEvents(events);

    // 表示更新
    selectedDate = date;
    const [y,m] = date.split("-").map(Number);
    viewYear = y; viewMonth = m-1;

    render();
    openDayPanel(date);
  });

  // 初期描画
  render();
}

function render(){
  if(!currentUser) return;
  renderCalendar();
  if(selectedDate){
    renderDayPanel(selectedDate);
  }else{
    // パネルは閉じておく
    renderDayPanel(null);
  }
}

function renderCalendar(){
  const events = loadEvents();

  calTitle.textContent = `${viewYear}年${viewMonth+1}月`;

  // ヘッダー（曜日）
  const week = ["日","月","火","水","木","金","土"];

  // 月の1日
  const first = new Date(viewYear, viewMonth, 1);
  const startDow = first.getDay(); // 0-6

  // 月の日数
  const lastDate = new Date(viewYear, viewMonth + 1, 0).getDate();

  // 前月の表示開始日
  const prevLast = new Date(viewYear, viewMonth, 0).getDate();

  // 6週固定（42マス）にして見た目を安定させる
  const totalCells = 42;

  // その月のイベントを日付でまとめる
  const map = new Map(); // date -> events[]
  for(const ev of events){
    if(!ev.date) continue;
    if(!map.has(ev.date)) map.set(ev.date, []);
    map.get(ev.date).push(ev);
  }
  // 時間順に並べたい
  for(const [k, arr] of map){
    arr.sort((a,b) => (a.time || "99:99").localeCompare(b.time || "99:99"));
  }

  calendarEl.innerHTML = `
    <div class="weekHeader">
      ${week.map(w => `<div>${w}</div>`).join("")}
    </div>
    <div class="grid" id="calGrid"></div>
  `;

  const grid = $("#calGrid");

  const today = todayYMD();

  for(let i=0;i<totalCells;i++){
    // i番目のマスが何日か決める
    let y = viewYear;
    let m = viewMonth;
    let d = 0;
    let inThisMonth = true;

    if(i < startDow){
      // 前月
      inThisMonth = false;
      const day = prevLast - (startDow - 1 - i);
      const prev = new Date(viewYear, viewMonth, 0); // 前月末
      y = prev.getFullYear();
      m = prev.getMonth();
      d = day;
    }else if(i >= startDow + lastDate){
      // 次月
      inThisMonth = false;
      const day = i - (startDow + lastDate) + 1;
      const next = new Date(viewYear, viewMonth + 1, 1);
      y = next.getFullYear();
      m = next.getMonth();
      d = day;
    }else{
      // 当月
      d = i - startDow + 1;
    }

    const dateObj = new Date(y, m, d);
    const ymd = toYMD(dateObj);

    const list = map.get(ymd) || [];
    const count = list.length;

    // 月表示では「日付＋予定名だけ」：最大2件
    const show = list.slice(0,2).map(ev => {
      const t = ev.title || "";
      return `<div class="itemLine">${escapeHtml(t)}</div>`;
    }).join("");

    const more = count > 2 ? `<div class="moreLine">+${count-2}</div>` : "";

    const badge = count ? `<span class="badge">${count}</span>` : "";

    const cell = document.createElement("div");
    cell.className = "cell" + (inThisMonth ? "" : " mutedDay") + (ymd === today ? " today" : "");
    cell.dataset.date = ymd;

    cell.innerHTML = `
      <div class="dateNum">
        <span>${d}</span>
        ${badge}
      </div>
      <div class="items">
        ${show}${more}
      </div>
    `;

    cell.addEventListener("click", () => {
      // 月外の日を押したら、その月へ移動してから開く
      if(!inThisMonth){
        viewYear = y;
        viewMonth = m;
        renderCalendar();
      }
      openDayPanel(ymd);
    });

    grid.appendChild(cell);
  }
}

function openDayPanel(ymd){
  selectedDate = ymd;
  renderDayPanel(ymd);

  // スマホはスライドで開く
  if(window.matchMedia("(max-width: 900px)").matches){
    dayPanel.classList.add("open");
  }
}

function closeDayPanel(force = false){
  if(window.matchMedia("(max-width: 900px)").matches){
    dayPanel.classList.remove("open");
  }
  if(force){
    dayTitle.textContent = "日付を選択";
    dayList.innerHTML = `<p class="muted">カレンダーの日付をクリックすると、その日の予定とメモが見れます。</p>`;
  }
}

function renderDayPanel(ymd){
  if(!ymd){
    dayTitle.textContent = "日付を選択";
    dayList.innerHTML = `<p class="muted">カレンダーの日付をクリックすると、その日の予定とメモが見れます。</p>`;
    return;
  }

  const events = loadEvents().filter(ev => ev.date === ymd);
  events.sort((a,b) => (a.time || "99:99").localeCompare(b.time || "99:99"));

  dayTitle.textContent = `${ymd} の予定`;

  if(events.length === 0){
    dayList.innerHTML = `<p class="muted">この日は予定なし。</p>`;
    return;
  }

  dayList.innerHTML = events.map(ev => {
    const time = ev.time ? `${ev.time}` : "（時間なし）";
    const memo = ev.memo ? escapeHtml(ev.memo) : "（メモなし）";

    return `
      <div class="dayCard" data-id="${ev.id}">
        <div class="dayCardTop">
          <div>
            <div class="dayCardTitle">${escapeHtml(ev.title)}</div>
            <div class="dayCardMeta">時間：${escapeHtml(time)}</div>
            <div class="dayCardMeta">メモ：${memo}</div>
          </div>

          <div class="actions">
            <button class="smallBtn" data-act="edit">編集</button>
            <button class="smallBtn danger" data-act="del">削除</button>
          </div>
        </div>
      </div>
    `;
  }).join("");

  // 編集/削除イベント
  dayList.querySelectorAll(".dayCard").forEach(card => {
    const id = card.dataset.id;
    card.querySelector('[data-act="edit"]').addEventListener("click", () => openEdit(id));
    card.querySelector('[data-act="del"]').addEventListener("click", () => deleteOne(id));
  });
}

function openEdit(id){
  const events = loadEvents();
  const ev = events.find(x => x.id === id);
  if(!ev) return;

  editingId = id;
  editTitle.value = ev.title || "";
  editMemo.value = ev.memo || "";
  editDate.value = ev.date || todayYMD();
  editTime.value = ev.time || "";

  editDialog.showModal();
}

function deleteOne(id){
  const ok = confirm("この予定を削除する？");
  if(!ok) return;

  const events = loadEvents().filter(x => x.id !== id);
  saveEvents(events);

  renderCalendar();
  if(selectedDate){
    renderDayPanel(selectedDate);
  }
}

function escapeHtml(s){
  return String(s)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#39;");
}

init();
