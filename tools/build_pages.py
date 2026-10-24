# Ensambla las páginas HTML: _head.html + tools/pages/<p>.body.html + _foot.html
import os, sys
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
root = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
head = open(os.path.join(root, "_head.html"), encoding="utf-8").read()
foot = open(os.path.join(root, "_foot.html"), encoding="utf-8").read()
META = {
 "index": ("Plan de comidas · Buenos Aires", "Plan de comidas de 5 semanas para Buenos Aires: recetas fáciles, lista de compras y comparativa de supermercados con envío a domicilio."),
 "plan": ("Calendario · Plan de comidas Buenos Aires", "Qué se come cada día, en un calendario del 27 de octubre al 30 de noviembre de 2026."),
 "recetas": ("Recetas · Plan de comidas Buenos Aires", "18 recetas fáciles para 2 porciones con foto, video, ingredientes y costo por porción."),
 "compras": ("Lista de compras · Plan de comidas Buenos Aires", "Lista de compras semanal armada por góndola a partir de las recetas del plan."),
 "supermercados": ("Supermercados · Plan de comidas Buenos Aires", "Comparativa de 7 supermercados de Buenos Aires con envío a domicilio: condiciones y precios en ARS, USD y EUR."),
}
for page, (title, desc) in META.items():
    body = open(os.path.join(root, "tools", "pages", f"{page}.body.html"), encoding="utf-8").read()
    html = (
        "<!DOCTYPE html>\n<html lang=\"es-AR\">\n<head>\n<meta charset=\"UTF-8\">\n"
        "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n"
        f"<title>{title}</title>\n<meta name=\"description\" content=\"{desc}\">\n"
        "<link rel=\"icon\" href=\"data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🥘</text></svg>\">\n"
        "<link rel=\"stylesheet\" href=\"style.css\">\n<link rel=\"stylesheet\" href=\"motion.css\">\n</head>\n<body>\n" + head + "\n" + body + "\n" + foot)
    open(os.path.join(root, f"{page}.html"), "w", encoding="utf-8").write(html)
    print("OK", page + ".html", len(html))
