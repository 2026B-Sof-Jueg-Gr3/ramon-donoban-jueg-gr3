# Cambios de narrativa aprobados (2026-11-26)

Tres agregados: el cierre del nivel 4 en cuatro páginas, «Ahí estás...» en el nivel 5 y la conexión de la «V» en el nivel 6.
**Sin commit, push, tags ni ramas.** Pruebas: **527 de 527**. Maquetación: **0 problemas en las 35 pantallas**.

## 1. Archivos modificados

### Ya hechos antes de este trabajo (comprobados, no repetidos)

| Archivo | Motivo |
|---|---|
| `src/motor/Investigacion.js` | Categoría de texto `momentos:<id>` y los hechos `acerto:<pregunta>` y `en-registro:<pista>` |
| `assets/narrativa/nivel5.json`, `nivel6.json` | Las dos líneas nuevas en `momentos` |
| `assets/investigaciones/nivel5.json` | Objeto `sombra` (se descubre con luz) y regla `momento:sombra-vista` |
| `assets/investigaciones/nivel6.json` | Regla `momento:conexion-v` |
| `assets/presentacion/expresiones.json` | `serio` (nivel 5) y `pensativo` (nivel 6) |
| `pruebas/guion.test.mjs`, `investigacion.test.mjs`, `niveles.test.mjs` | `momentos` en niveles 5 y 6, sus 2 pruebas y la lista de líneas esperadas |

### De este trabajo

| Archivo | Motivo |
|---|---|
| `pruebas/expresiones.test.mjs` | Ajuste autorizado: `momento:sombra-vista` en la lista del nivel 5 |
| `pruebas/niveles.test.mjs` | Ajuste autorizado: excluir `acerto`, `en-registro` e `ilumino:sombra` de «con todo hecho» |
| `src/presentacion/habitaciones/Sombra.js` | Avisar la primera vez que la luz da en la sombra, antes de avanzar la persecución |
| `src/presentacion/Cuaderno.js` | Aviso `alAcertar`; la libreta solo se cierra si hay una línea que mostrar |
| `src/escenas/Habitacion.js` | Informar el Registro a la investigación, `alAcertar` y el aviso de páginas del cierre |
| `assets/narrativa/nivel4.json` | El cierre aprobado, en cuatro páginas (`\f`) |
| `src/ui/DialogoPrincipal.js` | `CORTE`, paginado por tramos y `alMostrarTramo` (una vez por tramo y apertura) |
| `src/presentacion/Narracion.js` | Pasar `alMostrarTramo` a la caja |
| `src/presentacion/habitaciones/Juguetes.js` | La silueta cruza al aparecer «Espera.» y el informe espera a que termine |
| `src/motor/cargaExtrema.js`, `src/presentacion/RecorridoDeRevision.js` | Cambiar `\f` por un espacio en la carga extrema y la revisión |
| `pruebas/nivel5.test.mjs`, `nivel6.test.mjs`, `cajaGrande.test.mjs`, `guion.test.mjs` | Pruebas nuevas |
| `DISENO_V2.md` (sección 6) | Los tres agregados y la decisión sobre el Registro persistente |
| `docs/narrativa/INFORME_CAMBIOS_NARRATIVOS.md` | Este informe |

## 2. Pruebas

`node --test "pruebas/*.test.mjs"`: **527 pruebas, 527 en verde**, incluidas las de temporizadores. Antes: 507 de 510; con los dos
ajustes autorizados, 510 de 510; las 17 nuevas completan las 527.

- **Nivel 5 (5):** la línea sale la primera vez, como importante y con su texto; no sale sin luz, en pausa ni con la sombra capturada o
  escapada; no se repite (tampoco tras perder un intento); ni la sombra ni los papeles avanzan en ese cuadro ni en la pausa; la captura
  sigue pidiendo 1,5 s de luz.
- **Nivel 6 (7):** sale al acertar `detras` con el abrigo; no sale sin él, con `espantaba`, dos veces ni tras un error; la libreta se
  cierra y vuelve a la segunda pregunta, o pasa directo; las preguntas y respuestas son las mismas; los hallazgos extra de los seis
  niveles siguen siendo 4, 2, 5, 4, 4 y 4.
- **Caja por páginas (4):** ninguna página mezcla tramos; un tramo largo ocupa varias sin perder texto; `alMostrarTramo` una vez por
  tramo y en orden, también al redibujar; la silueta cruza una vez y el informe la espera.
- **Guion (1):** fija el cierre del nivel 4; ningún otro texto de la historia lleva `\f`.

## 3. Revisor de maquetación

`window.__recorrido()` en el navegador:

| Modo | Pantallas | Problemas |
|---|---|---|
| Contenido real máximo | 35 | 0 |
| Carga extrema (`?carga=extrema`) | 35 | 0 |

La caja de importantes del revisor usa el texto sin `\f`. Las cuatro páginas reales del nivel 4 se miraron en pantalla, no con el revisor.

## 4. Recorridos en el navegador

Página visible, 180–181 FPS, música silenciada, consola sin errores. Se caminó con el jugador automático y las ayudas `__v`.

### Nivel 4 (cierre y silueta)

Jugado hasta cortar el último hilo, pasando las páginas con **E** (tiempos en segundos desde que cargó la página):

| Momento | Tiempo |
|---|---|
| Página 1 | 115,62 |
| Página 2, «Espera.» | 123,72 |
| La silueta se mueve por primera vez (1 px) | 123,86 (+0,14) |
| Página 3 (la nombra), pasada enseguida | 123,97 |
| La silueta termina de cruzar | 126,93 (+3,22 desde «Espera.») |
| Página 4 | 131,75 |
| Informe | 134,25 |

- En la página 3 la silueta estaba frente a la ventana.
- La marca `\f` no apareció en ningún texto en pantalla (0 cuadros).
- **El informe espera:** en una segunda pasada (llamando a `cerrarNivel()` en la habitación, sin volver a jugarla) se leyó deprisa. El
  texto se cerró a los 149,68 s con la silueta cruzando; 1 s después seguía en el cierre; la salida al informe empezó a los 152,22 s, en
  el mismo instante en que terminó el cruce.

### Nivel 5 («Ahí estás...»)

Retrato **serio**. Posición de la sombra y tiempo de los papeles:

| Momento | x | y | Papeles (s) |
|---|---|---|---|
| Al salir la línea | 668,565 | 369,658 | 1,9167 |
| Tras 3 s leyendo | 668,565 | 369,658 | 1,9167 |
| Último cuadro con el texto | 668,565 | 369,658 | 1,9167 |
| Primer cuadro sin el texto | 668,849 | 369,391 | 1,9222 |

- Intento perdido a propósito (la sombra escapó a los 12,7 s): en el siguiente la luz la tocó 175 cuadros y la línea **no se repitió**.
- Hubo un segundo escape (5,3 s) y después la captura (20,8 s del intento), con 1,50 s de luz. La línea salió una sola vez en total.

### Nivel 6 (la conexión de la «V»)

- **Con el abrigo:** primero un error a propósito en la pregunta 1 (sale la línea de error y vuelve a la misma pregunta; la conexión no
  sale). Al acertar, la libreta se cierra y sale la línea con retrato **pensativo**; al pasarla aparece la pregunta 2 de 2. Cerrar y
  reabrir el expediente y volver a «Resolver el caso» no la repite.
- **Con el ratón:** al hacer clic en «Presentar pruebas» la línea sale y se queda (el mismo clic no la salta).
- **Sin el abrigo** (quitado del Registro de prueba): pasa directo a la pregunta 2.

## 5. Lo que no cambió

- `src/motor/Persecucion.js`, los mapas y las ayudas: sin cambios de este trabajo.
- `src/ui/Narrador.js` y los tiempos de lectura: no los toqué. `Narrador.js` ya venía modificado (solo se quitaron dos emojis).
- La escritura letra a letra y la corrección de temporizadores por identidad: intactas.
- Deducciones, pistas, revelaciones, diálogos existentes y estadísticas: iguales. En los datos solo cambian el cierre del nivel 4 y las
  líneas y reglas nuevas.

## 6. Para tu revisión

- **La silueta puede haber pasado antes de que la página 3 la nombre.** Cruza en 3,2 s desde «Espera.»; quien se quede más tiempo en esa
  página leerá «¡Una silueta...!» con la ventana ya vacía. Es lo que pide el encargo; no lo cambié.
- **Durante la espera tras cerrar el cierre del nivel 4** (como mucho unos 3 s) se puede mover al inspector; la cámara sigue en la
  ventana y no se puede usar nada.
- **Entorno de prueba:** usé `127.0.0.1:8787` (un guardado aparte del de `localhost`), lo dejé como estaba, cerré mi pestaña y detuve mi
  servidor. Sigue en marcha otro `python servidor.py` en el puerto 8787 (proceso 4720) que no inicié yo y que no toqué.
- No lo probó una persona, ni en otros tamaños de pantalla.
