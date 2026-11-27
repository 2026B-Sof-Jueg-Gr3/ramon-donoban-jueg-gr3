# Informe del nivel 3 — «La Puerta con Candado» (rastreo y acceso)

Rama `v2-investigacion`. **Nada está commiteado** (el «Autorizado» del PASO 0 llegó en blanco).

## 1. Qué es el nivel
Un pasillo con una puerta vieja y un candado nuevo. Se investiga con la luz y los pies: el **polvo intacto** frente al **camino limpio**
(solo se ven con la linterna), las **tablas que crujen** (una zona del suelo), las **cajas** (examinar) y la **caja junto a la puerta**
(mirar debajo: huellas recientes). La **carta sin enviar** es obligatoria: sin ella no se ofrece la deducción. Tras resolver, la
**puerta** se abre con E si se tiene la **llave de latón** o las **ganzúas** (examinar la caja de herramientas); abrirla lleva al informe.
Ningún Sokoban: *mirar debajo* y *abrir* son **una sola pulsación de E** con animación fija.

- Mapa: `assets/mapas/nivel3.json` (`docs/mapas/generar_mapa_nivel3.py`) · reglas: `assets/investigaciones/nivel3.json` (sin texto) ·
  módulo: `src/presentacion/habitaciones/Rastreo.js` · motor común: `Investigacion` (acciones `mirar-debajo`, `abrir` con `alguno`).
- **Deducción** (texto aprobado, UNA respuesta): «¿Por qué hay un candado nuevo en una puerta vieja?» → **«Alguien entra y sale a diario y no quiere visitas»**, con
  **Camino sin polvo + Huellas recientes**; la llave, el llavero, el aceite o la carta son prueba ajena (error sin castigo).

## 2. Cada línea: disparador y orden

| Línea (id) | Texto (de la narrativa) | Clase | Se dispara cuando… | Depende de (física) |
|---|---|---|---|---|
| `intro` | «Un candado nuevo en una puerta vieja. ¿Quién cierra con llave una c…» | importante | el inspector entra | — |
| `comentario:0` | «Estas cajas bloqueaban el paso desde dentro. Alguien no quería visi…» | secundaria | examina (E) `cajas` | — |
| `comentario:1` | «Polvo por todas partes... menos en el camino que alguien recorre a …» | secundaria | examina (E) `n3-camino` | requiere alumbra con la linterna `n3-camino` |
| `comentario:2` | «La madera cruje, pero aguanta. Igual que mi paciencia.» | secundaria | camina por la zona `tablas` | — |
| `revelacion:0` | «El polvo de esta zona está intacto, pero el del camino no. Alguien …» | importante | alumbra con la linterna `n3-intacto` **y** alumbra con la linterna `n3-camino` | — |
| `revelacion:1` | «Bajo la caja hay huellas recientes. Botas de hombre, talla grande.» | importante | miro-debajo `caja-puerta` | — |
| `mueble:n3-mueble-llavero` | «Un llavero vacío. Falta justo la llave del ala oeste.» | secundaria | examina (E) `n3-mueble-llavero` | — |
| `mueble:n3-mueble-puerta` | «Una puerta tapiada con tablones nuevos. Los clavos todavía brillan.» | secundaria | examina (E) `n3-mueble-puerta` | — |
| `mueble:n3-mueble-herramientas` | «Una caja de herramientas de cerrajero. Las ganzúas están gastadas p…» | secundaria | examina (E) `n3-mueble-herramientas` | — |
| `mueble:n3-mueble-barril` | «Un barril de aceite para bisagras, casi vacío. Esta puerta se abre …» | secundaria | examina (E) `n3-mueble-barril` | — |
| `pista:n3-pista-carta` | «CARTA SIN ENVIAR: «Mientras crean que la casa está maldita, ningún …» | secundaria | recoge (E) `n3-pista-carta` | — |
| `pista:n3-pista-llave` | «LLAVE DE LATÓN: Lleva una etiqueta: «Ala oeste — copia». Quien la t…» | secundaria | recoge (E) `n3-pista-llave` | — |
| `bateria` | «Pilas escondidas detrás de un ladrillo suelto. Un escondite muy hum…» | secundaria | recoge (E) `bateria` | — |

Causa antes que consecuencia: si una acción trae una secundaria y una importante, el narrador cuenta primero la secundaria y la revelación
1,2 s después. Cada línea sale **una sola vez** y en **cualquier orden** salvo las dependencias físicas de la última columna.

### Orden en los recorridos caminando (sin teletransporte)
- **Recorrido A** (verificado en el navegador, con un error a propósito): intro → comentarios y revelaciones según se llegaba a cada cosa →
  carta → deducción (primero con una prueba ajena → línea de error sin castigo, luego la correcta) → puerta (con la llave o las ganzúas) → informe
  («Hallazgos extra: 1 de 4»).
- **Recorrido B**: *no verificado caminando* (solo en pruebas automáticas: `pruebas/nivel3.test.mjs`, «el orden libre»).

## 3. Pruebas automáticas
`pruebas/niveles.test.mjs` (comunes a los 6 niveles, 47 pruebas en total) y `pruebas/nivel3.test.mjs` (11): cada línea con su disparador y una
sola vez; dependencias; **no se puede deducir sin la carta**; **la puerta se abre con la llave o con las ganzúas, no sin ellas**; el oráculo
(exactamente 1 respuesta correcta por pregunta); mapa (todo alcanzable, nada tapado, todo usable desde cerca, de frente y con luz); la ayuda
(libreta → polvo → caja → carta → llave/ganzúas, cada refuerzo se apaga con su línea). Suite completa: **467 pruebas, 0 fallos**.

## 4. Maquetación
Se midió con el revisor F6 (`window.__recorrido()`, sin y con `?carga=extrema`) sobre las **34 pantallas** del juego: **0 solapes en las 34, en
las dos modalidades**. Las filas de este nivel son:

| Pantalla | Contenido real máximo (elementos revisados · solapes) | Carga extrema (elementos · solapes) |
|---|---|---|
| `libreta-nivel3` | 18 · **0** | 27 · **0** |
| `conclusion-nivel3` | 10 · **0** | 10 · **0** |
| `pruebas-nivel3` | 31 · **0** | 25 · **0** |
| `informe-nivel3` | 11 · **0** | 9 · **0** |

## 5. No verificado
- El segundo orden del nivel 3 caminando.
- Los efectos visuales de la ayuda (polvo, caja, carta) no se vieron en el navegador (sí sus reglas, por pruebas).
- La **campaña completa 1→6 en una pestaña nueva, hasta los créditos**, quedó a medias: se hicieron los niveles 1 y 2 de principio a fin
  desde el menú, con datos borrados y teclas reales (ver informe consolidado). El panel del navegador pasó a segundo plano (la ventana de la
  app dejó de estar a la vista: ~4 cuadros por segundo) y no se pudo seguir caminando en tiempo real.
