// app1/reset.js（ESM）
import {
  verifyPasswordResetCode,
  confirmPasswordReset,
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";

const $ = (id) => document.getElementById(id);

const auth = window.firebaseAuth;

const newPw = $("newPw");
const newPw2 = $("newPw2");
const err = $("resetError");

function validatePassword(pw) {
  if (pw.length < 6) return "パスワードは6文字以上必要です。";
  if (!/[a-zA-Z]/.test(pw) || !/[0-9]/.test(pw)) {
    return "英字と数字を混ぜてください（例：abc123）。";
  }
  return null;
}

// 👁️
$("btnNewEye")?.addEventListener("click", () => {
  newPw.type = (newPw.type === "password") ? "text" : "password";
});
$("btnNewEye2")?.addEventListener("click", () => {
  newPw2.type = (newPw2.type === "password") ? "text" : "password";
});

function getOobCode() {
  const p = new URLSearchParams(location.search);
  return p.get("oobCode");
}

async function main() {
  err.textContent = "";

  const oobCode = getOobCode();
  if (!oobCode) {
    err.textContent = "再設定リンクが不正です（oobCodeがありません）。メールのリンクから開いてください。";
    return;
  }

  // コードが有効かチェック（期限切れもここで弾ける）
  try {
    await verifyPasswordResetCode(auth, oobCode);
  } catch (e) {
    err.textContent = `リンクが無効です：${e.code || e.message}`;
  }

  $("btnDoReset")?.addEventListener("click", async () => {
    err.textContent = "";

    const pw1 = newPw.value;
    const pw2 = newPw2.value;

    const pwErr = validatePassword(pw1);
    if (pwErr) { err.textContent = pwErr; return; }
    if (pw1 !== pw2) { err.textContent = "確認用パスワードが一致しません。"; return; }

    try {
      await confirmPasswordReset(auth, oobCode, pw1);
      err.style.color = "#047857";
      err.textContent = "パスワードを変更しました。ログインページに戻ってログインしてね。";
    } catch (e) {
      err.style.color = "#b91c1c";
      err.textContent = `変更エラー：${e.code || e.message}`;
    }
  });
}

main();
