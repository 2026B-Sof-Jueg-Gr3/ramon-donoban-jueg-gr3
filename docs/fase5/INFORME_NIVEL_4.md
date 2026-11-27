# Informe del nivel 4 — «El Cuarto de los Juguetes» (experimentación)

Rama `v2-investigacion`. **Nada está commiteado**.

## 1. Qué es el nivel
Un cuarto con juguetes que «se mueven solos». Cada cierto tiempo (primer movimiento a los 4 s, luego cada 7–12 s: `src/motor/Fenomeno.js`)
el caballito se mece y las muñecas giran; los **hilos casi invisibles** hacia la trampilla del techo se tensan y brillan si les da la luz.
Se **tira** del hilo del caballito (E: el caballito se va al otro lado del cuarto, animación fija), después se puede **cortar** el hilo de
las muñecas, y solo entonces se ve la **trampilla**. Tras la deducción se **corta el último hilo** (el del oso) y, al cerrar, una
**silueta cruza la ventana**. Sin Sokoban: tirar y cortar son una pulsación de E.

- Mapa: `assets/mapas/nivel4.json` · reglas: `nivel4.json` · módulo: `src/presentacion/habitaciones/Juguetes.js`.
- **Deducción** (UNA respuesta): `Oso con hilo cosido + Trampilla del techo`; las demás pruebas (caballito, muñecas, hilo, diario) son ajenas.

## 2. Cada línea: disparador y orden

| Línea (id) | Texto (de la narrativa) | Clase | Se dispara cuando… | Depende de (física) |
|---|---|---|---|---|
| `intro` | «El cuarto de los niños. Los juguetes me miran... o eso quieren que …» | importante | el inspector entra | — |
| `comentario:0` | «Hay un hilo transparente enganchado en esta caja.» | secundaria | examina (E) `caja-juguetes` | requiere alumbra con la linterna `n4-hilo-caja` |
| `comentario:1` | «Si tiro de aquí, el caballito se mueve al otro lado. Qué conveniente.» | secundaria | tira (E) `hilo-caballito` | — |
| `comentario:2` | «Un juguete que «se mueve solo» necesita a alguien que lo mueva.» | secundaria | ve de cerca `juguete` | — |
| `revelacion:0` | «Primer juguete desconectado. El hilo sube hasta una trampilla del t…» | importante | corta (E) `hilo-munecas` | requiere tira (E) `hilo-caballito` |
| `revelacion:1` | «Desde esa trampilla se maneja todo el cuarto, como un teatro de mar…» | importante | examina (E) `trampilla` | requiere corta (E) `hilo-munecas` |
| `mueble:n4-mueble-oso` | «Un oso de peluche con un hilo cosido en la espalda. Marioneta, no m…» | secundaria | examina (E) `n4-mueble-oso` | — |
| `mueble:n4-mueble-caballito` | «Un caballito de carrusel. Sus engranajes están recién engrasados.» | secundaria | examina (E) `n4-mueble-caballito` | — |
| `mueble:n4-mueble-munecas` | «Muñecas alineadas mirando la puerta. Alguien las colocó así para im…» | secundaria | examina (E) `n4-mueble-munecas` | — |
| `pista:n4-pista-hilo` | «BOBINA DE HILO DE PESCAR: Atada a un títere. El otro extremo sube h…» | secundaria | recoge (E) `n4-pista-hilo` | — |
| `pista:n4-pista-diario` | «PÁGINA DE UN DIARIO INFANTIL: «El abuelo escondió su tesoro donde e…» | secundaria | recoge (E) `n4-pista-diario` | — |
| `bateria` | «Pilas dentro de un tren de juguete. Este no anda solo, eso seguro.» | secundaria | recoge (E) `bateria` | — |

### Orden en los recorridos caminando
- **Recorrido A** (verificado en el navegador, con un error a propósito): intro → hilo de la caja (con luz) → tirar → corte de las muñecas
  (revelación 0) → trampilla (revelación 1) → muebles y pistas → deducción → cortar el último hilo → cierre → silueta → informe
  («Hallazgos extra: 1 de 4»).
- **Recorrido B**: *no verificado caminando* (solo `pruebas/nivel4.test.mjs`).

## 3. Pruebas automáticas
`pruebas/nivel4.test.mjs` (10) + `niveles.test.mjs`: cada línea y su disparador; **no se puede cortar antes de tirar**; **no se ve la trampilla antes
de la revelación 0**; el fenómeno oído/visto cerca (120 px); el oráculo; la ayuda en orden (libreta → hilos → polvo → oso → final tras deducir).
Suite completa: **467 pruebas, 0 fallos**.

## 4. Maquetación
Se midió con el revisor F6 (`window.__recorrido()`, sin y con `?carga=extrema`) sobre las **34 pantallas** del juego: **0 solapes en las 34, en
las dos modalidades**. Las filas de este nivel son:

| Pantalla | Contenido real máximo (elementos revisados · solapes) | Carga extrema (elementos · solapes) |
|---|---|---|
| `libreta-nivel4` | 16 · **0** | 27 · **0** |
| `conclusion-nivel4` | 10 · **0** | 10 · **0** |
| `pruebas-nivel4` | 27 · **0** | 25 · **0** |
| `informe-nivel4` | 11 · **0** | 9 · **0** |

## 5. No verificado
- El segundo orden del nivel 4 caminando; los efectos de la ayuda (hilos que brillan, polvo, brillo del oso) en el navegador.
- La **campaña completa 1→6 en una pestaña nueva, hasta los créditos**, quedó a medias: se hicieron los niveles 1 y 2 de principio a fin
  desde el menú, con datos borrados y teclas reales (ver informe consolidado). El panel del navegador pasó a segundo plano (la ventana de la
  app dejó de estar a la vista: ~4 cuadros por segundo) y no se pudo seguir caminando en tiempo real.
