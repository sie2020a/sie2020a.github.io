import {
  verifyPasswordResetCode,
  confirmPasswordReset,
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";

const $ = (id) => document.getElementById(id);

const auth = window.firebaseAuth;

const pw1 = $("newPassword");
const pw2 = $("newPassword2");
const btn = $("btnDoReset");
const err = $("resetError");
const info = $("resetInfo");

// URLのクエリから oobCode を取る（Firebaseのメールリンクに付いてくる）
const params = new URLSearchParams(location.search);
const oobCode = params.get("oobCode");

function validatePassword(pw) {
  if (pw.length < 6) return "パスワードは6文字以上必要です。";
  // これ嫌なら消してOK
  if (!/[a-zA-Z]/.test(pw) || !/[0-9]/.test(pw)) {
    return "英字と数字を混ぜてください（例：abc123）。";
  }
  return null;
}

function mapAuthError(e) {
  const code = e?.code || "";
  switch (code) {
    case "auth/expired-action-code":
      return "リンクの期限切れです。もう一度『パスワード忘れた』からやり直して。";
    case "auth/invalid-action-code":
      return "リンクが壊れてるか、既に使われた可能性。もう一度やり直して。";
    case "auth/weak-password":
      return "パスワードが弱い（短い）です。6文字以上にして。";
    default:
      return code || (e?.message ?? "不明なエラー");
  }
}

async function init() {
  err.textContent = "";
  info.textContent = "";

  if (!oobCode) {
    err.textContent = "再設定リンクが不正です（oobCodeがありません）。";
    btn.disabled = true;
    return;
  }

  // コードが生きてるかチェック（メールアドレスを取得できる）
  try {
    const email = await verifyPasswordResetCode(auth, oobCode);
    info.textContent = `対象アカウント：${email}`;
  } catch (e) {
    err.textContent = mapAuthError(e);
    btn.disabled = true;
  }
}

btn.addEventListener("click", async () => {
  err.textContent = "";
  info.textContent = info.textContent || "";

  const a = pw1.value;
  const b = pw2.value;

  if (!a || !b) {
    err.textContent = "2回とも入力して。";
    return;
  }
  if (a !== b) {
    err.textContent = "2回のパスワードが一致してない。";
    return;
  }

  const v = validatePassword(a);
  if (v) {
    err.textContent = v;
    return;
  }

  btn.disabled = true;
  try {
    await confirmPasswordReset(auth, oobCode, a);
    info.textContent = "パスワードを変更しました。ログイン画面に戻ってログインしてください。";
    pw1.value = "";
    pw2.value = "";
  } catch (e) {
    err.textContent = mapAuthError(e);
  } finally {
    btn.disabled = false;
  }
});

init();
