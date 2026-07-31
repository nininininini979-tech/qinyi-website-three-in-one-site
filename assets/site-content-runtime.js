(function () {
  "use strict";

  const config = window.__QINYI_SUPPORT_CONFIG__ || {};
  const apiBase = typeof config.apiBaseUrl === "string" ? config.apiBaseUrl.replace(/\/+$/, "") : "";
  const currentPage = window.location.pathname.split("/").filter(Boolean).pop() || "index.html";
  const staticPageSlugs = new Set(["index.html", "products.html", "solutions.html", "industries.html", "manufacturing.html", "projects.html", "quote.html", "about.html", "insights.html", "faq.html", "contact.html", "trade.html", "privacy.html"]);
  const isChinese = () => document.documentElement.lang.toLowerCase().startsWith("zh");
  const localized = (value, field) => value?.[`${field}${isChinese() ? "Zh" : "En"}`] || "";

  function pageHref(slug) {
    if (staticPageSlugs.has(slug) || !apiBase) return slug;
    const locale = isChinese() ? "zh-CN" : "en";
    return `${apiBase}/site/${encodeURIComponent(locale)}/${encodeURIComponent(slug)}`;
  }

  function assetUrl(assetId, thumbnail) {
    return `${apiBase}/api/public/site-assets/${encodeURIComponent(assetId)}${thumbnail ? "/thumbnail" : ""}`;
  }

  function renderManagedSections(page) {
    document.getElementById("qinyiManagedContent")?.remove();
    const sections = (page?.sections || []).filter((item) => item && item.status === "published").sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
    if (!sections.length) return;
    const host = document.createElement("div");
    host.id = "qinyiManagedContent";
    for (const item of sections) {
      const section = document.createElement("section");
      section.className = "section qinyi-managed-section";
      const container = document.createElement("div");
      container.className = "container qinyi-managed-grid";
      const copy = document.createElement("div");
      copy.className = "qinyi-managed-copy";
      const eyebrow = localized(item, "eyebrow");
      const title = localized(item, "title");
      const body = localized(item, "body");
      if (eyebrow) { const label = document.createElement("p"); label.className = "eyebrow"; label.textContent = eyebrow; copy.appendChild(label); }
      if (title) { const heading = document.createElement("h2"); heading.textContent = title; copy.appendChild(heading); }
      if (body) { const paragraph = document.createElement("p"); paragraph.className = "lede"; paragraph.textContent = body; copy.appendChild(paragraph); }
      const imageAssetId = item.imageAssetId || (item.kind === "image" || item.kind === "media" ? item.assetId : null);
      if (imageAssetId) {
        const figure = document.createElement("figure");
        figure.className = "qinyi-managed-media";
        const image = document.createElement("img");
        image.src = assetUrl(imageAssetId, false);
        image.alt = localized(item, "alt") || title || "";
        image.loading = "lazy";
        figure.appendChild(image);
        container.append(figure, copy);
      } else container.appendChild(copy);
      section.appendChild(container);
      host.appendChild(section);
    }
    document.querySelector("main")?.appendChild(host);
  }

  function renderNavigation(content) {
    const host = document.querySelector(".nav-links");
    if (!host) return;
    const nav = Array.isArray(content.navigation) ? content.navigation : [];
    host.replaceChildren(...nav.map((item) => {
      const link = document.createElement("a");
      link.href = pageHref(item.href);
      link.textContent = isChinese() ? item.labelZh : item.labelEn;
      if (item.href === currentPage) link.setAttribute("aria-current", "page");
      link.addEventListener("click", () => {
        window.QinyiAnalytics?.track?.("navigation_click", item.href, "navigation");
        document.body.classList.remove("menu-open");
        const toggle = document.querySelector(".menu-toggle");
        if (toggle) toggle.setAttribute("aria-expanded", "false");
      });
      return link;
    }));
  }

  function showRetiredPage() {
    const main = document.querySelector("main");
    if (!main) return;
    main.replaceChildren();
    const section = document.createElement("section");
    section.className = "section";
    const copy = document.createElement("div");
    copy.className = "narrow";
    const heading = document.createElement("h1");
    heading.textContent = isChinese() ? "此页面暂未发布" : "This page is not currently published";
    const paragraph = document.createElement("p");
    paragraph.className = "lede";
    paragraph.textContent = isChinese() ? "请从导航栏进入其他勤益页面。" : "Use the navigation to continue browsing Qinyi.";
    copy.append(heading, paragraph);
    section.appendChild(copy);
    main.appendChild(section);
  }

  function applyCustomizer(content) {
    const customizer = content?.customizer;
    const workbench = document.querySelector("[data-model-mode-workbench]");
    if (!workbench || !customizer) return;
    workbench.hidden = customizer.enabled === false;
    const slots = new Map((customizer.modelSlots || []).map((item) => [item.id, item]));
    workbench.querySelectorAll("[data-model-mode]").forEach((button) => {
      const mode = button.dataset.modelMode;
      if (mode === "studio") return;
      const aliases = { parametric: "puzzle", reference: "paper-3d", composition: "packaging" };
      const slot = slots.get(aliases[mode] || mode);
      const status = button.querySelector("small");
      if (!slot) {
        button.disabled = true;
        if (status) status.textContent = isChinese() ? "待补充" : "Pending input";
        return;
      }
      button.disabled = false;
      button.dataset.modeLabelZh = slot.labelZh || button.dataset.modeLabelZh || "";
      button.dataset.modeLabelEn = slot.labelEn || button.dataset.modeLabelEn || "";
      if (status) status.textContent = slot.status === "published" ? (isChinese() ? "已发布" : "Published") : (isChinese() ? "待补充" : "Pending input");
    });
  }

  function applyContent(content) {
    if (!content || !Array.isArray(content.pages)) return;
    const page = content.pages.find((item) => item.slug === currentPage);
    if (content.siteName) document.querySelectorAll(".brand-copy strong").forEach((node) => { node.textContent = content.siteName; });
    if (page && Number(content.revision || 0) > 1) {
      const heroTitle = page.hero?.titleStatus === "pending_input" ? "" : localized(page.hero, "title");
      const heroBody = page.hero?.bodyStatus === "pending_input" ? "" : localized(page.hero, "body");
      const titleNode = document.querySelector("[data-content-hero-title], .page-hero h1, .hero h1");
      const bodyNode = document.querySelector("[data-content-hero-body], .page-hero-aside, .hero-copy > p:not(.eyebrow)");
      if (titleNode && heroTitle) titleNode.textContent = heroTitle;
      if (bodyNode && heroBody) bodyNode.textContent = heroBody;
      const description = document.querySelector('meta[name="description"]');
      const seoDescription = page.seo?.descriptionStatus === "pending_input" ? "" : localized(page.seo, "description");
      if (description && seoDescription) description.setAttribute("content", seoDescription);
      renderManagedSections(page);
    } else if (!page) showRetiredPage();
    renderNavigation(content);
    applyCustomizer(content);
    const nav = Array.isArray(content.navigation) ? content.navigation : [];
    document.querySelectorAll(".nav-actions a[href$='.html'], .mobile-menu a").forEach((link) => {
      const rawHref = link.getAttribute("href")?.split("#")[0] || "";
      const href = rawHref.split("/").pop();
      const item = nav.find((candidate) => href === candidate.href);
      if (!item && href?.endsWith(".html")) { link.hidden = true; return; }
      if (!item) return;
      link.textContent = isChinese() ? item.labelZh : item.labelEn;
      link.hidden = item.visible === false;
    });
    window.QINYI_CONTENT = content;
    if (document.documentElement?.dataset) {
      document.documentElement.dataset.contentRevision = String(content.revision || "");
      document.documentElement.dataset.contentVersion = content.publishedVersionId || "";
    }
    document.dispatchEvent(new CustomEvent("qinyi:content-ready", { detail: content }));
  }

  async function load() {
    if (!apiBase) return;
    try {
      const response = await fetch(`${apiBase}/api/public/site-content`, { headers: { Accept: "application/json" }, credentials: "omit" });
      if (!response.ok) return;
      applyContent(await response.json());
    } catch (_error) {
      // The static build remains the fallback when the optional content API is offline.
    }
  }

  window.QinyiSiteContent = { load, applyContent };
  load();
}());
