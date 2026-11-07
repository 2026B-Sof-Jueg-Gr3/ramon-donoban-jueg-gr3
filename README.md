# Inspector Lógica: El Misterio de la Mansión

Sokoban narrativo para el navegador, hecho con Phaser 3. Nació como adaptación a JavaScript del juego de escritorio
[Sokoban_In_JAVA](https://github.com/DonobanR/Sokoban_In_JAVA) (conserva sus recursos gráficos y su diseño orientado a
objetos) y evolucionó hacia un Sokoban que cuenta una historia: el Inspector Lógica recorre seis habitaciones de la
Mansión Flieder demostrando que los "fantasmas" tienen explicaciones físicas. Las acciones del jugador (colocar cajas,
recoger pistas, descubrir marcas, examinar muebles) hacen avanzar la investigación.

## Alcance de esta versión

Esta versión se conserva como **proyecto Sokoban narrativo cerrado**. Incluye solo lo descrito en este documento.
**No forman parte de esta entrega** (se diseñaron pero no se implementaron):

- Guardado y reconstrucción de intentos ni partidas (al salir de un nivel, el intento se pierde).
- Expediente de conocimiento persistente (hechos, interpretaciones): solo se guardan las pistas recogidas.
- Motor narrativo con reglas y "Director Visual" (personajes, reconstrucciones, ilustraciones).
- Linterna con cargas y destello: las baterías siguen en los niveles y en el modelo, pero ocultas y sin efecto.
- Preguntas, deducciones y enfrentamientos finales.
- El rediseño posterior de niveles que se planificó (mapas más grandes y con más habitaciones). Los seis niveles
  incluidos ya no son los mapas de 9×9 del juego original: los niveles 1 a 3 se rediseñaron durante el proyecto y los
  niveles 4 a 6 se ampliaron con zonas nuevas.

Algunos textos del guion están marcados `"borrador": true` (el validador los lista).

## Tecnologías

- **Phaser 3.80.1**, cargado desde CDN (jsDelivr) en `index.html`. No hay dependencias que instalar.
- **JavaScript** con módulos ES, sin empaquetador.
- **Python 3** (biblioteca estándar; probado con 3.13): servidor local y validador de niveles.
- **Node.js 22.7 o superior** (probado con 24.19; usa `node:test`, sin paquetes): pruebas automáticas. Hace falta una
  versión que acepte patrones en `node --test` y que cargue como módulos ES los `.js` sin `package.json`.

## Requisitos e instalación

1. Un navegador moderno con conexión a internet (Phaser se descarga del CDN).
2. Python 3 para el servidor local y el validador; Node.js para las pruebas.

No hay `npm install` ni pasos de compilación: basta con clonar el repositorio.

## Ejecución

El juego usa módulos ES, así que necesita un servidor HTTP: abrir `index.html` directamente no funciona.

```
python servidor.py
```

y abrir http://localhost:8787. Este servidor indica al navegador que no guarde los archivos en caché (con
`python -m http.server` el navegador puede seguir usando versiones viejas tras un cambio). Cualquier servidor estático
sirve, incluido GitHub Pages (`.nojekyll` ya está en el repositorio).

**Controles:** flechas o WASD para mover · Z deshacer · R reiniciar · Esc volver a niveles · Espacio, Enter o un toque
para avanzar los textos importantes. En pantallas táctiles hay cruceta y botones.

## Estructura

```
├── index.html               Página de entrada; carga Phaser desde CDN
├── servidor.py              Servidor local sin caché (puerto 8787)
├── assets/
│   ├── img/                 Imágenes del juego original
│   ├── niveles/             nivelN.txt (capas físicas), nivelN.entidades.json y soluciones.json
│   └── narrativa/           nivelN.json: guion de cada nivel
├── herramientas/
│   └── validar_niveles.py   Validador de niveles con solver
├── pruebas/                 Pruebas automáticas (node --test)
├── GUION_NARRATIVA.md       Borrador histórico del guion (ver la nota al inicio del archivo)
└── src/
    ├── main.js              Configura Phaser y registra las escenas
    ├── modelo/              Lógica del Sokoban, sin dependencias de Phaser
    │   ├── FormatoNivel.js  Lee las capas de nivelN.txt
    │   ├── Escenario.js     Matriz de bloques y entidades fuera de la matriz; visibilidad de marcas
    │   ├── Nivel.js         Tablero físico: pasos, empujones, deshacer, reiniciar, sucesos y consultas
    │   ├── Personaje.js     Movimiento y empuje
    │   ├── Bloque.js        Clase base de Pared, Suelo, PuntoDeLlegada, Caja y Mueble
    │   ├── Caja.js · Mueble.js · Objeto.js · Marca.js   Entidades con ID
    │   └── Direccion.js
    ├── escenas/             Carga, MenuPrincipal, MenuNiveles, Interludio (informes) y VentanaDeJuego
    ├── presentacion/        Aparición temporal de las marcas (configuracion.js, PresentacionTemporal,
    │                        AparicionDeMarca, GestorDePresentaciones)
    └── ui/
        ├── Narrador.js            Categorías, colas, identidad de acontecimientos y pausa narrativa
        ├── DialogoPrincipal.js    Presentación de los acontecimientos importantes
        ├── PanelInvestigacion.js  Panel con la libreta (secundarios) y las tarjetas de las marcas
        ├── Distribucion.js        Zonas de pantalla que no se superponen
        ├── Entradas.js            Distribuidor de entradas (cada tecla llega a un solo componente)
        ├── tiemposDeLectura.js    Tiempos de escritura y lectura
        ├── ControlesTactiles.js · Boton.js
        ├── Records.js             Récords por nivel (localStorage)
        ├── Registro.js            Pistas recogidas (localStorage)
        └── Progreso.js            Niveles completados (localStorage)
```

## Mecánicas

- **Sokoban clásico:** las cajas se empujan, no se jalan; no se empujan dos cajas a la vez ni contra una pared o un mueble.
  El nivel se completa cuando todos los destinos tienen una caja.
- **Muebles:** obstáculos que bloquean el paso y la vista; al chocar con uno, el inspector lo examina.
- **Pistas:** se recogen al pisarlas y quedan registradas (el HUD muestra cuántas se recogieron en el intento).
- **Sin límite de pasos:** caminar no consume nada. El HUD muestra pasos y empujones del intento.
- **Deshacer** revierte el último movimiento (y sus contadores); **reiniciar** devuelve el nivel a su estado inicial.
- **Récords** (`src/ui/Records.js`): por nivel, dos récords globales e independientes que solo se actualizan al completar
  un intento: menos pasos (desempate: menos empujones) y menos empujones (desempate: menos pasos). Se muestran en el
  informe al terminar el nivel.
- **Progresión:** completar un nivel desbloquea el siguiente (`Progreso`).
- **Marcas** (evidencias): se descubren con la *visibilidad básica*, cuando el inspector está a 2 casillas o menos
  (distancia euclídea), con línea de visión (paredes y muebles tapan; las cajas en medio no) y sin una caja encima.
  Cada marca se descubre una vez por intento. Su icono aparece, permanece y desaparece (`TIEMPOS.marca` en
  `src/presentacion/configuracion.js`: 450 / 4500 / 600 ms); la marca sigue existiendo en el escenario.

## Niveles y entidades

Cada nivel tiene dos archivos. La matriz describe solo el espacio y las reglas de movimiento; el resto de entidades vive
fuera de ella, con su ID y su posición.

**`assets/niveles/nivelN.txt`**: capas alineadas (las líneas con `;` son comentarios; el terreno fija el tamaño).

| Capa | Símbolos |
|---|---|
| `[terreno]` | `#` pared · espacio suelo · `.` destino |
| `[obstaculos]` | `m` mueble |
| `[sokoban]` | `A`–`Z` caja (la letra es su ID) · `@` inicio del inspector |

**`assets/niveles/nivelN.entidades.json`**: `obstaculos` (muebles con ID, uno por cada `m`), `objetos` (pistas y
baterías, que se recogen al pisarlas) y `evidencias` (marcas, que se descubren por visibilidad).

El tablero (`src/modelo/Nivel.js`) emite **sucesos** de solo lectura (`paso`, `empujon`, `casillaLiberada`,
`casillaCubierta`, `cajaColocada`, `cajaRetirada`, `objetoRecogido`, `completado`, `deshacer`, `reinicio`) y responde
consultas espaciales (`esTransitable`, `ocupante`, `entidadesEn`, `camino`, `estado()`).

## Sistema narrativo

El guion de cada nivel está en `assets/narrativa/nivelN.json`; pistas, muebles y marcas se enlazan con sus entidades
por `id`. El narrador (`src/ui/Narrador.js`) clasifica cada acontecimiento:

| Clase | Ejemplos | Comportamiento |
|---|---|---|
| **Importante** | intro, pistas, cada caja colocada | **Pausa narrativa:** el juego no acepta movimientos, empujones, deshacer ni reiniciar hasta que el jugador lee. Se presenta en la zona de los controles con un velo suave sobre el tablero. El primer Espacio/Enter/toque completa el texto; el siguiente avanza. Varios importantes de una misma acción se presentan en orden en la misma pausa. |
| **Secundaria** | comentarios al empujar, retirar una caja, examinar un mueble | Libreta en el panel de investigación; el juego sigue. Escritura y tiempo de lectura propios; espera su turno en cola. |
| **Ambiental** | textos de las marcas | Tarjetas en el panel (hasta 3 a la vez, cada una con su temporizador; el resto en cola). |

- **Nada se pierde, se acorta ni se sobrescribe.** Durante una pausa, secundarios, ambientales y apariciones de marcas
  quedan suspendidos con su estado exacto y siguen al reanudar.
- **Identidad:** cada mensaje lleva la identidad de lo que ocurrió (p. ej. `pista:<id>:recogida`), distinta de la entidad
  a la que se refiere; una emisión repetida de la misma ocurrencia se presenta una sola vez.
- **Cierre del nivel:** tras guardar el récord se presentan, en orden, los importantes que generó la acción final, una
  página "📒 Notas de la libreta" con el texto completo de los secundarios pendientes y el texto de cierre; después
  aparece el informe del nivel.
- **Distribución** (`src/ui/Distribucion.js`): HUD, panel de investigación, tablero y controles ocupan zonas que no se
  superponen (en pantallas apaisadas anchas el panel es una columna a la derecha; en vertical, una franja de alto fijo
  que se desliza si su contenido no cabe). La narrativa nunca tapa el tablero, y mostrar textos no lo mueve ni reescala.
- **Tiempos** (`src/ui/tiemposDeLectura.js`): escritura de 16 ms por letra (22 en la presentación importante); lectura =
  máx(2500 ms, 55 ms por letra), contada desde que el texto está completo.

## Pruebas y validador

```
node --test "pruebas/*.test.mjs"
```

85 pruebas: reproducen las dos soluciones de referencia de cada nivel con sus contadores exactos y comprueban deshacer,
reiniciar, las reglas de empuje, los récords, el formato por capas, las entidades e IDs, los sucesos, las consultas
espaciales, la visibilidad de las marcas y su aparición temporal, el narrador (pausa, colas, identidad, cierre),
el distribuidor de entradas, la distribución de pantalla y la escritura de textos del panel y de la presentación
importante con cuadros lentos, cancelaciones y cierres. Para estas últimas, `pruebas/relojPhaser380.mjs` reproduce el
reloj de Phaser 3.80.1 tal como es, incluida su recuperación de cuadros lentos.

```
python herramientas/validar_niveles.py            # todos los niveles (~1 minuto)
python herramientas/validar_niveles.py 2 3        # solo algunos
python herramientas/validar_niveles.py --rapido   # sin la complejidad espacial
```

Comprueba formato, entidades, solubilidad, récords mínimos de pasos y de empujones (solver exacto), dependencia del orden,
deadlocks, accesibilidad, posición inicial, complejidad espacial y enlaces de la narrativa. Los niveles aprobados guardan
sus soluciones de referencia en `assets/niveles/soluciones.json` (`udlr` caminar, `UDLR` empujar). Las advertencias
"REVISAR" son métricas de diseño, no errores.

## Problemas conocidos

- En celular, a ciertas escalas puede verse una línea fina entre dos columnas de baldosas del suelo (artefacto de
  muestreo de la textura; no afecta al juego).
- Con el celular en horizontal, la zona de controles (226 px) deja poco espacio al tablero.
