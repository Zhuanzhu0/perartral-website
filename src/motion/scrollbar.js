import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

/**
 * Custom scrollbar: a dashed gold "flight lane" on the right edge, with the three-rings mark
 * as the thumb. The rings spin with the distance scrolled and glow with scroll speed;
 * diamond "posts" mark each section and fill gold once passed.
 * Drag the thumb, click the lane to glide there, or click a post to fly to its section.
 * The native scrollbar is hidden in CSS; wheel, keyboard and touch scrolling are unchanged.
 */
const SECTIONS = [
  ['#top', '00', 'Home'],
  ['#himsetu', '01', 'HimSetu'],
  ['#news', '02', 'News'],
  ['#contact', '03', 'Contact'],
];

export function initScrollbar({ lenis = null } = {}) {
  const root = document.createElement('div');
  root.className = 'sbar';
  root.setAttribute('aria-hidden', 'true'); // duplicates native scrolling; keyboard users keep their keys
  root.innerHTML = `
    <div class="sbar__rail"><i class="sbar__fill"></i></div>
    <div class="sbar__marks">${SECTIONS.map(([sel, n, name]) =>
      `<button class="sbar__mark" type="button" tabindex="-1" data-target="${sel}"><span class="sbar__label mono"><b>${n}</b>${name}</span></button>`).join('')}
    </div>
    <div class="sbar__thumb">
      <svg viewBox="0 0 120 120">
        <defs><linearGradient id="sbar-g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f7e3a6"/><stop offset=".5" stop-color="#dcab2c"/><stop offset="1" stop-color="#9a6c10"/></linearGradient></defs>
        <circle cx="60" cy="30" r="21"/><circle cx="29" cy="84" r="21"/><circle cx="91" cy="84" r="21"/>
      </svg>
    </div>`;
  document.body.append(root);

  const thumb = root.querySelector('.sbar__thumb');
  const marks = [...root.querySelectorAll('.sbar__mark')].map((el) => ({ el, target: document.querySelector(el.dataset.target), p: 0 }));

  const scrollY = () => (lenis ? lenis.scroll : window.scrollY);
  const maxScroll = () => Math.max(1, lenis ? lenis.limit : document.documentElement.scrollHeight - window.innerHeight);
  const scrollTo = (y, smooth) => {
    if (lenis) lenis.scrollTo(y, smooth ? { duration: 1.2, easing: (t) => 1 - Math.pow(1 - t, 4) } : { immediate: true });
    else window.scrollTo({ top: y, behavior: smooth ? 'smooth' : 'auto' });
  };

  let railH = 0, thumbH = 0;
  const travel = () => Math.max(1, railH - thumbH);

  // place each post where the thumb's centre will be when its section reaches the top
  function layout() {
    railH = root.clientHeight;
    thumbH = thumb.offsetHeight;
    const max = maxScroll();
    for (const m of marks) {
      if (!m.target) continue;
      const top = m.target.matches('#top') ? 0 : m.target.getBoundingClientRect().top + scrollY();
      m.p = Math.min(1, Math.max(0, top / max));
      m.el.style.top = `${(m.p * travel() + thumbH / 2).toFixed(1)}px`;
    }
  }

  // ---- per-frame update -------------------------------------------------
  let lastY = scrollY(), vel = 0, angle = 0, idle = 0, current = -1;
  let flashTimer = 0;
  function update() {
    const y = scrollY();
    const p = Math.min(1, Math.max(0, y / maxScroll()));
    const dy = y - lastY;
    lastY = y;
    vel += (Math.abs(dy) - vel) * 0.18;
    angle += dy * 0.35; // rings spin with the distance travelled

    root.style.setProperty('--p', p.toFixed(4));
    root.style.setProperty('--ty', `${(p * travel()).toFixed(1)}px`);
    root.style.setProperty('--a', `${angle.toFixed(1)}deg`);
    root.style.setProperty('--v', Math.min(1, vel / 40).toFixed(3));

    if (Math.abs(dy) > 0.3) { root.classList.add('is-active'); idle = performance.now(); }
    else if (idle && performance.now() - idle > 1200) { root.classList.remove('is-active'); idle = 0; }

    // posts: passed / current, and flash the label when a new section begins
    let cur = 0;
    marks.forEach((m, i) => {
      const passed = p >= m.p - 0.002;
      m.el.classList.toggle('is-passed', passed);
      if (passed) cur = i;
    });
    if (cur !== current) {
      if (current !== -1) {
        marks.forEach((m) => m.el.classList.remove('is-flash'));
        marks[cur].el.classList.add('is-flash');
        clearTimeout(flashTimer);
        flashTimer = setTimeout(() => marks[cur].el.classList.remove('is-flash'), 1400);
      }
      marks.forEach((m, i) => m.el.classList.toggle('is-current', i === cur));
      current = cur;
    }
  }

  // ---- interaction ------------------------------------------------------
  let drag = null;
  thumb.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    const r = thumb.getBoundingClientRect();
    drag = { offset: e.clientY - r.top, id: e.pointerId };
    thumb.setPointerCapture(e.pointerId);
    root.classList.add('is-dragging');
    document.documentElement.classList.add('is-sbar-drag');
  });
  thumb.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const top = root.getBoundingClientRect().top;
    const p = Math.min(1, Math.max(0, (e.clientY - top - drag.offset) / travel()));
    scrollTo(p * maxScroll(), false);
  });
  const endDrag = () => {
    if (!drag) return;
    drag = null;
    root.classList.remove('is-dragging');
    document.documentElement.classList.remove('is-sbar-drag');
  };
  thumb.addEventListener('pointerup', endDrag);
  thumb.addEventListener('pointercancel', endDrag);

  // click the lane: glide so the thumb centres on the click
  root.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.sbar__thumb, .sbar__mark')) return;
    const top = root.getBoundingClientRect().top;
    const p = Math.min(1, Math.max(0, (e.clientY - top - thumbH / 2) / travel()));
    scrollTo(p * maxScroll(), true);
  });
  // click a post: fly to its section (aimed at the element itself, so it lands exactly)
  marks.forEach((m) => m.el.addEventListener('click', () => {
    if (!m.target) return;
    const y = m.target.matches('#top') ? 0 : m.target.getBoundingClientRect().top + scrollY();
    scrollTo(Math.min(y, maxScroll()), true);
  }));

  layout();
  update();
  gsap.ticker.add(update);
  ScrollTrigger.addEventListener('refresh', layout);
  // re-place the posts whenever the window or the page height changes (images, reveals, footer fit)
  let t; const relayout = () => { clearTimeout(t); t = setTimeout(layout, 150); };
  window.addEventListener('resize', relayout);
  new ResizeObserver(relayout).observe(document.body);
  document.fonts?.ready.then(layout);

  return { layout };
}
