# Arte actual del juego, para rediseñar

Todo el arte de *Inspector Lógica* se dibuja hoy **por código**: no hay imágenes en el juego. Esta carpeta lo exporta a PNG para que se pueda
rediseñar con otra herramienta. Se exportó del juego en ejecución (2026-11-26), así que es exactamente lo que se ve al jugar.

**Regla para el rediseño:** cada imagen nueva tiene que tener el **mismo tamaño en píxeles** y el **mismo encuadre** que la original
(fondo transparente, el objeto en la misma posición dentro del recuadro). Así encaja en el juego sin tocar los mapas ni las colisiones.

## Qué hay en cada carpeta

| Carpeta | Qué es | Notas |
|---|---|---|
| `personaje/` | El inspector caminando por el mapa, su sombra en el suelo y la flecha de hacia dónde mira | Ver «El inspector en el mapa» |
| `retratos/` | El retrato del inspector en la caja de diálogo: seis expresiones de 360×480 | `capas/` trae cada capa por separado y `lamina_seis_expresiones.png`, las seis juntas |
| `baldosas/` | Tira de 5 baldosas de 64×64 (suelo A, suelo B, muro con tapa, solo tapa, solo ladrillo) | El suelo y los muros de todas las habitaciones |
| `muebles/` | Los muebles grandes, vistos en 3/4 | Ver «Cómo se dibuja un mueble» |
| `objetos/` | Lo que se examina o se recoge: pistas, puertas, fuelle, platos, etc. | Vistos desde arriba en 3/4, como los muebles |
| `revelables/` | Lo que **solo se ve con la linterna**: marcas, polvo, hilos, pisadas, camino limpio | Dibujos sobre el suelo, semitransparentes; tienen que verse bien dentro del haz de luz y no tapar el suelo |
| `ambiente/` | Ventanas, cortinas, la sombra que «camina» en la pared, velas, llama, ollas, la solapa de la caja, motas de polvo y brillo | Las motas (`polvo`, `brillo`) son partículas: conviene dejarlas simples |
| `tecnicas/` | Halos de luz y la viñeta oscura de la caja de diálogo | **No hace falta rediseñarlas**: son efectos de luz |
| `referencia/` | Capturas del juego: cada habitación a oscuras (como se juega), iluminada entera (para ver todo el arte junto) y con la caja de diálogo y el retrato | Para dar contexto a la otra IA |
| `*/x4/` | Las mismas imágenes ampliadas 4 veces, sin suavizado | Solo para verlas mejor; el tamaño que vale es el original |
| `lista.json` | Cada imagen con su clave, tamaño y la habitación donde aparece por primera vez | |

## Tamaños

### Personaje
| Imagen | Tamaño | Uso |
|---|---|---|
| `inspector` | 36×58 | El inspector en el mapa. Se apoya por **el centro de abajo** (los pies). Lo que choca con paredes es solo una base de 26×18 a sus pies |
| `sombra` | 34×14 | Óvalo bajo los pies |
| `flecha` | 16×16 | Indicador en el suelo de hacia dónde apunta la linterna |
| `sombra_nivel5_referencia` | 36×58 | La «sombra» del nivel 5. Hoy es el mismo dibujo del inspector teñido casi negro; se puede diseñar una figura propia del mismo tamaño |

### Retratos (caja de diálogo)
360×480 cada uno, fondo transparente, de medio cuerpo: `neutral`, `pensativo`, `sonrisa_ironica`, `sorprendido`, `serio`, `satisfecho`.
Capas, de abajo hacia arriba: cuerpo, cabeza, ojos y cejas, boca, sombrero. El cuerpo, la cabeza y el sombrero son iguales en las seis.

### Baldosas
`tilesProvisional`: 320×64, cinco baldosas de 64×64 en fila.

### Muebles (ancho × alto de la imagen, habitación)
| Imagen | Tamaño | Hab. | | Imagen | Tamaño | Hab. |
|---|---|---|---|---|---|---|
| armario | 128×214 | 1 | | caja-puerta | 96×128 | 3 |
| banco | 128×76 | 1 | | cajas | 128×160 | 3 |
| consola | 192×92 | 1 | | caballito | 96×144 | 4 |
| pila-de-cajas | 128×144 | 1 | | caja-juguetes | 128×134 | 4 |
| alacena | 128×214 | 2 | | munecas | 192×98 | 4 |
| chimenea | 160×148 | 2 | | oso | 96×126 | 4 |
| estufa | 128×120 | 2 | | tren | 96×76 | 4 |
| fregadero | 160×104 | 2 | | cortina | 112×150 | 5 |
| mesa | 160×96 | 2 | | sofa | 192×132 | 5 |
| vitrina | 96×150 | 2 | | velas | 64×72 | 5 |
| barril | 64×124 | 3 | | archivador | 96×140 | 6 |
| | | | | archivos | 128×130 | 6 |
| | | | | escritorio | 192×122 | 6 |
| | | | | reloj | 96×198 | 6 |

### Objetos
| Imagen | Tamaño | Hab. | | Imagen | Tamaño | Hab. |
|---|---|---|---|---|---|---|
| huella-bota | 48×40 | 1 | | puerta-candado | 96×108 | 3 |
| pilas | 48×36 | 1 | | tapiada | 96×108 | 3 |
| recorte | 48×30 | 1 | | bobina | 44×44 | 4 |
| fuelle | 80×64 | 2 | | diario | 52×38 | 4 |
| platos | 56×30 | 2 | | trampilla | 96×108 | 4 |
| recibo | 48×30 | 2 | | abrigo | 48×44 | 5 |
| sarten | 70×30 | 2 | | cuadro | 64×64 | 5 |
| taza | 36×26 | 2 | | puerta-atrancada | 56×128 | 5 |
| carta | 44×34 | 3 | | puerta-despacho | 96×108 | 5 |
| herramientas | 64×42 | 3 | | puerta-jardin | 64×128 | 5 |
| llave | 40×34 | 3 | | cartas | 52×40 | 6 |
| llavero | 56×62 | 3 | | cuentas | 48×40 | 6 |
| | | | | pluma | 48×34 | 6 |

### Revelables (solo con la linterna)
arrastre 190×60 (1) · polvo 96×44 (1) · mancha 150×52 (2) · camino 600×56 (3) · intacto 240×90 (3) · tablas-vista 200×90 (3) ·
hilo-caballito, hilo-caja, hilo-munecas, hilo-oso 80×18 (4) · pisadas 420×60 (5) · marcas 220×70 (6).

### Ambiente
ventana y ventana-rota 64×76 · cortina y cortina-rota 30×108 · sombra-caminante 44×110 · solapa 56×18 · olla 34×40 · vela 8×22 ·
llama 16×28 · polvo 8×8 · brillo 64×64.

## Cómo se dibuja un mueble

Vista **cenital 3/4**: se ve la **tapa** arriba y la **cara de frente** abajo. La imagen mide *ancho × (alto + profundo)*: el ancho y el
profundo son la huella en el suelo (lo que choca) y el alto es la cara frontal. El rediseño tiene que respetar esa división: si la tapa o la
cara cambian de tamaño, el inspector chocaría con algo que no se ve. Mira `referencia/nivelN_jugando_iluminado.png` para ver cómo encaja cada
mueble en su habitación.

## El inspector en el mapa

Hoy es **una sola imagen** de 36×58 que «rebota» un poco al caminar; no tiene animación ni dibujos por dirección. Si el rediseño trae más
(caminar en 8 direcciones, quieto, examinar), hay que adaptar el código para usarlos (ver abajo).

**Ojo, no coincide con el retrato:** en el mapa el inspector lleva abrigo azul y bombín; en el retrato, gabardina marrón y fedora con cinta
roja. Conviene que el rediseño los unifique.

## Estilo para pedirle a la otra IA

> Juego de investigación 2.5D, vista cenital 3/4 (se ve la parte de arriba y el frente de los objetos), en una mansión abandonada de noche
> con tormenta. Tono de misterio, inspirado en la estética de las novelas visuales de misterio, pero original. Imágenes PNG con fondo
> transparente, **del mismo tamaño en píxeles que la original** y con el objeto en la misma posición. Paleta oscura y cálida (madera, piedra,
> luz de linterna), legible sobre fondo oscuro. El inspector es un detective con sombrero y abrigo.

## Cómo vuelve al juego

- **Retratos: ya funciona.** Pon `neutral.png`, `pensativo.png`, `sonrisa_ironica.png`, `sorprendido.png`, `serio.png` y `satisfecho.png`
  (360×480) en `assets/retratos/inspector/` y corre `node herramientas/listar_retratos.mjs`. No hay que tocar código. Detalles en
  `assets/retratos/inspector/README.md`.
- **Todo lo demás (personaje, muebles, objetos, baldosas, revelables, ambiente): también funciona.** Pon el PNG en `assets/sprites/` con
  el nombre de la clave (por ejemplo `mueble-armario.png`, `item-taza.png`, `inspector.png`), del **mismo tamaño** que el original, y corre
  `node herramientas/listar_sprites.mjs`. Lo que no tenga archivo se sigue dibujando por código. Agrega su tamaño a `TAMANOS` en
  `pruebas/sprites.test.mjs` (la prueba avisa si falta).
- **Herramientas:** `herramientas/convertir_a_sprite.py` pasa una imagen ampliada con fondo blanco (como la que genera otra IA) al tamaño
  exacto con fondo transparente; `herramientas/cortar_hoja_de_retratos.py` corta una hoja de 3×2 expresiones en los seis retratos.
- **Ya instalados:** el inspector del mapa nuevo (`assets/sprites/inspector.png`, con los colores del retrato) y los seis retratos nuevos.
