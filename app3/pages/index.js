import { useEffect, useState } from "react";
import {
  collection,
  addDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp
} from "firebase/firestore";
import { db } from "../firebase";

export default function Home() {
  const [text, setText] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "diary"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      setItems(
        snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }))
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    const v = text.trim();
    if (!v) return;

    await addDoc(collection(db, "diary"), {
      text: v,
      createdAt: serverTimestamp(),
    });

    setText("");
    load();
  };

  return (
    <main style={{ padding: 20, maxWidth: 720, margin: "0 auto" }}>
      <h1 style={{ marginTop: 0 }}>ひとこと日記</h1>

      <textarea
        rows={4}
        style={{ width: "100%", padding: 10 }}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="今日のひとこと…"
      />

      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <button onClick={save}>保存</button>
        <button onClick={load} disabled={loading}>
          {loading ? "読み込み中…" : "更新"}
        </button>
      </div>

      <hr style={{ margin: "16px 0" }} />

      {items.length === 0 ? (
        <p style={{ opacity: 0.7 }}>{loading ? "読み込み中…" : "まだ日記がありません"}</p>
      ) : (
        items.map((x) => (
          <div key={x.id} style={{ padding: "10px 0", borderBottom: "1px solid #eee" }}>
            <div style={{ whiteSpace: "pre-wrap" }}>{x.text}</div>
          </div>
        ))
      )}
    </main>
  );
}
