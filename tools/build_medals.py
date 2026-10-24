# -*- coding: utf-8 -*-
"""Genera las 23 medallas de las insignias como SVG (img/medals/<id>.svg) con la paleta del sitio.

Medalla colgante: cinta con chevrón arriba (color de la familia), argolla, aro de metal según el palier
(bronce · plata · oro · platino · diamante facetado), esmalte interior con el ícono Tabler del sprite
y estrellas en el aro (1 a 5). Los colores salen de style.css (albahaca, tomate, miel, cielo, tinta)."""
import os, re, sys, math
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
OUT = os.path.join(ROOT, "img", "medals"); os.makedirs(OUT, exist_ok=True)
SPRITE = open(os.path.join(ROOT, "icons.svg"), encoding="utf-8").read()

def hx(c): return tuple(int(c[i:i + 2], 16) for i in (1, 3, 5))
def rgb(t): return "#%02X%02X%02X" % tuple(max(0, min(255, round(v))) for v in t)
def mix(a, b, k): A, B = hx(a), hx(b); return rgb(tuple(A[i] + (B[i] - A[i]) * k for i in range(3)))
CREMA, INK = "#FFFDF9", "#1F2D2A"

# metales por palier: [brillo, medio, sombra, medio-claro, nombre]
TIER = {
    1: ["#EBC08C", "#C8893A", "#8C5A1E", "#B27A33", "bronce"],
    2: ["#F4F5F2", "#C9CFCB", "#7F8C87", "#B3BCB7", "plata"],
    3: ["#FBE4A8", "#F2B544", "#B87F12", "#E0A52E", "oro"],
    4: ["#F4F8F5", "#CFE0D7", "#7FA393", "#AFC9BC", "platino"],
    5: ["#FFFFFF", "#CFE6F5", "#6FAFD8", "#9CCBEA", "diamante"],
}
# familias: color de esmalte + color del ícono
FAM = {
    "flame": ("#E4572E", "#FFFFFF"), "check": ("#2F8F5B", "#FFFFFF"), "calendar": ("#F2B544", INK),
    "recetas": ("#B8432A", "#FFFFFF"), "tag": ("#9A6E12", "#FFFFFF"), "droplet": ("#4A97C9", "#FFFFFF"),
    "users": ("#23704A", "#FFFFFF"), "trophy": ("#1F2D2A", "#F2B544"),
}
BADGES = [("racha3", 1, "flame"), ("racha7", 2, "flame"), ("racha15", 3, "flame"), ("racha30", 4, "flame"), ("racha60", 5, "flame"),
          ("dias10", 1, "check"), ("dias30", 2, "check"), ("dias100", 4, "check"),
          ("semana1", 2, "calendar"), ("semana4", 4, "calendar"), ("plan7", 1, "calendar"),
          ("receta1", 1, "recetas"), ("receta5", 2, "recetas"), ("receta15", 4, "recetas"),
          ("ing1", 1, "tag"), ("ing10", 3, "tag"), ("agua1", 1, "droplet"), ("agua7", 2, "droplet"), ("agua30", 4, "droplet"),
          ("amigo1", 1, "users"), ("amigo5", 3, "users"), ("nivel5", 3, "trophy"), ("nivel10", 5, "trophy")]

def icon_paths(name):
    m = re.search(r'<symbol id="i-%s"[^>]*>(.*?)</symbol>' % name, SPRITE, re.S)
    return m.group(1).strip() if m else ""

def star(cx, cy, r, fill, stroke):
    pts = []
    for i in range(10):
        a = -math.pi / 2 + i * math.pi / 5; rr = r if i % 2 == 0 else r * 0.45
        pts.append("%.2f,%.2f" % (cx + rr * math.cos(a), cy + rr * math.sin(a)))
    return '<polygon points="%s" fill="%s" stroke="%s" stroke-width=".5" stroke-linejoin="round"/>' % (" ".join(pts), fill, stroke)

def facets(cx, cy, r1, r2, cols, n=18):
    out = []
    for i in range(n):
        a0 = 2 * math.pi * i / n; a1 = 2 * math.pi * (i + 1) / n; am = (a0 + a1) / 2
        p = lambda r, a: "%.2f,%.2f" % (cx + r * math.cos(a), cy + r * math.sin(a))
        # cada sector partido en dos triángulos para el efecto tallado
        out.append('<polygon points="%s %s %s" fill="%s"/>' % (p(r1, a0), p(r2, a0), p((r1 + r2) / 2, am), cols[i % 3]))
        out.append('<polygon points="%s %s %s" fill="%s"/>' % (p(r2, a0), p(r2, a1), p((r1 + r2) / 2, am), cols[(i + 1) % 3]))
        out.append('<polygon points="%s %s %s" fill="%s"/>' % (p(r2, a1), p(r1, a1), p((r1 + r2) / 2, am), cols[(i + 2) % 3]))
        out.append('<polygon points="%s %s %s" fill="%s"/>' % (p(r1, a1), p(r1, a0), p((r1 + r2) / 2, am), cols[i % 3]))
    return "".join(out)

def medal(bid, tier, fam):
    light, mid, dark, mid2, tname = TIER[tier]; ena, ico = FAM[fam]
    stripe = mix(ena, CREMA, 0.55) if fam != "trophy" else "#F2B544"
    edge = mix(ena, INK, 0.25); cx, cy = 60, 100
    g = "m" + bid
    s = ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 150" role="img" aria-label="%s · %s">' % (bid, tname), "<defs>",
         '<linearGradient id="%sm" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="%s"/><stop offset=".35" stop-color="%s"/><stop offset=".7" stop-color="%s"/><stop offset="1" stop-color="%s"/></linearGradient>' % (g, light, mid, dark, mid2),
         '<linearGradient id="%sb" x1="1" y1="1" x2="0" y2="0"><stop offset="0" stop-color="%s"/><stop offset=".5" stop-color="%s"/><stop offset="1" stop-color="%s"/></linearGradient>' % (g, light, mid, dark),
         '<radialGradient id="%se" cx=".5" cy=".5" r=".5"><stop offset=".62" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".3"/></radialGradient>' % g,
         '<radialGradient id="%sg" cx=".35" cy=".28" r=".6"><stop offset="0" stop-color="#fff" stop-opacity=".42"/><stop offset=".55" stop-color="#fff" stop-opacity="0"/></radialGradient>' % g,
         '<linearGradient id="%sr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset=".75" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".28"/></linearGradient>' % g,
         '<pattern id="%st" width="3" height="3" patternUnits="userSpaceOnUse"><rect width="1" height="3" fill="#000" opacity=".07"/></pattern>' % g,
         '<filter id="%ss" x="-20%%" y="-20%%" width="140%%" height="140%%"><feDropShadow dx="0" dy="2" stdDeviation="1.6" flood-color="#1F2D2A" flood-opacity=".28"/></filter>' % g,
         "</defs>"]
    # cinta (chevrón) con franja central, bordes oscuros, trama de tela y sombra del pliegue
    s.append('<g filter="url(#%ss)"><polygon points="34,0 86,0 86,36 60,56 34,36" fill="%s"/>' % (g, ena))
    s.append('<polygon points="34,0 39,0 39,40 34,36" fill="%s"/><polygon points="81,0 86,0 86,36 81,40" fill="%s"/>' % (edge, edge))
    s.append('<polygon points="53,0 67,0 67,51 60,56 53,51" fill="%s"/>' % stripe)
    s.append('<polygon points="34,0 86,0 86,36 60,56 34,36" fill="url(#%st)"/><polygon points="34,0 86,0 86,36 60,56 34,36" fill="url(#%sr)"/></g>' % (g, g))
    # argolla
    s.append('<circle cx="60" cy="55" r="5.5" fill="none" stroke="%s" stroke-width="3.2"/><circle cx="60" cy="55" r="5.5" fill="none" stroke="%s" stroke-width="1.4" stroke-dasharray="9 26" stroke-linecap="round"/>' % (dark, light))
    # aro de metal
    s.append('<g filter="url(#%ss)">' % g)
    if tier == 5:
        s.append('<circle cx="%d" cy="%d" r="46" fill="%s"/>' % (cx, cy, mid2))
        s.append(facets(cx, cy, 37.5, 46, ["#FFFFFF", "#CFE6F5", "#8FC1E6"]))
        s.append('<circle cx="%d" cy="%d" r="46" fill="none" stroke="%s" stroke-width="1"/>' % (cx, cy, dark))
    else:
        s.append('<circle cx="%d" cy="%d" r="46" fill="url(#%sm)" stroke="%s" stroke-width=".9"/>' % (cx, cy, g, dark))
        s.append('<circle cx="%d" cy="%d" r="42.3" fill="none" stroke="%s" stroke-opacity=".55" stroke-width=".9" stroke-dasharray="1.2 2.6" stroke-linecap="round"/>' % (cx, cy, dark))
    s.append('<circle cx="%d" cy="%d" r="38" fill="none" stroke="url(#%sb)" stroke-width="2.4"/>' % (cx, cy, g))
    s.append("</g>")
    # esmalte
    s.append('<circle cx="%d" cy="%d" r="36" fill="%s"/><circle cx="%d" cy="%d" r="36" fill="url(#%se)"/><circle cx="%d" cy="%d" r="36" fill="url(#%sg)"/>' % (cx, cy, ena, cx, cy, g, cx, cy, g))
    s.append('<circle cx="%d" cy="%d" r="36" fill="none" stroke="#000" stroke-opacity=".18" stroke-width="1"/>' % (cx, cy))
    # ícono (sprite Tabler, 24 → 44 px)
    s.append('<g transform="translate(36 76) scale(2)" fill="none" stroke="%s" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">%s</g>' % (ico, icon_paths(fam)))
    # estrellas en el aro (abajo)
    n = tier; step = 16
    for i in range(n):
        a = math.radians(90 + (i - (n - 1) / 2) * step)
        s.append(star(cx + 41.5 * math.cos(a), cy + 41.5 * math.sin(a), 3.9, light if tier != 5 else "#FFFFFF", dark))
    s.append("</svg>")
    return "".join(s)

for bid, tier, fam in BADGES:
    open(os.path.join(OUT, bid + ".svg"), "w", encoding="utf-8").write(medal(bid, tier, fam))
print("ok", len(BADGES), "medallas →", OUT)
