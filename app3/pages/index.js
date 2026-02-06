import { useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";

export default function Home() {
  const entriesRef = useMemo(() => collection(db, "entries"), []);
  const [text, setText] = useState("");
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const q = query(entriesRef, orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setItems(rows);
    });
    return () => unsub();
  }, [entriesRef]);

  const addEntry = async () => {
    const v = text.trim();
    if (!v) return;
    setBusy(true);
    try {
      await addDoc(entriesRef, {
        text: v,
        createdAt: serverTimestamp(),
      });
      setText("");
    } finally {
      setBusy(false);
    }
  };

  const removeEntry = async (id) => {
    if (!confirm("削除する？")) return;
    await deleteDoc(doc(db, "entries", id));
  };

  const onKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") addEntry();
  };

  const fmt = (ts) => {
    if (!ts?.toDate) return "";
    const d = ts.toDate();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(
      d.getMinutes()
    ).padStart(2, "0")}`;
  };

  return (
    <div className="wrap">
      <header className="header">
        <div>
          <h1 className="title">Diary</h1>
          <p className="sub">Ctrl / ⌘ + Enter で追加</p>
        </div>
        <div className="right">
          <a className="btn" href="../index.html">← 作品一覧へ</a>
        </div>
      </header>

      <main className="main">
        <div className="form">
          <input
            className="input"
            placeholder="今日あったこと…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKeyDown}
          />
          <button className="btn primary" onClick={addEntry} disabled={busy}>
            追加
          </button>
        </div>

        <div className="list">
          {items.length === 0 ? (
            <div className="empty">まだ何もない</div>
          ) : (
            items.map((it) => (
              <div className="card" key={it.id}>
                <div className="cardText">{it.text}</div>
                <div className="cardFoot">
                  <div className="date">{fmt(it.createdAt)}</div>
                  <button className="btn danger" onClick={() => removeEntry(it.id)}>
                    削除
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <footer className="footer">Firestore保存 / GitHub Pages公開</footer>
      </main>
    </div>
  );
}
