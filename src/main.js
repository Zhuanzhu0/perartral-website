import './styles/tokens.css';
import './styles/base.css';
import './styles/sections.css';

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import Lenis from 'lenis';

import { site, news } from './config.js';
import { ScrubVideo } from './motion/scroll-video.js';
import { initMagnetic, initTilt } from './motion/interactions.js';
import { initSpatialView } from './spatial/spatial-view.js';
import { createHalftone } from './motion/halftone.js';

gsap.registerPlugin(ScrollTrigger, SplitText);

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];

/* ---------------------------------------------------------------
   Content from config
---------------------------------------------------------------- */
function renderContent() {
  // News
  const list = $('#news-list');
  list.innerHTML = news.map((n) => `
    <article class="news-card">
      <div class="news-card__visual">
        <svg class="news-card__rings" viewBox="0 0 120 104" aria-hidden="true">
          <defs><linearGradient id="ng" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f0cd5e"/><stop offset="1" stop-color="#b88617"/></linearGradient></defs>
          <circle cx="60" cy="24" r="17"/><circle cx="24" cy="78" r="17"/><circle cx="96" cy="78" r="17"/>
        </svg>
        <p class="news-card__vt">${n.visualTitle}</p>
        <p class="news-card__vs mono">${n.visualSub}</p>
      </div>
      <div class="news-card__body">
        <div class="news-card__meta"><span class="pill pill--gold">${n.tag}</span><span class="pill">${n.date}</span><span class="pill">Latest</span></div>
        <h3 class="news-card__title">${n.title}</h3>
        <p class="news-card__excerpt">${n.excerpt}</p>
        ${n.link
          ? `<a class="news-card__link" href="${n.link}" target="_blank" rel="noopener" data-cursor="Read">Read the story <span aria-hidden="true">→</span></a>`
          : `<span class="news-card__link" aria-disabled="true">Full story coming soon</span>`}
      </div>
    </article>`).join('');

  // Email, LinkedIn, X
  const addr = $('#email-addr');
  const copy = $('#email-copy');
  if (site.email) {
    addr.textContent = site.email;
    addr.href = `mailto:${site.email}`;
    copy.hidden = false;
    copy.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(site.email); copy.textContent = 'Copied'; } catch { copy.textContent = 'Press Ctrl+C'; }
      setTimeout(() => (copy.textContent = 'Copy'), 1800);
    });
    $$('[data-link="email"]').forEach((a) => { a.href = `mailto:${site.email}`; });
    $$('[data-text="email"]').forEach((el) => { el.textContent = site.email; });
  } else {
    addr.classList.add('is-placeholder');
    addr.removeAttribute('data-cursor');
  }
  const external = (a, url) => { a.href = url; a.target = '_blank'; a.rel = 'noopener'; };
  if (site.linkedin) {
    $$('[data-link="linkedin"]').forEach((a) => external(a, site.linkedin));
    external($('#contact-linkedin'), site.linkedin);
    $('#contact-linkedin').textContent = 'Perartral Technologies';
  }
  if (site.x) $$('[data-link="x"]').forEach((a) => { a.hidden = false; external(a, site.x); });
  $('#contact-location').textContent = site.location;
  $('#year').textContent = String(new Date().getFullYear());

  // Contact form: opens the visitor's email app with the message filled in
  const form = $('#contact-form');
  const note = $('#form-note');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    let ok = true;
    $$('.field', form).forEach((f) => {
      const input = f.querySelector('input, textarea');
      const bad = !input.checkValidity();
      f.classList.toggle('is-invalid', bad);
      if (bad) ok = false;
    });
    if (!ok) { note.textContent = 'Please fill in your name, email and message.'; note.classList.add('is-warn'); return; }
    if (!site.email) {
      note.textContent = 'Our email address is being set up. Please check back soon.';
      note.classList.add('is-warn');
      return;
    }
    const d = Object.fromEntries(new FormData(form));
    const subject = `HimSetu enquiry from ${d.name}${d.org ? ` (${d.org})` : ''}`;
    const body = `${d.message}\n\n${d.name}${d.org ? `\n${d.org}` : ''}\n${d.email}`;
    window.location.href = `mailto:${site.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    note.textContent = 'Your email app should open now.';
    note.classList.remove('is-warn');
  });
}

/* ---------------------------------------------------------------
   Smooth scroll
---------------------------------------------------------------- */
let lenis = null;
function initLenis() {
  if (reduced) return;
  lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 0.95, touchMultiplier: 1.4 });
  window.__lenis = lenis;
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  lenis.stop();
}

function scrollToTarget(target) {
  const el = typeof target === 'string' ? $(target) : target;
  if (!el) return;
  if (lenis) lenis.scrollTo(el, { offset: 0, duration: 1.6, easing: (t) => 1 - Math.pow(1 - t, 4) });
  else el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
}

/* ---------------------------------------------------------------
   Header: solid after the hero, hides on scroll down, progress bar
---------------------------------------------------------------- */
function initHeader() {
  const header = $('.header');
  const progress = $('.header__progress i');
  const menuBtn = $('.header__menu');
  const menu = $('#site-menu');
  const panel = $('.menu__panel', menu);
  let lastY = 0;

  ScrollTrigger.create({
    start: 0, end: 'max',
    onUpdate: (self) => {
      const y = self.scroll();
      const heroEnd = $('.hero').offsetHeight - window.innerHeight * 0.9;
      header.classList.toggle('is-solid', y > heroEnd && !document.body.classList.contains('menu-open'));
      const goingDown = y > lastY;
      header.classList.toggle('is-hidden', goingDown && y > window.innerHeight * 0.6 && !document.body.classList.contains('menu-open'));
      lastY = y;
      progress.style.transform = `scaleX(${self.progress})`;
    },
  });

  const isOpen = () => menuBtn.getAttribute('aria-expanded') === 'true';
  const setMenu = (open, { restoreFocus = true } = {}) => {
    if (open === isOpen()) return;
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    document.body.classList.toggle('menu-open', open);
    header.classList.remove('is-hidden');
    gsap.killTweensOf([menu, panel]);
    if (open) {
      menu.hidden = false;
      header.classList.remove('is-solid');
      lenis?.stop();
      if (reduced) { gsap.set([menu, panel], { clearProps: 'all' }); }
      else {
        gsap.fromTo(menu, { opacity: 0 }, { opacity: 1, duration: 0.35, ease: 'power2.out' });
        gsap.fromTo(panel, { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)', duration: 0.75, ease: 'expo.out' });
        gsap.from($$('.menu__nav a, .menu__pitch > *, .menu__col', panel), { y: 30, opacity: 0, stagger: 0.04, duration: 0.7, ease: 'expo.out', delay: 0.1 });
      }
      $('.menu__nav a', panel).focus({ preventScroll: true });
    } else {
      lenis?.start();
      const done = () => { menu.hidden = true; gsap.set([menu, panel], { clearProps: 'all' }); };
      if (reduced) done();
      else gsap.to(menu, { opacity: 0, duration: 0.3, ease: 'power2.in', onComplete: done });
      if (restoreFocus) menuBtn.focus({ preventScroll: true });
    }
  };
  menuBtn.addEventListener('click', () => setMenu(!isOpen()));
  $('[data-menu-close]', menu).addEventListener('click', () => setMenu(false));
  document.addEventListener('keydown', (e) => {
    if (!isOpen()) return;
    if (e.key === 'Escape') { setMenu(false); return; }
    if (e.key !== 'Tab') return;
    // keep Tab inside the header button + menu panel while open
    const items = [menuBtn, ...$$('a:not([hidden]), button', panel)];
    const i = items.indexOf(document.activeElement);
    if (e.shiftKey && i <= 0) { e.preventDefault(); items[items.length - 1].focus(); }
    else if (!e.shiftKey && i === items.length - 1) { e.preventDefault(); items[0].focus(); }
  });

  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href');
    if (id.length < 2) return;
    e.preventDefault();
    if (isOpen()) setMenu(false, { restoreFocus: false });
    scrollToTarget(id === '#top' ? document.body : id);
  });
  $('.to-top').addEventListener('click', () => (lenis ? lenis.scrollTo(0, { duration: 2.2 }) : window.scrollTo({ top: 0, behavior: 'smooth' })));
}

/* ---------------------------------------------------------------
   Preloader + hero intro
---------------------------------------------------------------- */
async function runPreloader(heroVideo) {
  const numEl = $('.preloader__num');
  const lane = $('.preloader__lane');
  const drone = $('.drone');
  const shown = { v: 0 };
  let lastV = 0, tilt = 0;
  // the drone flies along the lane with the progress, nose dipping as it speeds up
  const render = () => {
    numEl.textContent = String(Math.floor(shown.v));
    lane.style.setProperty('--p', (shown.v / 100).toFixed(4));
    const speed = shown.v - lastV; lastV = shown.v;
    tilt += (Math.min(Math.max(speed * 3.2, 0), 14) - tilt) * 0.12;
    drone.style.setProperty('--tilt', `${tilt.toFixed(2)}deg`);
  };
  let videoP = 0;
  heroVideo.onProgress = (p) => { videoP = p; };
  const fonts = document.fonts ? document.fonts.ready : Promise.resolve();
  const videoDone = heroVideo.load();
  const minTime = new Promise((r) => setTimeout(r, reduced ? 200 : 1500));
  const cap = new Promise((r) => setTimeout(r, 6000)); // never hold visitors longer than this

  const tick = () => {
    const goal = Math.max(videoP * 100, shown.v);
    shown.v += (goal - shown.v) * 0.12 + 0.25;
    shown.v = Math.min(shown.v, videoP >= 1 ? 100 : 96);
    render();
  };
  gsap.ticker.add(tick);
  await Promise.race([Promise.all([fonts, videoDone, minTime]), cap]);
  gsap.ticker.remove(tick);
  await new Promise((r) => gsap.to(shown, { v: 100, duration: 0.6, ease: 'power2.out', onUpdate: render, onComplete: r }));
  await new Promise((r) => gsap.to({}, { duration: 0.3, onUpdate: render, onComplete: r })); // level out over the post

  // deliver: the crate drops at the post, the drone climbs away, the curtain lifts
  const pre = $('.preloader');
  await gsap.timeline()
    .to('.drone__cargo', { y: 44, opacity: 0, duration: 0.45, ease: 'power2.in' })
    .fromTo('.preloader__post svg', { scale: 1 }, { scale: 1.18, duration: 0.18, yoyo: true, repeat: 1, transformOrigin: '20% 100%' }, '-=0.08')
    .to('.preloader__drone', { x: '18vw', y: '-40vh', rotate: -10, opacity: 0, duration: 0.8, ease: 'power2.in' }, '-=0.25')
    .to('.preloader__inner, .preloader__count, .preloader__lane', { y: -30, opacity: 0, duration: 0.5, ease: 'power2.in' }, '-=0.55')
    .to(pre, { clipPath: 'inset(0 0 100% 0)', duration: 1.0, ease: 'expo.inOut' }, '-=0.15')
    .then();
  pre.remove();
  document.body.classList.remove('is-loading');
}

function heroIntro(heroVideo) {
  const lines = $$('.hero__line');
  const split = SplitText.create(lines, { type: 'lines', mask: 'lines' });
  const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
  tl.from('.hero__media', { scale: 1.12, duration: 2.2, ease: 'power3.out' }, 0)
    .from('.hero__eyebrow', { y: 20, opacity: 0, duration: 1 }, 0.2)
    .from(split.lines, { yPercent: 110, duration: 1.3, stagger: 0.12 }, 0.25)
    .from('.hero__sub', { y: 24, opacity: 0, duration: 1.1 }, 0.55)
    .from('.hero__ctas > *', { y: 24, opacity: 0, duration: 1, stagger: 0.08 }, 0.65)
    .from('.hero__foot', { opacity: 0, duration: 1 }, 0.9)
    .from('.hero__rings', { opacity: 0, scale: 0.85, duration: 1.6 }, 0.4)
    .from('.header', { y: -30, opacity: 0, duration: 1, clearProps: 'transform,opacity' }, 0.5);

  // The first part of clip 01 plays by itself; scroll takes over from there.
  const INTRO_END = 1.8;
  heroVideo.introEnd = INTRO_END;
  const v = heroVideo.video;
  if (!reduced && heroVideo.ready) {
    heroVideo.autoplaying = true;
    v.currentTime = 0;
    v.play().catch(() => {});
    const stop = () => {
      if (!heroVideo.autoplaying) return;
      heroVideo.autoplaying = false;
      v.pause();
      heroVideo.current = heroVideo.target = v.currentTime;
      heroVideo.shownFrame = -1;
    };
    const watch = () => {
      if (!heroVideo.autoplaying) return;
      if (v.currentTime >= INTRO_END) stop(); else requestAnimationFrame(watch);
    };
    requestAnimationFrame(watch);
    heroVideo.stopIntro = stop;
  }
}

/* ---------------------------------------------------------------
   Scroll scenes
---------------------------------------------------------------- */
function initHeroScroll(heroVideo) {
  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: '.hero', start: 'top top', end: 'bottom bottom', scrub: true,
      onUpdate: (self) => {
        if (self.progress > 0.004 && heroVideo.autoplaying) heroVideo.stopIntro?.();
        if (!heroVideo.autoplaying) {
          const from = heroVideo.introEnd ?? 0;
          heroVideo.setTime(from + (heroVideo.duration - from) * self.progress);
        }
      },
    },
    defaults: { ease: 'none' },
  });
  tl.to('.hero__content', { y: -90, opacity: 0, duration: 0.32 }, 0)
    .to('.hero__rings', { y: -160, opacity: 0, scale: 0.8, duration: 0.34 }, 0)
    .to('.hero__foot', { opacity: 0, duration: 0.12 }, 0)
    .fromTo('.hero__media', { clipPath: 'inset(0% 0% 0% 0% round 0px)' }, { clipPath: 'inset(8% 5% 8% 5% round 28px)', duration: 0.45, ease: 'power1.inOut' }, 0.55)
    .to('.hero__scrim', { opacity: 0.35, duration: 0.45 }, 0.55);
}

function initBridgeA(clip) {
  const section = clip.section;
  const spans = $$('.outline-text--fill span', section);
  const stamp = $('.bridge__alt', section);
  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: section, start: 'top bottom', end: 'bottom bottom', scrub: true,
      onUpdate: (self) => {
        // video starts scrubbing once the section reaches the top of the screen
        const p = gsap.utils.clamp(0, 1, (self.progress - 0.3) / 0.7);
        clip.setProgress(p);
        const t = clip.duration * p;
        stamp.textContent = `00:${String(Math.floor(t)).padStart(2, '0')}.${Math.floor((t % 1) * 10)}`;
      },
    },
    defaults: { ease: 'none' },
  });
  tl.fromTo($('.bridge__media', section), { clipPath: 'inset(14% 16% 14% 16% round 28px)' }, { clipPath: 'inset(0% 0% 0% 0% round 0px)', duration: 0.42, ease: 'power2.inOut' }, 0.18)
    .from($('.bridge__text', section), { opacity: 0, y: 60, duration: 0.15 }, 0.46)
    .to(spans, { backgroundPosition: '0% 0', duration: 0.3, stagger: 0.08 }, 0.48);
}

function initBridgeB(clip) {
  const section = clip.section;
  const el = $('.word-reveal', section);
  el.innerHTML = el.textContent.split(' ').map((w) => `<span class="w">${w}</span>`).join(' ');
  const words = $$('.w', el);
  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: section, start: 'top bottom', end: 'bottom bottom', scrub: true,
      onUpdate: (self) => clip.setProgress(gsap.utils.clamp(0, 1, (self.progress - 0.15) / 0.85)),
    },
    defaults: { ease: 'none' },
  });
  tl.fromTo($('.bridge__media', section), { scale: 1.15 }, { scale: 1, duration: 0.35 }, 0)
    .to(words, { opacity: 1, duration: 0.08, stagger: 0.06 }, 0.38)
    .to(el, { y: -40, opacity: 0, duration: 0.12 }, 0.84)
    .to($('.bridge__media', section), { clipPath: 'inset(8% 5% 8% 5% round 28px)', duration: 0.16, ease: 'power1.inOut' }, 0.84);
}

/* ---------------------------------------------------------------
   Reveals, marquee, parallax
---------------------------------------------------------------- */
function initReveals() {
  $$('.split-lines').forEach((el) => {
    const s = SplitText.create(el, { type: 'lines', mask: 'lines', autoSplit: true, onSplit: (self) =>
      gsap.from(self.lines, { yPercent: 110, duration: 1.2, stagger: 0.1, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 85%' } }) });
    return s;
  });
  $$('.reveal-up').forEach((el) => {
    gsap.from(el, { y: 44, opacity: 0, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 90%' } });
  });
  $$('.mask-reveal').forEach((el) => {
    gsap.fromTo(el, { clipPath: 'inset(16% 10% 16% 10% round 32px)' }, {
      clipPath: 'inset(0% 0% 0% 0% round 28px)', ease: 'none',
      scrollTrigger: { trigger: el, start: 'top 98%', end: 'top 50%', scrub: true },
    });
  });
  $$('.shot__img img').forEach((img) => {
    gsap.fromTo(img, { yPercent: -5 }, { yPercent: 0, ease: 'none', scrollTrigger: { trigger: img, start: 'top bottom', end: 'bottom top', scrub: true } });
  });
  gsap.from('.news-card', { y: 80, opacity: 0, duration: 1.3, ease: 'expo.out', stagger: 0.15, scrollTrigger: { trigger: '.news__list', start: 'top 85%' } });
}

function initMarquee() {
  const track = $('.marquee__track');
  track.innerHTML += track.innerHTML; // duplicate for a seamless loop
  // The loop always runs, even under reduced motion (e.g. Windows "Animation effects" off).
  const loop = gsap.to(track, { xPercent: -50, duration: 36, ease: 'none', repeat: -1 });
  if (reduced) return; // reduced motion: steady loop, no scroll-velocity speed-up or skew
  const skew = gsap.quickTo(track, 'skewX', { duration: 0.5, ease: 'power3' });
  ScrollTrigger.create({
    trigger: '.news', start: 'top bottom', end: 'bottom top',
    onUpdate: (self) => {
      const v = self.getVelocity();
      loop.timeScale(1 + Math.min(Math.abs(v) / 300, 5) * (v < 0 ? -1 : 1));
      skew(gsap.utils.clamp(-8, 8, v / -260));
    },
  });
  ScrollTrigger.addEventListener('scrollEnd', () => { gsap.to(loop, { timeScale: 1, duration: 0.8 }); skew(0); });
}

/* ---------------------------------------------------------------
   Footer: fixed reveal + motion
---------------------------------------------------------------- */
function initFooter() {
  const footer = $('#footer');
  const inner = $('.footer__inner');
  const video = $('.footer__video');
  const word = $('.footer__word');
  const base = $('.footer__word-base', word);
  const shine = $('.footer__word-shine', word);
  const brand = $('.footer__brand');

  // The middle letter (the R of PERARTRAL) is where the shine and the map ripple start.
  const MID = Math.floor(base.textContent.length / 2);
  const midRect = () => {
    const r = document.createRange();
    r.setStart(base.firstChild, MID); r.setEnd(base.firstChild, MID + 1);
    return r.getBoundingClientRect();
  };
  // centre of that R in footer coordinates (offsets, so scroll-reveal transforms don't skew it)
  const anchor = () => {
    const m = midRect(), w = word.getBoundingClientRect();
    return { x: brand.offsetLeft + word.offsetLeft + (m.left + m.width / 2 - w.left), y: brand.offsetTop + word.offsetTop + (m.top + m.height / 2 - w.top) };
  };

  let pulseAt = -1; // time the current ripple started (ms), -1 = none
  const dots = createHalftone($('.footer__dots'), video, { anchor, pulseAge: () => (pulseAt < 0 ? -1 : (performance.now() - pulseAt) / 1000) });

  // size the wordmark so it fills the width next to the rings, then re-aim the shine and the map at the R
  const fitWord = () => {
    word.style.setProperty('--fw', '100px');
    const range = document.createRange();
    range.selectNodeContents(base);
    const natural = range.getBoundingClientRect().width; // text width at 100px
    const room = word.clientWidth;
    if (natural && room) word.style.setProperty('--fw', `${Math.min(260, (room / natural) * 100 * 0.995).toFixed(2)}px`);
    const m = midRect(), w = shine.getBoundingClientRect();
    if (w.width) shine.style.setProperty('--c', `${(((m.left + m.width / 2 - w.left) / w.width) * 100).toFixed(2)}%`);
    dots.relayout();
  };
  fitWord();
  document.fonts?.ready.then(() => { fitWord(); fit(); });

  // Shine: two highlights leave the R together, one to P and one to L; a ripple crosses the map with them.
  const sweep = gsap.timeline({ repeat: -1, repeatDelay: 2.8, paused: true, onRepeat: () => { pulseAt = performance.now(); }, onStart: () => { pulseAt = performance.now(); } });
  sweep.fromTo(shine, { '--s': 0 }, { '--s': 1, duration: 2.2, ease: 'power2.inOut' }, 0)
    .fromTo(shine, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: 'power1.out' }, 0)
    .to(shine, { opacity: 0, duration: 0.5, ease: 'power1.in' }, 1.75);

  const fit = () => {
    footer.classList.remove('is-fixed');
    footer.style.removeProperty('--fh');
    const h = inner.offsetHeight;
    if (h <= window.innerHeight + 2 && window.innerWidth >= 700) {
      footer.style.setProperty('--fh', `${h}px`);
      footer.classList.add('is-fixed');
    }
    ScrollTrigger.refresh();
  };
  fit();
  let to; window.addEventListener('resize', () => { clearTimeout(to); to = setTimeout(() => { fitWord(); fit(); }, 200); });

  // use the latest entry: a jump-scroll can deliver a stale "not visible" entry together with the new one
  new IntersectionObserver((entries) => {
    const e = entries[entries.length - 1];
    if (e.isIntersecting) {
      if (video.preload === 'none') video.preload = 'auto';
      // The shine (and the map ripple it starts) always runs, like the news marquee, even with
      // reduced motion on (e.g. Windows "Animation effects" off). Only the background video stays still.
      if (!reduced) video.play().catch(() => {});
      sweep.play();
      dots.start();
    } else { video.pause(); dots.stop(); sweep.pause(); }
  }).observe(footer);

  const tl = gsap.timeline({ scrollTrigger: { trigger: footer, start: 'top 75%', end: 'bottom bottom', scrub: 0.6 }, defaults: { ease: 'none' } });
  tl.from('.footer__nav', { y: 30, opacity: 0 }, 0)
    .from('.footer__rule', { scaleX: 0, transformOrigin: 'left center' }, 0.05)
    .from('.footer__word', { yPercent: 30, opacity: 0 }, 0.1)
    .from('.footer__rings', { scale: 0.6, opacity: 0, rotate: -40 }, 0.1);
}

/* ---------------------------------------------------------------
   3D: lazy-loaded when needed
---------------------------------------------------------------- */
function whenNear(el, cb, margin = '60%') {
  const io = new IntersectionObserver((entries) => {
    if (entries.some((e) => e.isIntersecting)) { io.disconnect(); cb(); }
  }, { rootMargin: `${margin} 0px ${margin} 0px` });
  io.observe(el);
}

function supportsWebGL() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

function init3D() {
  if (!supportsWebGL()) { $$('.hero__rings, .footer__rings, .tablet-canvas').forEach((c) => c.remove()); return; }
  import('./three/rings.js').then(({ createRings }) => {
    createRings($('.hero__rings'), { mode: 'hero' });
    whenNear($('.footer'), () => createRings($('.footer__rings'), { mode: 'footer' }));
  });
  whenNear($('#touch-surface'), () => import('./three/tablet.js').then(({ createTablet }) => createTablet($('.tablet-canvas'), $('.touch-surface__log'))));
}

function initMapClip() {
  const v = $('.mapclip__video');
  new IntersectionObserver((entries) => {
    const e = entries[entries.length - 1];
    if (e.isIntersecting) { v.preload = 'auto'; if (reduced) v.controls = true; else v.play().catch(() => {}); } else v.pause();
  }, { threshold: 0.25 }).observe(v);
}

/* ---------------------------------------------------------------
   Boot
---------------------------------------------------------------- */
async function boot() {
  renderContent();
  initLenis();

  const [heroEl, bridgeAEl, bridgeBEl] = $$('.scrub');
  const hero = new ScrubVideo(heroEl);
  const bridgeA = new ScrubVideo(bridgeAEl);
  const bridgeB = new ScrubVideo(bridgeBEl);

  initHeader();
  initMagnetic();
  initTilt('.news-card');
  initSpatialView({ lenis });
  initMapClip();
  init3D();

  await runPreloader(hero);
  lenis?.start();

  // Scroll-linked scenes run in every mode: they only move when the visitor scrolls.
  initHeroScroll(hero);
  initBridgeA(bridgeA);
  initBridgeB(bridgeB);
  bridgeA.loadWhenNear();
  bridgeB.loadWhenNear();
  initReveals();
  initMarquee();
  initFooter();
  heroIntro(hero);
  ScrollTrigger.refresh();
}

boot();
