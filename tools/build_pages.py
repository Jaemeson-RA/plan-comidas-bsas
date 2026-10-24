# Ensambla las páginas HTML: _head.html + tools/pages/<p>.body.html + _foot.html
import os, sys
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
root = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
head = open(os.path.join(root, "icons.svg"), encoding="utf-8").read() + "\n" + open(os.path.join(root, "_head.html"), encoding="utf-8").read()
FAVICON = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Ccircle cx='12' cy='12' r='12' fill='%232F8F5B'/%3E%3Cg fill='none' stroke='%23FFF9EE' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M5.5 10.5h13'/%3E%3Cpath d='M6.5 10.5v4.5a3 3 0 0 0 3 3h5a3 3 0 0 0 3-3v-4.5'/%3E%3Cpath d='M12 7.5v3M10.2 7.5h3.6'/%3E%3Cpath d='M9.8 5c0-1 .9-1 .9-2M13.3 5c0-1 .9-1 .9-2'/%3E%3C/g%3E%3C/svg%3E"
foot = open(os.path.join(root, "_foot.html"), encoding="utf-8").read()
META = {
 "index": ("Plan de comidas · Buenos Aires", "Plan de comidas de 5 semanas para Buenos Aires: recetas fáciles, lista de compras y comparativa de supermercados con envío a domicilio."),
 "plan": ("Calendario · Plan de comidas Buenos Aires", "Qué se come cada día, en un calendario del 27 de octubre al 30 de noviembre de 2026."),
 "recetas": ("Recetas · Plan de comidas Buenos Aires", "30 recetas fáciles para una persona, con foto, video, ingredientes, nutrición y costo por porción."),
 "compras": ("Lista de compras · Plan de comidas Buenos Aires", "Lista de compras semanal armada por góndola a partir de las recetas del plan."),
 "supermercados": ("Supermercados · Plan de comidas Buenos Aires", "Comparativa de 7 supermercados de Buenos Aires con envío a domicilio: condiciones y precios en ARS, USD y EUR."),
 "temporada": ("Productos de estación · Plan de comidas Buenos Aires", "Frutas y verduras de estación en Argentina, mes por mes, y los platos del plan que las aprovechan."),
 "nutricion": ("Nutrición · Plan de comidas Buenos Aires", "Calorías, proteínas, fibra y sal de tu calendario por semana y por mes, con aportes recomendados y nota sobre 10."),
 "mi-plan": ("Mi plan · Plan de comidas Buenos Aires", "Creá tu cuenta y armá tu propio calendario de comidas eligiendo las recetas que quieras."),
}
for page, (title, desc) in META.items():
    body = open(os.path.join(root, "tools", "pages", f"{page}.body.html"), encoding="utf-8").read()
    html = (
        "<!DOCTYPE html>\n<html lang=\"es-AR\">\n<head>\n<meta charset=\"UTF-8\">\n"
        "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n"
        f"<title>{title}</title>\n<meta name=\"description\" content=\"{desc}\">\n"
        f"<link rel=\"icon\" href=\"{FAVICON}\">\n"
        "<link rel=\"stylesheet\" href=\"style.css\">\n<link rel=\"stylesheet\" href=\"motion.css\">\n<link rel=\"stylesheet\" href=\"gami.css\">\n</head>\n<body>\n" + head + "\n" + body + "\n" + foot)
    if page not in ("mi-plan", "nutricion"):
        html = html.replace('<script type="module" src="cuenta.js" data-only="miplan nutricion"></script>\n', "")
    open(os.path.join(root, f"{page}.html"), "w", encoding="utf-8").write(html)
    print("OK", page + ".html", len(html))
