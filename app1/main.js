const btn = document.getElementById("btn");
const input = document.getElementById("inputText");
const output = document.getElementById("output");

btn.addEventListener("click", () => {
  const text = input.value.trim();

  if (text === "") {
    output.textContent = "何か入力してね";
    return;
  }

  output.textContent = "入力された文字：" + text;
});
