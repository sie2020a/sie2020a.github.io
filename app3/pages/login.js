import { useState } from "react";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { initializeApp } from "firebase/app";

const firebaseConfig = {
  apiKey: "AIzaSyAEmWECKWJbjQyby8jRH-RJvm2371VQxSw",
  authDomain: "diary-32180.firebaseapp.com",
  projectId: "diary-32180",
  storageBucket: "diary-32180.firebasestorage.app",
  messagingSenderId: "975066690993",
  appId: "1:975066690993:web:ad026fb50c3928089fb990",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export default function Login() {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [msg, setMsg] = useState("");

  const login = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, pass);
      window.location.href = "/app3/";
    } catch (e) {
      console.error(e);
      setMsg(e.code + " " + e.message);
    }
  };

  const signup = async () => {
    try {
      await createUserWithEmailAndPassword(auth, email, pass);
      window.location.href = "/app3/";
    } catch (e) {
      console.error(e);
      setMsg(e.code + " " + e.message);
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: "40px auto", fontFamily: "sans-serif" }}>
      <h1>ログイン</h1>

      <input
        placeholder="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{ width: "100%", marginBottom: 10 }}
      />

      <input
        placeholder="password"
        type="password"
        value={pass}
        onChange={(e) => setPass(e.target.value)}
        style={{ width: "100%", marginBottom: 10 }}
      />

      <button onClick={login} style={{ width: "100%", marginBottom: 10 }}>
        ログイン
      </button>

      <button onClick={signup} style={{ width: "100%" }}>
        新規登録
      </button>

      <div style={{ marginTop: 20, color: "red", whiteSpace: "pre-wrap" }}>{msg}</div>
    </div>
  );
}
