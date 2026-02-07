import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { auth } from "../firebase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    // すでにログイン済みなら日記へ
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) router.replace("/");
    });
    return () => unsub();
  }, [router]);

  const login = async () => {
    setMsg("");
    const e = email.trim();
    if (!e || !pass) return setMsg("メールとパスワードを入れて。");
    setBusy(true);
    try {
      await signInWithEmailAndPassword(auth, e, pass);
      router.replace("/");
    } catch (err) {
      setMsg(err?.code ? `${err.code}\n${err.message || ""}` : String(err));
    } finally {
      setBusy(false);
    }
  };

  const signup = async () => {
    setMsg("");
    const e = email.trim();
    if (!e || !pass) return setMsg("メールとパスワードを入れて。");
    if (pass.length < 6) return setMsg("パスワードは6文字以上にして。");
    setBusy(true);
    try {
      await createUserWithEmailAndPassword(auth, e, pass);
      router.replace("/");
    } catch (err) {
      setMsg(err?.code ? `${err.code}\n${err.message || ""}` : String(err));
    } finally {
      setBusy(false);
    }
  };

  const reset = async () => {
    setMsg("");
    const e = email.trim();
    if (!e) return setMsg("リセットしたいメールアドレスを入れて。");
    setBusy(true);
    try {
      await sendPasswordResetEmail(auth, e);
      setMsg("リセットメール送信OK。受信箱を見て。");
    } catch (err) {
      setMsg(err?.code ? `${err.code}\n${err.message || ""}` : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="wrap">
      <header className="header">
        <div>
          <h1 className="title">Diary</h1>
          <p className="sub">ログインして日記を開きます</p>
        </div>
      </header>

      <main className="main">
        <div className="formCol">
          <label className="label">メールアドレス</label>
          <input
            className="input"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />

          <label className="label">パスワード</label>
          <input
            className="input"
            type="password"
            autoComplete="current-password"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            placeholder="••••••••"
            onKeyDown={(e) => {
              if (e.key === "Enter") login();
            }}
          />

          <div className="row">
            <button className="btn primary" onClick={login} disabled={busy}>
              ログイン
            </button>
            <button className="btn" onClick={signup} disabled={busy}>
              新しいアカウントで登録
            </button>
          </div>

          <button className="btn" onClick={reset} disabled={busy}>
            パスワードを忘れた（リセットメール送信）
          </button>

          {msg ? <pre className="msg">{msg}</pre> : null}
        </div>
      </main>
    </div>
  );
}
