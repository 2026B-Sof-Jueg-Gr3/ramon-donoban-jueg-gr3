# Silas Vane: El Misterio de la Mansión

Un juego de investigación en 2.5D para el navegador, hecho con Phaser 3: caminas con una linterna, descubres lo que la oscuridad esconde y
resuelves cada habitación con una deducción apoyada en pruebas.

**La historia:** la Mansión Flieder lleva años abandonada y dicen que sombras malditas mueven los objetos. El inspector Silas Vane entra bajo la
tormenta, habitación por habitación, a demostrar con pruebas físicas que la «magia» es solo una fachada.

Autor: **DonobanR**.

## Cómo jugar

- **Camina** por la habitación y **alumbra** con la linterna: muchas cosas solo existen para ti cuando la luz las toca.
- Cuando algo se puede usar (estás cerca, lo miras de frente y la luz lo toca) aparece el ícono **E**.
- Lo que descubres queda en la **libreta**. Cuando tienes lo necesario, resuelves el caso: eliges una conclusión y la respaldas con una o dos
  pruebas. Equivocarse no tiene castigo.
- Si pasas un rato sin descubrir nada, la habitación te da una pista **sin palabras**: fíjate en lo que cambia.

### Controles

| Acción | Teclas |
|---|---|
| Caminar | **W A S D** o las **flechas** |
| Apuntar la linterna | **ratón** (sin moverlo, la linterna apunta hacia donde caminas) |
| Usar algo / continuar un texto | **E** |
| Continuar un texto | **E**, **Espacio**, **Enter** o **clic** |
| Libreta | **Tab** o **I** |
| Pausa (continuar o salir al menú) | **Esc** |
| Silenciar o volver a encender la música | **M** |
| Menús y deducción | flechas o WASD para moverse, **E** o Enter para elegir, Esc para volver; también con el ratón |

Se juega con teclado y ratón, en una pantalla apaisada.

### En el celular

En una pantalla táctil aparecen controles al estilo de un emulador: un **joystick** a la izquierda para caminar (la linterna apunta
hacia donde caminas), el botón **E** y el de la **libreta** a la derecha, y **Música** y **Pausa** en las esquinas de arriba. Cada
control aprieta la misma tecla que el teclado (`src/presentacion/ControlesTactiles.js`). Mientras sale un texto solo queda **E**
(o tocar la pantalla). Se juega con el teléfono en horizontal; en vertical se pide girarlo.

## Las seis habitaciones

| # | Habitación | De qué va |
|---|---|---|
| 1 | El Pasillo Oscuro | **Observar:** marcas en el suelo, cajas fuera de sitio y unas cortinas que parecen «caminar» |
| 2 | El Fantasma de la Cocina | **Mecanismos:** golpes metálicos y velas que se apagan solas |
| 3 | La Puerta con Candado | **Seguir el rastro:** lo que el polvo cuenta bajo la linterna, y una puerta que abrir |
| 4 | El Cuarto de los Juguetes | **Experimentar:** juguetes que se mueven solos e hilos casi invisibles |
| 5 | La Sombra en la Ventana | **Persecución en tiempo real:** alguien quema papeles y quiere escapar |
| 6 | La Verdad Revelada | **Reconstruir:** el expediente de toda la mansión y la deducción final |

Cada habitación resuelta desbloquea la siguiente. El progreso y las pistas encontradas se guardan en el navegador (`localStorage`); lo
investigado a medias en una habitación no se guarda.

## Página de presentación

La página de presentación del juego (historia, cómo se juega, las seis habitaciones, personajes, galería y controles) está en su
propio repositorio: https://github.com/DonobanR/LandingPage-SilasVane

## Ejecutarlo

Necesitas un navegador moderno y conexión a internet (Phaser 3.80.1 se carga desde jsDelivr). No hay nada que instalar ni que compilar.

### En local

El juego usa módulos ES, así que necesita un servidor HTTP: abrir `index.html` directamente no funciona. Con Python 3:

```
python servidor.py
```

y abrir http://localhost:8787. Este servidor le dice al navegador que no guarde los archivos en caché, así cada recarga usa la versión actual.

### En GitHub Pages

Es un sitio estático: en el repositorio, **Settings → Pages**, elegir la rama que se quiere publicar y la carpeta raíz (`/`). El archivo
`.nojekyll` ya está. Lo que se publica es lo que esté **commiteado y subido** a esa rama.

## Pruebas

Con Node.js 22.7 o superior (probado con 24.19), sin paquetes:

```
node --test "pruebas/*.test.mjs"
```

Cubren la lógica del juego (`src/motor/`), los datos de las seis habitaciones (cada línea de la historia sale una vez, cada pregunta tiene una
sola respuesta, todo es alcanzable y usable en los mapas), el narrador y sus temporizadores, la maquetación de la interfaz y la presentación.
Para ello, `pruebas/relojPhaser380.mjs` reproduce el reloj de Phaser 3.80.1 y `pruebas/escenaSimulada.mjs`, una escena sin dibujar.

Herramientas para revisar en el navegador: **F3** (FPS y datos), **F4** (cuerpos de colisión), **F6** (revisor de maquetación) y
`?carga=extrema` en la dirección (llena las pantallas con el contenido más grande).

## Estructura

```
├── index.html            Página de entrada; carga Phaser desde CDN
├── servidor.py           Servidor local sin caché (puerto 8787)
├── assets/
│   ├── narrativa/        nivelN.json: todo el texto de la historia
│   ├── investigaciones/  nivelN.json: reglas de cada habitación (qué dispara cada línea, deducción, ayuda). Sin texto
│   ├── mapas/            nivelN.json: mapas de Tiled
│   ├── presentacion/     expresiones.json: la expresión del retrato en cada línea importante
│   ├── retratos/         el arte final del retrato (cuando exista)
│   ├── img/              imágenes de los menús
│   ├── tilesets/ · sprites/   reservadas para el arte final
├── src/
│   ├── main.js           Configura Phaser y registra las escenas
│   ├── motor/            Lógica del juego **sin Phaser**, probada con Node: investigación, deducción, libreta, ayuda, alcance,
│   │                     visibilidad, persecución, maquetación, luz…
│   ├── escenas/          Las pantallas de Phaser: carga, menús, interludio, la habitación y el informe
│   ├── presentacion/     Lo que se dibuja: linterna, inspector, caja de novela visual, retrato, arte provisional
│   │   └── habitaciones/ Lo propio de cada habitación (un módulo por habitación)
│   └── ui/               Narrador, textos, libreta de guardado, entradas y maquetación en pantalla
├── herramientas/         listar_retratos.mjs
├── pruebas/              Pruebas automáticas (`node --test`)
├── docs/                 Informes y capturas de cada fase; en docs/mapas/, los generadores de mapas (Python)
├── DISENO_V2.md          El diseño de esta versión
└── GUION_NARRATIVA.md    Borrador histórico del guion (ya no describe el juego)
```

El texto de la historia vive **solo** en `assets/narrativa/`; las reglas apuntan a sus líneas sin copiarlas.

## Arte

El arte de las habitaciones es **provisional y se genera por código** (`src/presentacion/ArteProvisional.js`, `ArteNueva.js`). El
**inspector** (en el mapa y en sus seis retratos) ya tiene arte final. Cualquier dibujo se puede reemplazar por un PNG sin tocar código:

- **Retratos:** un PNG de **360 × 480** por expresión en `assets/retratos/inspector/` (`neutral.png`, `pensativo.png`,
  `sonrisa_ironica.png`, `sorprendido.png`, `serio.png`, `satisfecho.png`) y `node herramientas/listar_retratos.mjs`. Detalles en
  `assets/retratos/inspector/README.md`.
- **El resto (inspector en el mapa, muebles, objetos, baldosas…):** un PNG con el nombre de la clave del dibujo y **su mismo tamaño** en
  `assets/sprites/` (por ejemplo `inspector.png`, 36 × 58) y `node herramientas/listar_sprites.mjs`. Las claves y los tamaños están en
  `docs/arte_actual/LEEME.md`, junto con todo el arte actual exportado.

Lo que no tenga archivo se sigue dibujando por código.

## Música

Solo **música de fondo**, sin efectos de sonido: cada parte del juego tiene su canción (el inicio, cada habitación y el final) y al pasar de
una a otra se funden. `assets/musica/lista.json` dice qué archivo de `assets/musica/` suena en cada parte; se reproducen en streaming, sin
descargarlas todas al empezar. El navegador no deja sonar nada hasta el primer clic o tecla. **M** silencia o vuelve a encender la música.

**Derechos:** las canciones de otras obras solo valen para la versión privada o de clase; para publicar el juego conviene música libre o propia.

## Versiones anteriores

La versión 1 era un Sokoban narrativo. Queda en el historial del repositorio; esta versión 2 la reemplaza por un juego de investigación.
