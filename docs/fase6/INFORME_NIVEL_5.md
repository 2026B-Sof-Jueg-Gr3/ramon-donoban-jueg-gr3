# Informe del nivel 5 — «La Sombra en la Ventana» (persecución en tiempo real, sin deducción)

Rama `v2-investigacion`. **Nada está commiteado**.

## 1. Qué es el nivel
Una sala con la chimenea encendida donde una **sombra quema papeles**. Hay: la **salida al jardín** (este), la **puerta por la que se entra,
atrancada**, **pisadas mojadas** (solo con luz), la **cortina**, las **velas**, el **cuadro torcido**, el **sofá hundido** y la **puerta al despacho**.
No hay deducción: **la captura es la prueba**.

- Motor nuevo `src/motor/Persecucion.js` (sin Phaser, **determinista con semilla**, 15 pruebas): la sombra recorre una ruta junto a la chimenea;
  si la **alumbran** (desde menos de 400 px) o el inspector se **acerca** (< 170 px), **huye** hacia la salida al jardín; **si la salida está
  bloqueada se esconde** (detrás del sofá o de la cortina, el escondite más lejano del inspector; si se acerca a < 110 px se cambia al otro).
  **Captura: mantenerla en el cono a ≤ 150 px durante 1,5 s seguidos mientras no tiene salida.** **Los papeles se queman a los 60 s**
  (configurable: `config.segundosDeLosPapeles`, y `?papeles=N` en la URL para probar) desde que termina la intro, salvo que la chimenea ya esté
  apagada. El tiempo **no corre** en pausas narrativas, con la libreta ni con la pausa.
- Intento fallido (la sombra sale por el jardín o los papeles se terminan de quemar): sale la línea **«error»** («Calma. Si me precipito, se
  escapa.») como importante y se **repite el tramo**: inspector y sombra vuelven a sus posiciones, la linterna al sur y el tiempo a cero. **Lo
  logrado se conserva** (salida cerrada, chimenea apagada, líneas ya dichas).
- Escena: `src/presentacion/habitaciones/Sombra.js`; la escena común ganó `fallar()` y `reponerInspector()`. Mapa: `docs/mapas/generar_mapa_nivel5.py`.
- Ayuda (sin texto, a los 45 s): **huellas mojadas** brillan por donde huye la sombra (hasta cerrar la salida) y el **humo** marca la chimenea (hasta apagarla).
- Tras la captura (cierre): se ven y se pueden recoger el **abrigo negro** y, en su bolsillo, las **pilas**; la **puerta al despacho** se abre con E
  (si la chimenea ya está apagada) y lleva al informe. Los **planos** salen con la revelación 1 y quedan en el Registro: **no se pueden perder**.

## 2. Cada línea: disparador y orden

| Línea (id) | Texto (de la narrativa) | Clase | Se dispara cuando… | Depende de (física) |
|---|---|---|---|---|
| `intro` | «Una silueta cruzó la ventana. Esta vez no voy a dejar que escape.» | importante | el inspector entra | — |
| `comentario:0` | «Pisadas mojadas: la sombra entró desde la lluvia hace muy poco.» | secundaria | examina (E) `n5-pisadas` | requiere alumbra con la linterna `n5-pisadas` |
| `comentario:1` | «Huele a humo. Están quemando papeles.» | secundaria | camina por la zona `cerca-chimenea` | — |
| `comentario:2` | «Alguien atrancó esta habitación para ganar tiempo.» | secundaria | examina (E) `puerta-atrancada` | — |
| `revelacion:0` | «Salida al jardín bloqueada. La sombra ya no puede huir por aquí.» | importante | cierra (E) `salida-jardin` | — |
| `revelacion:1` | «La chimenea, apagada a tiempo. Parte de los papeles se salvó.» | importante | apaga (E) `chimenea` | — |
| `pista:n5-pista-planos` | «PLANOS DE LA MANSIÓN: El despacho está marcado en rojo, con una not…» | importante | apaga (E) `chimenea` | — |
| `mueble:n5-mueble-velas` | «Velas apagadas junto a la ventana. Todavía están tibias.» | secundaria | examina (E) `n5-mueble-velas` | — |
| `mueble:n5-mueble-cuadro` | «Un cuadro torcido. Detrás hay un agujero para espiar el pasillo.» | secundaria | examina (E) `n5-mueble-cuadro` | — |
| `mueble:n5-mueble-sofa` | «Un sofá con la tela hundida. Alguien vigiló desde aquí durante horas.» | secundaria | examina (E) `n5-mueble-sofa` | — |
| `pista:n5-pista-abrigo` | «ABRIGO NEGRO: Empapado, escondido tras la cortina. En el bolsillo: …» | secundaria | recoge (E) `n5-pista-abrigo` | requiere captura a la sombra |
| `bateria` | «Pilas en el bolsillo de un abrigo ajeno. Ya no las va a necesitar.» | secundaria | recoge (E) `bateria` | requiere recoge (E) `n5-pista-abrigo` |

Los **planos** salen **después** de la revelación 1 (las dos son importantes y el motor las entrega en el orden de la lista). Dependencias
físicas adicionales: abrigo y pilas exigen haber capturado a la sombra (las pilas, además, el abrigo); la puerta al despacho, la captura y la
chimenea apagada.

## 3. Intentos jugados caminando (sin teletransporte, panel visible, ~180 FPS)
| Recorrido | Intento | Resultado | Tiempo del intento |
|---|---|---|---|
| A | 1 | perdido: la sombra **escapó por la salida** (salida abierta, linterna directa a ella) | 3,6 s |
| A | 2 | perdido: **los papeles se quemaron** (salida cerrada a los 8,2 s, chimenea sin apagar; la ayuda del humo salió a los ~51 s) | 60,0 s |
| A | 3 | **ganado**: chimenea apagada a los 5,3 s y captura (la sombra se escondió en la cortina) | 10,2 s |
| B | 1 | perdido por la salida (examinando pisadas, puerta, velas y cuadro con la salida aún abierta) | 12,5 s |
| B | 2 | **ganado**: salida cerrada a los 8,2 s, chimenea a los 21,5 s, captura | 26,9 s |

Tras la captura, en ambos recorridos: abrigo, pilas, (sofá en B) y puerta al despacho → informe. Recorrido A: «Hallazgos extra: 1 de 4»;
Recorrido B: **«4 de 4» y «Pilas: encontradas»**. Consola sin errores (pestaña nueva). Se encontró y corrigió caminando: la sombra huía en cuanto
empezaba un intento nuevo porque la linterna seguía apuntando a donde se había quedado (ahora vuelve a apuntar al sur) y la luz desde muy lejos la
espantaba (ahora solo desde < 400 px); el informe no contaba lo recogido tras el cierre (ahora se recalcula al ir al informe).

Se puede ganar **y** perder de las dos maneras; el reto real es **cerrar la salida antes de acercarse** (la sombra huye al jardín si la molestan).

## 4. Pruebas automáticas
`pruebas/persecucion.test.mjs` (15) y `pruebas/nivel5.test.mjs` (15): con salida bloqueada y luz 1,5 s → captura (varias semillas, sobre los
puntos del mapa real); con la salida abierta → escapa; los papeles a los 60 s (y configurable, y apagada a tiempo no); **el reintento conserva
lo logrado**; **los planos salen con la revelación 1** (después de ella, también tras la captura); **el tiempo no corre durante las pausas**; la
captura necesita 1,5 s **seguidos**; abrigo/pilas/puerta dependen de la captura; ayuda en orden. Suite completa: **467 pruebas, 0 fallos**.

## 5. Maquetación
Se midió con el revisor F6 (`window.__recorrido()`, sin y con `?carga=extrema`) sobre las **34 pantallas** del juego: **0 solapes en las 34, en
las dos modalidades**. Las filas de este nivel son:

| Pantalla | Contenido real máximo (elementos revisados · solapes) | Carga extrema (elementos · solapes) |
|---|---|---|
| `libreta-nivel5` | 9 · **0** | 25 · **0** |
| `informe-nivel5` | 11 · **0** | 9 · **0** |

(Al probar en carga extrema apareció un fallo real: `aplicarALaHabitacion` suponía una deducción; ya no.)

## 6. No verificado
- La **ayuda de las huellas** no se vio en pantalla (solo el humo, captura `n5_01`).
- Dificultad para otra persona: se midió con un jugador automático/hábil; no hay prueba con un jugador humano.
- La **campaña completa 1→6 en una pestaña nueva, hasta los créditos**, quedó a medias: se hicieron los niveles 1 y 2 de principio a fin
  desde el menú, con datos borrados y teclas reales (ver informe consolidado). El panel del navegador pasó a segundo plano (la ventana de la
  app dejó de estar a la vista: ~4 cuadros por segundo) y no se pudo seguir caminando en tiempo real.

Capturas en `docs/fase6/capturas/`: `n5_01` (ayuda del humo y salida cerrada), `n5_02` (la sombra atrapada y el cierre), `n5_03` (informe).
