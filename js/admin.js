let adminPin="",isLoggedIn=false,studentsCache=[],settingsCache=[];

function $(id){return document.getElementById(id);}
function msgAdmin(m,t="info"){const e=$("adminMessage")||$("message");if(e){e.textContent=m;e.className="message "+t;}}
function setShow(id,show){const e=$(id);if(!e)return;e.classList.toggle("hidden",!show);e.style.display=show?"":"none";}
function apiData(r){return r&&r.data!==undefined?r.data:r;}

async function adminLogin(){
 const input=$("adminPin"),btn=$("loginButton"),pin=(input?.value||"").trim();
 if(!pin){msgAdmin("PIN required.","error");return;}
 if(btn){btn.disabled=true;btn.textContent="Checking...";}
 try{
  const r=await apiCall("verifyAdmin",{pin});
  console.log("verifyAdmin:",r);
  const d=apiData(r);
  const valid=d?.valid===true||d?.success===true||d===true;
  if(!valid){msgAdmin("❌ Invalid Admin PIN.","error");input?.focus();return;}
  adminPin=pin;isLoggedIn=true;
  setShow("loginCard",false);setShow("adminPanel",true);
  msgAdmin("✅ Admin login successful.","ok");
  try{await Promise.all([loadStats(),loadStudents(),loadSettings()]);}
  catch(e){console.error(e);msgAdmin("Login successful. Dashboard data load error: "+(e.message||e),"error");}
 }catch(e){console.error(e);msgAdmin(e.message||"Admin login failed.","error");}
 finally{if(btn){btn.disabled=false;btn.textContent="🔓 Login";}}
}
function lockAdmin(){isLoggedIn=false;adminPin="";setShow("loginCard",true);setShow("adminPanel",false);if($("adminPin"))$("adminPin").value="";}
function unlockAdmin(){isLoggedIn=true;setShow("loginCard",false);setShow("adminPanel",true);}
function adminLogout(){lockAdmin();}

async function loadStats(){
 if(!isLoggedIn)return;
 const d=apiData(await apiCall("getStats",{pin:adminPin}))||{};
 if($("statStudents"))$("statStudents").textContent=d.students??0;
 if($("statMarks"))$("statMarks").textContent=d.marks??0;
 if($("statDeleted"))$("statDeleted").textContent=d.deleted??0;
}
async function loadStudents(){
 if(!isLoggedIn)return;
 const filters={Class:$("studentClassFilter")?.value||"",Section:$("studentSectionFilter")?.value||"",Medium:$("studentMediumFilter")?.value||"",Trade:$("studentTradeFilter")?.value||"","Job Role":$("studentJobFilter")?.value||"",search:$("studentSearch")?.value||""};
 const d=apiData(await apiCall("getStudents",{pin:adminPin,filters}));
 studentsCache=Array.isArray(d)?d:[];fillFilterOptions();renderStudents();
}
function fillFilterOptions(){
 [["studentClassFilter","Class"],["studentSectionFilter","Section"],["studentMediumFilter","Medium"],["studentTradeFilter","Trade"],["studentJobFilter","Job Role"]].forEach(([id,f])=>{
  const e=$(id);if(!e)return;const old=e.value;
  const vals=[...new Set(studentsCache.map(x=>String(x?.[f]??"").trim()).filter(Boolean))].sort();
  e.innerHTML='<option value="">All</option>'+vals.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join("");
  if(vals.includes(old))e.value=old;
 });
}
function renderStudents(){
 const b=$("studentsTableBody")||$("studentTableBody")||$("studentsBody");if(!b)return;b.innerHTML="";
 if(!studentsCache.length){b.innerHTML='<tr><td colspan="20">No students found.</td></tr>';return;}
 studentsCache.forEach((s,i)=>{const tr=document.createElement("tr");tr.innerHTML=`
 <td><input type="checkbox" class="student-check" data-row="${esc(s._row)}"></td><td>${i+1}</td>
 <td>${esc(s.Name)}</td><td>${esc(s.Parent)}</td><td>${esc(s.Class)}</td><td>${esc(s.Section)}</td>
 <td>${esc(s.Roll)}</td><td>${esc(s.Medium)}</td><td>${esc(s.Mobile)}</td><td>${esc(s.Trade)}</td>
 <td>${esc(s["Job Role"])}</td><td>${esc(s.Stream)}</td><td>${esc(s["Skipped Subject"])}</td>
 <td>${esc(s["Additional Subject"])}</td><td>${esc(s.Status)}</td>
 <td><button onclick="editStudent(${Number(s._row)})">✏️</button><button onclick="deleteStudent(${Number(s._row)})">🗑️</button></td>`;
 b.appendChild(tr);});
}
function applyStudentFilters(){loadStudents();}
function clearStudentFilters(){["studentClassFilter","studentSectionFilter","studentMediumFilter","studentTradeFilter","studentJobFilter","studentSearch"].forEach(id=>{if($(id))$(id).value="";});loadStudents();}
function selectAllStudents(){document.querySelectorAll(".student-check").forEach(x=>x.checked=true);}
function clearStudentSelection(){document.querySelectorAll(".student-check").forEach(x=>x.checked=false);}

async function editStudent(rowNo){
 const s=studentsCache.find(x=>Number(x._row)===Number(rowNo));if(!s)return;
 const data={Name:prompt("Student Name",s.Name||""),Parent:prompt("Parent Name",s.Parent||""),Class:prompt("Class",s.Class||""),Section:prompt("Section",s.Section||""),Roll:prompt("Roll",s.Roll||""),Medium:prompt("Medium",s.Medium||""),Mobile:prompt("Mobile",s.Mobile||""),Trade:prompt("Trade",s.Trade||"IT-ITeS"),"Job Role":prompt("Job Role",s["Job Role"]||""),Stream:prompt("Stream",s.Stream||""),"Skipped Subject":prompt("Skipped Subject",s["Skipped Subject"]||"None"),"Additional Subject":prompt("Additional Subject",s["Additional Subject"]||""),Status:s.Status||"Active"};
 if(Object.values(data).some(v=>v===null))return;
 try{await apiCall("updateStudent",{pin:adminPin,rowNo,data});msgAdmin("✅ Student updated.","ok");await loadStudents();await loadStats();}catch(e){msgAdmin(e.message,"error");}
}
async function deleteStudent(rowNo){
 const s=studentsCache.find(x=>Number(x._row)===Number(rowNo));if(!s||!confirm(`"${s.Name}" को delete करना है?`))return;
 try{await apiCall("deleteStudent",{pin:adminPin,rowNo});msgAdmin("✅ Student deleted.","ok");await loadStudents();await loadStats();}catch(e){msgAdmin(e.message,"error");}
}
async function loadSettings(){if(!isLoggedIn)return;const d=apiData(await apiCall("getSettings",{pin:adminPin}));settingsCache=Array.isArray(d)?d:[];}
function addSetting(){const f=prompt("Field name");if(!f)return;const o=prompt("Options | separated");if(o===null)return;settingsCache.push({Field:f,Type:"dropdown",Options:o,Required:"No",Active:"Yes","Only Classes":"All"});}
async function saveSettingsForm(){try{await apiCall("saveSettings",{pin:adminPin,settings:settingsCache});msgAdmin("✅ Settings saved.","ok");}catch(e){msgAdmin(e.message,"error");}}
async function loadDeleted(){if(!isLoggedIn)return;const d=apiData(await apiCall("getDeleted",{pin:adminPin}));const b=$("deletedTableBody")||$("deletedBody");if(!b)return;b.innerHTML=(Array.isArray(d)?d:[]).map((x,i)=>`<tr><td>${i+1}</td><td>${esc(x.Name)}</td><td>${esc(x.Class)}</td><td>${esc(x.Roll)}</td></tr>`).join("");}
async function saveMarksForm(){const data={};document.querySelectorAll("#marksForm [data-field],#marksForm [name]").forEach(e=>{const k=e.dataset.field||e.name;if(k)data[k]=e.value;});try{await apiCall("saveMarks",{pin:adminPin,data});msgAdmin("✅ Marks saved.","ok");await loadStats();}catch(e){msgAdmin(e.message,"error");}}
function showTab(n){document.querySelectorAll("[data-admin-tab]").forEach(e=>e.classList.toggle("active",e.dataset.adminTab===n));document.querySelectorAll("[data-admin-panel]").forEach(e=>e.classList.toggle("hidden",e.dataset.adminPanel!==n));if(n==="deleted")loadDeleted();}
function switchTab(n){showTab(n);}
function saveApiUrl(){const e=$("apiUrl");if(!e)return;setApiUrl(e.value.trim());msgAdmin("API URL saved. Page reload करें.","ok");}
function loadSavedApiUrl(){const e=$("apiUrl");if(e)e.value=localStorage.getItem("sandipani_api_url")||"";}
function esc(v){return String(v??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;");}
document.addEventListener("DOMContentLoaded",()=>{lockAdmin();loadSavedApiUrl();$("adminPin")?.addEventListener("keydown",e=>{if(e.key==="Enter")adminLogin();});});
