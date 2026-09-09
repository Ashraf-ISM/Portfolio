# Md Ashraf — Applied Geophysics Portfolio 🌍

[![Applied Geophysics](https://img.shields.io/badge/Applied%20Geophysics-IIT(ISM)%20Dhanbad-0d7377?style=flat-square)](https://ash-geophysics.netlify.app/)
[![Python](https://img.shields.io/badge/Python-3.11-blue?style=flat-square)](https://www.python.org/)
[![MATLAB](https://img.shields.io/badge/MATLAB-R2024a-orange?style=flat-square)](https://www.mathworks.com/)

Source for **<https://ash-geophysics.netlify.app/>** — a static portfolio site
(no build step, no framework) deployed on Netlify.

---

## 👋 About

M.Sc.(Tech.) student in **Applied Geophysics** at **IIT (ISM) Dhanbad**, working
across seismic exploration, petrophysics, and machine learning for geoscience.

- **Education** — M.Sc.(Tech.) Applied Geophysics, IIT (ISM) Dhanbad · B.Sc. Physics, Patna Science College
- **Achievements** — DST-INSPIRE Scholar · ONGC Scholar · AIR-11, JMI M.Sc. Physics
- **Programming & ML** — Python, MATLAB, C, PyQt, Plotly, scikit-learn, XGBoost
- **Geophysical tools** — GAMIT/GLOBK, GMT, Seismic Unix, Tesseral Pro, DecisionSpace, Hampson-Russell
- **Data & analysis** — Jupyter, ArcGIS, well-log interpretation

---

## 📁 Repository layout

```
.
├── index.html                          # homepage (the only canonical homepage)
├── petrophysics_gui.html               # petrophysics desktop app project page
├── user-doc.html                       # user documentation for that app
├── 404.html                            # custom 404 (noindex)
├── robots.txt  sitemap.xml  site.webmanifest
├── netlify.toml                        # security headers, caching, redirects
├── assets/
│   ├── css/  js/  fonts/  vendor/
│   └── img/
│       ├── opt/                        # generated, web-optimised derivatives
│       │   ├── thumbs/                 #   480w + 900w  WebP + JPEG
│       │   ├── full/                   #   2200px JPEG for lightbox
│       │   ├── hero/                   #   background images
│       │   └── logos/
│       └── …                           # source masters (not served directly)
├── GUI-IMAGE/  +  GUI-IMAGE/opt/       # desktop-app screenshots
├── html/thesis-earthquake-declustering/ # research results page
├── manage/admin/                       # private Supabase-backed workspace (noindex)
├── tools/optimize-images.py            # regenerates every image derivative
└── docs/SECURITY.md                    # security + API-key notes — read this
```

---

## 🖼 Image pipeline

Images are **not** served from the source masters. Every displayed image is a
generated derivative under `assets/img/opt/`:

| Purpose | Location | Size |
|---|---|---|
| Card / gallery thumbnail | `opt/thumbs/<slug>-480…900.{webp,jpg}` | 900px wide |
| Lightbox full view | `opt/full/<slug>.jpg` | 2200px longest edge |
| Hero / section background | `opt/hero/<slug>.{webp,jpg}` | up to 1920px |

Every `<img>` is wrapped in a `<picture>` offering WebP with a JPEG fallback,
carries intrinsic `width`/`height` to prevent layout shift, and is lazy-loaded
below the fold.

**After adding or replacing a source image**, regenerate the derivatives:

```bash
python3 tools/optimize-images.py     # requires Pillow: pip install Pillow
```

The manifest at the top of that script maps each source master to a slug, and
those slugs are exactly what the HTML references — change a slug there and you
must update the matching `src` / `srcset` / `href` too. Never link a source
master directly from a page.

---

## 🚀 Local development

```bash
python3 -m http.server 8899      # then open http://127.0.0.1:8899/
```

Any static server works. There is no build step, no `npm install`, and no
bundler — the site is plain HTML/CSS/JS with jQuery-era vendor libraries.

---

## 🔐 Security

See **[docs/SECURITY.md](docs/SECURITY.md)** before touching API keys or the
admin area. Summary:

- The admin area's Supabase URL + anon key are public *by design*; Row Level
  Security is what protects the data. Never commit a `service_role` key.
- A Google Maps browser key previously shipped in `index.html` and remains in
  git history — it should be **deleted or regenerated** in the Google Cloud
  Console. Browser keys cannot be made secret; referrer + API restrictions are
  the real control.

---

## 📫 Contact

- **Email** — <ashraf.ism49@gmail.com>
- **Portfolio** — <https://ash-geophysics.netlify.app/>
- **GitHub** — <https://github.com/Ashraf-ISM>
- **LinkedIn** — <https://www.linkedin.com/in/ashraf-iit-ism/>

---

## 📄 Credits & licence

Built on a purchased HTML template; third-party library attributions are in
[`Credits.txt`](Credits.txt) and the licence in [`LICENSE.txt`](LICENSE.txt).
