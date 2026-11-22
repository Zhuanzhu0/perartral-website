/**
 * Spatial browsing with xr-live.
 * A sandboxed Three-Live scene of the HimSetu supply network (terrain, battalion hub, posts,
 * resupply routes) with spatial HTML cards that can be grabbed. Works with mouse and touch
 * (orbit, pinch, zoom) on any device and as an immersive WebXR session with hand gestures.
 */

const SCENE = /* js */ `
const C = { gold: 0xdcab2c, goldHi: 0xf0cd5e, brown: 0x4a2208, rock: 0x6b3a14, paper: 0xf3ece1, snow: 0xfbf8f2 };
const gold = new THREE.MeshStandardMaterial({ color: C.gold, metalness: 0.9, roughness: 0.25, emissive: C.gold, emissiveIntensity: 0.15 });
const glow = new THREE.MeshStandardMaterial({ color: C.goldHi, emissive: C.gold, emissiveIntensity: 1.2, roughness: 0.4 });

// Terrain plinth
const base = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.4, 0.32, 96), new THREE.MeshStandardMaterial({ color: C.paper, roughness: 0.95, emissive: C.paper, emissiveIntensity: 0.35 }));
base.position.y = -0.16; scene.add(base);
const rimRing = new THREE.Mesh(new THREE.TorusGeometry(3.3, 0.03, 12, 180), gold);
rimRing.rotation.x = Math.PI / 2; rimRing.position.y = 0.0; scene.add(rimRing);

// Mountains (flat-shaded cones with snow caps)
const peaks = [
  [0.2, -0.9, 1.0, 2.1], [1.4, -0.2, 0.8, 1.5], [-0.9, -1.6, 0.75, 1.4], [1.0, -1.8, 0.7, 1.7],
  [-1.6, -0.4, 0.6, 1.0], [2.1, 0.9, 0.6, 1.1], [0.4, 0.7, 0.55, 0.9], [-0.3, 1.9, 0.5, 0.7],
];
peaks.forEach(([x, z, r, h], i) => {
  const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, 7), new THREE.MeshStandardMaterial({ color: i % 2 ? C.brown : C.rock, roughness: 0.85, flatShading: true }));
  m.position.set(x, h / 2, z); m.rotation.y = i * 0.9; scene.add(m);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(r * 0.34, h * 0.34, 7), new THREE.MeshStandardMaterial({ color: C.snow, roughness: 0.6, flatShading: true }));
  cap.position.set(x, h - h * 0.17 + 0.01, z); cap.rotation.y = i * 0.9; scene.add(cap);
});

// Battalion hub: the Perartral rings standing on a plinth
const hubPos = new THREE.Vector3(-2.0, 0, 1.4);
const plinth = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.48, 0.16, 48), new THREE.MeshStandardMaterial({ color: C.brown, roughness: 0.6 }));
plinth.position.set(hubPos.x, 0.08, hubPos.z); scene.add(plinth);
const hub = new THREE.Group();
hub.position.set(hubPos.x, 0.62, hubPos.z);
[[0, 0.21], [-0.24, -0.2], [0.24, -0.2]].forEach(([x, y]) => {
  const r = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.045, 24, 64), gold);
  r.position.set(x, y, 0); hub.add(r);
});
scene.add(hub);

// Forward posts
const posts = [
  [0.2, 2.1, -0.9], [1.4, 1.5, -0.2], [-0.9, 1.4, -1.6], [2.1, 1.1, 0.9], [0.4, 0.9, 0.7], [1.0, 1.7, -1.8],
].map(([x, y, z]) => new THREE.Vector3(x, y + 0.06, z));
const beacons = posts.map((p) => {
  const b = new THREE.Mesh(new THREE.SphereGeometry(0.07, 24, 16), glow);
  b.position.copy(p); scene.add(b);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.012, 8, 48), gold);
  ring.position.copy(p); ring.rotation.x = Math.PI / 2; scene.add(ring);
  return { b, ring };
});

// Resupply routes from the hub
const start = new THREE.Vector3(hubPos.x, 0.2, hubPos.z);
const curves = posts.map((p, i) => {
  const mid = start.clone().lerp(p, 0.5);
  mid.y += i === 5 ? 1.6 : 0.35 + i * 0.05; // the last one is a helicopter arc
  const c = new THREE.CatmullRomCurve3([start, mid, p]);
  const tube = new THREE.Mesh(new THREE.TubeGeometry(c, 80, i === 5 ? 0.012 : 0.02, 8, false),
    new THREE.MeshStandardMaterial({ color: i === 5 ? C.goldHi : C.gold, emissive: C.gold, emissiveIntensity: 0.55, roughness: 0.4 }));
  scene.add(tube);
  return c;
});
const cargo = curves.map(() => {
  const s = new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 12), new THREE.MeshStandardMaterial({ color: C.brown, emissive: C.goldHi, emissiveIntensity: 0.4 }));
  scene.add(s); return s;
});

scene.add(new THREE.AmbientLight(0xffffff, 0.75));
const sun = new THREE.DirectionalLight(0xfff3d6, 2.6); sun.position.set(4, 6, 3); scene.add(sun);
const rim = new THREE.DirectionalLight(0xdcab2c, 1.4); rim.position.set(-5, 2, -4); scene.add(rim);

let frame = 0;
function animate() {
  frame++;
  const s = frame / 60;
  hub.rotation.y = s * 0.7;
  cargo.forEach((c, i) => {
    const u = (s * 0.11 + i * 0.17) % 1;
    const p = curves[i].getPointAt(u);
    c.position.set(p.x, p.y + 0.03, p.z);
  });
  beacons.forEach(({ ring }, i) => {
    const k = 1 + ((s * 0.8 + i * 0.3) % 1) * 1.6;
    ring.scale.set(k, k, k);
  });
}
`;

const CARDS = [
  { pos: '-2.0 1.75 1.4', lines: ['Battalion server', 'One signed stock ledger', 'Syncs with every post'] },
  { pos: '0.2 3.0 -0.9', lines: ['Forward post · tablet', 'Works with no network', 'Syncs by link, USB or radio code'] },
  { pos: '2.2 2.3 1.0', lines: ['Winter plan', 'Porter · pack animal · vehicle', 'Helicopter, with a no-heli scenario'] },
];

let mod = null;

async function ensureModule() {
  if (mod) return mod;
  mod = await import('xr-live');
  const base = new URL(import.meta.env.BASE_URL || '/', location.href);
  mod.ThreeLiveElement.sandboxEngineSrc = new URL('vendor/three-live/three-live.min.js', base).href;
  mod.ThreeLiveElement.sandboxIframeSrc = new URL('vendor/three-live/three-live-sandbox.html', base).href;
  return mod;
}

function buildElement() {
  const xr = document.createElement('xr-live');
  const attrs = {
    'allow-client-scripts': '', 'camera-controls': '', 'xr-mode': 'auto', 'xr-hands': 'gestures', 'sound-feedback': '',
    'camera-orbit': '-28deg 28deg 9.5m', 'camera-target': '0 0.9 0', 'field-of-view': '38deg',
    'exposure': '1.1', 'tone-mapping': 'neutral', 'shadow-intensity': '0',
    'min-camera-orbit': 'auto 8deg 5m', 'max-camera-orbit': 'auto 80deg 16m',
  };
  for (const [k, v] of Object.entries(attrs)) xr.setAttribute(k, v);
  xr.setAttribute('aria-label', '3D view of the HimSetu supply network. Drag to orbit, pinch or scroll to zoom.');

  const script = document.createElement('script');
  script.type = 'text/three';
  script.textContent = SCENE;
  xr.appendChild(script);

  return xr;
}

// Spatial HTML cards are added after the scene script has loaded: the scene load
// replaces the viewer's mesh list, so cards created earlier would be dropped.
function addCards(xr) {
  CARDS.forEach((c) => {
    const card = document.createElement('div');
    card.className = 'xr-card';
    card.slot = 'spatial';
    card.dataset.xrPosition = c.pos;
    card.setAttribute('data-xr-grab', '');
    // xr-live uploads card textures without a Y flip; turning the panel over shows the text upright
    card.dataset.xrRotation = '180 -28 0';
    card.setAttribute('data-xr-dpi', '320');
    card.style.width = '380px';
    card.style.height = '112px';
    card.textContent = c.lines.join('\n');
    xr.appendChild(card);
  });
}

export function initSpatialView({ lenis } = {}) {
  const overlay = document.getElementById('spatial');
  const stage = document.getElementById('spatial-stage');
  const openBtn = document.getElementById('open-spatial');
  const closeBtn = overlay.querySelector('.spatial__close');
  if (!overlay || !openBtn) return;

  const showMessage = (text) => {
    stage.innerHTML = `<div class="spatial__msg"><p>${text}</p></div>`;
  };

  async function open() {
    overlay.hidden = false;
    document.documentElement.style.overflow = 'hidden';
    lenis?.stop();
    closeBtn.focus();
    stage.innerHTML = '';
    try {
      await ensureModule();
      const xr = buildElement();
      // frame the network at a three-quarter angle once the scene has been built
      xr.addEventListener('three-load', () => {
        if (!xr.querySelector('.xr-card')) addCards(xr);
        const narrow = stage.clientWidth < 700;
        xr.setCamera(-28, 26, narrow ? 15 : 11);
        xr.jumpCameraToGoal?.();
      });
      xr.addEventListener('three-error', (e) => {
        console.warn('xr-live:', e.detail?.message);
        showMessage('The 3D view could not start on this device. The screenshots above show HimSetu in use.');
      });
      stage.appendChild(xr);
    } catch (err) {
      console.warn(err);
      showMessage('The 3D view could not start on this device. The screenshots above show HimSetu in use.');
    }
  }

  function close() {
    overlay.hidden = true;
    stage.innerHTML = ''; // frees the GPU context
    document.documentElement.style.overflow = '';
    lenis?.start();
    openBtn.focus();
  }

  openBtn.addEventListener('click', open);
  closeBtn.addEventListener('click', close);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !overlay.hidden) close(); });
}
