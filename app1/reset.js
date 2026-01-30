// app1/reset.js （ESM）
import {
  confirmPasswordReset,
  verifyPasswordResetCode,
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";

const $ = (id) => document.getElementById(id);

const auth = window.firebaseAuth;

const newPw = $("newPw");
const newPw2 = $("newPw2");
const resetMsg = $("resetMsg");

$("btnNewPwToggle")?.addEventListener("click", () => {
  newPw.type = newPw.type === "password" ? "text" : "password";
});
$("btnNewPw2Toggle")?.addEventListener("click", () => {
  newPw2.type = newPw2.type === "password" ? "text" : "password";
});

// URLからoobCodeを取る
const params = new URLSearchParams(location.search);
const oobCode = params.get("oobCode");

function validatePassword(pw) {
  if (!pw || pw.length < 6) return "パスワードは6文字以上必要です。";
  if (!/[a-zA-Z]/.test(pw) || !/[0-9]/.test(pw)) {
    return "英字と数字を混ぜてください（例：abc123）。";
  }
  return null;
}

async function boot() {
  resetMsg.textContent = "";

  if (!oobCode) {
    resetMsg.textContent = "再設定リンクが不正です（oobCodeがありません）。※メールのリンクから開いてください。";
    return;
  }

  try {
    // コード有効チェック（メールが古いとか失効とかもここで弾ける）
    await verifyPasswordResetCode(auth, oobCode);
  } catch (e) {
    resetMsg.textContent = `リンクが無効：${e.code || e.message}`;
  }
}

$("btnApply")?.addEventListener("click", async () => {
  resetMsg.textContent = "";

  if (!oobCode) {
    resetMsg.textContent = "再設定リンクが不正です（oobCodeがありません）。";
    return;
  }

  const pw1 = newPw.value;
  const pw2 = newPw2.value;

  const err = validatePassword(pw1);
  if (err) { resetMsg.textContent = err; return; }
  if (pw1 !== pw2) { resetMsg.textContent = "2回のパスワードが一致しません。"; return; }

  try {
    await confirmPasswordReset(auth, oobCode, pw1);
    resetMsg.style.color = "#15803d";
    resetMsg.textContent = "変更しました。3秒後にログイン画面へ戻ります。";

    setTimeout(() => {
      location.href = "./index.html";
    }, 3000);
  } catch (e) {
    resetMsg.textContent = `変更エラー：${e.code || e.message}`;
  }
});

boot();
