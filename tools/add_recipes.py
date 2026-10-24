# -*- coding: utf-8 -*-
"""Suma recetas nuevas desde un JSON (formato de new_recipes.json): baja la foto de Wikimedia Commons,
la agrega a media.json con su licencia y autor, y escribe ingredientes, nutrición, video y receta en build.py.

    python add_recipes.py ruta/a/new_recipes.json
Después: python build_webp.py && python build.py && python build_pages.py
"""
import io, json, os, re, subprocess, sys, time
from PIL import Image
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.normpath(os.path.join(HERE, ".."))
SRC = sys.argv[1]
recs = json.load(open(SRC, encoding="utf-8"))
BATCH_JSON = {r["id"] for r in recs if r.get("batch")}
UA = "MenuarioBot/1.0 (https://jaemeson-ra.github.io/plan-comidas-bsas/; recetas con fotos de Wikimedia Commons)"
BATCH = {"garbanzosespinaca", "guisofideos", "pollodisco", "hamblentejas"} | BATCH_JSON  # platos de olla: 2 porciones (hoy + vianda o freezer)

# 1) fotos (máximo 1600 px de ancho: el sitio usa WebP de 480 y 900)
for r in recs:
    out = os.path.join(ROOT, "img", f"{r['id']}.jpg")
    if os.path.exists(out): continue
    url = r["img"]["url"]
    tmp = out + ".part"
    for intento in range(6):  # curl usa los certificados del sistema (en Windows, los de Windows)
        res = subprocess.run(["curl", "-sSfL", "--max-time", "90", "-A", UA, "-o", tmp, url], capture_output=True, text=True)
        if res.returncode == 0 and os.path.getsize(tmp) > 5000: break
        print("  reintento", r["id"], res.stderr.strip()[:120]); time.sleep(8 * (intento + 1))
    else:
        raise SystemExit(f"no se pudo bajar la foto de {r['id']}")
    im = Image.open(tmp).convert("RGB")
    if im.width > 1600: im = im.resize((1600, round(im.height * 1600 / im.width)), Image.LANCZOS)
    im.save(out, "JPEG", quality=84, optimize=True); os.remove(tmp)
    r["img"]["w"], r["img"]["h"] = im.width, im.height
    print("foto", r["id"], im.size); time.sleep(2)

# 2) media.json
mp = os.path.join(HERE, "media.json"); media = json.load(open(mp, encoding="utf-8"))
for r in recs:
    i = r["img"]
    media[r["id"]] = {"title": r["name"], "img": {"file": f"img/{r['id']}.jpg", "title": i["title"], "page": i["page"], "license": i["license"], "artist": i["artist"],
                      "q": r["name"], "w": i.get("w") or i.get("width"), "h": i.get("h") or i.get("height")},
                      "yt": [{"id": r["yt"], "title": r.get("yt_title", ""), "channel": r.get("yt_channel", "")}]}
json.dump(media, open(mp, "w", encoding="utf-8"), ensure_ascii=False, indent=1); print("media.json", len(media))

# 3) build.py
bp = os.path.join(HERE, "build.py"); s = io.open(bp, encoding="utf-8").read()
J = lambda v: json.dumps(v, ensure_ascii=False)
def add_dict_entries(s, name, entries):
    m = re.search(r"\n" + name + r" = \{", s); assert m, name
    end = s.index("}\n", m.end())  # cierre del diccionario
    new = "".join(f',\n "{k}":{v}' for k, v in entries if f'"{k}":' not in s[m.start():end])
    return s[:end] + new + s[end:]
s = add_dict_entries(s, "YT", [(r["id"], J(r["yt"])) for r in recs])
s = add_dict_entries(s, "NUT", [(r["id"], "(" + ",".join(str(round(x, 1)) for x in r["nut"]) + ")") for r in recs])
s = add_dict_entries(s, "OLD_PORC", [(r["id"], "2") for r in recs if r["id"] in BATCH])
s = add_dict_entries(s, "PORCIONES", [(r["id"], "2") for r in recs if r["id"] in BATCH])
# ingredientes nuevos
have = set(re.findall(r'ING\("([^"]+)"', s))
ings = {}
for r in recs:
    for n in r.get("new_ingredients", []):
        if n["n"] not in have and n["n"] not in ings: ings[n["n"]] = n
if ings:
    lines = "".join(f' ING({J(n["n"])},{J(n["cat"])},{n["kcal"]},{n["prot"]},{n["carb"]},{n["sug"]},{n["fat"]},{n["sat"]},{n["fib"]},{n["sal"]}' + (f',u={n["u"]}' if n.get("u") else "") + "),\n" for n in ings.values())
    i = s.index("ING_DB = [\n") + len("ING_DB = [\n"); s = s[:i] + lines + s[i:]
# recetas
block = "\n# ---------- RECETAS NUEVAS (tools/add_recipes.py) ----------\n"
for r in recs:
    if f'rec("{r["id"]}"' in s: continue
    tipo = "desayuno" if r["tipo"] == "desayuno" else "plato"
    ing = "[" + ",".join(f'I({J(i["n"])},{i["q"]},{J(i["u"])},{J(i["c"])})' for i in r["ing"]) + "]"
    block += f'rec({J(r["id"])},{J(r["name"])},{J(tipo)},{r["tiempo"]},{r["kcal"]},{r["cost"]},{J(r["tags"])},\n {ing},\n {J(r["pasos"])},\n {J(r["tip"])})\n'
anchor = "\nBREAK = ["
assert anchor in s; s = s.replace(anchor, block + anchor, 1)
io.open(bp, "w", encoding="utf-8").write(s); print("build.py: +", len(recs), "recetas,", len(ings), "ingredientes")
