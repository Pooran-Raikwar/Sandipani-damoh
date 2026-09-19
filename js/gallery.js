
const photoData=[
  ["images/guest-lecture-01.jpg","Guest Lecture"],
  ["images/guest-lecture-02.jpg","Guest Lecture"],
  ["images/guest-lecture-03.jpg","Guest Lecture"],
  ["images/guest-lecture-04.jpg","Guest Lecture"],
  ["images/classroom-01.jpg","Classroom Teaching"],
  ["images/classroom-02.jpg","Classroom Teaching"],
  ["images/student-activities-01.jpg","Student Activities"],
  ["images/student-activities-02.jpg","Student Activities"],
  ["images/industrial-visit-01.jpg","Industrial Visit"],
  ["images/teacher-profile.jpg","Teacher Profile"]
];
function renderGallery(filter="All Photos"){
  const grid=document.getElementById("galleryGrid"); if(!grid)return;
  grid.innerHTML="";
  photoData.filter(x=>filter==="All Photos"||x[1]===filter).forEach(([src,label])=>{
    const d=document.createElement("div"); d.className="photo";
    d.innerHTML=`<img src="${src}" alt="${label}" loading="lazy"><span class="photo-label">${label}</span>`;
    d.onclick=()=>openLight(src); grid.appendChild(d);
  });
}
document.addEventListener("DOMContentLoaded",()=>{
  if(document.getElementById("galleryGrid")){
    renderGallery();
    document.querySelectorAll(".filter").forEach(b=>b.onclick=()=>{
      document.querySelectorAll(".filter").forEach(x=>x.classList.remove("active"));
      b.classList.add("active"); renderGallery(b.textContent.trim());
    });
  }
});
