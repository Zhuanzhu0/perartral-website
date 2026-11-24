import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { InteractionManager } from 'three.interactive';
import gsap from 'gsap';

/**
 * Touchable surface: a 3D HimSetu tablet. Its keys are real meshes registered with
 * THREE.Interactive, so they respond to mouse, pen and touch. Entries are "saved offline"
 * to a queue until the visitor presses Sync now. (A demonstration: nothing leaves the page.)
 */
export function createTablet(canvas, logEl) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 100);

  const rim = new THREE.DirectionalLight(0xdcab2c, 3); rim.position.set(-3, 3, -2); scene.add(rim);
  const key = new THREE.DirectionalLight(0xffffff, 1.2); key.position.set(2, 3, 6); scene.add(key);

  const tablet = new THREE.Group();
  scene.add(tablet);

  // Body
  const W = 4.4, H = 2.9;
  const body = new THREE.Mesh(
    new RoundedBoxGeometry(W, H, 0.18, 6, 0.16),
    new THREE.MeshPhysicalMaterial({ color: 0x141210, metalness: 0.7, roughness: 0.32, clearcoat: 0.6 })
  );
  tablet.add(body);

  // Screen (drawn on a canvas texture)
  const sc = document.createElement('canvas');
  sc.width = 1280; sc.height = 832;
  const ctx = sc.getContext('2d');
  const screenTex = new THREE.CanvasTexture(sc);
  screenTex.colorSpace = THREE.SRGBColorSpace;
  screenTex.anisotropy = 4;
  const SW = 4.1, SH = 2.66;
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(SW, SH), new THREE.MeshBasicMaterial({ map: screenTex, toneMapped: false }));
  screen.position.z = 0.092;
  tablet.add(screen);

  // Screen-space helpers: canvas px -> tablet units
  const toX = (px) => (px / sc.width - 0.5) * SW;
  const toY = (py) => (0.5 - py / sc.height) * SH;

  const state = { queue: [], status: 'idle', syncP: 0 };

  function drawScreen() {
    const c = ctx;
    c.fillStyle = '#0b0a09'; c.fillRect(0, 0, sc.width, sc.height);
    c.fillStyle = '#f6efe4'; c.font = '600 34px Inter, sans-serif'; c.textBaseline = 'middle';
    c.fillText('HimSetu · Post 04', 56, 60);
    c.fillStyle = 'rgba(246,239,228,.55)'; c.font = '500 24px "JetBrains Mono", monospace';
    c.fillText('DEMO', 380, 62);
    c.textAlign = 'right'; c.fillText(state.queue.length ? 'OFFLINE' : 'OFFLINE · ready', sc.width - 56, 62); c.textAlign = 'left';

    // status bar
    const q = state.queue.length;
    const syncing = state.status === 'syncing';
    const col = syncing ? '#f0cd5e' : q ? '#dcab2c' : '#5fbf7a';
    c.strokeStyle = col; c.lineWidth = 3; roundRect(c, 56, 108, sc.width - 112, 64, 14); c.stroke();
    if (syncing) { c.fillStyle = 'rgba(240,205,94,.25)'; roundRect(c, 56, 108, (sc.width - 112) * state.syncP, 64, 14); c.fill(); }
    c.fillStyle = col; c.font = '500 26px "JetBrains Mono", monospace';
    c.fillText(syncing ? `Syncing ${q} entr${q === 1 ? 'y' : 'ies'}…` : q ? `${q} entr${q === 1 ? 'y' : 'ies'} saved offline · will sync` : 'All entries sent', 80, 141);

    // lower small buttons (Sync now is a 3D key placed on top)
    const labels = ['Stock', 'Deliveries', 'Outbox', 'Summary code', 'Settings'];
    const bw = (sc.width - 112 - 40) / 3, bh = 62;
    labels.forEach((l, i) => {
      const x = 56 + (i % 3) * (bw + 20), y = 640 + Math.floor(i / 3) * (bh + 16);
      c.strokeStyle = 'rgba(246,239,228,.55)'; c.lineWidth = 2; roundRect(c, x, y, bw, bh, 10); c.stroke();
      c.fillStyle = '#f6efe4'; c.font = '600 24px Inter, sans-serif'; c.textAlign = 'center';
      c.fillText(l, x + bw / 2, y + bh / 2 + 1); c.textAlign = 'left';
    });
    screenTex.needsUpdate = true;
  }

  // Keys: Receive / Issue / Count / Demand + Sync now
  const keyDefs = [
    { label: 'Receive', px: 56, py: 206 }, { label: 'Issue', px: 660, py: 206 },
    { label: 'Count', px: 56, py: 420 }, { label: 'Demand', px: 660, py: 420 },
  ];
  const keyW = 564, keyH = 196;
  const keys = [];
  const makeLabel = (text, w, h, fg, font) => {
    const lc = document.createElement('canvas'); lc.width = 512; lc.height = Math.round(512 * (h / w));
    const l = lc.getContext('2d');
    l.fillStyle = fg; l.font = font; l.textAlign = 'center'; l.textBaseline = 'middle';
    l.fillText(text, lc.width / 2, lc.height / 2 + 2);
    const t = new THREE.CanvasTexture(lc); t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
  const addKey = (def, w, h, color, labelColor, font) => {
    const kw = toX(def.px + w) - toX(def.px), kh = toY(def.py) - toY(def.py + h);
    const g = new THREE.Group();
    const mesh = new THREE.Mesh(
      new RoundedBoxGeometry(kw, kh, 0.08, 4, 0.045),
      new THREE.MeshPhysicalMaterial({ color, metalness: 0.35, roughness: 0.38, clearcoat: 0.5, emissive: color, emissiveIntensity: 0 })
    );
    const lbl = new THREE.Mesh(new THREE.PlaneGeometry(kw, kh), new THREE.MeshBasicMaterial({ map: makeLabel(def.label, kw, kh, labelColor, font), transparent: true, toneMapped: false }));
    lbl.position.z = 0.041;
    g.add(mesh, lbl);
    g.position.set(toX(def.px + w / 2), toY(def.py + h / 2), 0.135);
    g.userData = { label: def.label, baseZ: 0.135, mesh };
    mesh.userData.group = g;
    tablet.add(g);
    keys.push(g);
    return g;
  };
  keyDefs.forEach((d) => addKey(d, keyW, keyH, 0xdcab2c, '#2a1305', '700 64px Inter, sans-serif'));
  const syncDef = { label: 'Sync now', px: 56 + 2 * ((1280 - 112 - 40) / 3 + 20), py: 640 + 78 };
  const syncKey = addKey(syncDef, (1280 - 112 - 40) / 3, 62, 0x2b2722, '#f0cd5e', '700 40px Inter, sans-serif');

  // Interaction
  const interaction = new InteractionManager(renderer, camera, canvas, { bindEventsOnBodyElement: false });
  keys.forEach((g) => {
    const mesh = g.userData.mesh;
    interaction.add(mesh);
    mesh.addEventListener('mouseover', () => {
      canvas.style.cursor = 'pointer';
      gsap.to(g.position, { z: g.userData.baseZ + 0.05, duration: 0.3, ease: 'power3.out' });
      gsap.to(mesh.material, { emissiveIntensity: 0.18, duration: 0.3 });
    });
    mesh.addEventListener('mouseout', () => {
      canvas.style.cursor = '';
      gsap.to(g.position, { z: g.userData.baseZ, duration: 0.4, ease: 'power3.out' });
      gsap.to(mesh.material, { emissiveIntensity: 0, duration: 0.4 });
    });
    mesh.addEventListener('mousedown', (ev) => {
      ev.stopPropagation();
      gsap.to(g.position, { z: g.userData.baseZ - 0.05, duration: 0.08, ease: 'power2.out' });
    });
    mesh.addEventListener('click', (ev) => {
      ev.stopPropagation();
      gsap.to(g.position, { z: g.userData.baseZ + 0.03, duration: 0.5, ease: 'elastic.out(1, 0.4)' });
      gsap.fromTo(mesh.material, { emissiveIntensity: 0.6 }, { emissiveIntensity: 0, duration: 0.8 });
      press(g.userData.label);
    });
  });

  const listEl = logEl.querySelector('.log__list');
  const stateEl = logEl.querySelector('.log__state');
  const stamp = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  function log(html) {
    listEl.querySelector('.log__empty')?.remove();
    const li = document.createElement('li');
    li.innerHTML = `<span class="t">${stamp()}</span>${html}`;
    listEl.prepend(li);
    while (listEl.children.length > 3) listEl.lastElementChild.remove();
    gsap.from(li, { x: -12, opacity: 0, duration: 0.5, ease: 'power3.out' });
  }
  function updateState() {
    const q = state.queue.length;
    stateEl.textContent = state.status === 'syncing' ? 'Syncing…' : q ? `Offline · ${q} queued` : 'Synced · 0 queued';
  }
  function press(label) {
    if (state.status === 'syncing') return;
    if (label === 'Sync now') {
      if (!state.queue.length) { log('<b>Sync</b> nothing waiting'); return; }
      state.status = 'syncing'; state.syncP = 0; updateState();
      gsap.to(state, {
        syncP: 1, duration: 1.4, ease: 'power2.inOut', onUpdate: drawScreen,
        onComplete: () => {
          const n = state.queue.length;
          state.queue = []; state.status = 'idle'; drawScreen(); updateState();
          log(`<b>Synced</b> ${n} entr${n === 1 ? 'y' : 'ies'} to the battalion ledger`);
        },
      });
      return;
    }
    state.queue.push(label);
    drawScreen(); updateState();
    log(`<b>${label}</b> saved offline · queued to sync`);
  }

  // Layout and motion
  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const fov = THREE.MathUtils.degToRad(camera.fov);
    const fitH = (H * 1.18) / 2 / Math.tan(fov / 2);
    const fitW = (W * 1.12) / 2 / Math.tan(fov / 2) / camera.aspect;
    camera.position.set(0, 0, Math.max(fitH, fitW));
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(canvas);
  resize();

  const pointer = { x: 0, y: 0 };
  canvas.addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect();
    pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    pointer.y = ((e.clientY - r.top) / r.height) * 2 - 1;
  });
  canvas.addEventListener('pointerleave', () => { pointer.x = 0; pointer.y = 0; });

  document.fonts?.ready.then(drawScreen);
  drawScreen();

  let running = false, raf = 0;
  const clock = new THREE.Clock();
  function frame() {
    raf = requestAnimationFrame(frame);
    const t = clock.getElapsedTime();
    tablet.rotation.y += ((pointer.x * 0.22 + Math.sin(t * 0.5) * 0.06) - tablet.rotation.y) * 0.06;
    tablet.rotation.x += ((pointer.y * 0.16 - 0.08) - tablet.rotation.x) * 0.06;
    tablet.position.y = Math.sin(t * 0.9) * 0.04;
    interaction.update();
    renderer.render(scene, camera);
  }
  new IntersectionObserver((entries) => {
    const e = entries[entries.length - 1]; // latest state wins
    if (e.isIntersecting && !running) { running = true; frame(); }
    else if (!e.isIntersecting && running) { running = false; cancelAnimationFrame(raf); }
  }).observe(canvas);

  return { press };
}

function roundRect(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
}
