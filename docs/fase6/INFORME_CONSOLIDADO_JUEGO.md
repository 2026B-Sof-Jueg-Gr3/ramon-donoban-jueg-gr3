# Informe consolidado — El juego completo (niveles 1 a 6)

Rama `v2-investigacion`. **Nada está commiteado**: el «Autorizado» del PASO 0 llegó en blanco, así que no se hizo ningún commit
(cuando lo autorices: un solo commit «v2: niveles 1 y 2 jugables (pasillo y cocina)», con archivos por nombre, sin el PDF, el PPTX ni los
`screenshot_*.jpg`, autor DonobanR, sin Co-Authored-By). Esperando tu revisión.

## 1. Estado por nivel

| Nivel | Habitación | Mecánica propia | Deducción (única respuesta) | Final | Jugado caminando | Informe |
|---|---|---|---|---|---|---|
| 1 | El Pasillo Oscuro | luz, marcas, cajas, cortinas | cortinas → *Ventana rota*; embrujado → *Cajas movidas* | cierre → informe | **sí** (campaña limpia, 1 error a propósito) | `docs/fase2`, `fase3`, `fase5/…CONSOLIDADO_FASE_5A.md` |
| 2 | El Fantasma de la Cocina | alacena que rueda, cuerda, fuelle, golpes | mecanismo → *Cuerda + Fuelle*; ¿alguien sigue manejando el fantasma? → *Recibo + Taza*; ¿trabaja solo? → *Platos para dos* | cierre → informe | **sí** (campaña limpia, 1 error a propósito) | `docs/fase5/INFORME_FASE_5A_COCINA.md` |
| 3 | La Puerta con Candado | rastro con luz, tablas, mirar debajo, puerta con llave o ganzúas | *Camino sin polvo + Huellas recientes* (carta obligatoria) | abrir la puerta | un orden (sesión anterior) | `docs/fase5/INFORME_NIVEL_3.md` |
| 4 | El Cuarto de los Juguetes | hilos, tirar, cortar, trampilla, fenómeno | *Oso con hilo cosido + Trampilla* | cortar el último hilo + silueta | un orden (sesión anterior) | `docs/fase5/INFORME_NIVEL_4.md` |
| 5 | La Sombra en la Ventana | **persecución en tiempo real** | sin deducción: la captura | puerta al despacho | **sí, dos órdenes**; perdido por la salida, perdido por los papeles y ganado | `docs/fase6/INFORME_NIVEL_5.md` |
| 6 | La Verdad Revelada | ordenar archivos, suelo hueco, expediente | *Pluma + Recibo* · *Carta + Planos* | cierre + compartimento + créditos | **solo la investigación** (no la deducción ni el cierre) | `docs/fase6/INFORME_NIVEL_6.md` |

## 2. Qué se hizo en esta tanda
- **PASO 1 (cocina y pasillo)**: la pregunta nueva de la cocina («¿Alguien sigue manejando el fantasma?» → *Recibo + Taza*, y «¿Quién lo construyó
  trabaja solo?» pasa a tercera); en el pasillo, «embrujado» solo con *Cajas movidas*; ayuda de la cocina con el vapor de la taza y el recibo que se agita
  entre la cuerda y los platos; el informe dice «Hallazgos extra: X de Y» con Y calculado de los datos; capturas 09, 10, 12 y 17 de la fase 5a rehechas.
- **Niveles 3 a 6** con el motor común: acciones `mirar-debajo`, `cortar`, `ordenar`, `cerrar`, `apagar`, `abrir` (una pulsación de E, animación fija, sin
  Sokoban); sucesos `piso`, `vio-cerca`, `capturo`; `despuesDelCierre`; acción final configurable; libreta sin deducción; expediente (`Libreta`,
  `Cuaderno.grupos`); **`src/motor/Persecucion.js`** (determinista, con semilla).
- La ayuda sin texto (45 s) de cada nivel, en el orden pedido; el narrador y el arreglo de identidad del temporizador, intactos.
- `RecorridoDeRevision`: 34 pantallas (nuevas: libreta, conclusión, pruebas e informe de los niveles 3 a 6).
- Herramienta de verificación (no es parte del juego): `docs/fase6/herramientas/jugador_de_verificacion.js` (camina, usa, deduce con teclas).

## 3. Pruebas y maquetación
- **467 pruebas, 0 fallos** (`node --test pruebas/*.test.mjs`): comunes a los 6 niveles (47), `nivel3` (11), `nivel4` (10), `nivel5` (15), `nivel6` (13),
  `persecucion` (15) y el resto de módulos. Los niveles 1 y 2 siguen intactos.
- **Maquetación: 34 pantallas × 2 modalidades (contenido real máximo y `?carga=extrema`) = 0 solapes.** Tablas por pantalla nueva en cada informe de nivel.
  En el camino aparecieron y se corrigieron dos fallos: la carga extrema suponía una deducción (nivel 5) y los hallazgos extremos no tenían habitación (expediente).

## 4. Lo que se encontró y corrigió jugando
- Nivel 5: la sombra huía nada más empezar un intento nuevo (la linterna seguía apuntando donde se quedó → ahora vuelve al sur); la luz desde muy lejos la
  espantaba (ahora solo desde < 400 px); el informe no contaba lo recogido tras el cierre (abrigo, pilas) → se recalcula al ir al informe; la ayuda quedaba apagada
  tras la captura aunque faltara apagar la chimenea (necesaria para los planos) → sigue activa hasta el final.
- El abrigo y las pilas aparecían antes de la captura → ahora aparecen al capturar.

## 5. Campaña completa 1→6: lo que SÍ y lo que NO
- **Sí:** con datos borrados y desde el menú (Jugar → preámbulo → niveles), niveles **1 y 2** de principio a fin con teclas reales; cada informe desbloqueó
  el siguiente («Siguiente habitación»); en cada uno una prueba ajena dio el error sin castigo y luego se resolvió.
- **No:** niveles 3 a 6 encadenados desde esa misma pestaña limpia y hasta los créditos, ni el expediente del nivel 6 con las pistas llegadas de los niveles
  anteriores *en la misma partida*, ni la deducción final y el cierre del 6. Causa: a mitad del nivel 3 el panel del navegador pasó a segundo plano (la ventana
  de la app dejó de estar a la vista) y la página bajó a ~4 cuadros por segundo; caminar en tiempo real así no es fiable. **Para cerrarlo hace falta tener la
  ventana de la app a la vista** y volver a lanzar la campaña (el jugador de verificación ya está hecho y probado en los niveles 1 y 2).

## 6. No verificado (lista completa)
1. Campaña 3→6 en pestaña limpia hasta los créditos; deducción final, compartimento y «Ver créditos» del nivel 6 en el navegador.
2. Segundo orden caminando de los niveles 3 y 4 (solo pruebas automáticas).
3. Efectos de ayuda en pantalla: huellas (5), marcas/onda/cartas (6), polvo/caja/carta (3), hilos/polvo/oso (4), vapor/recibo (cocina).
4. «Tirar de la cuerda» de la cocina con el jugador automático (la prueba de la fase 5a lo cubrió; en esta tanda el jugador no llegó a esa acción).
5. La dificultad de la persecución con un jugador humano.

## 7. Pendiente del proyecto (fuera de esta tanda)
- **Fase 4:** retrato y novela visual de los textos importantes, música/audio, pantalla vertical.
- **Fase 7:** arte final (todo el arte es provisional y generado por código), móvil, README.
- Commit (PASO 0), cuando lo autorices.
