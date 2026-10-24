# Plan de comidas · Buenos Aires

Sitio estático (HTML + CSS + JS, sin build ni dependencias en el navegador) con un plan de comidas continuo para Buenos Aires: 30 recetas con foto y video que rotan solas semana a semana, lista de compras, comparativa de supermercados con envío a domicilio (ARS / USD / EUR) y alertas de precio, productos de estación, análisis nutricional y un espacio con cuenta para armar el propio calendario, crear recetas, cargar ingredientes (escaneando el código de barras), competir con amigos y proponerles platos. Se instala como app en el teléfono y funciona sin conexión.

**Sitio:** https://jaemeson-ra.github.io/plan-comidas-bsas/

## Páginas

| Página | Qué hace |
|---|---|
| `index.html` | Portada: menú de hoy (pizarrón) y el almuerzo de mañana, entradas a cada sección, cómo se usa, preguntas frecuentes con video |
| `plan.html` | Plan continuo mes por mes (‹ › y «Hoy»); tocar un plato abre la receta (en escritorio, además, vista previa al pasar por encima); vista por semana. En el teléfono, la vista mes oculta los días de otros meses y arranca en hoy |
| `recetas.html` | 30 recetas en 5 categorías, para 1 persona (los platos de olla rinden 2 porciones), con nutrición calculada por ingrediente. Arriba, **«¿Qué hay en tu heladera?»**: cargás lo que tenés y muestra las recetas que más lo aprovechan, con lo que falta comprar |
| `compras.html` | Lista de compras de la semana pasada, esta y las tres que vienen, por góndola, con tildes, «Copiar lista», «Bajar con enlaces» y «Compartir» |
| `supermercados.html` | Buscador en vivo en 7 cadenas (3 resultados por cadena y «ver más»), **alertas de precio** con campanita, condiciones de envío, ranking del changuito, tabla por producto |
| `temporada.html` | Frutas y verduras de estación en Argentina, mes por mes, y platos que las usan |
| `nutricion.html` | Perfil (sexo, edad, altura, peso, actividad) → aportes recomendados, promedio diario de la semana o el mes, nota /10, comentarios y sugerencias |
| `mi-plan.html` | Cuenta (correo + contraseña, con captcha local): calendario propio, **Mis recetas**, **Mis ingredientes** (Open Food Facts + escáner), lista de compras propia, ranking, desafío semanal, amigos, perfil con insignias y recordatorio diario |

Todo lo que un usuario crea (recetas e ingredientes) queda disponible para toda la comunidad y se puede usar en cualquier calendario.

## Estructura

| Archivo / carpeta | Qué es |
|---|---|
| `_head.html`, `_foot.html`, `tools/pages/*.body.html` | piezas de cada página; `tools/build_pages.py` las ensambla en los `.html` (y regenera `sw.js`) |
| `style.css`, `motion.css`, `gami.css` | estilos («la libreta del almacén»), movimiento / móvil, gamificación |
| `app.js` | lógica compartida: plan continuo (`window.PLAN`), moneda, calendario, recetas, heladera, compras, supermercados, alertas, estación, sugerencias, PWA, recordatorio |
| `cuenta.js` | módulo con Firebase: cuentas, calendario personal, recetas e ingredientes de la comunidad, escáner, nutrición, XP, insignias, desafío, amigos, buzón de propuestas |
| `config.js` | configuración pública: correo admin, URL del Apps Script, URL del proxy de precios, claves públicas de Firebase |
| `data.js` | datos generados por `tools/build.py`: rotaciones del plan, recetas (con nutrición y fotos WebP), supermercados, estación, base de ingredientes |
| `manifest.webmanifest`, `sw.js`, `img/icons/` | app instalable (PWA); los genera `tools/build_pwa.py` |
| `icons.svg` | sprite de íconos generado por `tools/build_icons.py` (Tabler + íconos propios), inlineado en cada página |
| `img/`, `img/w/`, `img/medals/`, `fonts/` | fotos (Wikimedia Commons, licencia en cada receta) en JPG y WebP 480/900 px, medallas SVG, fuentes woff2 (Young Serif para títulos, Outfit para texto) |
| `docs/firebase-rules.json` | reglas de la Realtime Database (incluye las del proyecto Camino del Corazón, que comparte el proyecto) |
| `docs/apps-script.gs` | script de Google que reenvía por correo lo que pasa en el sitio (desde `localhost` no se manda nada) |

## Plan continuo

El plan ya no tiene fecha de fin. `data.js` trae las rotaciones (desayunos, almuerzos y cenas de lunes a viernes, sábado y domingo, meriendas) y una fecha de origen; el navegador calcula cualquier día con `window.PLAN.houseDay(fecha)`. Los ñoquis caen siempre el 29. La fecha de hoy se toma en hora local (antes se usaba UTC y desde las 21 h de Buenos Aires el sitio creía que ya era el día siguiente).

## App instalable y sin conexión

- Android / Chrome: botón «Instalar la app» en el menú «Más», en el pie y en Perfil. iPhone: el botón explica «Compartir → Agregar a inicio».
- El service worker pide primero a la red el HTML, el JS, el CSS y `data.js` (un deploy nunca queda viejo) y, sin conexión, sirve lo último guardado. Fotos, fuentes y medallas van primero a la caché. Sin conexión funcionan el plan, las recetas (las fotos que ya se vieron), las listas y la estación; Mi plan necesita conexión.
- **Recordatorio diario** (Perfil): baja un `.ics` con un evento diario y alarma a la hora elegida, que suena aunque el sitio esté cerrado. Opcional: aviso dentro del sitio si lo abrís después de esa hora sin haber marcado el día. Las notificaciones push con el sitio cerrado necesitarían un servidor (Firebase Cloud Messaging + Functions, plan Blaze); no están.

## Gamificación (Mi plan)

- **XP y niveles**: día cumplido 50 XP (75 con racha ≥ 3, 100 con racha ≥ 7), **desafío de la semana** (5 días de lunes a domingo) +100, semana perfecta (7 de 7) +200 más, receta creada 80, ingrediente 40, vaso de agua 10 (3 por día) y +20 al completar el día. Pasar al nivel siguiente cuesta cada vez más: 100 XP para el nivel 2, luego 170, 260, 370, 500, 650… (100 + 60·(k−1) + 10·(k−1)² por paso). Al subir de nivel aparece una animación con sonido (desactivable en Perfil) y se gana una **ficha**: permite marcar un **día libre** que no suma puntos pero no corta la racha.
- **Barra de XP**: marco de metal con muescas, brillo que la recorre y, al ganar XP, vibra y suelta chispas en la punta (se desactiva con `prefers-reduced-motion`).
- **Insignias**: rachas (3/7/15/30/60), días cumplidos, semanas perfectas, recetas e ingredientes creados, hidratación (1 día, 7 y 30 seguidos), amigos, niveles. Cada una es una medalla colgante (`img/medals/*.svg`, generadas por `tools/build_medals.py` con la paleta del sitio) con palier bronce · plata · oro · platino · diamante; las bloqueadas se ven en gris con candado. Se comparten como imagen **historia 9:16** o **post 1:1**.
- **Resumen semanal** (Perfil): días cumplidos, XP ganada, vasos de agua y puesto en la ladder, comparados con la semana pasada. La XP se recalcula con fecha de corte.
- **Desafío de la semana** (Ranking): tu progreso y el de tus amigos hacia los 5 días.
- **Amigos**: se agregan por correo (se compara un hash SHA-256, el correo no se publica). La ladder tiene filtro «Mis amigos». **Proponer un plato**: elegís receta, día y comida; a tu amigo le aparece en su calendario para aceptar (se agrega solo) o rechazar, y vos ves la respuesta. Las reglas solo dejan escribir en el buzón de alguien que tenés como amigo.
- **Personas de ejemplo en la ladder**: 14 porteños con barrio (Flor de Palermo, Nico de Caballito…). No son cuentas ni datos en Firebase: `demoLadder()` en `cuenta.js` los calcula en el navegador, día por día desde su fecha de inicio, con las mismas reglas de puntos y XP, así la tabla avanza sola. No se pueden agregar como amigos. `config.js` → `demoLadder: false` los saca.
- Todo se calcula en el cliente a partir de `calendars/{uid}` (done, libre, agua, friends) y se publica un resumen en `public/{uid}` (incluido el progreso de la semana) y `ladder/{uid}`.

## Precios: buscador en vivo, lista con enlaces y alertas

- **Bajar con enlaces** (Compras y Mi plan) genera un `.html` con cada ingrediente enlazado al producto más barato del changuito (o a la búsqueda en la cadena más barata).
- **Buscar y comparar** (Supermercados) consulta en vivo las siete cadenas a través de un Cloudflare Worker (`tools/worker/`), porque los sitios de los súper no aceptan llamadas directas desde el navegador. URL en `config.js` → `priceApi`. Para redeployar:

```bash
cd tools/worker
npx wrangler deploy
```

- **Alertas de precio**: la campanita de cada resultado guarda el producto en este dispositivo. Al abrir Supermercados (como mucho cada 6 horas, o con «Revisar ahora») se vuelve a consultar y, si bajó más de 3 %, se marca en verde y aparece un aviso (y una notificación si la app está instalada y diste permiso). También avisa si otra cadena lo tiene más barato.

## Pasos manuales

Ya hechos: Authentication con correo/contraseña, dominio autorizado, Apps Script desplegado, Worker de precios desplegado.

**Pendiente (1 minuto): republicar las reglas.** Firebase → proyecto `viaje-del-amor` → Realtime Database → *Rules* → pegar el contenido de `docs/firebase-rules.json` → *Publicar*. Agrega `inbox` (el buzón de «Proponer un plato»); sin esto las propuestas no se pueden enviar.

**reCAPTCHA v2 al crear cuenta** (casilla «No soy un robot», verificada en el servidor por el Worker `POST /verify`). Mientras `recaptchaSiteKey` esté vacío, se usa la suma de control local.

1. https://www.google.com/recaptcha/admin/create → tipo **reCAPTCHA v2 · «No soy un robot»**, dominios `jaemeson-ra.github.io` y `localhost`.
2. La **clave del sitio** (pública) va en `config.js` → `recaptchaSiteKey`.
3. La **clave secreta** va solo en el Worker, nunca en el repositorio:

```bash
cd tools/worker
npx wrangler secret put RECAPTCHA_SECRET
```

Opcional, recomendado si el sitio se abre al público: **Firebase App Check** con reCAPTCHA v3 (Firebase → App Check → registrar la app web) para que el servidor rechace registros automatizados. El captcha local del formulario frena bots simples pero no reemplaza esa capa.

## Regenerar

```bash
cd tools
python basket2.py      # ~3 min: precios de Jumbo, Disco, Vea, Carrefour, Día, ChangoMás y Coto
python build_webp.py   # solo si cambian las fotos: WebP 480 y 900 px
python build.py        # regenera ../data.js (rotaciones, recetas, nutrición, estación)
python build_icons.py  # solo si se agregan íconos
python build_medals.py # solo si cambian las insignias
python build_pwa.py    # íconos de la app + manifest + sw.js (build_pages lo llama sin íconos)
python build_pages.py  # regenera los .html y la versión del service worker
```

Para cambiar el plan, editar las rotaciones `BREAK`, `LUNCH`, `DINNER`, `SAT`, `SUN` y `MERIENDA` en `build.py`. Las cotizaciones del dólar y el euro se leen en vivo desde dolarapi.com al abrir la página.

## Nutrición: cómo se calcula

- Cada ingrediente de la base (`ING_DB` en `build.py`, exportado como `DATA.ingredientes`) tiene valores por 100 g: kcal, proteínas, carbohidratos, azúcares, grasas, saturadas, fibra y sal (tablas SARA / USDA, redondeadas) y, cuando se mide por unidad, el peso de una unidad.
- La nutrición de cada receta se calcula sumando sus ingredientes en gramos y dividiendo por las porciones. Si a una receta le falta algún dato, se usa una estimación y se indica «estimado».
- Los ingredientes que cargan los usuarios (a mano, buscando en Open Food Facts o escaneando el código de barras) tienen la misma estructura y entran al cálculo de las recetas de la comunidad.
- Recomendaciones: energía con Mifflin-St Jeor × factor de actividad; proteínas 0,8–1,6 g/kg (objetivo 1 g/kg); fibra 25 g (mujeres) / 30 g (varones); sal < 5 g; azúcares < 10 % de la energía; grasas 25–35 %, saturadas < 10 %; carbohidratos 45–60 %. La nota sobre 10 descuenta puntos por cada desvío y la variedad.
