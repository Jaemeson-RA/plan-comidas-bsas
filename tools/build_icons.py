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
 "droplet": "droplet", "trophy": "trophy", "award": "award", "camera": "camera", "lock": "lock", "settings": "settings", "userplus": "user-plus", "share": "share", "star": "star", "medal": "medal", "printer": "printer", "chart": "chart-bar", "receipt": "receipt", "bell": "bell", "fridge": "fridge", "arrowup": "arrow-up", "logout": "logout", "heart": "heart", "x": "x", "phone": "device-mobile", "android": "brand-android", "apple": "brand-apple", "qr": "qrcode", "download": "download",
}
def inner(path):
    s = open(path, encoding="utf-8").read()
    body = re.search(r"<svg[^>]*>(.*)</svg>", s, re.S).group(1)
    body = re.sub(r'<path[^>]*d="M0 0h24v24H0z"[^>]*/>', "", body)  # fondo invisible de tabler
    body = re.sub(r'\s+(stroke|fill|stroke-width|stroke-linecap|stroke-linejoin)="[^"]*"', "", body)
    return re.sub(r"\s+", " ", body).strip()
LUCIDE = r"C:\Users\Jaeme\assets-lib\icons\lucide\icons"
# utensilios de cocina: Tabler + Lucide (mismo trazo de 2 px, viewBox 24) + dibujados acá cuando no existen
T.update({"u-horno": "microwave", "u-wok": "bowl-chopsticks", "u-plancha": "grill", "u-cacerola": "cooker", "u-licuadora": "blender",
          "u-bowl": "bowl", "u-batidor": "whisk", "u-cafetera": "coffee", "u-espumadera": "ladle"})
L = {"u-olla": "cooking-pot", "u-papel": "scroll", "u-tabla": "slice"}
UTENS = {
 "u-fuente": '<path d="M4 10.5h16v3.5a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z"/><path d="M2 11h2M20 11h2"/><path d="M8.5 7.5c0-1 1-1 1-2M12 7.5c0-1 1-1 1-2M15.5 7.5c0-1 1-1 1-2"/>',
 "u-placa": '<path d="M3 10h18l-1.4 6.2a2 2 0 0 1-2 1.6H6.4a2 2 0 0 1-2-1.6z"/><path d="M8 13.5h.01M12 13.5h.01M16 13.5h.01"/>',
 "u-molde": '<path d="M3 11h18l-1.8 5.5a2 2 0 0 1-1.9 1.5H6.7a2 2 0 0 1-1.9-1.5z"/><path d="M6 11l1-2.5M10 11l.5-2.5M14 11l-.5-2.5M18 11l-1-2.5"/>',
 "u-sarten": '<path d="M3 12a6 6 0 1 0 12 0a6 6 0 1 0-12 0"/><path d="M15 12h6.5"/><path d="M6.5 10.5c.8-1 2.2-1.3 3.4-.7"/>',
 "u-tostadora": '<rect x="3" y="9" width="18" height="11" rx="3"/><path d="M8 9V5.5h3V9M13 9V5.5h3V9"/><path d="M7 15h10"/>',
 "u-rallador": '<path d="M8 4h8l2 17H6z"/><path d="M10 9h.01M14 9h.01M10 13h.01M14 13h.01M10 17h.01M14 17h.01"/><path d="M10 4V2.5h4V4"/>',
 "u-colador": '<path d="M3 10h14a7 7 0 0 1-14 0z"/><path d="M17 10.5l4.5-2"/><path d="M7 13.5h.01M10 15.5h.01M13 13.5h.01"/>',
 "u-pisapapas": '<path d="M12 2.5v10"/><path d="M5 12.5h14"/><path d="M5.5 12.5l1.5 7h10l1.5-7"/><path d="M9 16h6"/>',
 "u-palo": '<path d="M6 15l9-9a2.1 2.1 0 0 1 3 3l-9 9a2.1 2.1 0 0 1-3-3z"/><path d="M2.5 21.5l3-3M18.5 5.5l3-3"/>',
}
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
for sid, fname in L.items():
    p = os.path.join(LUCIDE, fname + ".svg")
    if not os.path.exists(p): print("FALTA lucide", fname); continue
    out.append(f'<symbol id="i-{sid}" viewBox="0 0 24 24">{inner(p)}</symbol>')
for sid, body in {**CUSTOM, **UTENS}.items():
    out.append(f'<symbol id="i-{sid}" viewBox="0 0 24 24">{body}</symbol>')
out.append("</svg>")
open(os.path.join(root, "icons.svg"), "w", encoding="utf-8").write("\n".join(out))
print("OK icons.svg", len(T) + len(L) + len(CUSTOM) + len(UTENS), "símbolos")
