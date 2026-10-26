# -*- coding: utf-8 -*-
"""Zonas de Menuario (provincias, y la de Buenos Aires partida en cuatro) y qué cadenas hay en cada una.

Una cadena «está» en una zona si tiene al menos 2 sucursales a menos de 60 km de alguna de sus ciudades,
según OpenStreetMap (Overpass) o los puntos de retiro de la propia cadena (VTEX).
Uso: python tools/zonas.py   -> reescribe el bloque /*ZONAS*/ … /*/ZONAS*/ de app.js
(los datos de OSM quedan en tools/zonas_osm.json; borrarlo para volver a bajarlos)."""
import json, math, os, subprocess, sys, time, re
from concurrent.futures import ThreadPoolExecutor
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
CACHE = os.path.join(ROOT, "tools", "zonas_osm.json")

# id, nombre, región de estación (centro, noa, nea, cuyo, pat), ciudades (lat, lon): la primera centra el mapa
ZONAS = [
    ("caba", "Ciudad de Buenos Aires", "centro", [(-34.6037, -58.3816)]),
    ("gba", "Gran Buenos Aires y La Plata", "centro", [(-34.7600, -58.4000), (-34.6500, -58.6200), (-34.4700, -58.5300), (-34.7200, -58.2500), (-34.9214, -57.9545)]),
    ("costa", "Mar del Plata y la Costa", "centro", [(-38.0055, -57.5426), (-38.5545, -58.7396), (-37.1100, -56.8600)]),
    ("bsas", "Interior de Buenos Aires", "centro", [(-38.7183, -62.2663), (-37.3217, -59.1332), (-34.5939, -60.9464), (-36.8927, -60.3225), (-33.8900, -60.5700)]),
    ("cba", "Córdoba", "centro", [(-31.4201, -64.1888), (-33.1232, -64.3493), (-32.4075, -63.2402)]),
    ("sfe", "Santa Fe y Rosario", "centro", [(-32.9442, -60.6505), (-31.6333, -60.7000), (-31.2526, -61.4867)]),
    ("er", "Entre Ríos", "centro", [(-31.7319, -60.5238), (-31.3929, -58.0209), (-33.0078, -58.5172)]),
    ("lp", "La Pampa", "centro", [(-36.6203, -64.2906), (-35.6566, -63.7568)]),
    ("mza", "Mendoza", "cuyo", [(-32.8895, -68.8458), (-34.6177, -68.3301)]),
    ("sj", "San Juan", "cuyo", [(-31.5375, -68.5364)]),
    ("sl", "San Luis", "cuyo", [(-33.3017, -66.3378), (-33.6757, -65.4578)]),
    ("tuc", "Tucumán", "noa", [(-26.8083, -65.2176)]),
    ("sal", "Salta", "noa", [(-24.7821, -65.4232)]),
    ("juj", "Jujuy", "noa", [(-24.1858, -65.2995)]),
    ("sde", "Santiago del Estero", "noa", [(-27.7834, -64.2642)]),
    ("cat", "Catamarca", "noa", [(-28.4696, -65.7795)]),
    ("lr", "La Rioja", "noa", [(-29.4131, -66.8558)]),
    ("cha", "Chaco", "nea", [(-27.4512, -58.9866)]),
    ("ctes", "Corrientes", "nea", [(-27.4692, -58.8306)]),
    ("mis", "Misiones", "nea", [(-27.3671, -55.8961), (-27.4870, -55.1199)]),
    ("for", "Formosa", "nea", [(-26.1849, -58.1731)]),
    ("nqn", "Neuquén", "pat", [(-38.9516, -68.0591)]),
    ("rn", "Río Negro", "pat", [(-41.1335, -71.3103), (-39.0333, -67.5833), (-40.8135, -62.9967)]),
    ("chu", "Chubut", "pat", [(-45.8641, -67.4966), (-43.2490, -65.3051), (-42.7692, -65.0385)]),
    ("sc", "Santa Cruz", "pat", [(-51.6230, -69.2168), (-46.4393, -67.5281)]),
    ("tdf", "Tierra del Fuego", "pat", [(-54.8019, -68.3030), (-53.7877, -67.7095)]),
]
# código de provincia del INDEC (lo usa Georef, el normalizador de direcciones del Estado, para buscar calles y alturas)
PID = {"caba": "02", "gba": "06", "costa": "06", "bsas": "06", "cba": "14", "sfe": "82", "er": "30", "lp": "42", "mza": "50", "sj": "70", "sl": "74", "tuc": "90", "sal": "66",
       "juj": "38", "sde": "86", "cat": "10", "lr": "46", "cha": "22", "ctes": "18", "mis": "54", "for": "34", "nqn": "58", "rn": "62", "chu": "26", "sc": "78", "tdf": "94"}
NAC = ["Carrefour", "Día", "Coto", "Jumbo", "Disco", "Vea", "ChangoMás"]
REG = ["Toledo", "Cordiez"]
OSM_RX = {"Carrefour": "Carrefour", "Día": "^(Supermercado(s)? )?D[ií]a( |$|%)", "Coto": "^Coto", "Jumbo": "^Jumbo", "Disco": "^Disco", "Vea": "^(Super ?)?Vea( |$)",
          "ChangoMás": "Chango ?M[aá]s|Walmart", "Toledo": "^(Supermercado(s)? )?Toledo", "Cordiez": "Cordiez"}
PICKUP = {"Carrefour": "www.carrefour.com.ar", "Día": "diaonline.supermercadosdia.com.ar", "ChangoMás": "www.masonline.com.ar", "Toledo": "www.toledodigital.com.ar", "Cordiez": "www.cordiez.com.ar"}
KM, MIN = 60, 2

def km(a, b):
    r = math.pi / 180; h = math.sin((b[0] - a[0]) * r / 2) ** 2 + math.cos(a[0] * r) * math.cos(b[0] * r) * math.sin((b[1] - a[1]) * r / 2) ** 2
    return 12742 * math.asin(math.sqrt(h))

def osm():
    pts = json.load(open(CACHE, encoding="utf-8")) if os.path.exists(CACHE) else {}
    for ch, rx in OSM_RX.items():
        if pts.get(ch): continue
        q = f'[out:json][timeout:180];area["ISO3166-1"="AR"][admin_level=2]->.a;nwr["shop"~"supermarket|convenience|department_store|wholesale|mall"]["name"~"{rx}",i](area.a);out center;'
        for _ in range(5):
            r = subprocess.run(["curl", "-s", "-m", "200", "-A", "Menuario/1.0 (jaemeson-ra.github.io)", "--data-urlencode", f"data={q}", "https://overpass-api.de/api/interpreter"], capture_output=True, text=True, encoding="utf-8")
            try: els = json.loads(r.stdout)["elements"]; break
            except Exception: time.sleep(30)
        else: sys.exit(f"Overpass no respondió para {ch}")
        pts[ch] = [[e.get("lat") or e["center"]["lat"], e.get("lon") or e["center"]["lon"]] for e in els]
        print("OSM", ch, len(pts[ch])); json.dump(pts, open(CACHE, "w", encoding="utf-8")); time.sleep(5)
    return pts

def pickup(job):
    zid, (lat, lon), ch = job
    r = subprocess.run(["curl", "-s", "-m", "20", "-A", "Mozilla/5.0", f"https://{PICKUP[ch]}/api/checkout/pub/pickup-points?geoCoordinates={lon};{lat}"], capture_output=True, text=True, encoding="utf-8", errors="replace")
    try: return zid, ch, sum(1 for x in json.loads(r.stdout).get("items", []) if (x.get("distance") or 0) <= KM)
    except Exception: return zid, ch, 0

pts = osm()
pk = {}
with ThreadPoolExecutor(8) as ex:
    for zid, ch, n in ex.map(pickup, [(z[0], c, ch) for z in ZONAS for c in z[3] for ch in PICKUP]): pk[(zid, ch)] = max(pk.get((zid, ch), 0), n)
out = {}
for zid, name, reg, cities in ZONAS:
    has = []
    for ch in NAC + REG:
        n_osm = sum(1 for p in pts.get(ch, []) if any(km(c, p) <= KM for c in cities))
        if max(n_osm, pk.get((zid, ch), 0)) >= MIN: has.append(ch)
    out[zid] = has; print(f"{name:32} {', '.join(has)}")

js = "/*ZONAS*/\n  const ZONAS = " + json.dumps([[z[0], z[1], z[2], round(z[3][0][0], 4), round(z[3][0][1], 4), PID[z[0]]] for z in ZONAS], ensure_ascii=False) + ";\n  const ZCH = " + json.dumps(out, ensure_ascii=False) + ";\n  /*/ZONAS*/"
p = os.path.join(ROOT, "app.js"); s = open(p, encoding="utf-8").read()
if "/*ZONAS*/" in s:
    s = re.sub(r"/\*ZONAS\*/.*?/\*/ZONAS\*/", lambda m: js, s, flags=re.S); open(p, "w", encoding="utf-8").write(s); print("app.js actualizado")
else: print("app.js todavía no tiene el bloque /*ZONAS*/")
