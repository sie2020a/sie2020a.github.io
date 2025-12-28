const box = document.getElementById("box");
const btn = document.getElementById("btn");
const result = document.getElementById("result");

// 画像ファイルが images フォルダにある前提
const fortunes = [
  { label: "大吉", img: "./images/daikichi.png" },
  { label: "中吉", img: "./images/chukichi.png" },
  { label: "小吉", img: "./images/shoukichi.png" },
  { label: "吉",   img: "./images/kichi.png" },
  { label: "末吉", img: "./images/suekichi.png" }, // ←無ければこの行を消す
  { label: "凶",   img: "./images/kyou.png" },
  { label: "大凶", img: "./images/daikyo.png" },
];

let isSpinning = false;

function pickRandomFortune() {
  const i = Math.floor(Math.random() * fortunes.length);
  return fortunes[i];
}

btn.addEventListener("click", () => {
  if (isSpinning) return;
  isSpinning = true;

  // 回転中はボタン隠す、結果文字は一旦消す
  btn.classList.add("hidden");
  result.textContent = "";

  // 箱画像に戻す
  box.src = "./images/box.png";

  // アニメ再起動（連打しても回るように）
  box.classList.remove("spin");
  void box.offsetWidth;
  box.classList.add("spin");

  const SPIN_MS = 1200;

  setTimeout(() => {
    const f = pickRandomFortune();

    result.textContent = `結果：${f.label}`;
    box.src = f.img;

    btn.textContent = "もう一度";
    btn.classList.remove("hidden");
    isSpinning = false;
  }, SPIN_MS);
});
