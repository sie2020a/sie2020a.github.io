const STORAGE_USER = "sched_user_v1";
const STORAGE_ITEMS = "sched_items_v1";

const el = (id) => document.getElementById(id);

const userLabel = el("userLabel");
const userInput = el("userInput");
const loginBtn = el("loginBtn");
const logoutBtn = el("logoutBtn");

const titleInput = el("titleInput");
const noteInput = el("noteInput");
const addBtn = el("addBtn");
const clearBtn = el("clearBtn");
const msg = el("msg");

const list = el("list");
const exportBtn = el("exportBtn");
const wipeBtn = el("wipeBtn");

function nowText() {
  return new Date().toLocaleString("ja-JP");
}

function loadUser() {
  return localStorage.getItem(STORAGE_USER) || "ゲスト";
}
function saveUser(name) {
  localStorage.setItem(STORAGE_USER, name);
}
function clearUser() {
  localStorage.removeItem(STORAGE_USER);
}

function loadItems() {
  try {
    const raw = localStorage.getItem(STORAGE_ITEMS);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}
function saveItems(items) {
  localStorage.setItem(STORAGE_ITEMS, JSON.stringify(items));
}

function setMessage(text) {
  msg.textContent = text || "";
}

function render() {
  const items = loadItems();
  list.innerHTML = "";

  if (items.length === 0) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td colspan="4"><span class="badge">まだ予定がありません</span></td>`;
    list.appendChild(tr);
    return;
  }

  for (const item of items) {
    const tr = document.createElement("tr");

    const safeTitle = escapeHtml(item.title);
    const safeNote = escapeHtml(item.note || "");

    tr.innerHTML = `
      <td>${safeTitle}</td>
      <td><span class="badge">${escapeHtml(item.updatedAt)}</span></td>
      <td>${safeNote}</td>
      <td class="right">
        <div class="actionBtns">
          <button data-act="edit" data-id="${item.id}">編集</button>
          <button data-act="del" data-id="${item.id}">削除</button>
        </div>
      </td>
    `;

    list.appendChild(tr);
  }
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function initUserUI() {
  const name = loadUser();
  userLabel.textContent = name;
}

loginBtn.addEventListener("click", () => {
  const name = (userInput.value || "").trim();
  if (!name) {
    setMessage("ユーザー名を入れて。");
    return;
  }
  saveUser(name);
  initUserUI();
  setMessage(`ログインしました：${name}`);
  userInput.value = "";
});

logoutBtn.addEventListener("click", () => {
  clearUser();
  initUserUI();
  setMessage("ログアウトしました。");
});

addBtn.addEventListener("click", () => {
  const title = (titleInput.value || "").trim();
  const note = (noteInput.value || "").trim();

  if (!title) {
    setMessage("予定名が空。");
    return;
  }

  const items = loadItems();
  const newItem = {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    title,
    note,
    updatedAt: nowText(),
    user: loadUser(),
  };

  items.unshift(newItem);
  saveItems(items);

  titleInput.value = "";
  noteInput.value = "";

  setMessage("追加しました。");
  render();
});

clearBtn.addEventListener("click", () => {
  titleInput.value = "";
  noteInput.value = "";
  setMessage("入力を消しました。");
});

list.addEventListener("click", (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;

  const act = btn.dataset.act;
  const id = btn.dataset.id;
  if (!act || !id) return;

  const items = loadItems();
  const idx = items.findIndex((x) => x.id === id);
  if (idx === -1) return;

  if (act === "del") {
    const ok = confirm("消す？（戻せない）");
    if (!ok) return;
    items.splice(idx, 1);
    saveItems(items);
    setMessage("削除しました。");
    render();
    return;
  }

  if (act === "edit") {
    const current = items[idx];
    const newTitle = prompt("予定名を編集", current.title);
    if (newTitle === null) return;

    const t = newTitle.trim();
    if (!t) {
      alert("空はダメ。");
      return;
    }

    const newNote = prompt("メモを編集（空OK）", current.note || "");
    if (newNote === null) return;

    items[idx] = {
      ...current,
      title: t,
      note: newNote.trim(),
      updatedAt: nowText(),
      user: loadUser(),
    };
    saveItems(items);
    setMessage("編集しました。");
    render();
  }
});

exportBtn.addEventListener("click", () => {
  const items = loadItems();
  const blob = new Blob([JSON.stringify(items, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "schedules.json";
  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);
  setMessage("JSONをダウンロードしました。");
});

wipeBtn.addEventListener("click", () => {
  const ok = confirm("全部消す？（戻せない）");
  if (!ok) return;
  saveItems([]);
  setMessage("全削除しました。");
  render();
});

// 起動
initUserUI();
render();
