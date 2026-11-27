# Informe del nivel 6 — «La Verdad Revelada» (reconstrucción y deducción final)

Rama `v2-investigacion`. **Nada está commiteado**.

## 1. Qué es el nivel
El despacho del viejo Flieder: el **gran reloj detenido** con el **suelo hueco** junto a él (al pisarlo sale una **onda visible y polvo**: es la forma
de «escuchar» sin audio), los **archivos movidos** con **marcas frescas** (solo con luz), el **archivador forzado**, los **libros de contabilidad**,
la **pluma «G. V.»**, las **cartas de compradores** y las **pilas**. Ordenar los archivos es **una pulsación de E** (sin Sokoban).

- Mapa `assets/mapas/nivel6.json` (`docs/mapas/generar_mapa_nivel6.py`) · reglas `nivel6.json` · módulo `src/presentacion/habitaciones/Despacho.js`.
- **La libreta es el EXPEDIENTE DE LA MANSIÓN**: las pruebas del despacho más **todas las pistas que el Registro guardó** en los niveles anteriores,
  **agrupadas por habitación** (`Cuaderno.grupos`, con zona desplazable). Los planos y el abrigo del nivel 5 y la carta del 3 están ahí.
- **Deducción final** (texto aprobado; nombra a Voss; UNA respuesta cada una):
  1. «¿Quién está detrás de la «maldición»?» → **Gerhard Voss, el albacea** — única respuesta: **Pluma «G. V.» + Recibo de ferretería** (nivel 2).
  2. «¿Por qué espantaba a los compradores?» → **Para buscar el tesoro sin que nadie se quedara con la casa** — única respuesta: **Carta sin enviar**
     (nivel 3) **+ Planos de la mansión** (nivel 5).
  Nombres cortos: *Cuentas que no cuadran* (revelación 0), *Siete rechazos* (revelación 1), *Pluma «G. V.»*, *Archivador forzado*, *Reloj detenido*;
  **los libros no son prueba**.
- **Si falta una pista de un nivel anterior** (recibo, carta o planos), la pregunta que la necesita **no se puede resolver** (la deducción no se ofrece);
  está probado y queda anotado aquí: hay que volver a esa habitación.
- **Cierre**: al resolver sale el texto del cierre; **después** se abre el **compartimento bajo el reloj** (animación) y sale la pista
  **COMPARTIMENTO BAJO EL RELOJ**, que queda en el Registro y **no entra en la deducción**. Luego el informe final («¡CASO CERRADO!…») con el botón
  **«Ver créditos»**.
- Ayuda, en orden: **libreta** → **marcas de los archivos** → **onda del suelo hueco** (más fuerte cerca del reloj) → **cartas** que se agitan.

## 2. Cada línea: disparador y orden

| Línea (id) | Texto (de la narrativa) | Clase | Se dispara cuando… | Depende de (física) |
|---|---|---|---|---|
| `intro` | «El despacho del viejo Flieder. Aquí termina la mentira.» | importante | el inspector entra | — |
| `comentario:0` | «Estos archivos fueron movidos hace poco: las marcas están frescas.» | secundaria | examina (E) `archivos` | requiere alumbra con la linterna `n6-marcas` |
| `comentario:1` | «El suelo junto al reloj suena hueco.» | secundaria | camina por la zona `hueco` | — |
| `comentario:2` | «Todo en esta habitación apunta al mismo lugar.» | secundaria | examina (E) `n6-mueble-reloj` **y** camina por la zona `hueco` | — |
| `revelacion:0` | «Archivos en orden. Las cuentas de la herencia no cuadran desde hace…» | importante | ordena (E) `archivos` | requiere examina (E) `archivos` |
| `pista:n6-pista-compradores` | «CARTAS DE COMPRADORES: Siete ofertas en doce años. Todas rechazadas…» | secundaria | recoge (E) `n6-pista-compradores` | — |
| `revelacion:1` | «Siete ofertas de compra, siete rechazos. Ninguno por fantasmas.» | importante | recoge (E) `n6-pista-compradores` | — |
| `mueble:n6-mueble-reloj` | «El gran reloj del despacho, detenido. Sus agujas no se mueven... y …» | secundaria | examina (E) `n6-mueble-reloj` | — |
| `mueble:n6-mueble-libros` | «Libros de contabilidad de la herencia. Las cifras no cuadran desde …» | secundaria | examina (E) `n6-mueble-libros` | — |
| `mueble:n6-mueble-archivador` | «Un archivador forzado. Faltan las escrituras de la mansión.» | secundaria | examina (E) `n6-mueble-archivador` | — |
| `mueble:n6-mueble-pluma` | «Una pluma estilográfica grabada: «G. V.»» | secundaria | examina (E) `n6-mueble-pluma` | — |
| `pista:n6-pista-compartimento` | «COMPARTIMENTO BAJO EL RELOJ: Vacío, salvo unas herramientas de exca…» | secundaria | resuelve la deducción | — |
| `bateria` | «Últimas pilas. Suficiente luz para ver la verdad.» | secundaria | recoge (E) `bateria` | — |

Las cartas: primero sale la **pista** y 1,2 s después la **revelación 1**. La pista del compartimento se **retiene** hasta que termina el texto del cierre.

## 3. Lo que se verificó caminando
- Se recorrió el despacho caminando (marcas con luz → archivos: examinar y ordenar → suelo hueco con onda y comentario → reloj → archivador → cartas
  → pluma → libros → pilas) y se abrió el expediente con las pistas del Registro (`n6_01`, `n6_02`). **Con el Registro de esa sesión no había recibo
  de ferretería**, así que la deducción (correctamente) no se ofrecía.
- **La deducción final con teclas y el cierre con el compartimento NO se jugaron de principio a fin en el navegador** (ver §6).

## 4. Pruebas automáticas
`pruebas/nivel6.test.mjs` (13) + `niveles.test.mjs`: cada línea con su disparador; archivos examinar → ordenar; comentario 2 con reloj **y** suelo hueco en
cualquier orden; pista antes de revelación; **las pruebas del Registro aparecen en el expediente** agrupadas por habitación, sin repetir; el oráculo de las
dos preguntas (solo pluma+recibo y carta+planos; cualquier otra cosa, error); **si falta una pista de un nivel anterior, la pregunta no se resuelve**; el cierre
y la pista del compartimento después; la ayuda en orden. Suite completa: **467 pruebas, 0 fallos**.

## 5. Maquetación
Se midió con el revisor F6 (`window.__recorrido()`, sin y con `?carga=extrema`) sobre las **34 pantallas** del juego: **0 solapes en las 34, en
las dos modalidades**. Las filas de este nivel son:

| Pantalla | Contenido real máximo (elementos revisados · solapes) | Carga extrema (elementos · solapes) |
|---|---|---|
| `libreta-nivel6` | 21 · **0** | 17 · **0** |
| `conclusion-nivel6` | 10 · **0** | 10 · **0** |
| `pruebas-nivel6` | 31 · **0** | 25 · **0** |
| `informe-nivel6` | 11 · **0** | 9 · **0** |

El expediente se revisó también en carga extrema (35 hallazgos repartidos por las 6 habitaciones): `n6_03`.

## 6. No verificado
- La **deducción final y el cierre (compartimento + pista) jugados en el navegador** y el informe final con «Ver créditos» → créditos.
- La ayuda del nivel 6 en pantalla (marcas, onda fuerte, cartas).
- La **campaña completa 1→6 en una pestaña nueva, hasta los créditos**, quedó a medias: se hicieron los niveles 1 y 2 de principio a fin
  desde el menú, con datos borrados y teclas reales (ver informe consolidado). El panel del navegador pasó a segundo plano (la ventana de la
  app dejó de estar a la vista: ~4 cuadros por segundo) y no se pudo seguir caminando en tiempo real.

Capturas en `docs/fase6/capturas/`: `n6_01` (expediente), `n6_02` (suelo hueco y onda), `n6_03` (expediente en carga extrema).
