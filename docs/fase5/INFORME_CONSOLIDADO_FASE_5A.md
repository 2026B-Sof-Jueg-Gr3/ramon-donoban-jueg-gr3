# Informe consolidado — Fase 5a: la cocina (nivel 2) y sus arreglos

Rama `v2-investigacion`. **Nada está commiteado** (el «Autorizado» del PASO 0 llegó en blanco las cuatro veces: 5a, 5a.1, 5a.2 y 5a.3).
Este documento resume el estado final; el detalle de cada paso sigue en `INFORME_FASE_5A_COCINA.md`.

## 1. Estado de un vistazo

| | |
|---|---|
| Niveles jugables | 1 (pasillo) y 2 (cocina), de principio a informe; el nivel 3 se desbloquea |
| Pruebas automáticas | **346 pasan, 0 fallan** (la fase empezó con 260) |
| Maquetación (F6) | **0 solapes** en 20 pantallas × 2 modos (contenido real y carga extrema) |
| Consola | sin errores (pestaña nueva, con y sin carga extrema) |
| Texto nuevo | solo la deducción de la cocina aprobada y la **pregunta 3** (propuesta, pendiente de tu aprobación) |
| Commit | no hecho |

## 2. Qué se construyó

**La cocina (5a).** La escena `Habitacion` se generalizó (carga mapa, reglas y narrativa del nivel; un módulo por habitación en
`src/presentacion/habitaciones/`: `Pasillo`, `Cocina`). Mapa `assets/mapas/nivel2.json`; reglas sin texto en
`assets/investigaciones/nivel2.json`; acciones nuevas `rodar`, `tirar` y el hecho `oyo-cerca` (motor sin Phaser); fenómeno de golpes
y velas (`src/motor/Fenomeno.js`); la alacena rueda con UNA pulsación de E (nada de empujar con física); cuerda y fuelle que aparecen
después de rodarla; «tirar de la cuerda» repetible; ayuda sin texto (libreta › onda › ruedas › cuerda › platos); la cocina se calma
en el cierre.

**Maquetación (5a.1).** La causa del fallo (8 pruebas que se salían de la pantalla) eran posiciones verticales fijas en todas las pantallas.
Ahora todo se arma en flujo: `src/motor/Maquetacion.js` (función pura, probada), `src/ui/Pantalla.js` y `ZonaDesplazable.js`
(cabecera y pie siempre a la vista; lo que crece va en una zona con desplazamiento: rueda, ↑ ↓, RePág/AvPág, ▲ ▼ pulsables; el foco
desplaza solo). Aplicada a libreta (3 modos), conclusión, pruebas, informe, pausa y salida, panel de tarjetas, caja de importantes,
menús, créditos y preámbulo. Revisor **F6**, modo de **carga extrema** (`?carga=extrema`, F7/F8) y `window.__recorrido()`.
La regla está en `DISENO_V2.md`, sección 14.

**Una pregunta, una sola respuesta (5a.2).** Cada pregunta tiene UNA combinación válida, solo con las pruebas que la responden
directamente (`DISENO_V2.md`, sección 5). `validarDeduccion` falla si una pregunta tiene más de una (y dice cuál) salvo una
`"excepcion"` explícita con comentario.

**Pregunta 3 y filas iguales (5a.3 y retoques).** Cada pista de la cocina responde una pregunta. En la pantalla de pruebas todas las
filas son iguales (mismo color, tamaño y solo el nombre) y los nombres de las pistas se escriben como los demás («Recibo de
ferretería», no en mayúsculas), para que nada delate para qué pregunta sirve cada una.

## 3. La deducción de la cocina, como queda

| # | Pregunta | Opciones (✔ = correcta) | Única respuesta |
|---|---|---|---|
| 1 | ¿Qué produce los golpes y apaga las velas? | ✔ Un mecanismo de poleas, cuerda y fuelle · El viento que baja por la chimenea · Un fantasma que golpea las ollas | Cuerda al techo + Fuelle escondido |
| 2 | ¿Quién lo construyó trabaja solo? | ✔ No: hay alguien más con él · Sí: vive aquí escondido · Nadie lo construyó | Platos para dos |
| 3 *(texto propuesto por mí, por aprobar)* | ¿Quién maneja el fantasma de la cocina? | ✔ Una persona real: compró las piezas y estuvo aquí hace poco · Nadie: el mecanismo funciona solo · Un fantasma, como cuenta la leyenda | Recibo de ferretería + Taza de café |

Las copas, la sartén y la alacena con ruedas aparecen en la libreta pero no responden ninguna pregunta (presentarlas es error).
Consecuencia de juego: la deducción de la cocina **no se desbloquea hasta recoger el recibo y la taza**, además de cuerda, fuelle y platos.

## 4. Tabla «Maquetación» final (objetos revisados / solapes)

| Pantalla | Real máximo | Carga extrema |
|---|---|---|
| Menú principal · Créditos · Preámbulo · Menú de niveles · En construcción | 6/0 · 3/0 · 3/0 · 17/0 · 4/0 | igual (no crece) |
| Libreta pasillo · cocina · aviso · con DEDUCCIÓN | 16/0 · 18/0 · 18/0 · 22/0 | 27/0 en las cuatro (25 pruebas + 10 pistas largas) |
| Conclusión cocina · pasillo | 10/0 · 10/0 | 10/0 · 10/0 (pregunta ×3, conclusión ×3) |
| Pruebas cocina · pasillo | 31/0 · 27/0 | 25/0 · 25/0 (25 pruebas + 10 pistas) |
| Pausa · Confirmación de salida | 6/0 · 6/0 | igual |
| Informe pasillo · cocina | 11/0 · 11/0 | 9/0 · 9/0 (el más largo ×4, con desplazamiento) |
| Panel de tarjetas | 12/0 | 6/0 (1316 px de contenido) |
| Caja de importantes · tarjetas con la caja | 4/0 · 10/0 | 4/0 · 4/0 (11 páginas revisadas una a una) |

Re-ejecutada tras los últimos cambios (filas iguales, pregunta 3): **0 solapes en las 40 casillas**.

## 5. Pruebas automáticas (346)

alcance 17 · ayuda 21 · cargaExtrema 5 · cocina 35 · deduccion 56 · fenomeno 9 · guion 11 · investigacion 40 · mapa 29 · maquetacion 31 ·
marcas 8 · movimiento 13 · narracion 10 · narrativa 17 · progreso 6 · registro 6 · temporizadores 16 · visibilidad 16.

Lo que cubren de esta fase: cada línea de la cocina una vez con su disparador; oráculo con **exactamente 1 respuesta por pregunta** (cuerda + fuelle ·
platos · recibo + taza); casos explícitos (recibo + cuerda, recibo + fuelle, cuerda sola, fuelle solo → error); validación general de «una
sola respuesta» en todos los niveles; maquetación con 1, 8 y 25 elementos y textos larguísimos; nombres de pistas sin mayúsculas.

## 6. Verificación en el navegador

- **Nivel 1 caminando** (huella con ratón + E, ventana rota, aviso real) y **cocina caminando** (ruta A: alacena → rodar → fuelle → platos),
  deducción con teclado, cierre e informe. El informe del nivel 1 lleva a la cocina; el nivel 3 se desbloquea.
- **Deducción de la cocina con todo encontrado:** las 3 preguntas, el recibo solo → error, recibo + taza → resuelta → cierre → informe;
  Recibo + Cuerda → error; Taza en la pregunta 2 → error.
- **Interfaz:** rueda, ▲, teclado y clics en filas a medias; F6 con solape provocado a propósito (rojo + consola) y sin nada cuando está limpio.
- Pausa → Salir → Cancelar → Continuar.

## 7. Pendiente de tu decisión

1. **Texto de la pregunta 3** (y sus 3 opciones): lo escribí yo, a partir de lo que dicen el recibo y la taza.
2. **Excepción del pasillo:** la pregunta 2 («¿Por qué parecía embrujado?») acepta Cajas movidas, Marcas, Polvo o Huella. Marcada en los datos, sin cambiar.
   Con la regla, su única respuesta sería *Cajas movidas*.
3. **Única respuesta de los niveles 3, 4 y 6** (hoy tienen varias; propuesta mía, sin tocar `DISENO_V2.md`):

| Nivel · pregunta | Hoy | Propuesta |
|---|---|---|
| 3 · candado | 3 combinaciones | Camino sin polvo + Huellas recientes |
| 4 · juguetes | 2 | Oso con hilo cosido + Trampilla del techo |
| 6 · quién | 4 | Pluma «G. V.» + RECIBO DE FERRETERÍA |
| 6 · para qué | 9 | CARTA SIN ENVIAR + PLANOS DE LA MANSIÓN |

4. **El RECORTE DE PERIÓDICO del pasillo** sigue en la libreta sin responder ninguna pregunta (como hacía la cocina con sus pistas antes de la pregunta 3). ¿Lo mismo para él?
5. **Commit:** un solo commit con todo, autor DonobanR, sin Co-Authored-By, sin el PDF, el PPTX ni los `screenshot_*.jpg`.

## 8. No verificado (en serio)

- La cocina con todo encontrado se dejó con el motor de investigación en las comprobaciones de interfaz y de preguntas; solo la ruta A se caminó. La ruta B
  (taza, recibo, copas, sartén…) y la ayuda no se repitieron caminando tras estos arreglos.
- Ayuda de la cocina: solo «onda» se vio con los 45 s reales (las demás, con la espera acortada; «libreta», por pruebas automáticas).
- La caja de importantes arriba con las tarjetas a la vista está probada en la función pura, no vista en el navegador.
- Rueda del ratón sobre el panel de tarjetas; táctil/móvil; otros tamaños de ventana.
- Audio: solo el gancho `golpe`, sin archivos. README sigue en la v1.1.
- **Capturas desactualizadas:** `09`, `10`, `12` y `17` se tomaron con las filas de pistas en ámbar (antes de igualarlas); la maquetación que muestran es correcta, el estilo de esas dos filas ya no.

## 9. Dónde está cada cosa

- Capturas: `docs/fase5/capturas/` (01–17). Generador del mapa: `docs/fase5/generar_mapa_nivel2.py`.
- Diseño y reglas: `DISENO_V2.md` (sección 5: una pregunta, una respuesta; sección 14: reglas de interfaz).
- Código nuevo principal: `src/motor/{Maquetacion,Fenomeno,cargaExtrema}.js`, `src/ui/{Pantalla,ZonaDesplazable,etiquetas}.js`,
  `src/presentacion/{Revisor,CargaExtrema,RecorridoDeRevision}.js`, `src/presentacion/habitaciones/`.
