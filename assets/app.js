document.documentElement.classList.add('js');

const i18n = window.QINYI_I18N || { locale: 'en', messages: {}, rootAlias: false };
const t = (key, variables = {}) => {
  const template = i18n.messages[key] || key;
  return Object.entries(variables).reduce(
    (value, [name, replacement]) => value.replaceAll(`{${name}}`, replacement),
    template,
  );
};
const languages = [
  ['en', 'English'], ['zh-CN', '中文'], ['es', 'Español'], ['de', 'Deutsch'],
  ['fr', 'Français'], ['ja', '日本語'], ['ko', '한국어'], ['ar', 'العربية'],
];
const availableLanguages = window.QINYI_MANAGED_PAGE
  ? languages.filter(([code]) => code === 'en' || code === 'zh-CN')
  : languages;
const currentPage = window.location.pathname.split('/').filter(Boolean).pop()?.endsWith('.html')
  ? window.location.pathname.split('/').pop()
  : 'index.html';
const scriptUrl = new URL(document.currentScript.src);
const siteRoot = new URL('../', scriptUrl);
const API_BASE_URL = (window.__QINYI_SUPPORT_CONFIG__?.apiBaseUrl || '').replace(/\/+$/, '');
const focusableSelector = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),iframe,[tabindex]:not([tabindex="-1"])';

function createModalFocusManager(layer, dialog) {
  let background = [];
  const trap = (event) => {
    if (event.key !== 'Tab' || layer.hidden) return;
    const focusable = Array.from(dialog.querySelectorAll(focusableSelector)).filter((node) => !node.hidden && node.getAttribute('aria-hidden') !== 'true');
    if (!focusable.length) {
      event.preventDefault();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };
  return {
    activate() {
      background = Array.from(document.body.children)
        .filter((node) => node !== layer && node.tagName !== 'SCRIPT')
        .map((node) => ({ node, inert: node.inert }));
      background.forEach(({ node }) => { node.inert = true; });
      document.addEventListener('keydown', trap);
    },
    deactivate() {
      document.removeEventListener('keydown', trap);
      background.forEach(({ node, inert }) => { node.inert = inert; });
      background = [];
    },
  };
}

function visitorClientId() {
  const key = 'qinyi-support-client-id';
  try {
    const existing = window.localStorage.getItem(key);
    if (existing) return existing;
    const created = window.crypto.randomUUID();
    window.localStorage.setItem(key, created);
    return created;
  } catch (_error) {
    return window.crypto.randomUUID();
  }
}

function trackAnonymous(type, targetId = '', surface = 'other') {
  const apiBase = (window.__QINYI_SUPPORT_CONFIG__?.apiBaseUrl || '').replace(/\/+$/, '');
  if (!apiBase) return;
  const width = window.innerWidth || 0;
  const deviceClass = width < 640 ? 'mobile' : width < 1024 ? 'tablet' : 'desktop';
  const payload = { type, dimensions: { path: window.location.pathname, locale: i18n.locale, surface, deviceClass, source: document.referrer ? 'referral' : 'direct', ...(targetId ? { targetId: String(targetId).slice(0, 80) } : {}) } };
  fetch(`${apiBase}/api/support/analytics/events`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), credentials: 'omit', keepalive: true }).catch(() => {});
}
window.QinyiAnalytics = { track: trackAnonymous };
trackAnonymous('page_view', currentPage, currentPage === 'index.html' ? 'home' : currentPage === 'quote.html' ? 'quote' : 'other');
if (document.querySelector('[data-qinyi-customizer]')) trackAnonymous('customizer_opened', 'inspiration-studio', 'customizer');
document.addEventListener('qinyi:customization-ready', () => trackAnonymous('customizer_completed', 'inspiration-studio', 'customizer'));

function bestInitialLocale() {
  const stored = window.localStorage.getItem('qinyi-locale');
  if (languages.some(([code]) => code === stored)) return stored;
  const browserLanguages = navigator.languages || [navigator.language || 'en'];
  return languages.find(([code]) => browserLanguages.some((item) => (
    item.toLowerCase() === code.toLowerCase()
    || item.toLowerCase().split('-')[0] === code.toLowerCase().split('-')[0]
  )))?.[0] || 'en';
}

function localeUrl(locale) {
  if (window.QINYI_MANAGED_PAGE?.slug) {
    const managedLocale = locale === 'zh-CN' ? 'zh-CN' : 'en';
    const managedBase = String(window.QINYI_MANAGED_PAGE.apiBaseUrl || API_BASE_URL || siteRoot).replace(/\/+$/, '');
    const url = new URL(`${managedBase}/site/${encodeURIComponent(managedLocale)}/${encodeURIComponent(window.QINYI_MANAGED_PAGE.slug)}`);
    url.search = window.location.search;
    url.hash = window.location.hash;
    return url;
  }
  const page = currentPage === 'index.html' ? '' : currentPage;
  const url = new URL(`${locale}/${page}`, siteRoot);
  url.search = window.location.search;
  url.hash = window.location.hash;
  return url;
}

if (i18n.rootAlias) {
  window.location.replace(localeUrl(bestInitialLocale()));
}

document.documentElement.lang = i18n.locale;
document.documentElement.dir = i18n.locale === 'ar' ? 'rtl' : 'ltr';
document.documentElement.style.setProperty('--rfq-production-brief', JSON.stringify(t('common.rfq.production_brief')));

if (currentPage === 'quote.html') {
  document.title = `${t('customizer.page.title')} | ${t('common.qinyi')}`;
}

document.querySelectorAll('.nav-actions a[href="quote.html"]').forEach((link) => {
  link.textContent = t('common.nav.custom_quote');
});

const menuButton = document.querySelector('.menu-toggle');
const navLinks = document.querySelector('.nav-links');
const primaryNavigation = [
  ['products.html', 'common.nav.products'],
  ['trade.html', 'common.nav.trade'],
  ['manufacturing.html', 'common.nav.manufacturing'],
  ['projects.html', 'common.nav.projects'],
  ['about.html', 'common.nav.company'],
];

if (navLinks) {
  navLinks.id = 'primary-navigation';
  navLinks.innerHTML = primaryNavigation.map(([href, key]) => {
    const current = currentPage === href ? ' aria-current="page"' : '';
    return `<a href="${href}"${current}>${t(key)}</a>`;
  }).join('');
  navLinks.insertAdjacentHTML('beforeend', [
    ['contact.html', 'common.nav.contact'],
    ['privacy.html', 'common.nav.privacy'],
    ['quote.html', 'common.nav.custom_quote'],
  ].map(([href, key]) => `<a class="mobile-nav-only" href="${href}">${t(key)}</a>`).join(''));
}

if (menuButton) {
  let menuBackground = [];
  const setMenuBackground = (isOpen) => {
    if (isOpen) {
      menuBackground = Array.from(document.querySelectorAll('main, footer, .mobile-rfq, .qinyi-support-launcher, .qinyi-puzzle-controls'))
        .map((node) => ({ node, inert: node.inert }));
      menuBackground.forEach(({ node }) => { node.inert = true; });
      return;
    }
    menuBackground.forEach(({ node, inert }) => { node.inert = inert; });
    menuBackground = [];
  };
  const closeMenu = (restoreFocus = false) => {
    if (!document.body.classList.contains('menu-open')) return;
    document.body.classList.remove('menu-open');
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-label', t('common.menu.open'));
    setMenuBackground(false);
    if (restoreFocus) menuButton.focus();
  };
  menuButton.setAttribute('aria-controls', 'primary-navigation');
  menuButton.setAttribute('aria-label', t('common.menu.open'));
  menuButton.addEventListener('click', () => {
    const isOpen = document.body.classList.toggle('menu-open');
    menuButton.setAttribute('aria-expanded', String(isOpen));
    menuButton.setAttribute('aria-label', t(isOpen ? 'common.menu.close' : 'common.menu.open'));
    setMenuBackground(isOpen);
    if (isOpen) navLinks?.querySelector('a')?.focus();
  });
  document.querySelectorAll('.nav-links a').forEach((link) => {
    link.addEventListener('click', () => trackAnonymous('navigation_click', link.getAttribute('href') || '', 'navigation'));
    link.addEventListener('click', () => closeMenu(false));
  });
  document.addEventListener('keydown', (event) => {
    if (!document.body.classList.contains('menu-open')) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      closeMenu(true);
      return;
    }
    if (event.key !== 'Tab') return;
    const links = Array.from(navLinks?.querySelectorAll('a') || []).filter((link) => link.offsetParent !== null);
    const focusable = [menuButton, ...links];
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });
  window.addEventListener('resize', () => {
    if (window.innerWidth > 760) closeMenu(false);
  });
}

document.querySelectorAll('[data-year]').forEach((node) => {
  node.textContent = new Intl.NumberFormat(i18n.locale, { useGrouping: false }).format(new Date().getFullYear());
});

const observer = 'IntersectionObserver' in window
  ? new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 })
  : null;
document.querySelectorAll('.reveal').forEach((node) => observer ? observer.observe(node) : node.classList.add('visible'));

function buildLanguageControl() {
  const existing = document.querySelector('[data-language]');
  if (!existing) return;
  const wrapper = document.createElement('div');
  wrapper.className = 'language-control';
  wrapper.innerHTML = `<label class="sr-only" for="site-language">${t('common.language.label')}</label>
    <select id="site-language" aria-label="${t('common.language.label')}">
      ${availableLanguages.map(([value, label]) => `<option value="${value}">${label}</option>`).join('')}
    </select>`;
  existing.replaceWith(wrapper);
  const select = wrapper.querySelector('select');
  select.value = i18n.locale;
  select.addEventListener('change', () => {
    window.localStorage.setItem('qinyi-locale', select.value);
    window.location.assign(localeUrl(select.value));
  });
}
buildLanguageControl();

document.querySelectorAll('[data-localized-text]').forEach((element) => {
  const value = i18n.locale === 'zh-CN' ? element.dataset.zh : element.dataset.en;
  if (value) element.textContent = value;
});

const introReplayLabels = {
  en: 'Replay puzzle intro', 'zh-CN': '观看拼图动画', es: 'Ver animación del rompecabezas',
  de: 'Puzzle-Intro ansehen', fr: "Voir l'animation du puzzle", ja: 'パズル演出を見る',
  ko: '퍼즐 인트로 보기', ar: 'عرض مقدمة الأحجية',
};
document.querySelectorAll('[data-intro-replay]').forEach((link) => {
  link.textContent = introReplayLabels[i18n.locale] || introReplayLabels.en;
});

document.querySelectorAll('[data-model-mode-workbench]').forEach((workbench) => {
  const studio = workbench.querySelector('[data-qinyi-customizer]');
  const placeholder = workbench.querySelector('[data-model-mode-placeholder]');
  const title = workbench.querySelector('[data-model-mode-title]');
  workbench.querySelectorAll('[data-model-mode]').forEach((button) => button.addEventListener('click', () => {
    const active = button.dataset.modelMode === 'studio';
    workbench.querySelectorAll('[data-model-mode]').forEach((item) => item.classList.toggle('is-active', item === button));
    studio.hidden = !active;
    placeholder.hidden = active;
    if (!active) title.textContent = `${i18n.locale === 'zh-CN' ? button.dataset.modeLabelZh : button.dataset.modeLabelEn} · ${i18n.locale === 'zh-CN' ? '待补充' : 'Pending input'}`;
  }));
});

function localizedFieldValue(field) {
  if (field instanceof HTMLSelectElement) return field.selectedOptions[0]?.textContent?.trim() || field.value;
  return field.value;
}

document.querySelectorAll('[data-enquiry-form]').forEach((form) => {
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const submitButton = form.querySelector('button[type="submit"]');
    const status = form.querySelector('.form-status');
    const fileInput = form.querySelector('input[type="file"]');
    const isQuote = form.dataset.enquiryForm === 'quote';
    const isContact = form.dataset.enquiryForm === 'contact';
    const clientId = isQuote ? visitorClientId() : '';
    let uploadedFile;
    if (isQuote || isContact) submitButton.disabled = true;
    if (isQuote && fileInput?.files?.[0]) {
      const upload = new FormData();
      upload.append('purpose', 'quote');
      upload.append('file', fileInput.files[0], fileInput.files[0].name);
      submitButton.disabled = true;
      if (status) {
        status.textContent = i18n.locale === 'zh-CN' ? '正在安全上传参考文件…' : 'Securely uploading the reference file…';
        status.classList.add('visible');
      }
      try {
        const response = await fetch(`${API_BASE_URL}/api/support/uploads`, {
          method: 'POST',
          headers: { 'X-Client-Id': clientId, 'X-Demo-User-Id': 'demo-user-1', 'X-Tenant-Id': 'demo-tenant' },
          body: upload,
          credentials: 'omit',
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || `Upload failed (${response.status})`);
        uploadedFile = payload;
      } catch (error) {
        if (status) status.textContent = `${i18n.locale === 'zh-CN' ? '文件上传失败' : 'File upload failed'}：${error.message}`;
        submitButton.disabled = false;
        return;
      }
    }
    if (isQuote) {
      const fieldValue = (name) => String(form.elements.namedItem(name)?.value || '').trim();
      const consentField = form.elements.namedItem('privacy consent');
      const quote = {
        name: fieldValue('name'),
        company: fieldValue('company'),
        contact: { email: fieldValue('email'), phone: fieldValue('phone') },
        product: fieldValue('product'),
        quantity: fieldValue('quantity'),
        finishedDimensions: fieldValue('finished dimensions'),
        material: fieldValue('material preference'),
        process: fieldValue('print and finishing'),
        budget: fieldValue('budget range'),
        delivery: fieldValue('target delivery date'),
        notes: fieldValue('brief note'),
        customizerSummary: fieldValue('customization brief'),
        destinationCountry: fieldValue('destination country'),
        publicReferenceUrl: fieldValue('public reference link'),
        locale: i18n.locale,
        attachmentIds: uploadedFile ? [uploadedFile.id] : [],
        consent: {
          accepted: consentField instanceof HTMLInputElement && consentField.checked,
          privacyVersion: consentField instanceof HTMLElement ? consentField.dataset.privacyVersion || '' : '',
        },
      };
      if (status) {
        status.textContent = i18n.locale === 'zh-CN' ? '正在提交询价资料…' : 'Submitting your quote request…';
        status.classList.add('visible');
      }
      try {
        const response = await fetch(`${API_BASE_URL}/api/support/quotes`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Client-Id': clientId,
            'X-Demo-User-Id': 'demo-user-1',
            'X-Tenant-Id': 'demo-tenant',
          },
          body: JSON.stringify(quote),
          credentials: 'omit',
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || !payload.id) throw new Error(payload.error || `Submission failed (${response.status})`);
        if (status) status.textContent = i18n.locale === 'zh-CN'
          ? `询价已成功提交，询价编号：${payload.id}`
          : `Your quote request was submitted successfully. Reference: ${payload.id}`;
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({ event: 'quote_submitted', product_type: quote.product });
        trackAnonymous('quote_submitted', payload.id, 'quote');
        form.reset();
      } catch (error) {
        if (status) status.textContent = `${i18n.locale === 'zh-CN' ? '询价提交失败，请稍后重试' : 'Quote submission failed. Please try again'}：${error.message}`;
      } finally {
        submitButton.disabled = false;
      }
      return;
    }
    if (isContact) {
      const fieldValue = (name) => String(form.elements.namedItem(name)?.value || '').trim();
      const consentField = form.elements.namedItem('privacy consent');
      const inquiry = {
        name: fieldValue('name'),
        company: fieldValue('company'),
        email: fieldValue('email'),
        country: fieldValue('country'),
        topic: fieldValue('product'),
        message: fieldValue('message'),
        privacyConsent: consentField instanceof HTMLInputElement && consentField.checked,
        privacyVersion: consentField instanceof HTMLElement ? consentField.dataset.privacyVersion || '' : '',
        sourcePage: window.location.pathname,
        locale: i18n.locale,
      };
      if (status) {
        status.textContent = i18n.locale === 'zh-CN' ? '正在提交联系信息…' : 'Submitting your contact enquiry…';
        status.classList.add('visible');
      }
      try {
        const response = await fetch(`${API_BASE_URL}/api/support/contact-inquiries`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Client-Id': visitorClientId() },
          body: JSON.stringify(inquiry),
          credentials: 'omit',
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || !payload.id) throw new Error(payload.error || `Submission failed (${response.status})`);
        if (status) status.textContent = i18n.locale === 'zh-CN'
          ? `联系信息已提交，编号：${payload.id}`
          : `Your enquiry was submitted. Reference: ${payload.id}`;
        trackAnonymous('contact_submitted', payload.id, 'contact');
        form.reset();
      } catch (error) {
        if (status) status.textContent = `${i18n.locale === 'zh-CN' ? '提交失败，请稍后重试' : 'Submission failed. Please try again'}：${error.message}`;
      } finally {
        submitButton.disabled = false;
      }
      return;
    }
    // Every supported enquiry form has an explicit API branch above. Keep
    // unsupported forms inert so they cannot silently fall back to email.
    submitButton.disabled = false;
  });
});

document.querySelectorAll('a[href^="mailto:"]').forEach((link) => link.addEventListener('click', () => {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event: 'email_click' });
}));
document.querySelectorAll('a[href^="tel:"]').forEach((link) => link.addEventListener('click', () => {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event: 'phone_click' });
}));

const mobileQuote = document.createElement('a');
mobileQuote.className = 'mobile-rfq';
mobileQuote.href = currentPage === 'quote.html' ? '#rfq' : 'quote.html#rfq';
mobileQuote.textContent = t('common.floating.quote');
document.body.appendChild(mobileQuote);
mobileQuote.addEventListener('click', () => trackAnonymous('quote_opened', 'floating-quote', 'quote'));

const supportLabels = {
  en: { open: 'Open Qinyi AI Support', title: 'Qinyi AI Support', close: 'Close support', full: 'Open full page' },
  'zh-CN': { open: '打开勤益智能客服', title: '勤益智能客服', close: '关闭客服', full: '打开完整页面' },
  es: { open: 'Abrir asistencia de Qinyi', title: 'Asistencia de Qinyi', close: 'Cerrar asistencia', full: 'Abrir página completa' },
  de: { open: 'Qinyi-Support öffnen', title: 'Qinyi AI Support', close: 'Support schließen', full: 'Ganze Seite öffnen' },
  fr: { open: "Ouvrir l'assistance Qinyi", title: 'Assistance Qinyi', close: "Fermer l'assistance", full: 'Ouvrir la page complète' },
  ja: { open: 'Qinyi AIサポートを開く', title: 'Qinyi AIサポート', close: 'サポートを閉じる', full: '全画面で開く' },
  ko: { open: 'Qinyi AI 지원 열기', title: 'Qinyi AI 지원', close: '지원 닫기', full: '전체 페이지 열기' },
  ar: { open: 'فتح دعم Qinyi الذكي', title: 'دعم Qinyi الذكي', close: 'إغلاق الدعم', full: 'فتح الصفحة الكاملة' },
};

function installSupportWidget() {
  const copy = supportLabels[i18n.locale] || supportLabels.en;
  const embeddedUrl = new URL('ai-support.html', siteRoot);
  embeddedUrl.searchParams.set('locale', i18n.locale);
  embeddedUrl.searchParams.set('embed', '1');
  const fullUrl = new URL('ai-support.html', siteRoot);
  fullUrl.searchParams.set('locale', i18n.locale);

  const launcher = document.createElement('button');
  launcher.className = 'qinyi-support-launcher';
  launcher.type = 'button';
  launcher.setAttribute('aria-label', copy.open);
  launcher.setAttribute('title', copy.open);
  launcher.setAttribute('aria-expanded', 'false');
  launcher.innerHTML = '<span class="qinyi-support-icon" aria-hidden="true"><i></i><i></i><i></i></span>';

  const layer = document.createElement('div');
  layer.className = 'qinyi-support-layer';
  layer.hidden = true;
  layer.innerHTML = `<button class="qinyi-support-scrim" type="button" aria-label="${copy.close}"></button>
    <section class="qinyi-support-dialog" role="dialog" aria-modal="true" aria-label="${copy.title}">
      <header class="qinyi-support-dialog__header">
        <strong>${copy.title}</strong>
        <div>
          <a class="qinyi-support-expand" href="${fullUrl.href}" title="${copy.full}" aria-label="${copy.full}">↗</a>
          <button class="qinyi-support-close" type="button" title="${copy.close}" aria-label="${copy.close}">×</button>
        </div>
      </header>
      <iframe class="qinyi-support-frame" title="${copy.title}" loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe>
    </section>`;

  const frame = layer.querySelector('.qinyi-support-frame');
  const closeButton = layer.querySelector('.qinyi-support-close');
  const scrim = layer.querySelector('.qinyi-support-scrim');
  const supportModal = createModalFocusManager(layer, layer.querySelector('.qinyi-support-dialog'));

  function closeSupport() {
    layer.hidden = true;
    document.body.classList.remove('support-open');
    launcher.setAttribute('aria-expanded', 'false');
    supportModal.deactivate();
    launcher.focus();
  }

  function openSupport(event) {
    trackAnonymous('chat_opened', 'support-launcher', 'chat');
    const ticketId = event?.detail?.ticketId;
    if (ticketId) {
      const ticketUrl = new URL(embeddedUrl);
      ticketUrl.searchParams.set('ticket', ticketId);
      frame.src = ticketUrl.href;
    } else if (!frame.src) {
      frame.src = embeddedUrl.href;
    }
    layer.hidden = false;
    document.body.classList.add('support-open');
    launcher.setAttribute('aria-expanded', 'true');
    supportModal.activate();
    closeButton.focus();
  }

  document.addEventListener('qinyi:open-support', openSupport);

  launcher.addEventListener('click', () => openSupport());
  closeButton.addEventListener('click', closeSupport);
  scrim.addEventListener('click', closeSupport);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !layer.hidden) closeSupport();
  });
  document.body.append(layer, launcher);
}

installSupportWidget();

function installOrderPortal() {
  const isZh = String(i18n.locale || '').toLowerCase().startsWith('zh');
  const copy = isZh ? {
    open: '订单查询', title: '我的订单', close: '关闭', phone: '手机号码', getCode: '获取验证码',
    code: '短信验证码', login: '登录并查询', pending: '短信服务待接入', empty: '当前手机号暂无订单',
    customerFlow: '订单流程', productionFlow: '工厂生产流程', loading: '正在读取订单', retry: '请检查后重试',
    logout: '退出并切换手机号', codeSent: '验证码已发送至', deliveryFailed: '短信发送失败，请稍后重试',
  } : {
    open: 'Orders', title: 'My orders', close: 'Close', phone: 'Mobile number', getCode: 'Get code',
    code: 'SMS code', login: 'Sign in and view orders', pending: 'SMS service pending integration', empty: 'No orders for this mobile number',
    customerFlow: 'Order progress', productionFlow: 'Factory production', loading: 'Loading orders', retry: 'Check the details and try again',
    logout: 'Sign out / change number', codeSent: 'Code sent to', deliveryFailed: 'SMS delivery failed. Try again later',
  };
  const customerStages = [
    ['inquiry','询盘状态','Inquiry'],['quoted','报价','Quotation'],['price_confirmed','确认价格','Price confirmed'],
    ['files_received','提供文件','Files received'],['layout_confirmed','排版确认','Layout confirmed'],['sample_ordered','下单打样','Sample ordered'],
    ['sample_confirmed','样品确认','Sample confirmed'],['bulk_ordered','下大货单','Bulk order placed'],['deposit_arranged','安排订金','Deposit arranged'],
    ['bulk_production','大货生产','Bulk production'],['balance_paid','支付尾款','Balance paid'],['shipped','订单发货','Order shipped'],
  ];
  const productionStages = [
    ['order_received','接到客户订单','Order received'],['production_order_created','开生产单','Production order created'],['materials_prepared','备料','Materials prepared'],
    ['prepress_layout','排版','Prepress layout'],['materials_issued','发料','Materials issued'],['printing','印刷','Printing'],
    ['surface_finishing','表面工艺处理','Surface finishing'],['laminating','裱合','Laminating'],['die_cutting','啤切','Die cutting'],
    ['stamping','冲压','Stamping'],['box_assembly','包盒','Box assembly'],['packing','包装','Packing'],['dispatched','出货','Dispatched'],
  ];
  const label = (stage) => isZh ? stage[1] : stage[2];
  const escapeHtml = (value) => String(value == null ? '' : value).replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]);
  const tokenKey = 'qinyi-customer-order-token';
  const navActions = document.querySelector('.nav-actions');
  if (!navActions || document.querySelector('.order-portal-trigger')) return;
  const trigger = document.createElement('button');
  trigger.className = 'order-portal-trigger';
  trigger.type = 'button';
  trigger.textContent = copy.open;
  trigger.setAttribute('aria-haspopup', 'dialog');
  navActions.insertBefore(trigger, navActions.querySelector('a[href$="quote.html"]'));

  const layer = document.createElement('div');
  layer.className = 'order-portal-layer';
  layer.hidden = true;
  layer.innerHTML = `<div class="order-portal-scrim"></div><section class="order-portal-dialog" role="dialog" aria-modal="true" aria-label="${copy.title}">
    <header><div><strong>${copy.title}</strong><small>勤益 Qinyi</small></div><button class="order-portal-close" type="button" aria-label="${copy.close}">×</button></header>
    <div class="order-portal-body"></div>
  </section>`;
  document.body.appendChild(layer);
  const body = layer.querySelector('.order-portal-body');
  const orderModal = createModalFocusManager(layer, layer.querySelector('.order-portal-dialog'));
  const api = async (path, options = {}) => {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: options.method || 'GET', credentials: 'omit',
      headers: { Accept: 'application/json', ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}) },
      ...(options.body ? { body: JSON.stringify(options.body) } : {}),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw Object.assign(new Error(payload.error || copy.retry), { payload, status: response.status });
    return payload;
  };
  const timeline = (stages, currentIndex) => `<ol class="order-stage-list">${stages.map((stage, index) => `<li class="${index < currentIndex ? 'is-complete' : index === currentIndex ? 'is-current' : ''}"><span>${index + 1}</span><strong>${label(stage)}</strong></li>`).join('')}</ol>`;

  async function renderOrders() {
    const token = sessionStorage.getItem(tokenKey) || '';
    if (!token) return renderLogin();
    body.innerHTML = `<div class="order-portal-state">${copy.loading}</div>`;
    try {
      const data = await api('/api/customer/orders', { token });
      const accountBar = `<div class="order-account-bar"><span>${escapeHtml(data.customer?.phoneMasked || data.items?.[0]?.customerPhoneMasked || '')}</span><button type="button" data-order-logout>${copy.logout}</button></div>`;
      if (!data.items?.length) { body.innerHTML = `${accountBar}<div class="order-portal-state">${copy.empty}</div>`; bindLogout(); return; }
      body.innerHTML = accountBar + data.items.map((order) => `<article class="order-record">
        <div class="order-record-head"><div><small>${escapeHtml(order.id)}</small><h3>${escapeHtml(order.title)}</h3></div><span>${escapeHtml(label(customerStages[order.stageIndex] || customerStages[0]))}</span></div>
        <section><h4>${copy.customerFlow}</h4>${timeline(customerStages, order.stageIndex)}</section>
        ${order.productionStageIndex == null ? '' : `<section><h4>${copy.productionFlow}</h4>${timeline(productionStages, order.productionStageIndex)}</section>`}
      </article>`).join('');
      bindLogout();
    } catch (error) {
      if (error.status === 401) {
        sessionStorage.removeItem(tokenKey);
        renderLogin(error.message);
      } else {
        body.innerHTML = `<p class="order-portal-error">${escapeHtml(error.message)}</p><button class="btn outline" type="button" data-order-retry>${copy.retry}</button>`;
        body.querySelector('[data-order-retry]').addEventListener('click', renderOrders);
      }
    }
  }

  function bindLogout() {
    const button = body.querySelector('[data-order-logout]');
    if (!button) return;
    button.addEventListener('click', async () => {
      const token = sessionStorage.getItem(tokenKey) || '';
      button.disabled = true;
      try { if (token) await api('/api/customer/auth/session', { method: 'DELETE', token }); }
      catch (_error) { /* Local session is cleared even when the service is unavailable. */ }
      sessionStorage.removeItem(tokenKey);
      renderLogin();
    });
  }

  function renderLogin(message = '') {
    body.innerHTML = `<form class="order-login-form">
      ${message ? `<p class="order-portal-error">${escapeHtml(message)}</p>` : ''}
      <label>${copy.phone}<input name="phone" inputmode="tel" autocomplete="tel" required></label>
      <button class="btn outline" data-order-code type="button">${copy.getCode}</button>
      <div class="order-code-fields" hidden><label>${copy.code}<input name="code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" required></label><button class="btn orange" type="submit">${copy.login}</button></div>
      <p class="order-login-status" aria-live="polite"></p>
    </form>`;
    const form = body.querySelector('form');
    const status = form.querySelector('.order-login-status');
    const fields = form.querySelector('.order-code-fields');
    let challengeId = '';
    const codeButton = form.querySelector('[data-order-code]');
    codeButton.addEventListener('click', async () => {
      status.textContent = '';
      codeButton.disabled = true;
      try {
        const result = await api('/api/customer/auth/sms/request', { method: 'POST', body: { phone: form.phone.value } });
        challengeId = result.challengeId;
        fields.hidden = false;
        status.textContent = result.developmentCode ? `${copy.code}: ${result.developmentCode}` : `${copy.codeSent} ${result.phoneMasked}`;
        form.code.focus();
      } catch (error) {
        status.textContent = error.payload?.errorCode === 'SMS_NOT_CONFIGURED' ? copy.pending : error.payload?.errorCode === 'SMS_DELIVERY_FAILED' ? copy.deliveryFailed : error.message;
      } finally {
        codeButton.disabled = false;
      }
    });
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!challengeId) return;
      try {
        const result = await api('/api/customer/auth/sms/verify', { method: 'POST', body: { challengeId, code: form.code.value } });
        sessionStorage.setItem(tokenKey, result.token);
        await renderOrders();
      } catch (error) {
        status.textContent = error.message;
        if (['CODE_EXPIRED', 'CODE_ATTEMPTS_EXCEEDED'].includes(error.payload?.errorCode)) {
          challengeId = '';
          fields.hidden = true;
          form.code.value = '';
        }
      }
    });
  }

  const close = () => { layer.hidden = true; document.body.classList.remove('order-portal-open'); orderModal.deactivate(); trigger.focus(); };
  trigger.addEventListener('click', () => { layer.hidden = false; document.body.classList.add('order-portal-open'); orderModal.activate(); renderOrders(); layer.querySelector('.order-portal-close').focus(); });
  layer.querySelector('.order-portal-close').addEventListener('click', close);
  layer.querySelector('.order-portal-scrim').addEventListener('click', close);
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && !layer.hidden) close(); });
}

installOrderPortal();

const immersiveMotionScript = document.createElement('script');
immersiveMotionScript.src = new URL('./immersive-motion.js?v=20260731-mobile-v17', scriptUrl).href;
immersiveMotionScript.async = false;
document.head.appendChild(immersiveMotionScript);
