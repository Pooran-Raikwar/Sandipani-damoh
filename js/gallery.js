(function(){
const API_URL=(typeof CONFIG!=='undefined'&&CONFIG.API_URL)||'';

const local=[
  {category:'guest',title:'Guest Lecture • 01',url:'images/guest-lecture-01.jpg'},
  {category:'guest',title:'Guest Lecture • 02',url:'images/guest-lecture-02.jpg'},
  {category:'guest',title:'Guest Lecture • 03',url:'images/guest-lecture-03.jpg'},
  {category:'guest',title:'Guest Lecture • 04',url:'images/guest-lecture-04.jpg'},
  {category:'industrial',title:'Industrial Visit • 01',url:'images/industrial-visit-01.jpg'},
  {category:'classroom',title:'Classroom Teaching • 01',url:'images/classroom-01.jpg'},
  {category:'classroom',title:'Classroom Teaching • 02',url:'images/classroom-02.jpg'},
  {category:'activities',title:'Student Activities • 01',url:'images/student-activities-01.jpg'},
  {category:'activities',title:'Student Activities • 02',url:'images/student-activities-02.jpg'}
];

const names={
  guest:'Guest Lectures Photos',
  industrial:'Industrial Visit Photos',
  classroom:'Class Room Teaching',
  activities:'Student Activities'
};

const sectionToCategory={
  'Guest Lectures Photos':'guest',
  'Industrial Visit Photos':'industrial',
  'Class Room Teaching':'classroom',
  'Student Activities':'activities'
};

async function call(action,data={}){
  const r=await fetch(API_URL,{
    method:'POST',
    headers:{'Content-Type':'text/plain;charset=utf-8'},
    body:JSON.stringify({action,...data})
  });
  const t=await r.text();
  let o;
  try{o=JSON.parse(t)}catch(e){throw new Error('Gallery backend response invalid.')}
  if(o.ok===false)throw new Error(o.error||'Request failed');
  return o.data;
}

function esc(v){
  return String(v??'').replace(/[&<>"']/g,m=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'
  }[m]));
}

function field(row,primary,fallback){
  if(row && row[primary]!==undefined && row[primary]!==null && row[primary]!=='') return row[primary];
  return row ? row[fallback] : '';
}

function normalizeRemote(row){
  const section=field(row,'Section','section');
  return {
    category:sectionToCategory[section] || field(row,'Category','category') || '',
    title:field(row,'Title','title'),
    url:field(row,'Image URL','url'),
    id:field(row,'ID','id')
  };
}

function render(items){
  const box=document.getElementById('dynamicGallery');
  const remote=Array.isArray(items)?items.map(normalizeRemote):[];
  const all=[...local,...remote];

  document.getElementById('photoCount').textContent=all.length+'+';

  box.innerHTML=Object.keys(names).map((cat,i)=>{
    const rows=all.filter(x=>x.category===cat);
    if(!rows.length)return '';

    return `<section class="photo-section" data-section="${cat}">
      <div class="section-heading">
        <div>
          <span class="eyebrow">0${i+1} • ${cat==='guest'?'INTERACTION':cat==='industrial'?'EXPOSURE':cat==='classroom'?'LEARNING':'CREATIVITY'}</span>
          <h2>${names[cat]}</h2>
          <p>${cat==='guest'
            ?'Expert sessions, career guidance and industry interaction.'
            :cat==='industrial'
            ?'Practical exposure and workplace learning.'
            :cat==='classroom'
            ?'Hands-on vocational and digital learning.'
            :'Participation, creativity and student-led learning.'}</p>
        </div>
      </div>
      <div class="photo-grid">
        ${rows.map(x=>`<figure class="photo-card" data-category="${cat}">
          <img src="${esc(x.url)}" alt="${esc(x.title)}" loading="lazy">
          <figcaption>${esc(x.title)}</figcaption>
        </figure>`).join('')}
      </div>
    </section>`;
  }).join('');

  box.querySelectorAll('.photo-card img').forEach(img=>{
    img.addEventListener('click',()=>{
      const lb=document.getElementById('lightbox');
      document.getElementById('lightboxImg').src=img.src;
      document.getElementById('lightboxCaption').textContent=img.alt;
      lb.classList.add('show');
    });
  });
}

function tabs(){
  document.querySelectorAll('.gallery-tab').forEach(t=>t.addEventListener('click',()=>{
    document.querySelectorAll('.gallery-tab').forEach(x=>x.classList.remove('active'));
    t.classList.add('active');

    const f=t.dataset.filter;
    document.querySelectorAll('.photo-section').forEach(s=>{
      s.style.display=f==='all'||s.dataset.section===f?'':'none';
    });
  }));
}

async function init(){
  tabs();
  try{
    const remote=await call('galleryList');
    render(Array.isArray(remote)?remote:[]);
    tabs();
  }catch(e){
    console.error(e);
    render([]);
  }
}

document.addEventListener('DOMContentLoaded',()=>{
  document.querySelector('.lightbox-close').onclick=()=>{
    document.getElementById('lightbox').classList.remove('show');
  };

  document.getElementById('lightbox').onclick=e=>{
    if(e.target.id==='lightbox')e.currentTarget.classList.remove('show');
  };

  init();
});
})();