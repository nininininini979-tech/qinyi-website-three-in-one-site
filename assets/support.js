(function () {
  "use strict";

  const NORMAL_REQUEST_TIMEOUT_MS = 45_000;
  const PROFESSIONAL_REQUEST_TIMEOUT_MS = 60_000;
  const EVENT_POLL_INTERVAL_MS = 3_000;
  const EVENT_POLL_MAX_BACKOFF_MS = 30_000;
  const EVENT_POLL_TIMEOUT_MS = 12_000;
  const HANDOFF_STATUS_RANK = Object.freeze({
    waiting_human: 0,
    acknowledged: 1,
    human_active: 2,
    resolved: 3,
  });
  const runtimeConfig = window.__QINYI_SUPPORT_CONFIG__ || {};
  const localeConfig = window.__QINYI_SUPPORT_LOCALE__ || { requested: "zh-CN", locale: "zh-CN" };
  const englishCopy = {
    me: "Me", support: "Support", you: "You", assistant: "AI support",
    manualTitle: "Business confirmation required",
    manualDetail: "This request needs a Qinyi team member. Use the human-support action below to start a real handoff.",
    handoffCreated: "Support request prepared", handoffPending: "Human support required",
    handoffDetail: "A Qinyi team member will need to continue from the information in this conversation.",
    restrictedTitle: "Human review required",
    restrictedDetail: "The AI cannot approve refunds, compensation, contracts or other binding commitments.",
    ticket: "Reference", contactHuman: "Contact Qinyi", contactHumanMessage: "Please help me contact a Qinyi team member.",
    source: "Knowledge source", sourcePages: "pages/section", references: "References",
    generating: "Qinyi AI is preparing a response", professionalStart: "Structuring the professional question",
    normalStart: "Understanding your question", matching: "Matching approved information", reviewing: "Reviewing the response",
    handoffFallback: "Your request needs a Qinyi team member to continue.",
    refuseFallback: "This request is outside the AI support service boundary.",
    emptyFallback: "No reliable answer was returned. Please try again.", unavailable: "The service cannot process this message right now.",
    active: "Active", timeout: "The response took too long. Please try again.", network: "The connection failed. Please try again.",
    requestId: "Request ID", sendFailed: "Message not sent", notStarted: "Not started", newConversation: "New conversation started",
    resetFailed: "Session reset failed", viewCleared: "Conversation cleared on this page",
    resetDetail: "The server session could not be reset. Your next message will still start a separate conversation.",
    manualMode: "Human support mode", manualService: "Human support",
    manualServiceDetail: "AI replies remain available while a Qinyi manager joins the conversation.", manualPriority: "AI + human",
    online: "Online", onlineTitle: "Qinyi AI is online", onlineDetail: "The approved knowledge and conversation services are connected.",
    aiMode: "AI support", statusUnknown: "Status unavailable", statusUnknownTitle: "Service status unavailable",
    statusUnknownDetail: "The service status could not be read. You can still try sending a message.", waiting: "Waiting for connection",
    professionalOn: "Professional consultation enabled", professionalOff: "Standard consultation enabled",
    humanSupport: "Qinyi human support", system: "System",
    waitingHumanTitle: "Connecting you with human support", waitingHumanBadge: "Waiting",
    waitingHumanDetail: "Your request is in the human-support queue. You can continue adding details.",
    acknowledgedTitle: "Qinyi has received your request", acknowledgedBadge: "Acknowledged",
    acknowledgedDetail: "The support team has been notified and your conversation is waiting to be claimed.",
    humanActiveTitle: "Human support is now active", humanActiveBadge: "Connected",
    humanActiveDetail: "Human support has joined. AI remains available and every reply is identified by source.",
    resolvedTitle: "Human support has ended", resolvedBadge: "Resolved",
    resolvedDetail: "This handoff has been resolved. AI support is available again unless the team has kept this conversation human-only.",
    ticketLabel: "Support reference", humanMessageQueued: "Your message was sent to Qinyi human support.",
    waitingHumanEvent: "A human-support request has been created.", acknowledgedEvent: "Qinyi has acknowledged your support request.",
    humanActiveEvent: "Qinyi human support has joined the conversation. AI support remains available.",
    resolvedEvent: "Human support has ended. AI support is available again.",
    humanConversationMode: "Human support",
    attachmentNeedsSession: "Send a message before attaching a file to this conversation.",
    attachmentTooLarge: "Attachments cannot exceed 25MB.",
    attachmentUploading: "Securely uploading the attachment...",
    attachmentUploaded: "Attachment uploaded and retained with this conversation.",
    attachmentFailed: "Attachment upload failed",
  };

  function copy(key, fallback) {
    return localeConfig.locale === "en" ? (englishCopy[key] || fallback) : fallback;
  }
  const API_BASE_URL = typeof runtimeConfig.apiBaseUrl === "string"
    ? runtimeConfig.apiBaseUrl.trim().replace(/\/+$/, "")
    : "";

  function apiUrl(path) {
    return `${API_BASE_URL}${path}`;
  }

  function storageRead(storage, key) {
    try {
      return storage.getItem(key);
    } catch (_error) {
      return null;
    }
  }

  function storageWrite(storage, key, value) {
    try {
      if (value == null) storage.removeItem(key);
      else storage.setItem(key, value);
    } catch (_error) {
      // Storage can be unavailable in privacy-focused browser modes.
    }
  }

  function fallbackUuid() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (token) {
      const random = Math.floor(Math.random() * 16);
      const value = token === "x" ? random : (random & 0x3) | 0x8;
      return value.toString(16);
    });
  }

  function visitorId() {
    const key = "qinyi-support-client-id";
    const existing = storageRead(window.localStorage, key);
    if (existing) return existing;
    const generated = window.crypto && typeof window.crypto.randomUUID === "function"
      ? window.crypto.randomUUID()
      : fallbackUuid();
    storageWrite(window.localStorage, key, generated);
    return generated;
  }

  const API_HEADERS = {
    "Content-Type": "application/json",
    "X-Client-Id": visitorId(),
    "X-Demo-User-Id": "demo-user-1",
    "X-Tenant-Id": "demo-tenant",
  };

  const state = {
    sessionId: storageRead(window.sessionStorage, "qinyi-support-session-id"),
    pending: false,
    controller: null,
    lastFailedMessage: null,
    toastTimer: null,
    professionalConsultation: storageRead(window.sessionStorage, "qinyi-professional-consultation") === "true",
    progressTimer: null,
    normalServerBudgetMs: 40_000,
    professionalServerBudgetMs: 55_000,
    normalRequestTimeoutMs: NORMAL_REQUEST_TIMEOUT_MS,
    professionalRequestTimeoutMs: PROFESSIONAL_REQUEST_TIMEOUT_MS,
    handoffStatus: storageRead(window.sessionStorage, "qinyi-support-handoff-status") || "ai_active",
    ticketId: storageRead(window.sessionStorage, "qinyi-support-ticket-id"),
    handoffUpdatedAt: null,
    eventCursor: "0",
    eventPollTimer: null,
    eventPollController: null,
    eventPollInFlight: false,
    eventPollFailures: 0,
    seenEventIds: new Set(),
    recentMessages: [],
    lastAnnouncedHandoffStatus: null,
  };

  const elements = {
    chatForm: document.getElementById("chatForm"),
    messageInput: document.getElementById("messageInput"),
    sendButton: document.getElementById("sendButton"),
    fileInput: document.getElementById("supportFileInput"),
    messages: document.getElementById("messages"),
    emptyState: document.getElementById("emptyState"),
    newConversationButton: document.getElementById("newConversationButton"),
    sessionState: document.getElementById("sessionState"),
    serviceMode: document.getElementById("serviceMode"),
    headerStatus: document.getElementById("headerStatus"),
    headerStatusText: document.getElementById("headerStatusText"),
    mobileStatusText: document.getElementById("mobileStatusText"),
    sidebarStatusBadge: document.getElementById("sidebarStatusBadge"),
    serviceStatusTitle: document.getElementById("serviceStatusTitle"),
    serviceStatusDetail: document.getElementById("serviceStatusDetail"),
    errorBanner: document.getElementById("errorBanner"),
    errorTitle: document.getElementById("errorTitle"),
    errorMessage: document.getElementById("errorMessage"),
    retryButton: document.getElementById("retryButton"),
    dismissErrorButton: document.getElementById("dismissErrorButton"),
    toast: document.getElementById("toast"),
    professionalConsultationButton: document.getElementById("professionalConsultationButton"),
    handoffStatus: document.getElementById("handoffStatus"),
    handoffStatusTitle: document.getElementById("handoffStatusTitle"),
    handoffStatusBadge: document.getElementById("handoffStatusBadge"),
    handoffStatusDetail: document.getElementById("handoffStatusDetail"),
    handoffTicket: document.getElementById("handoffTicket"),
  };

  function setText(element, value) {
    element.textContent = value == null ? "" : String(value);
  }

  function updateSendButton() {
    elements.sendButton.disabled = state.pending || !elements.messageInput.value.trim();
  }

  function resizeComposer() {
    elements.messageInput.style.height = "auto";
    elements.messageInput.style.height = `${Math.min(elements.messageInput.scrollHeight, 120)}px`;
  }

  function scrollToLatest() {
    window.requestAnimationFrame(function () {
      elements.messages.scrollTop = elements.messages.scrollHeight;
    });
  }

  function formatTime(value) {
    const date = value ? new Date(value) : new Date();
    return new Intl.DateTimeFormat(localeConfig.requested || "zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(Number.isNaN(date.getTime()) ? new Date() : date);
  }

  function authorForRole(role) {
    if (role === "user") return copy("you", "您");
    if (role === "human") return copy("humanSupport", "勤益人工客服");
    if (role === "system") return copy("system", "系统");
    return copy("assistant", "智能客服");
  }

  function createMessage(role, text, responseData, options) {
    const settings = options || {};
    const article = document.createElement("article");
    article.className = `message message--${role}`;
    if (settings.eventId) article.dataset.eventId = settings.eventId;

    const avatar = document.createElement("div");
    avatar.className = "message-avatar";
    avatar.setAttribute("aria-hidden", "true");
    setText(avatar, role === "user" ? copy("me", "我") : role === "human" ? copy("humanSupport", "勤益人工客服") : copy("support", "客服"));

    const content = document.createElement("div");
    content.className = "message-content";

    const meta = document.createElement("div");
    meta.className = "message-meta";

    const author = document.createElement("span");
    setText(author, authorForRole(role));
    const time = document.createElement("time");
    setText(time, formatTime(settings.createdAt));
    meta.append(author, time);

    const bubble = document.createElement("div");
    bubble.className = "message-bubble";
    const paragraph = document.createElement("p");
    paragraph.className = "message-text";
    paragraph.textContent = text;
    bubble.appendChild(paragraph);

    if ((role === "assistant" || role === "human") && responseData) {
      appendActionState(bubble, responseData);
      appendCitations(bubble, responseData.citations);
    }

    content.append(meta, bubble);
    article.append(avatar, content);
    return article;
  }

  function normalizeAction(action) {
    if (typeof action === "string") {
      return action.toLowerCase();
    }
    if (action && typeof action === "object") {
      const value = action.type || action.action || action.name || action.status;
      return typeof value === "string" ? value.toLowerCase() : "";
    }
    return "";
  }

  function normalizeHandoffStatus(value) {
    const status = normalizeAction(value).replace(/[\s-]+/g, "_");
    if ([
      "waiting_human", "waiting", "requested", "request_human", "request_handoff", "handoff_requested",
      "human_requested", "handoff", "human_handoff", "ticket_created", "escalate", "queued",
    ].includes(status)) {
      return "waiting_human";
    }
    if (["acknowledged", "ack", "notified", "human_acknowledged"].includes(status)) {
      return "acknowledged";
    }
    if (["human_active", "waiting_customer", "active", "claimed", "human_joined", "operator_active"].includes(status)) {
      return "human_active";
    }
    if (["resolved", "closed", "completed", "ai_resumed", "resume_ai", "returned_to_ai"].includes(status)) {
      return "resolved";
    }
    return "";
  }

  function extractHandoff(source) {
    if (!source || typeof source !== "object") return null;
    const nested = source.handoff && typeof source.handoff === "object" ? source.handoff : {};
    const actionObject = source.action && typeof source.action === "object" ? source.action : {};
    const action = normalizeAction(source.action || nested.action || source.type);
    const ticketId = nested.ticketId || nested.ticketID || nested.id || actionObject.ticketId ||
      source.ticketId || source.ticketID || null;
    const status = normalizeHandoffStatus(
      nested.status || nested.state || actionObject.status || actionObject.state ||
        (typeof source.handoff === "string" ? source.handoff : "") || source.handoffStatus ||
        source.handoff_state || source.status || action,
    );
    const handoffActions = [
      "handoff", "human_handoff", "ticket_created", "escalate", "request_human", "request_handoff", "handoff_requested",
    ];
    if (!status && !ticketId && !handoffActions.includes(action)) {
      return null;
    }
    return {
      ticketId: ticketId == null ? null : String(ticketId),
      status: status || "waiting_human",
      updatedAt: nested.updatedAt || nested.updated_at || actionObject.updatedAt || source.updatedAt || source.updated_at || null,
    };
  }

  function handoffCopy(status) {
    if (status === "acknowledged") {
      return {
        title: copy("acknowledgedTitle", "勤益已收到人工服务请求"),
        badge: copy("acknowledgedBadge", "已知晓"),
        detail: copy("acknowledgedDetail", "客服团队已收到通知，会话正在等待认领。"),
        event: copy("acknowledgedEvent", "勤益已知晓您的人工服务请求。"),
      };
    }
    if (status === "human_active") {
      return {
        title: copy("humanActiveTitle", "人工客服已接入"),
        badge: copy("humanActiveBadge", "已接通"),
        detail: copy("humanActiveDetail", "AI 自动回复已暂停，新消息将发送给勤益人工客服。"),
        event: copy("humanActiveEvent", "勤益人工客服已加入对话，AI 自动回复已暂停。"),
      };
    }
    if (status === "resolved") {
      return {
        title: copy("resolvedTitle", "人工服务已结束"),
        badge: copy("resolvedBadge", "已解决"),
        detail: copy("resolvedDetail", "本次人工接管已结束；如未被设为仅人工，会话已恢复智能客服。"),
        event: copy("resolvedEvent", "人工服务已结束，会话已恢复智能客服。"),
      };
    }
    return {
      title: copy("waitingHumanTitle", "正在联系人工客服"),
      badge: copy("waitingHumanBadge", "等待接管"),
      detail: copy("waitingHumanDetail", "您的消息已进入人工服务队列，您可以继续补充信息。"),
      event: copy("waitingHumanEvent", "已创建人工服务请求。"),
    };
  }

  function applyHandoff(handoff, options) {
    if (!handoff) return;
    const settings = options || {};
    const incomingTicketId = handoff.ticketId == null ? state.ticketId : String(handoff.ticketId);
    const ticketChanged = Boolean(incomingTicketId && state.ticketId && incomingTicketId !== state.ticketId);
    if (ticketChanged) {
      state.eventCursor = "0";
      state.seenEventIds.clear();
      state.recentMessages = [];
      state.handoffUpdatedAt = null;
      state.lastAnnouncedHandoffStatus = null;
    }
    const incomingStatus = handoff.status || state.handoffStatus;
    const incomingTime = handoff.updatedAt ? Date.parse(handoff.updatedAt) : NaN;
    const currentTime = state.handoffUpdatedAt ? Date.parse(state.handoffUpdatedAt) : NaN;
    const olderTimestamp = !ticketChanged && Number.isFinite(incomingTime) && Number.isFinite(currentTime) && incomingTime < currentTime;
    const statusRegression = !ticketChanged && !Number.isFinite(incomingTime) &&
      (HANDOFF_STATUS_RANK[incomingStatus] ?? -1) < (HANDOFF_STATUS_RANK[state.handoffStatus] ?? -1);
    if (olderTimestamp || statusRegression) return;
    const previousStatus = state.handoffStatus;
    if (incomingTicketId) state.ticketId = incomingTicketId;
    if (handoff.updatedAt) state.handoffUpdatedAt = handoff.updatedAt;
    state.handoffStatus = incomingStatus;
    storageWrite(window.sessionStorage, "qinyi-support-ticket-id", state.ticketId);
    storageWrite(window.sessionStorage, "qinyi-support-handoff-status", state.handoffStatus);
    const statusCopy = handoffCopy(state.handoffStatus);

    elements.handoffStatus.hidden = false;
    elements.handoffStatus.dataset.status = state.handoffStatus;
    setText(elements.handoffStatusTitle, statusCopy.title);
    setText(elements.handoffStatusBadge, statusCopy.badge);
    setText(elements.handoffStatusDetail, statusCopy.detail);
    if (state.ticketId) {
      setText(elements.handoffTicket, `${copy("ticketLabel", "服务编号")}：${state.ticketId}`);
      elements.handoffTicket.hidden = false;
    }
    syncConversationMode();

    const shouldAnnounce = settings.announce !== false && state.lastAnnouncedHandoffStatus !== state.handoffStatus;
    if (shouldAnnounce && (previousStatus !== state.handoffStatus || state.lastAnnouncedHandoffStatus == null)) {
      appendTranscriptMessage("system", statusCopy.event, null, { createdAt: handoff.updatedAt });
      state.lastAnnouncedHandoffStatus = state.handoffStatus;
    } else if (settings.announce === false) {
      state.lastAnnouncedHandoffStatus = state.handoffStatus;
    }
    if (state.handoffStatus === "resolved") stopEventPolling();
    else startEventPolling();
  }

  function appendActionState(container, responseData) {
    const action = normalizeAction(responseData.action);
    const handoff = extractHandoff(responseData);
    const hasTicket = Boolean(handoff && handoff.ticketId);
    const isHandoff = Boolean(handoff);
    const isRefusal = ["refuse", "refused", "restricted"].includes(action);
    const isManualRequired = action === "manual_required";

    if (!isHandoff && !isRefusal && !isManualRequired) {
      return;
    }

    const block = document.createElement("div");
    block.className = `action-state${isHandoff ? " action-state--handoff" : ""}`;

    const title = document.createElement("strong");
    const detail = document.createElement("p");

    if (isManualRequired) {
      setText(title, copy("manualTitle", "需要业务人员确认"));
      setText(detail, copy("manualDetail", "该事项需要勤益业务人员确认，您可以在下方发起真实人工接管。"));
    } else if (isHandoff) {
      const statusCopy = handoffCopy(handoff ? handoff.status : "waiting_human");
      setText(title, statusCopy.title);
      setText(detail, statusCopy.detail);
    } else {
      setText(title, copy("restrictedTitle", "该事项需要人工处理"));
      setText(detail, copy("restrictedDetail", "智能客服不会审批退款、赔偿、合同或其他具有约束力的承诺。"));
    }

    block.append(title, detail);

    if (hasTicket) {
      const ticket = document.createElement("p");
      ticket.className = "action-ticket";
      setText(ticket, `${copy("ticket", "参考编号")}：${handoff.ticketId}`);
      block.appendChild(ticket);
    } else if (isRefusal || isManualRequired) {
      const handoffButton = document.createElement("button");
      handoffButton.type = "button";
      handoffButton.className = "action-button";
      setText(handoffButton, copy("contactHuman", "联系勤益"));
      handoffButton.addEventListener("click", function () {
        sendMessage(copy("contactHumanMessage", "请帮我联系勤益业务人员。"));
      });
      block.appendChild(handoffButton);
    }

    container.appendChild(block);
  }

  function citationParts(citation, index) {
    if (typeof citation === "string") {
      return { title: citation, snippet: "" };
    }

    if (!citation || typeof citation !== "object") {
      return { title: `${copy("source", "知识库来源")} ${index + 1}`, snippet: "" };
    }

    const label = citation.title || citation.filename;
    const title =
      (citation.title && citation.filename ? `${citation.title} · ${citation.filename}` : label) ||
      citation.fileName ||
      citation.name ||
      citation.source ||
      `${copy("source", "知识库来源")} ${index + 1}`;
    const sourceLocation = citation.source
      ? `${citation.source}${citation.sourcePages ? ` · ${copy("sourcePages", "页码/章节")} ${citation.sourcePages}` : ""}`
      : "";
    const snippet = sourceLocation || citation.snippet || citation.quote || citation.text || citation.content || "";
    return { title: String(title), snippet: String(snippet) };
  }

  function appendCitations(container, citations) {
    const items = Array.isArray(citations) ? citations.filter(Boolean).slice(0, 6) : [];
    if (!items.length) {
      return;
    }

    const details = document.createElement("details");
    details.className = "citations";
    const summary = document.createElement("summary");
    setText(summary, `${copy("references", "参考依据")}（${items.length}）`);
    const list = document.createElement("ol");
    list.className = "citation-list";

    items.forEach(function (citation, index) {
      const parts = citationParts(citation, index);
      const item = document.createElement("li");
      item.className = "citation-item";
      const title = document.createElement("span");
      title.className = "citation-title";
      setText(title, parts.title);
      item.appendChild(title);

      if (parts.snippet && parts.snippet !== parts.title) {
        const snippet = document.createElement("span");
        snippet.className = "citation-snippet";
        setText(snippet, parts.snippet);
        item.appendChild(snippet);
      }

      list.appendChild(item);
    });

    details.append(summary, list);
    container.appendChild(details);
  }

  function appendUserMessage(message) {
    elements.emptyState.hidden = true;
    elements.messages.appendChild(createMessage("user", message));
    rememberRecentMessage("user", message);
    scrollToLatest();
  }

  function appendAssistantMessage(answer, responseData) {
    appendTranscriptMessage("assistant", answer, responseData);
  }

  function rememberRecentMessage(role, text) {
    state.recentMessages.push({ role: role, text: String(text) });
    if (state.recentMessages.length > 200) state.recentMessages.shift();
  }

  function consumeRecentMessage(role, text) {
    const normalizedText = String(text);
    const index = state.recentMessages.findIndex(function (item) {
      return item.role === role && item.text === normalizedText;
    });
    if (index < 0) return false;
    state.recentMessages.splice(index, 1);
    return true;
  }

  function appendTranscriptMessage(role, text, responseData, options) {
    const settings = options || {};
    const normalizedText = String(text || "").trim();
    if (!normalizedText) return;
    if (settings.fromEvent && consumeRecentMessage(role, normalizedText)) return;
    elements.emptyState.hidden = true;
    elements.messages.appendChild(createMessage(role, normalizedText, responseData, settings));
    if (!settings.fromEvent) rememberRecentMessage(role, normalizedText);
    scrollToLatest();
  }

  function showTyping(professional) {
    const article = document.createElement("article");
    article.id = "typingIndicator";
    article.className = "message message--assistant typing-indicator";

    const avatar = document.createElement("div");
    avatar.className = "message-avatar";
    avatar.setAttribute("aria-hidden", "true");
    setText(avatar, copy("support", "客服"));

    const content = document.createElement("div");
    content.className = "message-content";
    const meta = document.createElement("div");
    meta.className = "message-meta";
    setText(meta, copy("assistant", "智能客服"));
    const bubble = document.createElement("div");
    bubble.className = "message-bubble";
    bubble.setAttribute("aria-label", copy("generating", "智能客服正在生成答复"));
    const status = document.createElement("div");
    status.className = "typing-status";
    const label = document.createElement("span");
    label.id = "typingProgressLabel";
    setText(label, professional ? copy("professionalStart", "正在整理专业问题") : copy("normalStart", "正在理解您的问题"));
    const dots = document.createElement("span");
    dots.className = "typing-dots";
    dots.setAttribute("aria-hidden", "true");
    dots.append(document.createElement("span"), document.createElement("span"), document.createElement("span"));
    status.append(label, dots);
    const progress = document.createElement("div");
    progress.className = "response-progress";
    progress.setAttribute("role", "progressbar");
    progress.setAttribute("aria-valuemin", "0");
    progress.setAttribute("aria-valuemax", "100");
    progress.setAttribute("aria-valuenow", "6");
    const bar = document.createElement("div");
    bar.className = "response-progress__bar";
    progress.appendChild(bar);
    bubble.append(status, progress);
    content.append(meta, bubble);
    article.append(avatar, content);
    elements.messages.appendChild(article);
    elements.messages.setAttribute("aria-busy", "true");
    const startedAt = Date.now();
    const budget = professional ? state.professionalServerBudgetMs : state.normalServerBudgetMs;
    window.clearInterval(state.progressTimer);
    state.progressTimer = window.setInterval(function () {
      const ratio = Math.min(1, (Date.now() - startedAt) / budget);
      const percent = Math.min(92, Math.round(6 + ratio * 86));
      bar.style.width = `${percent}%`;
      progress.setAttribute("aria-valuenow", String(percent));
      setText(label, ratio < 0.28
        ? (professional ? copy("professionalStart", "正在整理专业问题") : copy("normalStart", "正在理解您的问题"))
        : ratio < 0.7 ? copy("matching", "正在匹配资料") : copy("reviewing", "正在审核答复"));
    }, 500);
    scrollToLatest();
  }

  function hideTyping() {
    window.clearInterval(state.progressTimer);
    state.progressTimer = null;
    const indicator = document.getElementById("typingIndicator");
    if (indicator) {
      indicator.remove();
    }
    elements.messages.removeAttribute("aria-busy");
  }

  function showError(title, message, retryable) {
    setText(elements.errorTitle, title);
    setText(elements.errorMessage, message);
    elements.retryButton.hidden = !retryable;
    elements.errorBanner.hidden = false;
  }

  function hideError() {
    elements.errorBanner.hidden = true;
  }

  function showToast(message) {
    window.clearTimeout(state.toastTimer);
    setText(elements.toast, message);
    elements.toast.hidden = false;
    state.toastTimer = window.setTimeout(function () {
      elements.toast.hidden = true;
    }, 4000);
  }

  function setPending(pending) {
    state.pending = pending;
    elements.newConversationButton.disabled = false;
    elements.professionalConsultationButton.disabled = pending || isHumanFlow();
    updateSendButton();
  }

  function isHumanFlow() {
    return ["waiting_human", "acknowledged", "human_active"].includes(state.handoffStatus);
  }

  function syncConversationMode() {
    if (isHumanFlow()) {
      setText(elements.serviceMode, copy("humanConversationMode", "人工客服"));
    } else if (state.handoffStatus === "resolved") {
      setText(elements.serviceMode, copy("aiMode", "智能答复"));
    }
    elements.professionalConsultationButton.disabled = state.pending || isHumanFlow();
  }

  function resumeAiConversation() {
    if (state.handoffStatus !== "resolved") return;
    state.handoffStatus = "ai_active";
    state.ticketId = null;
    state.handoffUpdatedAt = null;
    state.eventCursor = "0";
    state.seenEventIds.clear();
    state.lastAnnouncedHandoffStatus = null;
    storageWrite(window.sessionStorage, "qinyi-support-ticket-id", null);
    storageWrite(window.sessionStorage, "qinyi-support-handoff-status", null);
    elements.handoffStatus.hidden = true;
    elements.handoffStatus.removeAttribute("data-status");
    elements.handoffTicket.hidden = true;
    syncConversationMode();
  }

  async function readResponse(response) {
    const body = await response.text();
    if (!body) {
      return {};
    }
    try {
      return JSON.parse(body);
    } catch (_error) {
      return { error: body };
    }
  }

  function eventValue(event, names) {
    const sources = [
      event,
      event && event.event,
      event && event.data,
      event && event.payload,
      event && event.message,
      event && event.data && event.data.message,
      event && event.payload && event.payload.message,
    ].filter(function (item) {
      return item && typeof item === "object";
    });
    for (const source of sources) {
      for (const name of names) {
        if (source[name] != null) return source[name];
      }
    }
    return null;
  }

  function eventText(event) {
    if (!event || typeof event !== "object") return "";
    if (typeof event.message === "string") return event.message;
    const value = eventValue(event, ["text", "content", "body", "answer"]);
    if (typeof value === "string") return value;
    if (value && typeof value === "object") {
      return String(value.text || value.content || value.body || "");
    }
    const message = eventValue(event, ["message"]);
    return message && typeof message === "object" ? String(message.text || message.content || message.body || "") : "";
  }

  function eventRole(event) {
    const rawRole = String(eventValue(event, ["role", "actorType", "senderType", "authorType", "source"]) || "").toLowerCase();
    const rawType = String(eventValue(event, ["type", "eventType", "kind"]) || "").toLowerCase();
    const combined = `${rawRole} ${rawType}`;
    if (/human|operator|agent|admin|staff/.test(combined) && !/handoff_status|system/.test(combined)) return "human";
    if (/visitor|customer|client|user_message|customer_message/.test(combined) || rawRole === "user") return "user";
    if (/system|status|handoff|resolved|joined|acknowledged/.test(combined)) return "system";
    return "assistant";
  }

  function eventIdentity(event, index) {
    const value = eventValue(event, ["id", "eventId", "event_id", "sequence", "seq", "cursor"]);
    return value == null ? "" : String(value);
  }

  function processSessionEvent(event, index) {
    if (!event || typeof event !== "object") return;
    const eventId = eventIdentity(event, index);
    if (eventId && state.seenEventIds.has(eventId)) return;
    if (eventId) state.seenEventIds.add(eventId);

    const text = eventText(event).trim();
    const handoff = extractHandoff(event.data && typeof event.data === "object" ? Object.assign({}, event, event.data) : event);
    if (handoff) applyHandoff(handoff, { announce: !text });

    if (text) {
      const role = eventRole(event);
      const createdAt = eventValue(event, ["createdAt", "created_at", "timestamp", "updatedAt", "updated_at"]);
      const citations = eventValue(event, ["citations", "references"]);
      appendTranscriptMessage(role, text, citations ? { citations: citations } : null, {
        eventId: eventId,
        createdAt: createdAt,
        fromEvent: true,
      });
    }
  }

  function processSessionEvents(data) {
    const handoff = extractHandoff(data);
    const events = Array.isArray(data)
      ? data
      : Array.isArray(data.events)
        ? data.events
        : Array.isArray(data.items)
          ? data.items
          : data.data && Array.isArray(data.data.events) ? data.data.events : [];
    if (handoff) applyHandoff(handoff, { announce: events.length === 0 });
    events.forEach(processSessionEvent);

    const explicitCursor = !Array.isArray(data)
      ? data.nextCursor ?? data.next_cursor ?? data.cursor ?? data.lastEventId ?? (data.data && data.data.nextCursor)
      : null;
    const lastEvent = events.length ? eventIdentity(events[events.length - 1], events.length - 1) : "";
    if (explicitCursor != null) state.eventCursor = String(explicitCursor);
    else if (lastEvent) state.eventCursor = lastEvent;
  }

  function stopEventPolling() {
    window.clearTimeout(state.eventPollTimer);
    state.eventPollTimer = null;
    if (state.eventPollController) state.eventPollController.abort();
    state.eventPollController = null;
    state.eventPollInFlight = false;
    state.eventPollFailures = 0;
  }

  function scheduleEventPoll(delay) {
    window.clearTimeout(state.eventPollTimer);
    if (!state.ticketId || state.handoffStatus === "resolved") return;
    state.eventPollTimer = window.setTimeout(pollSessionEvents, delay);
  }

  async function pollSessionEvents() {
    if (!state.ticketId || state.eventPollInFlight) return;
    const ticketId = state.ticketId;
    const controller = new AbortController();
    state.eventPollController = controller;
    state.eventPollInFlight = true;
    const timeout = window.setTimeout(function () {
      controller.abort();
    }, EVENT_POLL_TIMEOUT_MS);
    try {
      const response = await fetch(apiUrl(`/api/support/tickets/${encodeURIComponent(ticketId)}/events?after=${encodeURIComponent(state.eventCursor)}`), {
        method: "GET",
        headers: {
          "X-Client-Id": API_HEADERS["X-Client-Id"],
          "X-Demo-User-Id": API_HEADERS["X-Demo-User-Id"],
          "X-Tenant-Id": API_HEADERS["X-Tenant-Id"],
        },
        signal: controller.signal,
      });
      const data = await readResponse(response);
      if (!response.ok) throw new Error("events unavailable");
      if (state.ticketId !== ticketId) return;
      processSessionEvents(data);
      state.eventPollFailures = 0;
    } catch (_error) {
      state.eventPollFailures += 1;
    } finally {
      window.clearTimeout(timeout);
      if (state.eventPollController === controller) state.eventPollController = null;
      state.eventPollInFlight = false;
      if (state.ticketId === ticketId && state.handoffStatus !== "resolved") {
        const delay = state.eventPollFailures
          ? Math.min(EVENT_POLL_MAX_BACKOFF_MS, EVENT_POLL_INTERVAL_MS * (2 ** Math.min(state.eventPollFailures, 4)))
          : EVENT_POLL_INTERVAL_MS;
        scheduleEventPoll(delay);
      }
    }
  }

  function startEventPolling() {
    if (!state.ticketId || state.handoffStatus === "resolved") return;
    scheduleEventPoll(0);
  }

  function fallbackAnswer(responseData) {
    const action = normalizeAction(responseData.action);
    if (extractHandoff(responseData) || ["handoff", "human_handoff", "ticket_created", "escalate", "request_human"].includes(action)) {
      return copy("handoffFallback", "您的诉求需要由勤益业务人员继续处理。");
    }
    if (action === "refuse") {
      return copy("refuseFallback", "抱歉，该事项超出智能客服的处理范围。");
    }
    return copy("emptyFallback", "暂未收到可靠答复，请稍后再试。");
  }

  async function sendMessage(rawMessage, options) {
    const settings = options || {};
    const message = String(rawMessage || "").trim();
    if (!message || state.pending) {
      return;
    }

    hideError();
    state.lastFailedMessage = null;
    if (settings.appendUser !== false) {
      appendUserMessage(message);
    }

    elements.messageInput.value = "";
    resizeComposer();
    setPending(true);
    const professional = state.professionalConsultation;
    const humanFlow = isHumanFlow();
    if (!humanFlow) showTyping(professional);

    const controller = new AbortController();
    state.controller = controller;
    let timedOut = false;
    const timeout = window.setTimeout(function () {
      timedOut = true;
      controller.abort();
    }, professional ? state.professionalRequestTimeoutMs : state.normalRequestTimeoutMs);

    try {
      const payload = { message: message };
      payload.options = { professionalConsultation: professional };
      if (state.sessionId) {
        payload.sessionId = state.sessionId;
      }

      let response = await fetch(apiUrl("/api/support/chat"), {
        method: "POST",
        headers: API_HEADERS,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      let responseData = await readResponse(response);

      if (!response.ok && [404, 410].includes(response.status) && payload.sessionId && !humanFlow) {
        state.sessionId = null;
        storageWrite(window.sessionStorage, "qinyi-support-session-id", null);
        delete payload.sessionId;
        response = await fetch(apiUrl("/api/support/chat"), {
          method: "POST",
          headers: API_HEADERS,
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
        responseData = await readResponse(response);
      }

      if (!response.ok) {
        const serverMessage = responseData.error || responseData.message || copy("unavailable", "服务暂时无法处理这条消息。");
        const error = new Error(String(serverMessage));
        error.requestId = responseData.requestId;
        throw error;
      }

      if (responseData.sessionId) {
        const isNewSession = state.sessionId !== String(responseData.sessionId);
        state.sessionId = String(responseData.sessionId);
        storageWrite(window.sessionStorage, "qinyi-support-session-id", state.sessionId);
        setText(elements.sessionState, copy("active", "进行中"));
        if (isNewSession) {
          state.eventCursor = "0";
          state.seenEventIds.clear();
        }
      }

      const handoff = extractHandoff(responseData);
      if (handoff) applyHandoff(handoff);
      else resumeAiConversation();
      const inlineEvents = Array.isArray(responseData.events)
        ? responseData.events
        : Array.isArray(responseData.items) ? responseData.items : [];
      if (inlineEvents.length) processSessionEvents(responseData);
      hideTyping();
      if (responseData.answer != null && String(responseData.answer).trim()) {
        const answer = String(responseData.answer).trim();
        const alreadyIncluded = inlineEvents.some(function (event) {
          return eventText(event).trim() === answer;
        });
        if (!alreadyIncluded) appendTranscriptMessage(eventRole(responseData), answer, responseData);
      } else if (!handoff && !humanFlow) {
        appendAssistantMessage(fallbackAnswer(responseData), responseData);
      } else {
        showToast(copy("humanMessageQueued", "消息已发送给勤益人工客服。"));
      }
    } catch (error) {
      hideTyping();
      if (error.name === "AbortError" && !timedOut) {
        return;
      }

      state.lastFailedMessage = message;
      let messageText = timedOut ? copy("timeout", "等待回复时间过长，请重新发送。") : error.message || copy("network", "网络连接异常，请稍后重试。");
      if (error.requestId) {
        messageText += ` ${copy("requestId", "请求编号")}：${error.requestId}`;
      }
      showError(copy("sendFailed", "消息发送失败"), messageText, true);
    } finally {
      window.clearTimeout(timeout);
      if (state.controller === controller) {
        state.controller = null;
        setPending(false);
        elements.messageInput.focus();
      }
    }
  }

  function clearConversationView() {
    const conversationItems = elements.messages.querySelectorAll(".message");
    conversationItems.forEach(function (item) {
      item.remove();
    });
    elements.emptyState.hidden = false;
    hideTyping();
    hideError();
    state.lastFailedMessage = null;
    state.handoffStatus = "ai_active";
    state.ticketId = null;
    storageWrite(window.sessionStorage, "qinyi-support-ticket-id", null);
    storageWrite(window.sessionStorage, "qinyi-support-handoff-status", null);
    state.handoffUpdatedAt = null;
    state.eventCursor = "0";
    state.seenEventIds.clear();
    state.recentMessages = [];
    state.lastAnnouncedHandoffStatus = null;
    elements.handoffStatus.hidden = true;
    elements.handoffStatus.removeAttribute("data-status");
    elements.handoffTicket.hidden = true;
    elements.professionalConsultationButton.disabled = false;
    setText(elements.sessionState, copy("notStarted", "尚未开始"));
    elements.messageInput.value = "";
    resizeComposer();
    updateSendButton();
    elements.messages.scrollTop = 0;
  }

  async function resetConversation() {
    if (state.controller) {
      state.controller.abort();
      state.controller = null;
    }

    const sessionId = state.sessionId;
    stopEventPolling();
    state.sessionId = null;
    storageWrite(window.sessionStorage, "qinyi-support-session-id", null);
    setPending(false);
    clearConversationView();
    elements.messageInput.focus();

    if (!sessionId) {
      showToast(copy("newConversation", "已开启新对话"));
      return;
    }
    if (sessionId.startsWith("v1.")) {
      showToast(copy("newConversation", "已开启新对话"));
      return;
    }

    try {
      const response = await fetch(apiUrl(`/api/support/sessions/${encodeURIComponent(sessionId)}`), {
        method: "DELETE",
        headers: {
          "X-Client-Id": API_HEADERS["X-Client-Id"],
          "X-Demo-User-Id": API_HEADERS["X-Demo-User-Id"],
          "X-Tenant-Id": API_HEADERS["X-Tenant-Id"],
        },
      });
      if (!response.ok) {
        throw new Error(copy("resetFailed", "会话重置失败"));
      }
      showToast(copy("newConversation", "已开启新对话"));
    } catch (_error) {
      showError(copy("viewCleared", "对话已在页面中清空"), copy("resetDetail", "服务端会话未能重置，新消息仍会开启独立对话。"), false);
    }
  }

  function setServiceStatus(tone, label, title, detail, mode) {
    elements.headerStatus.dataset.tone = tone;
    elements.sidebarStatusBadge.dataset.tone = tone;
    const mobileStatus = elements.mobileStatusText.parentElement;
    mobileStatus.dataset.tone = tone;
    setText(elements.headerStatusText, label);
    setText(elements.mobileStatusText, label);
    setText(elements.sidebarStatusBadge, label);
    setText(elements.serviceStatusTitle, title);
    setText(elements.serviceStatusDetail, detail);
    setText(elements.serviceMode, mode);
  }

  async function loadServiceStatus() {
    const controller = new AbortController();
    const timeout = window.setTimeout(function () {
      controller.abort();
    }, 6000);

    try {
      const requestOptions = {
        method: "GET",
        headers: {
          "X-Client-Id": API_HEADERS["X-Client-Id"],
          "X-Demo-User-Id": API_HEADERS["X-Demo-User-Id"],
          "X-Tenant-Id": API_HEADERS["X-Tenant-Id"],
        },
        signal: controller.signal,
      };
      const [response, availabilityResponse] = await Promise.all([
        fetch(apiUrl("/api/support/status"), requestOptions),
        fetch(apiUrl("/api/support/availability"), requestOptions).catch(() => null)
      ]);
      const data = await readResponse(response);
      const availability = availabilityResponse?.ok ? await readResponse(availabilityResponse) : null;
      if (!response.ok) {
        throw new Error("status unavailable");
      }

      if (data.replyBudgets) {
        const budgets = data.replyBudgets;
        if (Number.isFinite(budgets.normalServerMs)) state.normalServerBudgetMs = budgets.normalServerMs;
        if (Number.isFinite(budgets.professionalServerMs)) state.professionalServerBudgetMs = Math.min(budgets.professionalServerMs, 55_000);
        if (Number.isFinite(budgets.normalClientMs)) state.normalRequestTimeoutMs = budgets.normalClientMs;
        if (Number.isFinite(budgets.professionalClientMs)) state.professionalRequestTimeoutMs = Math.min(budgets.professionalClientMs, PROFESSIONAL_REQUEST_TIMEOUT_MS);
      }

      if (data.aiEnabled === false) {
        setServiceStatus(
          "warning",
          copy("manualMode", "人工支持模式"),
          copy("manualService", "人工客服模式"),
          copy("manualServiceDetail", "人工已加入服务流程；如未由开发者紧急暂停，AI 仍可继续回复。"),
          copy("manualPriority", "人工优先"),
        );
      } else {
        setServiceStatus(
          "online",
          copy("online", "服务在线"),
          copy("onlineTitle", "勤益智能客服在线"),
          `${copy("onlineDetail", "知识库与会话服务已连接，可以开始咨询。")} ${availability?.human?.online ? (localeConfig.locale === "en" ? "Human support is online." : "人工客服在线。") : (localeConfig.locale === "en" ? "Human support is currently offline; AI remains online." : "人工客服当前离线，AI 仍在线。")}`,
          copy("aiMode", "智能答复"),
        );
      }
    } catch (_error) {
      setServiceStatus(
        "offline",
        copy("statusUnknown", "状态待确认"),
        copy("statusUnknownTitle", "服务状态待确认"),
        copy("statusUnknownDetail", "暂时无法读取服务状态，您仍可以尝试发送消息。"),
        copy("waiting", "等待连接"),
      );
    } finally {
      window.clearTimeout(timeout);
      syncConversationMode();
    }
  }

  elements.chatForm.addEventListener("submit", function (event) {
    event.preventDefault();
    sendMessage(elements.messageInput.value);
  });

  elements.fileInput?.addEventListener("change", async function () {
    const file = elements.fileInput.files?.[0];
    if (!file) return;
    if (!state.sessionId) {
      showToast(copy("attachmentNeedsSession", "请先发送一条消息，再上传会话附件。"));
      elements.fileInput.value = "";
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      showToast(copy("attachmentTooLarge", "附件不能超过 25MB。"));
      elements.fileInput.value = "";
      return;
    }
    const form = new FormData();
    form.append("purpose", "support");
    form.append("sessionId", state.sessionId);
    form.append("file", file, file.name);
    try {
      showToast(copy("attachmentUploading", "正在安全上传附件…"));
      const response = await fetch(apiUrl("/api/support/uploads"), {
        method: "POST",
        headers: {
          "X-Client-Id": API_HEADERS["X-Client-Id"],
          "X-Demo-User-Id": API_HEADERS["X-Demo-User-Id"],
          "X-Tenant-Id": API_HEADERS["X-Tenant-Id"]
        },
        body: form,
        credentials: "omit"
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || `HTTP ${response.status}`);
      appendTranscriptMessage("system", `${copy("attachmentUploaded", "附件已上传")}：${payload.filename}`);
      showToast(copy("attachmentUploaded", "附件已上传并随本次会话保存。"));
    } catch (error) {
      showToast(`${copy("attachmentFailed", "附件上传失败")}：${error.message}`);
    } finally {
      elements.fileInput.value = "";
    }
  });

  elements.messageInput.addEventListener("input", function () {
    resizeComposer();
    updateSendButton();
  });

  elements.messageInput.addEventListener("keydown", function (event) {
    if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      elements.chatForm.requestSubmit();
    }
  });

  elements.newConversationButton.addEventListener("click", resetConversation);

  function updateProfessionalMode() {
    elements.professionalConsultationButton.setAttribute("aria-pressed", String(state.professionalConsultation));
  }

  elements.professionalConsultationButton.addEventListener("click", function () {
    state.professionalConsultation = !state.professionalConsultation;
    storageWrite(window.sessionStorage, "qinyi-professional-consultation", String(state.professionalConsultation));
    updateProfessionalMode();
    showToast(state.professionalConsultation ? copy("professionalOn", "已开启专业咨询") : copy("professionalOff", "已切换为普通咨询"));
  });

  elements.retryButton.addEventListener("click", function () {
    if (state.lastFailedMessage) {
      sendMessage(state.lastFailedMessage, { appendUser: false });
    }
  });

  elements.dismissErrorButton.addEventListener("click", hideError);

  document.querySelectorAll("[data-question]").forEach(function (button) {
    button.addEventListener("click", function () {
      sendMessage(button.dataset.question);
    });
  });

  resizeComposer();
  updateProfessionalMode();
  updateSendButton();
  if (state.sessionId) setText(elements.sessionState, copy("active", "进行中"));
  if (state.ticketId) {
    applyHandoff({ ticketId: state.ticketId, status: state.handoffStatus }, { announce: false });
  }
  window.addEventListener("online", startEventPolling);
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) startEventPolling();
  });
  loadServiceStatus();
  window.setInterval(loadServiceStatus, 60_000);
})();
