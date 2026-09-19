
const SS_ID = '1DQN206_i3hCsd3OTzL0dSsZDgStnt_4Ligocg-UkdHo';
const ADMIN_PIN = '2580';

function ss_(){ return SpreadsheetApp.openById(SS_ID); }
function sh_(name){ return ss_().getSheetByName(name); }

function setup_(){
  const s=ss_();
  let st=s.getSheetByName('Students');
  let mk=s.getSheetByName('Marks');
  if(!st) st=s.insertSheet('Students');
  if(!mk) mk=s.insertSheet('Marks');

  const studentHeaders=['Timestamp','Name','Parent','Class','Section','Roll','Medium','Mobile','Trade','Job Role','Stream','Status'];
  const markHeaders=['Timestamp','Roll','Class','Subject','Theory','Practical','Max','Total'];
  ensureHeaders_(st,studentHeaders);
  ensureHeaders_(mk,markHeaders);

  let fs=s.getSheetByName('FormSettings');
  if(!fs){
    fs=s.insertSheet('FormSettings');
    fs.getRange(1,1,1,6).setValues([['Field','Type','Options','Required','Enabled','Only Classes']]);
    fs.getRange(2,1,5,6).setValues([
      ['Section','dropdown','A|B|C|D','Yes','Yes','All'],
      ['Medium','dropdown','Hindi|English','Yes','Yes','All'],
      ['Trade','dropdown','IT-ITeS','Yes','Yes','All'],
      ['Job Role','dropdown','Domestic Data Entry Operator|Web Developer','Yes','Yes','All'],
      ['Stream','dropdown','Science|Commerce|Arts','No','Yes','11th|12th']
    ]);
  }

  let del=s.getSheetByName('Deleted Records');
  if(!del){
    del=s.insertSheet('Deleted Records');
    del.appendRow(['Deleted At','Original Row','Record Type','Data JSON']);
  }
}

function ensureHeaders_(sheet, headers){
  if(sheet.getLastRow()===0){
    sheet.getRange(1,1,1,headers.length).setValues([headers]);
    return;
  }
  const current=sheet.getRange(1,1,1,Math.max(sheet.getLastColumn(),1)).getValues()[0].map(String);
  headers.forEach(h=>{
    if(current.indexOf(h)<0) sheet.getRange(1,sheet.getLastColumn()+1).setValue(h);
  });
}

function verifyAdmin(pin){ return String(pin||'')===ADMIN_PIN; }

function getSettings(){
  setup_();
  const v=sh_('FormSettings').getDataRange().getValues();
  return v.slice(1).filter(r=>r[0]).map(r=>({
    field:String(r[0]), type:String(r[1]||'text'), options:String(r[2]||''),
    required:String(r[3]||'No')==='Yes', enabled:String(r[4]||'Yes')==='Yes',
    onlyClasses:String(r[5]||'All')
  }));
}

function saveSettings(pin, settings){
  if(!verifyAdmin(pin)) throw new Error('Invalid Admin PIN');
  const fs=sh_('FormSettings');
  fs.clearContents();
  fs.getRange(1,1,1,6).setValues([['Field','Type','Options','Required','Enabled','Only Classes']]);
  settings.forEach(x=>fs.appendRow([x.field,x.type,x.options||'',x.required?'Yes':'No',x.enabled===false?'No':'Yes',x.onlyClasses||'All']));
  return true;
}

function getStats(pin){
  if(!verifyAdmin(pin)) throw new Error('Invalid Admin PIN');
  const s=sh_('Students'), m=sh_('Marks');
  return {students:Math.max(0,s.getLastRow()-1), marks:Math.max(0,m.getLastRow()-1)};
}

function headers_(sheet){ return sheet.getRange(1,1,1,sheet.getLastColumn()).getValues()[0].map(String); }
function rows_(sheet){
  if(sheet.getLastRow()<2) return [];
  return sheet.getRange(2,1,sheet.getLastRow()-1,sheet.getLastColumn()).getValues();
}
function obj_(headers,row){
  const o={}; headers.forEach((h,i)=>o[h]=row[i]); return o;
}

function getStudents(pin, filters){
  if(!verifyAdmin(pin)) throw new Error('Invalid Admin PIN');
  const h=headers_(sh_('Students'));
  let data=rows_(sh_('Students')).map((r,i)=>Object.assign(obj_(h,r),{_row:i+2}));
  filters=filters||{};
  data=data.filter(x=>{
    for(const k of ['Class','Section','Medium','Trade','Job Role','Stream']){
      if(filters[k] && filters[k]!=='All' && String(x[k])!==String(filters[k])) return false;
    }
    if(filters.search){
      const q=String(filters.search).toLowerCase();
      if(!Object.values(x).some(v=>String(v).toLowerCase().includes(q))) return false;
    }
    return true;
  });
  return data;
}

function uniqueStudentExists_(name, cls, roll, medium, excludeRow){
  const h=headers_(sh_('Students'));
  const data=rows_(sh_('Students'));
  const iName=h.indexOf('Name'), iClass=h.indexOf('Class'), iRoll=h.indexOf('Roll'), iMed=h.indexOf('Medium');
  return data.some((r,idx)=>{
    const row=idx+2;
    if(excludeRow && row===Number(excludeRow)) return false;
    return String(r[iClass]).trim()===String(cls).trim() &&
           String(r[iRoll]).trim()===String(roll).trim() &&
           String(r[iMed]).trim().toLowerCase()===String(medium).trim().toLowerCase();
  });
}

function registerStudent(data){
  setup_();
  data=data||{};
  const cls=String(data['Class']||'').trim(), roll=String(data['Roll']||'').trim(), medium=String(data['Medium']||'').trim();
  if(!data.Name || !cls || !roll || !medium) throw new Error('Name, Class, Roll and Medium are required.');
  if(uniqueStudentExists_('',cls,roll,medium)) throw new Error('Duplicate entry: this Class + Roll + Medium is already registered.');
  const sh=sh_('Students'), h=headers_(sh);
  const row=h.map(k=>k==='Timestamp'?new Date():(data[k]!==undefined?data[k]:''));
  sh.appendRow(row);
  return {ok:true};
}

function updateStudent(pin,rowNo,data){
  if(!verifyAdmin(pin)) throw new Error('Invalid Admin PIN');
  const sh=sh_('Students'), h=headers_(sh), row=Number(rowNo);
  if(row<2 || row>sh.getLastRow()) throw new Error('Invalid record.');
  const cls=String(data['Class']||'').trim(), roll=String(data['Roll']||'').trim(), med=String(data['Medium']||'').trim();
  if(uniqueStudentExists_('',cls,roll,med,row)) throw new Error('Duplicate entry: another student has the same Class + Roll + Medium.');
  const old=sh.getRange(row,1,1,sh.getLastColumn()).getValues()[0];
  sh.getRange(row,1,1,sh.getLastColumn()).setValues([h.map((k,i)=>k==='Timestamp'?old[i]:(data[k]!==undefined?data[k]:old[i]))]);
  return true;
}

function softDeleteStudent(pin,rowNo){
  if(!verifyAdmin(pin)) throw new Error('Invalid Admin PIN');
  const st=sh_('Students'), row=Number(rowNo);
  if(row<2 || row>st.getLastRow()) throw new Error('Invalid record.');
  const h=headers_(st), data=st.getRange(row,1,1,st.getLastColumn()).getValues()[0];
  sh_('Deleted Records').appendRow([new Date(),row,'Student',JSON.stringify(obj_(h,data))]);
  const roll=String(data[h.indexOf('Roll')]);
  const cls=String(data[h.indexOf('Class')]);
  const mk=sh_('Marks'), mh=headers_(mk), all=rows_(mk);
  for(let i=all.length-1;i>=0;i--){
    if(String(all[i][mh.indexOf('Roll')])===roll && String(all[i][mh.indexOf('Class')])===cls){
      sh_('Deleted Records').appendRow([new Date(),i+2,'Marks',JSON.stringify(obj_(mh,all[i]))]);
      mk.deleteRow(i+2);
    }
  }
  st.deleteRow(row);
  return true;
}

function saveMarks(pin,data){
  if(!verifyAdmin(pin)) throw new Error('Invalid Admin PIN');
  setup_();
  data=data||{};
  const cls=String(data.Class||''), roll=String(data.Roll||''), subject=String(data.Subject||'');
  if(!cls||!roll||!subject) throw new Error('Class, Roll and Subject are required.');
  const theory=Number(data.Theory||0), practical=Number(data.Practical||0);
  const max=cls==='9th'||cls==='10th'?100:100;
  const total=theory+practical;
  const sh=sh_('Marks'), h=headers_(sh), rows=rows_(sh);
  let found=-1;
  rows.forEach((r,i)=>{ if(String(r[h.indexOf('Roll')])===roll && String(r[h.indexOf('Class')])===cls && String(r[h.indexOf('Subject')])===subject) found=i+2; });
  const obj={Timestamp:new Date(),Roll:roll,Class:cls,Subject:subject,Theory:theory,Practical:practical,Max:max,Total:total};
  const arr=h.map(k=>obj[k]!==undefined?obj[k]:'');
  if(found>0) sh.getRange(found,1,1,h.length).setValues([arr]); else sh.appendRow(arr);
  return true;
}

function getResult(roll,medium,cls){
  setup_();
  const st=sh_('Students'), h=headers_(st), data=rows_(st);
  const r=data.find(x=>String(x[h.indexOf('Roll')]).trim()===String(roll).trim() &&
                       String(x[h.indexOf('Medium')]).trim().toLowerCase()===String(medium).trim().toLowerCase() &&
                       (!cls || String(x[h.indexOf('Class')]).trim()===String(cls).trim()));
  if(!r) return {found:false};
  const student=obj_(h,r);
  const mk=sh_('Marks'), mh=headers_(mk);
  const marks=rows_(mk).filter(x=>String(x[mh.indexOf('Roll')]).trim()===String(roll).trim() &&
                                  String(x[mh.indexOf('Class')]).trim()===String(student.Class).trim())
                           .map(x=>obj_(mh,x));
  return {found:true,student:student,marks:marks};
}

function getDeleted(pin){
  if(!verifyAdmin(pin)) throw new Error('Invalid Admin PIN');
  const sh=sh_('Deleted Records');
  return rows_(sh).map((r,i)=>({row:i+2,deletedAt:r[0],originalRow:r[1],type:r[2],data:r[3]}));
}

function restoreDeleted(pin,rowNo){
  if(!verifyAdmin(pin)) throw new Error('Invalid Admin PIN');
  const sh=sh_('Deleted Records'), row=Number(rowNo);
  const rec=sh.getRange(row,1,1,4).getValues()[0];
  const type=String(rec[2]), data=JSON.parse(rec[3]);
  if(type==='Student'){
    const st=sh_('Students'), h=headers_(st);
    if(uniqueStudentExists_('',data.Class,data.Roll,data.Medium)) throw new Error('Cannot restore: duplicate student already exists.');
    st.appendRow(h.map(k=>data[k]!==undefined?data[k]:''));
  } else if(type==='Marks'){
    const mk=sh_('Marks'), h=headers_(mk);
    mk.appendRow(h.map(k=>data[k]!==undefined?data[k]:''));
  }
  sh.deleteRow(row);
  return true;
}


/* ================= EXTERNAL GITHUB API BRIDGE =================
   Original Result System functions above are preserved.
   GitHub website calls this bridge with ?api=1&action=...
   JSONP is used so the static GitHub site can communicate with Apps Script.
================================================================= */

function json_(obj, e) {
  const s = JSON.stringify(obj);
  const cb = e && e.parameter && e.parameter.callback;
  if (cb && /^[A-Za-z_$][0-9A-Za-z_$\.]*$/.test(cb)) {
    return ContentService.createTextOutput(cb + '(' + s + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(s)
    .setMimeType(ContentService.MimeType.JSON);
}

function apiData_(e, key, fallback) {
  const p = e && e.parameter ? e.parameter : {};
  if (p[key] !== undefined) return p[key];
  return fallback;
}

function apiJsonParam_(e, key, fallback) {
  try {
    const v = apiData_(e, key, '');
    return v ? JSON.parse(v) : fallback;
  } catch (err) {
    throw new Error('Invalid JSON parameter: ' + key);
  }
}

function handleApi_(e) {
  try {
    setup_();
    const action = String(apiData_(e, 'action', ''));

    switch (action) {
      case 'settings':
        return json_({ok:true, settings:getSettings()}, e);

      case 'register':
        return json_({ok:true, result:registerStudent(apiJsonParam_(e,'data',{}))}, e);

      case 'result':
        return json_({
          ok:true,
          result:getResult(
            apiData_(e,'roll',''),
            apiData_(e,'medium',''),
            apiData_(e,'class','')
          )
        }, e);

      case 'verifyAdmin':
        return json_({ok:true, valid:verifyAdmin(apiData_(e,'pin',''))}, e);

      case 'stats':
        return json_({ok:true, result:getStats(apiData_(e,'pin',''))}, e);

      case 'students':
        return json_({
          ok:true,
          result:getStudents(apiData_(e,'pin',''), apiJsonParam_(e,'filters',{}))
        }, e);

      case 'updateStudent':
        return json_({
          ok:true,
          result:updateStudent(
            apiData_(e,'pin',''),
            apiData_(e,'row',''),
            apiJsonParam_(e,'data',{})
          )
        }, e);

      case 'deleteStudent':
        return json_({
          ok:true,
          result:softDeleteStudent(apiData_(e,'pin',''), apiData_(e,'row',''))
        }, e);

      case 'saveMarks':
        return json_({
          ok:true,
          result:saveMarks(apiData_(e,'pin',''), apiJsonParam_(e,'data',{}))
        }, e);

      case 'deleted':
        return json_({ok:true, result:getDeleted(apiData_(e,'pin',''))}, e);

      case 'restore':
        return json_({
          ok:true,
          result:restoreDeleted(apiData_(e,'pin',''), apiData_(e,'row',''))
        }, e);

      case 'saveSettings':
        return json_({
          ok:true,
          result:saveSettings(
            apiData_(e,'pin',''),
            apiJsonParam_(e,'settings',[])
          )
        }, e);

      default:
        return json_({ok:false,error:'Unknown API action.'}, e);
    }
  } catch (err) {
    return json_({ok:false,error:String(err && err.message ? err.message : err)}, e);
  }
}

/* Replace the original doGet with an API-aware version. */
function doGet(e) {
  if (e && e.parameter && e.parameter.api === '1') {
    return handleApi_(e);
  }
  setup_();
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('School Student & Result System')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
