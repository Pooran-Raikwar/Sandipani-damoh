
const API_URL = localStorage.getItem("sandipani_api_url") || "";
function setApiUrl(v){ localStorage.setItem("sandipani_api_url", v.trim().replace(/\/+$/,"")); }

function apiCall(action, params={}) {
  return new Promise((resolve,reject)=>{
    if(!API_URL) return reject(new Error("Google Apps Script Web App URL is not configured."));
    const cb = "__sandipani_cb_" + Date.now() + "_" + Math.floor(Math.random()*10000);
    const query = new URLSearchParams();
    query.set("api","1"); query.set("action",action); query.set("callback",cb);
    Object.entries(params).forEach(([k,v])=>{
      if(v !== undefined && v !== null) query.set(k, typeof v === "object" ? JSON.stringify(v) : String(v));
    });
    const script=document.createElement("script");
    const timer=setTimeout(()=>{cleanup();reject(new Error("Request timed out. Check Apps Script deployment and URL."));},20000);
    function cleanup(){clearTimeout(timer);delete window[cb];script.remove();}
    window[cb]=(data)=>{cleanup(); if(data && data.ok===false) reject(new Error(data.error||"Server error")); else resolve(data);};
    script.onerror=()=>{cleanup();reject(new Error("Could not connect to Google Apps Script."));};
    script.src=API_URL+"?"+query.toString();
    document.body.appendChild(script);
  });
}
