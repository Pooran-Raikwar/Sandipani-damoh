/**
 * SANDIPANI DIGITAL CAMPUS - GOOGLE SHEETS BACKEND
 * Fresh-install Apps Script backend for GitHub Pages.
 *
 * One-time setup:
 * 1) Create a new Google Apps Script project.
 * 2) Paste this file.
 * 3) Deploy as Web App: Execute as Me, Who has access: Anyone.
 * 4) Open the /exec URL once with ?api=1&action=setup and follow the returned setup info.
 * 5) Set Script Properties: ADMIN_PIN (required). Optional: SCHOOL_NAME.
 *
 * The backend automatically creates a fresh Google Spreadsheet on first setup.
 */

const PROP = PropertiesService.getScriptProperties();
const DEFAULT_PIN = '2580'; // change via Script Properties for production
const SHEETS = {
  students: 'Students',
  marks: 'Marks',
  settings: 'FormSettings',
  deleted: 'Deleted Records',
  audit: 'Audit Log'
};

const CORE_FIELDS = [
  {field:'Name', type:'text', required:true, enabled:true, onlyClasses:'All', system:true, section:'Student Information'},
  {field:'Parent', type:'text', required:true, enabled:true, onlyClasses:'All', system:true, section:'Student Information'},
  {field:'Class', type:'dropdown', options:'9th|10th|11th|12th', required:true, enabled:true, onlyClasses:'All', system:true, section:'Academic'},
  {field:'Section', type:'dropdown', options:'A|B|C|D', required:true, enabled:true, onlyClasses:'All', system:true, section:'Academic'},
  {field:'Roll', type:'text', required:true, enabled:true, onlyClasses:'All', system:true, section:'Academic'},
  {field:'Medium', type:'dropdown', options:'Hindi|English', required:true, enabled:true, onlyClasses:'All', system:true, section:'Academic'},
  {field:'Stream', type:'dropdown', options:'Science|Commerce|Arts|Vocational', required:false, enabled:true, onlyClasses:'11th|12th', system:true, section:'Academic'},
  {field:'Mobile', type:'tel', required:true, enabled:true, onlyClasses:'All', system:false, section:'Contact'},
  {field:'Trade', type:'dropdown', options:'IT-ITeS', required:false, enabled:true, onlyClasses:'All', system:true, section:'Vocational Education'},
  {field:'Job Role', type:'dropdown', options:'Domestic Data Entry Operator', required:false, enabled:true, onlyClasses:'All', system:true, section:'Vocational Education'},
  {field:'Vocational Batch', type:'text', required:false, enabled:true, onlyClasses:'All', system:false, section:'Vocational Education'},
  {field:'Aadhaar Last 4', type:'text', required:false, enabled:true, onlyClasses:'All', system:false, section:'Identity'},
  {field:'Address', type:'textarea', required:false, enabled:true, onlyClasses:'All', system:false, section:'Contact'},
  {field:'Status', type:'dropdown', options:'Active|Inactive', required:true, enabled:true, onlyClasses:'All', system:true, section:'System'}
];

const STUDENT_BASE = ['Timestamp'];
const MARK_HEADERS = ['Timestamp','Roll','Class','Subject','Theory','Practical','Max','Total','Grade','Remarks'];
const DELETED_HEADERS = ['Deleted At','Record ID','Record Type','Data JSON'];
const AUDIT_HEADERS = ['Timestamp','Action','Actor','Details'];

function prop_(key){ return PROP.getProperty(key) || ''; }
function setProp_(key,val){ PROP.setProperty(key,String(val)); }
function json_(obj,e){
  const body=JSON.stringify(obj);
  const cb=e&&e.parameter&&e.parameter.callback;
  if(cb && /^[A-Za-z_$][0-9A-Za-z_$\.]*$/.test(cb)) return ContentService.createTextOutput(cb+'('+body+');').setMimeType(ContentService.MimeType.JAVASCRIPT);
  return ContentService.createTextOutput(body).setMimeType(ContentService.MimeType.JSON);
}
function p_(e,key,def){ return e&&e.parameter&&e.parameter[key]!==undefined?e.parameter[key]:def; }
function jp_(e,key,def){ try{const v=p_(e,key,'');return v?JSON.parse(v):def;}catch(err){throw new Error('Invalid JSON parameter: '+key);} }
function ss_(){
  let id=prop_('SHEET_ID');
  if(id){ try{return SpreadsheetApp.openById(id);}catch(err){} }
  const ss=SpreadsheetApp.create(prop_('SCHOOL_NAME')||'Sandipani Digital Campus - Student Database');
  setProp_('SHEET_ID',ss.getId());
  return ss;
}
function sheet_(name){return ss_().getSheetByName(name);}
function headers_(sh){return sh.getLastColumn()?sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(String):[];}
function values_(sh){return sh.getLastRow()<2?[]:sh.getRange(2,1,sh.getLastRow()-1,sh.getLastColumn()).getValues();}
function obj_(h,r){const o={};h.forEach((k,i)=>o[k]=r[i]);return o;}
function normalize_(v){return String(v==null?'':v).trim();}
function bool_(v){return String(v).toLowerCase()==='yes'||v===true;}
function setup_(){
  const ss=ss_();
  ensureSheet_(ss,SHEETS.students,['Timestamp']);
  ensureSheet_(ss,SHEETS.marks,MARK_HEADERS);
  ensureSheet_(ss,SHEETS.settings,['Field','Type','Options','Required','Enabled','Only Classes','System','Section']);
  ensureSheet_(ss,SHEETS.deleted,DELETED_HEADERS);
  ensureSheet_(ss,SHEETS.audit,AUDIT_HEADERS);
  const fs=sheet_(SHEETS.settings);
  if(fs.getLastRow()<2){CORE_FIELDS.forEach(x=>fs.appendRow([x.field,x.type,x.options||'',x.required?'Yes':'No',x.enabled?'Yes':'No',x.onlyClasses||'All',x.system?'Yes':'No',x.section||'General']));}
  syncStudentColumns_();
  return ss;
}
function ensureSheet_(ss,name,headers){
  let sh=ss.getSheetByName(name); if(!sh) sh=ss.insertSheet(name);
  const cur=headers_(sh); if(!cur.length){sh.getRange(1,1,1,headers.length).setValues([headers]);}
  else headers.forEach(h=>{if(cur.indexOf(h)<0)sh.getRange(1,sh.getLastColumn()+1).setValue(h);});
  sh.setFrozenRows(1);
  return sh;
}
function settings_(){
  setup_();
  return values_(sheet_(SHEETS.settings)).map(r=>({field:String(r[0]),type:String(r[1]||'text'),options:String(r[2]||''),required:bool_(r[3]),enabled:!String(r[4]).toLowerCase().includes('no'),onlyClasses:String(r[5]||'All'),system:bool_(r[6]),section:String(r[7]||'General')}));
}
function syncStudentColumns_(){
  const sh=sheet_(SHEETS.students), current=headers_(sh), wanted=['Timestamp'];
  settings_unsafe_().forEach(x=>{if(x.enabled||x.system)wanted.push(x.field);});
  wanted.forEach(h=>{if(current.indexOf(h)<0)sh.getRange(1,sh.getLastColumn()+1).setValue(h);});
}
function settings_unsafe_(){
  const fs=sheet_(SHEETS.settings); if(!fs||fs.getLastRow()<2)return CORE_FIELDS;
  return values_(fs).map(r=>({field:String(r[0]),type:String(r[1]||'text'),options:String(r[2]||''),required:bool_(r[3]),enabled:!String(r[4]).toLowerCase().includes('no'),onlyClasses:String(r[5]||'All'),system:bool_(r[6]),section:String(r[7]||'General')}));
}
function adminPin_(){return prop_('ADMIN_PIN')||DEFAULT_PIN;}
function verify_(pin){return normalize_(pin)===adminPin_();}
function audit_(action,details){sheet_(SHEETS.audit).appendRow([new Date(),action,'Admin',details||'']);}
function classAllowed_(only,cls){const s=normalize_(only||'All');return s==='All'||s.split('|').map(normalize_).indexOf(normalize_(cls))>=0;}
function validateStudent_(data,editingRow){
  const defs=settings_(); const cls=normalize_(data.Class),roll=normalize_(data.Roll),medium=normalize_(data.Medium);
  if(!cls||!roll||!medium||!normalize_(data.Name))throw new Error('Name, Class, Roll and Medium are required.');
  defs.filter(x=>x.enabled).forEach(x=>{if(x.required&&classAllowed_(x.onlyClasses,cls)&&!normalize_(data[x.field]))throw new Error(x.field+' is required for '+cls+'.');});
  const sh=sheet_(SHEETS.students),h=headers_(sh),rs=values_(sh),ci={Class:h.indexOf('Class'),Roll:h.indexOf('Roll'),Medium:h.indexOf('Medium')};
  const dup=rs.some((r,i)=>{const row=i+2;if(editingRow&&row===Number(editingRow))return false;return normalize_(r[ci.Class])===cls&&normalize_(r[ci.Roll])===roll&&normalize_(r[ci.Medium]).toLowerCase()===medium.toLowerCase();});
  if(dup)throw new Error('Duplicate student: same Class + Roll + Medium already exists.');
}
function registerStudent(data){setup_();data=data||{};validateStudent_(data);const sh=sheet_(SHEETS.students),h=headers_(sh);const row=h.map(k=>k==='Timestamp'?new Date():(data[k]!==undefined?data[k]:''));sh.appendRow(row);return {ok:true,id:sh.getLastRow()-1};}
function getStudents(pin,filters){if(!verify_(pin))throw new Error('Invalid Admin PIN');setup_();const sh=sheet_(SHEETS.students),h=headers_(sh);let out=values_(sh).map((r,i)=>Object.assign(obj_(h,r),{_row:i+2,_id:i+1}));filters=filters||{};out=out.filter(x=>['Class','Section','Medium','Trade','Job Role','Stream','Status'].every(k=>!filters[k]||filters[k]==='All'||normalize_(x[k])===normalize_(filters[k]))&&(!filters.search||Object.values(x).some(v=>normalize_(v).toLowerCase().includes(normalize_(filters.search).toLowerCase()))));return out;}
function updateStudent(pin,rowNo,data){if(!verify_(pin))throw new Error('Invalid Admin PIN');setup_();const sh=sheet_(SHEETS.students),h=headers_(sh),row=Number(rowNo);if(row<2||row>sh.getLastRow())throw new Error('Invalid student row.');validateStudent_(data,row);const old=sh.getRange(row,1,1,sh.getLastColumn()).getValues()[0];sh.getRange(row,1,1,sh.getLastColumn()).setValues([h.map((k,i)=>k==='Timestamp'?old[i]:(data[k]!==undefined?data[k]:old[i]))]);audit_('UPDATE_STUDENT','Row '+row);return true;}
function deleteStudent(pin,rowNo){if(!verify_(pin))throw new Error('Invalid Admin PIN');setup_();const st=sheet_(SHEETS.students),row=Number(rowNo);if(row<2||row>st.getLastRow())throw new Error('Invalid student row.');const h=headers_(st),data=obj_(h,st.getRange(row,1,1,st.getLastColumn()).getValues()[0]);const id=Utilities.getUuid();sheet_(SHEETS.deleted).appendRow([new Date(),id,'Student',JSON.stringify(data)]);const mh=headers_(sheet_(SHEETS.marks)),all=values_(sheet_(SHEETS.marks));const ciR=mh.indexOf('Roll'),ciC=mh.indexOf('Class');for(let i=all.length-1;i>=0;i--){if(normalize_(all[i][ciR])===normalize_(data.Roll)&&normalize_(all[i][ciC])===normalize_(data.Class)){sheet_(SHEETS.deleted).appendRow([new Date(),Utilities.getUuid(),'Marks',JSON.stringify(obj_(mh,all[i]))]);sheet_(SHEETS.marks).deleteRow(i+2);}}st.deleteRow(row);audit_('DELETE_STUDENT',String(data.Name||''));return true;}
function getDeleted(pin){if(!verify_(pin))throw new Error('Invalid Admin PIN');setup_();const sh=sheet_(SHEETS.deleted),h=headers_(sh);return values_(sh).map((r,i)=>({row:i+2,deletedAt:r[0],recordId:r[1],type:r[2],data:r[3]}));}
function restoreDeleted(pin,rowNo){if(!verify_(pin))throw new Error('Invalid Admin PIN');const sh=sheet_(SHEETS.deleted),row=Number(rowNo);if(row<2||row>sh.getLastRow())throw new Error('Invalid deleted record.');const r=sh.getRange(row,1,1,4).getValues()[0],type=String(r[2]),data=JSON.parse(r[3]);if(type==='Student'){validateStudent_(data);const st=sheet_(SHEETS.students),h=headers_(st);st.appendRow(h.map(k=>k==='Timestamp'&&data[k]===undefined?new Date():(data[k]!==undefined?data[k]:'')));}else if(type==='Marks'){const mk=sheet_(SHEETS.marks),h=headers_(mk);mk.appendRow(h.map(k=>data[k]!==undefined?data[k]:''));}sh.deleteRow(row);audit_('RESTORE',type);return true;}
function saveMarks(pin,data){if(!verify_(pin))throw new Error('Invalid Admin PIN');setup_();data=data||{};const cls=normalize_(data.Class),roll=normalize_(data.Roll),subject=normalize_(data.Subject);if(!cls||!roll||!subject)throw new Error('Class, Roll and Subject are required.');const theory=Number(data.Theory||0),practical=Number(data.Practical||0),max=Number(data.Max||100);if(theory<0||practical<0||theory+practical>max)throw new Error('Marks exceed maximum.');const total=theory+practical;const pct=max?total/max*100:0;const grade=pct>=90?'A+':pct>=80?'A':pct>=70?'B+':pct>=60?'B':pct>=50?'C':pct>=33?'D':'F';const sh=sheet_(SHEETS.marks),h=headers_(sh),rs=values_(sh);let found=-1;rs.forEach((r,i)=>{if(normalize_(r[h.indexOf('Roll')])===roll&&normalize_(r[h.indexOf('Class')])===cls&&normalize_(r[h.indexOf('Subject')])===subject)found=i+2;});const o={Timestamp:new Date(),Roll:roll,Class:cls,Subject:subject,Theory:theory,Practical:practical,Max:max,Total:total,Grade:grade,Remarks:data.Remarks||''};const arr=h.map(k=>o[k]!==undefined?o[k]:'');if(found>0)sh.getRange(found,1,1,h.length).setValues([arr]);else sh.appendRow(arr);audit_('SAVE_MARKS',cls+' / '+roll+' / '+subject);return true;}
function getResult(roll,medium,cls){setup_();const st=sheet_(SHEETS.students),h=headers_(st),rs=values_(st);const r=rs.find(x=>normalize_(x[h.indexOf('Roll')])===normalize_(roll)&&normalize_(x[h.indexOf('Medium')]).toLowerCase()===normalize_(medium).toLowerCase()&&(!cls||normalize_(x[h.indexOf('Class')])===normalize_(cls)));if(!r)return {found:false};const student=obj_(h,r),mk=sheet_(SHEETS.marks),mh=headers_(mk);const marks=values_(mk).filter(x=>normalize_(x[mh.indexOf('Roll')])===normalize_(roll)&&normalize_(x[mh.indexOf('Class')])===normalize_(student.Class)).map(x=>obj_(mh,x));const total=marks.reduce((a,x)=>a+Number(x.Total||0),0),max=marks.reduce((a,x)=>a+Number(x.Max||0),0);return {found:true,student,marks,summary:{subjects:marks.length,total,max,percentage:max?Math.round(total/max*10000)/100:0}};}
function getStats(pin){if(!verify_(pin))throw new Error('Invalid Admin PIN');setup_();return {students:Math.max(0,sheet_(SHEETS.students).getLastRow()-1),marks:Math.max(0,sheet_(SHEETS.marks).getLastRow()-1),deleted:Math.max(0,sheet_(SHEETS.deleted).getLastRow()-1),fields:settings_().filter(x=>x.enabled).length};}
function getSettings(){return settings_();}
function saveSettings(pin,settings){if(!verify_(pin))throw new Error('Invalid Admin PIN');setup_();if(!Array.isArray(settings))throw new Error('Settings must be an array.');const coreNames=CORE_FIELDS.filter(x=>x.system).map(x=>x.field);const clean=settings.filter(x=>normalize_(x.field)).map(x=>({field:normalize_(x.field),type:x.type||'text',options:x.options||'',required:!!x.required,enabled:x.enabled!==false,onlyClasses:x.onlyClasses||'All',system:coreNames.indexOf(normalize_(x.field))>=0||!!x.system,section:x.section||'Custom'}));const names=new Set();clean.forEach(x=>{if(names.has(x.field))throw new Error('Duplicate field: '+x.field);names.add(x.field);if(x.field==='Timestamp')throw new Error('Timestamp is reserved.');});const fs=sheet_(SHEETS.settings);fs.clearContents();fs.getRange(1,1,1,8).setValues([['Field','Type','Options','Required','Enabled','Only Classes','System','Section']]);clean.forEach(x=>fs.appendRow([x.field,x.type,x.options,x.required?'Yes':'No',x.enabled?'Yes':'No',x.onlyClasses,x.system?'Yes':'No',x.section]));syncStudentColumns_();audit_('SAVE_FORM_SETTINGS',clean.length+' fields');return clean;}
function setupInfo(){setup_();return {sheetId:ss_().getId(),sheetUrl:ss_().getUrl(),adminPinSet:!!prop_('ADMIN_PIN'),schoolName:prop_('SCHOOL_NAME')||'Sandipani Digital Campus',message:'Fresh Google Sheet is ready.'};}
function verifyAdmin(pin){return verify_(pin);}
function api_(e){try{const a=String(p_(e,'action',''));switch(a){case'setup':return json_({success:true,data:setupInfo()},e);case'settings':return json_({success:true,data:getSettings()},e);case'register':return json_({success:true,data:registerStudent(jp_(e,'data',{}))},e);case'result':return json_({success:true,data:getResult(p_(e,'roll',''),p_(e,'medium',''),p_(e,'class',''))},e);case'verifyAdmin':return json_({success:true,data:{valid:verifyAdmin(p_(e,'pin',''))}},e);case'stats':return json_({success:true,data:getStats(p_(e,'pin',''))},e);case'students':return json_({success:true,data:getStudents(p_(e,'pin',''),jp_(e,'filters',{}))},e);case'updateStudent':return json_({success:true,data:updateStudent(p_(e,'pin',''),p_(e,'row',''),jp_(e,'data',{}))},e);case'deleteStudent':return json_({success:true,data:deleteStudent(p_(e,'pin',''),p_(e,'row',''))},e);case'deleted':return json_({success:true,data:getDeleted(p_(e,'pin',''))},e);case'restore':return json_({success:true,data:restoreDeleted(p_(e,'pin',''),p_(e,'row',''))},e);case'saveMarks':return json_({success:true,data:saveMarks(p_(e,'pin',''),jp_(e,'data',{}))},e);case'saveSettings':return json_({success:true,data:saveSettings(p_(e,'pin',''),jp_(e,'settings',[]))},e);default:return json_({success:false,error:'Unknown API action: '+a},e);}}catch(err){return json_({success:false,error:String(err&&err.message||err)},e);}}
function doGet(e){if(e&&e.parameter&&e.parameter.api==='1')return api_(e);return ContentService.createTextOutput('Sandipani backend is running.');}
