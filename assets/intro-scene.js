let THREE;

const CONFIG = {
  scrollDistance: 2.2,
  handoffStart: 0.986,
  desktop: { columns: 6, rows: 5, dust: 88, webSegments: 17, pixelRatio: 1.75 },
  mobile: { columns: 3, rows: 6, dust: 42, webSegments: 11, pixelRatio: 1.35 },
};
const INTRO_SESSION_KEY = 'qinyi-intro-seen';

function sessionIntroSeen() {
  try {
    return window.sessionStorage.getItem(INTRO_SESSION_KEY) === 'true';
  } catch {
    return false;
  }
}

function markSessionIntroSeen() {
  try {
    window.sessionStorage.setItem(INTRO_SESSION_KEY, 'true');
  } catch {
    // The intro remains usable when storage is blocked.
  }
}

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const lerp = (from, to, progress) => from + (to - from) * progress;
const range = (value, from, to) => clamp((value - from) / (to - from));
const smooth = (value) => {
  const progress = clamp(value);
  return progress * progress * (3 - 2 * progress);
};
const easeOutCubic = (value) => 1 - Math.pow(1 - clamp(value), 3);

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function supportsWebGL() {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

function loadClassicScript(relativeUrl, globalName) {
  if (window[globalName]) return Promise.resolve(window[globalName]);
  const source = new URL(relativeUrl, import.meta.url).href;
  const registry = window.__qinyiVendorLoads ||= {};
  if (!registry[source]) {
    const request = new Promise((resolve, reject) => {
      const existing = Array.from(document.scripts).find((script) => script.src === source);
      const script = existing || document.createElement('script');
      const finish = () => window[globalName]
        ? resolve(window[globalName])
        : reject(new Error(`${globalName} unavailable`));
      script.addEventListener('load', finish, { once: true });
      script.addEventListener('error', () => reject(new Error(`${globalName} failed to load`)), { once: true });
      if (!existing) {
        script.src = source;
        script.async = true;
        document.head.appendChild(script);
      }
    });
    registry[source] = request.catch((error) => {
      delete registry[source];
      throw error;
    });
  }
  return registry[source];
}

async function loadIntroDependencies() {
  const [threeModule] = await Promise.all([
    import('./vendor/three.min.js'),
    loadClassicScript('./vendor/html2canvas.min.js', 'html2canvas'),
    loadClassicScript('./vendor/gsap.min.js', 'gsap'),
  ]);
  THREE = threeModule;
  await loadClassicScript('./vendor/ScrollTrigger.min.js', 'ScrollTrigger');
}

function waitForFrame() {
  return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
}

async function waitForPageAssets() {
  if (document.fonts?.ready) await document.fonts.ready;
  const images = Array.from(document.querySelectorAll('.site-header img, .hero img'));
  await Promise.all(images.map(async (image) => {
    if (image.complete) {
      if (image.decode) await image.decode().catch(() => {});
      return;
    }
    await new Promise((resolve) => {
      image.addEventListener('load', resolve, { once: true });
      image.addEventListener('error', resolve, { once: true });
    });
  }));
  await waitForFrame();
}

function cleanCaptureClone(clonedDocument) {
  clonedDocument.documentElement.classList.remove('intro-capable', 'intro-ready');
  clonedDocument.body.classList.remove('intro-running', 'intro-complete');
  clonedDocument.querySelectorAll('.intro-boot-curtain, .puzzle-intro-stage').forEach((node) => node.remove());

  const pinSpacer = clonedDocument.querySelector('.pin-spacer');
  const pinnedHero = pinSpacer?.querySelector('.hero');
  if (pinSpacer && pinnedHero) {
    pinnedHero.removeAttribute('style');
    pinSpacer.replaceWith(pinnedHero);
  }

  clonedDocument.querySelectorAll('.site-header, #main, .site-footer, .mobile-rfq').forEach((node) => {
    node.removeAttribute('inert');
    node.removeAttribute('aria-hidden');
  });
}

async function captureViewport() {
  const mobile = window.innerWidth <= 760;
  const scale = Math.min(window.devicePixelRatio || 1, mobile ? 1.25 : 1.5);
  return window.html2canvas(document.body, {
    allowTaint: false,
    backgroundColor: '#fffefa',
    height: window.innerHeight,
    ignoreElements: (element) => element.classList?.contains('intro-boot-curtain')
      || element.classList?.contains('puzzle-intro-stage'),
    logging: false,
    onclone: cleanCaptureClone,
    scale,
    scrollX: 0,
    scrollY: 0,
    useCORS: true,
    width: window.innerWidth,
    windowHeight: window.innerHeight,
    windowWidth: window.innerWidth,
    x: 0,
    y: 0,
  });
}

function createStage() {
  const stage = document.createElement('div');
  stage.className = 'puzzle-intro-stage';
  const isChinese = document.documentElement.lang.toLowerCase().startsWith('zh');
  const skipLabel = isChinese ? '跳过动画' : 'Skip intro';
  stage.innerHTML = `<canvas aria-hidden="true"></canvas><button class="puzzle-intro-skip" type="button">${skipLabel}</button>`;
  document.body.appendChild(stage);
  return stage;
}

function tabProfile(position) {
  const keys = [
    [0, 0], [.28, 0], [.34, -.055], [.39, .12], [.43, .49],
    [.5, .72], [.57, .49], [.61, .12], [.66, -.055], [.72, 0], [1, 0],
  ];

  for (let index = 1; index < keys.length; index += 1) {
    const previous = keys[index - 1];
    const current = keys[index];
    if (position <= current[0]) {
      const local = smooth((position - previous[0]) / (current[0] - previous[0]));
      return lerp(previous[1], current[1], local);
    }
  }
  return 0;
}

function buildBoundaryMaps(rows, columns, random) {
  const horizontal = Array.from({ length: rows + 1 }, () => Array(columns).fill(0));
  const vertical = Array.from({ length: rows }, () => Array(columns + 1).fill(0));

  for (let row = 1; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      horizontal[row][column] = random() > .5 ? 1 : -1;
    }
  }

  for (let row = 0; row < rows; row += 1) {
    for (let column = 1; column < columns; column += 1) {
      vertical[row][column] = random() > .5 ? 1 : -1;
    }
  }
  return { horizontal, vertical };
}

function boundaryPoints({
  axis, boundary, cell, cellSize, count, depth, length, maps, reverse,
}) {
  const points = [];
  for (let index = 0; index <= count; index += 1) {
    const progress = index / count;
    if (axis === 'horizontal') {
      const baseY = length.height / 2 - boundary * cellSize.height;
      const direction = maps.horizontal[boundary][cell] || 0;
      points.push(new THREE.Vector2(
        -length.width / 2 + (cell + progress) * cellSize.width,
        baseY - direction * tabProfile(progress) * depth,
      ));
    } else {
      const baseX = -length.width / 2 + boundary * cellSize.width;
      const direction = maps.vertical[cell][boundary] || 0;
      points.push(new THREE.Vector2(
        baseX + direction * tabProfile(progress) * depth,
        length.height / 2 - (cell + progress) * cellSize.height,
      ));
    }
  }
  return reverse ? points.reverse() : points;
}

function disposeMaterial(material) {
  if (!material) return;
  if (Array.isArray(material)) material.forEach(disposeMaterial);
  else material.dispose();
}

class PuzzleIntro {
  constructor(stage, snapshot, hero, header) {
    this.stage = stage;
    this.canvas = stage.querySelector('canvas');
    this.hero = hero;
    this.header = header;
    this.snapshot = snapshot;
    this.mobile = window.innerWidth <= 760;
    this.profile = this.mobile ? CONFIG.mobile : CONFIG.desktop;
    this.progress = 0;
    this.interactive = null;
    this.resizeTimer = 0;
    this.resizeGeneration = 0;
    this.resizePending = false;
    this.resizeProgress = 0;
    this.destroyed = false;
    this.lastViewport = { width: window.innerWidth, height: window.innerHeight };
    this.inertNodes = [header, document.querySelector('#main'), document.querySelector('.site-footer'), document.querySelector('.mobile-rfq')].filter(Boolean);

    this.renderer = new THREE.WebGLRenderer({
      alpha: false,
      antialias: !this.mobile,
      canvas: this.canvas,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.setClearColor(0x060807, 1);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.profile.pixelRatio));

    this.handleResize = this.handleResize.bind(this);
    this.handlePageHide = this.handlePageHide.bind(this);
    this.handleSkip = this.handleSkip.bind(this);
    this.skipLink = document.querySelector('.skip-link');
    this.skipButton = stage.querySelector('.puzzle-intro-skip');
  }

  init() {
    document.body.classList.add('intro-running');
    this.setInteractive(false);
    this.buildScene(this.snapshot);
    this.setupScroll();
    this.skipLink?.addEventListener('click', this.handleSkip);
    this.skipButton?.addEventListener('click', this.handleSkip);
    window.addEventListener('resize', this.handleResize, { capture: true, passive: true });
    window.addEventListener('pagehide', this.handlePageHide);
    this.render(0);
  }

  buildScene(snapshot) {
    this.disposeScene();
    this.mobile = window.innerWidth <= 760;
    this.profile = this.mobile ? CONFIG.mobile : CONFIG.desktop;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.profile.pixelRatio));
    this.renderer.setSize(window.innerWidth, window.innerHeight, false);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x060807);
    this.camera = new THREE.PerspectiveCamera(34, window.innerWidth / window.innerHeight, .1, 40);
    this.camera.position.set(0, 0, 8);

    const visibleHeight = 2 * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) * this.camera.position.z;
    const visibleWidth = visibleHeight * this.camera.aspect;
    this.world = { width: visibleWidth, height: visibleHeight };

    this.texture = new THREE.CanvasTexture(snapshot);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.generateMipmaps = false;
    this.texture.minFilter = THREE.LinearFilter;
    this.texture.magFilter = THREE.LinearFilter;

    this.puzzleGroup = new THREE.Group();
    this.scene.add(this.puzzleGroup);
    this.createLights();
    this.createPuzzle();
    this.createDust();
    this.createWebs();
    this.render(this.progress);
  }

  createLights() {
    this.scene.add(new THREE.AmbientLight(0xe9e4d7, .65));
    const red = new THREE.PointLight(0xd93524, 4.2, 14);
    red.position.set(-this.world.width * .55, this.world.height * .2, 2.4);
    const blue = new THREE.PointLight(0x3a61d8, 3.6, 14);
    blue.position.set(this.world.width * .55, -this.world.height * .15, 2.2);
    this.scene.add(red, blue);
  }

  createPuzzle() {
    const { rows, columns } = this.profile;
    const random = seededRandom(this.mobile ? 1979 : 1998);
    const cellSize = {
      width: this.world.width / columns,
      height: this.world.height / rows,
    };
    const minimumCell = Math.min(cellSize.width, cellSize.height);
    const tabDepth = minimumCell * .31;
    const boundaryCount = this.mobile ? 10 : 14;
    const maps = buildBoundaryMaps(rows, columns, random);

    this.faceMaterial = new THREE.MeshBasicMaterial({ map: this.texture, toneMapped: false });
    this.sideMaterial = new THREE.MeshStandardMaterial({
      color: 0x1e211e,
      metalness: .08,
      roughness: .58,
    });
    this.pieces = [];

    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const top = boundaryPoints({
          axis: 'horizontal', boundary: row, cell: column, cellSize, count: boundaryCount,
          depth: tabDepth, length: this.world, maps, reverse: false,
        });
        const right = boundaryPoints({
          axis: 'vertical', boundary: column + 1, cell: row, cellSize, count: boundaryCount,
          depth: tabDepth, length: this.world, maps, reverse: false,
        });
        const bottom = boundaryPoints({
          axis: 'horizontal', boundary: row + 1, cell: column, cellSize, count: boundaryCount,
          depth: tabDepth, length: this.world, maps, reverse: true,
        });
        const left = boundaryPoints({
          axis: 'vertical', boundary: column, cell: row, cellSize, count: boundaryCount,
          depth: tabDepth, length: this.world, maps, reverse: true,
        });
        const outline = [...top, ...right.slice(1), ...bottom.slice(1), ...left.slice(1, -1)];
        const center = new THREE.Vector3(
          -this.world.width / 2 + (column + .5) * cellSize.width,
          this.world.height / 2 - (row + .5) * cellSize.height,
          0,
        );
        const shape = new THREE.Shape();
        shape.moveTo(outline[0].x - center.x, outline[0].y - center.y);
        outline.slice(1).forEach((point) => shape.lineTo(point.x - center.x, point.y - center.y));
        shape.closePath();

        const depth = minimumCell * .055;
        const geometry = new THREE.ExtrudeGeometry(shape, {
          bevelEnabled: true,
          bevelSegments: this.mobile ? 1 : 2,
          bevelSize: minimumCell * .012,
          bevelThickness: minimumCell * .016,
          curveSegments: 1,
          depth,
          steps: 1,
        });
        geometry.translate(0, 0, -depth / 2);
        const positions = geometry.getAttribute('position');
        const uv = new Float32Array(positions.count * 2);
        for (let index = 0; index < positions.count; index += 1) {
          const globalX = positions.getX(index) + center.x;
          const globalY = positions.getY(index) + center.y;
          uv[index * 2] = (globalX + this.world.width / 2) / this.world.width;
          uv[index * 2 + 1] = (globalY + this.world.height / 2) / this.world.height;
        }
        geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
        geometry.computeVertexNormals();

        const mesh = new THREE.Mesh(geometry, [this.faceMaterial, this.sideMaterial]);
        const pieceIndex = row * columns + column;
        const angle = pieceIndex * 2.399963 + random() * .9;
        const scatterRadius = Math.min(this.world.width, this.world.height) * (.23 + random() * .34);
        const scatter = new THREE.Vector3(
          center.x + Math.cos(angle) * scatterRadius * (this.mobile ? .72 : 1),
          center.y + Math.sin(angle) * scatterRadius,
          (random() - .42) * 1.55,
        );
        const rotation = new THREE.Euler(
          (random() - .5) * .68,
          (random() - .5) * .72,
          (random() - .5) * .86,
        );
        const radial = Math.hypot(center.x / this.world.width, center.y / this.world.height);
        const order = clamp(radial * 1.35 + random() * .42);

        mesh.position.copy(scatter);
        mesh.rotation.copy(rotation);
        mesh.userData.index = pieceIndex;
        this.puzzleGroup.add(mesh);
        this.pieces.push({ center, column, mesh, order, rotation, row, scatter });
      }
    }

    this.finalMaterial = new THREE.MeshBasicMaterial({
      depthTest: false,
      map: this.texture,
      opacity: 0,
      toneMapped: false,
      transparent: true,
    });
    this.finalPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(this.world.width, this.world.height),
      this.finalMaterial,
    );
    this.finalPlane.position.z = .12;
    this.finalPlane.renderOrder = 10;
    this.puzzleGroup.add(this.finalPlane);
  }

  createDust() {
    const random = seededRandom(this.mobile ? 3987 : 4021);
    const positions = new Float32Array(this.profile.dust * 3);
    this.dustBase = new Float32Array(this.profile.dust * 3);
    this.dustPhase = new Float32Array(this.profile.dust);
    for (let index = 0; index < this.profile.dust; index += 1) {
      const offset = index * 3;
      this.dustBase[offset] = (random() - .5) * this.world.width * 1.15;
      this.dustBase[offset + 1] = (random() - .5) * this.world.height * 1.15;
      this.dustBase[offset + 2] = -1.2 + random() * 2.6;
      this.dustPhase[index] = random() * Math.PI * 2;
      positions[offset] = this.dustBase[offset];
      positions[offset + 1] = this.dustBase[offset + 1];
      positions[offset + 2] = this.dustBase[offset + 2];
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
      blending: THREE.AdditiveBlending,
      color: 0xd7d3c7,
      depthWrite: false,
      opacity: .32,
      size: this.mobile ? .018 : .014,
      sizeAttenuation: true,
      transparent: true,
    });
    this.dust = new THREE.Points(geometry, material);
    this.scene.add(this.dust);
  }

  anchorForPiece(piece) {
    const xRatio = piece.scatter.x / (this.world.width / 2);
    const yRatio = piece.scatter.y / (this.world.height / 2);
    if (Math.abs(xRatio) > Math.abs(yRatio)) {
      return new THREE.Vector3(
        Math.sign(xRatio || 1) * this.world.width * .61,
        clamp(piece.scatter.y, -this.world.height * .44, this.world.height * .44),
        .34,
      );
    }
    return new THREE.Vector3(
      clamp(piece.scatter.x, -this.world.width * .44, this.world.width * .44),
      Math.sign(yRatio || 1) * this.world.height * .61,
      .34,
    );
  }

  createWebLine(color, opacity) {
    const positions = new Float32Array(this.profile.webSegments * 3);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setDrawRange(0, 0);
    const material = new THREE.LineBasicMaterial({
      blending: THREE.AdditiveBlending,
      color,
      depthWrite: false,
      opacity,
      transparent: true,
    });
    const line = new THREE.Line(geometry, material);
    line.renderOrder = 6;
    this.scene.add(line);
    return line;
  }

  createConnection({ anchor, from, order, phase, to = null }) {
    const lines = [
      this.createWebLine(0xffffff, 0),
      this.createWebLine(0xa9c4df, 0),
      this.createWebLine(0xe8ddd0, 0),
    ];
    this.webs.push({ anchor, from, lines, order, phase, to });
  }

  createWebs() {
    const random = seededRandom(this.mobile ? 818 : 927);
    this.webs = [];
    this.pieces.forEach((piece, index) => {
      this.createConnection({
        anchor: this.anchorForPiece(piece),
        from: index,
        order: index / Math.max(1, this.pieces.length - 1),
        phase: random() * Math.PI * 2,
      });
    });

    this.pieces.forEach((piece, index) => {
      if (index % 2 !== 0) return;
      const right = piece.column + 1 < this.profile.columns ? index + 1 : null;
      const below = piece.row + 1 < this.profile.rows ? index + this.profile.columns : null;
      const target = (piece.row + piece.column) % 2 === 0 ? right ?? below : below ?? right;
      if (target === null) return;
      this.createConnection({
        from: index,
        order: random(),
        phase: random() * Math.PI * 2,
        to: target,
      });
    });

    const attachmentGeometry = new THREE.BufferGeometry();
    attachmentGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(this.pieces.length * 3), 3));
    const attachmentMaterial = new THREE.PointsMaterial({
      blending: THREE.AdditiveBlending,
      color: 0xf8f5ec,
      depthTest: false,
      depthWrite: false,
      opacity: 0,
      size: this.mobile ? .042 : .052,
      sizeAttenuation: true,
      transparent: true,
    });
    this.webAttachments = new THREE.Points(attachmentGeometry, attachmentMaterial);
    this.webAttachments.renderOrder = 8;
    this.scene.add(this.webAttachments);
  }

  updatePieces(progress) {
    const drift = Math.sin(range(progress, 0, .08) * Math.PI);
    this.pieces.forEach((piece, index) => {
      const start = .25 + piece.order * .17;
      const assembled = easeOutCubic(range(progress, start, start + .26));
      const lock = smooth(range(progress, .68, .78));
      const wobble = Math.sin(lock * Math.PI) * (1 - assembled) * .035;
      piece.mesh.position.set(
        lerp(piece.scatter.x, piece.center.x, assembled) + Math.sin(index * 1.7) * drift * .018,
        lerp(piece.scatter.y, piece.center.y, assembled) + Math.cos(index * 1.31) * drift * .016,
        lerp(piece.scatter.z, 0, assembled) + wobble,
      );
      piece.mesh.rotation.set(
        piece.rotation.x * (1 - assembled),
        piece.rotation.y * (1 - assembled),
        piece.rotation.z * (1 - assembled),
      );
    });

    const tighten = smooth(range(progress, .68, .78));
    const push = smooth(range(progress, .86, 1));
    const baseScale = lerp(.79, .84, tighten);
    this.puzzleGroup.scale.setScalar(lerp(baseScale, 1, push));
    this.puzzleGroup.position.y = lerp(0, this.world.height * .025, push);
    this.finalMaterial.opacity = smooth(range(progress, .78, .88));
  }

  updateDust(progress) {
    const positions = this.dust.geometry.getAttribute('position');
    for (let index = 0; index < this.profile.dust; index += 1) {
      const offset = index * 3;
      const phase = this.dustPhase[index];
      positions.array[offset] = this.dustBase[offset] + Math.sin(phase + progress * 3.1) * .028;
      positions.array[offset + 1] = this.dustBase[offset + 1] + Math.cos(phase + progress * 2.4) * .035;
      positions.array[offset + 2] = this.dustBase[offset + 2] + Math.sin(phase + progress * 1.9) * .025;
    }
    positions.needsUpdate = true;
    this.dust.material.opacity = .3 * (1 - smooth(range(progress, .76, .94)));
  }

  updateWebGeometry(web, progress, webIndex) {
    const webFormation = smooth(range(progress, .08, .25));
    const growth = smooth(range(webFormation, web.order * .34, .68 + web.order * .32));
    const tension = smooth(range(progress, .25, .78));
    const dissolve = smooth(range(progress, .78, .86));
    const groupScale = this.puzzleGroup.scale.x;
    const groupPosition = this.puzzleGroup.position;
    const fromPosition = this.pieces[web.from].mesh.position;
    const from = {
      x: fromPosition.x * groupScale + groupPosition.x,
      y: fromPosition.y * groupScale + groupPosition.y,
      z: fromPosition.z * groupScale + groupPosition.z + .1,
    };
    const toPosition = web.to === null ? fromPosition : this.pieces[web.to].mesh.position;
    const to = {
      x: toPosition.x * groupScale + groupPosition.x,
      y: toPosition.y * groupScale + groupPosition.y,
      z: toPosition.z * groupScale + groupPosition.z + .1,
    };
    const start = web.anchor || from;
    const end = web.to === null ? from : to;
    const deltaX = end.x - start.x;
    const deltaY = end.y - start.y;
    const length = Math.max(.001, Math.hypot(deltaX, deltaY));
    const normalX = -deltaY / length;
    const normalY = deltaX / length;
    const sag = (1 - tension) * Math.min(this.world.width, this.world.height) * (.055 + (webIndex % 4) * .009);
    const visiblePoints = growth <= 0 ? 0 : Math.max(2, Math.floor(growth * (this.profile.webSegments - 1)) + 1);

    web.lines.forEach((line, fiberIndex) => {
      const positions = line.geometry.getAttribute('position');
      for (let index = 0; index < this.profile.webSegments; index += 1) {
        const local = index / (this.profile.webSegments - 1);
        const arc = Math.sin(local * Math.PI);
        const flutter = Math.sin(web.phase + local * 8 + progress * 2) * dissolve * .012;
        const fiberOffset = fiberIndex === 1 ? -.012 : fiberIndex === 2 ? .012 : 0;
        const offset = arc * sag + fiberOffset + flutter;
        const target = index * 3;
        positions.array[target] = lerp(start.x, end.x, local) + normalX * offset;
        positions.array[target + 1] = lerp(start.y, end.y, local) + normalY * offset;
        positions.array[target + 2] = lerp(start.z || 0, end.z || 0, local) + arc * (1 - tension) * .12 + fiberIndex * .006;
      }
      positions.needsUpdate = true;
      line.geometry.setDrawRange(0, visiblePoints);
      line.material.opacity = (fiberIndex ? .34 : .92) * growth * (1 - dissolve);
    });
  }

  updateWebs(progress) {
    this.webs.forEach((web, index) => this.updateWebGeometry(web, progress, index));
    const positions = this.webAttachments.geometry.getAttribute('position');
    const groupScale = this.puzzleGroup.scale.x;
    const groupPosition = this.puzzleGroup.position;
    this.pieces.forEach((piece, index) => {
      const target = index * 3;
      positions.array[target] = piece.mesh.position.x * groupScale + groupPosition.x;
      positions.array[target + 1] = piece.mesh.position.y * groupScale + groupPosition.y;
      positions.array[target + 2] = piece.mesh.position.z * groupScale + groupPosition.z + .11;
    });
    positions.needsUpdate = true;
    const formation = smooth(range(progress, .08, .25));
    const dissolve = smooth(range(progress, .76, .86));
    this.webAttachments.material.opacity = .78 * formation * (1 - dissolve);
  }

  render(progress) {
    this.progress = clamp(progress);
    this.updatePieces(this.progress);
    this.updateDust(this.progress);
    this.updateWebs(this.progress);

    const handoff = smooth(range(this.progress, CONFIG.handoffStart, 1));
    this.stage.style.opacity = String(1 - handoff);
    this.stage.style.visibility = this.progress >= .9998 ? 'hidden' : 'visible';
    this.stage.dataset.progress = this.progress.toFixed(3);
    if (this.skipButton) this.skipButton.hidden = this.progress >= .997;
    this.setInteractive(this.progress >= .997);
    this.renderer.render(this.scene, this.camera);
  }

  setInteractive(enabled) {
    if (enabled === this.interactive) return;
    this.interactive = enabled;
    document.body.classList.toggle('intro-complete', enabled);
    this.inertNodes.forEach((node) => {
      node.inert = !enabled;
    });
  }

  setupScroll() {
    window.gsap.registerPlugin(window.ScrollTrigger);
    window.ScrollTrigger.config({ ignoreMobileResize: true });
    this.driver = { progress: 0 };
    this.tween = window.gsap.to(this.driver, {
      ease: 'none',
      onUpdate: () => this.render(this.driver.progress),
      progress: 1,
      scrollTrigger: {
        anticipatePin: 1,
        end: () => `+=${Math.round(window.innerHeight * CONFIG.scrollDistance)}`,
        invalidateOnRefresh: true,
        pin: this.hero,
        pinSpacing: true,
        scrub: .12,
        start: () => `top ${this.header.offsetHeight}px`,
        trigger: this.hero,
      },
    });
    this.scrollTrigger = this.tween.scrollTrigger;
    window.ScrollTrigger.refresh();
  }

  teardownScroll() {
    this.scrollTrigger?.kill(true);
    this.scrollTrigger = null;
    this.tween?.kill();
    this.tween = null;
  }

  handleSkip(event) {
    if (this.interactive || !this.scrollTrigger) return;
    event.preventDefault();
    this.setScrollPosition(this.scrollTrigger.end + 2);
    this.driver.progress = 1;
    this.tween.progress(1);
    this.render(1);
    window.ScrollTrigger.update();
    const main = document.querySelector('#main');
    if (main) {
      main.setAttribute('tabindex', '-1');
      main.focus({ preventScroll: true });
    }
  }

  handleResize() {
    if (!this.resizePending) this.resizeProgress = this.progress;
    this.resizePending = true;
    const generation = ++this.resizeGeneration;
    window.clearTimeout(this.resizeTimer);
    this.resizeTimer = window.setTimeout(async () => {
      this.resizeTimer = 0;
      const widthChange = Math.abs(window.innerWidth - this.lastViewport.width);
      const heightChange = Math.abs(window.innerHeight - this.lastViewport.height);
      if (widthChange < 24 && heightChange < 72) {
        if (generation === this.resizeGeneration) this.resizePending = false;
        return;
      }
      this.lastViewport = { width: window.innerWidth, height: window.innerHeight };
      try {
        const snapshot = await captureViewport();
        if (this.destroyed || generation !== this.resizeGeneration) return;
        this.snapshot = snapshot;
        this.teardownScroll();
        this.setScrollPosition(0);
        this.progress = this.resizeProgress;
        this.buildScene(snapshot);
        this.setupScroll();
        const targetScroll = lerp(this.scrollTrigger.start, this.scrollTrigger.end, this.resizeProgress);
        this.setScrollPosition(targetScroll);
        this.driver.progress = this.resizeProgress;
        this.tween.progress(this.resizeProgress);
        this.scrollTrigger.update();
        this.render(this.resizeProgress);
        window.ScrollTrigger.update(true);
      } catch {
        if (this.destroyed || generation !== this.resizeGeneration) return;
        this.renderer.setSize(window.innerWidth, window.innerHeight, false);
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.driver.progress = this.resizeProgress;
        this.render(this.resizeProgress);
      } finally {
        if (generation === this.resizeGeneration) this.resizePending = false;
      }
    }, 240);
  }

  setScrollPosition(top) {
    const root = document.documentElement;
    const body = document.body;
    const rootBehavior = root.style.scrollBehavior;
    const bodyBehavior = body.style.scrollBehavior;
    root.style.scrollBehavior = 'auto';
    body.style.scrollBehavior = 'auto';
    if (this.scrollTrigger?.scroll) this.scrollTrigger.scroll(top);
    else window.scrollTo(0, top);
    requestAnimationFrame(() => {
      root.style.scrollBehavior = rootBehavior;
      body.style.scrollBehavior = bodyBehavior;
    });
  }

  handlePageHide(event) {
    if (!event.persisted) this.destroy();
  }

  disposeScene() {
    if (!this.scene) return;
    const geometries = new Set();
    const materials = new Set();
    this.scene.traverse((object) => {
      if (object.geometry) geometries.add(object.geometry);
      const objectMaterials = Array.isArray(object.material) ? object.material : [object.material];
      objectMaterials.filter(Boolean).forEach((material) => materials.add(material));
    });
    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach((material) => disposeMaterial(material));
    this.texture?.dispose();
  }

  destroy() {
    this.destroyed = true;
    this.resizeGeneration += 1;
    window.clearTimeout(this.resizeTimer);
    window.removeEventListener('resize', this.handleResize, true);
    window.removeEventListener('pagehide', this.handlePageHide);
    this.skipLink?.removeEventListener('click', this.handleSkip);
    this.skipButton?.removeEventListener('click', this.handleSkip);
    this.teardownScroll();
    this.disposeScene();
    this.renderer.dispose();
    this.stage.remove();
    this.inertNodes.forEach((node) => { node.inert = false; });
    document.body.classList.remove('intro-running', 'intro-complete');
  }
}

function revealPage() {
  document.documentElement.classList.add('intro-ready');
}

async function startIntro() {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const forceIntro = new URLSearchParams(window.location.search).get('intro') === '1';
  const mobile = window.innerWidth <= 760;
  const hero = document.querySelector('.hero');
  const header = document.querySelector('.site-header');
  const preRevealed = document.documentElement.classList.contains('intro-ready');

  if ((!forceIntro && (preRevealed || mobile || sessionIntroSeen())) || reducedMotion || location.hash || !hero || !header || !supportsWebGL()) {
    revealPage();
    return;
  }

  try {
    await loadIntroDependencies();
    await waitForPageAssets();
    const snapshot = await captureViewport();
    const stage = createStage();
    const intro = new PuzzleIntro(stage, snapshot, hero, header);
    intro.init();
    markSessionIntroSeen();
    window.__qinyiPuzzleIntro = intro;
    revealPage();
  } catch {
    document.querySelector('.puzzle-intro-stage')?.remove();
    document.body.classList.remove('intro-running', 'intro-complete');
    revealPage();
  }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', startIntro, { once: true });
else startIntro();
