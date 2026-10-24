# Menuario · plan de comidas en Buenos Aires

Sitio estático (HTML + CSS + JS, sin build ni dependencias en el navegador) con un plan de comidas continuo para Buenos Aires: 30 recetas con foto y video que rotan solas semana a semana, lista de compras, comparativa de supermercados con envío a domicilio (ARS / USD / EUR) y alertas de precio, productos de estación, análisis nutricional y un espacio con cuenta para armar el propio calendario, crear recetas, cargar ingredientes (escaneando el código de barras), competir con amigos y proponerles platos. Se instala como app en el teléfono y funciona sin conexión.

**Sitio:** https://jaemeson-ra.github.io/plan-comidas-bsas/

## Páginas

| Página | Qué hace |
|---|---|
| `404.html` | Página no encontrada con el menú de hoy y accesos a cada sección |
| `index.html` | Portada: menú de hoy (pizarrón) y el almuerzo de mañana, entradas a cada sección, cómo se usa, preguntas frecuentes con video |
| `plan.html` | Plan continuo mes por mes (‹ › y «Hoy»); tocar un plato abre la receta (en escritorio, además, vista previa al pasar por encima); vista por semana. En el teléfono, la vista mes oculta los días de otros meses y arranca en hoy |
| `recetas.html` | 54 recetas en 6 categorías (también veganas, vegetarianas y sin TACC), para 1 persona (los platos de olla rinden 2 porciones), con nutrición calculada por ingrediente, **utensilios** en íconos chicos, porciones ajustables (½ a 4), **modo cocina** paso a paso a pantalla completa (temporizadores por paso, pantalla siempre encendida, se pasa con el dedo) e impresión. Búsqueda por nombre o ingrediente y filtros (hasta 20 min, vegetarianas, al horno, económicas, proteicas, livianas, sin cocción). Arriba, **«¿Qué hay en tu heladera?»**: cargás lo que tenés y muestra las recetas que más lo aprovechan, con lo que falta comprar |
| `compras.html` | Lista de compras de la semana pasada, esta y las tres que vienen, por góndola, con tildes, «Copiar lista», «Bajar con enlaces» y «Compartir». Arriba, **«¿Dónde conviene comprarla?»**: la lista (o la de Mi plan) en las 7 cadenas, todo en un súper o repartido en 2 o 3, con el ahorro y el recorrido por súper |
| `compras.html` (detalle) | Arriba, **Lista de: Plan de la casa / Mi calendario** (aparece con la cuenta abierta: `cuenta.js` deja en `miListas` la lista de cada semana del calendario propio, con porciones y colación). **Tu heladera**: lo que tenés (el copo ❄ de cada producto o la tarjeta) sale de la cuenta, del comparador y del texto copiado, y se ve tachado con el copo. Es la misma heladera (`localStorage.heladera`) que «¿Qué hay en tu heladera?» de Recetas |
| `promos.html` | **Promos de hoy** de las 7 cadenas (se renuevan cada 3 h): primero las de tu lista de la semana, después búsqueda, filtro por cadena y rubro, orden por descuento o precio |
| `supermercados.html` | Buscador en vivo en 7 cadenas (3 resultados por cadena y «ver más»), **alertas de precio** con campanita, **mapa de sucursales** (ubicación o dirección, radio, filtro por cadena, cómo llegar a pie), condiciones de envío, ranking del changuito, tabla por producto |
| `temporada.html` | Frutas y verduras de estación en Argentina, mes por mes, y platos que las usan |
| `app.html` | Descarga de la app de Android (APK), cómo agregarla en iPhone y QR para abrirla desde la compu |
| `nutricion.html` | Perfil (sexo, edad, altura, peso, actividad) → aportes recomendados, promedio diario de la semana o el mes, nota /10, comentarios y sugerencias. **«Tu mes a medida»**: con el perfil cargado arma un calendario del mes que cumple los aportes y se guarda en Mi plan |
| `mi-plan.html` | Cuenta (correo + contraseña, con reCAPTCHA v2 verificado por el Worker): calendario propio, **Progreso** (semana por semana), **Mis recetas**, **Mis ingredientes** (Open Food Facts + escáner), lista de compras propia, ranking, desafío semanal, amigos, perfil con insignias y recordatorio diario |

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
- **Recordatorios por notificación** (menú «Más», Compras y Perfil): hacer las compras (días y hora), qué se come hoy y marcar el día. Llegan con el sitio o la app cerrados. Ver «Recordatorios» más abajo. Sigue estando el `.ics` del Perfil para quien prefiera el calendario del teléfono.

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
python add_recipes.py nuevas.json  # suma recetas (foto de Commons, licencia, video, ingredientes, nutrición) a build.py y media.json
python build.py        # regenera ../data.js (rotaciones, recetas, nutrición, estación)
python build_icons.py  # solo si se agregan íconos
python build_medals.py # solo si cambian las insignias
python build_pwa.py    # íconos de la app + manifest + sw.js (build_pages lo llama sin íconos)
python build_og.py     # solo si cambia la imagen para compartir
python build_pages.py  # regenera los .html, sitemap, robots y la versión del service worker
```

Para cambiar el plan, editar las rotaciones `BREAK`, `LUNCH`, `DINNER`, `SAT`, `SUN` y `MERIENDA` en `build.py`. Las cotizaciones del dólar y el euro se leen en vivo desde dolarapi.com al abrir la página.

## Nutrición: cómo se calcula

- Cada ingrediente de la base (`ING_DB` en `build.py`, exportado como `DATA.ingredientes`) tiene valores por 100 g: kcal, proteínas, carbohidratos, azúcares, grasas, saturadas, fibra y sal (tablas SARA / USDA, redondeadas) y, cuando se mide por unidad, el peso de una unidad.
- La nutrición de cada receta se calcula sumando sus ingredientes en gramos y dividiendo por las porciones. Si a una receta le falta algún dato, se usa una estimación y se indica «estimado».
- Los ingredientes que cargan los usuarios (a mano, buscando en Open Food Facts o escaneando el código de barras) tienen la misma estructura y entran al cálculo de las recetas de la comunidad.
- Recomendaciones: energía con Mifflin-St Jeor × factor de actividad; proteínas 0,8–1,6 g/kg (objetivo 1 g/kg); fibra 25 g (mujeres) / 30 g (varones); sal < 5 g; azúcares < 10 % de la energía; grasas 25–35 %, saturadas < 10 %; carbohidratos 45–60 %. La nota sobre 10 descuenta puntos por cada desvío y la variedad.

## Cocina, mes a medida y progreso

- **Utensilios**: `tools/utensilios.py` los deduce de los pasos y los ingredientes de cada receta (reglas por expresión regular, más una tabla de correcciones a mano) y `build.py` los guarda en `r.ut`. Cada uno es un ícono `u-*` del sprite (Tabler, Lucide o dibujado a mano) con su nombre debajo.
- **Modo cocina** (botón en la receta): un paso por pantalla, temporizador cuando el paso dice minutos (suena y vibra), Wake Lock para que no se apague la pantalla, gesto de deslizar y teclas ← →.
- **Tu mes a medida** (Nutrición, en `cuenta.js`): para cada día prueba todas las combinaciones desayuno × almuerzo × cena y elige la que más se acerca a los aportes; un factor de porción entre 0,75 y 1,8 ajusta la energía y, si hace falta mucho más, suma una colación baja en sal (fruta + yogur + frutos secos). Variedad: nada repetido en 3 días y cada receta 5 veces como máximo en el mes; los ñoquis caen el 29. Se guarda en el calendario con `{desayuno, almuerzo, cena, x, colacion}`, y la lista de compras y los totales multiplican por la porción.
- **Progreso** (Mi plan): semana por semana desde que se creó la cuenta, días cumplidos, kcal y macros promedio contra el objetivo, y gastos por supermercado. Los gastos se cargan a mano o desde «Ya compré acá» del comparador, y se guardan en `calendars/{uid}/gastos`.

## Control visual

`python tools/qa_visual.py` abre cada página con Playwright (Edge) en 320, 375, 414, 768, 1024, 1280 y 1440 px, entra a Mi plan con una cuenta de prueba, abre modales y estados, y busca desbordes horizontales, elementos fuera de pantalla, superposiciones, áreas táctiles chicas, letra de menos de 11 px, imágenes rotas y errores de consola. Deja capturas y `_report.json` en `media/qa/` (fuera del repo); `python tools/qa_report.py` resume los hallazgos. Cada página trae Open Graph, Twitter Card y canonical; `build_pages.py` genera también `sitemap.xml` y `robots.txt`, y `tools/build_og.py` la imagen `img/og.jpg`.

## App de Android (`descargas/menuario.apk`)

- **Instalación recomendada: desde Chrome.** «Instalar la app» en Android usa primero la instalación del navegador (`beforeinstallprompt`): Chrome arma una WebAPK firmada por Google, sin avisos de «fuente desconocida», y la actualiza sola. Si el navegador no la ofrece, el panel explica el menú ⋮ → «Instalar app» y deja el APK como respaldo («Bajar el APK»).
- **Actualizaciones.** El contenido (recetas, precios, pantallas) se actualiza solo en todos los casos porque la app muestra el sitio publicado; si una página estaba abierta cuando llega una versión nueva del service worker, aparece la barra «Hay una versión nueva» para recargar, y al volver a la app se busca una versión nueva. Para quien instaló el **APK**: cada APK abre el sitio con `?v=<versión>` y el inicio compara con `descargas/version.json`; si hay uno más nuevo aparece «Actualización disponible» (baja el APK, que se instala encima sin perder nada; «Más tarde» vuelve a preguntar en 3 días). Publicar uno nuevo: `python tools/build_android.py --version --notas="Qué trae"` y subir `descargas/`.

- Es una Trusted Web Activity hecha con [Bubblewrap](https://github.com/GoogleChromeLabs/bubblewrap): abre el sitio a pantalla completa con Chrome, con ícono, pantalla de inicio y accesos directos. Paquete `ar.menuario.app`, Android 7 o más.
- Se baja desde `app.html`. Hay un solo botón, «Instalar la app» (menú «Más», pie, Perfil y la página): baja el APK al instante y abre un panel con los pasos; en iPhone el panel explica cómo agregarla al inicio y en la compu muestra el QR (y la instalación del navegador si la ofrece). Las capturas del teléfono de la página salen de `tools/build_app_shots.py` (`img/app/*.webp`, 720 × 1480, el formato exacto del marco). Dentro de la app el botón no aparece. En iPhone se agrega desde Safari con «Agregar a inicio».
- La pantalla completa sin barra de direcciones depende de `https://jaemeson-ra.github.io/.well-known/assetlinks.json`, publicado desde el repositorio `jaemeson-ra.github.io` con la huella de la clave de firma.
- El proyecto de Android y la clave (`android.keystore` + `keystore.env`) están FUERA de este repositorio, en `../plan-comidas-android`. Sin esa clave no se puede publicar una actualización que se instale encima de la anterior: guardar una copia.
- Para recompilar: `python tools/build_android.py --version` (sube la versión, compila, firma y copia el APK a `descargas/`). Los cambios del sitio no necesitan una app nueva: la app siempre muestra el sitio publicado.
- `docs/play-store.md` y `tools/build_store.py` quedan listos por si algún día se publica en Google Play.

## Modo app (`html.is-app`)

- Dentro de la app (TWA de Android, PWA instalada, `?app=1` o la misma pestaña después de entrar así) un script en el `<head>` marca `html.is-app` antes de pintar, y el sitio se ve como una app: no hay cabecera, pie, textos de presentación, preguntas ni video.
- Barra propia arriba (título de la pantalla, Recordatorios y Mi plan; flecha de volver fuera de las pestañas) y pestañas abajo: **Hoy · Plan · Recetas · Compras · Más**.
- **Hoy**: menú del día compacto (cada comida abre su receta), mañana, accesos rápidos (lista, marcar el día, avisos), la semana para deslizar y todas las funciones por categoría (Cocinar, Comprar, Vos).
- **Más**: las mismas categorías, recordatorios, moneda y sugerir un plato.
- Lo que solo va en la web lleva `data-web`; lo que solo va en la app, `data-app`. Ojo: la clase es `is-app` porque `.app` ya existe (tarjetas de las apps de delivery) y `.today` es el pizarrón de la web.

## Preferencias alimentarias y alergias (`DIET` en `app.js`)

- Se eligen en Nutrición, en Perfil, en Recetas («Elegí tus preferencias») o en «Más» de la app: cómo come (de todo, vegetariana, vegana, pescetariana), sin TACC, sin lactosa y alergias (huevo, lácteos, frutos secos, maní, soja, pescado, mariscos, sésamo). Se guardan en `localStorage.prefsComida` y, con cuenta, en `calendars/{uid}/profile/prefs`.
- Lo que lleva cada receta se **detecta en los nombres de los ingredientes** con reglas (`DIET.flags`): carne, pollo, pescado, mariscos, huevo, lácteos, gluten, frutos secos (no la nuez moscada), maní, soja, sésamo y miel (para veganos). Sirve igual para las recetas de la comunidad y las nuevas, sin etiquetarlas a mano.
- **Recetas** muestra solo las aptas (con «Ver todas», que las marca «⚠ Lleva…»); la receta no apta avisa qué lleva y propone alternativas parecidas que sí van. **Mi plan** pone las no aptas al final del selector; **Tu mes a medida** usa solo las aptas (si no alcanzan para variar, completa y avisa). En el plan de la casa y en Hoy, los platos no aptos llevan ⚠.

## Pasos (`pasos.html`, `tools/android_native/`)

- **Podómetro de la app de Android (desde la 1.0.5).** Código nativo propio que `build_android.py` vuelve a poner después de cada `bubblewrap update`: `StepStore` (pasos por día en SharedPreferences, a partir del contador `TYPE_STEP_COUNTER` que cuenta desde el reinicio), `StepReader` (una lectura), `StepWorker` (WorkManager cada ~15 min), `PasosActivity` (la abre el sitio con `intent://pasos?accion=activar|sync#Intent;scheme=menuario;package=ar.menuario.app;end`: pide el permiso de actividad física, lee y vuelve a `pasos.html?pasos=...`) y un agregado en `LauncherActivity.getLaunchingUrl()` que suma `?pasos=20261025:5234,...` (últimos 35 días) cada vez que se abre la app. Permiso `ACTIVITY_RECOGNITION`, dependencia `androidx.work:work-runtime`.
- **Sin la app** (web, iPhone, app instalada desde Chrome): se cargan a mano.
- **Objetivo**: según el perfil de Nutrición (actividad sedentaria 6.000 · ligera 8.000 · moderada 10.000 · alta 12.000; −1.000 desde los 50 años, −2.000 desde los 65), o personalizado. **Largo del paso**: 41,5 % (varones) o 41,3 % (mujeres) de la altura, o medido. Km = pasos × paso; kcal ≈ 0,57 × peso × km; minutos activos ≈ pasos / 105.
- **Gráficos** de 7 y 30 días con la línea del objetivo, promedio, mejor día, días con objetivo, racha, km y kcal.
- **XP** (con cuenta): +25 el día que se llega al objetivo y +5 cada 2.000 pasos (hasta +20). Se guarda en `calendars/{uid}/pasos/{día}` = `{s, g}` y entra en `myXP()`.

## Recordatorios (Web Push, `tools/worker/push.js`)

- El navegador se suscribe con la clave pública VAPID de `config.js` y manda la dirección de la suscripción y las preferencias a `POST /push/sub` del Worker. Se guardan en KV (`PROMOS`, claves `sub:<hash>`, todo en la metadata) y vencen a los 120 días si no se vuelve a abrir el sitio (cada visita las renueva una vez por día).
- Un cron del Worker corre cada 15 minutos (hora de Buenos Aires, UTC−3) y manda un push **vacío** a quien le toca: no hace falta cifrar contenido. Los horarios se eligen de media hora en media hora. El plan gratis de Workers deja ~45 envíos por cuarto de hora.
- El service worker arma el texto con lo que dejó la página en la caché `menuario-notif`: el menú de los próximos 14 días (el calendario propio si hay cuenta, si no el de la casa) y cuántos productos tiene la lista de esta semana y la siguiente. Tocar la notificación abre la lista, la receta del día (`index.html?rec=<id>`) o Mi plan. Un push sin recordatorio pendiente es la prueba del panel.
- Funciona en Chrome / Edge / Firefox (Android y compu), en la app de Android (TWA con `enableNotifications`, desde la versión 1.0.2) y en iPhone solo con Menuario agregada al inicio (iOS 16.4+).
- Rutas: `POST /push/sub`, `POST /push/unsub`, `POST /push/test`. La clave privada es el secreto `VAPID_JWK` del Worker (copia en `../plan-comidas-android/vapid-private.json`, fuera del repo).

## Peso, seguridad y navegación

- `build_pages.py` minifica con esbuild (`npx esbuild@0.28.2`): `app.min.js`, `ahorro.min.js`, `cuenta.min.js` y un solo `menuario.min.css` (style + motion + gami). Las páginas y el service worker usan las versiones minificadas; **se editan siempre los archivos fuente** y se vuelve a correr `build_pages.py`. `data.js` se escribe compacto.
- **Seguridad**: Content-Security-Policy en cada página (scripts solo del sitio, de Google/Firebase/reCAPTCHA y de cdnjs/jsDelivr, con hash para los dos scripts en línea; sin `object`, `base-uri` propio), `referrer` estricto, integridad SRI en Leaflet y ZXing, y en el Worker solo servicios de push conocidos.
- **Navegación**: reglas de especulación (`speculationrules`): Chrome y la app bajan la página de un enlace interno al apoyar el dedo, así se abre casi al instante. Fuentes principales precargadas, Firebase con `preconnect` + `modulepreload` y sin saltos de diseño en Promos ni en el video del inicio.

## Licencia y páginas legales

© 2026 Jaemeson Dieu, **todos los derechos reservados** (ver `LICENSE`). El repositorio es público porque GitHub Pages gratis lo exige, pero eso solo permite verlo: no autoriza a copiar ni reutilizar el código. Las fotos (Creative Commons, Wikimedia), los íconos (Tabler, MIT), las fuentes (SIL OFL) y los videos (YouTube) conservan sus licencias.

- `terminos.html`: términos de uso (no es consejo médico, precios orientativos, cuentas, contenido de usuarios, ranking con perfiles de ejemplo, propiedad intelectual, ley argentina).
- `privacidad.html`: política de privacidad según la Ley 25.326 (datos, qué es público, proveedores, transferencia internacional, derechos ARCO, leyenda de la AAIP).
- Al crear cuenta hay que aceptar ambos; se guarda `termsAt` y `termsVersion` en el perfil. Perfil → «Borrar mi cuenta» elimina calendario, perfil público, ranking, buzón, recetas e ingredientes propios y la cuenta.
- GitHub: rama `main` protegida (sin force-push ni borrado), secret scanning y push protection activados.

## Ahorro: comparador, promos y mapa (`ahorro.js`)

- **Comparador de la lista** (Compras, y desde Mi plan con «¿Dónde conviene comprarla?»): cada producto se busca en vivo con `/search` del Worker; la tabla `BUY` dice qué buscar para cada ingrediente y una lista de palabras descarta productos que no son (salsas, galletitas, cerdo, pastas…). El costo es por la cantidad que hace falta: envases enteros según la presentación leída del nombre, o precio por kilo para lo que se vende suelto; las unidades se pasan a gramos con el peso de `DATA.ingredientes`. Después prueba todas las combinaciones de 1, 2 y 3 cadenas y recomienda sumar un súper solo si ahorra al menos 8 % y $ 3.000. Opción «solo las cadenas que tengo cerca», tomada del mapa. Precios en caché 6 h en el dispositivo.
- **Promos** (`/promos` del Worker): rubros de almacén, desayuno, frescos, carnes, verduras, bebidas y limpieza de cada cadena. Carrefour, Día y ChangoMás: precio de lista contra precio actual (se descartan descuentos de más de 75 % o precios de lista absurdos) y promos tipo 2x1; Jumbo, Disco y Vea: las colecciones con nombre de promo («4x2 en Galletitas», «2do al 70%»), que se descuentan en la caja; Coto: los descuentos de góndola. Quedan afuera las de tarjetas y billeteras. Un cron del Worker las recorre cada 3 horas y las guarda en KV (`PROMOS`).
- **Mapa** (Supermercados): Leaflet con mosaicos de OpenStreetMap. Sucursales de Carrefour, Día y ChangoMás en vivo desde sus puntos de retiro (`/sucursales` del Worker); Coto, Jumbo, Disco y Vea, con Nominatim acotado a la zona. Si algún día se agrega un `sucursales.json` (extracto de OpenStreetMap), se usa primero. La dirección escrita se busca con Nominatim. La ubicación no se guarda en ningún servidor.

Rutas del Worker: `GET /search?q=`, `GET /promos`, `GET /sucursales?lat=&lon=`, `POST /verify`. Para redeployar: `cd tools/worker` y `npx wrangler deploy` (el KV y el cron están en `wrangler.toml`).
