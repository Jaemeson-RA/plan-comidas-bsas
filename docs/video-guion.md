# Video de presentación · guion de voz (39 segundos)

Tono: cercano, rioplatense, ritmo ágil pero sin apuro. Grabá en un lugar silencioso, a 20–30 cm del micrófono, en una sola toma por bloque si hace falta. Dejá medio segundo de silencio al principio y al final. Formato: `.m4a`, `.mp3` o `.wav`, y guardalo como `media/voz.m4a` (o `.mp3`).

| Tiempo | Pantalla | Texto a grabar |
|---|---|---|
| 0:00–0:04 | Portada con el pizarrón del menú del día | **Plan de comidas Buenos Aires: qué comemos hoy, qué compramos y dónde.** |
| 0:04–0:10 | Calendario del mes, se abre la receta de un plato | **Un mes entero de desayunos, almuerzos y cenas. Tocás un plato y tenés la receta, con foto y video.** |
| 0:10–0:15 | Lista de compras con tildes, botón «Copiar lista» | **La lista de compras se arma sola, por góndola. La copiás y la pegás en las notas del teléfono.** |
| 0:15–0:20 | Ranking de supermercados, precios en ARS/USD/EUR | **Comparamos siete supermercados con envío a domicilio, en pesos, dólares o euros.** |
| 0:20–0:26 | Mi plan: calendario propio, editor de recetas, escáner de código de barras | **Con tu cuenta armás tu propio calendario, creás recetas y sumás ingredientes escaneando el paquete. Lo que creás queda para todos.** |
| 0:26–0:29 | Ranking: días cumplidos, combos, ladder | **Marcá los días que cumpliste, sumá combos y subí en el ranking con tus amigos.** |
| 0:29–0:35 | Nutrición: nota sobre 10, barras de proteínas, fibra, sal | **Y la nutrición te dice cuántas calorías, proteínas, fibra y sal lleva tu semana, con una nota sobre diez y qué cambiar.** |
| 0:35–0:39 | Productos de estación → cierre con el logo | **Todo con productos de estación, de acá. Entrá y armá tu semana.** |

Total hablado: ~110 palabras, cómodas en 39 segundos.

## Cómo se arma el video

1. Las capturas de pantalla y las tarjetas de título se generan con `tools/video/capturas.py` (Playwright) y el montaje con `tools/video/montar.py` (ffmpeg: Ken Burns, fundidos, música de fondo a bajo volumen). El resultado sin voz es `media/intro.mp4`.
2. Cuando tengas la voz grabada en `media/voz.m4a`, corré:

```bash
python tools/video/montar.py --voz media/voz.m4a
```

   El script baja la música cuando entra la voz (ducking) y regenera `media/intro.mp4`. Después, commit y push: la portada lo muestra en la sección «Preguntas frecuentes».

La música es un loop instrumental generado por el propio script (sin derechos de terceros); si preferís otra, poné un `.mp3` en `media/musica.mp3` y el script la usa.
