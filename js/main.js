
document.addEventListener("DOMContentLoaded",()=>{
  const path=location.pathname.split("/").pop()||"index.html";
  document.querySelectorAll(".menu a").forEach(a=>{
    if(a.getAttribute("href")===path) a.classList.add("active");
  });
  document.querySelectorAll("[data-api-url]").forEach(el=>el.value=localStorage.getItem("sandipani_api_url")||"");
});
function saveApiUrl(){
  const el=document.getElementById("apiUrl");
  if(el){ setApiUrl(el.value); alert("Google Apps Script URL saved."); }
}
function openLight(src){
  const lb=document.getElementById("lightbox"); if(!lb)return;
  document.getElementById("lightImg").src=src; lb.classList.add("show");
}
function closeLight(){ const lb=document.getElementById("lightbox"); if(lb) lb.classList.remove("show"); }
document.addEventListener("keydown",e=>{if(e.key==="Escape")closeLight();});
