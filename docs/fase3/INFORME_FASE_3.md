# Informe de la fase 3: libreta, deducción, cierre e informe

Proyecto: **Inspector Lógica: El Misterio de la Mansión** · v2 (exploración 2.5D) · rama `v2-investigacion`

**Estado:** el nivel 1 se puede jugar de principio a fin: se investiga el pasillo, la libreta avisa cuando ya hay con qué resolver, se resuelve la deducción pregunta por pregunta, sale el cierre, aparece el informe y el nivel 2 queda desbloqueado. Pasan las **223 pruebas** (178 antes), se jugaron cuatro recorridos completos en el navegador y la consola no mostró ningún error.

**Commit:** no se hizo. El campo "Autorizado" del paso 0 llegó vacío, así que las fases 0, 1, 2 y 3 (y `DISENO_V2.md` y `docs/`) siguen sin commitear. No hay push, tags ni ramas nuevas. No se tocó el PDF, el PPTX ni `assets/img/screenshot_*.jpg`.

---

## 1. Las dos dudas de la fase 2

**a) Las rayas grises de `09_ayuda_corriente.jpg` no sobran: son las marcas de arrastre.**
Son los dos surcos paralelos que dibuja la marca `n1-marca-arrastre` cuando la linterna la toca (la captura 09 se tomó con las marcas ya descubiertas, a la izquierda de la pila, donde están en el mapa). Lo comprobé en el juego: con la marca iluminada se ven las dos rayas; al ocultar solo la imagen de esa marca (`setVisible(false)`) desaparecen y no queda nada más. No hay que quitar nada: sin ellas el jugador no tendría nada que descubrir ahí.

**b) Consola limpia, sin ningún script de prueba.** Recargué el juego y jugué más de un minuto solo con teclas y ratón reales (entrar, intro, caminar en todas direcciones, apuntar, descubrir la marca de polvo). La consola mostró únicamente el aviso de arranque de Phaser; ningún error de `scrollX` ni de otro tipo. Después, en los cuatro recorridos de la sección 5, tampoco apareció ninguno (además se vigiló `console.error` y `window.onerror` desde la página: vacío).

---

## 2. Textos: lo aprobado, tal cual

- `assets/narrativa/nivel1.json` ahora tiene la clave `"deduccion"` con los nombres cortos de las pruebas, las dos preguntas y sus tres opciones, palabra por palabra como se aprobó. Los textos de `cierre`, `error` e `informe` no cambiaron y se usan exactos.
- `assets/investigaciones/nivel1.json` tiene la lógica sin texto: de qué regla sale cada prueba, qué conclusión es correcta y qué combinaciones valen.
  - Pregunta 1: correcta `corriente`; vale **Ventana rota**.
  - Pregunta 2: correcta `a-proposito`; vale **Cajas movidas**, o **Marcas de arrastre**, o **Polvo removido**, o **HUELLA DE BOTA**.
  - El **RECORTE DE PERIÓDICO** aparece en la libreta pero no prueba nada; las pilas no son prueba.
- `pruebas/guion.test.mjs` fija esos textos (pruebas, preguntas, opciones, títulos de las pistas) y que `informe`, `cierre` y `error` siguen igual.
- No se escribió ningún otro texto de la historia. Lo único propio es de interfaz: "LIBRETA DEL INSPECTOR", "PRUEBAS", "PISTAS", "Resolver el caso", "Seguir investigando", "Cerrar", "Presentar pruebas", "Volver", "Elige tu conclusión", "Elige las pruebas que la respalden (máximo 2)" (antes "Elige 1 o 2 pruebas…"; ver sección 9), "Como máximo 2 pruebas: quita una para elegir otra", "Todavía no hay nada anotado.", "Pregunta 1 de 2", "Siguiente habitación", "Volver al menú", "LO ENCONTRADO", "Pistas: X de 2", "Pilas: encontradas / no encontradas" y las ayudas de teclas.

---

## 3. Qué se construyó

### Motor (sin Phaser, con pruebas)

| Archivo | Qué hace |
|---|---|
| `src/motor/Libreta.js` | Convierte lo que ya salió en `Investigacion` en pruebas. Solo devuelve lo encontrado. Se calcula de un conjunto de reglas ya dichas, por eso no depende del orden en que se encontró cada cosa; el orden de la lista es el de las reglas del nivel. Da también el resumen del informe (pistas X de 2, pilas). |
| `src/motor/Deduccion.js` | **Disponible:** cada pregunta tiene al menos una combinación válida entre las pruebas encontradas. **Responder:** conclusión correcta **y** pruebas que *contienen* una combinación válida → la pregunta queda resuelta; conclusión equivocada o prueba que no la respalda → `error` (se repite esa pregunta); las dos resueltas → `resuelto`. Máximo 2 pruebas (más, ninguna o no encontradas → `invalida`, no se valora). Opciones mezcladas y fijas mientras dura la partida. También valida los datos (`validarDeduccion`). |
| `src/motor/AvisoDeDeduccion.js` | La espera de ~1,5 s: empieza solo cuando no hay ningún importante en curso, se reinicia si aparece otro, avisa una sola vez y no avisa si el jugador ya abrió la libreta con la deducción disponible. Decide también cuándo se ve el ícono de la esquina. |
| `src/motor/Ayuda.js` | Nuevo refuerzo `libreta` (el primero en la prioridad, solo con la deducción disponible) y `apagar()` para el cierre. El resto de la ayuda no cambió. |
| `src/motor/niveles.js` | Los títulos de las habitaciones (los usan el menú y el informe). |

### Escena y pantallas (provisionales, dentro de 1280×720)

| Archivo | Qué hace |
|---|---|
| `src/presentacion/Cuaderno.js` | La libreta con los hallazgos, el aviso (dos botones) y la deducción: paso 1, conclusión entre 3 opciones mezcladas; paso 2, 1 o 2 pruebas y "Presentar pruebas". Ratón (pasar enfoca, clic elige) y teclado (flechas o WASD mueven, E / Enter / Espacio eligen, Esc vuelve un paso; Tab o I cierran). |
| `src/presentacion/IconoDeLibreta.js` | El ícono 📒 con su tecla (TAB) en la esquina inferior derecha, sin contador; late suave y, con la ayuda, más fuerte. Un clic lo abre. |
| `src/presentacion/Cortinas.js` | `calmar()`: al cierre las cortinas se quedan quietas y las sombras no vuelven, con suavidad. |
| `src/escenas/Informe.js` | Título del nivel, texto `informe` exacto, "Pistas: X de 2" y "Pilas: encontradas / no encontradas" (único lugar con contadores), y los botones "Siguiente habitación" (a EnConstruccion de la habitación siguiente) y "Volver al menú" (al menú de niveles). |
| `src/escenas/Habitacion.js` | Conecta todo: abrir la libreta (Tab / I) pausa el juego (inspector, ayuda, notas y apariciones de marcas); el aviso automático; el error como texto importante y vuelta a esa misma pregunta; el cierre como importante, que calma las cortinas, apaga la ayuda y marca el nivel completado; al cerrar el cierre, fundido corto y paso al informe. |
| `src/escenas/MenuNiveles.js`, `src/main.js` | El menú usa los títulos de `niveles.js`; se registra la escena `Informe`. |

Sin cambios: el `Narrador` (la lógica de la v1.1), la corrección de los temporizadores por identidad y el `DialogoPrincipal` de la fase 2. El error y el cierre pasan por el `Narrador` como acontecimientos importantes normales (cada error tiene identidad propia, `error#1`, `error#2`…, así siempre sale).

**Progreso:** al resolver se llama a `Progreso.marcarCompletado(1)`; el menú de niveles ya desbloquea el siguiente. **Empezar de cero:** al entrar de nuevo al nivel 1 la investigación y la deducción son nuevas (comprobado: historial solo con `intro`, libreta vacía); las pistas del Registro se conservan (tras los recorridos seguían `n1-pista-huella` y `n1-pista-periodico`).

---

## 4. Pruebas automáticas

`node --test "pruebas/*.test.mjs"`: **223 pasan, 0 fallan** (antes 178).

| Archivo | Pruebas | Novedad |
|---|---|---|
| `deduccion.test.mjs` (nuevo) | 42 | Datos válidos y sin texto copiado; lógica aprobada; libreta (vacía, nombres, pistas con título y texto, pilas, resumen); disponibilidad con distintas combinaciones; **cada forma de error**; los casos "no valorados"; **no se puede ganar marcando todo** (se prueban *todas* las respuestas posibles —3 conclusiones × 1 o 2 pruebas— contra un oráculo independiente: acierta exactamente 6 en la pregunta 1 y 18 en la 2, ninguna con 3 o más); pregunta ya resuelta no vuelve a preguntarse; **independencia del orden** (las 5 040 órdenes de 7 sucesos dan la misma libreta; 720 órdenes de cada conjunto dan la misma disponibilidad; mismo resultado de respuestas); mezcla de opciones; el aviso; la ayuda de la libreta |
| `guion.test.mjs` | 9 | +3: textos de la deducción fijados, títulos de las pistas, informe/cierre/error sin cambios |
| `ayuda.test.mjs` | 21 | prioridad `libreta, marcas, pila, corriente` |
| El resto | igual | investigación 38, mapa 21, narrativa 17, temporizadores 16, visibilidad 16, movimiento 13, narración 10, marcas 8, progreso 6, registro 6 |

---

## 5. Verificación en el navegador

Se jugó con **teclas y ratón reales** (Tab, E, Espacio, flechas/WASD, clics). Para no caminar un minuto entre cada objeto solo se teletransportó al inspector junto al objeto (un script que mueve el cuerpo) y se leyó el estado del juego; todo lo demás —apuntar la linterna con el ratón, descubrir, usar E, leer, abrir la libreta, elegir y presentar— fue entrada real.

| Recorrido | Qué se hizo | Resultado |
|---|---|---|
| **Rápido** | Solo el polvo y la ventana. Cerrar la revelación. Esperar. | El aviso se abrió **1,50 s** después de terminar la revelación (medido: 1 502 ms; en otras partidas 1 505 y 1 503 ms). "Resolver el caso" con teclado; opciones mezcladas; pregunta 1 con Ventana rota; pregunta 2 con Polvo removido → cierre → informe "Pistas: 0 de 2 · Pilas: no encontradas". Cortinas calmadas (`calma 0`, sombras 0), ayuda apagada, nivel 1 en el progreso. |
| **Completo** | Huella, pilas, recorte, cortinas, polvo, arrastre (examinadas), pila de cajas y ventana. Libreta con Tab antes del último hallazgo; luego todo con **ratón**. | La libreta mostró los 5 hallazgos sin "Resolver el caso" (aún sin la ventana); con la ventana, aviso a los 1,50 s. Al marcar una **tercera prueba** la rechazó con "Como máximo 2 pruebas…". Pregunta 1 con Ventana + Cajas; pregunta 2 con Cajas movidas + HUELLA DE BOTA. Tab durante el cierre no abrió nada. Informe "Pistas: 2 de 2 · Pilas: encontradas". "Siguiente habitación" → "Habitación 2 · En construcción". También se vio la causa antes que la consecuencia: la nota `comentario:0` salió y la revelación `revelacion:0` 1,2 s después. |
| **Con errores** | Hallazgos: polvo, ventana y recorte. (1) Conclusión equivocada ("Alguien las mueve desde detrás") con Ventana rota; (2) conclusión correcta con el RECORTE como única prueba; (3) correcta con Ventana; luego pregunta 2 correcta. | Los dos primeros dieron la línea de error exacta como importante y volvieron a **la misma pregunta** (paso de la conclusión, con las opciones en el mismo orden). El tercero resolvió la pregunta 1 y no volvió a preguntarse. Cierre e informe "Pistas: 1 de 2". Dos errores, sin ningún castigo. |
| **Seguir investigando** | Polvo + ventana; aviso; "Seguir investigando"; esperar sin tocar nada; Tab; resolver. | Quedó el ícono 📒 + TAB en la esquina (captura 09), latiendo suave y el juego siguió. A los 45 s la ayuda pasó a `libreta` y el ícono latió más fuerte (fuerza 1). Tab abrió la libreta con "Resolver el caso" y "Cerrar", y reinició la ayuda (cuenta 0, sin refuerzo). Resolver → cierre → informe. En esta partida las pistas del Registro de las anteriores seguían guardadas. |

Comprobaciones puntuales:

- **Esc paso a paso** (teclas reales): pruebas → conclusión → libreta → juego, sin salir del nivel.
- **Nivel 2 desbloqueado:** captura 08 (menú con "1. El Pasillo Oscuro ✔" y el nivel 2 habilitado; 3 a 6 con candado).
- **Consola:** sin errores en todo el proceso.
- **FPS:** con la ayuda de la libreta activa, **180 FPS** (pantalla de 180 Hz), cuadro p99 **5,8 ms**, peor **5,9 ms** (1 080 cuadros en 6 s). Con la libreta abierta, 180 FPS, p99 5,7 ms, peor 6,0 ms. Muy por encima de 60.

### Errores que aparecieron al jugar de verdad y ya están arreglados

1. **Tab abría y cerraba la libreta con la misma pulsación.** Phaser avisa primero a `keydown-TAB` (la abre) y después al `keydown` general (con la libreta ya abierta, la cerraba). Cada pulsación ahora se marca como "del cuaderno" o "del juego" según el estado con que llegó.
2. **El Espacio que cerraba la línea de error elegía además la primera conclusión.** Mismo origen: el Espacio reabría el cuaderno y el mismo evento llegaba luego al cuaderno ya abierto. Lo cubre el mismo arreglo.
3. **Una pulsación movió el foco dos veces** (en el recorrido con errores, un "Presentar pruebas" cayó en "Volver"). No pude reproducirlo con teclas limpias; lo más probable es una repetición de teclado. Por eso el cuaderno ahora **ignora las teclas repetidas**. Los recorridos rápido y completo se jugaron antes de este último ajuste; el de "seguir investigando" ya con el código final, con todo el flujo de teclado.
4. Detalles de maquetación: el texto de los botones no estaba centrado en vertical y la pista de teclas quedaba pegada a los botones.

---

## 6. Capturas

Tamaño de la vista del navegador (800×563 con las franjas negras del lienzo 16:9), en `docs/fase3/capturas/`.

| Archivo | Qué muestra |
|---|---|
| `01_aviso_de_la_libreta.jpg` | La libreta abierta sola con todos los hallazgos y los botones "Resolver el caso" / "Seguir investigando" |
| `02_libreta_con_los_hallazgos.jpg` | La libreta abierta con Tab antes de tener la ventana: pruebas y pistas con su texto, sin botón de resolver |
| `03_eleccion_de_la_conclusion.jpg` | Pregunta 1, conclusión entre 3 opciones en orden mezclado (la correcta en tercer lugar) |
| `04_eleccion_de_las_pruebas.jpg` | Paso 2 con 2 pruebas marcadas, el aviso de máximo 2 y "Presentar pruebas" |
| `05_un_error.jpg` | La línea de error como texto importante |
| `06_el_cierre.jpg` | El cierre completo sobre el pasillo (las cortinas ya calmadas) |
| `07_pantalla_del_informe.jpg` | El informe: título, texto exacto, "Pistas: 2 de 2", "Pilas: encontradas", botones |
| `08_menu_con_el_nivel_2_desbloqueado.jpg` | El menú de niveles con el nivel 1 ✔ y el 2 desbloqueado |
| `09_icono_de_la_libreta_seguir_investigando.jpg` | Extra: el ícono de la libreta con su tecla, en la esquina, tras "Seguir investigando" |

---

## 7. Lo pendiente y lo que no se verificó

- **Commit:** pendiente de que autorices (paso 0 vacío).
- **El latido del ícono se verificó por estado, no a ojo:** que el latido "fuerte" se note frente al suave está medido (fuerza 0 → 1, mayor escala y halo), pero solo lo vi en capturas fijas.
- **Las cortinas calmadas** se comprobaron por estado (`calma 0`, sombras en 0) y en la captura 06. El polvo del haz sigue derivando hacia la ventana (no se calmó: el diseño pide detener el fenómeno de las cortinas).
- **Teletransporte:** el recorrido entre objetos no se caminó con teclas en estos recorridos (sí en la fase 2).
- **Solo escritorio:** no se midió un teléfono real y no se probó el control táctil (fase 7).
- **Provisional:** todas las pantallas son provisionales. Falta el retrato, la caja de novela visual, la música y el efecto de luz del cierre (fase 4). "Siguiente habitación" lleva a una pantalla "En construcción".
- **Orden de la libreta:** muestra las pruebas siempre en el orden de las reglas del nivel, no en el que se encontraron (así la libreta no depende del orden). Si prefieres orden cronológico, es un cambio pequeño.
- **Informe:** solo "Pistas: X de 2" y "Pilas"; las marcas descubiertas y el tiempo que mencionaba el diseño original no están (no se pidieron para esta fase). Cuentan lo hallado en esa partida, no lo guardado en el Registro.
- **Niveles 2 a 6:** su deducción (`deduccion` en narrativa y reglas) llega con su fase; el código ya es general (se carga por nivel).
- **README:** sigue describiendo la v1.1 (fase 7). Tiled no se abrió.
- **`DISENO_V2.md`:** anotados la sección 5 del nivel 1 aprobada, sin castigo por error, el aviso automático de la libreta y el paso directo al informe tras el cierre (secciones 3, 5, 7 y 13).

(Esta sección 8 es del arreglo 3.1; la revisión pendiente es la de la fase 3 y este arreglo.)


---

## 8. Arreglo 3.1: alcance de las acciones

**Commit:** no se hizo (el paso 0 volvió a llegar con "Autorizado" vacío): las fases 0 a 3 y este arreglo siguen sin commitear. Sin push, tags ni ramas. No se tocó el PDF, el PPTX ni `assets/img/screenshot_*.jpg`.

### El fallo y su causa

Estando lejos de la ventana, E activaba "Detrás de las cajas está la ventana rota…" y con eso se abría la deducción. Era como lo describiste: la zona `mirar-detras` ocupaba todo el hueco entre la pila y el muro (128×128), todas las acciones se activaban desde 70 px (el recorte, 110 px) medidos hasta el borde de rectángulos grandes, y no importaba hacia dónde mirara el inspector. En la fase 3 se teletransportó al inspector junto a cada objeto, por eso no se vio. Esta vez la verificación se hizo **caminando**.

### La regla nueva

`src/motor/Alcance.js` (sin Phaser). Una acción es posible, y aparece el ícono E, solo si se cumplen las **tres** a la vez:

1. **Cerca:** los pies a ≤ **40 px** de la zona del objeto. Un solo valor general (`ALCANCE_DE_ACCION`, configurable); cada objeto puede bajarlo con su propiedad `distancia` pero nunca superarlo (el mapa ya no tiene 70, 84 ni 110).
2. **De frente:** la dirección de la linterna apunta al objeto dentro de ±60° (hacia el punto de su zona más cercano a los pies; si no, hacia su centro).
3. **Con luz:** el cono o el halo que rodea al inspector toca alguna parte del objeto, y nada lo tapa.

Funciones: `alcanceDeAccion(pies, direccion, zona, iluminado)` → `{ posible, razon: 'lejos' | 'de-espaldas' | 'a-oscuras' }`, `elegirAccion(...)` (entre varios, gana el más cercano y de frente) y `zonaDeAccion(objeto, muebles)`. Las pilas y las pistas en el suelo siguen la misma regla. La escena (`Habitacion.buscarCandidato`) solo la llama.

**Una decisión que conviene que revises: "con luz" cuenta el halo, no solo el cono.** Pegado al muro (el mínimo posible: pies a y = 274) el origen de la linterna queda a ~1 px de la pared, y ahí el cono solo cubre ±0,6 px de muro: con "solo cono" ni la ventana ni las cortinas se podrían usar desde 40 px. El halo de 120 px ya existe (es la luz ambiente que se ve alrededor del inspector). Con él, lo que está a la vista cerca no está "a oscuras" y lo que tapa un mueble o una pared sí. La función de luz es `zonaIluminada` (rejilla de un punto cada 4 px; el parámetro `halo` es opcional y los demás usos siguen siendo solo-cono). Si prefieres solo cono, es quitar un argumento, pero las cortinas y la ventana pasarían a ser casi imposibles de usar.

### Cambios en el mapa (`docs/fase2/generar_mapa_nivel1_referencia.py` → `assets/mapas/nivel1.json`)

- **`mirar-detras`**: ya no es el hueco entero. Es una **franja de 96×40 px** (x 1936–2032, y 256–296: la ventana 4 ocupa x 1952–2016, con 16 px de margen a cada lado), pegada al muro. `distancia 0`: hay que estar dentro. `mira` = el centro de la ventana (1984, 200). `luz` = el suelo al pie de la ventana.
- **Pila (`examinar`)**: se usa desde el frente; la luz tiene que tocar el suelo justo delante de ella (el frente de la pila queda tapado desde atrás y desde los lados).
- **Cortinas**: el objeto pasa a ser el muro con sus cortinas (y 150–258); se usan pegado al muro. Propiedad nueva `enPared`.
- **Recorte**: vuelve a alcance normal. Está sobre la consola (`sobre`), así que se usa desde la consola: de pie frente a ella, a ≤ 40 px de su borde frontal.
- Marcas de arrastre, huella y pilas: sin `distancia` propia (40 px).

### Dónde funciona cada cosa (jugando, caminando)

Medido en el juego real, con la regla activa (`dist` = distancia de los pies a la zona).

| Objeto | Funciona (icono + E) | No funciona |
|---|---|---|
| **Mirar detrás de las cajas (ventana rota)** | Dentro de la franja bajo la ventana (x 1936–2032, y 274–296), mirándola. Probado en (2001, 285), mirando a la ventana. Al subir por detrás de la pila el ícono apareció justo al entrar en la franja (y = 291) | Fuera de la franja: (1977, 314) a 18 px → lejos; (1977, 325) mirando arriba, con luz → lejos; detrás de la pila a ~136 px de la ventana, (1975, 374) y (2070, 374) → lejos, pulsar E no hizo nada (`acciones` no cambió). Dentro de la franja pero de espaldas (mirando al sur, 130°) o de lado (oeste, 77°) → no |
| **Pila de cajas (examinar)** | Desde el frente: (1995, 478), 30 px, mirando al norte (desvío 21°) | (1995, 494) a 46 px → lejos; de espaldas → no; desde un flanco, aunque esté a 13 px y mirándola: (1907, 440) y (2061, 402) → a oscuras (la pila tapa su cara); desde atrás (1977, 352) → no |
| **Cortinas** | Pegado al muro: (446, 274), 16 px, mirando al norte | De espaldas, a 25 px del muro, (446, 289) → no (72°); (446, 393) a 135 px, mirándolas con luz → lejos |
| **Marcas de arrastre** (se examinan) | (1779, 347), 11 px, mirando al norte | (1779, 359) mirando al este (90°) → no |
| **Huella de bota** | (300, 557), 17 px, mirando al norte | (300, 576), a 36 px pero mirando al este (90°) → no |
| **Recorte de periódico** | De pie frente a la consola, mirándola: (1250, 359), a 39 px del borde frontal | (1250, 370), a 50 px → lejos; de espaldas → no |
| **Pilas (rincón)** | (446, 584), 12 px, mirando al sur | (446, 557) a 39 px pero mirando al este (90°) → no |

Además, **la deducción solo apareció después de mirar de verdad la ventana**: antes (con la huella, el recorte, el polvo y las marcas, es decir, con todo lo del pasillo menos la ventana) `deducción disponible` seguía en falso; con la revelación de la ventana pasó a verdadero y el aviso se abrió solo 1,5 s después de cerrar el texto.

### Cómo se verificó

- Dos recorridos del nivel caminando con teclas mantenidas y el ratón para apuntar la linterna (ningún teletransporte): el primero de principio a fin hasta el informe (con detrás de la pila por el oeste y el este, la franja, de espaldas, los siete objetos, la deducción con teclas reales y el cierre); el segundo, recorriendo la pila (flanco oeste, frente, flanco este, detrás) y subiendo hasta la franja.
- **La E que cierra un texto no activa también una acción:** se comprobó dos veces (la revelación de la ventana y la de las cajas, de pie junto a lo que las provoca): al cerrar el texto con E el contador de acciones no cambió. El código ya lo impide (`alPulsarE` avanza el texto *o* usa lo que tiene al lado, nunca las dos; y lo de Tab y Espacio ya estaba arreglado marcando cada pulsación). No hizo falta corregir nada.
- Consola: sin errores (vigilados `console.error` y `window.onerror`).

### Pruebas

`node --test "pruebas/*.test.mjs"`: **247 pasan, 0 fallan** (223 antes).

- **`alcance.test.mjs` (nuevo, 16):** lejos; cerca pero de espaldas; cerca, de frente y a oscuras; cerca, de frente y con luz; el límite exacto (40 sí, 41 no); un objeto puede bajar el alcance pero no superarlo; ±60° (59° sí, 61° no); un objeto largo visto desde su extremo; "sobre un mueble", "mira" y "luz"; dos objetos cerca (gana el de frente y más cercano, sin importar el orden); `zonaIluminada` (cono, halo, tapado, lejos).
- **`mapa.test.mjs` (29, antes 21):** la franja es pequeña y está bajo la ventana con 16 px de margen; nada pide más de 40 px; **cada objeto se puede usar desde alguna posición alcanzable, de frente y con la luz real** (con el radio nuevo); **detrás de la pila a 140 px de la ventana no hay ninguna acción, mire hacia donde mire** (36 direcciones); en la franja mirando a la ventana → sí, mirando hacia abajo o de lado → no; la pila solo desde el frente; cortinas, huella, recorte, pilas y marcas.

### Capturas

| Archivo | Qué muestra |
|---|---|
| `10_arreglo_3-1_detras_de_la_pila_sin_icono.jpg` | Detrás de la pila (esquina noreste), lejos de la ventana, con la linterna apuntando a ella: sin ícono; E no hizo nada |
| `11_arreglo_3-1_debajo_de_la_ventana_con_icono.jpg` | En la franja bajo la ventana, mirándola: aparece el ícono E |
| `12_arreglo_3-1_de_espaldas_a_la_ventana_sin_icono.jpg` | En la misma franja, de espaldas a la ventana: sin ícono; E no hizo nada |

### Lo que no se pudo verificar y lo pendiente

- **FPS:** no pude medir los cuadros por segundo reales. El panel del navegador estaba oculto (la sesión no estaba abierta en una ventana) y el navegador deja en ~3 cuadros por segundo las páginas en segundo plano. Por eso detuve el bucle del juego y lo hice avanzar cuadro a cuadro desde un script, con el mismo código de la escena (física, luz, cámara, entrada). Lo que sí medí es el coste de cada cuadro: **medio 0,98 ms, p99 2,1 ms**, y solo 5 de 4 169 cuadros pasaron de 8 ms (dos de unos 19 ms, en los cambios de escena). Eso deja margen de sobra para 60 FPS, pero no es una medida de FPS reales: en la fase 3 medí 180 FPS con el panel visible y esta regla añade unas pocas comprobaciones por cuadro.
- **Teclas y ratón:** E, Espacio, Esc y el ratón fueron reales; las teclas de movimiento mantenidas las inyecté como eventos de teclado (keydown/keyup) porque el cliente solo pulsa y suelta.
- **El ícono del recorte** también aparece mirando la consola desde su costado oeste (a 13 px): se usa "desde la consola". Es coherente con la regla (cerca, de frente y con luz), pero conviene que lo sepas.
- **Una vez hecha la revelación de la ventana, el ícono sigue apareciendo en la franja** (la acción se puede repetir sin efecto narrativo, como desde la fase 2). Si prefieres que desaparezca cuando ya no produce nada, es un cambio aparte.
- Las capturas son la vista del navegador (800×563 con las franjas del lienzo 16:9).

Espero tu revisión antes de la fase 4.


---

## 9. Arreglo 3.2: pruebas que no tienen nada que ver

**Commit:** no se hizo (el paso 0 volvió a llegar con "Autorizado" vacío): las fases 0 a 3 y los arreglos 3.1 y 3.2 siguen sin commitear. Sin push, tags ni ramas. No se tocó el PDF, el PPTX ni `assets/img/screenshot_*.jpg`; el `Narrador` y la corrección de los temporizadores, sin cambios.

### El fallo

`Deduccion.js` daba por buena una respuesta si las pruebas elegidas *contenían* una combinación válida. Por eso "Ventana rota + Cajas movidas" resolvía "¿Qué mueve las cortinas?" aunque las cajas no tengan nada que ver con las cortinas (así se resolvió la pregunta 1 en el recorrido completo de la fase 3).

### La regla nueva (`src/motor/Deduccion.js`, general, no solo del nivel 1)

Una respuesta es correcta solo si se cumplen las tres:

1. la conclusión es la correcta;
2. las pruebas elegidas forman al menos una combinación válida;
3. **todas** las pruebas elegidas son pertinentes a esa pregunta: las que aparecen en alguna de sus combinaciones válidas.

Si alguna no tiene nada que ver, la respuesta es `error` (motivo `ajena`), con la misma línea de error y sin castigo. El motivo `pruebas` queda para "pertinentes, pero no forman una combinación válida" (por ejemplo, la cuerda sola cuando hace falta la cuerda y el fuelle). El máximo de 2 pruebas sigue igual.

Resultado en el nivel 1:

| Pregunta | Vale | Es error |
|---|---|---|
| 1. ¿Qué mueve las cortinas? | **Ventana rota sola** | Ventana + cualquier otra prueba; cualquier otra sin la Ventana |
| 2. ¿Por qué parecía embrujado? | 1 o 2 de {Cajas movidas, Marcas de arrastre, Polvo removido, HUELLA DE BOTA}: 4 de una prueba + 6 parejas | Con el RECORTE DE PERIÓDICO o con la Ventana rota |

### Interfaz

- El texto del paso 2 ya no revela cuántas pruebas hacen falta: **"Elige las pruebas que la respalden (máximo 2)"**. El aviso de máximo ("Como máximo 2 pruebas…") y el tope de 2 siguen igual.
- **El ícono E no aparece sobre lo ya usado.** Nuevo `Investigacion.hayAlgoNuevo(objeto, accion, lado)`: una acción cuyo hecho ya ocurrió no produce nada (ninguna regla sale dos veces por el mismo hecho), así que la escena no la ofrece. Pasa con mirar la ventana tras la revelación, examinar de nuevo las cajas, las marcas o las cortinas (sus tres zonas comparten referencia). Lo que todavía puede dar algo no cambia. Las pistas y las pilas ya desaparecían al recogerse.
- El halo como luz (arreglo 3.1): se queda como estaba.

### Pruebas

`node --test "pruebas/*.test.mjs"`: **256 pasan, 0 fallan** (247 antes).

- `deduccion.test.mjs` (48, antes 42):
  - **Oráculo actualizado** (se prueban todas las respuestas posibles —3 conclusiones × 1 o 2 pruebas— contra un oráculo independiente que exige conclusión, combinación completa y pruebas pertinentes): con la conclusión correcta acierta **exactamente 1** en la pregunta 1 (Ventana sola) y **exactamente 10** en la 2 (4 de una prueba + 6 parejas).
  - **Casos explícitos:** Ventana + Cajas en la pregunta 1 → error; Polvo + Recorte en la 2 → error; Ventana en la 2 → error; Cajas + Huella en la 2 → correcta. También cada prueba ajena junto a la Ventana en la 1, y cada pareja del pasillo en la 2.
  - **Caso general con combinaciones de dos pruebas** (una habitación inventada con cuerda + fuelle): la combinación exacta → correcta (en cualquier orden); una de las dos sola → error (`pruebas`); la combinación más una ajena → no se puede (máximo 2); una ajena más una pertinente → error (`ajena`); con varias combinaciones, cada una vale por sí sola, media combinación no basta y una prueba de otra pregunta es ajena; y se vuelven a probar todas las respuestas posibles contra el oráculo.
  - Los motivos de error (`conclusion`, `ajena`) y la disponibilidad (sigue pidiendo una combinación completa) se actualizaron.
- `investigacion.test.mjs` (38 → 40): `hayAlgoNuevo` (antes y después de usar la acción, lados, lo que aún no se puede hacer, lo recogido).
- `alcance.test.mjs` (16 → 17): **tras la revelación de la ventana, en la franja ya no hay candidato**, y lo que sigue dando algo no cambia (la pila se examina desde el frente hasta que se examina).

### Verificación en el navegador

Esta vez el panel estaba visible: el juego corrió a su velocidad normal. Para llegar a la deducción preparé los hallazgos con los sucesos reales del juego (la investigación caminando se verificó en el arreglo 3.1); la deducción se jugó con **teclas reales** hasta el informe.

| Paso | Resultado |
|---|---|
| Pregunta 1: "La corriente" + **Ventana + Cajas** | **Error** (la línea exacta de la narrativa) y vuelve a la misma pregunta, con las opciones en el mismo orden |
| Pregunta 1: "La corriente" + **Ventana sola** | **Resuelta**; pasa a la pregunta 2 |
| Pregunta 2: "Alguien desordenó el pasillo…" + **Polvo + Recorte** | **Error**; la pregunta 2 sigue sin resolver (2 errores en total, sin ningún castigo) |
| Pregunta 2: **Cajas + Huella** | **Resuelta** → cierre → informe; nivel 1 completado |

- **Consola:** sin errores (vigilados `console.error` y `window.onerror`).
- **FPS reales** (panel visible, 4 s en la pantalla del cierre): **180 FPS** (pantalla de 180 Hz), cuadro p99 5,7 ms, peor 5,7 ms.
- **No re-caminé** lo del ícono tras la revelación: se comprueba con la prueba automática (`alcance.test.mjs`) y la función que usa la escena.
- El texto nuevo ("Elige las pruebas que la respalden (máximo 2)") se ve en la captura 13a.

### Capturas

| Archivo | Qué muestra |
|---|---|
| `13a_arreglo_3-2_ventana_y_cajas_para_las_cortinas.jpg` | Pregunta 1 con "Ventana rota" y "Cajas movidas" marcadas, y el texto nuevo sin pista del número de pruebas |
| `13b_arreglo_3-2_error_por_prueba_ajena.jpg` | El resultado: la línea de error como texto importante |

Espero tu revisión.


---

## 10. Arreglo 3.3: no perder lo resuelto

**Commit:** no se hizo (el paso 0 volvió a llegar con "Autorizado" vacío): las fases 0 a 3 y los arreglos 3.1, 3.2 y 3.3 siguen sin commitear. Sin push, tags ni ramas. No se tocó el PDF, el PPTX ni `assets/img/screenshot_*.jpg`; el `Narrador` y la corrección de los temporizadores, sin cambios.

### Qué ya funcionaba y qué no

Dentro del nivel, lo resuelto ya se conservaba (`Deduccion` guarda las resueltas y `preguntaActual()` da la primera pendiente). Los dos problemas eran de la escena y de lo que se veía:

1. **Esc sacaba del nivel sin avisar.** En el juego, un Esc llamaba a `salir()` y llevaba directo al menú de niveles; al volver, el nivel empezaba de cero.
2. **No se veía que la pregunta 1 ya estaba resuelta.**

### Qué cambió

- **Esc en el juego abre un menú de pausa** (el juego se detiene: inspector, ayuda y notas quedan como estaban) con **"Continuar"** y **"Salir al menú"**. "Salir al menú" pide confirmación: **"Se perderá lo investigado en esta habitación. ¿Salir?"** con **"Salir"** y **"Cancelar"** (el foco empieza en "Cancelar", para no salir sin querer). Esc dentro del menú equivale a "Continuar" (y a "Cancelar" en la confirmación). Con teclado (flechas o WASD, E / Enter, Esc) y con ratón. Son textos de interfaz. Con la libreta abierta, Esc sigue retrocediendo un paso (de las pruebas a la conclusión, a la libreta, al juego) y recién el siguiente Esc abre la pausa. Durante un texto importante, Esc solo avisa de cómo continuar (ni sale ni abre la pausa). Abrir y cerrar la pausa no reinicia la ayuda (por código; no lo medí en el navegador).
- **La libreta muestra lo ya resuelto:** desde que hay una pregunta resuelta aparece una sección **"DEDUCCIÓN"** con cada pregunta resuelta, la conclusión elegida y una marca ✔. Las pendientes no se muestran: la libreta solo muestra lo logrado. (`Deduccion.logradas()`, con la conclusión de cada pregunta.)
- **Al abrir "Resolver el caso"** la cabecera dice la pregunta real: con la 1 resuelta, "Pregunta 2 de 2".

### Pruebas

`node --test "pruebas/*.test.mjs"`: **260 pasan, 0 fallan** (256 antes; `deduccion.test.mjs` pasa de 48 a 52).

- Pregunta 1 resuelta y pregunta 2 con error → `preguntaActual()` es la 2; después de nuevos hallazgos sigue siendo la 2; la 1 no se puede volver a responder (ni bien ni mal: "ya resuelta").
- La disponibilidad cuenta la pregunta 1 como resuelta aunque cambien las pruebas encontradas (con y sin la Ventana rota en la libreta, solo cuenta si hay prueba para la 2).
- `logradas()`: en el orden de las preguntas (aunque se resolviera primero la 2), un error no logra nada, lo pendiente no aparece y `reiniciar()` lo olvida.
- Un error en medio no deshace lo resuelto ni cambia el orden de lo pendiente.

### Verificación en el navegador (teclas reales y ratón; panel visible)

| Paso | Resultado |
|---|---|
| 1. Pregunta 1 con Ventana sola | **Resuelta**; la deducción sigue en la pregunta 2 ("Pregunta 2 de 2") |
| 1. Pregunta 2 con conclusión equivocada | **Error**; vuelve a la 2 (la 1 sigue resuelta) |
| 2. Esc → libreta; Esc → juego | Un Esc retrocede a la libreta y otro cierra la libreta: **no salió del nivel**. Caminé con teclas mantenidas hasta la huella y la recogí con E |
| 2. Un Esc más, ya en el juego | Abrió el **menú de pausa**; no salió del nivel |
| 3. Tab | La libreta muestra "DEDUCCIÓN" con la pregunta 1 y ✔ |
| 4. "Resolver el caso" | Empieza en la **pregunta 2**; resuelta con la huella → cierre → informe |
| 5. Pausa | "Continuar" (con Esc, con E y con clic): vuelve al juego con todo igual (posición, hallazgos, preguntas resueltas). "Salir al menú" → "Cancelar" (con E, con Esc y con clic): vuelve a la pausa sin perder nada |
| 5. "Salir" | Con la confirmación aceptada sale al menú de niveles; al volver a entrar la investigación empieza de cero (solo `intro`) |
| Durante un texto importante | Esc no salió ni abrió la pausa |

- **Consola:** sin errores.
- **FPS reales** (panel visible, en el cierre): **180**, p99 5,7 ms, peor 5,8 ms.
- En la primera pasada, una pulsación de E no llegó a marcar una prueba; no volvió a pasar en las demás y no he podido reproducirla (puede ser de cómo se envían las teclas, no del juego).
- Al ver la confirmación noté que el texto rozaba los bordes del recuadro; lo bajé de 24 a 21 px y la captura 17 es la corregida.
- Preparé los hallazgos iniciales (el polvo y la ventana) con los sucesos del juego para llegar a la deducción; la investigación caminando se verificó en el arreglo 3.1.

### Capturas

| Archivo | Qué muestra |
|---|---|
| `14_arreglo_3-3_libreta_con_la_pregunta_1_resuelta.jpg` | La libreta con la sección "DEDUCCIÓN": ¿Qué mueve las cortinas? ✔ y su conclusión; la pregunta 2 no aparece |
| `15_arreglo_3-3_la_deduccion_empieza_en_la_pregunta_2.jpg` | "Resolver el caso" empieza en "Pregunta 2 de 2" |
| `16_arreglo_3-3_menu_de_pausa.jpg` | El menú de pausa (Esc en el juego) |
| `17_arreglo_3-3_confirmacion_de_salida.jpg` | La confirmación de salida |

Espero tu revisión.
