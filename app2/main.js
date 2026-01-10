const btn=document.getElementById("btn");
const input=document.getElementById("input");
const result=document.getElementById("result");

btn.addEventListener("click",()=>{
  result.textContent=input.value;
});
