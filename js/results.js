
let resultData=null;
function msg(id,text,type=""){const e=document.getElementById(id);if(e){e.className="notice "+type;e.textContent=text;}}
async function searchResult(){
  msg("resultMsg","Searching...");
  try{
    const roll=document.getElementById("rRoll").value.trim();
    const cls=document.getElementById("rClass").value;
    const medium=document.getElementById("rMedium").value;
    if(!roll||!medium) throw new Error("Roll Number and Medium are required.");
    const r=await apiCall("result",{roll,medium,class:cls});
    if(!r.result.found){document.getElementById("resultBox").innerHTML="";msg("resultMsg","Result not found. Check Roll, Class and Medium.","error");return;}
    resultData=r.result; renderResult(r.result); msg("resultMsg","Result found.","ok");
  }catch(e){msg("resultMsg",e.message,"error");}
}
function renderResult(r){
  const s=r.student, marks=r.marks||[];
  let rows=marks.map(m=>`<tr><td>${esc(m.Subject)}</td><td>${esc(m.Theory)}</td><td>${esc(m.Practical)}</td><td>${esc(m.Total)}</td></tr>`).join("");
  const total=marks.reduce((a,m)=>a+Number(m.Total||0),0);
  const max=marks.reduce((a,m)=>a+Number(m.Max||100),0);
  const pct=max?((total/max)*100).toFixed(2):"0.00";
  document.getElementById("resultBox").innerHTML=`
    <div class="form-card result-card" id="printResult">
      <div class="result-head"><div><h2 style="margin:0">${esc(s.Name)}</h2><div style="color:#9fb0c4">Govt Sandipani HSS School Damoh</div></div><span class="kicker">${esc(s.Class)} • ${esc(s.Medium)}</span></div>
      <div class="cards" style="margin-top:18px;grid-template-columns:repeat(4,1fr)">
        <div class="card"><div class="small">Roll No.</div><strong>${esc(s.Roll)}</strong></div>
        <div class="card"><div class="small">Section</div><strong>${esc(s.Section||"-")}</strong></div>
        <div class="card"><div class="small">Total</div><strong>${total}</strong></div>
        <div class="card"><div class="small">Percentage</div><strong>${pct}%</strong></div>
      </div>
      <div class="table-wrap"><table class="result-table"><thead><tr><th>Subject</th><th>Theory</th><th>Practical</th><th>Total</th></tr></thead><tbody>${rows||"<tr><td colspan='4'>No marks available.</td></tr>"}</tbody></table></div>
      <div class="btns no-print"><button class="btn primary" onclick="window.print()">🖨 Print / Save PDF</button></div>
    </div>`;
}
function esc(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));}
