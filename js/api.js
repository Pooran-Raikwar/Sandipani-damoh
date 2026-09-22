/* Sandipani API client: GitHub Pages -> Google Apps Script */
const API = (() => {
  const url = (typeof CONFIG !== 'undefined' && CONFIG.API_URL) ? CONFIG.API_URL : '';

  async function call(action, data = {}) {
    if (!url) throw new Error('Google Apps Script URL is not configured.');
    const res = await fetch(url, {
      method: 'POST',
      headers: {'Content-Type':'text/plain;charset=utf-8'},
      body: JSON.stringify({action, ...data})
    });
    const text = await res.text();
    let out;
    try { out = JSON.parse(text); }
    catch(e) { throw new Error('Invalid response from Google Apps Script. Check the Web App deployment.'); }
    if (out && out.ok === false) throw new Error(out.error || 'Request failed.');
    return out && Object.prototype.hasOwnProperty.call(out,'data') ? out.data : out;
  }

  return {
    call,
    getSettings:()=>call('settings'),
    getConfig:()=>call('config'),
    registerStudent:data=>call('register',{data}),

    verifyAdmin:pin=>call('verifyAdmin',{pin}),
    getStats:(pin,filters)=>call('stats',{pin,filters}),
    getStudents:(pin,filters)=>call('students',{pin,filters}),
    updateStudent:(pin,row,data)=>call('updateStudent',{pin,row,data}),
    deleteStudent:(pin,row)=>call('deleteStudent',{pin,row}),
    getDeleted:pin=>call('deleted',{pin}),
    restoreDeleted:(pin,row)=>call('restore',{pin,row}),
    saveSettings:(pin,settings)=>call('saveSettings',{pin,settings}),
    saveConfig:(pin,config)=>call('saveConfig',{pin,config}),

    saveMarks:(pin,data)=>call('saveMarks',{pin,data}),
    getMarks:(pin,studentRow)=>call('getMarks',{pin,studentRow}),
    getResult:(roll,medium,Class)=>call('result',{roll,medium,class:Class}),

    // Gallery API — matches the current Gallery backend exactly.
    getGallery:()=>call('galleryList'),

    uploadGallery:(pin,data)=>{
      const d = data || {};
      return call('galleryUpload',{
        pin,
        data:{
          category:d.section || d.category,
          title:d.title || '',
          mimeType:d.mimeType || 'image/jpeg',
          base64:d.base64 || ''
        }
      });
    },

    deleteGallery:(pin,id)=>call('galleryDelete',{pin,id})
  };
})();

function apiCall(action,data){return API.call(action,data);}
