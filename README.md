# Plan de comidas · Buenos Aires

Sitio estático (HTML + CSS + JS, sin build ni dependencias) con un plan de comidas de 5 semanas para Buenos Aires, 30 recetas con foto y video, lista de compras, comparativa de supermercados con envío a domicilio (ARS / USD / EUR), productos de estación, análisis nutricional y un espacio con cuenta para armar el propio calendario, crear recetas y cargar ingredientes (escaneando el código de barras).

**Sitio:** https://jaemeson-ra.github.io/plan-comidas-bsas/

## Páginas

| Página | Qué hace |
|---|---|
| `index.html` | Portada: menú del día (pizarrón), entradas a cada sección, cómo se usa |
| `plan.html` | Calendario mensual (27 oct → 30 nov 2026); tocar un plato abre la receta (en escritorio, además, vista previa al pasar por encima); vista por semana |
| `recetas.html` | 30 recetas en 5 categorías, para 2–4 porciones, con nutrición calculada por ingrediente |
| `compras.html` | Lista de compras semanal por góndola, con tildes, «Copiar lista» y «Compartir» |
| `supermercados.html` | 7 cadenas comparadas: condiciones de envío, ranking del changuito, tabla por producto |
| `temporada.html` | Frutas y verduras de estación en Argentina, mes por mes, y platos que las usan |
| `nutricion.html` | Perfil (sexo, edad, altura, peso, actividad) → aportes recomendados, promedio diario de la semana o el mes, nota /10, comentarios y sugerencias |
| `mi-plan.html` | Cuenta (correo + contraseña, con captcha local): calendario propio, **Mis recetas**, **Mis ingredientes** (Open Food Facts + escáner), lista de compras propia |

Todo lo que un usuario crea (recetas e ingredientes) queda disponible para toda la comunidad y se puede usar en cualquier calendario.

## Estructura

| Archivo / carpeta | Qué es |
|---|---|
| `_head.html`, `_foot.html`, `tools/pages/*.body.html` | piezas de cada página; `tools/build_pages.py` las ensambla en los `.html` |
| `style.css`, `motion.css` | estilos («la libreta del almacén») y movimiento / móvil |
| `app.js` | lógica compartida: moneda, calendario, recetas, compras, supermercados, estación, sugerencias |
| `cuenta.js` | módulo con Firebase: cuentas, calendario personal, recetas e ingredientes de la comunidad, escáner, nutrición |
| `config.js` | configuración pública: correo admin, URL del Apps Script, claves públicas de Firebase |
| `data.js` | datos generados por `tools/build.py`: plan, recetas (con nutrición), listas, supermercados, estación, base de ingredientes |
| `icons.svg` | sprite de íconos generado por `tools/build_icons.py` (Tabler + íconos propios), inlineado en cada página |
| `img/`, `fonts/` | fotos (Wikimedia Commons, licencia en cada receta) y fuentes woff2 (Young Serif para títulos, Outfit para texto) |
| `docs/firebase-rules.json` | reglas de la Realtime Database (incluye las del proyecto Camino del Corazón, que comparte el proyecto) |
| `docs/apps-script.gs` | script de Google que reenvía por correo todo lo que pasa en el sitio |

## Pasos manuales pendientes (una sola vez, ~10 minutos)

El código de cuentas, recetas, ingredientes y avisos por correo ya está. Para que funcione hay que activar tres cosas desde las consolas (no se pueden hacer desde el código):

1. **Firebase Authentication** — https://console.firebase.google.com → proyecto `viaje-del-amor` → Authentication → *Sign-in method* → habilitar **Correo electrónico/contraseña**. Después en *Settings → Authorized domains* agregar `jaemeson-ra.github.io`.
2. **Reglas de la base de datos** — Realtime Database → *Rules* → pegar el contenido de `docs/firebase-rules.json` → *Publicar*. (Mantienen las reglas actuales del juego Camino del Corazón y agregan `calendars`, `recetas` e `ingredientes`.)
3. **Avisos por correo** — https://script.google.com con la cuenta jaemeson.dieu@gmail.com → nuevo proyecto → pegar `docs/apps-script.gs` → *Implementar → Aplicación web* (ejecutar como yo, acceso: cualquier persona) → copiar la URL `/exec` en `config.js` → `notifyUrl` → commit y push. A partir de ahí llegan por correo: sugerencias de platos, cuentas nuevas, calendarios guardados, recetas e ingredientes creados. Mientras `notifyUrl` esté vacío, las sugerencias se mandan con `mailto:`.

Opcional, recomendado si el sitio se abre al público: **Firebase App Check** con reCAPTCHA v3 (Firebase → App Check → registrar la app web) para que el servidor rechace registros automatizados. El captcha local del formulario frena bots simples pero no reemplaza esa capa.

## Actualizar precios o el plan

```bash
cd tools
python basket2.py      # ~3 min: consulta Jumbo, Disco, Vea, Carrefour, Día, ChangoMás y Coto
python build.py        # regenera ../data.js (plan, recetas, nutrición, listas, estación)
python build_icons.py  # solo si se agregan íconos
python build_pages.py  # regenera los .html
```

Para otro mes: cambiar `start` en `build.py` (y las rotaciones `LUNCH`, `DINNER`, `SAT`, `SUN` si se quiere). Las cotizaciones del dólar y el euro se leen en vivo desde dolarapi.com al abrir la página.

## Nutrición: cómo se calcula

- Cada ingrediente de la base (`ING_DB` en `build.py`, exportado como `DATA.ingredientes`) tiene valores por 100 g: kcal, proteínas, carbohidratos, azúcares, grasas, saturadas, fibra y sal (tablas SARA / USDA, redondeadas) y, cuando se mide por unidad, el peso de una unidad.
- La nutrición de cada receta se calcula sumando sus ingredientes en gramos y dividiendo por las porciones. Si a una receta le falta algún dato, se usa una estimación y se indica «estimado».
- Los ingredientes que cargan los usuarios (a mano, buscando en Open Food Facts o escaneando el código de barras) tienen la misma estructura y entran al cálculo de las recetas de la comunidad.
- Recomendaciones: energía con Mifflin-St Jeor × factor de actividad; proteínas 0,8–1,6 g/kg (objetivo 1 g/kg); fibra 25 g (mujeres) / 30 g (varones); sal < 5 g; azúcares < 10 % de la energía; grasas 25–35 %, saturadas < 10 %; carbohidratos 45–60 %. La nota sobre 10 descuenta puntos por cada desvío y la variedad.
