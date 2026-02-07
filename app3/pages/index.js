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
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { db } from "../firebase";

export default function Home() {
  const auth = getAuth();

  const entriesRef = useMemo(() => collection(db, "entries"), []);
  const [text, setText] = useState("");
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(true);

  // 未ログインならログイン画面へ強制
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) {
        window.location.href = "/app3/login/";
      } else {
        setBusy(false);
      }
    });
    return () => unsub();
  }, []);

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
    await addDoc(entriesRef, {
      text: v,
      createdAt: serverTimestamp(),
    });
    setText("");
  };

  const removeEntry = async (id) => {
    if (!confirm("削除する？")) return;
    await deleteDoc(doc(db, "entries", id));
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

  if (busy) return <div style={{ padding: 20 }}>確認中...</div>;

  return (
    <div style={{ maxWidth: 600, margin: "20px auto", fontFamily: "sans-serif" }}>
      <h1>日記</h1>

      <input
        placeholder="今日のこと"
        value={text}
        onChange={(e) => setText(e.target.value)}
        style={{ width: "100%", marginBottom: 10 }}
      />
      <button onClick={addEntry}>追加</button>

      <div style={{ marginTop: 20 }}>
        {items.map((it) => (
          <div key={it.id} style={{ border: "1px solid #ccc", padding: 10, marginBottom: 10 }}>
            <div>{it.text}</div>
            <small>{fmt(it.createdAt)}</small>
            <br />
            <button onClick={() => removeEntry(it.id)}>削除</button>
          </div>
        ))}
      </div>
    </div>
  );
}
