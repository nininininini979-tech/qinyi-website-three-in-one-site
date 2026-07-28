(function () {
  "use strict";

  const localHosts = new Set(["127.0.0.1", "localhost", "::1"]);
  window.__QINYI_SUPPORT_CONFIG__ = {
    apiBaseUrl: localHosts.has(window.location.hostname)
      ? ""
      : "https://qinyi-ai-support-private-api.vercel.app",
  };
}());
