const box = document.getElementById("box");
const btn = document.getElementById("btn");
const result = document.getElementById("result");

// 画像ファイルがある前提（imagesフォルダ）
// ※いま無い画像は「とりあえず box.png を出す」ようにしてある
const fortunes = [
  { label: "大吉", img: "./images/daikichi.png" },
  { label: "中吉", img: "./images/chukichi.png" },
  { label: "小吉", img: "./images/shokichi.png" },
  { label: "吉",   img: "./images/kichi.png" },
  { label: "末吉", img: "./images/suekichi.png" },
  { label: "凶",   img: "./images/kyo.png" },
  { label: "大凶", img: "./images/daikyo.png" },
];

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

// 画像が無い場合は「おみくじ箱」に戻す（altが回る事故を防ぐ）
box.addEventListener("error", () => {
  box.src = "./images/box.png";
});

function spinOnce() {
  if (isSpinning) return;
  isSpinning = true;

  btn.classList.add("hidden");
  setResultText("");

  // まず箱に戻す
  setBoxImage("./images/box.png");

  // アニメ再起動
  box.classList.remove("spin");
  void box.offsetWidth;
  box.classList.add("spin");

  const SPIN_MS = 1200;

  setTimeout(() => {
    const f = pickRandomFortune();

    setResultText(`結果：${f.label}`);
    setBoxImage(f.img); // 画像が無ければ error で box.png に戻る

    btn.classList.remove("hidden");
    btn.textContent = "もう一度";
    isSpinning = false;
  }, SPIN_MS);
}

btn.addEventListener("click", spinOnce);

// 初期表示
setResultText("");
btn.textContent = "占う";
