const box = document.getElementById("box");
const btn = document.getElementById("btn");
const result = document.getElementById("result");

const fortunes = [
  { label: "大吉", img: "./images/daikichi.png" },
  { label: "中吉", img: "./images/chukichi.png" },
  { label: "小吉", img: "./images/shoukichi.png" },
  { label: "吉",   img: "./images/kichi.png" },
  { label: "凶",   img: "./images/kyou.png" },
  { label: "大凶", img: "./images/daikyo.png" },
];

const BOX_IMG = "./images/omikuji.png";
const SPIN_MS = 1200;
let isSpinning = false;

function pickRandomFortune(){
  return fortunes[Math.floor(Math.random() * fortunes.length)];
}

btn.addEventListener("click", () => {
  if (isSpinning) return;
  isSpinning = true;

  // 回転中はボタンを隠す
  btn.classList.add("hidden");
  result.textContent = "";

  // まず箱に戻す
  box.src = BOX_IMG;

  // アニメを確実に発火させる（連打対策）
  box.classList.remove("spin");
  void box.offsetWidth;
  box.classList.add("spin");

  setTimeout(() => {
    const f = pickRandomFortune();
    result.textContent = `結果：${f.label}`;
    box.src = f.img;

    btn.textContent = "もう一度";
    btn.classList.remove("hidden");
    isSpinning = false;
  }, SPIN_MS);
});
