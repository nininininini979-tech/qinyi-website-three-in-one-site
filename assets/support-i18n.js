(function () {
  "use strict";

  const requested = new URLSearchParams(window.location.search).get("locale") || "zh-CN";
  const locale = requested === "zh-CN" ? "zh-CN" : "en";
  const translations = {
    "zh-CN": {
      skip: "跳到消息输入框",
      brand: "勤益智能客服",
      connecting: "正在连接服务",
      newConversation: "新对话",
      conversationTitle: "与客服对话",
      welcomeTitle: "您好，需要帮您处理什么？",
      welcomeDetail: "您可以咨询定制拼图、卡牌、桌游及产品方案。",
      professional: "专业咨询",
      messagePlaceholder: "请输入您的问题",
      privacy: "请勿发送密码、验证码、银行卡号或机密生产文件。",
      serviceInfo: "客服服务信息", currentService: "当前服务", connectingShort: "连接中",
      checkingService: "正在确认知识库与会话服务状态。", session: "会话", notStarted: "尚未开始",
      serviceMode: "处理方式", checkingShort: "正在确认", scope: "服务范围", canHelp: "可以为您处理",
      scopeProducts: "产品介绍与场景化选型方案", scopeMaterials: "尺寸、材质、工艺与包装建议",
      scopeRfq: "定制需求梳理与报价信息准备", manualHeading: "需要人工处理",
      manualCopy: "最终报价与折扣、固定交期、运费税费、订单变更、认证适用性及合同售后事项需要业务人员确认。",
      onlineSupport: "在线支持", conversationLog: "对话记录", suggestions: "常见问题",
      suggestionSizes: "拼图规格", suggestionSizesDetail: "1000片拼图有哪些尺寸？",
      suggestionPackaging: "材质与包装", suggestionPackagingDetail: "礼品拼图怎么选择包装？",
      suggestionFiles: "印前文件", suggestionFilesDetail: "设计文件有什么要求？",
      suggestionPlan: "方案推荐", suggestionPlanDetail: "帮我推荐一套礼品拼图方案",
      questionSizes: "1000片拼图有哪些现有模具尺寸？", questionPackaging: "礼品拼图有哪些包装和材质方案？",
      questionFiles: "定制拼图的设计文件有什么要求？", questionPlan: "我想做500套适合15岁左右用户的礼品拼图，请帮我推荐产品方案。",
      sendFailed: "消息发送失败", retryLater: "请稍后重试。", retry: "重试", dismissError: "关闭错误提示",
      professionalTitle: "切换专业咨询模式", messageLabel: "输入您的问题", send: "发送消息",
      home: "返回勤益网站", serviceName: "勤益",
      handoffWaitingTitle: "正在联系人工客服", handoffWaitingBadge: "等待接管",
      handoffWaitingDetail: "您的消息已进入人工服务队列，您可以继续补充信息。",
    },
    en: {
      skip: "Skip to the message field",
      brand: "Qinyi AI Support",
      connecting: "Connecting",
      newConversation: "New conversation",
      conversationTitle: "Talk to Qinyi",
      welcomeTitle: "How can we help with your project?",
      welcomeDetail: "Ask about custom puzzles, cards, paper games, materials or production planning.",
      professional: "Professional consultation",
      messagePlaceholder: "Describe your product or question",
      privacy: "Do not send passwords, verification codes, payment-card details or confidential production files.",
      serviceInfo: "Support service information", currentService: "Current service", connectingShort: "Connecting",
      checkingService: "Checking the approved knowledge and conversation services.", session: "Session", notStarted: "Not started",
      serviceMode: "Mode", checkingShort: "Checking", scope: "Service scope", canHelp: "What we can help with",
      scopeProducts: "Product information and use-case recommendations", scopeMaterials: "Size, material, finishing and packaging guidance",
      scopeRfq: "Custom requirement clarification and RFQ preparation", manualHeading: "Business confirmation required",
      manualCopy: "Final prices, fixed dates, freight, order changes, certification scope, contracts and after-sales commitments require a Qinyi team member.",
      onlineSupport: "Online support", conversationLog: "Conversation", suggestions: "Common questions",
      suggestionSizes: "Puzzle sizes", suggestionSizesDetail: "Which 1,000-piece sizes are available?",
      suggestionPackaging: "Materials and packaging", suggestionPackagingDetail: "How should I package a gift puzzle?",
      suggestionFiles: "Prepress files", suggestionFilesDetail: "What artwork files should I prepare?",
      suggestionPlan: "Product planning", suggestionPlanDetail: "Recommend a custom gift-puzzle direction",
      questionSizes: "Which existing mould sizes are available for 1,000-piece puzzles?", questionPackaging: "Which material and packaging options suit a gift puzzle?",
      questionFiles: "What artwork and production files are needed for a custom puzzle?", questionPlan: "Please suggest a gift-puzzle direction for 500 sets aimed at users around age 15.",
      sendFailed: "Message not sent", retryLater: "Please try again.", retry: "Retry", dismissError: "Dismiss error",
      professionalTitle: "Toggle professional consultation", messageLabel: "Your question", send: "Send message",
      home: "Return to Qinyi", serviceName: "Qinyi",
      handoffWaitingTitle: "Connecting you with human support", handoffWaitingBadge: "Waiting",
      handoffWaitingDetail: "Your request is in the human-support queue. You can continue adding details.",
    },
  };
  const copy = translations[locale];

  document.documentElement.lang = requested;
  document.documentElement.dir = requested === "ar" ? "rtl" : "ltr";
  document.title = locale === "zh-CN" ? "勤益智能客服 | Qinyi" : "Qinyi AI Support";

  document.querySelectorAll("[data-support-copy]").forEach(function (element) {
    const key = element.dataset.supportCopy;
    if (copy[key]) element.textContent = copy[key];
  });
  document.querySelectorAll("[data-support-copy-placeholder]").forEach(function (element) {
    const key = element.dataset.supportCopyPlaceholder;
    if (copy[key]) element.setAttribute("placeholder", copy[key]);
  });
  document.querySelectorAll("[data-support-copy-aria]").forEach(function (element) {
    const key = element.dataset.supportCopyAria;
    if (copy[key]) element.setAttribute("aria-label", copy[key]);
  });
  document.querySelectorAll("[data-support-copy-title]").forEach(function (element) {
    const key = element.dataset.supportCopyTitle;
    if (copy[key]) element.setAttribute("title", copy[key]);
  });
  document.querySelectorAll("[data-support-question]").forEach(function (element) {
    const key = element.dataset.supportQuestion;
    if (copy[key]) element.dataset.question = copy[key];
  });

  const initialHandoffCopy = {
    handoffStatusTitle: "handoffWaitingTitle",
    handoffStatusBadge: "handoffWaitingBadge",
    handoffStatusDetail: "handoffWaitingDetail",
  };
  Object.keys(initialHandoffCopy).forEach(function (id) {
    const element = document.getElementById(id);
    const key = initialHandoffCopy[id];
    if (element && copy[key]) element.textContent = copy[key];
  });

  const homeLink = document.getElementById("supportHomeLink");
  const embed = new URLSearchParams(window.location.search).get("embed") === "1";
  document.body.classList.toggle("support-embedded", embed);
  if (homeLink) {
    homeLink.href = requested ? `./${encodeURIComponent(requested)}/` : "./";
  }

  window.__QINYI_SUPPORT_LOCALE__ = { requested, locale };
}());
