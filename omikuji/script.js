const box = document.getElementById("box");
const btn = document.getElementById("btn");
const result = document.getElementById("result");

// 画像ファイルがある前提（imagesフォルダ）
const fortunes = [
  { label: "大吉", img: "./images/daikichi.png" },
  { label: "中吉", img: "./images/chukichi.png" },
  { label: "小吉", img: "./images/shokichi.png" },
  { label: "吉",   img: "./images/kichi.png" },
  { label: "末吉", img: "./images/suekichi.png" },
  { label: "凶",   img: "./images/kyo.png" },
  { label: "大凶", img: "./images/daikyo.png" },
];

let firstTime = true;
let isSpinning = false;

function pickRandomFortune() {
  const i = Math.floor(Math.random() * fortunes.length);
  return fortunes[i];
}

function setResultText(text) {
  result.textContent = text;
}

function setBoxImage(src) {
  box.src = src;
}

function spinOnce() {
  // 連打防止
  if (isSpinning) return;
  isSpinning = true;

  // 回転中はボタンを隠す
  btn.classList.add("hidden");

  // 結果文字を一旦消す
  setResultText("");

  // 箱画像に戻す（結果画像が出ててもリセット）
  setBoxImage("./images/box.png");

  // アニメ再起動のため class を付け直し
  box.classList.remove("spin");
  // reflow（これがないと連続で押した時アニメが出ないことがある）
  void box.offsetWidth;
  box.classList.add("spin");

  // アニメが終わるタイミングで結果表示
  const SPIN_MS = 1200;

  setTimeout(() => {
    const f = pickRandomFortune();

    setResultText(`結果：${f.label}`);
    // 結果の画像に差し替え
    setBoxImage(f.img);

    // ボタンを戻す
    btn.classList.remove("hidden");
    btn.textContent = "もう一度";

    firstTime = false;
    isSpinning = false;
  }, SPIN_MS);
}

btn.addEventListener("click", spinOnce);

// 最初は案内だけ
setResultText("");
btn.textContent = "占う";

