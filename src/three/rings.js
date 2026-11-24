import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { InteractionManager } from 'three.interactive';
import gsap from 'gsap';

/**
 * The Perartral mark (three gold rings) as a touchable 3D object.
 * mode 'hero'   : floats, follows the pointer, rings spin and pulse when hovered or tapped.
 * mode 'footer' : larger and metallic, drag to spin the whole mark, it springs back.
 */
export function createRings(canvas, { mode = 'hero' } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = mode === 'footer' ? 1.05 : 1.15;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  camera.position.set(0, 0, mode === 'footer' ? 8.4 : 8.8);

  const key = new THREE.DirectionalLight(0xfff1cc, 2.2); key.position.set(3, 4, 5); scene.add(key);
  const rim = new THREE.DirectionalLight(0xdcab2c, 2.5); rim.position.set(-4, -2, -3); scene.add(rim);

  const root = new THREE.Group();
  const mark = new THREE.Group();
  root.add(mark);
  scene.add(root);

  const geo = new THREE.TorusGeometry(0.62, 0.165, 64, 160);
  const spots = [[0, 0.74], [-0.86, -0.74], [0.86, -0.74]];
  const rings = spots.map(([x, y], i) => {
    const mat = new THREE.MeshPhysicalMaterial({
      color: 0xd9a62a, metalness: 1, roughness: 0.2 + i * 0.03,
      clearcoat: 0.7, clearcoatRoughness: 0.18, emissive: 0x6b4a08, emissiveIntensity: 0,
    });
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, 0);
    m.userData = { spin: 0, angle: 0, phase: i * 2.1, base: new THREE.Euler(0.12 * (i - 1), 0.25 * (i - 1), 0) };
    m.rotation.copy(m.userData.base);
    mark.add(m);
    return m;
  });

  // Touch and pointer events on the meshes
  const interaction = new InteractionManager(renderer, camera, canvas, { bindEventsOnBodyElement: false });
  const kick = (m, amount) => {
    m.userData.spin += amount;
    gsap.fromTo(m.material, { emissiveIntensity: 1.4 }, { emissiveIntensity: 0, duration: 1.2, ease: 'power2.out' });
    gsap.fromTo(m.scale, { x: 1.12, y: 1.12, z: 1.12 }, { x: 1, y: 1, z: 1, duration: 1, ease: 'elastic.out(1, 0.35)' });
  };
  // Each ring gets an invisible disc as its hit target, so the whole ring (hole included)
  // responds the same way, rather than only the thin tube. Discs sit in `mark`, so they
  // follow the tilt but not the ring's own spin (a spinning ring would turn edge-on).
  const hitGeo = new THREE.CircleGeometry(0.8, 48);
  const hitMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
  rings.forEach((m) => {
    const hit = new THREE.Mesh(hitGeo, hitMat);
    hit.position.copy(m.position);
    mark.add(hit);
    interaction.add(hit);
    hit.addEventListener('mouseover', () => { canvas.style.cursor = 'pointer'; kick(m, 7); });
    hit.addEventListener('mouseout', () => { canvas.style.cursor = ''; });
    hit.addEventListener('mousedown', () => kick(m, 14));
    hit.addEventListener('touchstart', () => kick(m, 14));
  });

  // Pointer tilt (whole page) and drag-to-spin (footer)
  const pointer = { x: 0, y: 0 };
  window.addEventListener('pointermove', (e) => {
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
  }, { passive: true });

  const drag = { active: false, lastX: 0, vel: 0, angle: 0 };
  if (mode === 'footer') {
    canvas.addEventListener('pointerdown', (e) => { drag.active = true; drag.lastX = e.clientX; canvas.setPointerCapture?.(e.pointerId); });
    canvas.addEventListener('pointermove', (e) => {
      if (!drag.active) return;
      const dx = e.clientX - drag.lastX; drag.lastX = e.clientX;
      drag.vel = dx * 0.012; drag.angle += drag.vel;
    });
    const end = () => { drag.active = false; };
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);
  }

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(canvas);
  resize();

  let running = false;
  let raf = 0;
  const clock = new THREE.Clock();
  function frame() {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;

    rings.forEach((m) => {
      // a tap or hover spins a ring; it then settles back to face the viewer
      const u = m.userData;
      u.spin *= Math.pow(0.08, dt);
      u.angle += u.spin * dt;
      if (Math.abs(u.spin) < 1.2) {
        const rest = Math.round(u.angle / (Math.PI * 2)) * Math.PI * 2;
        u.angle += (rest - u.angle) * Math.min(1, dt * 2.5);
      }
      m.rotation.y = u.base.y + u.angle + Math.sin(t * 0.6 + u.phase) * 0.28;
      m.rotation.x = m.userData.base.x + Math.sin(t * 0.7 + m.userData.phase) * 0.18;
      m.position.z = Math.sin(t * 0.9 + m.userData.phase) * 0.12;
    });

    if (mode === 'footer') {
      if (!drag.active) { drag.vel *= 0.92; drag.angle += drag.vel; drag.angle *= 0.96; }
      root.rotation.y = drag.angle + Math.sin(t * 0.4) * 0.15;
      root.rotation.x += ((pointer.y * 0.25) - root.rotation.x) * 0.05;
    } else {
      root.rotation.y += ((pointer.x * 0.45) - root.rotation.y) * 0.05;
      root.rotation.x += ((pointer.y * 0.3) - root.rotation.x) * 0.05;
      root.position.y = Math.sin(t * 0.8) * 0.08;
    }
    interaction.update();
    renderer.render(scene, camera);
  }

  const io = new IntersectionObserver((entries) => {
    const e = entries[entries.length - 1]; // latest state wins
    if (e.isIntersecting && !running) { running = true; clock.getDelta(); frame(); }
    else if (!e.isIntersecting && running) { running = false; cancelAnimationFrame(raf); }
  });
  io.observe(canvas);

  return { rings, renderer };
}
