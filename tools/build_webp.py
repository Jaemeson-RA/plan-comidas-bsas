# -*- coding: utf-8 -*-
"""Convierte las fotos de img/*.jpg a WebP en dos tamaños (img/w/<id>-480.webp y -900.webp).
build.py usa esas rutas en data.js (src + srcset); los JPG originales quedan como respaldo y para la credencial."""
import os, sys, glob
from PIL import Image
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
OUT = os.path.join(ROOT, "img", "w"); os.makedirs(OUT, exist_ok=True)
tot_in = tot_out = 0
for f in sorted(glob.glob(os.path.join(ROOT, "img", "*.jpg"))):
    base = os.path.splitext(os.path.basename(f))[0]
    im = Image.open(f).convert("RGB"); tot_in += os.path.getsize(f)
    for w, q in ((480, 76), (900, 80)):
        o = os.path.join(OUT, f"{base}-{w}.webp")
        if os.path.exists(o) and os.path.getmtime(o) >= os.path.getmtime(f): tot_out += os.path.getsize(o); continue
        r = min(1.0, w / im.width); im2 = im.resize((round(im.width * r), round(im.height * r)), Image.LANCZOS) if r < 1 else im
        im2.save(o, "WEBP", quality=q, method=6); tot_out += os.path.getsize(o)
print(f"ok: {tot_in // 1024} KB jpg → {tot_out // 1024} KB webp (480 + 900)")
