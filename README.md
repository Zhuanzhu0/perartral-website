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
- `linkedin` and `x`: profile URLs (LinkedIn is set to the company page). X stays hidden while its value is empty. They fill every LinkedIn/Email/X link in the menu, contact section and footer.
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
| Menu: three-line button in the header opens a panel with the sections, a demo call-to-action and contact links | `index.html` (`#site-menu`), `src/main.js` → `initHeader` |
| Footer: revealed from under the page. Links row, 3D rings and a brushed-gold wordmark (its shine starts at the middle R and runs out to P and L), over a dot-matrix map of India drawn from clip 06 | `src/three/rings.js`, `src/motion/halftone.js`, `src/motion/india-map.js` |

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
  Then copy the render to the site without re-encoding (the render is already CRF 16):
  `ffmpeg -i renders/himsetu-map.mp4 -c copy -movflags +faststart -an ../../public/media/himsetu-map.mp4`

## Video encodes

Media under `/media/` is cached by browsers for 7 days (`public/_headers`). Whenever you replace a file there, bump its `?v=` number in `index.html` so returning visitors fetch the new one.


Always encode from the 1080p30 originals in the repo root, never from a previous web file.

- Scrub clips (`*_scrub.mp4`): native 1920x1080, 30 fps, all-intra (every frame a keyframe, so scrubbing in either direction decodes one frame per seek):
  `ffmpeg -i fpv_XX.mp4 -map 0:v:0 -c:v libx264 -preset slow -crf 18 -g 1 -keyint_min 1 -bf 0 -pix_fmt yuv420p -profile:v high -level 4.1 -colorspace bt709 -color_primaries bt709 -color_trc bt709 -color_range tv -fps_mode passthrough -map_metadata -1 -movflags +faststart -an public/media/fpv_XX_scrub.mp4`
  Clip 01 uses CRF 18; clips 02 and 05 use CRF 19 so they stay under Cloudflare Pages' 25 MiB per-file limit.
- Footer loop: stream copy of `fpv_06_canyon_overview.mp4` (`-c copy -movflags +faststart -an`), bit-identical to the source.

## Notes

- The footer map of India (`src/motion/india-map.js`) uses India's official boundary, including all of Jammu & Kashmir and Ladakh. Source: `@highcharts/map-collection` 2.3.0, `countries/in/custom/in-all-disputed.geo.json`, simplified. Keep this outline if the map is ever replaced.

- With *reduce motion* turned on, the scroll-linked scenes still play, because they only move when the visitor scrolls. Smooth-scroll inertia, autoplay and decorative loops are switched off.
- HimSetu screens and the map use demo data only, as the company reference requires.
- `fpv_03_rock_spires` and `fpv_04_canyon_weave` are not used yet. They are left out of `public/media` to keep the page light.
