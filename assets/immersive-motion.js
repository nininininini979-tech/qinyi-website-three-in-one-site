(() => {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const locale = String(window.QINYI_I18N?.locale || document.documentElement.lang || 'en');
  const isChinese = locale.toLowerCase().startsWith('zh');
  const copy = isChinese ? {
    carousel: '首页推荐产品',
    previous: '上一张推荐图片',
    next: '下一张推荐图片',
    slide: (current, total, title) => `第 ${current} 张，共 ${total} 张：${title}`,
    puzzleOn: '关闭拼图波交互',
    puzzleOff: '开启拼图波交互',
    puzzleReduced: '系统已启用减少动态效果',
    puzzlePreparing: '正在准备拼图画面…',
    puzzleHint: '开启后，按住并拖动页面',
    puzzleLevel: '拼图波强度',
    puzzleLevels: ['轻柔', '标准', '明显'],
  } : {
    carousel: 'Featured products',
    previous: 'Previous featured image',
    next: 'Next featured image',
    slide: (current, total, title) => `Slide ${current} of ${total}: ${title}`,
    puzzleOn: 'Turn off puzzle-wave interaction',
    puzzleOff: 'Turn on puzzle-wave interaction',
    puzzleReduced: 'Motion is reduced by your system settings',
    puzzlePreparing: 'Preparing the puzzle view…',
    puzzleHint: 'Turn on, then press and drag',
    puzzleLevel: 'Puzzle-wave intensity',
    puzzleLevels: ['Subtle', 'Balanced', 'Defined'],
  };

  const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));

  function installHeroCarousel() {
    const media = document.querySelector('.hero-media');
    const productCards = Array.from(document.querySelectorAll('.home-product-grid .product-card'));
    const originalImage = media?.querySelector('.hero-primary');
    if (!media || !originalImage || !productCards.length) return;

    const originalDetail = media.querySelector('.hero-detail');
    const originalCaption = media.querySelector('figcaption');
    const fallbackProductLink = productCards[0]?.querySelector('a[href]')?.getAttribute('href') || 'products.html';
    const slides = [{
      src: originalImage.getAttribute('src'),
      alt: originalImage.getAttribute('alt') || '',
      href: fallbackProductLink,
      title: originalCaption?.textContent?.trim() || (isChinese ? '定制纪念拼图' : 'Custom keepsake puzzle'),
    }];

    productCards.forEach((card) => {
      const image = card.querySelector('img');
      const link = card.querySelector('a[href]');
      const heading = card.querySelector('h3');
      if (!image || !link || !heading) return;
      const src = image.getAttribute('src');
      if (!src || slides.some((slide) => slide.src === src)) return;
      slides.push({
        src,
        alt: image.getAttribute('alt') || heading.textContent.trim(),
        href: link.getAttribute('href'),
        title: heading.textContent.trim(),
      });
    });
    if (slides.length < 2) return;

    const carousel = document.createElement('div');
    carousel.className = 'hero-carousel';
    carousel.setAttribute('role', 'region');
    carousel.setAttribute('aria-roledescription', 'carousel');
    carousel.setAttribute('aria-label', copy.carousel);

    const viewport = document.createElement('div');
    viewport.className = 'hero-carousel-viewport';
    const slideNodes = slides.map((slide, index) => {
      const link = document.createElement('a');
      link.className = `hero-carousel-slide${index === 0 ? ' is-active' : ''}`;
      link.href = slide.href;
      link.setAttribute('aria-hidden', String(index !== 0));
      link.tabIndex = index === 0 ? 0 : -1;
      link.innerHTML = `<img class="hero-carousel-image" src="${slide.src}" alt="${slide.alt.replaceAll('&', '&amp;').replaceAll('"', '&quot;')}" ${index === 0 ? 'fetchpriority="high"' : 'loading="eager"'}><span class="hero-carousel-caption">${slide.title}</span>`;
      viewport.appendChild(link);
      return link;
    });

    const puzzleLayer = document.createElement('div');
    puzzleLayer.className = 'hero-puzzle-layer';
    puzzleLayer.setAttribute('aria-hidden', 'true');
    puzzleLayer.setAttribute('data-html2canvas-ignore', 'true');
    const controls = document.createElement('div');
    controls.className = 'hero-carousel-controls';
    controls.innerHTML = `<button class="hero-carousel-arrow hero-carousel-previous" type="button" aria-label="${copy.previous}" title="${copy.previous}"><span aria-hidden="true">&#8592;</span></button><button class="hero-carousel-arrow hero-carousel-next" type="button" aria-label="${copy.next}" title="${copy.next}"><span aria-hidden="true">&#8594;</span></button>`;
    const status = document.createElement('p');
    status.className = 'sr-only';
    status.setAttribute('aria-live', 'polite');

    carousel.append(viewport, puzzleLayer, controls, status);
    media.replaceChildren(carousel);
    if (originalDetail) {
      originalDetail.removeAttribute('fetchpriority');
      originalDetail.loading = 'lazy';
      media.appendChild(originalDetail);
    }

    let currentIndex = 0;
    let transitionTimer = 0;
    let autoplayTimer = 0;
    let pausedUntil = 0;
    let hovering = false;
    let transitioning = false;
    const autoplayDelay = 3000;
    const manualPause = 8000;

    const pauseConditionsActive = () => (
      hovering
      || document.hidden
      || reducedMotion.matches
      || document.body.classList.contains('intro-running')
    );

    function buildPuzzle(slide, direction) {
      puzzleLayer.replaceChildren();
      const columns = window.innerWidth <= 760 ? 3 : 4;
      const rows = 3;
      const fragment = document.createDocumentFragment();
      for (let row = 0; row < rows; row += 1) {
        for (let column = 0; column < columns; column += 1) {
          const order = direction > 0 ? row * columns + column : (rows - row) * columns - column;
          const offsetX = (column - (columns - 1) / 2) * 4 + direction * 9;
          const offsetY = (row - 1) * 7;
          const piece = document.createElement('span');
          piece.className = 'hero-puzzle-piece';
          piece.style.setProperty('--piece-column', column);
          piece.style.setProperty('--piece-row', row);
          piece.style.setProperty('--piece-columns', columns);
          piece.style.setProperty('--piece-delay', `${Math.max(0, order) * 34}ms`);
          piece.style.setProperty('--piece-x', `${offsetX}px`);
          piece.style.setProperty('--piece-y', `${offsetY}px`);
          piece.innerHTML = `<img src="${slide.src}" alt="">`;
          fragment.appendChild(piece);
        }
      }
      puzzleLayer.appendChild(fragment);
    }

    function setActiveSlide(nextIndex, announce) {
      slideNodes.forEach((node, index) => {
        const active = index === nextIndex;
        node.classList.toggle('is-active', active);
        node.setAttribute('aria-hidden', String(!active));
        node.tabIndex = active ? 0 : -1;
      });
      currentIndex = nextIndex;
      if (announce) status.textContent = copy.slide(currentIndex + 1, slides.length, slides[currentIndex].title);
      document.dispatchEvent(new Event('qinyi:visual-change'));
    }

    function scheduleAutoplay(delay = autoplayDelay) {
      window.clearTimeout(autoplayTimer);
      autoplayTimer = window.setTimeout(() => {
        if (pauseConditionsActive()) {
          scheduleAutoplay(600);
          return;
        }
        const wait = pausedUntil - Date.now();
        if (wait > 0) {
          scheduleAutoplay(wait);
          return;
        }
        showSlide((currentIndex + 1) % slides.length, 1, false);
      }, delay);
    }

    function showSlide(nextIndex, direction, manual) {
      if (transitioning || nextIndex === currentIndex) return;
      window.clearTimeout(autoplayTimer);
      if (manual) pausedUntil = Date.now() + manualPause;

      if (reducedMotion.matches) {
        setActiveSlide(nextIndex, manual);
        scheduleAutoplay(manual ? manualPause : autoplayDelay);
        return;
      }

      transitioning = true;
      buildPuzzle(slides[nextIndex], direction);
      puzzleLayer.classList.add('is-visible');
      requestAnimationFrame(() => requestAnimationFrame(() => puzzleLayer.classList.add('is-assembling')));
      transitionTimer = window.setTimeout(() => {
        setActiveSlide(nextIndex, manual);
        puzzleLayer.classList.add('is-settled');
        window.setTimeout(() => {
          puzzleLayer.classList.remove('is-visible', 'is-assembling', 'is-settled');
          puzzleLayer.replaceChildren();
          transitioning = false;
          scheduleAutoplay(manual ? Math.max(500, pausedUntil - Date.now()) : autoplayDelay);
        }, 180);
      }, 820);
    }

    const previousButton = controls.querySelector('.hero-carousel-previous');
    const nextButton = controls.querySelector('.hero-carousel-next');
    previousButton.addEventListener('click', () => showSlide((currentIndex - 1 + slides.length) % slides.length, -1, true));
    nextButton.addEventListener('click', () => showSlide((currentIndex + 1) % slides.length, 1, true));
    carousel.addEventListener('mouseenter', () => { hovering = true; window.clearTimeout(autoplayTimer); });
    carousel.addEventListener('mouseleave', () => { hovering = false; scheduleAutoplay(); });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) window.clearTimeout(autoplayTimer);
      else scheduleAutoplay();
    });
    reducedMotion.addEventListener?.('change', () => {
      window.clearTimeout(transitionTimer);
      transitioning = false;
      puzzleLayer.classList.remove('is-visible', 'is-assembling', 'is-settled');
      puzzleLayer.replaceChildren();
      scheduleAutoplay();
    });
    scheduleAutoplay();
  }

  function installPuzzleInteraction() {
    if (!window.Path2D || !HTMLCanvasElement.prototype.getContext) return;

    const lowPower = typeof navigator.hardwareConcurrency === 'number' && navigator.hardwareConcurrency <= 2;
    const motionAssetBase = new URL('.', document.currentScript?.src || window.location.href);
    const settings = [
      { offset: 6.5, rotation: 0.65, baseOpacity: 0.32 },
      { offset: 11, rotation: 1.15, baseOpacity: 0.26 },
      { offset: 17, rotation: 2.05, baseOpacity: 0.2 },
    ];
    const savedPreference = (() => {
      try { return window.localStorage.getItem('qinyi-puzzle-enabled') === 'true'; }
      catch (_error) { return false; }
    })();
    let level = (() => {
      try {
        const savedLevel = Number(window.localStorage.getItem('qinyi-puzzle-level') || 1);
        return Number.isFinite(savedLevel) ? clamp(savedLevel, 0, 2) : 1;
      }
      catch (_error) { return 1; }
    })();

    const canvas = document.createElement('canvas');
    canvas.className = 'qinyi-puzzle-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    canvas.setAttribute('data-html2canvas-ignore', 'true');
    const controls = document.createElement('div');
    controls.className = 'qinyi-puzzle-controls';
    controls.setAttribute('data-html2canvas-ignore', 'true');
    controls.innerHTML = `<div class="qinyi-puzzle-levels" role="group" aria-label="${copy.puzzleLevel}">${copy.puzzleLevels.map((label, index) => `<button type="button" data-puzzle-level="${index}" aria-label="${copy.puzzleLevel}：${label}" title="${label}"><span aria-hidden="true">${'<i></i>'.repeat(index + 1)}</span></button>`).join('')}</div><p class="qinyi-puzzle-hint" aria-hidden="true">${copy.puzzleHint}</p><button class="qinyi-puzzle-toggle" type="button"><svg class="qinyi-puzzle-icon" viewBox="0 0 32 32" aria-hidden="true"><path d="M4 4h9.2a3.8 3.8 0 1 0 5.6 0H28v9.2a3.8 3.8 0 1 0 0 5.6V28h-9.2a3.8 3.8 0 1 0-5.6 0H4v-9.2a3.8 3.8 0 1 0 0-5.6V4Z"/></svg></button>`;
    document.body.append(canvas, controls);

    const context = canvas.getContext('2d', { alpha: true, desynchronized: true });
    const button = controls.querySelector('.qinyi-puzzle-toggle');
    const hint = controls.querySelector('.qinyi-puzzle-hint');
    const levelButtons = Array.from(controls.querySelectorAll('[data-puzzle-level]'));
    let enabled = false;
    let activePointer = null;
    let startPoint = null;
    let lastPoint = null;
    let dragging = false;
    let snapshot = null;
    let snapshotMeta = null;
    let pieces = [];
    let waves = [];
    let queuedWaves = [];
    let animationFrame = 0;
    let captureGeneration = 0;
    let capturePromise = null;
    let libraryPromise = null;
    let canvasWidth = 0;
    let canvasHeight = 0;
    let pixelRatio = 1;
    let locked = false;
    let hintTimer = 0;
    let releaseTimer = 0;
    let snapshotRefreshTimer = 0;
    let snapshotRefreshPending = false;
    let preparing = false;
    let preparationStartedAt = 0;

    function resizeCanvas() {
      pixelRatio = lowPower || window.innerWidth <= 760 ? 1 : Math.min(window.devicePixelRatio || 1, 1.2);
      canvasWidth = window.innerWidth;
      canvasHeight = window.innerHeight;
      canvas.width = Math.round(canvasWidth * pixelRatio);
      canvas.height = Math.round(canvasHeight * pixelRatio);
      canvas.style.width = `${canvasWidth}px`;
      canvas.style.height = `${canvasHeight}px`;
      context?.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    }

    function updateControls() {
      const label = reducedMotion.matches ? copy.puzzleReduced : (preparing ? copy.puzzlePreparing : (enabled ? copy.puzzleOn : copy.puzzleOff));
      button.setAttribute('aria-label', label);
      button.setAttribute('title', label);
      button.setAttribute('aria-pressed', String(enabled));
      button.setAttribute('aria-busy', String(preparing));
      button.classList.toggle('is-active', enabled);
      button.disabled = reducedMotion.matches;
      controls.classList.toggle('is-enabled', enabled);
      controls.classList.toggle('is-preparing', preparing);
      controls.dataset.puzzleReady = String(snapshotMatchesViewport());
      hint.textContent = reducedMotion.matches ? copy.puzzleReduced : (preparing ? copy.puzzlePreparing : copy.puzzleHint);
      levelButtons.forEach((levelButton, index) => {
        const selected = index === level;
        levelButton.classList.toggle('is-selected', selected);
        levelButton.setAttribute('aria-pressed', String(selected));
      });
    }

    function showHint(duration = 4200, remember = false) {
      window.clearTimeout(hintTimer);
      controls.classList.add('is-hint-visible');
      if (remember) {
        try { window.localStorage.setItem('qinyi-puzzle-hint-seen', 'true'); }
        catch (_error) { /* The hint can still be shown when storage is blocked. */ }
      }
      hintTimer = window.setTimeout(() => controls.classList.remove('is-hint-visible'), duration);
    }

    function setPreparing(nextPreparing) {
      const next = Boolean(nextPreparing);
      if (next && !preparing) preparationStartedAt = performance.now();
      if (!next && preparing && preparationStartedAt) {
        controls.dataset.puzzlePrepareMs = String(Math.round(performance.now() - preparationStartedAt));
        preparationStartedAt = 0;
      }
      preparing = next;
      updateControls();
    }

    function ensureCaptureLibrary() {
      if (window.html2canvas) return Promise.resolve(window.html2canvas);
      if (libraryPromise) return libraryPromise;
      libraryPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = new URL('./vendor/html2canvas.min.js', motionAssetBase).href;
        script.onload = () => {
          if (window.html2canvas) resolve(window.html2canvas);
          else {
            libraryPromise = null;
            reject(new Error('html2canvas unavailable'));
          }
        };
        script.onerror = (error) => {
          libraryPromise = null;
          reject(error);
        };
        document.head.appendChild(script);
      });
      return libraryPromise;
    }

    function snapshotMatchesViewport() {
      return Boolean(
        snapshot
        && snapshotMeta
        && snapshotMeta.width === canvasWidth
        && snapshotMeta.height === canvasHeight
        && Math.abs(snapshotMeta.scrollX - window.scrollX) < 1
        && Math.abs(snapshotMeta.scrollY - window.scrollY) < 1
      );
    }

    function invalidateSnapshot() {
      snapshot = null;
      snapshotMeta = null;
      pieces = [];
      captureGeneration += 1;
      setPreparing(false);
    }

    function scheduleSnapshotRefresh(delay = 120, force = false) {
      window.clearTimeout(snapshotRefreshTimer);
      if (!enabled || reducedMotion.matches || document.hidden) return;
      snapshotRefreshTimer = window.setTimeout(() => {
        snapshotRefreshTimer = 0;
        if (document.body.classList.contains('intro-running')) {
          scheduleSnapshotRefresh(260, force);
          return;
        }
        if (locked || dragging) {
          snapshotRefreshPending = true;
          return;
        }
        snapshotRefreshPending = false;
        prepareSnapshot(force);
      }, delay);
    }

    function prepareSnapshot(force = false) {
      if (!enabled || reducedMotion.matches || document.hidden) return Promise.resolve(null);
      if (!force && snapshotMatchesViewport()) {
        setPreparing(false);
        return Promise.resolve(snapshot);
      }
      if (capturePromise) return capturePromise;

      const generation = ++captureGeneration;
      if (!snapshotMatchesViewport()) setPreparing(true);
      const job = captureViewport(generation);
      capturePromise = job;
      job.catch(() => {
        if (generation !== captureGeneration) return;
        waves = [];
        queuedWaves = [];
        dragging = false;
        setLocked(false);
      }).finally(() => {
        if (capturePromise === job) capturePromise = null;
        if (generation === captureGeneration) setPreparing(false);
        else if (enabled) scheduleSnapshotRefresh(60);
      });
      return job;
    }

    function seededUnit(...values) {
      let seed = 2166136261;
      values.forEach((value) => {
        seed ^= Number(value) + 0x9e3779b9 + (seed << 6) + (seed >>> 2);
        seed = Math.imul(seed, 16777619);
      });
      return (seed >>> 0) / 4294967295;
    }

    function edgeProfile(axis, boundary, index) {
      const axisSeed = axis === 'horizontal' ? 41 : 83;
      return {
        centerRatio: 0.43 + seededUnit(axisSeed, boundary, index, 1) * 0.14,
        baseRatio: 0.165 + seededUnit(axisSeed, boundary, index, 2) * 0.025,
        neckRatio: 0.044 + seededUnit(axisSeed, boundary, index, 3) * 0.014,
        headRatio: 0.118 + seededUnit(axisSeed, boundary, index, 4) * 0.018,
        depthRatio: 0.185 + seededUnit(axisSeed, boundary, index, 5) * 0.035,
        normal: seededUnit(axisSeed, boundary, index, 6) >= 0.5 ? 1 : -1,
      };
    }

    function addHorizontalTab(path, fromX, toX, y, profile) {
      const direction = Math.sign(toX - fromX);
      const length = Math.abs(toX - fromX);
      const minimum = Math.min(fromX, toX);
      const center = minimum + length * profile.centerRatio;
      const base = length * profile.baseRatio;
      const neck = length * profile.neckRatio;
      const head = length * profile.headRatio;
      const depth = Math.min(length * profile.depthRatio, 25) * profile.normal;
      path.lineTo(center - direction * base, y);
      path.bezierCurveTo(center - direction * base * 0.72, y, center - direction * neck * 1.55, y + depth * 0.04, center - direction * neck, y + depth * 0.13);
      path.bezierCurveTo(center - direction * head * 0.96, y + depth * 0.2, center - direction * head * 1.08, y + depth * 0.7, center - direction * head * 0.68, y + depth * 0.91);
      path.bezierCurveTo(center - direction * head * 0.38, y + depth * 1.08, center + direction * head * 0.38, y + depth * 1.08, center + direction * head * 0.68, y + depth * 0.91);
      path.bezierCurveTo(center + direction * head * 1.08, y + depth * 0.7, center + direction * head * 0.96, y + depth * 0.2, center + direction * neck, y + depth * 0.13);
      path.bezierCurveTo(center + direction * neck * 1.55, y + depth * 0.04, center + direction * base * 0.72, y, center + direction * base, y);
      path.lineTo(toX, y);
    }

    function addVerticalTab(path, x, fromY, toY, profile) {
      const direction = Math.sign(toY - fromY);
      const length = Math.abs(toY - fromY);
      const minimum = Math.min(fromY, toY);
      const center = minimum + length * profile.centerRatio;
      const base = length * profile.baseRatio;
      const neck = length * profile.neckRatio;
      const head = length * profile.headRatio;
      const depth = Math.min(length * profile.depthRatio, 25) * profile.normal;
      path.lineTo(x, center - direction * base);
      path.bezierCurveTo(x, center - direction * base * 0.72, x + depth * 0.04, center - direction * neck * 1.55, x + depth * 0.13, center - direction * neck);
      path.bezierCurveTo(x + depth * 0.2, center - direction * head * 0.96, x + depth * 0.7, center - direction * head * 1.08, x + depth * 0.91, center - direction * head * 0.68);
      path.bezierCurveTo(x + depth * 1.08, center - direction * head * 0.38, x + depth * 1.08, center + direction * head * 0.38, x + depth * 0.91, center + direction * head * 0.68);
      path.bezierCurveTo(x + depth * 0.7, center + direction * head * 1.08, x + depth * 0.2, center + direction * head * 0.96, x + depth * 0.13, center + direction * neck);
      path.bezierCurveTo(x + depth * 0.04, center + direction * neck * 1.55, x, center + direction * base * 0.72, x, center + direction * base);
      path.lineTo(x, toY);
    }

    function buildPieces() {
      const columns = lowPower ? 4 : (canvasWidth <= 520 ? 6 : (canvasWidth <= 900 ? 8 : 10));
      const cellWidth = canvasWidth / columns;
      const rows = Math.max(3, Math.ceil(canvasHeight / cellWidth));
      const cellHeight = canvasHeight / rows;
      const result = [];
      for (let row = 0; row < rows; row += 1) {
        for (let column = 0; column < columns; column += 1) {
          const x0 = column * cellWidth;
          const y0 = row * cellHeight;
          const x1 = column === columns - 1 ? canvasWidth : (column + 1) * cellWidth;
          const y1 = row === rows - 1 ? canvasHeight : (row + 1) * cellHeight;
          const path = new Path2D();
          path.moveTo(x0, y0);
          if (row === 0) path.lineTo(x1, y0);
          else addHorizontalTab(path, x0, x1, y0, edgeProfile('horizontal', row, column));
          if (column === columns - 1) path.lineTo(x1, y1);
          else addVerticalTab(path, x1, y0, y1, edgeProfile('vertical', column + 1, row));
          if (row === rows - 1) path.lineTo(x0, y1);
          else addHorizontalTab(path, x1, x0, y1, edgeProfile('horizontal', row + 1, column));
          if (column === 0) path.lineTo(x0, y0);
          else addVerticalTab(path, x0, y1, y0, edgeProfile('vertical', column, row));
          path.closePath();
          const margin = Math.min(cellWidth, cellHeight) * 0.24;
          result.push({
            path,
            centerX: (x0 + x1) / 2,
            centerY: (y0 + y1) / 2,
            sourceX: Math.max(0, x0 - margin),
            sourceY: Math.max(0, y0 - margin),
            sourceWidth: Math.min(canvasWidth, x1 + margin) - Math.max(0, x0 - margin),
            sourceHeight: Math.min(canvasHeight, y1 + margin) - Math.max(0, y0 - margin),
            spin: ((row * 7 + column * 11) % 2 ? 1 : -1) * (0.72 + ((row * 3 + column * 5) % 5) * 0.07),
          });
        }
      }
      return result;
    }

    function setLocked(nextLocked) {
      locked = nextLocked;
      document.body.classList.toggle('qinyi-puzzle-fragmented', locked);
      canvas.classList.toggle('is-visible', locked);
    }

    function finishRelease() {
      window.clearTimeout(releaseTimer);
      releaseTimer = 0;
      if (context) context.clearRect(0, 0, canvasWidth, canvasHeight);
      canvas.classList.remove('is-releasing');
      setLocked(false);
    }

    function resetEffect(immediate = false, discardSnapshot = false) {
      waves = [];
      queuedWaves = [];
      dragging = false;
      if (animationFrame) cancelAnimationFrame(animationFrame);
      animationFrame = 0;
      if (discardSnapshot) invalidateSnapshot();
      if (immediate) {
        finishRelease();
      }
      else {
        window.clearTimeout(releaseTimer);
        canvas.classList.add('is-releasing');
        releaseTimer = window.setTimeout(() => {
          finishRelease();
          if (enabled && snapshotRefreshPending) scheduleSnapshotRefresh(240, true);
        }, 160);
      }
    }

    async function captureViewport(generation) {
      const capture = await ensureCaptureLibrary();
      if (!enabled || generation !== captureGeneration) return null;
      const scrollX = window.scrollX;
      const scrollY = window.scrollY;
      const capturedWidth = canvasWidth;
      const capturedHeight = canvasHeight;
      const captureBlocks = Array.from(document.querySelector('main')?.children || []).map((element, index) => {
        const rect = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        return {
          element,
          index,
          height: rect.height,
          display: style.display,
          margin: style.margin,
          visible: rect.bottom >= -120 && rect.top <= capturedHeight + 120,
        };
      });
      const prunedBlocks = [];
      captureBlocks.forEach((block) => {
        if (block.visible) return;
        const placeholder = document.createElement(block.element.tagName);
        placeholder.setAttribute('aria-hidden', 'true');
        placeholder.style.boxSizing = 'border-box';
        placeholder.style.display = block.display;
        placeholder.style.height = `${block.height}px`;
        placeholder.style.minHeight = `${block.height}px`;
        placeholder.style.margin = block.margin;
        placeholder.style.padding = '0';
        placeholder.style.border = '0';
        block.element.replaceWith(placeholder);
        prunedBlocks.push({ element: block.element, placeholder });
      });
      let pageRestored = false;
      const restorePageBlocks = () => {
        if (pageRestored) return;
        pageRestored = true;
        prunedBlocks.forEach(({ element, placeholder }) => {
          if (placeholder.isConnected) placeholder.replaceWith(element);
        });
      };

      let image;
      try {
        image = await capture(document.documentElement, {
          backgroundColor: null,
          scale: pixelRatio,
          useCORS: true,
          logging: false,
          x: 0,
          y: 0,
          width: capturedWidth,
          height: capturedHeight,
          scrollX: -scrollX,
          scrollY: -scrollY,
          windowWidth: capturedWidth,
          windowHeight: capturedHeight,
          ignoreElements: (element) => (
            element.hasAttribute?.('data-html2canvas-ignore')
            || element.classList?.contains('intro-boot-curtain')
            || (element.classList?.contains('hero-carousel-slide') && !element.classList.contains('is-active'))
            || (element.classList?.contains('qinyi-support-layer') && !document.body.classList.contains('support-open'))
            || (element.classList?.contains('order-portal-layer') && !document.body.classList.contains('order-portal-open'))
          ),
          onclone: (clonedDocument) => {
            restorePageBlocks();
            const clonedBlocks = clonedDocument.querySelector('main')?.children;
            captureBlocks.forEach((block) => {
              if (block.visible || !clonedBlocks?.[block.index]) return;
              const clonedBlock = clonedBlocks[block.index];
              clonedBlock.style.visibility = 'hidden';
              clonedBlock.style.overflow = 'hidden';
            });
            if (scrollY <= 0) return;
            const stickyHeader = clonedDocument.querySelector('.site-header');
            if (!stickyHeader) return;
            const headerOverlay = stickyHeader.cloneNode(true);
            headerOverlay.setAttribute('aria-hidden', 'true');
            headerOverlay.style.position = 'absolute';
            headerOverlay.style.inset = `${scrollY}px 0 auto`;
            headerOverlay.style.width = '100%';
            clonedDocument.body.appendChild(headerOverlay);
          },
        });
      } finally {
        restorePageBlocks();
      }
      if (
        !enabled
        || generation !== captureGeneration
        || capturedWidth !== canvasWidth
        || capturedHeight !== canvasHeight
        || Math.abs(scrollX - window.scrollX) >= 1
        || Math.abs(scrollY - window.scrollY) >= 1
      ) return null;

      snapshot = image;
      snapshotMeta = { width: capturedWidth, height: capturedHeight, scrollX, scrollY };
      pieces = buildPieces();
      updateControls();
      activateSnapshot();
      return image;
    }

    function activateSnapshot() {
      if (!dragging || !snapshot) return;
      if (queuedWaves.length) {
        const shift = performance.now() - queuedWaves[queuedWaves.length - 1].born;
        waves.push(...queuedWaves.map((wave) => ({ ...wave, born: wave.born + shift })));
        queuedWaves = [];
      }
      if (!waves.length) return;
      setLocked(true);
      ensureAnimation();
    }

    function queueWave(point, deltaX, deltaY, elapsed) {
      const target = snapshot ? waves : queuedWaves;
      const previous = target[target.length - 1];
      if (previous && Math.hypot(point.x - previous.x, point.y - previous.y) < 30 && point.time - previous.born < 76) return;
      const distance = Math.hypot(deltaX, deltaY);
      target.push({
        x: point.x,
        y: point.y,
        born: point.time,
        strength: clamp(distance / Math.max(8, elapsed) / 0.8, 0.28, 1),
        directionX: distance ? deltaX / distance : 0,
        directionY: distance ? deltaY / distance : 0,
      });
      if (target.length > 20) target.splice(0, target.length - 20);
    }

    function drawPiece(piece, now) {
      const configuration = settings[level];
      const maximumRadius = Math.hypot(canvasWidth, canvasHeight);
      let offsetX = 0;
      let offsetY = 0;
      let rotation = 0;
      let energy = 0;
      waves.forEach((wave) => {
        const deltaX = piece.centerX - wave.x;
        const deltaY = piece.centerY - wave.y;
        const distance = Math.hypot(deltaX, deltaY);
        const arrival = (distance / maximumRadius) * 620;
        const age = now - wave.born - arrival;
        const duration = Math.max(900, 2000 - arrival);
        if (age < 0 || age > duration) return;
        const attack = clamp(age / 115);
        const decay = Math.pow(1 - clamp(age / duration), 1.45);
        const envelope = attack * decay * wave.strength;
        const radialX = distance ? deltaX / distance : wave.directionX;
        const radialY = distance ? deltaY / distance : wave.directionY;
        offsetX += (radialX * 0.76 + wave.directionX * 0.24) * envelope * configuration.offset;
        offsetY += (radialY * 0.76 + wave.directionY * 0.24) * envelope * configuration.offset;
        rotation += piece.spin * envelope * configuration.rotation;
        energy += envelope;
      });
      const maximumOffset = configuration.offset * 1.55;
      const magnitude = Math.hypot(offsetX, offsetY);
      if (magnitude > maximumOffset) {
        offsetX *= maximumOffset / magnitude;
        offsetY *= maximumOffset / magnitude;
      }
      rotation = clamp(rotation, -configuration.rotation * 1.45, configuration.rotation * 1.45);

      context.save();
      context.translate(piece.centerX + offsetX, piece.centerY + offsetY);
      context.rotate(rotation * Math.PI / 180);
      context.translate(-piece.centerX, -piece.centerY);
      if (energy > 0.035) {
        context.save();
        context.shadowColor = `rgba(18, 20, 17, ${Math.min(0.2, energy * 0.08)})`;
        context.shadowBlur = Math.min(9, 3 + energy * 3);
        context.shadowOffsetX = offsetX * 0.18;
        context.shadowOffsetY = offsetY * 0.18 + 2;
        context.fillStyle = 'rgba(255,255,255,.01)';
        context.fill(piece.path);
        context.restore();
      }
      context.clip(piece.path);
      context.drawImage(
        snapshot,
        piece.sourceX * pixelRatio,
        piece.sourceY * pixelRatio,
        piece.sourceWidth * pixelRatio,
        piece.sourceHeight * pixelRatio,
        piece.sourceX,
        piece.sourceY,
        piece.sourceWidth,
        piece.sourceHeight,
      );
      context.restore();

      if (energy > 0.025) {
        context.save();
        context.translate(piece.centerX + offsetX, piece.centerY + offsetY);
        context.rotate(rotation * Math.PI / 180);
        context.translate(-piece.centerX, -piece.centerY);
        context.strokeStyle = `rgba(17, 20, 18, ${Math.min(0.34, 0.08 + energy * 0.13)})`;
        context.lineWidth = 0.85;
        context.stroke(piece.path);
        context.restore();
      }
    }

    function render(now) {
      animationFrame = 0;
      if (!enabled || !locked || !snapshot || !context) return;
      waves = waves.filter((wave) => now - wave.born < 2000);
      context.clearRect(0, 0, canvasWidth, canvasHeight);
      context.fillStyle = 'rgba(18, 20, 17, .2)';
      context.fillRect(0, 0, canvasWidth, canvasHeight);
      context.globalAlpha = settings[level].baseOpacity;
      context.drawImage(snapshot, 0, 0, canvasWidth, canvasHeight);
      context.globalAlpha = 1;
      pieces.forEach((piece) => drawPiece(piece, now));
      if (waves.length || activePointer !== null) ensureAnimation();
      else resetEffect(false);
    }

    function ensureAnimation() {
      if (!animationFrame) animationFrame = requestAnimationFrame(render);
    }

    function begin(point, pointerId) {
      if (locked && canvas.classList.contains('is-releasing')) finishRelease();
      if (!enabled || reducedMotion.matches || point.target?.closest?.('.qinyi-puzzle-controls') || locked) return;
      window.clearTimeout(snapshotRefreshTimer);
      snapshotRefreshTimer = 0;
      if (!snapshotMatchesViewport()) invalidateSnapshot();
      else if (capturePromise) {
        captureGeneration += 1;
        setPreparing(false);
      }
      activePointer = pointerId;
      startPoint = point;
      lastPoint = point;
      dragging = false;
      queuedWaves = [];
      if (!snapshot) prepareSnapshot();
    }

    function move(point, pointerId, event) {
      if (!enabled || activePointer !== pointerId || !lastPoint) return;
      const deltaX = point.x - lastPoint.x;
      const deltaY = point.y - lastPoint.y;
      const distanceFromStart = Math.hypot(point.x - startPoint.x, point.y - startPoint.y);
      if (!dragging && distanceFromStart < (point.pointerType === 'touch' ? 9 : 5)) return;
      if (!dragging) dragging = true;
      event.preventDefault();
      queueWave(point, deltaX, deltaY, point.time - lastPoint.time);
      lastPoint = point;
      if (snapshot) activateSnapshot();
    }

    function release(pointerId) {
      if (activePointer !== pointerId) return;
      activePointer = null;
      startPoint = null;
      lastPoint = null;
      if (!dragging) {
        queuedWaves = [];
        return;
      }
      if (snapshot) activateSnapshot();
    }

    function setLevel(nextLevel) {
      const parsedLevel = Number(nextLevel);
      level = Number.isFinite(parsedLevel) ? clamp(parsedLevel, 0, 2) : 1;
      try { window.localStorage.setItem('qinyi-puzzle-level', String(level)); }
      catch (_error) { /* The control remains usable when storage is blocked. */ }
      updateControls();
    }

    function setEnabled(nextEnabled, showInstruction = true) {
      enabled = Boolean(nextEnabled) && !reducedMotion.matches;
      document.body.classList.toggle('qinyi-puzzle-enabled', enabled);
      if (!enabled) {
        window.clearTimeout(snapshotRefreshTimer);
        snapshotRefreshTimer = 0;
        activePointer = null;
        startPoint = null;
        lastPoint = null;
        dragging = false;
        resetEffect(true);
        setPreparing(false);
      } else {
        if (!snapshotMatchesViewport()) setPreparing(true);
        ensureCaptureLibrary()
          .then(() => scheduleSnapshotRefresh(0))
          .catch(() => setEnabled(false, false));
        if (showInstruction) showHint(4200, true);
      }
      try { window.localStorage.setItem('qinyi-puzzle-enabled', String(enabled)); }
      catch (_error) { /* The control remains usable when storage is blocked. */ }
      updateControls();
    }

    button.addEventListener('click', () => setEnabled(!enabled));
    levelButtons.forEach((levelButton) => levelButton.addEventListener('click', () => setLevel(levelButton.dataset.puzzleLevel)));
    document.addEventListener('click', (event) => {
      if (locked && !event.target.closest?.('.qinyi-puzzle-controls')) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    }, true);
    document.addEventListener('dragstart', (event) => {
      if (enabled && event.target instanceof HTMLImageElement) event.preventDefault();
    });
    document.addEventListener('pointerdown', (event) => {
      if (!event.isPrimary || event.button > 0) return;
      try { event.target.setPointerCapture?.(event.pointerId); }
      catch (_error) { /* Pointer capture is optional. */ }
      begin({ x: event.clientX, y: event.clientY, time: performance.now(), target: event.target, pointerType: event.pointerType }, event.pointerId);
    }, { passive: true });
    document.addEventListener('pointermove', (event) => {
      if (!event.isPrimary) return;
      move({ x: event.clientX, y: event.clientY, time: performance.now(), target: event.target, pointerType: event.pointerType }, event.pointerId, event);
    }, { passive: false });
    document.addEventListener('pointerup', (event) => release(event.pointerId), { passive: true });
    document.addEventListener('pointercancel', (event) => release(event.pointerId), { passive: true });
    window.addEventListener('blur', () => { if (activePointer !== null) release(activePointer); });
    window.addEventListener('resize', () => {
      resetEffect(true, true);
      resizeCanvas();
      scheduleSnapshotRefresh(160);
    }, { passive: true });
    window.addEventListener('scroll', () => {
      if (locked) resetEffect(false, true);
      else invalidateSnapshot();
      scheduleSnapshotRefresh(180);
    }, { passive: true });
    document.addEventListener('qinyi:visual-change', () => {
      if (locked || dragging) {
        snapshotRefreshPending = true;
        return;
      }
      scheduleSnapshotRefresh(220, true);
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        if (locked) resetEffect(true, true);
        return;
      }
      invalidateSnapshot();
      scheduleSnapshotRefresh(120);
    });
    reducedMotion.addEventListener?.('change', () => {
      if (reducedMotion.matches) setEnabled(false);
      updateControls();
    });

    resizeCanvas();
    setLevel(level);
    updateControls();
    if (savedPreference && !reducedMotion.matches) setEnabled(true, false);
    else {
      const warmCaptureLibrary = () => window.setTimeout(() => {
        ensureCaptureLibrary().catch(() => { libraryPromise = null; });
      }, 700);
      if (document.readyState === 'complete') warmCaptureLibrary();
      else window.addEventListener('load', warmCaptureLibrary, { once: true });
    }
    let hintSeen = false;
    try { hintSeen = window.localStorage.getItem('qinyi-puzzle-hint-seen') === 'true'; }
    catch (_error) { /* A first-visit hint is still useful when storage is blocked. */ }
    if (!hintSeen) window.setTimeout(() => showHint(6000, true), 700);
  }

  installHeroCarousel();
  installPuzzleInteraction();
})();
