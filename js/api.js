/* Sandipani API client - GitHub Pages -> Google Apps Script */
const API = (() => {
  const url = (typeof CONFIG !== "undefined" && CONFIG.API_URL) ? CONFIG.API_URL : "";
  if (!url) console.warn("Sandipani: CONFIG.API_URL is not configured.");

  async function call(action, data = {}) {
    if (!url) throw new Error("Google Apps Script URL is not configured.");
    const payload = { action, ...data };
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload)
    });
    const text = await res.text();
    let out;
    try { out = JSON.parse(text); }
    catch (_) { throw new Error("Invalid response from Google Apps Script."); }
    if (out && out.ok === false) throw new Error(out.error || "Request failed.");
    return out && Object.prototype.hasOwnProperty.call(out, "data") ? out.data : out;
  }

  return {
    call,
    verifyAdmin: pin => call("verifyAdmin", { pin }),
    getStats: pin => call("getStats", { pin }),
    getSettings: () => call("getSettings"),
    registerStudent: data => call("registerStudent", { data }),
    getStudents: (pin, filters) => call("getStudents", { pin, filters }),
    updateStudent: (pin, row, data) => call("updateStudent", { pin, row, data }),
    softDeleteStudent: (pin, row) => call("softDeleteStudent", { pin, row }),
    getDeleted: pin => call("getDeleted", { pin }),
    restoreDeleted: (pin, row) => call("restoreDeleted", { pin, row }),
    saveSettings: (pin, settings) => call("saveSettings", { pin, settings }),
    getResult: (roll, medium, Class) => call("getResult", { roll, medium, Class }),
    getMarks: (pin, studentRow) => call("getMarks", { pin, studentRow }),
    saveMarks: (pin, studentRow, marks) => call("saveMarks", { pin, studentRow, marks })
  };
})();
