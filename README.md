# Plan de comidas · Buenos Aires

Sitio estático (HTML + CSS + JS, sin dependencias) con un plan de comidas de 5 semanas para Buenos Aires (27 oct → 30 nov 2026), 18 recetas con foto y video, lista de compras semanal y una comparativa de supermercados con envío a domicilio en ARS, USD y EUR.

**Sitio:** https://jaemeson-ra.github.io/plan-comidas-bsas/

## Estructura

| Archivo | Qué es |
|---|---|
| `index.html`, `plan.html`, `recetas.html`, `compras.html`, `supermercados.html` | las cinco páginas (generadas con `tools/build_pages.py` a partir de `_head.html`, `_foot.html` y `tools/pages/*.body.html`) |
| `style.css`, `app.js` | estilos y lógica compartidos (calendario con popover, recetas por categoría, lista de compras, comparativa) |
| `data.js` | datos generados: plan, recetas, listas, supermercados, cotizaciones de respaldo |
| `img/` | fotos de las recetas (Wikimedia Commons, licencias CC indicadas en cada receta) |
| `fonts/` | DM Sans y Playfair Display en woff2 (sin llamadas a Google Fonts) |
| `tools/build.py` | genera `data.js` a partir de las recetas, `media.json` y `basket_final.json` |
| `tools/basket2.py` | consulta los catálogos online de 7 cadenas y arma el changuito comparativo |
| `tools/media.json`, `tools/basket_final.json` | datos crudos de fotos/videos y de precios |

## Actualizar precios

```bash
cd tools
python basket2.py      # ~3 min, consulta Jumbo, Disco, Vea, Carrefour, Día, ChangoMás y Coto
python build.py        # regenera ../data.js
```

Las cotizaciones del dólar y el euro se cargan en vivo desde [dolarapi.com](https://dolarapi.com/) al abrir la página; `data.js` guarda valores de respaldo.
