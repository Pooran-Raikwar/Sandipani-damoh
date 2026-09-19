
let adminPin="", studentsCache=[], currentSettings=[];
function adminMsg(t,type=""){msg("adminMsg",t,type)}
async function adminLogin(){
  const p=document.getElementById("adminPin").value.trim();
  if(!p)return adminMsg("PIN required.","error");
  try{
    const r=await apiCall("verifyAdmin",{pin:p});
    if(!r.valid)return adminMsg("Invalid Admin PIN.","error");
    adminPin=p; document.getElementById("loginCard").classList.add("hidden"); document.getElementById("adminPanel").classList.remove("hidden");
    await loadStats(); await loadStudents(); await loadSettings();
    adminMsg("Admin login successful.","ok");
  }catch(e){adminMsg(e.message,"error")}
}
async function loadStats(){
  const r=await apiCall("stats",{pin:adminPin});
  document.getElementById("statStudents").textContent=r.result.students;
  document.getElementById("statMarks").textContent=r.result.marks;
}
async function loadStudents(){
  try{
    const filters={search:document.getElementById("studentSearch")?.value||""};
    const r=await apiCall("students",{pin:adminPin,filters}); studentsCache=r.result||[];
    const tbody=document.getElementById("studentRows");
    if(!tbody)return;
    tbody.innerHTML=studentsCache.map(s=>`<tr>
      <td>${esc(s.Name)}</td><td>${esc(s.Class)}</td><td>${esc(s.Section)}</td><td>${esc(s.Roll)}</td><td>${esc(s.Medium)}</td><td>${esc(s.Trade)}</td>
      <td><div class="admin-actions"><button class="mini blue" onclick="editStudent(${s._row})">Edit</button><button class="mini red" onclick="deleteStudent(${s._row})">Delete</button></div></td>
    </tr>`).join("")||"<tr><td colspan='7'>No students found.</td></tr>";
  }catch(e){adminMsg(e.message,"error")}
}
function editStudent(row){
  const s=studentsCache.find(x=>Number(x._row)===Number(row)); if(!s)return;
  const data={}; ["Name","Parent","Class","Section","Roll","Medium","Mobile","Trade","Job Role","Stream","Status"].forEach(k=>data[k]=prompt(k,s[k]??"")??s[k]??"");
  updateStudent(row,data);
}
async function updateStudent(row,data){
  try{await apiCall("updateStudent",{pin:adminPin,row,data});adminMsg("Student updated.","ok");await loadStats();await loadStudents();}catch(e){adminMsg(e.message,"error")}
}
async function deleteStudent(row){
  if(!confirm("Delete this student and linked marks?"))return;
  try{await apiCall("deleteStudent",{pin:adminPin,row});adminMsg("Student deleted and moved to Deleted Records.","ok");await loadStats();await loadStudents();}catch(e){adminMsg(e.message,"error")}
}
async function saveMarksForm(){
  try{
    const data={Class:v("mClass"),Roll:v("mRoll"),Subject:v("mSubject"),Theory:v("mTheory"),Practical:v("mPractical")};
    await apiCall("saveMarks",{pin:adminPin,data}); adminMsg("Marks saved successfully.","ok");await loadStats();
  }catch(e){adminMsg(e.message,"error")}
}
async function loadDeleted(){
  try{
    const r=await apiCall("deleted",{pin:adminPin});const body=document.getElementById("deletedRows");
    body.innerHTML=(r.result||[]).map(x=>`<tr><td>${esc(x.deletedAt)}</td><td>${esc(x.type)}</td><td><button class="mini green" onclick="restore(${x.row})">Restore</button></td></tr>`).join("")||"<tr><td colspan='3'>No deleted records.</td></tr>";
  }catch(e){adminMsg(e.message,"error")}
}
async function restore(row){
  try{await apiCall("restore",{pin:adminPin,row});adminMsg("Record restored.","ok");await loadStats();await loadStudents();await loadDeleted();}catch(e){adminMsg(e.message,"error")}
}
async function loadSettings(){
  try{
    const r=await apiCall("settings");currentSettings=r.settings||[];renderSettings();
  }catch(e){adminMsg(e.message,"error")}
}
function renderSettings(){
  const box=document.getElementById("settingsBox"); if(!box)return;
  box.innerHTML=currentSettings.map((s,i)=>`<div class="setting-row" data-i="${i}">
    <input value="${escAttr(s.field)}" class="sf">
    <select class="st"><option ${s.type==="text"?"selected":""}>text</option><option ${s.type==="dropdown"?"selected":""}>dropdown</option></select>
    <input value="${escAttr(s.options)}" class="so" placeholder="Option1|Option2">
    <select class="sr"><option ${s.required?"selected":""}>Yes</option><option ${!s.required?"selected":""}>No</option></select>
    <select class="se"><option ${s.enabled?"selected":""}>Yes</option><option ${!s.enabled?"selected":""}>No</option></select>
    <input value="${escAttr(s.onlyClasses)}" class="sc" placeholder="All or 9th|10th">
  </div>`).join("");
}
async function saveSettingsForm(){
  try{
    const arr=[...document.querySelectorAll(".setting-row")].map(r=>({
      field:r.querySelector(".sf").value,type:r.querySelector(".st").value,options:r.querySelector(".so").value,
      required:r.querySelector(".sr").value==="Yes",enabled:r.querySelector(".se").value==="Yes",onlyClasses:r.querySelector(".sc").value||"All"
    }));
    await apiCall("saveSettings",{pin:adminPin,settings:arr});adminMsg("Form settings saved.","ok");await loadSettings();
  }catch(e){adminMsg(e.message,"error")}
}
function addSetting(){currentSettings.push({field:"New Field",type:"text",options:"",required:false,enabled:true,onlyClasses:"All"});renderSettings();}
function v(id){return document.getElementById(id)?.value||""}
