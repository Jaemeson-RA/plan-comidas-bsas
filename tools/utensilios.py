# -*- coding: utf-8 -*-
"""Utensilios de cada receta: se deducen de los pasos, los ingredientes y las etiquetas; UT_FIX corrige a mano.
build.py lo importa y guarda la lista en DATA.recipes[id].ut (nombre + ícono)."""
import unicodedata, re

def _n(s):
    return "".join(c for c in unicodedata.normalize("NFD", str(s).lower()) if unicodedata.category(c) != "Mn")

# (clave, nombre que se muestra, ícono del sprite, palabras que lo delatan)
RULES = [
    ("horno", "Horno", "flame", [r"\bhorno\b", r"hornear", r"gratinar"]),
    ("fuente", "Fuente para horno", "plate", [r"\bfuente\b"]),
    ("placa", "Placa o asadera", "plate", [r"\bplaca\b", r"asadera"]),
    ("molde", "Molde o tartera", "plate", [r"\bmolde\b", r"tartera"]),
    ("sarten", "Sartén", "pot", [r"sarten", r"saltear", r"rehogar", r"vuelta y vuelta"]),
    ("wok", "Wok o sartén grande", "pot", [r"\bwok\b"]),
    ("plancha", "Plancha o sartén de hierro", "pot", [r"plancha", r"\bgrill\b", r"parrilla"]),
    ("olla", "Olla", "pot", [r"\bolla\b", r"hervir", r"\bhervor\b", r"cocinar la pasta", r"agua con sal"]),
    ("cacerola", "Cacerola con tapa", "pot", [r"cacerola", r"\btapar\b", r"\btapado\b"]),
    ("tostadora", "Tostadora (o sartén)", "flame", [r"tostar", r"tostadora"]),
    ("licuadora", "Licuadora o mixer", "bolt", [r"licua", r"mixer", r"minipimer", r"procesa", r"triturar"]),
    ("rallador", "Rallador", "tag", [r"\brallar\b", r"rallad[oa] (la|el|las|los)", r"rallador"]),
    ("bowl", "Bowl", "plate", [r"\bbowl\b", r"\bbol\b", r"mezclar en", r"\bbatir\b", r"\bbatid"]),
    ("batidor", "Batidor o tenedor", "tag", [r"\bbatir\b", r"\bbatid"]),
    ("colador", "Colador", "tag", [r"colar", r"escurrir", r"colador"]),
    ("pisapapas", "Pisapapas o tenedor", "tag", [r"\bpisar\b", r"\bpure\b", r"pisapapas"]),
    ("palo", "Palo de amasar", "tag", [r"amasar", r"estirar", r"palo de amasar"]),
    ("papel", "Papel manteca o aluminio", "tag", [r"papel manteca", r"aluminio", r"papillote"]),
    ("mate", "Mate, bombilla y pava", "droplet", [r"\bmate\b", r"yerba"]),
    ("cafetera", "Cafetera o filtro", "droplet", [r"\bcafe\b"]),
    ("espumadera", "Espumadera", "tag", [r"espumadera", r"\bfreir\b"]),
    ("tabla", "Tabla y cuchillo", "tag", [r"\bcortar\b", r"\bpicar\b", r"\bpicad", r"rodajas", r"\bcubos\b", r"\btiras\b", r"bastones", r"en pluma", r"\bfeteado\b", r"juliana"]),
]
ORDER = [r[0] for r in RULES]
# correcciones a mano (añadir con +, quitar con -)
UT_FIX = {
    "yogur": {"-": ["tabla"], "+": ["bowl"]},
    "tostadas": {"+": ["tostadora", "tabla"], "-": ["sarten"]},
    "arrozpollo": {"+": ["cacerola", "tabla"], "-": ["sarten", "olla"]},
    "salmon": {"+": ["placa", "papel"], "-": ["fuente"]},
    "empanadas": {"+": ["placa", "sarten"]},
    "tarta": {"+": ["molde"]},
    "noquis": {"+": ["olla", "pisapapas", "colador"]},
    "carbonara": {"+": ["olla", "sarten", "colador", "bowl"]},
    "pollohorno": {"+": ["fuente"]},
    "pastel": {"+": ["fuente", "olla", "pisapapas", "sarten"]},
    "milanesas": {"+": ["placa"]},
    "hamburguesas": {"+": ["bowl", "rallador"]},
    "albondigas": {"+": ["bowl", "olla"]},
    "panqueques": {"+": ["bowl", "batidor", "sarten"]},
    "omelette": {"+": ["bowl", "batidor", "sarten"]},
    "revueltos": {"+": ["bowl", "batidor", "sarten"]},
    "wrap": {"+": ["sarten"]},
    "garbanzos": {"+": ["colador", "bowl"]},
    "atun": {"+": ["bowl"]},
    "zapallitos": {"+": ["fuente", "sarten"]},
    "berenjenas": {"+": ["fuente"]},
    "sopa": {"+": ["olla", "licuadora"]},
    "lentejas": {"+": ["olla"]},
    "curry": {"+": ["olla"]},
    "tortilla": {"+": ["sarten", "bowl"]},
    "gramajo": {"+": ["sarten", "placa"]},
    "bife": {"+": ["plancha", "olla", "pisapapas"]},
    "pescadohorno": {"+": ["fuente"]},
}
NAME = {k: (t, i) for k, t, i, _ in RULES}

def utensilios(rid, rec):
    text = _n(" ".join(rec.get("pasos", [])) + " " + " ".join(i["n"] for i in rec.get("ing", [])))  # sin el tip: suele hablar de otras recetas
    got = {k for k, _, _, pats in RULES if any(re.search(p, text) for p in pats)}
    fix = UT_FIX.get(rid, {})
    got |= set(fix.get("+", [])); got -= set(fix.get("-", []))
    if "wok" in got: got.discard("sarten")
    if "plancha" in got and "sarten" in got and rid in ("bife",): got.discard("sarten")
    if "cafetera" in got and "mate" in got: pass
    # ícono propio de cada utensilio en el sprite (tools/build_icons.py); el mate reusa el de la merienda
    return [{"k": k, "n": NAME[k][0], "ic": "merienda" if k == "mate" else "u-" + k} for k in ORDER if k in got]

if __name__ == "__main__":
    import json, sys, os
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    root = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
    src = open(os.path.join(root, "data.js"), encoding="utf-8").read()
    data = json.loads(src[src.index("{"): src.rindex("}") + 1])
    for rid, r in data["recipes"].items():
        print(rid.ljust(13), ", ".join(u["n"] for u in utensilios(rid, r)))
