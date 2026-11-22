import gsap from 'gsap';

const finePointer = () => window.matchMedia('(hover: hover) and (pointer: fine)').matches;

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
