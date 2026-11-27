# Informe de la fase 5a — La cocina (nivel 2, «El Fantasma de la Cocina»)

Rama `v2-investigacion`. **Nada está commiteado** (el «Autorizado» del PASO 0 llegó en blanco). Esperando tu revisión; no se
empezó la fase 4 ni ninguna otra habitación.

## 1. Qué se hizo

### Escena generalizada (PASO 1)
- `src/escenas/Habitacion.js` ya no es «el pasillo»: recibe `numeroDeNivel` y carga `mapaN`, `investigacionesN` y `narrativaN`.
  Lo común (movimiento, linterna, alcance, libreta, deducción, narrador, ayuda, pausa, informe) vive ahí; lo propio de cada
  habitación vive en un módulo de `src/presentacion/habitaciones/` con la misma interfaz:
  `crear()`, `actualizar(dt, tiempo, {pausado})`, `aplicarAyuda(efecto)`, `alResponder(u, terminado)`, `calmar()`, `depurar()`.
  - `Pasillo.js`: lo que antes estaba dentro de la escena (cortinas, polvo en el haz, pistas de ayuda). Sin cambios de comportamiento.
  - `Cocina.js`: velas, ollas, golpes, cuerda, fuelle, animación de la alacena, efectos de ayuda.
  - `index.js`: `crearHabitacion(n, escena)`.
- `MenuNiveles`: abre `Habitacion` para los niveles con mapa (1 y 2, `esJugable` en `src/motor/niveles.js`) y `EnConstruccion` para
  el resto. El informe del nivel 1 → «Siguiente habitación» lleva a la cocina.
- `src/motor/Investigacion.js` acepta las acciones `rodar` y `tirar` (hechos `rodo:X`, `tiro:X`) y el hecho `oyo-cerca:X`, todas con
  `requiere`. `tirar` puede ser `repetible`. Sin Phaser, con tests.
- `src/motor/Fenomeno.js` (nuevo): ciclo de golpes (el primero a los 4 s; luego cada 7–12 s), `golpeCerca` (120 px) y la llama de
  las velas. `src/motor/Mapa.js` / `Alcance.js`: polilíneas, `velas`/`ollas`/`cuerdas`, `desplazarMueble`, `desplazarObjeto`.

### Mapa (PASO 2) — `assets/mapas/nivel2.json` (generado por `docs/fase5/generar_mapa_nivel2.py`)
Cocina de 22×6 baldosas y un rincón al sureste para las pilas. Contra el muro norte, de oeste a este: vitrina (copas), **alacena con
ruedas**, chimenea, fregadero (platos, taza) y cocina (sartén). La **mesa** con las 3 velas y el recibo está en medio. El **fuelle**
está en el muro, sobre la mesa. La **cuerda** sale detrás de la alacena, corre por lo alto del muro y baja al fuelle. La **mancha
de aceite** solo se ve con luz. Cada objeto usable se alcanza desde cerca (40 px), de frente (±60°) y con luz; nada está tapado.

### Reglas (PASO 3) — `assets/investigaciones/nivel2.json` (sin texto)
Cada regla apunta a una línea de `assets/narrativa/nivel2.json`. No se escribió ningún texto nuevo salvo la deducción que aprobaste.

### Deducción (PASO 4)
- `assets/narrativa/nivel2.json` → `deduccion`: exactamente el texto aprobado (preguntas, opciones y nombres de pruebas).
- `pruebas/guion.test.mjs` actualizado; `DISENO_V2.md` sección 5 corregida (la pregunta 2 con tilde, «¿Quién lo construyó trabaja solo?»,
  válida solo con *Platos para dos*) y sección 13 marca los niveles 1 y 2 como aprobados.

## 2. Cada línea del nivel 2: disparador y orden

| Línea (id) | Se dispara cuando… | Depende de |
|---|---|---|
| `intro` | el inspector entra | — |
| `comentario:0` («…ruedas…») | examina la **alacena** (E, cerca, de frente, con luz) | — |
| `comentario:1` («…aceite de máquina…») | examina la **mancha de aceite** | tenerla iluminada (aparece al alumbrar) |
| `comentario:2` («…poleas…») | un golpe del fenómeno ocurre con el inspector a ≤ 120 px de la alacena (`oyo-cerca:alacena`) | estar cerca en el momento del golpe |
| `revelacion:0` («…cuerda…») | rueda la alacena (E, una sola acción con animación fija) | haber examinado la alacena |
| `revelacion:1` («…fuelle…») | examina el fuelle | alacena rodada (el fuelle y la cuerda se ven recién entonces) |
| `mueble:n2-mueble-copas` · `-platos` · `-sarten` | examina ese mueble | — |
| `pista:n2-pista-recibo` · `-taza` | recoge la pista | — |
| `bateria` | recoge las pilas | — |
| *Tirar de la cuerda* (sin línea) | E sobre la cuerda; repetible, sacude la cuerda y fuerza un golpe | alacena rodada y fuelle examinado |

Causa antes que consecuencia: si en una misma acción salen una secundaria y una importante, el narrador cuenta primero las causas y
después la revelación (1,2 s después).

### Orden en dos recorridos reales (caminando, sin teletransporte)
- **Recorrido A (directo):** `intro` → `comentario:2` → `comentario:0` → `revelacion:0` → `revelacion:1` → `mueble:n2-mueble-platos`
  → deducción disponible.
- **Recorrido B (completo):** `intro` → `comentario:1` → `mueble:n2-mueble-sarten` → `pista:n2-pista-taza` → `pista:n2-pista-recibo`
  → `bateria` → `comentario:2` → `mueble:n2-mueble-copas` → `comentario:0` → `revelacion:0` → `revelacion:1` → `mueble:n2-mueble-platos`.

El orden entre las secundarias es libre (las reglas se disparan una sola vez, en cualquier orden). Ojo: `comentario:2` puede salir
antes que `comentario:0` si el golpe te pilla cerca de la alacena antes de examinarla; es intencional.

## 3. La ayuda (sin texto)
Tras 45 s sin novedades, un refuerzo cada vez, con esta prioridad: **libreta** (deducción disponible) › **onda** (hasta
`comentario:0`) › **ruedas** (hasta `revelacion:0`) › **cuerda** (hasta `revelacion:1`) › **platos** (hasta examinarlos). Al
`cierre` la ayuda se apaga (`apagar()`) y la cocina se calma (`calmar()`: sin golpes, velas firmes).

## 4. Pruebas automáticas
`node --test "pruebas/*.test.mjs"` → **304 pasan, 0 fallan**.

| Archivo | Pasan | | Archivo | Pasan |
|---|---|---|---|---|
| alcance | 17 | | mapa | 29 |
| ayuda | 21 | | marcas | 8 |
| **cocina (nuevo)** | **33** | | movimiento | 13 |
| deduccion | 52 | | narracion | 10 |
| **fenomeno (nuevo)** | **9** | | narrativa | 17 |
| guion | 11 | | progreso | 6 |
| investigacion | 40 | | registro | 6 |
| visibilidad | 16 | | temporizadores | 16 |

`cocina.test.mjs` cubre: cada línea una sola vez con su disparador; dependencias (no se rueda sin examinar, no hay fuelle sin
rodar…); `oyo-cerca` cerca/lejos; el oráculo (pregunta 1 con **exactamente 3** respuestas correctas y pregunta 2 con **exactamente 1**);
prioridad y apagado de la ayuda; alcanzabilidad de cada objeto del mapa tras mover la alacena; y que el nivel 1 sigue igual.

## 5. Verificación en el navegador (caminando con el teclado)

| Qué | Resultado |
|---|---|
| Menú → nivel 2 → `intro` | ✔ |
| Recorridos A y B completos (ver orden arriba) | ✔ |
| Mancha de aceite solo con luz | ✔ |
| Alacena rueda (E), cuerda y fuelle aparecen después | ✔ |
| Tirar de la cuerda (repetible) | ✔ |
| Ayuda ociosa | ✔ onda (a los 45 s reales); ruedas/cuerda/platos con `espera` acortada a 3 s |
| Deducción (2 preguntas, oráculo real) → `cierre` calma la cocina | ✔ |
| Informe: «Pistas: X de 2», pilas | ✔ |
| Menú: nivel 3 desbloqueado | ✔ |
| **Nivel 1 de punta a punta** → «Siguiente habitación» → cocina | ✔ (mismo comportamiento que antes) |
| Consola | sin errores nuevos en las pasadas finales |
| FPS reales (panel visible) | 180 FPS, p99 de 5,7 ms con la ayuda de la cocina activa |

Un error real aparecido y corregido durante la fase: `setLineWidth is not a function` en la onda del golpe (congelaba la escena de la
cocina). Se cambió por `aro.lineWidth = …`; ya no ocurre.

### Capturas (`docs/fase5/capturas/`)
1. `01_la_cocina_con_el_fenomeno.jpg` · 2. `02_la_mancha_de_aceite_descubierta.jpg` · 3. `03_la_alacena_rodada_con_la_cuerda.jpg` ·
4. `04_el_fuelle.jpg` · 5. `05_tirar_de_la_cuerda.jpg` · 6. `06_la_deduccion_de_la_cocina.jpg` · 7. `07_el_informe_de_la_cocina.jpg` ·
8. `08_el_menu_con_el_nivel_3_desbloqueado.jpg`

## 6. Pendiente / no verificado (en serio)
- Ayuda: solo `onda` se vio con los 45 s reales; `ruedas`, `cuerda` y `platos` se vieron con la espera acortada a 3 s; el efecto
  `libreta` está cubierto por tests, no visto en pantalla. En esa pasada una parte de la investigación se montó con `contar` por JS.
- Audio: solo el gancho `escena.events.emit('golpe')`; no hay archivos nuevos.
- Arte provisional (formas dibujadas por código), como en el pasillo.
- Las teclas muy rápidas con el `computer` a veces pierden pulsaciones; no se reprodujo como fallo del juego.
- El README sigue en la v1.1.
- **Commit no hecho.** Si lo autorizas, será un único commit con autor DonobanR y sin Co-Authored-By, sin tocar el PDF, el PPTX ni
  `screenshot_*.jpg`. El mensaje que preparé («fases 0 a 3: base de la v2 y nivel 1 jugable») ya no describe del todo el contenido
  (ahora incluye la cocina); dime si lo cambio.

---

# Arreglo 5a.1: maquetación

**Nada está commiteado** (el «Autorizado» del PASO 0 volvió a llegar en blanco). Esperando tu revisión.

## 1. La causa y qué se cambió

El fallo: en la deducción de la cocina, con todo encontrado, hay 8 pruebas; la lista crecía sin límite y la TAZA DE CAFÉ quedaba
debajo de «Presentar pruebas». No era un caso suelto: `Cuaderno.js`, `Informe.js` y los menús colocaban cada cosa en una posición
vertical fija (`PANEL.y + 184`, `PANEL.y + 392`, `yb = PANEL.y + PANEL.alto - 78`…), así que cualquier contenido más grande de lo
previsto se encimaba. Mi captura 06 no lo mostró porque se tomó con 4 pruebas; esta vez todo se verifica con el máximo.

| Qué | Dónde |
|---|---|
| **Función pura de maquetación** (sin Phaser): `apilar`, `repartirEnFilas`, `maquetarPantalla` (cabecera arriba, pie abajo, cuerpo con desplazamiento solo si hace falta; la pregunta enorme «cede» su bloque al cuerpo), cuentas del desplazamiento (el elemento enfocado se ve entero, indicadores ▲ ▼), `ubicarCaja`, `encontrarProblemas` | `src/motor/Maquetacion.js` |
| **Zona con desplazamiento**: máscara, rueda, ▲ ▼ pulsables, clics solo en lo que se ve | `src/ui/ZonaDesplazable.js` |
| **Pantalla en flujo**: mide los bloques (texto, fila, botón…), llama a la función pura y los coloca | `src/ui/Pantalla.js`, `src/ui/etiquetas.js` |
| Reescritas en flujo: libreta (normal, aviso y con DEDUCCIÓN), conclusión, pruebas, pausa y confirmación de salida | `src/presentacion/Cuaderno.js` |
| Reescritas en flujo: informe, MenuNiveles, EnConstruccion, MenuPrincipal (y créditos), Interludio | `src/escenas/*.js` |
| Panel de tarjetas: franja reservada para el indicador (nada se le encima) y etiquetas | `src/ui/PanelInvestigacion.js` |
| Caja de importantes: cabecera, texto y pista medidos y colocados con la función pura; si va arriba con tarjetas a la vista, se aparta de ellas | `src/ui/DialogoPrincipal.js`, `src/presentacion/Narracion.js` |
| **Revisor F6** | `src/presentacion/Revisor.js` |
| **Carga extrema** (`?carga=extrema`; F7 tarjetas, F8 caja) | `src/motor/cargaExtrema.js`, `src/presentacion/CargaExtrema.js` |
| **Recorrido** que pasa el revisor por todas las pantallas (`window.__recorrido()`, `window.__pantalla('…')`) | `src/presentacion/RecorridoDeRevision.js` |
| La regla, escrita para todas las fases | `DISENO_V2.md`, sección 14 «Reglas de interfaz» (y decisión 12) |

El Narrador y la corrección de los temporizadores no se tocaron. Las pruebas de `PanelInvestigacion`/`DialogoPrincipal` pasan sin
cambios; solo se amplió la escena simulada (`pruebas/escenaSimulada.mjs`) con `setData/getData`, que el código nuevo usa.

### Cómo se ve ahora (cambios visibles a propósito)
- Todo lo que puede crecer se desplaza: rueda del ratón, ↑ ↓ / RePág / AvPág / Inicio / Fin, e indicadores ▲ ▼ que solo aparecen
  si hay más contenido (y se pueden pulsar). En la libreta y el informe, si hay algo que desplazar, ↑ ↓ desplazan y ← → mueven
  entre los botones; si no, todo mueve el foco como antes. En las listas con foco (pruebas, opciones) el foco desplaza solo.
- Los botones y filas crecen con su texto. Los botones del informe pasan al estilo del cuaderno (azul con borde dorado al foco).
- Los menús se ven igual (se ampliaron ×1,2 en vez de escalar un lienzo, para que el flujo mida en píxeles reales).

## 2. Tabla «Maquetación»

Cada pantalla × (contenido real máximo, carga extrema) → solapes que encuentra el revisor (F6). «Objetos» = los objetos de
interfaz visibles que revisó (la parte oculta por una zona con desplazamiento no cuenta). **Solapes: 0 en las 40 casillas.**

| Pantalla | Contenido real máximo | Objetos | Solapes | Carga extrema | Objetos | Solapes |
|---|---|---|---|---|---|---|
| Menú principal | el de siempre | 6 | 0 | igual (no crece) | 6 | 0 |
| Créditos | el de siempre | 3 | 0 | igual | 3 | 0 |
| Preámbulo (Interludio) | el texto del preámbulo | 3 | 0 | igual | 3 | 0 |
| Menú de niveles | 6 niveles, 2 completados | 17 | 0 | igual | 17 | 0 |
| En construcción | — | 4 | 0 | igual | 4 | 0 |
| Libreta · pasillo, todo encontrado | 6 hallazgos | 16 | 0 | 25 pruebas + 10 pistas largas | 27 | 0 |
| Libreta · cocina, todo encontrado | 8 hallazgos | 18 | 0 | ídem | 27 | 0 |
| Libreta · aviso (cocina) | ídem | 18 | 0 | ídem | 27 | 0 |
| Libreta con sección DEDUCCIÓN | 8 hallazgos + pregunta 1 resuelta | 22 | 0 | ídem + las 2 preguntas con textos largos | 27 | 0 |
| Conclusión · cocina | pregunta y 3 opciones reales | 10 | 0 | pregunta ×3 y conclusión ×3 | 10 | 0 |
| Conclusión · pasillo | ídem | 10 | 0 | ídem | 10 | 0 |
| **Pruebas · cocina** | **las 8 de la cocina** | 32 | 0 | 25 pruebas + 10 pistas largas | 28 | 0 |
| Pruebas · pasillo | las del pasillo | 30 | 0 | 25 + 10 | 28 | 0 |
| Menú de pausa | — | 6 | 0 | igual | 6 | 0 |
| Confirmación de salida | — | 6 | 0 | igual | 6 | 0 |
| Informe · pasillo | el real (280 letras) | 11 | 0 | el más largo de los 6 ×4 | 9 | 0 |
| Informe · cocina | el real | 11 | 0 | ídem | 9 | 0 |
| Panel de tarjetas | nota + 2 rastros reales (nivel 1) | 12 | 0 | nota + 3 rastros largos (1316 px de contenido) | 6 | 0 |
| Caja de importantes | el importante real más largo (1 página) | 4 | 0 | texto enorme: 11 páginas, revisadas una a una | 4 | 0 |
| Tarjetas con la caja a la vez | tarjetas + importante real | 10 | 0 | tarjetas + 11 páginas | 4 | 0 |

La carga extrema (`src/motor/cargaExtrema.js`, probada en `pruebas/cargaExtrema.test.mjs`) sale de textos reales: la pregunta, la
conclusión y el informe más largos de los seis niveles (repetidos 3, 3 y 4 veces para llevarlos al límite), 25 pruebas con el
nombre más largo, 10 pistas con el texto más largo repetido 3 veces. No se inventó ninguna línea de historia.

Capturas (en `docs/fase5/capturas/`):
- `09_la_deduccion_de_la_cocina_con_8_pruebas_arriba.jpg` y `10_…_rueda_abajo.jpg`: la deducción de la cocina con las 8 pruebas.
  «Presentar pruebas» siempre visible; con la rueda se llega a la TAZA DE CAFÉ.
- `11_carga_extrema_la_libreta.jpg`, `12_carga_extrema_las_pruebas.jpg`, `13_carga_extrema_el_informe.jpg`,
  `14_carga_extrema_el_panel_de_tarjetas.jpg`, `15_carga_extrema_la_caja_de_importantes.jpg`.
- `16_el_revisor_f6_detecta_un_solape.jpg`: provoqué a propósito un solape (subí 16 px la línea «Tu conclusión» sobre la pregunta);
  el revisor lo marca en rojo y lo escribe en la consola. Lo quité y F6 ya no muestra nada.

## 3. Pruebas automáticas

`node --test "pruebas/*.test.mjs"` → **340 pasan, 0 fallan** (antes 304).
- `pruebas/maquetacion.test.mjs` (31): `apilar` y `repartirEnFilas`; `maquetarPantalla` con **1, 8 y 25 elementos** y con textos
  larguísimos (sin solapes y todo dentro del recuadro en cualquier desplazamiento); la zona con desplazamiento aparece **solo**
  cuando el contenido no cabe (incluido el caso justo); la cabecera y el pie no se mueven por mucho que crezca el cuerpo; la
  cabecera enorme cede su bloque; el foco desplaza hasta ver el elemento entero, hacia abajo y hacia arriba; indicadores ▲ ▼;
  `encontrarProblemas` (solapes, fuera del recuadro, lo de un botón dentro de su fondo); el caso exacto que falló (8 pruebas con
  2 pistas más altas); y `ubicarCaja` (la caja se aparta del panel).
- `pruebas/cargaExtrema.test.mjs` (5): los textos más largos son reales, 25 + 10, ids distintos.

## 4. Verificación en el navegador

| Qué | Resultado |
|---|---|
| Cocina con todo encontrado: deducción con las 8 pruebas | ✔ sin encimarse; ↓ por teclado desplaza solo (cada fila se ve entera, de 0 a 7 y de vuelta); rueda del ratón y clic en ▲; «Presentar pruebas» siempre visible |
| Clic en filas parcialmente visibles y en el borde entre la lista y el botón | ✔ marca la fila; el borde no activa nada |
| Pasillo con todo encontrado | ✔ (en la tabla) |
| F6 en cada pantalla, modo normal y de carga | ✔ 0 solapes (tabla); en una pestaña nueva, sin errores en la consola |
| **Nivel 1 jugado caminando**: huella de bota (ratón + E), ventana rota, aviso real, deducción con teclado, cierre, informe | ✔ |
| **Cocina jugada caminando** (ruta A: alacena → rodar → fuelle → platos), aviso real, deducción, cierre, informe | ✔; el informe de nivel 1 lleva a la cocina |
| Nivel 3 desbloqueado en el menú | ✔ |
| Pausa → Salir → Cancelar → Continuar con teclado | ✔ |
| Consola | ✔ limpia (pestaña nueva, con y sin carga extrema) |

Un fallo encontrado y arreglado en el camino: con el panel de tarjetas desbordado, al cerrar la escena el indicador ▼ ya estaba
destruido y salía `Cannot read properties of null (reading 'cut')` (el Narrador lo captura y lo registra). Era latente desde antes;
ahora el panel comprueba que el indicador existe.

## 5. Pendiente / no verificado
- **Cocina, ruta B** (taza, recibo, copas, sartén…) y la ayuda no se repitieron caminando en este arreglo. La tabla de maquetación
  deja lo encontrado con el motor de investigación (no caminando): lo que mide es la maquetación, no el recorrido.
- La **caja de importantes arriba con tarjetas a la vista** (el inspector en la mitad de abajo) está probada en la función pura
  (`ubicarCaja`), pero en el navegador el inspector estaba en la mitad de arriba, así que la caja salió abajo; no la vi apartada.
- La **rueda del ratón sobre el panel de tarjetas** (ya existía) no la volví a probar; sí el desplazamiento de la libreta, las
  pruebas y el informe.
- El **revisor** mide textos, imágenes y lo etiquetado (`src/ui/etiquetas.js`); un objeto de otro tipo sin etiqueta no se mira.
  Lo que queda bajo un velo modal (el cuaderno sobre el juego) no cuenta, a propósito.
- Táctil/móvil y distintos tamaños de ventana: no probados (el lienzo es 1280×720 escalado).
- README sigue en la v1.1. **Commit no hecho.**

---

# Arreglo 5a.2: una pregunta, una sola respuesta

**Nada está commiteado.** Esperando tu revisión. No se escribió ningún texto narrativo nuevo; no se tocó ningún texto de preguntas ni de opciones.

## 1. La regla

> **Cada pregunta tiene UNA sola respuesta válida**, formada solo por las pruebas que responden **directamente** esa pregunta. No hay
> respuestas alternativas con pruebas que hablan de otra cosa (quién lo hizo, cuándo, para qué): esas pertenecen a otra pregunta.

Escrita al comienzo de la sección 5 de `DISENO_V2.md`. En el pasillo: «¿Qué mueve las cortinas?» → solo *Ventana rota*.

## 2. Qué cambió en la cocina (solo `assets/investigaciones/nivel2.json`)

| Pregunta | Antes | Ahora |
|---|---|---|
| 1 · «¿Qué produce los golpes y apaga las velas?» | Cuerda + Fuelle, **o** Recibo + Cuerda, **o** Recibo + Fuelle | **Cuerda al techo + Fuelle escondido**, y nada más |
| 2 · «¿Quién lo construyó trabaja solo?» | Platos para dos | **Platos para dos** (igual) |

El **RECIBO DE FERRETERÍA** (dice quién compró las piezas, firmado «V», no qué produce los golpes) y la **TAZA DE CAFÉ** ya no están en
ninguna combinación: aparecen en la libreta, se guardan en el Registro al recogerlos (para la deducción final del nivel 6) y, si se
presentan, es error. Consecuencia buscada: el recibo solo ya no habilita la deducción; hacen falta cuerda, fuelle y platos.

`DISENO_V2.md`: la tabla del nivel 2 está corregida (y el párrafo de cómo salen las pruebas).

## 3. La excepción del pasillo — **pendiente de tu decisión**

La pregunta 2 del pasillo, «¿Por qué parecía embrujado?», acepta hoy **cualquiera** de: *Cajas movidas*, *Marcas de arrastre*, *Polvo removido*
o *HUELLA DE BOTA*. **No la cambié**: está marcada en `assets/investigaciones/nivel1.json` con `"excepcion"` (un comentario que explica que es
una excepción a la regla y que espera tu decisión), y la validación la admite solo por eso. Con la regla, su única respuesta sería
*Cajas movidas* (lo único que responde directamente por qué parecía embrujado; las marcas y la huella dicen cómo o quién). Si lo apruebas,
el cambio es una línea de datos y quitar `"excepcion"`.

## 4. Niveles 3, 4 y 6, revisados con la regla (sin cambiarlos) — **para tu aprobación**

Hoy no cumplen la regla. Para cada pregunta: las combinaciones que tiene hoy y cuál sería su única respuesta. Lo que sale de la respuesta
queda en la libreta, pero presentarlo sería error; a la derecha, de qué otra pregunta parece ser esa prueba (las del nivel 6 ya
tienen su pregunta: quién y para qué).

| Nivel · pregunta | Combinaciones que tiene hoy | Única respuesta propuesta | Las que quedan fuera (y de qué hablan) |
|---|---|---|---|
| **3** · ¿Por qué hay un candado nuevo en una puerta vieja? (3) | **Camino sin polvo + Huellas recientes** · **LLAVE DE LATÓN** · **Aceite para bisagras** | **Camino sin polvo + Huellas recientes** (alguien pasa a diario: los rastros del paso) | LLAVE DE LATÓN: quién tiene acceso → pregunta de «quién» (nivel 6). Aceite para bisagras: cómo se mantiene la puerta; no muestra que se use a diario por sí solo |
| **4** · ¿Cómo se mueven los juguetes? (2) | **Trampilla del techo + BOBINA DE HILO DE PESCAR** · **Oso con hilo cosido + Trampilla del techo** | **Oso con hilo cosido + Trampilla del techo** (el hilo que mueve a un juguete y desde dónde se maneja) | BOBINA DE HILO DE PESCAR: de dónde salió el hilo / quién lo tiene → «quién» |
| **6** · ¿Quién está detrás de la «maldición»? (4) | **Pluma «G. V.»** + una de: **CARTAS DE COMPRADORES** · **RECIBO DE FERRETERÍA** · **ABRIGO NEGRO** · **RECORTE DE PERIÓDICO** | **Pluma «G. V.» + RECIBO DE FERRETERÍA** (las iniciales y la «V» de quien compró las piezas del mecanismo) | CARTAS DE COMPRADORES: las rechazó → «para qué». ABRIGO NEGRO («—V.»): el cómplice de la ventana, no quién la dirige. RECORTE: Voss administra la mansión → contexto, no prueba directa |
| **6** · ¿Por qué espantaba a los compradores? (9) | {**Siete rechazos** · **CARTAS DE COMPRADORES** · **CARTA SIN ENVIAR**} × {**Cuentas que no cuadran** · **PLANOS DE LA MANSIÓN** · **PÁGINA DE UN DIARIO INFANTIL**} | **CARTA SIN ENVIAR + PLANOS DE LA MANSIÓN** (el «para qué» dicho por escrito y lo que se busca en la casa) | Siete rechazos y CARTAS: que rechazaba compradores; Cuentas que no cuadran: dinero; PÁGINA DE UN DIARIO INFANTIL: contexto del tesoro. Pueden ser contexto o la otra mitad de la pareja: dime si prefieres otra |

(3), (2), (4), (9) = número de combinaciones válidas que tiene hoy la pregunta. Las cuatro filas de arriba son las que la validación nueva marcaría
como incumplimientos en cuanto existan sus datos. Estas elecciones son **mías, de lectura de la tabla**: no he visto las pistas jugables de esos
niveles (no existen todavía). Apruébalas, cámbialas o elige otra única respuesta, y las aplico cuando se hagan esos niveles.

## 5. Pruebas automáticas

`node --test "pruebas/*.test.mjs"` → **345 pasan, 0 fallan** (antes 340).
- **Oráculo** (`pruebas/cocina.test.mjs`): con la conclusión correcta, la pregunta 1 de la cocina acierta con **exactamente 1** respuesta
  (Cuerda + Fuelle) y la 2 con **exactamente 1** (Platos), probado contra todos los subconjuntos de 1 o 2 de las 8 pruebas.
- **Casos explícitos de la pregunta 1**: Recibo + Cuerda → error · Recibo + Fuelle → error · Cuerda sola → error · Fuelle solo → error
  (y Recibo solo → error; Cuerda + Fuelle → correcta; conclusión equivocada → error).
- **El recibo y la taza**: no están en ninguna combinación; presentados solos, con la pregunta 1 o con los platos, son error; siguen en la libreta.
- **Validación general** (`pruebas/deduccion.test.mjs`): ninguna pregunta de ningún nivel con reglas puede tener más de una combinación
  válida; si alguna la tiene, la prueba falla y dice nivel, pregunta y combinaciones. La misma comprobación está dentro de
  `validarDeduccion` (`src/motor/Deduccion.js`), así que una habitación así no carga. La única excepción de hoy es `nivel 1, pregunta "embrujado"`;
  otra prueba comprueba que el pasillo sigue igual y que una excepción sin comentario no vale.

## 6. Verificación en el navegador (cocina con todo encontrado, teclado real)

| # | Qué | Resultado |
|---|---|---|
| 1 | Pregunta 1 con **Recibo + Cuerda** | ✔ error («Mmm, no. Esa pieza no encaja.»), vuelve a la pregunta 1 |
| 2 | Pregunta 1 con **Cuerda + Fuelle** | ✔ resuelta (pasa a la pregunta 2) |
| 3 | Pregunta 2 con la **Taza** | ✔ error; la pregunta 1 sigue resuelta; vuelve a la pregunta 2 |
| 4 | Pregunta 2 con **Platos** | ✔ resuelta → cierre → informe («Pistas: 2 de 2») |
| — | Pasillo: pregunta 1 con Ventana rota y pregunta 2 con la huella (llamando a la deducción por el motor, no por la interfaz) | ✔ igual que antes |
| — | Consola | ✔ sin errores |

Captura del error con Recibo + Cuerda: `docs/fase5/capturas/17_error_con_recibo_y_cuerda.jpg`.

Lo que no verifiqué: la cocina con todo encontrado se dejó con el motor de investigación (no caminando), como en el arreglo 5a.1; las
pruebas del pasillo (Q2 con las cuatro pruebas) están cubiertas por las pruebas automáticas, no repetidas en el navegador. README sigue en la v1.1.

---

# Arreglo 5a.3: una pregunta para el recibo y la taza

Tras el 5a.2 el recibo y la taza quedaban en la libreta sin responder nada (y se veían distintos al resto). Ahora cada pista de la cocina
responde una pregunta. **Nada está commiteado.**

## Qué cambió
- **Pregunta 3 de la cocina** (`assets/narrativa/nivel2.json` → `deduccion`; **texto propuesto por mí, pendiente de tu aprobación**; sale solo de lo
  que dicen las dos pistas):
  - «¿Quién maneja el fantasma de la cocina?»
  - ✔ Una persona real: compró las piezas y estuvo aquí hace poco · Nadie: el mecanismo funciona solo · Un fantasma, como cuenta la leyenda
  - Única respuesta: **RECIBO DE FERRETERÍA + TAZA DE CAFÉ** (las dos). El recibo solo o la taza sola → error; en las preguntas 1 y 2 siguen siendo error.
- `assets/investigaciones/nivel2.json`: la pregunta `responsable` con `validas: [[recibo, taza]]`. Una pregunta, una sola respuesta (la validación general sigue en verde).
- Consecuencia de juego: **la deducción de la cocina ya no está disponible hasta recoger el recibo y la taza** (además de cuerda, fuelle y platos).
- `DISENO_V2.md`: tabla del nivel 2 con la pregunta 3.

## Pruebas y navegador
- `node --test "pruebas/*.test.mjs"` → **345 pasan, 0 fallan**. El oráculo da exactamente 1 respuesta en cada una de las 3 preguntas;
  recibo + taza solo valen juntos en la 3; disponibilidad y orden de hallazgos actualizados; ya no sobra ninguna pista en la cocina.
- Navegador (cocina con todo encontrado, teclado real): «Pregunta 1 de 3» → cuerda + fuelle ✔ → platos ✔ → «Pregunta 3 de 3» con el recibo solo → error →
  recibo + taza ✔ → cierre → informe. Consola sin errores.
- No verificado: caminando (todo lo encontrado se dejó con el motor); el pasillo no se tocó (su pregunta 2 sigue siendo la excepción del 5a.2, y el RECORTE DE PERIÓDICO
  sigue sin responder nada allí: dime si quieres lo mismo para él).
