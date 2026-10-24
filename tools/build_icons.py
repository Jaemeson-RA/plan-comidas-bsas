# Genera ../icons.svg (sprite de <symbol>) a partir de Tabler outline (assets-lib) + íconos propios.
import os, re, sys
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
root = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
TABLER = r"C:\Users\Jaeme\assets-lib\icons\tabler\icons\outline"
# id -> archivo tabler
T = {
 "home": "home", "calendar": "calendar-event", "recetas": "tools-kitchen-2", "compras": "shopping-cart", "super": "truck-delivery",
 "desayuno": "sunrise", "almuerzo": "sun", "cena": "moon-stars", "clock": "clock", "flame": "flame", "tag": "tag", "users": "users",
 "bulb": "bulb", "plus": "plus", "play": "player-play", "mail": "mail", "copy": "copy", "refresh": "refresh", "check": "check",
 "arrow": "arrow-right", "external": "external-link", "pin": "map-pin", "bolt": "bolt", "leaf": "leaf", "coin": "coin",
}
def inner(path):
    s = open(path, encoding="utf-8").read()
    body = re.search(r"<svg[^>]*>(.*)</svg>", s, re.S).group(1)
    body = re.sub(r'<path[^>]*d="M0 0h24v24H0z"[^>]*/>', "", body)  # fondo invisible de tabler
    body = re.sub(r'\s+(stroke|fill|stroke-width|stroke-linecap|stroke-linejoin)="[^"]*"', "", body)
    return re.sub(r"\s+", " ", body).strip()
CUSTOM = {
 # mate con bombilla y yerba (merienda)
 "merienda": '<path d="M7.5 10.5c-1 0-1.5 .7-1.5 1.8v2.2a5 5 0 0 0 5 5h2a5 5 0 0 0 5-5v-2.2c0-1.1-.5-1.8-1.5-1.8z"/><path d="M6.5 12.5h11"/><path d="M13 10.5l4.5-7"/><path d="M16.3 3.6l1.8 1.2"/><path d="M9.5 15.5c1.6 1 3.4 1 5 0"/>',
 # cacerola con vapor (marca)
 "pot": '<path d="M4.5 10.5h15"/><path d="M5.5 10.5v5a3.5 3.5 0 0 0 3.5 3.5h6a3.5 3.5 0 0 0 3.5-3.5v-5"/><path d="M2.5 12.5h3M18.5 12.5h3"/><path d="M12 7.5v3M10 7.5h4"/><path d="M9.5 4.5c0-1 1-1 1-2M13.5 4.5c0-1 1-1 1-2"/>',
 # porción / plato con cubiertos (porciones)
 "plate": '<path d="M5 12a7 7 0 1 0 14 0a7 7 0 1 0-14 0"/><path d="M9 12a3 3 0 1 0 6 0a3 3 0 1 0-6 0"/><path d="M2 8v8M22 8c-1.5 1-1.5 7 0 8"/>',
}
out = ['<svg xmlns="http://www.w3.org/2000/svg" style="display:none" aria-hidden="true">']
for sid, fname in T.items():
    p = os.path.join(TABLER, fname + ".svg")
    if not os.path.exists(p): print("FALTA", fname); continue
    out.append(f'<symbol id="i-{sid}" viewBox="0 0 24 24">{inner(p)}</symbol>')
for sid, body in CUSTOM.items():
    out.append(f'<symbol id="i-{sid}" viewBox="0 0 24 24">{body}</symbol>')
out.append("</svg>")
open(os.path.join(root, "icons.svg"), "w", encoding="utf-8").write("\n".join(out))
print("OK icons.svg", len(T) + len(CUSTOM), "símbolos")
