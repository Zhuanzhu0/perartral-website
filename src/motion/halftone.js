import { INDIA_ASPECT, INDIA_RINGS } from './india-map.js';

/**
 * Dot-matrix footer background. A video is sampled into a coarse grid and each cell is
 * drawn as one square sized by brightness, in the brand golds and cream.
 * Cells inside the map of India (centred on an anchor point, the wordmark's middle R)
 * are lifted into the bright golds, so the map reads clearly while the video keeps it alive;
 * a ripple spreads out from the anchor across the map each time pulseAge() restarts.
 * Runs only while the footer is on screen. Under reduced motion the video stays paused, so the
 * dots hold still apart from the ripple.
 */
const LEVELS = [
  // [min brightness, fill]: darkest first; brighter cells get bigger, lighter squares
  [0.14, 'rgba(184,134,23,.26)'],
  [0.28, 'rgba(184,134,23,.42)'],
  [0.44, 'rgba(220,171,44,.58)'],
  [0.60, 'rgba(240,205,94,.70)'],
  [0.78, 'rgba(246,239,228,.62)'],
];

export function createHalftone(canvas, video, { cell = 7, anchor = null, pulseAge = null } = {}) {
  const ctx = canvas.getContext('2d');
  const sample = document.createElement('canvas');
  const sctx = sample.getContext('2d', { willReadFrequently: true });
  const maskCanvas = document.createElement('canvas');
  const mctx = maskCanvas.getContext('2d', { willReadFrequently: true });
  let cols = 0, rows = 0, dpr = 1, running = false, raf = 0, last = 0;
  let inMap = new Uint8Array(0);
  let origin = { x: 0, y: 0 }; // anchor, in grid cells
  let mapH = 0; // map height, in grid cells

  // Rasterise India into a per-cell mask (a cell counts when it is mostly inside).
  function buildMask() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    const a = anchor?.() ?? { x: w / 2, y: h / 2 };
    origin = { x: a.x / cell, y: a.y / cell };
    mapH = Math.min(rows * 0.97, (cols * 0.62) / INDIA_ASPECT);
    const mapW = mapH * INDIA_ASPECT;
    const left = origin.x - mapW / 2;
    const top = Math.min(Math.max(0, origin.y - mapH / 2), rows - mapH); // keep the whole map inside
    const S = 4; // supersample, then read coverage per cell
    maskCanvas.width = cols * S; maskCanvas.height = rows * S;
    mctx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
    mctx.fillStyle = '#fff';
    mctx.beginPath();
    for (const r of INDIA_RINGS) {
      mctx.moveTo((left + r[0] * mapH) * S, (top + r[1] * mapH) * S);
      for (let i = 2; i < r.length; i += 2) mctx.lineTo((left + r[i] * mapH) * S, (top + r[i + 1] * mapH) * S);
      mctx.closePath();
    }
    mctx.fill('nonzero');
    const px = mctx.getImageData(0, 0, maskCanvas.width, maskCanvas.height).data;
    inMap = new Uint8Array(cols * rows);
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      let cov = 0;
      for (let sy = 0; sy < S; sy++) for (let sx = 0; sx < S; sx++) cov += px[(((y * S + sy) * cols * S) + x * S + sx) * 4 + 3];
      inMap[y * cols + x] = cov / (S * S * 255) > 0.4 ? 1 : 0;
    }
  }

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    cols = Math.ceil(w / cell);
    rows = Math.ceil(h / cell);
    sample.width = cols;
    sample.height = rows;
    buildMask();
    draw(performance.now());
  }

  function draw(t) {
    if (!cols) return;
    const hasVideo = video.readyState >= 2;
    let px = null;
    if (hasVideo) {
      // cover-fit the video into the grid
      const vw = video.videoWidth, vh = video.videoHeight;
      const scale = Math.max(cols / vw, rows / vh);
      const dw = vw * scale, dh = vh * scale;
      sctx.drawImage(video, (cols - dw) / 2, (rows - dh) / 2, dw, dh);
      px = sctx.getImageData(0, 0, cols, rows).data;
    }
    // ripple: a band that travels outward from the anchor, started by the wordmark shine (pulseAge, s)
    const age = pulseAge ? pulseAge() : -1;
    const wave = age < 0 || age > 3 ? -1 : age * mapH * 0.3;

    const paths = LEVELS.map(() => new Path2D());
    const c = cell * dpr;
    for (let y = 0; y < rows; y++) {
      // outside the map, fade the texture out towards the top and bottom edges
      const v = y / rows;
      const fade = Math.min(1, Math.max(0, (v - 0.04) / 0.4), Math.max(0, (1 - v) / 0.3));
      for (let x = 0; x < cols; x++) {
        const idx = y * cols + x;
        let l = 0.3;
        if (px) {
          const i = idx * 4;
          l = (0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2]) / 255;
          l = Math.min(1, Math.max(0, (l - 0.12) * 1.45));
        }
        if (inMap[idx]) {
          l = 0.5 + 0.32 * l; // map: always in the bright golds, shimmering with the video
          if (wave >= 0) {
            const d = Math.hypot(x - origin.x, y - origin.y) - wave;
            l += 0.32 * Math.exp(-(d * d) / 6);
          }
        } else {
          l = Math.min(0.5, l * 0.62) * fade; // outside: a dim echo of the canyon
        }
        let k = -1;
        for (let n = LEVELS.length - 1; n >= 0; n--) if (l >= LEVELS[n][0]) { k = n; break; }
        if (k < 0) continue;
        const s = Math.max(1, Math.round(c * (0.3 + 0.36 * Math.min(1, l)))); // max ~2/3 of a cell, so gaps always show
        const o = Math.round((c - s) / 2);
        paths[k].rect(Math.round(x * c) + o, Math.round(y * c) + o, s, s);
      }
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    paths.forEach((p, k) => { ctx.fillStyle = LEVELS[k][1]; ctx.fill(p); });
  }

  function loop(t) {
    if (!running) return;
    raf = requestAnimationFrame(loop);
    if (t - last < 40) return; // ~25 fps is plenty for a background
    last = t;
    draw(t);
  }

  new ResizeObserver(resize).observe(canvas);
  video.addEventListener('loadeddata', () => draw(performance.now()));
  video.addEventListener('seeked', () => draw(performance.now()));

  return {
    /** Re-place the map (call after the anchor moves, e.g. when the wordmark is refitted). */
    relayout() { if (cols) { buildMask(); draw(performance.now()); } },
    start() {
      // keeps drawing under reduced motion too (the ripple needs it); the video itself is paused then
      if (running) return;
      running = true;
      raf = requestAnimationFrame(loop);
    },
    stop() { running = false; cancelAnimationFrame(raf); },
  };
}
