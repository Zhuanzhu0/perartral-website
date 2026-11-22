import gsap from 'gsap';

const finePointer = () => window.matchMedia('(hover: hover) and (pointer: fine)').matches;

/** Custom cursor: a gold dot plus a lagging ring that grows on links and shows labels. */
export function initCursor() {
  if (!finePointer()) return;
  const cursor = document.querySelector('.cursor');
  const dot = cursor.querySelector('.cursor__dot');
  const ring = cursor.querySelector('.cursor__ring');
  const label = cursor.querySelector('.cursor__label');
  const dx = gsap.quickTo(dot, 'x', { duration: 0.08 });
  const dy = gsap.quickTo(dot, 'y', { duration: 0.08 });
  const rx = gsap.quickTo(ring, 'x', { duration: 0.45, ease: 'power3' });
  const ry = gsap.quickTo(ring, 'y', { duration: 0.45, ease: 'power3' });

  window.addEventListener('pointermove', (e) => {
    dx(e.clientX); dy(e.clientY); rx(e.clientX); ry(e.clientY);
    cursor.classList.remove('is-hidden');
  }, { passive: true });
  document.addEventListener('pointerleave', () => cursor.classList.add('is-hidden'));

  document.addEventListener('pointerover', (e) => {
    const labelled = e.target.closest('[data-cursor]');
    const hoverable = e.target.closest('a, button, input, textarea, canvas');
    cursor.classList.toggle('is-label', !!labelled);
    cursor.classList.toggle('is-hover', !labelled && !!hoverable);
    label.textContent = labelled ? labelled.dataset.cursor : '';
  });
}

/** Magnetic buttons: they lean toward the pointer, their label leans a bit further. */
export function initMagnetic() {
  if (!finePointer()) return;
  document.querySelectorAll('.magnetic').forEach((el) => {
    const inner = el.querySelector('span');
    const xTo = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'power3' });
    const yTo = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'power3' });
    const ixTo = inner && gsap.quickTo(inner, 'x', { duration: 0.6, ease: 'power3' });
    const iyTo = inner && gsap.quickTo(inner, 'y', { duration: 0.6, ease: 'power3' });
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const mx = e.clientX - (r.left + r.width / 2);
      const my = e.clientY - (r.top + r.height / 2);
      xTo(mx * 0.28); yTo(my * 0.38);
      if (inner) { ixTo(mx * 0.12); iyTo(my * 0.16); }
    });
    el.addEventListener('pointerleave', () => {
      gsap.to(el, { x: 0, y: 0, duration: 0.9, ease: 'elastic.out(1, 0.4)' });
      if (inner) gsap.to(inner, { x: 0, y: 0, duration: 0.9, ease: 'elastic.out(1, 0.4)' });
    });
  });
}

/** Gentle 3D tilt toward the pointer (news card). */
export function initTilt(selector) {
  if (!finePointer()) return;
  document.querySelectorAll(selector).forEach((el) => {
    const rX = gsap.quickTo(el, 'rotationX', { duration: 0.8, ease: 'power3' });
    const rY = gsap.quickTo(el, 'rotationY', { duration: 0.8, ease: 'power3' });
    gsap.set(el, { transformPerspective: 1400 });
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      rY(((e.clientX - r.left) / r.width - 0.5) * 6);
      rX(-((e.clientY - r.top) / r.height - 0.5) * 6);
    });
    el.addEventListener('pointerleave', () => { rX(0); rY(0); });
  });
}
