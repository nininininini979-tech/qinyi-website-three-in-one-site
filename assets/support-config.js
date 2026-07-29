(function () {
  "use strict";

  const localHosts = new Set(["127.0.0.1", "localhost", "::1"]);
  const existing = window.__QINYI_SUPPORT_CONFIG__ || {};
  const injected = window.__QINYI_DEPLOYMENT_CONFIG__?.publicApiBaseUrl
    || existing.apiBaseUrl
    || "";

  function normalize(value) {
    const candidate = String(value || "").trim();
    if (!candidate || candidate.startsWith("__QINYI_") || /qinyi-ai-support-private-api\.vercel\.app|example\.com|待补充|placeholder/i.test(candidate)) return "";
    try {
      const parsed = new URL(candidate, window.location.origin);
      if (!["http:", "https:"].includes(parsed.protocol)) return "";
      if (parsed.protocol === "http:" && !localHosts.has(parsed.hostname)) return "";
      parsed.hash = "";
      parsed.search = "";
      return parsed.href.replace(/\/+$/, "");
    } catch (_error) {
      return "";
    }
  }

  const apiBaseUrl = localHosts.has(window.location.hostname) ? "" : normalize(injected);
  window.__QINYI_SUPPORT_CONFIG__ = Object.freeze({
    ...existing,
    apiBaseUrl,
    previewOnly: !apiBaseUrl,
    deploymentState: apiBaseUrl ? "configured" : "pending"
  });
}());
