# Informe de la campaña completa

Fecha: 2026-11-25 · rama `v2-investigacion` · **sin commit** (el «Autorizado» del PASO 0 llegó en blanco, ni «sí» ni «no»).

**Resultado: la campaña 1 → 6 → informe final → «Ver créditos» → créditos se completó en una pestaña nueva sin datos guardados.** Cada informe
desbloqueó el siguiente, la consola no mostró errores y la página estuvo visible a 180–181 FPS antes de cada nivel.

## 1. Cómo se jugó (léelo antes que los tiempos)
- Menú, preámbulo, elección del nivel 1 y botones de los informes: teclas y clics reales.
- Los niveles los jugó un **jugador automático** (`herramientas/jugador_de_verificacion.js`): camina con WASD sintéticos, **sin teletransporte**,
  alumbra, pulsa E y resuelve las deducciones con las teclas del cuaderno. La deducción final del nivel 6 se hizo con teclas reales, una a una.
- En el nivel 5 de la campaña se apartó la puerta del despacho desde la consola hasta haber examinado y recogido todo lo demás, para que el jugador
  automático no saliera antes de tiempo.
- **No es una prueba con una persona**: los tiempos son del jugador automático e incluyen sus rodeos y las pausas para las capturas. No sirven para
  estimar la duración de una partida humana.

## 2. La campaña paso a paso

| Paso | Tiempo en el nivel | Error a propósito | Resultado | Informe |
|---|---|---|---|---|
| Menú → Jugar → preámbulo → nivel 1 | — | — | sin datos guardados, solo el nivel 1 abierto | — |
| 1 · El Pasillo Oscuro | 5 min 35 s ¹ | cortinas con *Cajas movidas* | resueltas las 2 preguntas | 4 de 4 extras, pilas |
| 2 · El Fantasma de la Cocina | 1 min 37 s | mecanismo con *Alacena con ruedas* | resueltas las 3 | 2 de 2, pilas |
| 3 · La Puerta con Candado | 1 min 33 s | candado con *Llavero vacío* | puerta abierta | 5 de 5, pilas |
| 4 · El Cuarto de los Juguetes | 1 min 43 s | juguetes con *Caballito engrasado* | último hilo cortado | 4 de 4, pilas |
| 5 · La Sombra en la Ventana | 2 min 43 s | (no hay deducción) | intento 1 perdido por los papeles (60 s); intento 2 ganado (43,9 s) | 4 de 4, pilas |
| 6 · La Verdad Revelada | 3 min 16 s ² | *¿Quién?* con *Siete rechazos* | **Pluma + Recibo** y **Carta + Planos** | 4 de 4, pilas |
| Informe final → Ver créditos → créditos | — | — | llegan los créditos | — |

Del nivel 1 al informe final: **19 min 19 s**.
¹ Incluye unos minutos en que el jugador automático se quedó parado ante el aviso «ya puedes resolver», que no sabía cerrar (defecto del jugador, no
del juego; se corrigió y no volvió a pasar). ² Incluye la deducción a mano y sus capturas.

Comprobado en esta misma partida:
- El **expediente** del nivel 6 tenía las 10 pistas de las habitaciones 1 a 5 y lo del despacho, agrupado por habitación. No hizo falta reponer nada.
- Con la prueba equivocada salió «No. A estas alturas, cada detalle importa.» y se volvió a la misma pregunta.
- Cierre → se abrió el **compartimento** bajo el reloj → pista **COMPARTIMENTO BAJO EL RELOJ** → informe «¡CASO CERRADO!» → «Ver créditos».

### Capturas de la campaña (`capturas/`)
| Archivo | Qué muestra |
|---|---|
| `c_01`, `c_02`, `c_02b` | el expediente completo, en tres pantallas ³ |
| `c_03`, `c_04` | pregunta 1 y sus pruebas (Pluma + Recibo) |
| `c_05`, `c_06` | pregunta 2 y sus pruebas (Carta + Planos) |
| `c_07`, `c_08` | el texto del cierre y el compartimento abierto con su pista |
| `c_09`, `c_10` | el informe final y los créditos |

³ Se rehicieron después de corregir un recorte (punto 4.2), volviendo a entrar al nivel 6 con el Registro de la campaña.

## 3. El nivel 6 ya no puede quedar sin salida
- `src/motor/Reposicion.js` (sin Phaser): al entrar al nivel 6, cada pista que la deducción final necesita (recibo, carta, planos) y que falte en el
  Registro se repone **si su habitación está completada**. Lo que ya está no se toca.
- El recibo **no** tiene la marca `paraElFinal` en los datos (solo la carta y los planos). Por eso la lista sale de las pruebas `"registro": true` del
  nivel 6, que son exactamente esas tres.
- Para que valga la premisa «si completó la habitación, tuvo la pista», cambié una cosa más: el **nivel 5 se marca completado al salir por la puerta
  del despacho**, no en el momento de la captura (antes se podía salir al menú sin haber apagado la chimenea y quedar «completado» sin planos).
- Pruebas (`pruebas/reposicion.test.mjs`, 5): falta el recibo con el nivel 2 completado → se repone; nivel 2 sin completar → no; no duplica ni
  reescribe; solo las tres pistas; con el Registro vacío, tras reponer se resuelven las dos preguntas.
- **En el navegador**: borrando las tres pistas y entrando al nivel 6, volvieron las tres (12 pistas en total, sin duplicados); con el nivel 2 sin
  completar volvieron la carta y los planos, el recibo no.
- Pendiente: el cambio del momento en que se completa el nivel 5 no tiene prueba automática ni se probó «capturar y salir al menú».

## 4. Fallos encontrados hoy y corregidos
1. **Informe consolidado:** las cortinas del pasillo se resuelven con *Ventana rota* (decía *Cajas movidas*).
2. **El expediente recortaba texto por la derecha** (en el recorte de periódico desaparecía «un»). El revisor F6 no lo veía porque recortaba antes de
   comparar. Corregidos los dos: ahora marca **«recortado por un lado»**.
3. **Ayudas que casi no se veían o no se veían:** marcas y cartas (despacho), polvo (juguetes), polvo, caja y carta (puerta). Dibujaban motas de 8 px
   o quedaban debajo de la oscuridad. Ahora usan un resplandor ancho por encima de ella (también el brillo final de la puerta). Es solo presentación:
   no cambian textos, narrador, temporizadores ni cuándo sale cada ayuda. **Revisa las capturas: es un cambio visual que no habías pedido.**

## 5. Segundo orden de los niveles 3 y 4 (caminando)
- **Nivel 3:** luz sobre las marcas → cajas → mirar debajo → carta → caja de herramientas → barril → pilas → camino → llavero → puerta tapiada →
  deducción (con un error) → **puerta abierta con las ganzúas, sin recoger la llave** → informe.
- **Nivel 4:** tirar → cortar las muñecas → trampilla → oso → pilas → diario → caballito → muñecas → bobina → caja → deducción (con un error) →
  cortar el último hilo → informe.

En el nivel 3, la llave se dejó sin recoger a propósito marcándola como usada desde la consola.

## 6. Las ayudas, con la espera real de 45 s
Cada captura se tomó sin tocar el contador: esperando de verdad más de 45 s sin descubrir nada.

| Nivel | Ayuda | Captura | ¿Se ve? |
|---|---|---|---|
| Cocina | vapor de la taza | `a_cocina_1_vapor` | sí (con la luz, como está pensado) |
| Cocina | el recibo se agita | `a_cocina_2_recibo` | sí, en el golpe (la foto fija lo muestra girado) |
| Puerta | polvo / caja / carta | `a_puerta_1_polvo`, `_2_caja`, `_3_carta` | sí, tras la corrección |
| Juguetes | hilos / polvo / oso | `a_juguetes_1_hilos`, `_2_polvo`, `_3_oso` | sí (polvo, tras la corrección) |
| Sombra | huellas | `a_sombra_huellas` | sí, aunque son puntos pequeños |
| Despacho | marcas / onda / cartas | `a_despacho_1_marcas`, `_2_onda`, `_3_cartas` | sí (marcas y cartas, tras la corrección) |

## 7. Verificación final
- **Pruebas: 472, 0 fallos** (`node --test pruebas/*.test.mjs`).
- **Consola:** sin errores en la pestaña de la campaña, ni durante ella ni en las pruebas posteriores.
- **FPS reales:** 180 en el nivel 1, 181 en el 2, 180 en el 3, 181 en el 4, 5 y 6; página visible en todos.
- **Maquetación** (revisor F6 sobre las 34 pantallas, ya con la comprobación de recortes): **0 problemas** en las dos modalidades.

| Pantalla (elementos revisados: real máximo / carga extrema) | Solapes, fuera de recuadro o recortados |
|---|---|
| menú principal 6/6 · créditos 3/3 · interludio 3/3 · niveles 17/17 · en construcción 4/4 | 0 |
| libretas: pasillo 16/27 · cocina 18/27 · aviso 18/27 · con deducción 22/27 · niveles 3, 4, 5, 6: 18/27, 16/27, 9/25, 21/17 | 0 |
| conclusiones: cocina, pasillo, niveles 3, 4, 6: 10/10 cada una | 0 |
| pruebas: cocina 31/25 · pasillo 27/25 · niveles 3, 4, 6: 31/25, 27/25, 31/25 | 0 |
| pausa 6/6 · confirmar salida 6/6 | 0 |
| informes de los 6 niveles: 11/9 cada uno | 0 |
| tarjetas 12/6 · caja de importantes 4/4 · tarjetas con caja 10/4 | 0 |

El revisor se corrió antes del cambio de las ayudas; ese cambio es del mundo, no de la interfaz.

## 8. Lo que todavía no se pudo verificar, y observaciones
**Sin verificar**
- Una partida completa con una **persona** (dificultad, sobre todo la persecución, y duración).
- Los brillos **finales** de la puerta y del cuarto de juguetes (los de después de deducir) en pantalla.
- Las ayudas del pasillo y las de la cocina que no pediste (onda, ruedas, cuerda, platos) no se volvieron a capturar hoy.
- La silueta que cruza la ventana al cerrar el nivel 4 no quedó en captura.

**Para que decidas (no lo cambié)** — *los dos primeros puntos se resolvieron en el «Arreglo 6.1», al final*
- La pista del compartimento se ve **completa apenas ~1,5 s** antes de que llegue el informe final. Es la última revelación («iniciales G. V.») y
  puede no dar tiempo a leerla.
- En la sombra, la ayuda sale a los 45 s y los papeles se queman a los 60 s: quedan 15 s para aprovecharla.
- En la sombra, un intento perdido es fácil: si se la molesta con la salida abierta, huye en pocos segundos.

## 9. Pendiente del proyecto
Commit (PASO 0), fase 4 (retrato, novela visual, música) y fase 7 (arte final, móvil, README).

---

# Arreglo 6.1 (2026-11-25)

Sin commit: el «Autorizado» del PASO 0 volvió a llegar en blanco. Ningún texto narrativo nuevo; el Narrador y sus tiempos
(`Narrador.js`, `PanelInvestigacion.js`, `tiemposDeLectura.js`) no se tocaron.

## 6.1.1 La última pista se puede leer
- Si al terminar una habitación **queda algo por leer**, el informe ya no llega solo: la tarjeta se escribe entera, pasa su tiempo mínimo de
  lectura (`tiempoDeLectura`), **se queda a la vista**, aparece «▸ E / Espacio / clic para continuar» y solo con esa pulsación se pasa al informe.
- Regla en `src/motor/EsperaDeLectura.js` (sin Phaser). La escena solo congela el temporizador de salida de la tarjeta cuando le quedan menos de
  250 ms y cuenta aquí lo que faltaba. El aviso es `src/presentacion/AvisoDeContinuar.js`. Una tecla sostenida no cuenta.
- Es general: vale para cualquier nivel. **Nivel 6:** siempre (la pista del compartimento). **Nivel 5:** si se sale por la puerta justo después de
  recoger algo (comprobado con el abrigo). **Niveles 1 a 4:** normalmente no queda nada (el cierre ya lo cierra el jugador) y pasan como antes; si
  quedara una tarjeta pendiente, esperan igual.
- **En el navegador, nivel 6:** pista entera (68 de 68 letras), tiempo de lectura cumplido (3,74 s), aviso a la vista; 18 s después seguía
  esperando; con E llegó al informe. Capturas `61_01`.
- **Nivel 5:** abrigo recogido y puerta enseguida → el informe esperó a la tarjeta y al clic (`61_04`).

## 6.1.2 La ayuda del nivel 5
- `assets/investigaciones/nivel5.json` → `"espera": 15`. Los demás niveles siguen en 45 s (la prueba común lo comprueba por nivel).
- Es un solo valor para la habitación: vale también después de la captura (la ayuda del humo, si la chimenea sigue encendida).
- En el navegador: a los 14,0 s no había ayuda; a los 15,6 s, huellas (`61_02`).

## 6.1.3 Ayudas sutiles que respiran
- `src/motor/Respiracion.js`: ciclo de **2,5 s**, alfa de 0 a **0,25**, tamaño **1,2 veces** lo que señala.
- Cambiadas: marcas y cartas (despacho), polvo (juguetes), polvo, caja, carta y brillo final (puerta). El polvo son motas pequeñas que respiran.
- Capturas en el punto más brillante del ciclo (alfa medido 0,23), con la espera real de 45 s: `61_a_despacho_marcas`, `61_a_despacho_cartas`,
  `61_a_juguetes_polvo`, `61_a_puerta_polvo`, `61_a_puerta_caja`, `61_a_puerta_carta`, `61_a_puerta_final`. Sustituyen a las `a_*` de esas ayudas
  (las dejo como referencia de cómo se veían).
- Las del polvo son las más tenues: se ven prestando atención, sobre todo por el movimiento, que una foto fija no muestra. Júzgalo en pantalla.
- La mancha de las marcas del despacho sigue siendo grande porque las marcas miden 220 × 70 px.

## 6.1.4 El nivel 5 solo se completa por la puerta
- `pruebas/completado.test.mjs` usa el código real de la escena: capturar y salir al menú → **no** completado; capturar, apagar la chimenea y salir
  por la puerta → completado; con una tarjeta pendiente, completado y el informe espera.
- En el navegador: capturar → cierre → Esc → Salir al menú → Salir: completados `[1,2,3,4]` y el nivel 6 con candado (`61_03`). Después, capturar,
  chimenea apagada y puerta: `[1,2,3,4,5]`.
- Para probarlo puse en el navegador los completados en `[1,2,3,4]` (partía de la campaña terminada).

## 6.1.5 Verificación
- **Pruebas: 483, 0 fallos.**
- **Maquetación:** 35 pantallas (se añadió «espera antes del informe») × contenido real máximo y carga extrema: **0 problemas**.
- **Consola:** sin errores.
- Página visible a 180 FPS. Los niveles los jugó el jugador automático, no una persona; el chase del nivel 5 necesitó rodear el sofá a mano en un
  intento y perdió otro por los papeles.

## 6.1.6 Pendiente y observaciones
- En el final del nivel 6, **el compartimento solo se ve si la linterna apunta hacia el reloj**; en la prueba de hoy quedó casi a oscuras (`61_01`).
  La pista se lee igual, pero la apertura puede pasar desapercibida. No lo cambié.
- No se volvió a jugar la campaña completa 1→6 tras este arreglo (sí el final del 5 y del 6).

