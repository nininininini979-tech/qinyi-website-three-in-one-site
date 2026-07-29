(() => {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const locale = String(window.QINYI_I18N?.locale || document.documentElement.lang || 'en');
  const isChinese = locale.toLowerCase().startsWith('zh');
  const copy = isChinese ? {
    carousel: '首页推荐产品',
    previous: '上一张推荐图片',
    next: '下一张推荐图片',
    slide: (current, total, title) => `第 ${current} 张，共 ${total} 张：${title}`,
    waterOn: '关闭水流交互',
    waterOff: '开启水流交互',
    waterReduced: '系统已启用减少动态效果',
  } : {
    carousel: 'Featured products',
    previous: 'Previous featured image',
    next: 'Next featured image',
    slide: (current, total, title) => `Slide ${current} of ${total}: ${title}`,
    waterOn: 'Turn off water interaction',
    waterOff: 'Turn on water interaction',
    waterReduced: 'Motion is reduced by your system settings',
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

  function installWaterInteraction() {
    const lowPower = typeof navigator.hardwareConcurrency === 'number' && navigator.hardwareConcurrency <= 2;
    const supportsSvgFilter = window.CSS?.supports?.('filter', 'url("#qinyi-water-displacement")') !== false;
    const useDisplacement = supportsSvgFilter && !lowPower && !reducedMotion.matches;
    const savedPreference = (() => {
      try { return window.localStorage.getItem('qinyi-water-enabled') === 'true'; }
      catch (_error) { return false; }
    })();

    const filterHost = document.createElement('div');
    filterHost.className = 'qinyi-water-filter-host';
    filterHost.setAttribute('aria-hidden', 'true');
    filterHost.setAttribute('data-html2canvas-ignore', 'true');
    filterHost.innerHTML = `<svg width="0" height="0"><filter id="qinyi-water-displacement" x="-8%" y="-8%" width="116%" height="116%" color-interpolation-filters="sRGB"><feTurbulence id="qinyi-water-noise" type="fractalNoise" baseFrequency="0.012 0.018" numOctaves="2" seed="8" result="noise"/><feGaussianBlur in="noise" stdDeviation="0.7" result="softNoise"/><feDisplacementMap id="qinyi-water-map" in="SourceGraphic" in2="softNoise" scale="0" xChannelSelector="R" yChannelSelector="B"/></filter></svg>`;

    const canvas = document.createElement('canvas');
    canvas.className = 'qinyi-water-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    canvas.setAttribute('data-html2canvas-ignore', 'true');
    const button = document.createElement('button');
    button.className = 'qinyi-water-toggle';
    button.type = 'button';
    button.setAttribute('data-html2canvas-ignore', 'true');
    button.innerHTML = '<span class="qinyi-water-icon" aria-hidden="true"><i></i><i></i><i></i></span>';
    document.body.append(filterHost, canvas, button);

    const noise = filterHost.querySelector('#qinyi-water-noise');
    const displacement = filterHost.querySelector('#qinyi-water-map');
    const context = canvas.getContext('2d', { alpha: true });
    const images = new Set();
    const observer = 'IntersectionObserver' in window
      ? new IntersectionObserver((entries) => entries.forEach((entry) => {
          entry.target.classList.toggle('qinyi-water-visible', entry.isIntersecting);
          if (entry.isIntersecting) images.add(entry.target);
          else images.delete(entry.target);
        }), { rootMargin: '120px' })
      : null;
    document.querySelectorAll('img').forEach((image) => {
      if (observer) observer.observe(image);
      else {
        image.classList.add('qinyi-water-visible');
        images.add(image);
      }
    });

    let enabled = false;
    let activePointer = null;
    let dragging = false;
    let lastPoint = null;
    let currentIntensity = 0;
    let releaseIntensity = 0;
    let releaseStarted = 0;
    let animationFrame = 0;
    let ripples = [];
    let canvasWidth = 0;
    let canvasHeight = 0;

    function resizeCanvas() {
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
      canvasWidth = window.innerWidth;
      canvasHeight = window.innerHeight;
      canvas.width = Math.round(canvasWidth * ratio);
      canvas.height = Math.round(canvasHeight * ratio);
      canvas.style.width = `${canvasWidth}px`;
      canvas.style.height = `${canvasHeight}px`;
      context?.setTransform(ratio, 0, 0, ratio, 0, 0);
    }

    function updateButton() {
      const label = reducedMotion.matches ? copy.waterReduced : (enabled ? copy.waterOn : copy.waterOff);
      button.setAttribute('aria-label', label);
      button.setAttribute('title', label);
      button.setAttribute('aria-pressed', String(enabled));
      button.classList.toggle('is-active', enabled);
      button.disabled = reducedMotion.matches;
    }

    function setFilter(intensity, directionX = 0, directionY = 0) {
      if (!useDisplacement) return;
      const horizontalFrequency = 0.011 + Math.abs(directionY) * 0.006;
      const verticalFrequency = 0.016 + Math.abs(directionX) * 0.008;
      noise.setAttribute('baseFrequency', `${horizontalFrequency.toFixed(4)} ${verticalFrequency.toFixed(4)}`);
      displacement.setAttribute('scale', String((intensity * 13).toFixed(2)));
    }

    function addRipple(point, strength, angle) {
      const previous = ripples[ripples.length - 1];
      if (previous && Math.hypot(point.x - previous.x, point.y - previous.y) < 18 && point.time - previous.born < 48) return;
      ripples.push({ x: point.x, y: point.y, born: point.time, strength, angle });
      if (ripples.length > 28) ripples = ripples.slice(-28);
    }

    function drawRipples(now) {
      if (!context) return;
      context.clearRect(0, 0, canvasWidth, canvasHeight);
      ripples = ripples.filter((ripple) => now - ripple.born < 2000);
      ripples.forEach((ripple) => {
        const progress = clamp((now - ripple.born) / 2000);
        const alpha = (1 - progress) * (0.05 + ripple.strength * 0.11);
        const radius = 10 + progress * (46 + ripple.strength * 38);
        context.save();
        context.translate(ripple.x, ripple.y);
        context.rotate(ripple.angle);
        context.scale(1.35, 0.72);
        context.beginPath();
        context.arc(0, 0, radius, 0, Math.PI * 2);
        context.strokeStyle = `rgba(240, 252, 248, ${alpha.toFixed(3)})`;
        context.lineWidth = 1.15;
        context.stroke();
        context.beginPath();
        context.arc(0, 0, radius * 0.72, 0, Math.PI * 2);
        context.strokeStyle = `rgba(34, 88, 91, ${(alpha * 0.52).toFixed(3)})`;
        context.lineWidth = 0.75;
        context.stroke();
        context.restore();
      });
    }

    function render(now) {
      if (!enabled) return;
      if (activePointer === null && releaseStarted) {
        const progress = clamp((now - releaseStarted) / 2000);
        currentIntensity = releaseIntensity * Math.pow(1 - progress, 2.2);
        setFilter(currentIntensity);
        if (progress >= 1) {
          currentIntensity = 0;
          releaseStarted = 0;
          document.body.classList.remove('qinyi-water-dragging');
          setFilter(0);
        }
      }
      drawRipples(now);
      if (activePointer !== null || releaseStarted || ripples.length) animationFrame = requestAnimationFrame(render);
      else animationFrame = 0;
    }

    function ensureAnimation() {
      if (!animationFrame) animationFrame = requestAnimationFrame(render);
    }

    function begin(point, pointerId) {
      if (!enabled || reducedMotion.matches || point.target?.closest?.('.qinyi-water-toggle')) return;
      activePointer = pointerId;
      dragging = false;
      lastPoint = point;
      releaseStarted = 0;
    }

    function move(point, pointerId) {
      if (!enabled || activePointer !== pointerId || !lastPoint) return;
      const elapsed = Math.max(8, point.time - lastPoint.time);
      const deltaX = point.x - lastPoint.x;
      const deltaY = point.y - lastPoint.y;
      const distance = Math.hypot(deltaX, deltaY);
      if (!dragging && distance < 3) return;
      if (!dragging) {
        dragging = true;
        document.body.classList.add('qinyi-water-dragging');
      }
      const strength = clamp(distance / elapsed / 1.25, 0.12, 1);
      currentIntensity += (strength - currentIntensity) * 0.48;
      const directionX = distance ? deltaX / distance : 0;
      const directionY = distance ? deltaY / distance : 0;
      setFilter(currentIntensity, directionX, directionY);
      document.documentElement.style.setProperty('--water-shift-x', `${(directionX * currentIntensity * 1.8).toFixed(2)}px`);
      document.documentElement.style.setProperty('--water-shift-y', `${(directionY * currentIntensity * 1.8).toFixed(2)}px`);
      addRipple(point, strength, Math.atan2(deltaY, deltaX));
      lastPoint = point;
      ensureAnimation();
    }

    function release(pointerId) {
      if (activePointer !== pointerId) return;
      activePointer = null;
      lastPoint = null;
      if (!dragging) return;
      dragging = false;
      releaseIntensity = Math.max(currentIntensity, 0.18);
      releaseStarted = performance.now();
      ensureAnimation();
    }

    function setEnabled(nextEnabled) {
      enabled = Boolean(nextEnabled) && !reducedMotion.matches;
      document.body.classList.toggle('qinyi-water-enabled', enabled);
      document.body.classList.toggle('qinyi-water-fallback', enabled && !useDisplacement);
      if (!enabled) {
        activePointer = null;
        dragging = false;
        lastPoint = null;
        releaseStarted = 0;
        currentIntensity = 0;
        ripples = [];
        document.body.classList.remove('qinyi-water-dragging');
        context?.clearRect(0, 0, canvasWidth, canvasHeight);
        setFilter(0);
        if (animationFrame) cancelAnimationFrame(animationFrame);
        animationFrame = 0;
      }
      try { window.localStorage.setItem('qinyi-water-enabled', String(enabled)); }
      catch (_error) { /* The control remains usable when storage is blocked. */ }
      updateButton();
    }

    button.addEventListener('click', () => setEnabled(!enabled));
    document.addEventListener('dragstart', (event) => {
      if (enabled && event.target instanceof HTMLImageElement) event.preventDefault();
    });
    document.addEventListener('pointerdown', (event) => {
      if (!event.isPrimary || event.button > 0) return;
      begin({ x: event.clientX, y: event.clientY, time: performance.now(), target: event.target }, event.pointerId);
    }, { passive: true });
    document.addEventListener('pointermove', (event) => {
      if (!event.isPrimary) return;
      move({ x: event.clientX, y: event.clientY, time: performance.now(), target: event.target }, event.pointerId);
    }, { passive: true });
    document.addEventListener('pointerup', (event) => release(event.pointerId), { passive: true });
    document.addEventListener('pointercancel', (event) => release(event.pointerId), { passive: true });
    window.addEventListener('blur', () => { if (activePointer !== null) release(activePointer); });
    window.addEventListener('resize', resizeCanvas, { passive: true });
    reducedMotion.addEventListener?.('change', () => {
      if (reducedMotion.matches) setEnabled(false);
      updateButton();
    });

    resizeCanvas();
    updateButton();
    if (savedPreference && !reducedMotion.matches) setEnabled(true);
  }

  installHeroCarousel();
  installWaterInteraction();
})();
