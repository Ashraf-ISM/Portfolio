#!/usr/bin/env python3
"""
Portfolio image optimisation pipeline.

Generates, for each source image, a set of purpose-built derivatives under
assets/img/opt/:

  thumbs/<slug>-480.{webp,jpg}   small screens / srcset
  thumbs/<slug>-900.{webp,jpg}   card + gallery thumbnails (the visible <img>)
  full/<slug>.jpg                lightbox / full-resolution click-through
  hero/<slug>.{webp,jpg}         CSS background images

Aspect ratio is always preserved (downscale only) so the existing CSS
object-fit / aspect-ratio cropping produces a pixel-identical layout.
"""
import os
from PIL import Image

Image.MAX_IMAGE_PIXELS = None
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OPT = os.path.join(ROOT, "assets/img/opt")

# slug, source path, roles
# roles: "thumb" -> 480/900 webp+jpg ; "full" -> lightbox jpg ; "hero" -> bg webp+jpg
MANIFEST = [
    # --- hero / section backgrounds -------------------------------------
    ("hero-background",                  "assets/img/bg_image_head.png",            ["hero"],           1672),
    ("section-banner",                   "assets/img/bg_banner.jpg",                ["hero"],           1920),
    # --- profile --------------------------------------------------------
    ("md-ashraf-profile",                "assets/img/profile_pic.jpeg",             ["thumb"],          None),
    # --- PetroARX screenshots ------------------------------------------
    ("petroarx-3d-wellbore-viewer",      "assets/img/petroARX/start.png",           ["thumb", "full"],  None),
    ("petroarx-new-project-window",      "assets/img/petroARX/new_project.png",     ["thumb", "full"],  None),
    ("petroarx-data-info",               "assets/img/petroARX/data_info1.png",      ["thumb", "full"],  None),
    ("petroarx-log-qc-statistical",      "assets/img/petroARX/qc_Statistical.png",  ["thumb", "full"],  None),
    ("petroarx-multi-track-log-plot",    "assets/img/petroARX/multi_track_plot.png",["thumb", "full"],  None),
    ("petroarx-formation-evaluation",    "assets/img/petroARX/formation_eval.png",  ["thumb", "full"],  None),
    # --- other projects -------------------------------------------------
    ("seismoforge-interpretation",       "assets/img/petroARX/seismo-forge.jpeg",   ["thumb", "full"],  None),
    ("hub-india-realty-portal",          "assets/img/petroARX/hubindia_realty.png", ["thumb", "full"],  None),
    ("earthquake-declustering-clusters", "assets/img/work/EQ-DECLUSTER.png",        ["thumb", "full"],  None),
    ("seismic-data-processing",          "assets/img/work/seismic-unix.jpg",        ["thumb", "full"],  None),
    ("gps-surface-deformation",          "assets/img/work/surface-deform.jpg",      ["thumb", "full"],  None),
    ("ml-facies-classification",         "assets/img/work/facies-classification.png",["thumb", "full"], None),
    ("applied-geophysics-digital-hub",   "assets/img/work/geophysics-hub.jpg",      ["thumb", "full"],  None),
    # --- society / org logos -------------------------------------------
    ("facies-pairplot-icon",             "assets/img/work/PAIR-PLOT.png",           ["icon"],           160),
    ("eage-logo",                        "assets/img/work/eage-logo.png",           ["logo"],           320),
    ("seg-logo",                         "assets/img/work/seg-logo.png",            ["logo"],           320),
    ("chegg-logo",                       "assets/img/work/Chegg Logo.png",          ["logo"],           320),
    # --- thesis page figures -------------------------------------------
    ("nz-topography-seismicity",         "html/thesis-earthquake-declustering/Results/newzealand_topography.png.png", ["fig"], 1800),
    ("xgb-aftershock-analysis",          "html/thesis-earthquake-declustering/Results/XGB_Aftershock_Analysis.png",   ["fig"], 1800),
    ("xgb-model-performance",            "html/thesis-earthquake-declustering/Results/xgb_model_performance_plots_gb.png",  ["fig"], 1600),
    ("xgb-feature-importance",           "html/thesis-earthquake-declustering/Results/XGB_Feature_Importance_Detailed.png", ["fig"], 1600),
    ("xgb-confusion-matrix",             "html/thesis-earthquake-declustering/Results/600_xgb-confusion_matrix.png",        ["fig"], 1200),
    ("temporal-evolution-seismicity",    "html/thesis-earthquake-declustering/Results/temporal_analysis.png",              ["fig"], 1600),
]

# Desktop-app screenshots keep their own names and live beside the page that
# uses them, so they are handled by a second, simpler pass.
GUI_IMAGES = ["vshale", "multiplot", "reservoir-flag", "outlier-detection",
              "histogram", "data-loading", "well-data-stat", "help"]

THUMB_W  = 900     # visible card / gallery thumbnail width
SMALL_W  = 480     # mobile srcset entry
FULL_MAX = 2200    # lightbox longest edge

def load(path):
    im = Image.open(path)
    im.load()
    return im

def flatten(im):
    """Composite transparency onto white so JPEG output is correct."""
    if im.mode in ("RGBA", "LA", "P"):
        im = im.convert("RGBA")
        bg = Image.new("RGB", im.size, (255, 255, 255))
        bg.paste(im, mask=im.split()[-1])
        return bg
    return im.convert("RGB")

def resize_w(im, target_w):
    if im.width <= target_w:
        return im.copy()
    h = max(1, round(im.height * target_w / im.width))
    return im.resize((target_w, h), Image.LANCZOS)

def resize_max(im, longest):
    if max(im.size) <= longest:
        return im.copy()
    if im.width >= im.height:
        return resize_w(im, longest)
    w = max(1, round(im.width * longest / im.height))
    return im.resize((w, longest), Image.LANCZOS)

def save_webp(im, path, q=82):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    im.save(path, "WEBP", quality=q, method=6)

def save_jpg(im, path, q=82):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    flatten(im).save(path, "JPEG", quality=q, optimize=True, progressive=True)

def save_png(im, path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    im.save(path, "PNG", optimize=True)

results = []
for slug, src, roles, cap in MANIFEST:
    sp = os.path.join(ROOT, src)
    if not os.path.exists(sp):
        print(f"!! SKIP (missing): {src}")
        continue
    im = load(sp)
    before = os.path.getsize(sp)
    made = []

    if "hero" in roles:
        base = resize_w(im, cap or im.width)
        save_webp(base, f"{OPT}/hero/{slug}.webp", q=78)
        save_jpg(base,  f"{OPT}/hero/{slug}.jpg",  q=80)
        made += [f"hero/{slug}.webp", f"hero/{slug}.jpg"]

    if "thumb" in roles:
        t9 = resize_w(im, THUMB_W)
        t4 = resize_w(im, SMALL_W)
        save_webp(t9, f"{OPT}/thumbs/{slug}-900.webp", q=82)
        save_jpg(t9,  f"{OPT}/thumbs/{slug}-900.jpg",  q=82)
        save_webp(t4, f"{OPT}/thumbs/{slug}-480.webp", q=80)
        save_jpg(t4,  f"{OPT}/thumbs/{slug}-480.jpg",  q=80)
        made += [f"thumbs/{slug}-900.webp", f"thumbs/{slug}-900.jpg",
                 f"thumbs/{slug}-480.webp", f"thumbs/{slug}-480.jpg"]
        results.append((slug, "thumb", t9.size, before))

    if "full" in roles:
        f = resize_max(im, FULL_MAX)
        save_jpg(f, f"{OPT}/full/{slug}.jpg", q=84)
        made.append(f"full/{slug}.jpg")

    if "logo" in roles:
        l = resize_w(im, cap)
        save_webp(l, f"{OPT}/logos/{slug}.webp", q=88)
        save_png(l,  f"{OPT}/logos/{slug}.png")
        made += [f"logos/{slug}.webp", f"logos/{slug}.png"]

    if "icon" in roles:
        ic = resize_w(im, cap)
        save_webp(ic, f"{OPT}/thumbs/{slug}.webp", q=86)
        save_jpg(ic,  f"{OPT}/thumbs/{slug}.jpg",  q=86)
        made += [f"thumbs/{slug}.webp", f"thumbs/{slug}.jpg"]

    if "fig" in roles:
        f = resize_w(im, cap)
        figdir = os.path.join(ROOT, "html/thesis-earthquake-declustering/Results/opt")
        save_webp(f, f"{figdir}/{slug}.webp", q=84)
        save_jpg(f,  f"{figdir}/{slug}.jpg",  q=84)
        made += []   # sizes reported separately

    after = sum(os.path.getsize(os.path.join(OPT, m)) for m in made)
    print(f"{src}\n   {im.size[0]}x{im.size[1]}  {before/1024:8.0f} KB  ->  "
          f"{len(made)} derivatives, {after/1024:7.0f} KB total")

# print natural dimensions of the 900w thumbs, needed for width/height attrs
print("\n=== width/height attributes for 900w thumbs ===")
for slug, kind, size, _ in results:
    print(f'{slug:36} width="{size[0]}" height="{size[1]}"')


# ---------------------------------------------------------------- GUI-IMAGE ---
gui_out = os.path.join(ROOT, "GUI-IMAGE/opt")
for name in GUI_IMAGES:
    sp = os.path.join(ROOT, "GUI-IMAGE", name + ".png")
    if not os.path.exists(sp):
        print(f"!! SKIP (missing): GUI-IMAGE/{name}.png")
        continue
    im = load(sp)
    im = resize_w(im, 1400)
    save_webp(im, f"{gui_out}/{name}.webp", q=84)
    save_jpg(im,  f"{gui_out}/{name}.jpg",  q=84)
    print(f"GUI-IMAGE/{name}.png -> opt/{name}.{{webp,jpg}}")

print("\nDone. Derivative names are what the HTML references - if you change a "
      "slug here, update the corresponding src/srcset/href in the HTML too.")
