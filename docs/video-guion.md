# Video de presentación · guion de voz por segmentos

Grabá **un archivo por segmento**, con el nombre indicado, en la carpeta `media/voz/` (formatos: `.m4a`, `.mp3` o `.wav`). Así el montaje pone cada frase sobre su escena sin cortar nada, y alarga la escena si tu frase dura un poco más.

Tono: cercano, rioplatense, ritmo ágil pero sin apuro. Mismo micrófono y misma distancia (20–30 cm) en todos; dejá medio segundo de silencio al principio y al final de cada archivo. Si una toma sale mal, regrabá solo ese archivo.

| Archivo | Escena | Texto a grabar | Duración ideal |
|---|---|---|---|
| `voz_01` | Portada | **¡Bienvenido a tu plan alimentario personalizado! Acá vas a encontrar recetas fáciles, tu lista de compras, los precios de los supermercados y mucho más.** | 7–8 s |
| `voz_02` | Inicio del sitio | **Un mes entero de desayunos, almuerzos y cenas, pensado para vos, con productos de acá.** | 5 s |
| `voz_03` | Calendario | **En el calendario tocás un plato y se abre la receta.** | 3 s |
| `voz_04` | Receta | **Cada receta tiene foto, video, ingredientes y el costo por porción.** | 4 s |
| `voz_05` | Lista de compras | **La lista de compras se arma sola, por góndola. La copiás y la pegás en las notas del teléfono.** | 5 s |
| `voz_06` | Supermercados | **Comparamos siete supermercados con envío a domicilio, en pesos, dólares o euros.** | 5 s |
| `voz_07` | Tarjeta «Con tu cuenta» | **Y con tu cuenta, todo es tuyo.** | 2 s |
| `voz_08` | Tus recetas | **Creá tus propias recetas: la nutrición se calcula sola.** | 3 s |
| `voz_09` | Ingredientes / escáner | **Sumá ingredientes escaneando el código de barras del paquete.** | 3 s |
| `voz_10` | Ranking | **Marcá los días que cumpliste, sumá combos y subí en el ranking con tus amigos.** | 4 s |
| `voz_11` | Nutrición | **La nutrición te dice cuántas calorías, proteínas, fibra y sal lleva tu semana, con una nota sobre diez.** | 5 s |
| `voz_12` | Productos de estación | **Todo con productos de estación, de acá.** | 2–3 s |
| `voz_13` | Cierre | **Entrá y armá tu semana. Es gratis.** | 3 s |

Total hablado: ~125 palabras, unos 50 segundos de video final (la duración exacta se ajusta a tu voz).

## Cómo se arma el video

1. `tools/video/capturas.py` toma las capturas (escritorio y móvil) y compone los cuadros con texto; `tools/video/montar.py` monta las dos versiones: `media/intro.mp4` (16:9, escritorio) y `media/intro-vertical.mp4` (9:16, móvil), con música de fondo suave.
2. Con los 13 audios en `media/voz/`:

```bash
python tools/video/montar.py --voces media/voz
```

   Cada frase cae al inicio de su escena, la música baja mientras hablás (ducking) y la escena dura lo que dure tu frase (con un mínimo). Después, commit y push: la portada muestra el video horizontal en la compu y el vertical en el teléfono.

Si preferís grabar todo de corrido en un solo archivo, también sirve: `python tools/video/montar.py --voz media/voz.m4a` (en ese caso las escenas no se ajustan a la voz, así que conviene respetar las duraciones de la tabla).

La música es un loop instrumental generado por `tools/video/musica.py` (sin derechos de terceros); si preferís otra, poné un `.mp3` en `media/musica.mp3`.
