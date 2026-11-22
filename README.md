# Perartral Technologies: landing website

Single-page, scroll-driven site. White, Perartral brown and gold. The FPV clips act as scroll transitions.
The plan is in `docs/Perartral_Website_Implementation_Plan.pdf`.

## Run it

```bash
npm install
npm run dev       # http://127.0.0.1:5178
npm run build     # static site in dist/ (upload dist/ to any static host)
npm run preview   # serve the built site at http://127.0.0.1:4178
npm run deploy    # build and publish to Cloudflare Pages (project "perartral")
```

## Edit content

All editable content is in `src/config.js`:

- `email`: the address visitors write to. While it is empty, the site shows "coming soon" and the form does not send.
- `linkedin` and `x`: profile URLs. X stays hidden while its value is empty.
- `news`: Featured News cards, newest first. Add a `link` once an article exists.

## Page order

| Section | File / asset |
| --- | --- |
| Preloader (0–100 %) | `index.html`, `src/main.js` → `runPreloader` |
| Hero: clip 01 plays its first 1.8 s, then scroll scrubs it and shrinks it into a card | `public/media/fpv_01_river_rush_scrub.mp4` |
| 01 HimSetu: copy, 3 parts, map clip, touchable tablet, screenshots, spatial view | `src/three/tablet.js`, `src/spatial/spatial-view.js` |
| Transition A: clip 02 grows to full screen; outline text fills with gold | `fpv_02_canyon_dive_scrub.mp4` |
| 02 Featured News: marquee and the VIT Chennai card | `src/config.js` |
| Transition B: clip 05; word-by-word reveal | `fpv_05_rising_reveal_scrub.mp4` |
| 03 Contact: email card and a mailto form | `src/config.js` |
| Footer: revealed from under the page. 3D rings, gold sweep on the wordmark, orbit lines, clip 06 behind | `src/three/rings.js` |

## Stack

- **GSAP + ScrollTrigger + SplitText, Lenis**: scrubbing, reveals, marquee, smooth scroll.
- **Three.js + THREE.Interactive**: touchable surfaces, meaning the hero and footer logo rings and the HimSetu tablet keys. They respond to mouse, pen and touch.
- **three-live + xr-live**: spatial browsing. `<xr-live>` builds a sandboxed 3D scene with grabbable spatial HTML cards, orbit, pinch and zoom, WebXR and hand gestures. The sandbox engine is served from `public/vendor/three-live/`. Copy it again after you upgrade `three-live`:
  `cp node_modules/three-live/dist/three-live.min.js node_modules/three-live/dist/three-live-sandbox.html public/vendor/three-live/`
- **HyperFrames**: renders the HimSetu map clip. The source is in `video/himsetu-map/index.html`. To re-render (FFmpeg must be on PATH):
  ```bash
  cd video/himsetu-map
  npx --prefix .. hyperframes check
  npx --prefix .. hyperframes render -o renders/himsetu-map.mp4
  ```
  Then re-encode the render to `public/media/himsetu-map.mp4`. The site uses a 1440 px wide H.264 encode with faststart.

## Notes

- With *reduce motion* turned on, the scroll-linked scenes still play, because they only move when the visitor scrolls. Smooth-scroll inertia, autoplay and decorative loops are switched off.
- HimSetu screens and the map use demo data only, as the company reference requires.
- `fpv_03_rock_spires` and `fpv_04_canyon_weave` are not used yet. They are left out of `public/media` to keep the page light.
