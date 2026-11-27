# Informe de la fase 2: investigar el pasillo

Proyecto: **Inspector Lógica: El Misterio de la Mansión** · v2 (exploración 2.5D) · rama `v2-investigacion`

**Estado:** el nivel 1 se puede investigar de principio a fin en el pasillo oscuro. Pasan las 158 pruebas, se jugó el pasillo completo en dos órdenes distintos en el navegador, cada línea del nivel salió una sola vez y por su causa real, y la consola no mostró errores.

**Commit:** no se hizo. El campo "Autorizado" del paso 0 llegó vacío, así que las fases 0, 1 y 2 (y `DISENO_V2.md` y `docs/`) siguen sin commitear. No hay push, tags ni ramas nuevas.

---

## 1. Qué se construyó

| Pieza | Archivo | Qué hace |
|---|---|---|
| Mapa del pasillo | `assets/mapas/nivel1.json` (Tiled) | Pasillo oscuro con cuatro ventanas con cortinas (la última, rota, detrás de la pila de cajas), marcas de polvo y de arrastre (solo con luz), huella, recorte de periódico y pilas escondidas. Los objetos apuntan por `ref` a ids de la narrativa; no llevan texto. |
| Reglas del nivel | `assets/investigaciones/nivel1.json` | Solo referencias: qué hecho dispara qué línea de `assets/narrativa/nivel1.json`, con su clase. No tiene texto de la historia. |
| Motor de investigación | `src/motor/Investigacion.js` | Sin Phaser. Convierte sucesos del jugador (entró, iluminó, examinó, miró detrás por un lado, recogió) en hechos. Una regla sale una sola vez cuando se cumplen todos sus hechos, en cualquier orden. Guarda el `historial` con orden y causa. |
| Ayuda | `src/motor/Ayuda.js` | Sin Phaser, sin texto. Se activa tras 45 s sin descubrir nada (configurable), no cuenta durante una pausa narrativa y se reinicia al descubrir. |
| Corriente | `src/motor/Corriente.js` | Dirección y fuerza del viento hacia la ventana rota (cortinas y polvo). |
| Narración | `src/presentacion/Narracion.js` | Conecta el `Narrador` de la v1.1 (sin tocar su lógica) con `DialogoPrincipal` (importantes, caja abajo) y `PanelInvestigacion` (tarjetas, al lado de la pantalla donde no está el inspector). |
| Fenómeno y atmósfera | `Cortinas.js`, `PolvoEnElHaz.js` | Cortinas que se mueven periódicamente con sombras que "caminan" en la pared, activas toda la fase. Polvo visible solo dentro del cono de luz, que deriva hacia la ventana rota. |
| Escena | `src/escenas/Habitacion.js` | Reescrita: entrada, pausa narrativa (el inspector no se mueve, la linterna queda fija), ícono E sobre lo más cercano que se puede usar ("mirar detrás" solo desde el lado de la ventana), pistas al Registro, ayuda sutil. |
| Registro | `src/ui/Registro.js` | Clave nueva `inspector-logica-v2-expediente` (ya no arrastra pistas de la v1.1) + prueba. |

Cambios mínimos en piezas existentes, todos sin tocar los arreglos de identidad de temporizadores:

- `DialogoPrincipal.js`: opción `profundidad`, y se fija a la pantalla (`setScrollFactor(0)`).
- `PanelInvestigacion.js`: opciones `profundidad` y `ajustarAlContenido`, y se fija a la pantalla.
- `Mapa.js`: la cara frontal de apilados altos se extruye con toda su altura (la pila de cajas); `leerMapaTiled` devuelve además ventanas, cortinas y fenómenos.

Textos: no se escribió ninguno nuevo. Todo lo que aparece en pantalla (tarjetas, cajas, títulos de pistas) sale palabra por palabra de `assets/narrativa/nivel1.json`; lo único propio son íconos de interfaz (E, 📜, 🔋). No se usa Sokoban: las cajas solo se examinan o se mira detrás de ellas.

---

## 2. Cada línea del nivel 1: disparador real y orden en cada recorrido

Dos recorridos jugados sobre el juego real en el navegador. Los números son el orden en que salió cada línea.

- **Recorrido A:** primero las cajas, luego las marcas.
- **Recorrido B:** primero las marcas, luego mirar detrás de las cajas por el lado de la ventana, y recién después examinar las cajas.

| Línea (id de regla) | Clase | Texto (exacto de la narrativa) | Disparador | A | B |
|---|---|---|---|---|---|
| `intro` | importante, pausa | «Primera regla del método: todo deja rastro. Segunda regla: los fantasmas no existen. Empecemos por este pasillo.» | Entrar al pasillo | 1 | 1 |
| `marca:n1-marca-polvo` | ambiental | «El polvo parece removido... alguien estuvo aquí hace poco.» | Primer contacto del cono con la marca de polvo | 2 | 2 |
| `marca:n1-marca-arrastre` | ambiental | «Marcas de arrastre junto a la pared. Algo pesado se movió hace poco.» | Primer contacto del cono con las marcas de arrastre | 5 | 3 |
| `comentario:0` | secundaria | «Esta caja pesa más de lo que parece. Aquí dentro hay algo más que polvo.» | Examinar la pila de cajas | 3 | 6 |
| `comentario:1` | secundaria | «Estas marcas en el suelo... alguien arrastró esto antes que yo.» | Examinar las marcas de arrastre (solo tras descubrirlas con luz) | 6 | 7 |
| `comentario:2` | secundaria | «Las cortinas se mueven solas. Bueno, «solas»: hay una ventana rota al fondo.» | Examinar las cortinas | 8 | 8 |
| `revelacion:0` | importante, pausa | «Las marcas del suelo coinciden: alguien sacó estas cajas de aquí a propósito.» | Marcas de arrastre descubiertas **y** cajas examinadas: sale con lo que ocurra segundo | 4 (al descubrir las marcas) | 5 (al examinar las cajas) |
| `revelacion:1` | importante, pausa | «Detrás de las cajas está la ventana rota; por ahí entra el viento que mueve las cortinas.» | Mirar detrás de la pila acercándose por el lado de la ventana | 7 | 4 |
| `pista:n1-pista-periodico` | secundaria (sin pausa) | «Muere el señor Flieder. El albacea de la familia, Gerhard Voss, administrará la mansión hasta que aparezca un comprador.» | Recoger el recorte | 9 | 9 |
| `bateria` | secundaria (sin pausa) | «Pilas nuevas, todavía en su empaque. Alguien piensa pasar muchas noches aquí.» | Encontrar las pilas | 10 | 10 |
| `pista:n1-pista-huella` | secundaria (sin pausa) | «Huella de bota en el barro seco, talla 44. Los fantasmas no usan botas.» | Recoger la huella | 11 | 11 |

Historiales reales del juego (`Investigacion.historial`):

- **A:** `1 intro ← entro · 2 marca:polvo ← ilumino:polvo · 3 comentario:0 ← examino:pila-de-cajas · 4 revelacion:0 ← ilumino:arrastre · 5 marca:arrastre ← ilumino:arrastre · 6 comentario:1 ← examino:arrastre · 7 revelacion:1 ← miro-detras:pila:ventana · 8 comentario:2 ← examino:cortinas · 9 pista:periodico ← recogio · 10 bateria ← recogio · 11 pista:huella ← recogio`
- **B:** `1 intro ← entro · 2 marca:polvo ← ilumino:polvo · 3 marca:arrastre ← ilumino:arrastre · 4 revelacion:1 ← miro-detras:pila:ventana · 5 revelacion:0 ← examino:pila-de-cajas · 6 comentario:0 ← examino:pila-de-cajas · 7 comentario:1 ← examino:arrastre · 8 comentario:2 ← examino:cortinas · 9 pista:periodico · 10 bateria · 11 pista:huella`

En ambos recorridos se registró cada texto que llegó a la caja o al panel: 11 textos distintos, ningún duplicado. En B la revelación 0 salió antes que el comentario 0 aunque ambos se disparan con el mismo examen: los importantes van primero para que la pausa empiece antes de mostrar nada.

---

## 3. Comprobaciones pedidas

| | Punto | Cómo se comprobó |
|---|---|---|
| ✔ | Cada línea sale una vez, con su causa | Tabla de la sección 2. Además hay una prueba por regla (disparador, texto exacto, clase, una sola vez) y las pruebas de los recorridos A y B. |
| ✔ | La revelación 0 sale en cualquier orden, con lo que ocurra segundo | A: salió al descubrir las marcas. B: salió al examinar las cajas. |
| ✔ | No se pueden examinar las marcas antes de descubrirlas | En el juego, `puedeActuar('n1-marca-arrastre', 'examinar')` fue `false` hasta que la luz las tocó; y hay prueba. |
| ✔ | "Mirar detrás" solo por el lado de la ventana | Desde delante de la pila el candidato es "examinar", nunca "mirar detrás"; detrás, entre la pila y el muro, el candidato es `pila-de-cajas/mirar-detras/ventana`. |
| ✔ | La pausa bloquea el movimiento | Con la caja abierta se mantuvo D 700 ms: el inspector no se movió. La linterna queda fija. |
| ✔ | Nada se pierde durante una pausa | Al descubrir las marcas de arrastre (que dispara la revelación 0), con la caja abierta había 1 tarjeta en pantalla y 1 en la cola ambiental, y la aparición de la marca quedó pausada. Al cerrar la caja salieron las dos tarjetas y la aparición siguió. En B, el comentario 0 esperó en la cola de secundarias durante la pausa y salió al cerrarla. |
| ✔ | Avanzar el texto con E, Espacio, Enter y clic | E se usó en todos los recorridos. Espacio y Enter con eventos de teclado sobre la intro (2 pulsaciones cada uno: completar y cerrar). Clic real del ratón sobre la caja (2 clics). |
| ✔ | Pistas en el Registro | Tras el recorrido, `inspector-logica-v2-expediente` contiene `n1-pista-periodico` y `n1-pista-huella`. Las pilas y las marcas no se guardan como pistas. |
| ✔ | La ayuda aparece al quedarse quieto | Sin descubrir nada nuevo, a los 47 s `ayuda.activa` pasó a `true` con el refuerzo `corriente`: cortinas y polvo más fuertes hacia la ventana (captura 03 contra la 01). Se reinicia al descubrir (pruebas y en el juego). Con la revelación 1 ya contada no empuja más. |
| ✔ | El polvo solo se ve dentro de la luz | Medición con la cámara: 2043 de 2044 partículas visibles estaban dentro del cono; derivan hacia la ventana rota. |
| ✔ | Consola limpia | Solo los avisos de arranque de Phaser; sin errores ni advertencias. |
| ✔ | No hay contadores de objetivos en pantalla | Ninguna HUD de progreso. Lo único fijo es el ícono E cuando hay algo usable. |
| ✔ | El panel y la caja no tapan al inspector | El panel cambia de lado según dónde esté el inspector y ajusta su alto al contenido; la caja va abajo, o arriba si el inspector está en la parte baja. Capturas 04 y 05. |

### Pruebas automáticas

`node --test "pruebas/*.test.mjs"`: **158 pasan, 0 fallan.**

| Archivo | Pruebas |
|---|---|
| `investigacion.test.mjs` (nuevo) | 35 |
| `ayuda.test.mjs` (nuevo) | 14 |
| `mapa.test.mjs` (reescrito) | 21 |
| `registro.test.mjs` | 6 |
| `visibilidad`, `movimiento`, `progreso`, `guion`, `marcas`, `narrativa`, `temporizadores` | 16, 13, 6, 6, 8, 17, 16 |

Las del mapa comprueban que todo lo transitable es alcanzable, que nada queda tapado y que cada marca, pista y objeto del mapa existe en las reglas (y al revés).

### FPS

Medidos con `requestAnimationFrame` durante 5 s en el pasillo, con el contador F3 activo:

| Medida | Resultado |
|---|---|
| FPS medio | 180 (el panel del navegador corre a ~180 Hz) |
| Cuadro p99 / peor | 8 ms / 10,3 ms |
| Luz | 0,40 ms por cuadro, 228 vértices, 697 triángulos |
| Polvo | 77 de 90 partículas activas en el cono |

Cumple los 60 FPS en escritorio. **No se midió un teléfono real**: la CPU y la GPU son las del escritorio.

---

## 4. Capturas

Tamaño original 1280×720, mostradas a 800 px de ancho (`capturas/`).

| Archivo | Qué muestra |
|---|---|
| `01_pasillo_con_polvo_en_el_haz.jpg` | Pasillo, cortinas y polvo dentro del cono de luz |
| `02_marca_recien_descubierta.jpg` | Marca recién descubierta: ícono temporal en el suelo y tarjeta "RASTRO" |
| `03_ayuda_activa.jpg` | Misma escena tras 47 s quieto: más polvo, cortinas más agitadas |
| `04_caja_de_importantes_con_revelacion.jpg` | Caja de los importantes con la revelación 1; el inspector queda a la vista |
| `05_panel_con_comentario.jpg` | Panel "Libreta del inspector" con el comentario 0 y el ícono E junto a la pila |

---

## 5. Un arreglo durante la verificación

El recorte de periódico estaba sobre la consola con alcance 84 px y, parado delante de la consola, el inspector quedaba justo fuera de alcance (candidato `null`). Se subió a 110 px en `assets/mapas/nivel1.json` y en el generador. Se repitieron los dos recorridos después del cambio y el recorte se recoge de pie delante de la consola. También se quitó una aserción sobrante en `mapa.test.mjs`.

El mapa se generó con `docs/fase2/generar_mapa_nivel1_referencia.py` (referencia: lo que se usa en el juego es el JSON).

---

## 6. Pendientes y límites conocidos

- **Fuera de esta fase por pedido:** libreta, deducción, cierre, error e informe (fase 3); retrato y música (fase 4).
- **README** sigue describiendo la v1.1 (queda para la fase 7).
- **Luz:** no hay `Light2D` ni mapas de normales; el borde de las sombras es duro; la luz de halo ilumina por detrás las caras altas de los objetos.
- **WebGL** es obligatorio.
- **Pruebas en el navegador** hechas con eventos de teclado sintéticos (teclas mantenidas) y ratón sintético para apuntar; el clic en la caja fue real. Es un camino de juego real, pero no es una persona jugando.
- **Tiled** no se abrió: el JSON sigue su formato, pero no se validó en el editor.
- **Sin commit:** fases 0, 1 y 2, `DISENO_V2.md` y `docs/` siguen sin commitear. `Presentacion_Sokoban_Ramon_Donoban.pdf/.pptx` y `assets/img/screenshot_*.jpg` no se tocaron.

---

## 7. Arreglos tras la revisión

**Commit:** sigue sin hacerse (el campo "Autorizado" del paso 0 llegó vacío). **Ayuda nueva (arreglo 2):** implementada con los cambios que pediste (la pila no tiembla: aletea su solapa; los destellos son puntos sueltos). Ver el final de esta sección.

### Arreglo 1: la causa antes que la consecuencia

- `Investigacion.js`: los acontecimientos de un mismo suceso salen ahora ambiental → secundaria → importante (antes al revés). Esto cambia el historial: la marca o el comentario quedan antes que la revelación.
- `Narracion.js` (el `Narrador` no se tocó): la tarjeta o nota se presenta de inmediato; la revelación espera a que la causa **esté a la vista** y pasen **1,2 s** (`LECTURA.causaAntesDeConsecuenciaMs`, definido junto a los demás tiempos en `tiemposDeLectura.js`). Recién entonces empieza la pausa narrativa. Si el suceso no produjo nada más que la revelación (mirar detrás de las cajas), sale al instante. Hay un tope de 8 s por si la causa no llegara a mostrarse nunca.
- Durante esa cuenta de 1,2 s el inspector no se mueve ni actúa (igual que en la pausa), para que no exista un instante en que ya ocurrió algo y todavía se pueda actuar. Si la libreta estaba ocupada con otra nota, la causa espera su turno y el jugador sigue libre hasta que la causa se ve.
- **Defecto que encontré con el recorrido C:** con una primera versión (espera fija de 1,2 s desde el suceso), en C el comentario de las cajas quedaba detrás de la nota de las marcas, que ocupaba la libreta, y la revelación salía antes que su comentario (en esa pasada la revelación salió a los 182 942 ms y el comentario a los 185 299 ms). Se corrigió esperando a que la causa se vea. Las pruebas nuevas cubren ese caso.

### Arreglo 3: texto de la caja

`DialogoPrincipal.js`: «▸ Espacio / toca para continuar» pasó a «▸ E / Espacio / clic para continuar». Cambié igual los otros dos avisos de la misma caja («completar» y «sigue») para que no digan "toca". Es texto de interfaz; ninguna prueba dependía de la frase. Se ve en la captura 06.

### Los tres recorridos, tras los arreglos

Orden en que salió cada línea (A: cajas y luego marcas · B: marcas, detrás de las cajas y luego cajas · C: el orden de la historia: esperar el fenómeno, examinar las cortinas, descubrir las marcas, examinar las cajas y mirar detrás).

| Línea | A | B | C |
|---|---|---|---|
| `intro` | 1 | 1 | 1 |
| `marca:n1-marca-polvo` | 2 | 2 | 2 |
| `comentario:2` (cortinas) | 8 | 8 | 3 |
| `marca:n1-marca-arrastre` | 4 | 3 | 4 |
| `comentario:1` (marcas) | 6 | 7 | 5 |
| `comentario:0` (cajas) | 3 | 5 | 6 |
| `revelacion:0` | **5** (tras la marca) | **6** (tras el comentario) | **7** (tras el comentario) |
| `revelacion:1` | 7 | 4 | 8 |
| `pista:n1-pista-periodico` | 9 | 9 | 9 |
| `bateria` | 10 | 10 | 10 |
| `pista:n1-pista-huella` | 11 | 11 | 11 |

Historiales reales del juego:

- **A:** `1 intro ← entro · 2 marca:polvo ← ilumino:polvo · 3 comentario:0 ← examino:pila-de-cajas · 4 marca:arrastre ← ilumino:arrastre · 5 revelacion:0 ← ilumino:arrastre · 6 comentario:1 ← examino:arrastre · 7 revelacion:1 ← miro-detras:pila:ventana · 8 comentario:2 ← examino:cortinas · 9 pista:periodico · 10 bateria · 11 pista:huella`
- **B:** `1 intro · 2 marca:polvo · 3 marca:arrastre · 4 revelacion:1 ← miro-detras:pila:ventana · 5 comentario:0 ← examino:pila-de-cajas · 6 revelacion:0 ← examino:pila-de-cajas · 7 comentario:1 · 8 comentario:2 · 9 pista:periodico · 10 bateria · 11 pista:huella`
- **C:** `1 intro · 2 marca:polvo · 3 comentario:2 ← examino:cortinas · 4 marca:arrastre · 5 comentario:1 ← examino:arrastre · 6 comentario:0 ← examino:pila-de-cajas · 7 revelacion:0 ← examino:pila-de-cajas · 8 revelacion:1 ← miro-detras:pila:ventana · 9 pista:periodico · 10 bateria · 11 pista:huella`

Tiempos medidos en el navegador (ms del reloj de la página, cuando se presentó cada texto):

| Recorrido | Causa a la vista | Revelación 0 | Diferencia |
|---|---|---|---|
| A | tarjeta de las marcas de arrastre, 83 148 | caja, 84 352 | 1 204 ms |
| B | comentario de las cajas, 136 173 | caja, 137 374 | 1 201 ms |
| C | comentario de las cajas, 39 503 (esperó 1,1 s a que la libreta terminara la nota anterior) | caja, 40 707 | 1 204 ms |

La revelación 1 sale al instante porque mirar detrás no produce ninguna otra línea (B: pulsación y caja en 131 037).

En los tres recorridos: 11 textos distintos y ninguno repetido; las dos pistas quedaron en el Registro; el inspector no se movió ni actuó durante la cuenta ni durante la pausa. Con esa pausa, la tarjeta de la causa sigue en pantalla y se reanuda después (prueba + captura 06). En C el fenómeno de las cortinas estaba activo al llegar (la ráfaga ya corría), y el polvo se iluminó al caminar hacia las cortinas, así que su tarjeta salió antes del comentario de las cortinas; las marcas de arrastre se descubrieron después, como se pedía.

Consola: sin errores del juego. Los mensajes `Cannot read properties of undefined (reading 'scrollX')` que aparecieron salen de un temporizador de mi propio script de prueba (apuntaba el ratón mientras la escena se reiniciaba entre recorridos) y no de ningún archivo de `src/`.

### Pruebas

`node --test`: **171 pasan, 0 fallan** (eran 158). Nuevas: `narracion.test.mjs` (10: causa antes, 1,2 s, revelación sola inmediata, libreta ocupada, tope, sin duplicar, bloqueo, detener, tarjeta que sigue) y 3 en `investigacion.test.mjs` (recorrido C, causa antes en A, B y C, y el orden por clase). Se actualizaron las 3 pruebas que fijaban el orden anterior.

### Captura

`capturas/06_causa_y_revelacion_despues.jpg`: la tarjeta «RASTRO» de las marcas de arrastre sigue a la vista y, 1,2 s después, la caja con la revelación 0 y el texto nuevo «E / Espacio / clic para continuar».

### Arreglo 2: ayuda para todo lo que hace falta

Prioridad marcas → pila → corriente, configurada en `assets/investigaciones/nivel1.json` (sin texto). Cada refuerzo vale mientras no haya salido su línea: marcas (`marca:n1-marca-arrastre`), pila (`comentario:0`) y corriente (`revelacion:1`). La espera sigue siendo de 45 s sin descubrir nada, y cada descubrimiento reinicia la cuenta. Las pistas y las pilas no llevan ayuda.

| Ayuda | Cómo se ve | Se apaga cuando |
|---|---|---|
| **Marcas de arrastre** | 5 o 6 destellos cálidos muy tenues, sueltos, sobre la zona de las marcas: cada uno se enciende y se apaga en un sitio distinto, así que no dibujan la forma de las marcas. Se ven aunque no haya luz encima. Además, el polvo del haz se inclina hacia esa zona y dentro de ella casi se detiene (se asienta). | las marcas se descubren con la linterna |
| **Pila de cajas** | La pila no se mueve. La solapa que cuelga por el frente de la caja de arriba aletea con cada ráfaga de la ventana rota y le cae un hilo fino de polvo por el frente. Con luz se ven la solapa y el hilo; sin luz, apenas un resplandor de la solapa. | se examina la pila |
| **Corriente** | Sin cambios: cortinas y polvo más fuertes hacia la ventana rota. | se mira detrás de la pila por el lado de la ventana |

Implementación: `Ayuda.js` sigue sin Phaser y solo elige el refuerzo; el aspecto está en `PistasDeAyuda.js` (nuevo), `PolvoEnElHaz.js` (atracción y hilo) y `Cortinas.js` (`empuje`, la fuerza de la ráfaga). Los niveles suben y bajan con suavidad (unos 3 s). En la pausa narrativa y en la cuenta de 1,2 s la ayuda no cuenta, porque la escena le pasa `narracion.bloqueando`.

Cambio frente a la propuesta: la solapa **cuelga por el frente** de la caja de arriba y no está encima de su tapa. Probé primero encima, pero la tapa de la pila queda a oscuras casi siempre y la solapa no se veía con luz; por el frente sí la alcanza la linterna. El hilo de polvo también usa un punto de suelo delante de la pila para saber si la luz llega al frente.

#### Verificación en el navegador (45 s reales quieto en cada situación)

| Situación | Resultado | Captura |
|---|---|---|
| Marcas sin descubrir | A los 45 s la ayuda pasó a `marcas`; 5-6 destellos visibles sobre la zona (`destellosVisibles` 5). | `07_ayuda_marcas_destellos.jpg` |
| Marcas descubiertas, pila sin examinar | A los 45 s pasó a `pila`; solapa aleteando (en el instante de la captura: escala 0,97 y ángulo −1,7°; la amplitud llega a ±16° en las ráfagas fuertes) y 14 partículas del hilo visibles con luz. | `08_ayuda_pila_solapa_y_polvo.jpg` |
| Lo mismo, sin luz sobre la pila | Solo el resplandor de la solapa (alfa 0,2); el hilo, 0 partículas visibles. | `08b_ayuda_pila_sin_luz.jpg` |
| Marcas y pila hechas, sin mirar detrás | A los 45 s pasó a `corriente`; refuerzo 1,7; 88 de 90 partículas de polvo visibles, cortinas más agitadas. | `09_ayuda_corriente.jpg` |

Cada ayuda se apagó al descubrir lo suyo: al iluminar las marcas, `destellosVisibles` pasó a 0 y el nivel a 0,001 en 2,5 s; al examinar la pila, el nivel bajó de 1 a 0,05 en 2,5 s y el hilo a 0 partículas; al mirar detrás, la ayuda de la corriente se apagó y el refuerzo volvió a 1. Al examinar la pila con las marcas ya descubiertas salió `comentario:0` y luego `revelacion:0`, como en el arreglo 1. El polvo que se asienta es sutil: con la zona al lado de la ventana, su dirección casi coincide con la de la corriente (−22° contra −20° desde un punto de prueba); lo que cambia es que dentro de la zona la velocidad baja de 51 a 20 px/s. No lo capturé en imagen porque, para verlo, la luz tendría que apuntar a la zona y eso descubriría las marcas.

FPS con la ayuda de la corriente activa: **180 de media, p99 7,1 ms, peor cuadro 8,4 ms** (5 s, contador F3). No se bajó de 60. La consola quedó sin errores nuevos: solo siguen los 118 mensajes de `scrollX` del temporizador de mi script de prueba, ninguno de `src/`.

#### Pruebas

`node --test`: **178 pasan, 0 fallan** (eran 171). `ayuda.test.mjs` pasó de 14 a 21: prioridad configurada; el orden marcas → pila → corriente en una partida; la prioridad no depende del orden de descubrimiento; cada refuerzo se apaga cuando sale su línea (marca, `comentario:0`, `revelacion:1`); cualquier descubrimiento reinicia la cuenta; no hay ayuda para las pistas ni las pilas (ni refuerzo ni línea opcional en la configuración, y con todo lo necesario descubierto no ayuda aunque no se haya recogido nada); no cuenta durante la pausa ni durante la cuenta de 1,2 s (con `Narracion` real). Se actualizaron 5 pruebas viejas que suponían que el primer refuerzo era la corriente.
