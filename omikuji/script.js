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

let isSpinning = false;

function pickRandomFortune() {
  return fortunes[Math.floor(Math.random() * fortunes.length)];
}

function spinOnce() {
  if (isSpinning) return;
  isSpinning = true;

  btn.classList.add("hidden");
  result.textContent = "";

  // いったん「おみくじ筒」に戻して回す
  box.src = "./images/omikuji.png";

  // アニメ再起動（連続クリックでも回る）
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
}

btn.addEventListener("click", spinOnce);
btn.textContent = "占う";
result.textContent = "";
