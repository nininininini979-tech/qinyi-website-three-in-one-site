(function () {
  "use strict";

  const HANDOFF_REQUEST_TIMEOUT_MS = 20_000;
  const locale = window.QINYI_I18N?.locale || document.documentElement.lang || "en";
  const messages = window.QINYI_I18N?.messages || {};
  const text = (key, fallback) => {
    const direct = messages[`customizer.${key}`];
    if (direct && direct !== `customizer.${key}`) return direct;
    const aliases = {
      studio_name: "name",
      studio_short: "name",
      concept_only: "preview.label",
      progress: "progress",
      back: "action.back",
      reset_view: "action.reset",
      previous: "action.back",
      next: "action.next",
      choose: "action.confirm",
      more: "product.other",
      more_description: "product.other_help",
      final_complete: "summary.body",
      final_open: "summary.open_items",
      human_consultant: "human.request",
      handoff_preparing: "human.sending",
      handoff_failed: "human.failed",
      use_case: "brief.use_case",
      use_case_placeholder: "brief.use_case_placeholder",
      audience: "brief.audience",
      audience_placeholder: "brief.audience_placeholder",
      quantity: "brief.quantity",
      quantity_placeholder: "brief.quantity_placeholder",
      budget: "brief.budget",
      budget_placeholder: "brief.budget_placeholder",
      delivery: "brief.delivery",
      reference_style: "brief.reference",
      reference_placeholder: "brief.reference_placeholder",
      idea_note: "brief.notes",
      idea_placeholder: "brief.notes_placeholder",
      add_to_quote: "quote.prepare",
      added: "quote.notice",
      summary_label: "summary.title",
      blueprint: "summary.title",
      open_label: "summary.uncertain_tag",
      stage_direction_eyebrow: "step.product.number",
      stage_direction_title: "step.product.title",
      stage_direction_subtitle: "step.product.help",
      stage_structure_eyebrow: "step.structure.number",
      stage_structure_puzzle: "step.structure.title",
      stage_structure_paper3d: "step.structure.title",
      stage_structure_papergoods: "step.structure.title",
      stage_structure_open: "step.structure.title",
      stage_structure_subtitle: "step.structure.help",
      stage_finish_eyebrow: "step.material.number",
      stage_finish_title: "step.material.title",
      stage_finish_subtitle: "step.material.help",
      stage_style_eyebrow: "step.visual.number",
      stage_style_title: "step.visual.title",
      stage_style_subtitle: "step.visual.help",
      direction_puzzle: "product.puzzle",
      direction_puzzle_description: "product.puzzle.help",
      direction_paper3d: "product.paper_3d",
      direction_paper3d_description: "product.paper_3d.help",
      direction_papergoods: "product.game_packaging",
      direction_papergoods_description: "product.game_packaging.help",
      structure_classic: "structure.flat",
      structure_classic_description: "structure.classic_description",
      structure_soft: "structure.custom_shape",
      structure_soft_description: "structure.custom_shape_description",
      structure_secret: "structure.unsure",
      structure_secret_description: "structure.unsure_description",
      structure_slot: "structure.foldable",
      structure_slot_description: "structure.foldable_description",
      structure_layer: "structure.layered",
      structure_layer_description: "structure.layered_description",
      structure_module: "structure.set",
      structure_module_description: "structure.set_description",
      structure_game: "structure.set",
      structure_game_description: "structure.game_description",
      structure_cards: "structure.flat",
      structure_cards_description: "structure.cards_description",
      structure_pack: "structure.custom_shape",
      structure_pack_description: "structure.pack_description",
      structure_open: "structure.unsure",
      structure_open_description: "structure.open_description",
      structure_hybrid: "structure.set",
      structure_hybrid_description: "structure.hybrid_description",
      structure_reference: "structure.custom_shape",
      structure_reference_description: "structure.reference_description",
      finish_board: "material.greyboard",
      finish_board_description: "finish.board_description",
      finish_lamination: "finish.lamination",
      finish_lamination_description: "finish.lamination_description",
      finish_foil: "finish.foil",
      finish_foil_description: "finish.foil_description",
      finish_texture: "finish.emboss",
      finish_texture_description: "finish.emboss_description",
      finish_spot_uv: "finish.spot_uv",
      finish_spot_uv_description: "finish.spot_uv_description",
      style_minimal: "visual.minimal",
      style_minimal_description: "visual.minimal_description",
      style_bold: "visual.bold",
      style_bold_description: "visual.bold_description",
      style_story: "visual.illustrated",
      style_story_description: "visual.illustrated_description",
      style_brand: "visual.brand",
      style_brand_description: "visual.brand_description",
    };
    return messages[`customizer.${aliases[key]}`] || fallback;
  };
  const format = (key, fallback, values) => Object.entries(values || {}).reduce(
    (value, [name, replacement]) => value.replaceAll(`{${name}}`, String(replacement)),
    text(key, fallback),
  );

  const copy = {
    studioName: text("studio_name", "Inspiration Custom Studio"),
    studioShort: text("studio_short", "Custom Studio"),
    conceptOnly: text("concept_only", "Concept preview, not a production model or final quotation basis."),
    progress: text("progress", "Customization progress"),
    back: text("back", "Go back"),
    resetView: text("reset_view", "Reset 3D view"),
    previous: text("previous", "Previous option"),
    next: text("next", "Next option"),
    choose: text("choose", "Use this direction"),
    more: text("more", "More ideas"),
    moreDescription: text("more_description", "Keep an open creative direction"),
    open: text("open", "Open"),
    freeModel: text("free_model", "Open concept"),
    waiting: text("waiting", "Choose a direction"),
    preview: text("preview", "Preview: {name}"),
    shaped: text("shaped", "{count}/4 choices set"),
    shapedOpen: text("shaped_open", "{count}/4 choices set · {open} open"),
    complete: text("complete", "Complete"),
    blueprint: text("blueprint", "Your customization brief"),
    finalComplete: text("final_complete", "Four directions have been combined into one editable brief."),
    finalOpen: text("final_open", "Your open ideas will be sent with this brief to a human creative consultant."),
    ideaNote: text("idea_note", "Additional idea"),
    ideaPlaceholder: text("idea_placeholder", "A scene, reference, feeling or requirement that is not covered above"),
    useCase: text("use_case", "Use case"),
    useCasePlaceholder: text("use_case_placeholder", "e.g. personal gift, school event"),
    audience: text("audience", "Audience"),
    audiencePlaceholder: text("audience_placeholder", "e.g. children aged 8-12"),
    quantity: text("quantity", "Quantity range"),
    quantityPlaceholder: text("quantity_placeholder", "e.g. 300-500 sets"),
    budget: text("budget", "Budget range"),
    budgetPlaceholder: text("budget_placeholder", "Optional"),
    delivery: text("delivery", "Target delivery"),
    referenceStyle: text("reference_style", "Reference style"),
    referencePlaceholder: text("reference_placeholder", "Describe the visual direction or add a public reference link below"),
    addToQuote: text("add_to_quote", "Add to quote"),
    humanConsultant: text("human_consultant", "Continue with a human consultant"),
    added: text("added", "The brief was added to the quote form below."),
    handoffPreparing: text("handoff_preparing", "Preparing the human-support request..."),
    handoffReady: text("handoff_ready", "Human-support request created: {ticket}"),
    handoffFailed: text("handoff_failed", "The support service is unavailable. The brief is still in the quote form below."),
    summaryLabel: text("summary_label", "Customization brief"),
    openLabel: text("open_label", "Needs co-creation"),
    modelPuzzle: text("model_puzzle", "Puzzle concept"),
    modelPaper3d: text("model_paper_3d", "3D paper concept"),
    modelPaperGoods: text("model_paper_goods", "Paper goods concept"),
  };

  const more = { id: "more", name: copy.more, description: copy.moreDescription, preview: "more", kind: "more" };

  function option(id, nameKey, nameFallback, descriptionKey, descriptionFallback, preview, modelName) {
    return { id, name: text(nameKey, nameFallback), description: text(descriptionKey, descriptionFallback), preview, modelName };
  }

  const directionStage = {
    id: "direction",
    eyebrow: text("stage_direction_eyebrow", "Customization starting point"),
    title: text("stage_direction_title", "What would you like to create?"),
    subtitle: text("stage_direction_subtitle", "Choose a product direction"),
    options: [
      option("puzzle", "direction_puzzle", "Puzzle product", "direction_puzzle_description", "Flat puzzles, art editions and gift puzzles", "puzzle", copy.modelPuzzle),
      option("paper3d", "direction_paper3d", "3D paper puzzle", "direction_paper3d_description", "Folded, slotted and assembled paper structures", "paper3d", copy.modelPaper3d),
      option("papergoods", "direction_papergoods", "Paper game & gift packaging", "direction_papergoods_description", "Games, cards, boxes and coordinated paper goods", "papergoods", copy.modelPaperGoods),
      more,
    ],
  };

  const structureOptions = {
    puzzle: [
      option("classic-cut", "structure_classic", "Classic interlock", "structure_classic_description", "Balanced tabs and familiar assembly", "classic"),
      option("soft-cut", "structure_soft", "Soft curves", "structure_soft_description", "Rounded connections and gentle outlines", "curve"),
      option("secret-cut", "structure_secret", "Hidden surprise", "structure_secret_description", "A special shape or message inside the puzzle", "secret"),
      more,
    ],
    paper3d: [
      option("slot-form", "structure_slot", "Slot assembly", "structure_slot_description", "Parts connect without a complex mechanism", "slot"),
      option("layer-form", "structure_layer", "Layered construction", "structure_layer_description", "Printed layers build volume and depth", "layer"),
      option("module-form", "structure_module", "Modular assembly", "structure_module_description", "Repeatable units combine into a larger object", "module"),
      more,
    ],
    papergoods: [
      option("game-kit", "structure_game", "Game set", "structure_game_description", "Board, cards, rules and packaging as one set", "game"),
      option("card-set", "structure_cards", "Card collection", "structure_cards_description", "Cards, dividers and a fitted printed box", "cards"),
      option("gift-pack", "structure_pack", "Gift package", "structure_pack_description", "A presentation box with coordinated inserts", "pack"),
      more,
    ],
    more: [
      option("open-form", "structure_open", "Open structure", "structure_open_description", "Keep the construction undefined for co-creation", "more"),
      option("hybrid-form", "structure_hybrid", "Hybrid format", "structure_hybrid_description", "Combine two or more paper product types", "module"),
      option("reference-form", "structure_reference", "Develop from a reference", "structure_reference_description", "Start from an existing object or image", "secret"),
      more,
    ],
  };

  const finishStage = {
    id: "finish",
    eyebrow: text("stage_finish_eyebrow", "Material & finish"),
    title: text("stage_finish_title", "How should the surface feel?"),
    subtitle: text("stage_finish_subtitle", "Choose the main production character"),
    options: [
      option("board", "finish_board", "Natural paperboard", "finish_board_description", "Visible paper character and tactile warmth", "board"),
      option("lamination", "finish_lamination", "Protective lamination", "finish_lamination_description", "A durable matte or gloss surface", "lamination"),
      option("foil", "finish_foil", "Foil accent", "finish_foil_description", "Controlled metallic highlights for key details", "foil"),
      option("texture", "finish_texture", "Embossed texture", "finish_texture_description", "Raised or pressed detail with tactile depth", "texture"),
      option("spot-uv", "finish_spot_uv", "Spot UV", "finish_spot_uv_description", "Selective gloss contrast on printed areas", "uv"),
      more,
    ],
  };

  const personalityStage = {
    id: "personality",
    eyebrow: text("stage_style_eyebrow", "Visual personality"),
    title: text("stage_style_title", "What should it communicate?"),
    subtitle: text("stage_style_subtitle", "Choose the primary visual direction"),
    options: [
      option("minimal", "style_minimal", "Quiet & minimal", "style_minimal_description", "Clear hierarchy and restrained detail", "minimal"),
      option("bold", "style_bold", "Bold colour", "style_bold_description", "Strong rhythm and distinct colour areas", "bold"),
      option("story", "style_story", "Illustrated story", "style_story_description", "A visual narrative carried across the product", "story"),
      option("brand", "style_brand", "Personal or brand mark", "style_brand_description", "A name, symbol or identity becomes the focal point", "brand"),
      more,
    ],
  };

  function structureStage(direction) {
    return {
      id: "structure",
      eyebrow: text("stage_structure_eyebrow", "Structure & format"),
      title: direction === "puzzle"
        ? text("stage_structure_puzzle", "How should the puzzle connect?")
        : direction === "paper3d"
          ? text("stage_structure_paper3d", "How should the paper form take shape?")
          : direction === "papergoods"
            ? text("stage_structure_papergoods", "How should the set be organised?")
            : text("stage_structure_open", "Keep the structure open"),
      subtitle: text("stage_structure_subtitle", "Choose the main construction language"),
      options: structureOptions[direction] || structureOptions.more,
    };
  }

  function studioTemplate() {
    return `<div class="qinyi-customizer" data-phase="configuring">
      <header class="customizer-toolbar">
        <div class="customizer-brand"><strong>${copy.studioShort}</strong><span>${copy.conceptOnly}</span></div>
        <div class="customizer-progress" aria-label="${copy.progress}"><span data-progress-label>01 / 04</span><span class="customizer-progress-track" aria-hidden="true"><i data-progress-fill></i></span></div>
        <button class="customizer-icon-button customizer-back" type="button" aria-label="${copy.back}" title="${copy.back}" data-back hidden>←</button>
      </header>
      <section class="customizer-model-zone" aria-label="${copy.conceptOnly}">
        <canvas role="img" aria-label="${copy.conceptOnly}" data-model-canvas></canvas>
        <div class="customizer-model-fallback" data-model-fallback aria-hidden="true"></div>
        <div class="customizer-model-caption"><span class="customizer-badge" data-model-kind>${copy.freeModel}</span><span data-model-state>${copy.waiting}</span></div>
        <button class="customizer-icon-button customizer-reset-view" type="button" aria-label="${copy.resetView}" title="${copy.resetView}" data-reset-view>↻</button>
      </section>
      <section class="customizer-config" aria-live="polite" data-config>
        <div class="customizer-stage-copy"><span data-stage-eyebrow></span><h3 data-stage-title></h3><p data-stage-subtitle></p></div>
        <div class="customizer-carousel-shell">
          <button class="customizer-icon-button customizer-carousel-control" data-direction="previous" type="button" aria-label="${copy.previous}">←</button>
          <div class="customizer-carousel" role="listbox" data-carousel></div>
          <button class="customizer-icon-button customizer-carousel-control" data-direction="next" type="button" aria-label="${copy.next}">→</button>
        </div>
        <div class="customizer-selection"><div class="customizer-selection-readout"><strong data-active-name></strong><small data-active-index></small></div><button class="btn orange" type="button" data-confirm>${copy.choose}</button></div>
      </section>
      <section class="customizer-final" data-final hidden>
        <div class="customizer-final-copy"><span class="eyebrow">${copy.studioName}</span><h3>${copy.blueprint}</h3><p data-final-subtitle></p></div>
        <dl class="customizer-summary" data-summary></dl>
        <div class="customizer-brief">
          <div class="customizer-brief-grid">
            <div class="customizer-field"><label>${copy.useCase}<input type="text" data-brief="useCase" placeholder="${copy.useCasePlaceholder}"></label></div>
            <div class="customizer-field"><label>${copy.audience}<input type="text" data-brief="audience" placeholder="${copy.audiencePlaceholder}"></label></div>
            <div class="customizer-field"><label>${copy.quantity}<input type="text" data-brief="quantity" placeholder="${copy.quantityPlaceholder}"></label></div>
            <div class="customizer-field"><label>${copy.budget}<input type="text" data-brief="budget" placeholder="${copy.budgetPlaceholder}"></label></div>
            <div class="customizer-field"><label>${copy.delivery}<input type="date" data-brief="delivery"></label></div>
            <div class="customizer-field"><label>${copy.referenceStyle}<input type="text" data-brief="reference" placeholder="${copy.referencePlaceholder}"></label></div>
            <div class="customizer-field customizer-field--full"><label>${copy.ideaNote}<textarea data-brief="idea" placeholder="${copy.ideaPlaceholder}"></textarea></label></div>
          </div>
          <div class="customizer-final-actions"><button class="btn orange" type="button" data-add-quote>${copy.addToQuote}</button><button class="btn" type="button" data-human hidden>${copy.humanConsultant}</button></div>
          <p class="customizer-status" role="status" aria-live="polite" data-status></p>
        </div>
      </section>
    </div>`;
  }

  function createFallback(kind) {
    if (kind === "puzzle") return `<svg viewBox="0 0 180 180"><g fill="#ef5b2a" stroke="#171916" stroke-width="2"><rect x="28" y="32" width="60" height="56" rx="4"/><circle cx="88" cy="60" r="10"/><rect x="92" y="92" width="60" height="56" rx="4"/><circle cx="92" cy="120" r="10"/></g></svg>`;
    if (kind === "paper3d") return `<svg viewBox="0 0 180 180"><g fill="none" stroke="#171916" stroke-width="8"><path d="M35 132 90 34l55 98-55 28z"/><path d="M90 34v126M35 132l110 0"/></g></svg>`;
    if (kind === "papergoods") return `<svg viewBox="0 0 180 180"><g fill="#f4c542" stroke="#171916" stroke-width="3"><path d="m38 70 58-30 48 25-57 31z"/><path d="m38 70 49 26v58l-49-27z"/><path d="m87 96 57-31v57l-57 32z"/></g></svg>`;
    return `<svg viewBox="0 0 180 180"><g fill="none" stroke-linecap="round"><path d="M30 130C62 34 100 158 150 46" stroke="#3156d9" stroke-width="10"/><circle cx="57" cy="62" r="18" fill="#ef5b2a"/><circle cx="126" cy="124" r="22" fill="#f4c542"/></g></svg>`;
  }

  function drawPreview(canvas, entry) {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const width = 360;
    const height = 210;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);
    ctx.fillStyle = "#f1efe8";
    ctx.fillRect(0, 0, width, height);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    const colours = ["#ef5b2a", "#3156d9", "#0f604d", "#f4c542", "#bd3712", "#171916"];
    const type = entry.preview;

    if (["puzzle", "classic", "curve", "secret"].includes(type)) {
      [[92, 48], [180, 48], [92, 114], [180, 114]].forEach(([x, y], index) => {
        ctx.fillStyle = colours[index];
        ctx.fillRect(x, y, 72, 54);
        ctx.beginPath(); ctx.arc(x + 72, y + 27, type === "curve" ? 16 : 12, 0, Math.PI * 2); ctx.fill();
      });
      if (type === "secret") { ctx.fillStyle = "#fffefa"; ctx.fillRect(161, 93, 34, 34); }
    } else if (["paper3d", "slot", "layer", "module"].includes(type)) {
      ctx.strokeStyle = colours[1]; ctx.lineWidth = 7;
      ctx.beginPath(); ctx.moveTo(88, 158); ctx.lineTo(180, 35); ctx.lineTo(273, 158); ctx.closePath(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(180, 35); ctx.lineTo(180, 158); ctx.moveTo(88, 158); ctx.lineTo(273, 158); ctx.stroke();
      if (type === "module") { ctx.strokeStyle = colours[0]; ctx.strokeRect(135, 86, 90, 72); }
    } else if (["papergoods", "game", "cards", "pack"].includes(type)) {
      ctx.fillStyle = colours[3]; ctx.fillRect(102, 58, 145, 104);
      ctx.strokeStyle = colours[5]; ctx.lineWidth = 5; ctx.strokeRect(102, 58, 145, 104);
      ctx.fillStyle = colours[0]; ctx.fillRect(130, 79, 46, 66);
      ctx.fillStyle = colours[1]; ctx.fillRect(184, 72, 36, 54);
    } else if (["board", "lamination", "foil", "texture", "uv"].includes(type)) {
      const gradient = ctx.createLinearGradient(95, 50, 260, 165);
      gradient.addColorStop(0, type === "foil" ? colours[3] : colours[0]);
      gradient.addColorStop(1, type === "lamination" || type === "uv" ? colours[1] : colours[4]);
      ctx.fillStyle = gradient; ctx.fillRect(92, 46, 176, 122);
      ctx.strokeStyle = colours[5]; ctx.lineWidth = 4; ctx.strokeRect(92, 46, 176, 122);
      if (type === "texture") for (let x = 105; x < 260; x += 14) { ctx.beginPath(); ctx.moveTo(x, 55); ctx.lineTo(x - 38, 160); ctx.stroke(); }
    } else if (["minimal", "bold", "story", "brand"].includes(type)) {
      ctx.fillStyle = colours[1]; ctx.beginPath(); ctx.arc(180, 104, 64, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = type === "minimal" ? "#fffefa" : colours[0]; ctx.fillRect(146, 70, 68, 68);
      if (type === "story") { ctx.fillStyle = colours[3]; ctx.beginPath(); ctx.arc(180, 104, 18, 0, Math.PI * 2); ctx.fill(); }
      if (type === "brand") { ctx.strokeStyle = colours[5]; ctx.lineWidth = 6; ctx.strokeRect(160, 84, 40, 40); }
    } else {
      ctx.strokeStyle = colours[1]; ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(68, 145); ctx.bezierCurveTo(113, 34, 223, 176, 292, 62); ctx.stroke();
      ctx.fillStyle = colours[0]; ctx.beginPath(); ctx.arc(117, 79, 19, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = colours[3]; ctx.beginPath(); ctx.arc(242, 137, 25, 0, Math.PI * 2); ctx.fill();
    }
  }

  function createClientId() {
    const key = "qinyi-support-client-id";
    try {
      const saved = localStorage.getItem(key);
      if (saved) return saved;
      const generated = crypto.randomUUID();
      localStorage.setItem(key, generated);
      return generated;
    } catch (_error) {
      return crypto.randomUUID();
    }
  }

  async function apiRequest(path, options) {
    const apiBase = window.__QINYI_SUPPORT_CONFIG__?.apiBaseUrl || "";
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 25_000);
    try {
      const response = await fetch(`${apiBase}${path}`, {
        ...options,
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          "X-Client-Id": createClientId(),
          "X-Demo-User-Id": "demo-user-1",
          "X-Tenant-Id": "demo-tenant",
          ...(options?.headers || {}),
        },
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || `HTTP ${response.status}`);
      return payload;
    } finally {
      window.clearTimeout(timeout);
    }
  }

  function initializeStudio(host) {
    if (host.dataset.qinyiCustomizerReady === "true") return;
    host.dataset.qinyiCustomizerReady = "true";
    host.innerHTML = studioTemplate();
    const root = host.querySelector(".qinyi-customizer");
    const nodes = {
      progressLabel: root.querySelector("[data-progress-label]"), progressFill: root.querySelector("[data-progress-fill]"),
      back: root.querySelector("[data-back]"), modelZone: root.querySelector(".customizer-model-zone"),
      modelCanvas: root.querySelector("[data-model-canvas]"), modelFallback: root.querySelector("[data-model-fallback]"),
      modelKind: root.querySelector("[data-model-kind]"), modelState: root.querySelector("[data-model-state]"),
      resetView: root.querySelector("[data-reset-view]"), config: root.querySelector("[data-config]"),
      eyebrow: root.querySelector("[data-stage-eyebrow]"), title: root.querySelector("[data-stage-title]"),
      subtitle: root.querySelector("[data-stage-subtitle]"), carousel: root.querySelector("[data-carousel]"),
      previous: root.querySelector('[data-direction="previous"]'), next: root.querySelector('[data-direction="next"]'),
      activeName: root.querySelector("[data-active-name]"), activeIndex: root.querySelector("[data-active-index]"),
      confirm: root.querySelector("[data-confirm]"), final: root.querySelector("[data-final]"),
      finalSubtitle: root.querySelector("[data-final-subtitle]"), summary: root.querySelector("[data-summary]"),
      addQuote: root.querySelector("[data-add-quote]"), human: root.querySelector("[data-human]"), status: root.querySelector("[data-status]"),
    };
    const state = { stageIndex: 0, activeIndex: 0, answers: [], phase: "configuring", transitioning: false };
    let cards = [];
    let hoverFrame = null;
    let hoverX = 0;
    let swipeStart = null;
    let modelApi = null;
    const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const fallbackStages = () => [directionStage, structureStage(state.answers[0]?.id || "more"), finishStage, personalityStage];
    const managedCustomizer = window.QINYI_CONTENT?.customizer;
    const managedSteps = Array.isArray(managedCustomizer?.steps) ? managedCustomizer.steps : [];
    const managedStepById = (stageId) => {
      const aliases = { direction: "product", finish: "material", personality: "visual" };
      return managedSteps.find((item) => item.id === (aliases[stageId] || stageId));
    };
    const managedStages = () => fallbackStages().map((fallback) => {
      const managed = managedStepById(fallback.id);
      if (!managed) return fallback;
      const options = Array.isArray(managed.options) && managed.options.length
        ? managed.options.slice(0, 20).map((entry, index) => ({
          id: String(entry.id || `${managed.id}-${index + 1}`).slice(0, 100),
          name: String(entry[locale.toLowerCase().startsWith("zh") ? "labelZh" : "labelEn"] || entry.name || entry.labelZh || entry.labelEn || "待补充"),
          description: String(entry[locale.toLowerCase().startsWith("zh") ? "descriptionZh" : "descriptionEn"] || entry.description || ""),
          preview: String(entry.preview || fallback.options[index % fallback.options.length]?.preview || "more"),
          modelName: String(entry.modelName || fallback.options[index % fallback.options.length]?.modelName || copy.freeModel),
          kind: entry.kind === "more" ? "more" : "standard"
        }))
        : fallback.options;
      return {
        ...fallback,
        eyebrow: managed[locale.toLowerCase().startsWith("zh") ? "titleZh" : "titleEn"] || fallback.eyebrow,
        title: managed[locale.toLowerCase().startsWith("zh") ? "titleZh" : "titleEn"] || fallback.title,
        subtitle: managed[locale.toLowerCase().startsWith("zh") ? "descriptionZh" : "descriptionEn"] || fallback.subtitle,
        options
      };
    });
    const stages = () => managedStages();
    const currentStage = () => stages()[state.stageIndex];
    const progressText = (step) => {
      const localized = messages["customizer.progress"];
      return localized?.includes("{current}")
        ? localized.replaceAll("{current}", String(step))
        : `${String(step).padStart(2, "0")} / 04`;
    };
    const previewAnswers = () => {
      const entry = currentStage().options[state.activeIndex];
      const answers = state.answers.slice(0, state.stageIndex);
      answers[state.stageIndex] = { ...entry, stageId: currentStage().id, stageTitle: currentStage().eyebrow };
      return answers;
    };

    function updateModelCaption(answers, preview) {
      const direction = answers[0];
      nodes.modelKind.textContent = direction?.modelName || copy.freeModel;
      const openCount = answers.filter((entry) => entry?.kind === "more").length;
      nodes.modelState.textContent = preview
        ? format("preview", copy.preview, { name: currentStage().options[state.activeIndex].name })
        : openCount
          ? format("shaped_open", copy.shapedOpen, { count: state.answers.length, open: openCount })
          : format("shaped", copy.shaped, { count: state.answers.length });
    }

    function positionCards() {
      const width = root.clientWidth;
      const gap = Math.min(198, Math.max(104, width * .255));
      const radius = width <= 620 ? 1.35 : 2.15;
      cards.forEach((card, index) => {
        const offset = index - state.activeIndex;
        const magnitude = Math.abs(offset);
        const direction = document.documentElement.dir === "rtl" ? -1 : 1;
        const x = offset * gap * direction;
        const y = 58 - Math.min(magnitude, 2) * 23;
        card.style.transform = `translate3d(calc(-50% + ${x}px), ${y}px, ${-magnitude * 86}px) rotateY(${-offset * 17 * direction}deg) scale(${Math.max(.74, 1 - magnitude * .095)})`;
        card.style.opacity = magnitude > radius ? "0" : String(Math.max(.42, 1 - magnitude * .2));
        card.style.pointerEvents = magnitude > radius ? "none" : "auto";
        card.style.zIndex = String(30 - magnitude);
        card.setAttribute("aria-selected", index === state.activeIndex ? "true" : "false");
        card.tabIndex = index === state.activeIndex ? 0 : -1;
      });
      const entry = currentStage().options[state.activeIndex];
      nodes.activeName.textContent = entry.name;
      nodes.activeIndex.textContent = `${String(state.activeIndex + 1).padStart(2, "0")} / ${String(currentStage().options.length).padStart(2, "0")}`;
      nodes.previous.disabled = state.activeIndex === 0;
      nodes.next.disabled = state.activeIndex === currentStage().options.length - 1;
    }

    function previewActive() {
      if (state.phase !== "configuring" || state.transitioning) return;
      const answers = previewAnswers();
      updateModelCaption(answers, true);
      modelApi?.rebuild(answers);
      nodes.modelFallback.innerHTML = createFallback(answers[0]?.id || "more");
    }

    function setActive(index, focus) {
      state.activeIndex = Math.max(0, Math.min(currentStage().options.length - 1, index));
      positionCards();
      if (focus) cards[state.activeIndex]?.focus({ preventScroll: true });
      previewActive();
    }

    function renderCards() {
      nodes.carousel.replaceChildren();
      cards = currentStage().options.map((entry, index) => {
        const card = document.createElement("button");
        card.type = "button";
        card.className = "customizer-option";
        card.setAttribute("role", "option");
        card.setAttribute("aria-label", `${entry.name}, ${entry.description}`);
        card.dataset.kind = entry.kind || "standard";
        card.innerHTML = `<canvas aria-hidden="true"></canvas><span class="customizer-option-copy"><strong></strong><small></small></span>`;
        card.querySelector("strong").textContent = entry.name;
        card.querySelector("small").textContent = entry.description;
        drawPreview(card.querySelector("canvas"), entry);
        card.addEventListener("click", () => setActive(index, true));
        nodes.carousel.append(card);
        return card;
      });
      positionCards();
    }

    function updateStage() {
      const stage = currentStage();
      nodes.eyebrow.textContent = stage.eyebrow;
      nodes.title.textContent = stage.title;
      nodes.subtitle.textContent = stage.subtitle;
      nodes.progressLabel.textContent = progressText(state.stageIndex + 1);
      nodes.progressFill.style.width = `${(state.stageIndex + 1) * 25}%`;
      nodes.back.hidden = state.stageIndex === 0;
      renderCards();
      previewActive();
    }

    function confirm() {
      if (state.transitioning || state.phase !== "configuring") return;
      state.transitioning = true;
      const entry = currentStage().options[state.activeIndex];
      state.answers[state.stageIndex] = { ...entry, stageId: currentStage().id, stageTitle: currentStage().eyebrow };
      state.answers = state.answers.slice(0, state.stageIndex + 1);
      modelApi?.rebuild(state.answers);
      nodes.carousel.classList.add("is-exiting");
      const advance = () => {
        if (state.stageIndex === 3) return showFinal();
        state.stageIndex += 1;
        state.activeIndex = 0;
        nodes.carousel.classList.remove("is-exiting");
        nodes.carousel.classList.add("is-entering");
        state.transitioning = false;
        updateStage();
        requestAnimationFrame(() => requestAnimationFrame(() => nodes.carousel.classList.remove("is-entering")));
      };
      if (reducedMotion) advance(); else setTimeout(advance, 350);
    }

    function summaryText() {
      const lines = [copy.summaryLabel];
      state.answers.forEach((answer) => lines.push(`${answer.stageTitle}: ${answer.name}${answer.kind === "more" ? ` (${copy.openLabel})` : ""}`));
      root.querySelectorAll("[data-brief]").forEach((field) => {
        if (field.value.trim()) lines.push(`${field.closest("label").childNodes[0].textContent.trim()}: ${field.value.trim()}`);
      });
      return lines.join("\n");
    }

    function applyToQuote(scroll) {
      const summary = summaryText();
      const form = document.querySelector('[data-enquiry-form="quote"]');
      if (form) {
        const summaryField = form.querySelector('[name="customization brief"]');
        if (summaryField) summaryField.value = summary;
        const product = form.elements.namedItem("product");
        const direction = state.answers[0]?.id;
        const productMap = { puzzle: "jigsaw", paper3d: "3d-paper", papergoods: "other-paper" };
        if (product && productMap[direction]) product.value = productMap[direction];
        const quantity = root.querySelector('[data-brief="quantity"]')?.value.trim();
        if (quantity && form.elements.namedItem("quantity")) form.elements.namedItem("quantity").value = quantity;
      }
      try { sessionStorage.setItem("qinyi-customization-brief", summary); } catch (_error) {}
      document.dispatchEvent(new CustomEvent("qinyi:customization-ready", { detail: { summary, answers: state.answers } }));
      nodes.status.dataset.tone = "success";
      nodes.status.textContent = copy.added;
      if (scroll) document.getElementById("rfq")?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
      return summary;
    }

    async function requestHuman() {
      const summary = applyToQuote(false);
      nodes.human.disabled = true;
      nodes.status.removeAttribute("data-tone");
      nodes.status.textContent = copy.handoffPreparing;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), HANDOFF_REQUEST_TIMEOUT_MS);
      try {
        let result;
        const message = `human support / 人工客服\n${summary}`.slice(0, 1950);
        // Policy-matched chat creates the support session and handoff atomically,
        // even when an older browser session has expired.
        result = await apiRequest("/api/support/chat", {
          method: "POST",
          body: JSON.stringify({ message }),
          signal: controller.signal,
        });
        const action = result.action || result.result?.action;
        const ticketId = result.ticketId || result.handoff?.ticketId || result.handoff?.id;
        if (!ticketId || (action && action !== "handoff")) throw new Error("Human-support request was not confirmed");
        if (result.sessionId) sessionStorage.setItem("qinyi-support-session-id", result.sessionId);
        sessionStorage.setItem("qinyi-support-ticket-id", ticketId);
        sessionStorage.setItem("qinyi-support-handoff-status", "waiting_human");
        nodes.status.dataset.tone = "success";
        nodes.status.textContent = format("handoff_ready", copy.handoffReady, { ticket: ticketId });
        document.dispatchEvent(new CustomEvent("qinyi:open-support", { detail: { locale, ticketId } }));
      } catch (_error) {
        nodes.status.dataset.tone = "error";
        nodes.status.textContent = copy.handoffFailed;
      } finally {
        clearTimeout(timeout);
        nodes.human.disabled = false;
      }
    }

    function showFinal() {
      state.transitioning = false;
      state.phase = "final";
      root.dataset.phase = "final";
      nodes.config.inert = true;
      nodes.config.setAttribute("aria-hidden", "true");
      nodes.final.hidden = false;
      nodes.back.hidden = false;
      nodes.progressLabel.textContent = copy.complete;
      nodes.progressFill.style.width = "100%";
      const openCount = state.answers.filter((answer) => answer.kind === "more").length;
      nodes.finalSubtitle.textContent = openCount ? copy.finalOpen : copy.finalComplete;
      nodes.human.hidden = openCount === 0;
      nodes.summary.replaceChildren(...state.answers.map((answer) => {
        const row = document.createElement("div");
        row.className = "customizer-summary-row";
        const term = document.createElement("dt"); term.textContent = answer.stageTitle;
        const value = document.createElement("dd"); value.textContent = answer.name;
        if (answer.kind === "more") { const badge = document.createElement("span"); badge.className = "customizer-badge"; badge.textContent = copy.openLabel; value.append(badge); }
        row.append(term, value);
        return row;
      }));
      modelApi?.setFinal(true);
      if (reducedMotion) nodes.config.hidden = true; else setTimeout(() => { if (state.phase === "final") nodes.config.hidden = true; }, 700);
    }

    function goBack() {
      if (state.phase === "final") {
        state.phase = "configuring";
        root.dataset.phase = "configuring";
        nodes.final.hidden = true;
        nodes.config.hidden = false;
        nodes.config.inert = false;
        nodes.config.removeAttribute("aria-hidden");
        state.stageIndex = 3;
        state.activeIndex = Math.max(0, currentStage().options.findIndex((entry) => entry.id === state.answers[3]?.id));
        modelApi?.setFinal(false);
        updateStage();
        return;
      }
      if (state.stageIndex === 0 || state.transitioning) return;
      state.stageIndex -= 1;
      state.activeIndex = Math.max(0, currentStage().options.findIndex((entry) => entry.id === state.answers[state.stageIndex]?.id));
      state.answers = state.answers.slice(0, state.stageIndex + 1);
      updateStage();
    }

    nodes.previous.addEventListener("click", () => setActive(state.activeIndex - 1, true));
    nodes.next.addEventListener("click", () => setActive(state.activeIndex + 1, true));
    nodes.confirm.addEventListener("click", confirm);
    nodes.back.addEventListener("click", goBack);
    nodes.addQuote.addEventListener("click", () => applyToQuote(true));
    nodes.human.addEventListener("click", requestHuman);
    nodes.resetView.addEventListener("click", () => modelApi?.resetView());
    nodes.carousel.addEventListener("keydown", (event) => {
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        const step = (event.key === "ArrowRight" ? 1 : -1) * (document.documentElement.dir === "rtl" ? -1 : 1);
        setActive(state.activeIndex + step, true);
      }
    });
    nodes.carousel.addEventListener("mousemove", (event) => {
      if (event.buttons || state.transitioning) return;
      hoverX = event.clientX;
      if (hoverFrame) return;
      hoverFrame = requestAnimationFrame(() => {
        hoverFrame = null;
        let nearest = state.activeIndex;
        let distance = Infinity;
        cards.forEach((card, index) => {
          if (card.style.pointerEvents === "none") return;
          const rect = card.getBoundingClientRect();
          const nextDistance = Math.abs(hoverX - rect.left - rect.width / 2);
          if (nextDistance < distance) { distance = nextDistance; nearest = index; }
        });
        setActive(nearest, false);
      });
    });
    nodes.carousel.addEventListener("pointerdown", (event) => { if (event.pointerType !== "mouse") swipeStart = event.clientX; });
    nodes.carousel.addEventListener("pointerup", (event) => {
      if (swipeStart == null || event.pointerType === "mouse") return;
      const delta = event.clientX - swipeStart; swipeStart = null;
      if (Math.abs(delta) > 42) setActive(state.activeIndex + (delta < 0 ? 1 : -1), true);
    });
    addEventListener("resize", positionCards);
    nodes.modelFallback.innerHTML = createFallback("more");
    updateStage();

    import("./vendor/three.min.js").then((THREE) => {
      const canvas = nodes.modelCanvas;
      const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "high-performance" });
      renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.04;
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(34, 1, .1, 100);
      camera.position.set(0, .1, 6.2);
      const pivot = new THREE.Group(); scene.add(pivot);
      const modelRoot = new THREE.Group(); pivot.add(modelRoot);
      let answers = [];
      let dragging = false;
      let lastX = 0;
      let lastY = 0;
      let targetYaw = .42;
      let targetPitch = -.12;
      let finalMode = false;
      let animationId = 0;
      let firstFrame = true;
      const palette = [0xef5b2a, 0x3156d9, 0x0f604d, 0xf4c542, 0xbd3712, 0x171916];

      function material(index, accent) {
        const finish = answers.find((entry) => entry.stageId === "finish")?.id;
        const colour = palette[(index + (accent ? 2 : 0)) % palette.length];
        if (finish === "foil") return new THREE.MeshStandardMaterial({ color: colour, roughness: .2, metalness: .8 });
        if (finish === "lamination" || finish === "spot-uv") return new THREE.MeshPhysicalMaterial({ color: colour, roughness: .18, clearcoat: .7 });
        return new THREE.MeshStandardMaterial({ color: colour, roughness: finish === "board" || finish === "texture" ? .88 : .58, metalness: .04 });
      }

      function mesh(geometry, mat, position, rotation, scale, parent) {
        const item = new THREE.Mesh(geometry, mat);
        if (position) item.position.set(...position);
        if (rotation) item.rotation.set(...rotation);
        if (scale) item.scale.set(...scale);
        (parent || modelRoot).add(item);
        return item;
      }

      function dispose(object) {
        object.traverse((child) => {
          child.geometry?.dispose();
          const materials = Array.isArray(child.material) ? child.material : child.material ? [child.material] : [];
          materials.forEach((entry) => entry.dispose());
        });
      }

      function clearModel() {
        while (modelRoot.children.length) {
          const child = modelRoot.children.pop();
          dispose(child);
        }
      }

      function buildPuzzle() {
        const tile = new THREE.BoxGeometry(.94, .94, .18);
        const tab = new THREE.CylinderGeometry(.18, .18, .18, 28);
        for (let row = 0; row < 2; row += 1) for (let column = 0; column < 2; column += 1) {
          const group = new THREE.Group();
          const index = row * 2 + column;
          mesh(tile.clone(), material(index), null, null, null, group);
          mesh(tab.clone(), material(index), [column ? -.48 : .48, 0, 0], [Math.PI / 2, 0, 0], null, group);
          group.position.set((column - .5) * 1.08, (.5 - row) * 1.08, answers.find((entry) => entry.id === "secret-cut") && index === 3 ? .24 : 0);
          modelRoot.add(group);
        }
        modelRoot.rotation.set(-.18, -.2, -.04);
      }

      function buildPaper3d() {
        const structure = answers.find((entry) => entry.stageId === "structure")?.id;
        if (structure === "layer-form") {
          for (let index = 0; index < 5; index += 1) mesh(new THREE.BoxGeometry(1.65 - index * .18, .16, 1.15 - index * .1), material(index), [0, -.5 + index * .28, 0], [0, index * .18, 0]);
        } else {
          mesh(new THREE.ConeGeometry(1.08, 2.2, structure === "module-form" ? 6 : 4), material(0), [0, 0, 0], [0, .35, 0]);
          mesh(new THREE.TorusGeometry(.72, .07, 12, 48), material(2, true), [0, -.3, .5], [Math.PI / 2, 0, 0]);
        }
      }

      function buildPaperGoods() {
        const structure = answers.find((entry) => entry.stageId === "structure")?.id;
        mesh(new THREE.BoxGeometry(1.8, 1.05, .72), material(0), [0, -.35, 0], [-.08, .28, 0]);
        if (structure === "game-kit") mesh(new THREE.BoxGeometry(1.45, .08, 1.1), material(1), [0, .52, 0], [-.1, .24, 0]);
        else if (structure === "card-set") for (let index = 0; index < 4; index += 1) mesh(new THREE.BoxGeometry(.65, .92, .04), material(index + 1), [-.38 + index * .25, .5 + index * .04, .15 + index * .08], [0, .18, -.08 + index * .04]);
        else mesh(new THREE.BoxGeometry(1.42, .24, .62), material(3, true), [0, .45, .1], [0, .28, 0]);
      }

      function buildOpen() {
        mesh(new THREE.IcosahedronGeometry(1.05, 2), new THREE.MeshStandardMaterial({ color: palette[1], wireframe: true }), [0, 0, 0], [.2, .2, 0], [1, 1.18, 1]);
        mesh(new THREE.TorusGeometry(1.2, .08, 12, 64), material(1, true), [0, 0, 0], [.8, .24, .4]);
      }

      function addStyle() {
        const style = answers.find((entry) => entry.stageId === "personality")?.id;
        if (style === "bold") for (let index = 0; index < 4; index += 1) mesh(new THREE.SphereGeometry(.12, 16, 12), material(index, true), [-.78 + index * .52, 1.18 - (index % 2) * .22, .45]);
        if (style === "story") mesh(new THREE.ConeGeometry(.25, .62, 5), material(3, true), [.75, -.92, .4], [0, 0, -.18]);
        if (style === "brand") mesh(new THREE.TorusGeometry(.35, .065, 14, 48), material(3, true), [0, .1, 1.03]);
        answers.filter((entry) => entry.kind === "more").forEach((_entry, index) => mesh(new THREE.TorusGeometry(1.22 + index * .1, .025, 8, 64), new THREE.MeshBasicMaterial({ color: palette[(index + 3) % 6], wireframe: true }), [0, 0, 0], [.3 + index * .35, .2 + index * .25, index * .15]));
      }

      function rebuild(nextAnswers) {
        answers = nextAnswers.filter(Boolean).map((entry) => ({ ...entry }));
        clearModel();
        modelRoot.rotation.set(0, 0, 0);
        const direction = answers[0]?.id || "more";
        if (direction === "puzzle") buildPuzzle();
        else if (direction === "paper3d") buildPaper3d();
        else if (direction === "papergoods") buildPaperGoods();
        else buildOpen();
        addStyle();
      }

      const hemisphere = new THREE.HemisphereLight(0xfffefa, 0x62655f, 2.2); scene.add(hemisphere);
      const key = new THREE.DirectionalLight(0xffffff, 3.1); key.position.set(3.4, 4.8, 5.2); scene.add(key);
      const rim = new THREE.DirectionalLight(0x3156d9, 2.2); rim.position.set(-4, 1.5, -2.5); scene.add(rim);
      const floor = mesh(new THREE.CircleGeometry(1.45, 64), new THREE.MeshBasicMaterial({ color: 0x171916, transparent: true, opacity: .08 }), [0, -1.45, 0], [-Math.PI / 2, 0, 0], null, scene);
      floor.userData.floor = true;

      function resize() {
        const rect = nodes.modelZone.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        renderer.setSize(rect.width, rect.height, false);
        camera.aspect = rect.width / rect.height;
        camera.updateProjectionMatrix();
      }
      const resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(nodes.modelZone);
      canvas.addEventListener("pointerdown", (event) => { dragging = true; lastX = event.clientX; lastY = event.clientY; canvas.setPointerCapture(event.pointerId); });
      canvas.addEventListener("pointermove", (event) => { if (!dragging) return; targetYaw += (event.clientX - lastX) * .008; targetPitch = Math.max(-.55, Math.min(.55, targetPitch + (event.clientY - lastY) * .006)); lastX = event.clientX; lastY = event.clientY; });
      canvas.addEventListener("pointerup", (event) => { dragging = false; if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId); });
      canvas.addEventListener("webglcontextlost", (event) => { event.preventDefault(); nodes.modelFallback.style.display = "grid"; });
      canvas.addEventListener("webglcontextrestored", () => {
        firstFrame = true;
        nodes.modelFallback.style.display = "grid";
        rebuild(answers);
      });

      function animate() {
        if (!document.hidden) {
          pivot.rotation.y += (targetYaw - pivot.rotation.y) * .08;
          pivot.rotation.x += (targetPitch - pivot.rotation.x) * .08;
          if (finalMode && !dragging && !reducedMotion) targetYaw += .002;
          camera.position.z += ((finalMode ? 5.45 : 6.2) - camera.position.z) * .08;
          renderer.render(scene, camera);
          if (firstFrame) { firstFrame = false; nodes.modelFallback.style.display = "none"; }
        }
        animationId = requestAnimationFrame(animate);
      }

      modelApi = { rebuild, resetView() { targetYaw = .42; targetPitch = -.12; }, setFinal(value) { finalMode = value; } };
      rebuild(previewAnswers());
      resize();
      animate();
      let disposed = false;
      const handlePageHide = (event) => {
        if (event.persisted) return;
        if (disposed) return;
        disposed = true;
        cancelAnimationFrame(animationId);
        if (hoverFrame) cancelAnimationFrame(hoverFrame);
        resizeObserver.disconnect();
        removeEventListener("resize", positionCards);
        dispose(scene);
        scene.clear();
        renderer.dispose();
        removeEventListener("pagehide", handlePageHide);
      };
      addEventListener("pagehide", handlePageHide);
    }).catch(() => {
      nodes.modelCanvas.hidden = true;
      nodes.modelFallback.style.display = "grid";
    });
  }

  function initializeAll() {
    document.querySelectorAll("[data-qinyi-customizer]").forEach(initializeStudio);
  }

  if (window.QINYI_CONTENT) initializeAll();
  else {
    let initialized = false;
    document.addEventListener("qinyi:content-ready", () => { if (!initialized) { initialized = true; initializeAll(); } }, { once: true });
    window.setTimeout(() => { if (!initialized) { initialized = true; initializeAll(); } }, 1200);
  }
}());
