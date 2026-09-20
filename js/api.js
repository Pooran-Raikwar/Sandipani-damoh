const API_URL = localStorage.getItem("sandipani_api_url") || "";

function setApiUrl(v) {
  localStorage.setItem(
    "sandipani_api_url",
    v.trim().replace(/\/+$/, "")
  );
}

function apiCall(action, params = {}) {

  return new Promise((resolve, reject) => {

    if (!API_URL) {
      reject(
        new Error(
          "Google Apps Script Web App URL is not configured."
        )
      );
      return;
    }

    const cb =
      "__sandipani_cb_" +
      Date.now() +
      "_" +
      Math.floor(Math.random() * 10000);

    const query = new URLSearchParams();

    query.set("api", "1");
    query.set("action", action);
    query.set("callback", cb);

    /*
     * IMPORTANT:
     * Send all parameters inside one JSON object.
     * This matches Code.gs apiJsonParam_().
     */
    query.set(
      "params",
      JSON.stringify(params)
    );

    const script = document.createElement("script");

    const timer = setTimeout(() => {

      cleanup();

      reject(
        new Error(
          "Request timed out. Check Apps Script deployment and URL."
        )
      );

    }, 20000);


    function cleanup() {

      clearTimeout(timer);

      delete window[cb];

      script.remove();

    }


    window[cb] = (response) => {

      cleanup();

      /*
       * Backend error
       */
      if (
        !response ||
        response.success === false
      ) {

        reject(
          new Error(
            response?.error ||
            "Server error."
          )
        );

        return;
      }


      /*
       * Return actual backend data.
       *
       * Code.gs response:
       * {
       *   success:true,
       *   data: ...
       * }
       */
      resolve(
        response.data !== undefined
          ? response.data
          : response
      );

    };


    script.onerror = () => {

      cleanup();

      reject(
        new Error(
          "Could not connect to Google Apps Script."
        )
      );

    };


    script.src =
      API_URL +
      "?" +
      query.toString();

    document.body.appendChild(script);

  });

}
