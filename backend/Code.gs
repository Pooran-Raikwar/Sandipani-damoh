/**
 * SANDIPANI VOCATIONAL STUDENT RECORD MANAGEMENT - GOOGLE SHEETS BACKEND
 * GitHub Pages frontend + Google Apps Script + Google Sheets storage.
 *
 * Deploy as Web App: Execute as Me / Who has access: Anyone.
 * Set Script Property ADMIN_PIN for production (default is 2580).
 */
const PROP = PropertiesService.getScriptProperties();
const DEFAULT_PIN = '2580';
const SHEETS = { students:'Students', marks:'Marks', settings:'FormSettings', config:'AppConfig', deleted:'Deleted Records', audit:'Audit Log', gallery:'Gallery' };
const STUDENT_HEADERS = [
  'Timestamp','Academic Year','Class','Section','Roll Number','Student Name',"Father's Name",'Medium','Gender','Mobile Number','Samagra ID',
  'Trade','Job Role','Stream','IT Subject Opted in Place of This Language','Additional Subject','Status'
];
const CONFIG_DEFAULTS = {
  academicYears:['2025-26','2026-27','2027-28'],
  sections:['A','B','C','D'],
  additionalSubjects:['None','Hindi','English','Mathematics','Biology','Completely Skipped Hindi','Completely Skipped English'],
  itReplacement:['None','Sanskrit','Hindi','English','Hindi & English']
};
const CORE_FIELDS = [
  {field:'Academic Year',type:'dropdown',options:'2025-26|2026-27|2027-28',required:true,enabled:true,onlyClasses:'All',system:true,section:'Student Information'},
  {field:'Class',type:'dropdown',options:'9th|10th|11th|12th',required:true,enabled:true,onlyClasses:'All',system:true,section:'Student Information'},
  {field:'Section',type:'dropdown',options:'A|B|C|D',required:true,enabled:true,onlyClasses:'All',system:true,section:'Student Information'},
  {field:'Roll Number',type:'text',options:'',required:false,enabled:true,onlyClasses:'All',system:true,section:'Student Information'},
  {field:'Student Name',type:'text',required:true,enabled:true,onlyClasses:'All',system:true,section:'Student Information'},
  {field:"Father's Name",type:'text',required:true,enabled:true,onlyClasses:'All',system:true,section:'Student Information'},
  {field:'Medium',type:'dropdown',options:'Hindi|English',required:true,enabled:true,onlyClasses:'All',system:true,section:'Student Information'},
  {field:'Gender',type:'dropdown',options:'Male|Female|Other',required:true,enabled:true,onlyClasses:'All',system:true,section:'Student Information'},
  {field:'Mobile Number',type:'tel',required:true,enabled:true,onlyClasses:'All',system:true,section:'Student Information'},
  {field:'Samagra ID',type:'text',required:true,enabled:true,onlyClasses:'All',system:true,section:'Student Information'},
  {field:'Trade',type:'dropdown',options:'IT-ITeS',required:true,enabled:true,onlyClasses:'All',system:true,section:'Vocational Information'},
  {field:'Job Role',type:'text',options:'Domestic Data Entry Operator|Web Developer',required:true,enabled:true,onlyClasses:'All',system:true,section:'Vocational Information'},
  {field:'Stream',type:'dropdown',options:'Mathematics|Biology|Arts|Commerce',required:true,enabled:true,onlyClasses:'11th|12th',system:true,section:'Vocational Information'},
  {field:'IT Subject Opted in Place of This Language',type:'dropdown',options:'None|Sanskrit|Hindi|English|Hindi & English',required:true,enabled:true,onlyClasses:'All',system:true,section:'Subject Information'},
  {field:'Additional Subject',type:'dropdown',options:'None|Hindi|English|Mathematics|Biology|Completely Skipped Hindi|Completely Skipped English',required:true,enabled:true,onlyClasses:'All',system:true,section:'Additional Subject'}
];
const MARK_HEADERS=['Timestamp','Student Row','Subject','Theory','Practical','Max','Total','Grade','Remarks'];
const DELETED_HEADERS=['Deleted At','Record ID','Record Type','Data JSON'];
const AUDIT_HEADERS=['Timestamp','Action','Actor','Details'];

// -------------------- GALLERY --------------------
const GALLERY_HEADERS=['ID','Uploaded At','Section','Title','File Name','File ID','Image URL'];
const GALLERY_SECTIONS=['Guest Lectures Photos','Industrial Visit Photos','Class Room Teaching','Student Activities'];

function prop_(k){return PROP.getProperty(k)||'';}
function setProp_(k,v){PROP.setProperty(k,String(v));}
function norm_(v){return String(v==null?'':v).trim();}
function bool_(v){return v===true||String(v).toLowerCase()==='yes'||String(v).toLowerCase()==='true';}
function json_(obj){return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);}
function body_(e){try{return JSON.parse((e&&e.postData&&e.postData.contents)||'{}');}catch(err){return {};}}
function sheet_(name){return ss_().getSheetByName(name);}
function ss_(){
  let id=prop_('SHEET_ID');
  if(id){try{return SpreadsheetApp.openById(id);}catch(e){}}
  const ss=SpreadsheetApp.create(prop_('SCHOOL_NAME')||'Sandipani Vocational Student Records');
  setProp_('SHEET_ID',ss.getId()); return ss;
}
function headers_(sh){return sh.getLastColumn()?sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(String):[];}
function values_(sh){return sh.getLastRow()<2?[]:sh.getRange(2,1,sh.getLastRow()-1,sh.getLastColumn()).getValues();}
function obj_(h,r){const o={};h.forEach((k,i)=>o[k]=r[i]===undefined?'':r[i]);return o;}
function ensureSheet_(name,headers){const ss=ss_();let sh=ss.getSheetByName(name);if(!sh)sh=ss.insertSheet(name);const cur=headers_(sh);if(!cur.length)sh.getRange(1,1,1,headers.length).setValues([headers]);else headers.forEach(h=>{if(cur.indexOf(h)<0)sh.getRange(1,sh.getLastColumn()+1).setValue(h);});sh.setFrozenRows(1);return sh;}

function setup_(){
  ensureSheet_(SHEETS.students,STUDENT_HEADERS);
  ensureSheet_(SHEETS.marks,MARK_HEADERS);
  ensureSheet_(SHEETS.settings,['Field','Type','Options','Required','Enabled','Only Classes','System','Section']);
  ensureSheet_(SHEETS.config,['Key','Value']);
  ensureSheet_(SHEETS.deleted,DELETED_HEADERS); ensureSheet_(SHEETS.audit,AUDIT_HEADERS);
  ensureSheet_(SHEETS.gallery,GALLERY_HEADERS);

  const fs=sheet_(SHEETS.settings);
  const last=fs.getLastRow();
  if(last>=2){
    const rows=fs.getRange(2,1,last-1,fs.getLastColumn()).getValues();
    let preferredSeen=false;
    for(let i=rows.length-1;i>=0;i--){
      const name=norm_(rows[i][0]);
      if(name==='IT Subject in Place of This Language'){
        if(!preferredSeen){ fs.getRange(i+2,1).setValue('IT Subject Opted in Place of This Language'); preferredSeen=true; }
        else fs.deleteRow(i+2);
      }
    }
  }
  const now=values_(fs).map(r=>norm_(r[0]));
  CORE_FIELDS.forEach(f=>{if(now.indexOf(f.field)<0)fs.appendRow([f.field,f.type,f.options||'',f.required?'Yes':'No',f.enabled?'Yes':'No',f.onlyClasses||'All',f.system?'Yes':'No',f.section||'General']);});
  const cfg=sheet_(SHEETS.config); if(cfg.getLastRow()<2){Object.keys(CONFIG_DEFAULTS).forEach(k=>cfg.appendRow([k,CONFIG_DEFAULTS[k].join('|')]));}
  return ss_();
}

function adminPin_(){return prop_('ADMIN_PIN')||DEFAULT_PIN;}
function verify_(pin){return norm_(pin)===adminPin_();}
function audit_(action,details){sheet_(SHEETS.audit).appendRow([new Date(),action,'Admin',details||'']);}
function classAllowed_(only,cls){const s=norm_(only||'All');return s==='All'||s.split('|').map(norm_).indexOf(norm_(cls))>=0;}
function settings_(){setup_();return values_(sheet_(SHEETS.settings)).map(r=>({field:norm_(r[0]),type:norm_(r[1])||'text',options:norm_(r[2]),required:bool_(r[3]),enabled:String(r[4]).toLowerCase()!=='no',onlyClasses:norm_(r[5])||'All',system:bool_(r[6]),section:norm_(r[7])||'General'}));}
function config_(){setup_();const out={};values_(sheet_(SHEETS.config)).forEach(r=>out[norm_(r[0])]=norm_(r[1]).split('|').filter(Boolean));return Object.assign({},CONFIG_DEFAULTS,out);}
function saveConfig_(pin,cfg){if(!verify_(pin))throw new Error('Invalid Admin PIN');setup_();const clean={academicYears:cfg.academicYears||[],sections:cfg.sections||[],additionalSubjects:cfg.additionalSubjects||CONFIG_DEFAULTS.additionalSubjects,itReplacement:cfg.itReplacement||CONFIG_DEFAULTS.itReplacement};const sh=sheet_(SHEETS.config);sh.clearContents();sh.getRange(1,1,1,2).setValues([['Key','Value']]);Object.keys(clean).forEach(k=>sh.appendRow([k,clean[k].map(norm_).filter(Boolean).join('|')]));audit_('SAVE_CONFIG','Academic years/sections/options updated');return clean;}
function validateStudent_(d,editingRow){
  d=d||{}; const required=['Academic Year','Class','Section','Student Name',"Father's Name",'Medium','Gender','Mobile Number','Samagra ID','Trade','Job Role','IT Subject Opted in Place of This Language','Additional Subject'];
  required.forEach(k=>{if(!norm_(d[k]))throw new Error(k+' is required.');});
  const cls=norm_(d.Class);
  settings_().filter(f=>f.enabled && !f.system && f.required && classAllowed_(f.onlyClasses,cls)).forEach(f=>{if(!norm_(d[f.field]))throw new Error(f.field+' is required.');}); if(['9th','10th','11th','12th'].indexOf(cls)<0)throw new Error('Invalid class.');
  if(['9th','10th','11th','12th'].indexOf(cls)>=2 && !norm_(d.Stream))throw new Error('Stream is required for '+cls+'.');
  if(['9th','10th'].indexOf(cls)>=0)d.Stream='';
  if(norm_(d.Trade)!=='IT-ITeS')throw new Error('Trade is fixed to IT-ITeS.');
  const expected=['9th','10th'].indexOf(cls)>=0?'Domestic Data Entry Operator':'Web Developer'; if(norm_(d['Job Role'])!==expected)throw new Error('Invalid Job Role for '+cls+'.');
  if(!/^[6-9]\d{9}$/.test(norm_(d['Mobile Number'])))throw new Error('Mobile Number must be a valid 10-digit Indian mobile number.');
  if(!/^\d{9}$/.test(norm_(d['Samagra ID'])))throw new Error('Samagra ID must be exactly 9 digits.');
  if(norm_(d['Roll Number']) && !/^\d+$/.test(norm_(d['Roll Number'])))throw new Error('Roll Number must contain digits only.');
  const roll=norm_(d['Roll Number']);
  const studentSh=sheet_(SHEETS.students), studentH=headers_(studentSh), studentRows=values_(studentSh);
  if(roll){const rh=studentH.indexOf('Roll Number'),ch=studentH.indexOf('Class'),shh=studentH.indexOf('Section');if(rh>=0&&ch>=0&&shh>=0){const dupRoll=studentRows.some((r,i)=>{const row=i+2;if(editingRow&&row===Number(editingRow))return false;return norm_(r[rh])===roll&&norm_(r[ch])===cls&&norm_(r[shh])===norm_(d.Section);});if(dupRoll)throw new Error('Duplicate Roll Number in this Class + Section.');}}
  const cfg=config_(); if(cfg.academicYears.indexOf(norm_(d['Academic Year']))<0)throw new Error('Invalid Academic Year.'); if(cfg.sections.indexOf(norm_(d.Section))<0)throw new Error('Invalid Section.');
  if(cfg.additionalSubjects.indexOf(norm_(d['Additional Subject']))<0)throw new Error('Invalid Additional Subject.'); if(cfg.itReplacement.indexOf(norm_(d['IT Subject Opted in Place of This Language']))<0)throw new Error('Invalid IT replacement option.');
  const sh=sheet_(SHEETS.students),h=headers_(sh),rows=values_(sh),si=h.indexOf('Samagra ID');
  if(si>=0){const dup=rows.some((r,i)=>{const row=i+2;if(editingRow&&row===Number(editingRow))return false;return norm_(r[si])===norm_(d['Samagra ID']);});if(dup)throw new Error('Duplicate Samagra ID: this student is already registered.');}
}
function registerStudent(data){setup_();validateStudent_(data);const sh=sheet_(SHEETS.students),h=headers_(sh);const row=h.map(k=>k==='Timestamp'?new Date():(data[k]!==undefined?data[k]:(k==='Status'?'Active':'')));sh.appendRow(row);audit_('ADD_STUDENT',norm_(data['Student Name']));return {id:sh.getLastRow()-1};}
function getStudents(pin,filters){if(!verify_(pin))throw new Error('Invalid Admin PIN');setup_();const sh=sheet_(SHEETS.students),h=headers_(sh);let out=values_(sh).map((r,i)=>Object.assign(obj_(h,r),{_row:i+2,_id:i+1}));filters=filters||{};const keys=['Academic Year','Class','Section','Gender','Stream','IT Subject Opted in Place of This Language'];out=out.filter(x=>keys.every(k=>!filters[k]||filters[k]==='All'||norm_(x[k])===norm_(filters[k]))&&(!filters.search||['Student Name',"Father's Name",'Samagra ID','Mobile Number'].some(k=>norm_(x[k]).toLowerCase().includes(norm_(filters.search).toLowerCase()))));return out;}
function updateStudent(pin,rowNo,data){if(!verify_(pin))throw new Error('Invalid Admin PIN');setup_();const row=Number(rowNo),sh=sheet_(SHEETS.students);if(row<2||row>sh.getLastRow())throw new Error('Invalid student row.');validateStudent_(data,row);const h=headers_(sh),old=sh.getRange(row,1,1,sh.getLastColumn()).getValues()[0];sh.getRange(row,1,1,h.length).setValues([h.map((k,i)=>k==='Timestamp'?old[i]:(data[k]!==undefined?data[k]:old[i]))]);audit_('EDIT_STUDENT','Row '+row);return true;}
function deleteStudent(pin,rowNo){if(!verify_(pin))throw new Error('Invalid Admin PIN');setup_();const row=Number(rowNo),sh=sheet_(SHEETS.students);if(row<2||row>sh.getLastRow())throw new Error('Invalid student row.');const h=headers_(sh),data=obj_(h,sh.getRange(row,1,1,h.length).getValues()[0]);sheet_(SHEETS.deleted).appendRow([new Date(),Utilities.getUuid(),'Student',JSON.stringify(data)]);sh.deleteRow(row);audit_('DELETE_STUDENT',norm_(data['Student Name']));return true;}
function getDeleted(pin){if(!verify_(pin))throw new Error('Invalid Admin PIN');setup_();const sh=sheet_(SHEETS.deleted),h=headers_(sh);return values_(sh).map((r,i)=>({row:i+2,deletedAt:r[0],recordId:r[1],type:r[2],data:r[3]}));}
function restoreDeleted(pin,rowNo){if(!verify_(pin))throw new Error('Invalid Admin PIN');setup_();const sh=sheet_(SHEETS.deleted),row=Number(rowNo);if(row<2||row>sh.getLastRow())throw new Error('Invalid deleted record.');const r=sh.getRange(row,1,1,4).getValues()[0],data=JSON.parse(r[3]);if(r[2]!=='Student')throw new Error('Only student records can be restored.');validateStudent_(data);const st=sheet_(SHEETS.students),h=headers_(st);st.appendRow(h.map(k=>k==='Timestamp'&&data[k]===undefined?new Date():(data[k]!==undefined?data[k]:(k==='Status'?'Active':''))));sh.deleteRow(row);audit_('RESTORE_STUDENT',norm_(data['Student Name']));return true;}
function getStats(pin,filters){if(!verify_(pin))throw new Error('Invalid Admin PIN');const rows=getStudents(pin,filters||{});const count=(key,val)=>rows.filter(r=>norm_(r[key])===val).length;return {total:rows.length,classes:{'9th':count('Class','9th'),'10th':count('Class','10th'),'11th':count('Class','11th'),'12th':count('Class','12th')},gender:{Male:count('Gender','Male'),Female:count('Gender','Female'),Other:count('Gender','Other')},it:{Hindi:count('IT Subject Opted in Place of This Language','Hindi'),English:count('IT Subject Opted in Place of This Language','English'),'Hindi & English':count('IT Subject Opted in Place of This Language','Hindi & English')},additional:{Hindi:count('Additional Subject','Hindi'),English:count('Additional Subject','English'),Mathematics:count('Additional Subject','Mathematics'),Biology:count('Additional Subject','Biology'),'Completely Skipped Hindi':count('Additional Subject','Completely Skipped Hindi'),'Completely Skipped English':count('Additional Subject','Completely Skipped English')},stream:{Mathematics:count('Stream','Mathematics'),Biology:count('Stream','Biology'),Arts:count('Stream','Arts'),Commerce:count('Stream','Commerce')},jobRole:{'Domestic Data Entry Operator':count('Job Role','Domestic Data Entry Operator'),'Web Developer':count('Job Role','Web Developer')},meta:{deleted:Math.max(0,sheet_(SHEETS.deleted).getLastRow()-1),fields:settings_().filter(x=>x.enabled).length}};}
function getResult(roll,medium,cls){setup_();const st=sheet_(SHEETS.students),h=headers_(st),rows=values_(st),ri=h.indexOf('Roll Number'),ci=h.indexOf('Class'),mi=h.indexOf('Medium');const r=rows.find(x=>norm_(x[ri])===norm_(roll)&&norm_(x[mi]).toLowerCase()===norm_(medium).toLowerCase()&&norm_(x[ci])===norm_(cls));if(!r)return {found:false,published:false};const studentRow=rows.indexOf(r)+2;const student=obj_(h,r);const mk=sheet_(SHEETS.marks),mh=headers_(mk),marks=values_(mk).filter(x=>Number(x[mh.indexOf('Student Row')])===studentRow).map(x=>obj_(mh,x));const total=marks.reduce((a,x)=>a+Number(x.Total||0),0),max=marks.reduce((a,x)=>a+Number(x.Max||0),0);return {found:true,published:marks.length>0,student,marks,summary:{subjects:marks.length,total,max,percentage:max?Math.round(total/max*10000)/100:0}};}
function saveMarks(pin,data){if(!verify_(pin))throw new Error('Invalid Admin PIN');setup_();data=data||{};const studentRow=Number(data.studentRow),subject=norm_(data.Subject);const st=sheet_(SHEETS.students),sh=st,h=headers_(sh);if(studentRow<2||studentRow>sh.getLastRow())throw new Error('Invalid student.');if(!subject)throw new Error('Subject is required.');const row=sh.getRange(studentRow,1,1,sh.getLastColumn()).getValues()[0],student=obj_(h,row),cls=norm_(student.Class);const theoryMax=['9th','10th'].indexOf(cls)>=0?40:50;const practicalMax=['9th','10th'].indexOf(cls)>=0?60:50;const theory=Number(data.Theory||0),practical=Number(data.Practical||0);if(!Number.isFinite(theory)||!Number.isFinite(practical)||theory<0||practical<0||theory>theoryMax||practical>practicalMax)throw new Error('For '+cls+': Theory maximum is '+theoryMax+' and Practical maximum is '+practicalMax+'.');const max=theoryMax+practicalMax,total=theory+practical,pct=total/max*100,grade=pct>=90?'A+':pct>=80?'A':pct>=70?'B+':pct>=60?'B':pct>=50?'C':pct>=33?'D':'F';const mk=sheet_(SHEETS.marks),mh=headers_(mk),rows=values_(mk),sr=mh.indexOf('Student Row'),si=mh.indexOf('Subject');let found=-1;rows.forEach((r,i)=>{if(Number(r[sr])===studentRow&&norm_(r[si]).toLowerCase()===subject.toLowerCase())found=i+2;});const o={Timestamp:new Date(),'Student Row':studentRow,Subject:subject,Theory:theory,Practical:practical,Max:max,Total:total,Grade:grade,Remarks:norm_(data.Remarks)};const arr=mh.map(k=>o[k]!==undefined?o[k]:'');if(found>0)mk.getRange(found,1,1,mh.length).setValues([arr]);else mk.appendRow(arr);audit_('SAVE_MARKS',cls+' / Student Row '+studentRow+' / '+subject);return {ok:true,grade,total,max,theoryMax,practicalMax};}
function saveSettings(pin,settings){
  if(!verify_(pin))throw new Error('Invalid Admin PIN');
  setup_();
  if(!Array.isArray(settings))throw new Error('Invalid settings.');
  const sh=sheet_(SHEETS.settings);
  const protectedMap={}; CORE_FIELDS.forEach(f=>protectedMap[f.field]=f);
  const clean=[]; const seen={};
  settings.forEach(f=>{
    const name=norm_(f.field); if(!name||seen[name])return; seen[name]=true;
    const core=protectedMap[name];
    if(core){ clean.push([core.field,core.type,core.options||'',core.required?'Yes':'No',core.enabled?'Yes':'No',core.onlyClasses||'All','Yes',core.section||'General']); }
    else clean.push([name,norm_(f.type)||'text',norm_(f.options||''),bool_(f.required)?'Yes':'No',bool_(f.enabled)?'Yes':'No',norm_(f.onlyClasses)||'All','No',norm_(f.section)||'Custom']);
  });
  CORE_FIELDS.forEach(f=>{if(!seen[f.field])clean.push([f.field,f.type,f.options||'',f.required?'Yes':'No',f.enabled?'Yes':'No',f.onlyClasses||'All','Yes',f.section||'General']);});
  sh.clearContents(); sh.getRange(1,1,1,8).setValues([['Field','Type','Options','Required','Enabled','Only Classes','System','Section']]);
  if(clean.length)sh.getRange(2,1,clean.length,8).setValues(clean);
  audit_('SAVE_SETTINGS','Form builder updated'); return settings_();
}
function getMarks(pin,studentRow){
  if(!verify_(pin))throw new Error('Invalid Admin PIN'); setup_();
  const row=Number(studentRow); const st=sheet_(SHEETS.students); if(row<2||row>st.getLastRow())throw new Error('Invalid student row.');
  const mk=sheet_(SHEETS.marks),h=headers_(mk),idx=h.indexOf('Student Row');
  return values_(mk).filter(r=>Number(r[idx])===row).map(r=>obj_(h,r));
}

// -------------------- GALLERY FUNCTIONS --------------------
function galleryRoot_(){
  const existingId=prop_('GALLERY_ROOT_FOLDER_ID');
  if(existingId){try{return DriveApp.getFolderById(existingId);}catch(e){}}
  const folder=DriveApp.createFolder('Sandipani Gallery');
  setProp_('GALLERY_ROOT_FOLDER_ID',folder.getId());
  return folder;
}
function galleryFolder_(section){
  section=norm_(section);
  if(GALLERY_SECTIONS.indexOf(section)<0)throw new Error('Invalid gallery section.');
  const root=galleryRoot_();
  const it=root.getFoldersByName(section);
  return it.hasNext()?it.next():root.createFolder(section);
}
function galleryList_(){
  setup_();
  return values_(sheet_(SHEETS.gallery)).map(r=>obj_(headers_(sheet_(SHEETS.gallery)),r)).reverse();
}
function galleryUpload_(pin,data){
  if(!verify_(pin)) throw new Error('Invalid Admin PIN');

  setup_();
  data=data||{};

  let rawSection=norm_(data.section||data.category||'');
  const title=norm_(data.title);
  const fileName=norm_(data.fileName)||('gallery-'+Date.now()+'.jpg');

  const mime=norm_(data.mimeType)||'image/jpeg';
  const b64=String(data.base64||'').replace(/^data:[^;]+;base64,/,'').trim();

  // Normalize gallery section
  const sectionMap={
    'guest':'Guest Lectures Photos',
    'guest lectures':'Guest Lectures Photos',
    'guest lectures photos':'Guest Lectures Photos',

    'industrial':'Industrial Visit Photos',
    'industrial visit':'Industrial Visit Photos',
    'industrial visit photos':'Industrial Visit Photos',

    'classroom':'Class Room Teaching',
    'class room':'Class Room Teaching',
    'class room teaching':'Class Room Teaching',

    'activities':'Student Activities',
    'student activities':'Student Activities'
  };

  const key=String(rawSection)
    .trim()
    .toLowerCase()
    .replace(/\s+/g,' ');

  const section=sectionMap[key] || rawSection;

  if(GALLERY_SECTIONS.indexOf(section)<0){
    throw new Error(
      'Invalid gallery section: "'+rawSection+
      '". Allowed: '+GALLERY_SECTIONS.join(', ')
    );
  }

  if(!b64) throw new Error('Image data is missing.');

  if(!/^image\//i.test(mime)){
    throw new Error('Only image files are allowed.');
  }

  const bytes=Utilities.base64Decode(b64);

  if(bytes.length>8*1024*1024){
    throw new Error('Image is too large. Maximum 8 MB.');
  }

  const blob=Utilities.newBlob(bytes,mime,fileName);

  const file=galleryFolder_(section).createFile(blob);

  try{
    file.setSharing(
      DriveApp.Access.ANYONE_WITH_LINK,
      DriveApp.Permission.VIEW
    );
  }catch(e){}

  const id=Utilities.getUuid();

  const url=
    'https://drive.google.com/thumbnail?id='+
    file.getId()+
    '&sz=w1600';

  sheet_(SHEETS.gallery).appendRow([
    id,
    new Date(),
    section,
    title,
    fileName,
    file.getId(),
    url
  ]);

  audit_('GALLERY_UPLOAD',section+' / '+fileName);

  return {
    id:id,
    section:section,
    title:title,
    fileName:fileName,
    fileId:file.getId(),
    url:url
  };
};

function galleryDelete_(pin,id){
  if(!verify_(pin))throw new Error('Invalid Admin PIN');
  setup_(); id=norm_(id); if(!id)throw new Error('Gallery ID is required.');
  const sh=sheet_(SHEETS.gallery),h=headers_(sh),rows=values_(sh),ii=h.indexOf('ID'),fi=h.indexOf('File ID');
  const idx=rows.findIndex(r=>norm_(r[ii])===id);
  if(idx<0)throw new Error('Gallery image not found.');
  const row=idx+2,fileId=norm_(rows[idx][fi]);
  if(fileId){try{DriveApp.getFileById(fileId).setTrashed(true);}catch(e){}}
  sh.deleteRow(row); audit_('GALLERY_DELETE',id); return true;
}

function route_(action,d){
  switch(action){
    case 'setup': setup_(); return {status:'ready',sheetId:ss_().getId(),sheetUrl:ss_().getUrl(),adminPinSet:!!prop_('ADMIN_PIN'),schoolName:prop_('SCHOOL_NAME')||'Govt. Sandipani HSS School Damoh'};
    case 'settings': return settings_();
    case 'config': return config_();
    case 'verifyAdmin': return {valid:verify_(d.pin)};
    case 'register': return registerStudent(d.data||{});
    case 'students': return getStudents(d.pin,d.filters||{});
    case 'stats': return getStats(d.pin,d.filters||{});
    case 'updateStudent': return updateStudent(d.pin,d.row,d.data||{});
    case 'deleteStudent': return deleteStudent(d.pin,d.row);
    case 'deleted': return getDeleted(d.pin);
    case 'restore': return restoreDeleted(d.pin,d.row);
    case 'saveSettings': return saveSettings(d.pin,d.settings||[]);
    case 'saveConfig': return saveConfig_(d.pin,d.config||{});
    case 'saveMarks': return saveMarks(d.pin,d.data||{});
    case 'getMarks': return getMarks(d.pin,d.studentRow);
    case 'result': return getResult(d.roll,d.medium,d.class||d.Class);
    case 'galleryList': return galleryList_();
    case 'galleryUpload': return galleryUpload_(d.pin,d.data||{});
    case 'galleryDelete': return galleryDelete_(d.pin,d.id||d.galleryId);
    default: throw new Error('Unknown action: '+action);
  }
}
function api_(e){try{const d=Object.assign({},e&&e.parameter||{},body_(e));if(typeof d.filters==='string')d.filters=JSON.parse(d.filters);if(typeof d.data==='string')d.data=JSON.parse(d.data);if(typeof d.settings==='string')d.settings=JSON.parse(d.settings);if(typeof d.config==='string')d.config=JSON.parse(d.config);return json_({ok:true,data:route_(norm_(d.action),d)});}catch(err){return json_({ok:false,error:String(err&&err.message||err)});}}
function doPost(e){return api_(e);}
function doGet(e){if(e&&e.parameter&&e.parameter.action)return api_(e);return json_({ok:true,data:{status:'online',message:'Sandipani vocational backend is running.'}});}
