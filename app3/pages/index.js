import { useEffect, useMemo, useState } from "react";
import { auth, db } from "../firebase";

import {
  onAuthStateChanged,
  signInAnonymously,
  signOut,
} from "firebase/auth";

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

export default function Home() {
  const [user, setUser] = useState(null);
  const [text, setText] = useState("");
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(false);

  const entriesCol = useMemo(() => {
    if (!user?.uid) return null;
    // ユーザー別に分ける（複合インデックス不要で安定）
    return collection(db, "users", user.uid, "entries");
  }, [user?.uid]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
        return;
      }
      // 匿名ログイン（Firebase Authで Anonymous を有効化しておく）
      await signInAnonymously(auth);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!entriesCol) return;

    const q = query(entriesCol, orderBy("createdAt", "desc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        setItems(list);
      },
      (err) => {
        console.error(err);
        alert("Firestoreの読み込みで失敗しました（ルール/設定を確認）");
      }
    );

    return () => unsub();
  }, [entriesCol]);

  async function addEntry(e) {
    e.preventDefault();
    const v = text.trim();
    if (!v || !entriesCol) return;

    setBusy(true);
    try {
      await addDoc(entriesCol, {
        text: v,
        createdAt: serverTimestamp(),
      });
      setText("");
    } catch (err) {
      console.error(err);
      alert("保存に失敗しました（Firestoreルール/設定を確認）");
    } finally {
      setBusy(false);
    }
  }

  async function removeEntry(id) {
    if (!entriesCol) return;
    if (!confirm("消す？")) return;

    setBusy(true);
    try {
      await deleteDoc(doc(entriesCol, id));
    } catch (err) {
      console.error(err);
      alert("削除に失敗しました（Firestoreルール/設定を確認）");
    } finally {
      setBusy(false);
    }
  }

  async function resetUser() {
    if (!confirm("匿名ユーザーを切り替える（別ユーザー扱い）？")) return;
    await signOut(auth);
    // onAuthStateChanged が走ってまた匿名ログインされる
  }

  return (
    <div className="wrap">
      <header className="header">
        <div>
          <h1 className="title">ひとこと日記帳</h1>
          <p className="sub">
            保存先：Firestore（ユーザー別）
          </p>
        </div>

        <div className="right">
          <div className="uid">
            <span>uid:</span>
            <code>{user?.uid ? user.uid.slice(0, 10) + "..." : "..."}</code>
          </div>
          <button className="btn" onClick={resetUser} disabled={!user}>
            ユーザー切替
          </button>
        </div>
      </header>

      <main className="main">
        <form className="form" onSubmit={addEntry}>
          <input
            className="input"
            placeholder="今日のひとこと（例：運動した）"
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={120}
            disabled={!user || busy}
          />
          <button className="btn primary" type="submit" disabled={!user || busy || !text.trim()}>
            追加
          </button>
        </form>

        <section className="list">
          {items.length === 0 ? (
            <div className="empty">まだ何もない</div>
          ) : (
            items.map((it) => (
              <article key={it.id} className="card">
                <div className="cardText">{it.text}</div>
                <div className="cardFoot">
                  <span className="date">
                    {it.createdAt?.toDate
                      ? it.createdAt.toDate().toLocaleString()
                      : "今"}
                  </span>
                  <button
                    className="btn danger"
                    onClick={() => removeEntry(it.id)}
                    disabled={busy}
                  >
                    削除
                  </button>
                </div>
              </article>
            ))
          )}
        </section>
      </main>

      <footer className="footer">
        <small>app3 / Next.js + Firebase</small>
      </footer>
    </div>
  );
}
