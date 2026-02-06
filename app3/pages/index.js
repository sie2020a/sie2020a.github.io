// app3/pages/index.js
import { useEffect, useState } from "react";
import { collection, addDoc, getDocs, orderBy, query, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

export default function Home() {
  const [text, setText] = useState("");
  const [entries, setEntries] = useState([]);

  // 日記一覧を取得
  useEffect(() => {
    const load = async () => {
      const q = query(collection(db, "diary"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      setEntries(
        snap.docs.map(d => ({
          id: d.id,
          ...d.data(),
        }))
      );
    };
    load();
  }, []);

  // 保存
  const saveDiary = async () => {
    if (!text.trim()) return;
    await addDoc(collection(db, "diary"), {
      text,
      createdAt: serverTimestamp(),
    });
    setText("");
    location.reload();
  };

  return (
    <div className="wrap">
      <div className="header">
        <div>
          <h1 className="title">日記</h1>
          <div className="sub">Firebase + Next.js</div>
        </div>
      </div>

      <div className="main">
        <textarea
          rows={6}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="今日の出来事を書く"
          style={{ width: "100%", padding: "12px", borderRadius: "8px" }}
        />
        <button
          onClick={saveDiary}
          style={{
            marginTop: "10px",
            padding: "10px 16px",
            borderRadius: "8px",
            background: "var(--btn)",
            color: "#fff",
            border: "none",
          }}
        >
          保存
        </button>

        <hr style={{ margin: "20px 0" }} />

        {entries.map(e => (
          <div key={e.id} style={{ marginBottom: "14px", padding: "12px", background: "var(--panel)", borderRadius: "8px" }}>
            <div style={{ fontSize: "12px", color: "var(--muted)" }}>
              {e.createdAt?.toDate?.().toLocaleString() || ""}
            </div>
            <div style={{ marginTop: "6px", whiteSpace: "pre-wrap" }}>
              {e.text}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
