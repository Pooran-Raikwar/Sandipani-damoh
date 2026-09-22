(function(){
const API_URL=(typeof CONFIG!=='undefined'&&CONFIG.API_URL)||'';
let PIN='';
const $=id=>document.getElementById(id);

async function call(action,data={}){
  const r=await fetch(API_URL,{
    method:'POST',
    headers:{'Content-Type':'text/plain;charset=utf-8'},
    body:JSON.stringify({action,...data})
  });
  const t=await r.text();
  let o;
  try{o=JSON.parse(t)}catch(e){throw new Error('Invalid backend response.')}
  if(o.ok===false)throw new Error(o.error||'Request failed');
  return o.data;
}

function msg(id,t,type){
  const e=$(id);
  e.textContent=t;
  e.className='message '+type;
  e.style.display='block';
}

function esc(v){
  return String(v??'').replace(/[&<>"']/g,m=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'
  }[m]));
}

/*
  The Gallery sheet uses these exact backend header names:
  ID, Section, Title, File ID, Image URL.
  Keep compatibility with the old lowercase field names too.
*/
function field(row,primary,fallback){
  if(row && row[primary]!==undefined && row[primary]!==null && row[primary]!=='') return row[primary];
  return row ? row[fallback] : '';
}

async function load(){
  const rows=await call('galleryList');

  $('list').innerHTML=rows.length
    ? rows.map(x=>{
        const id=field(x,'ID','id');
        const title=field(x,'Title','title');
        const section=field(x,'Section','section');
        const url=field(x,'Image URL','url');

        return `<div class="manager-card">
          <img src="${esc(url)}" alt="${esc(title)}" loading="lazy">
          <div class="body">
            <b>${esc(title)}</b><br>
            <small>${esc(section)}</small><br>
            <button class="btn danger" data-id="${esc(id)}">Delete</button>
          </div>
        </div>`;
      }).join('')
    : '<div class="notice">No uploaded photos yet.</div>';

  document.querySelectorAll('.manager-card [data-id]').forEach(b=>b.onclick=async()=>{
    if(!confirm('Delete this gallery photo?'))return;
    try{
      await call('galleryDelete',{pin:PIN,id:b.dataset.id});
      await load();
    }catch(e){
      alert(e.message);
    }
  });
}

$('loginBtn').onclick=async()=>{
  try{
    const d=await call('verifyAdmin',{pin:$('pin').value.trim()});
    if(!d.valid)throw new Error('Invalid Admin PIN');
    PIN=$('pin').value.trim();
    $('login').classList.add('hidden');
    $('panel').classList.remove('hidden');
    await load();
  }catch(e){
    msg('loginMsg',e.message,'error');
  }
};

$('file').onchange=()=>{
  const f=$('file').files[0];
  if(!f)return;
  $('preview').src=URL.createObjectURL(f);
  $('preview').classList.remove('hidden');
};

$('uploadBtn').onclick=async()=>{
  const f=$('file').files[0];
  if(!f)return msg('status','Please select an image.','error');
  if(f.size>5*1024*1024)return msg('status','Please use an image below 5 MB.','error');

  const reader=new FileReader();
  reader.onload=async()=>{
    try{
      $('uploadBtn').disabled=true;
      $('uploadBtn').textContent='Uploading…';

      await call('galleryUpload',{
        pin:PIN,
        data:{
          category:$('category').value,
          title:$('title').value.trim(),
          mimeType:f.type,
          base64:reader.result
        }
      });

      $('title').value='';
      $('file').value='';
      $('preview').classList.add('hidden');
      msg('status','Photo uploaded successfully.','success');
      await load();
    }catch(e){
      msg('status',e.message,'error');
    }finally{
      $('uploadBtn').disabled=false;
      $('uploadBtn').textContent='Upload Photo';
    }
  };
  reader.readAsDataURL(f);
};
})();