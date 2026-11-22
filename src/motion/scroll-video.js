import gsap from 'gsap';

/**
 * A <video> whose time follows a target set by scroll.
 * The whole clip is fetched as a Blob first, so seeking never waits on range requests,
 * and the provided *_scrub.mp4 files are all-keyframe encodes, so every seek is exact.
 */
export class ScrubVideo {
  constructor(section) {
    this.section = section;
    this.video = section.querySelector('.scrub__video');
    this.src = section.dataset.clip;
    this.ready = false;
    this.target = 0;
    this.current = 0;
    this.duration = 8;
    this.loading = null;
    this.onProgress = null;
    this.autoplaying = false;
    this.tick = this.tick.bind(this);
  }

  load() {
    if (this.loading) return this.loading;
    this.loading = (async () => {
      let url = this.src;
      try {
        const res = await fetch(this.src);
        if (!res.ok || !res.body) throw new Error('fetch failed');
        const total = Number(res.headers.get('content-length')) || 0;
        const reader = res.body.getReader();
        const chunks = [];
        let got = 0;
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
          got += value.length;
          if (total && this.onProgress) this.onProgress(got / total);
        }
        url = URL.createObjectURL(new Blob(chunks, { type: 'video/mp4' }));
      } catch {
        /* fall back to streaming the file directly */
      }
      this.video.src = url;
      this.video.load();
      await new Promise((resolve) => {
        if (this.video.readyState >= 1) return resolve();
        this.video.addEventListener('loadedmetadata', resolve, { once: true });
        this.video.addEventListener('error', resolve, { once: true });
      });
      this.duration = this.video.duration || this.duration;
      // iOS needs a play/pause before currentTime seeks paint frames
      try { await this.video.play(); } catch { /* autoplay may be blocked; seeking still works */ }
      if (!this.autoplaying) this.video.pause();
      this.video.currentTime = this.current;
      this.ready = true;
      this.onProgress?.(1);
      gsap.ticker.add(this.tick);
    })();
    return this.loading;
  }

  /** Load when the section comes within ~1.5 screens. */
  loadWhenNear() {
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { io.disconnect(); this.load(); }
    }, { rootMargin: '150% 0px 150% 0px' });
    io.observe(this.section);
  }

  setProgress(p, from = 0, to = 1) {
    const span = Math.max(0, this.duration - 0.06);
    const t = from * span + (to - from) * span * Math.min(1, Math.max(0, p));
    this.target = t;
  }

  setTime(t) { this.target = Math.min(Math.max(0, t), this.duration - 0.04); }

  tick() {
    if (!this.ready || this.autoplaying) return;
    this.current += (this.target - this.current) * 0.22;
    if (Math.abs(this.target - this.current) < 0.002) this.current = this.target;
    const v = this.video;
    if (!v.seeking && Math.abs(v.currentTime - this.current) > 0.012) {
      v.currentTime = this.current;
    }
  }
}
