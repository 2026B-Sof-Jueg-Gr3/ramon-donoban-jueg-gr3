# Inspector Lógica v2 — Diseño del nuevo modo de juego

> Documento de planificación. **No hay código todavía.** Es la base para implementar por fases.
> Los puntos marcados con **[DECIDIR]** o **[APROBAR]** esperan tu respuesta.

---

## 1. Reglas principales

1. **Ya no es Sokoban.** Nada de empujar cajas hasta un objetivo ni de acertijos de colocar cosas.
2. **Es una aventura de investigación sobrenatural.** La fantasía del jugador es: *"Soy un inspector. Entro en una
   mansión donde pasan cosas inexplicables y tengo que descubrir qué está pasando"*, y no *"tengo que completar el nivel
   para ver qué dice el inspector"*.
3. **La historia se mantiene:** la mansión, las seis habitaciones, Voss, el cómplice, el reloj y el compartimento vacío.
   No se agregan personajes, escenas ni giros, y solo habla el inspector.
4. **Las líneas que dependían del Sokoban se reescriben** con los mismos hechos y la misma voz (sección 6). Los textos
   nuevos que piden las deducciones se proponen aparte (sección 5). Nada se aplica sin tu aprobación.
5. **Cada mecánica tiene una razón para existir.** Si no sirve para investigar o para contar la historia, no entra.
6. La v1.1 Sokoban queda guardada en git (commit `efe2ff1`).

---

## 2. El modo de juego: investigación libre en 2.5D

El jugador controla al inspector y recorre la mansión a oscuras con su linterna. En cada habitación ocurre un
fenómeno que parece sobrenatural. El jugador observa, experimenta con lo que encuentra y reconstruye lo que de verdad
pasa. Al final lo demuestra en la libreta.

```
Entrar → El fenómeno ocurre → Explorar, experimentar y descubrir (en el orden que quiera) → Deducción → Cierre e informe
```

El preámbulo ya lo describe y no cambia: *"entrar habitación por habitación, ordenar el caos y demostrar con pruebas
físicas que la 'magia' es solo una fachada. Enciende tu linterna…"*.

### Cómo se usa cada texto

**Regla nueva:** cada línea pertenece a **lo que la provoca**. En la v1.1 las líneas de `empujar` y `cajas` salían en
orden sin importar qué caja se movía; ahora cada una está atada a su objeto o a su descubrimiento. Por ejemplo, *"Esta
alacena tiene ruedas"* sale al examinar la alacena, la primera vez o la quinta, cuando el jugador llegue a ella.

| Texto | Nombre nuevo en el código **[DECIDIR]** | Cuándo aparece |
|---|---|---|
| Preámbulo | — | Llegada a la mansión bajo la tormenta |
| Título del nivel | — | Al entrar a la habitación y como título del expediente de la habitación |
| `intro` | `intro` | Al entrar a la habitación |
| `marcas` | `marcas` | Cuando el haz de la linterna las toca por primera vez |
| `muebles` | `muebles` | Al examinar ese mueble |
| `pistas` | `pistas` | Al recoger esa pista; queda en el Expediente |
| `bateria` | `bateria` | Al encontrar las pilas escondidas (hallazgo opcional) |
| `empujar` | `comentarios` | Al investigar la pieza del truco a la que se refiere cada comentario |
| `cajas` | `revelaciones` | Al descubrir cada una de las dos piezas clave del truco |
| `cierre` | `cierre` | Al completar la deducción |
| `retirar` | `error` | Al equivocarse en la deducción (o al fallar un intento en la persecución del nivel 5) |
| `informe` | `informe` | Pantalla de informe |
| Créditos | — | Pantalla de créditos |

Ninguna línea se repite. Las importantes (`intro`, revelaciones y `cierre`) pausan el juego hasta que el jugador
avanza.

---

## 3. Libertad de descubrimiento

El peligro es reemplazar los objetivos del Sokoban por una lista de tareas de investigación. Para evitarlo:

1. **Sin lista de objetivos en pantalla.**
   - No hay "Pistas 1/2" ni "Revelaciones 0/2" mientras se juega.
   - La libreta muestra lo que el jugador **ya encontró**, nunca lo que le falta.
   - Los conteos solo aparecen en el informe final.
2. **Orden libre.** Las dos revelaciones, los comentarios, las marcas, los muebles y las pistas se pueden descubrir en
   cualquier orden. La única excepción son las **dependencias físicas**: para llegar al fuelle hay que haber seguido la
   cuerda, y para ver la trampilla hay que haber seguido el hilo. Los textos ya están escritos así:
   *"Primer hilo del «fantasma»"* es la cuerda, que siempre se encuentra antes que el fuelle.
3. **Las revelaciones son consecuencias, no objetivos.** Nunca se anuncia "busca dos revelaciones": aparecen cuando el
   jugador hace la acción que naturalmente descubre algo (mover la alacena, seguir la corriente, mirar debajo de la
   caja).
4. **No todo es obligatorio.** Pistas, muebles, marcas y pilas son opcionales. Para la deducción hay más de una
   combinación de pruebas válida (sección 5), así que el jugador puede resolver sin haberlo encontrado todo.
5. **Ayuda sin texto nuevo.** Si el jugador lleva mucho tiempo sin descubrir nada, el propio fenómeno lo orienta:
   - las cortinas se agitan más fuerte;
   - la onda de cada golpe sale del lado donde está la alacena;
   - un hilo brilla un instante.
6. **La deducción se habilita** cuando el jugador tiene suficientes pruebas para defender una conclusión, no cuando
   completó una lista. *(Fase 3, aprobado.)*
   - **Aviso automático.** La primera vez que se cumple el mínimo, y después de que termine cualquier texto importante
     en curso (por ejemplo, la revelación de la ventana), espera ~1,5 s y la libreta se abre sola con dos botones:
     "Resolver el caso" y "Seguir investigando".
   - **Si sigue investigando,** queda en una esquina el ícono de la libreta con su tecla (Tab), latiendo suave. No hay
     contador. Si pasan 45 s sin abrirla, la ayuda hace que el ícono lata más fuerte (refuerzo `libreta`, el primero en la
     prioridad).
   - **Los contadores** ("Pistas: X de 2", "Pilas: encontradas / no encontradas") solo existen en la pantalla de informe.

---

## 4. La personalidad de cada habitación

No son seis habitaciones donde se camina, se alumbra y se pulsa E. Cada una tiene una **identidad jugable** propia, con
una mecánica que solo existe ahí.

| # | Habitación | Identidad jugable | Mecánica propia |
|---|---|---|---|
| 1 | El Pasillo Oscuro | **Observación** | Leer el ambiente con la linterna: el polvo que flota en el haz delata la corriente |
| 2 | El Fantasma de la Cocina | **Mecanismos** | Desarmar un aparato y volver a hacerlo funcionar uno mismo |
| 3 | La Puerta con Candado | **Rastreo y acceso** | Seguir el rastro humano entre el polvo y elegir cómo cruzar |
| 4 | El Cuarto de los Juguetes | **Experimentación** | Tirar de los hilos para descubrir qué mueve a qué |
| 5 | La Sombra en la Ventana | **Persecución y tensión** | Tiempo real contra la sombra que huye y quema pruebas |
| 6 | La Verdad Revelada | **Reconstrucción** | Escuchar el suelo hueco y armar el caso con el expediente de toda la mansión |

### 1. El Pasillo Oscuro — Observación
Es la primera habitación: enseña a moverse, alumbrar y examinar sin carteles de tutorial.
- **Fenómeno:** las cortinas se mueven y sus sombras parecen caminar por la pared.
- **Mecánica propia:** el polvo flota en el haz de la linterna y deriva siempre hacia un mismo lado. Si el jugador lo
  sigue, llega al origen de la corriente.
- **Para descubrir (cualquier orden):**
  - polvo removido y marcas de arrastre, que solo se ven con luz;
  - las cajas apiladas: una pesa más de lo que parece;
  - la huella de bota y el recorte de periódico (opcionales).
- **Revelaciones:** las marcas coinciden con las cajas (las movieron a propósito); detrás de las cajas, la ventana rota.

### 2. El Fantasma de la Cocina — Mecanismos
- **Fenómeno:** golpes metálicos y velas que se apagan solas, cada cierto tiempo.
- **Mecánica propia:** el aparato se descubre por partes y, al final, el jugador puede **accionarlo él mismo** y ver cómo
  se reproduce el "fantasma". Es la prueba física del truco.
- **Cadena con dependencia física:**
  1. La onda de cada golpe sale de la alacena.
  2. La alacena tiene ruedas, huele a aceite de máquina y tintinea por dentro.
  3. Al rodarla aparece la cuerda que sube al techo (revelación 1).
  4. Siguiendo la cuerda con la linterna se llega al fuelle escondido (revelación 2).
- **Para descubrir (cualquier orden):** copas limpias, platos para dos, la sartén con aceite, el recibo de ferretería y la
  taza tibia.

### 3. La Puerta con Candado — Rastreo y acceso
- **Fenómeno:** una puerta vieja con un candado nuevo, en una casa supuestamente abandonada.
- **Mecánica propia:** el rastro humano. Con la linterna se ve un camino sin polvo que alguien recorre a diario; seguirlo
  lleva a lo importante.
- **Revelaciones (cualquier orden):** el polvo intacto contra el camino limpio; las huellas recientes bajo la caja junto
  a la puerta.
- **Cruzar, con dos soluciones posibles** (ambas usan objetos que ya están en la historia):
  - la **llave de latón** copiada;
  - las **ganzúas** gastadas de la caja de herramientas.
- **Para descubrir:** la puerta tapiada con clavos nuevos, el llavero vacío, el barril de aceite para bisagras y la
  carta sin enviar.

### 4. El Cuarto de los Juguetes — Experimentación
- **Fenómeno:** los juguetes se mueven solos y las muñecas miran a la puerta.
- **Mecánica propia:** los hilos son casi invisibles y solo brillan bajo la linterna. El jugador **tira** de ellos y
  observa qué se mueve al otro lado del cuarto (*"Si tiro de aquí, el caballito se mueve al otro lado"*). Es investigar
  experimentando, no un acertijo con solución única.
- **Cadena con dependencia física:** desconectar un juguete y seguir su hilo hasta la trampilla del techo (revelación
  1); alumbrar la trampilla y entender que desde ahí se maneja todo (revelación 2).
- **Para descubrir:** el oso con hilo cosido, el caballito con engranajes engrasados, las muñecas alineadas, la bobina de
  hilo y la página del diario.
- **El cierre:** la silueta cruza la ventana y lleva directo al nivel 5.

### 5. La Sombra en la Ventana — Persecución y tensión
Es la única habitación en tiempo real y **no tiene deducción en la libreta**: aquí la prueba es atraparla.
- **Fenómeno:** la sombra está dentro, quemando papeles en la chimenea, y busca escapar.
- **Mecánica propia:** la sombra tiene una ruta y reacciona al inspector y a la luz. El jugador decide qué hacer primero
  con el tiempo corriendo:
  - bloquear la salida al jardín (revelación 1);
  - apagar la chimenea para salvar los papeles (revelación 2);
  - acorralarla con la linterna.
- **Rastro a contrarreloj:** pisadas mojadas, olor a humo, la habitación atrancada, las velas tibias, el cuadro con el
  agujero y el sofá hundido.
- **Si escapa de un intento:** *"Calma. Si me precipito, se escapa."* y se repite ese tramo, no el nivel entero.
- **Cierre:** *"¡Atrapado!"*. Las pistas del nivel (planos y abrigo) se pueden recoger después de la captura.

### 6. La Verdad Revelada — Reconstrucción
- **Fenómeno:** el reloj del despacho, detenido.
- **Mecánica propia:**
  - **El suelo hueco:** al caminar junto al reloj sale una onda visible (*"El suelo junto al reloj suena hueco"*).
  - **Reconstruir:** la deducción final usa el expediente de **toda la mansión**, no solo de esta habitación.
- **Revelaciones (cualquier orden):** los archivos ordenados muestran que las cuentas no cuadran; las cartas de
  compradores: siete ofertas, siete rechazos.
- **Para descubrir:** la pluma "G. V.", el archivador forzado, los libros de contabilidad y el reloj.
- **Cierre:** abrir el compartimento bajo el reloj: vacío, con herramientas al lado.

---

## 5. Deducciones con profundidad

> ### La regla: una pregunta, una sola respuesta *(Arreglo 5a.2)*
>
> **Cada pregunta tiene UNA sola respuesta válida**, formada solo por las pruebas que responden **directamente** esa
> pregunta. No hay respuestas alternativas con pruebas que hablan de otra cosa (quién lo hizo, cuándo, para qué): esas
> pertenecen a **otra** pregunta. Una prueba que no responde directamente ninguna pregunta del nivel aparece en la libreta y
> queda en el Registro, pero presentarla es **error**.
>
> Ejemplos: en el pasillo, "¿Qué mueve las cortinas?" → solo *Ventana rota*. En la cocina, "¿Qué produce los golpes y apaga
> las velas?" → solo *Cuerda al techo* + *Fuelle escondido* (el RECIBO DE FERRETERÍA dice quién compró las piezas, no qué
> produce los golpes).
>
> **Comprobación automática** (`pruebas/deduccion.test.mjs`, y `validarDeduccion` al cargar la habitación): ninguna pregunta de
> ningún nivel puede tener más de una combinación válida; si alguna la tiene, falla y dice cuál. La única forma de admitir
> más de una es una **excepción explícita** (`"excepcion"` con su comentario en `assets/investigaciones/nivelN.json`),
> que queda pendiente de decisión. Hoy hay una: la pregunta 2 del pasillo (abajo).

La deducción tiene que comprobar que el jugador **entendió** el fenómeno, no que juntó objetos. Tiene que llegar al
momento de *"ahora entiendo cómo lo hicieron"*.

### Cómo funciona

Cada deducción tiene **una o dos preguntas**. Cada pregunta se resuelve en dos pasos:

1. **Conclusión:** elegir la explicación entre tres opciones.
   - una es la verdadera;
   - otra es una explicación física razonable pero equivocada;
   - la tercera es la versión "sobrenatural" que cuenta la leyenda.
2. **Demostración:** respaldarla con las pruebas del expediente que la responden directamente (la regla de arriba: **una sola
   respuesta**; el jugador puede tener además otras cosas en la libreta). Se eligen **1 o 2 pruebas como máximo** por pregunta,
   para que no se pueda marcar todo; la respuesta vale si las pruebas elegidas forman la combinación válida **y todas son
   pertinentes** a la pregunta (ver "Prueba que no tiene nada que ver → error", más abajo).

Las opciones de la conclusión salen en **orden mezclado** (la correcta no siempre está primera). Una pregunta ya resuelta no
vuelve a preguntarse. *(Fase 3, aprobado.)*

- **Acierto:** con la última pregunta resuelta sale el `cierre`.
- **Error:** el inspector dice su línea de `error` como texto importante y el jugador vuelve a **esa misma pregunta** sin
  castigo, porque *corregir un error también es parte del método*. **Decidido: sin castigo** (decisión 7).
- **Prueba equivocada:** si la conclusión es correcta pero la prueba no la respalda, también sale la línea de `error`.
  Así no se puede adivinar probando opciones.
- **Prueba que no tiene nada que ver → error.** *(Arreglo 3.2.)* Una respuesta es correcta solo si: 1) la conclusión es la
  correcta, 2) las pruebas elegidas forman al menos una combinación válida y 3) **todas** las pruebas elegidas son pertinentes
  a esa pregunta, es decir, aparecen en alguna de sus combinaciones válidas. Si una prueba no tiene nada que ver, sale la
  misma línea de `error`, sin castigo. En el nivel 1: la pregunta 1 solo vale con *Ventana rota* sola (con cualquier otra
  prueba es error); la 2 vale con 1 o 2 de {Cajas movidas, Marcas de arrastre, Polvo removido, HUELLA DE BOTA} (con el
  RECORTE o la Ventana rota es error): **es la excepción a la regla de arriba**, pendiente de decisión. Vale igual para las
  combinaciones de dos pruebas de las habitaciones siguientes (la cuerda y el fuelle): con una sola no basta, y con una ajena
  tampoco (el RECIBO con la cuerda, por ejemplo, es error). La pantalla no dice cuántas pruebas hacen falta:
  "Elige las pruebas que la respalden (máximo 2)".

### Contenido **[Niveles 1 y 2: APROBADOS (fases 3 y 5a) · niveles 3 a 6: propuesto]**

*(Las tablas de los niveles 3, 4 y 6 todavía enumeran varias combinaciones por pregunta: no cumplen la regla de arriba. Quedan
sin cambiar hasta que apruebes la única respuesta de cada una; la propuesta está en el informe del arreglo 5a.2,
`docs/fase5/INFORME_FASE_5A_COCINA.md`.)*

Esto sí es **texto nuevo**: las preguntas, las opciones y los nombres cortos de las pruebas en la libreta. Todo sale de
hechos que ya están en la historia; no agrega nada a la trama. Las pistas usan su título actual.

#### Nivel 1 — El Pasillo Oscuro

| Pregunta | Opciones (✔ = correcta) | Pruebas válidas (basta una combinación) |
|---|---|---|
| ¿Qué mueve las cortinas? | ✔ La corriente que entra por la ventana rota · Alguien las mueve desde detrás · Las sombras malditas de la mansión | **Ventana rota** |
| ¿Por qué parecía embrujado? | ✔ Alguien desordenó el pasillo a propósito · Las cajas se cayeron con el tiempo · La casa rechaza a los visitantes | **Cajas movidas**, o **Marcas de arrastre**, o **Polvo removido**, o **HUELLA DE BOTA** |

**Excepción a la regla «una pregunta, una sola respuesta» (pendiente de tu decisión):** la pregunta 2 del pasillo acepta hoy
cuatro respuestas. Está marcada en los datos con `"excepcion"`; no se cambió. Con la regla, su única respuesta sería
*Cajas movidas*.

Nombres cortos nuevos: Ventana rota, Marcas de arrastre, Polvo removido, Cajas movidas.

**Cómo salen las pruebas del nivel 1** (los textos están en `assets/narrativa/nivel1.json` → `deduccion`; la lógica, sin texto,
en `assets/investigaciones/nivel1.json` → `deduccion`):

| Prueba | Sale de la regla |
|---|---|
| Ventana rota | `revelacion:1` |
| Cajas movidas | `revelacion:0` |
| Marcas de arrastre | `marca:n1-marca-arrastre` |
| Polvo removido | `marca:n1-marca-polvo` |
| HUELLA DE BOTA · RECORTE DE PERIÓDICO | `pista:…` (con su título y su texto) |

El **RECORTE DE PERIÓDICO** aparece en la libreta pero no prueba nada en este nivel (se usará en la deducción final). Las
**pilas** no son prueba. El mínimo para que la deducción esté disponible: *Ventana rota* y al menos una de las pruebas de la
segunda pregunta.

#### Nivel 2 — El Fantasma de la Cocina *(aprobado en la fase 5a; una sola respuesta por pregunta desde el arreglo 5a.2)*

| Pregunta | Opciones (✔ = correcta) | Única respuesta válida |
|---|---|---|
| ¿Qué produce los golpes y apaga las velas? | ✔ Un mecanismo de poleas, cuerda y fuelle · El viento que baja por la chimenea · Un fantasma que golpea las ollas | **Cuerda al techo** y **Fuelle escondido** (las dos) |
| ¿Quién lo construyó trabaja solo? | ✔ No: hay alguien más con él · Sí: vive aquí escondido · Nadie lo construyó | **Platos para dos** (solo esa prueba) |
| ¿Quién maneja el fantasma de la cocina? *(pregunta 3, propuesta: pendiente de tu aprobación)* | ✔ Una persona real: compró las piezas y estuvo aquí hace poco · Nadie: el mecanismo funciona solo · Un fantasma, como cuenta la leyenda | **RECIBO DE FERRETERÍA** y **TAZA DE CAFÉ** (las dos) |

Nombres cortos nuevos: Cuerda al techo, Fuelle escondido, Alacena con ruedas, Platos para dos, Copas limpias, Sartén con aceite.

**Cómo salen las pruebas del nivel 2** (textos en `assets/narrativa/nivel2.json` → `deduccion`; lógica en
`assets/investigaciones/nivel2.json` → `deduccion`):

| Prueba | Sale de |
|---|---|
| Cuerda al techo | `revelacion:0` (la alacena rueda y deja ver la cuerda) |
| Fuelle escondido | `revelacion:1` (se examina el fuelle) |
| Alacena con ruedas | `comentario:0` (examinar la alacena) |
| Platos para dos · Copas limpias · Sartén con aceite | `mueble:` correspondiente (examinar ese mueble) |
| RECIBO DE FERRETERÍA · TAZA DE CAFÉ | `pista:…` (con su título y su texto) |

Cada pista de la cocina responde una pregunta: el **RECIBO DE FERRETERÍA** (quién compró las piezas, firmado «V») y la **TAZA DE
CAFÉ** (alguien estuvo aquí hace menos de una hora) responden **juntos** la pregunta 3; en las otras dos preguntas son error. Las
*Copas limpias*, la *Sartén con aceite* y la *Alacena con ruedas* aparecen en la libreta pero no responden ninguna pregunta (el error
del nivel 2 sale si se presentan). Las **pilas** no son prueba. Mínimo para que la deducción esté disponible: *Cuerda al techo*,
*Fuelle escondido*, *Platos para dos*, el recibo y la taza (hay que recoger las dos pistas).

#### Nivel 3 — La Puerta con Candado

| Pregunta | Opciones | Pruebas válidas |
|---|---|---|
| ¿Por qué hay un candado nuevo en una puerta vieja? | ✔ Alguien entra y sale a diario y no quiere visitas · Nadie ha cruzado esta puerta en años · La sellaron para encerrar algo | **Camino sin polvo** y **Huellas recientes**, o **LLAVE DE LATÓN**, o **Aceite para bisagras** |

El "para qué" (la `CARTA SIN ENVIAR`: *"mientras crean que la casa está maldita, ningún comprador se acercará"*) queda
como pista opcional aquí y se usa en la deducción final.

Nombres cortos nuevos: Camino sin polvo, Huellas recientes, Llavero vacío, Puerta tapiada, Herramientas de cerrajero, Aceite para bisagras.

#### Nivel 4 — El Cuarto de los Juguetes

| Pregunta | Opciones | Pruebas válidas |
|---|---|---|
| ¿Cómo se mueven los juguetes? | ✔ Con hilos manejados desde una trampilla del techo · Con engranajes de cuerda que alguien engrasó · Cobran vida solos | **Trampilla del techo** y **BOBINA DE HILO DE PESCAR**, o **Oso con hilo cosido** y **Trampilla del techo** |

La opción de los engranajes es la trampa: el caballito sí tiene engranajes engrasados, pero no explica el movimiento.

Nombres cortos nuevos: Trampilla del techo, Oso con hilo cosido, Caballito engrasado, Muñecas alineadas.

#### Nivel 5 — La Sombra en la Ventana

Sin deducción: la captura es la prueba.

#### Nivel 6 — La Verdad Revelada (deducción final)

| Pregunta | Opciones | Pruebas válidas (de toda la mansión) |
|---|---|---|
| ¿Quién está detrás de la "maldición"? | ✔ Gerhard Voss, el albacea · El cómplice de la ventana · La propia maldición de los Flieder | **Pluma "G. V."** y una de: **CARTAS DE COMPRADORES** (rechazadas por el albacea), **RECIBO DE FERRETERÍA** (firmado "V"), **ABRIGO NEGRO** (la nota firmada "—V."), **RECORTE DE PERIÓDICO** (Voss administra la mansión) |
| ¿Por qué espantaba a los compradores? | ✔ Para buscar el tesoro sin que nadie se quedara con la casa · Para proteger la memoria del señor Flieder · Porque creía en la maldición | **Siete rechazos** o **CARTAS DE COMPRADORES** o **CARTA SIN ENVIAR**, y una de: **Cuentas que no cuadran**, **PLANOS DE LA MANSIÓN**, **PÁGINA DE UN DIARIO INFANTIL** |

La pista `COMPARTIMENTO BAJO EL RELOJ` no entra en la deducción porque el compartimento se abre en el `cierre`, después
de deducir.

Nombres cortos nuevos: Cuentas que no cuadran, Siete rechazos, Pluma "G. V.", Archivador forzado, Reloj detenido.

Ojo: la historia nunca dice con todas las letras "fue Voss", pero todas las pistas apuntan a él (la "V", "G. V." en la
pluma y en las herramientas, la administración de la mansión). La deducción lo hace explícito, y el informe final
mantiene su frase *"no todas las preguntas tienen respuesta"* sobre el tesoro. **[DECIDIR]** si te parece bien que el
jugador lo concluya.

---

## 6. Cambios a las líneas del Sokoban **[APROBAR]**

Solo se tocan las líneas que hablaban de colocar o empujar cajas. Los hechos no cambian. Las versiones nuevas tampoco
dependen del orden, para respetar la libertad de descubrimiento.

| Dónde | Texto actual | Propuesta |
|---|---|---|
| Nivel 1, `intro` | Primera regla del método: las cajas solo se empujan, nunca se jalan. Segunda regla: los fantasmas no existen. Empecemos por este pasillo. | Primera regla del método: todo deja rastro. Segunda regla: los fantasmas no existen. Empecemos por este pasillo. |
| Nivel 1, comentario | Pesa más de lo que parece. Aquí dentro hay algo más que polvo. | Esta caja pesa más de lo que parece. Aquí dentro hay algo más que polvo. |
| Nivel 1, revelación | Primera en su sitio. Las marcas del suelo coinciden: alguien la sacó de aquí a propósito. | Las marcas del suelo coinciden: alguien sacó estas cajas de aquí a propósito. |
| Nivel 1, revelación | Segunda. Detrás estaba la ventana rota; por ahí entra el viento que mueve las cortinas. | Detrás de las cajas está la ventana rota; por ahí entra el viento que mueve las cortinas. |
| Nivel 1, `cierre` | Listo. Sin cajas tapando la corriente, las cortinas dejan de «caminar». El pasillo no estaba embrujado: alguien lo desordenó para que lo pareciera. | Listo. Las cortinas no «caminan»: es la corriente de la ventana rota. El pasillo no estaba embrujado: alguien lo desordenó para que lo pareciera. |
| Nivel 1, `error` | No, ahí no iba. Corregir un error también es parte del método. | No, eso no encaja. Corregir un error también es parte del método. |
| Nivel 2, `error` | Mmm, no. Ese no era su lugar. | Mmm, no. Esa pieza no encaja. |
| Créditos | …usando la razón. Pon cada pista en su sitio. | …usando la razón. Recorre la mansión y encuentra cada pista. |

El resto de las líneas de `empujar`, `cajas` y `retirar` ya hablan de lo que el inspector descubre y encajan sin
cambios, igual que el preámbulo, los informes, las pistas, las marcas, los muebles y las pilas.

### Agregados de narrativa aprobados (2026-11-26)

Son los únicos tres. No cambian mecánicas, pistas, deducciones ni estadísticas.

1. **Nivel 4, el cierre en cuatro páginas.** El texto de `cierre` lleva el carácter de salto de página (`\f`) entre página y página;
   la caja grande empieza una página nueva en cada uno y nunca lo dibuja. La silueta cruza la ventana al aparecer la segunda página
   («Espera.»), la tercera la nombra y el informe espera a que termine de cruzar.
   - «Último hilo cortado. Los juguetes no cobraban vida: alguien los manejaba desde arriba...»
   - «Espera.»
   - «¡Una silueta, frente a la ventana! Alguien nos estaba observando.»
   - «Hasta ahora solo tenía rastros. Esta vez, el rastro tiene piernas.»
2. **Nivel 5, «Ahí estás...»** (`momentos.sombra-vista`). Sale la primera vez que la linterna ilumina la sombra: importante, con
   pausa (la sombra y los papeles no avanzan), expresión **seria**. Una sola vez por partida, aunque se pierda un intento.
3. **Nivel 6, la conexión de la «V»** (`momentos.conexion-v`). «El cómplice no habló. No hizo falta: la «V» de su nota es la misma
   que firma esta pluma.» Sale justo después de acertar la pregunta `detras`, solo si el abrigo (`n5-pista-abrigo`) está en el
   Registro; expresión **pensativa**. La libreta se cierra para mostrarla y vuelve en la segunda pregunta; sin el abrigo, pasa directo.
   - **Decisión intencional:** el Registro es persistente, así que si el abrigo se recogió en una partida anterior la línea sale
     igual, del mismo modo que el expediente del nivel 6 muestra todas las pistas guardadas.

---

## 7. Mecánicas generales

### 7.1 Moverse
- Movimiento libre en 8 direcciones, con animaciones de caminar, quieto y examinar.
- La cámara sigue al inspector; las habitaciones pueden ser más grandes que la pantalla.
- Orden por profundidad: el inspector pasa por delante o por detrás de los muebles según su posición.

### 7.2 La linterna
Tiene que verse convincente; no basta un círculo transparente encima del escenario.
- **Cono de luz** con bordes suaves y caída de intensidad con la distancia.
- **La luz se bloquea:** paredes y muebles altos cortan el cono y proyectan sombra detrás. Esto se calcula con un
  polígono de visibilidad desde la linterna.
- **Los objetos reaccionan a la luz:** iluminación 2D de Phaser (Light2D) con mapas de normales.
- **Polvo en el haz,** que además es la mecánica propia del pasillo.
- **La linterna revela:** marcas, hilos, huellas y el camino sin polvo solo existen para el jugador cuando la luz los toca.
- **Apuntar:** con ratón hacia el cursor; solo con teclado, hacia donde camina; en celular, hacia donde se mueve el
  control táctil.
- No se gasta; las pilas son un hallazgo opcional.

### 7.3 Interactuar
- Al acercarse a algo interactuable aparece un ícono discreto y la tecla de acción. *(Arreglo 3.1)* Para que una acción sea
  posible, y para que aparezca el ícono, se cumplen **tres condiciones**: **cerca** (los pies a 40 px o menos de la zona del
  objeto; cada objeto puede bajar ese alcance, no superarlo), **de frente** (la dirección de la linterna apunta al objeto,
  dentro de ±60°) y **con luz** (el cono o el halo que rodea al inspector tocan alguna parte del objeto; lo que tapa un mueble
  o una pared no cuenta). "Mirar detrás" de la pila es una franja pequeña bajo la ventana rota: hay que estar dentro,
  mirándola. Regla pura en `src/motor/Alcance.js`.
- Acciones según el objeto: examinar, recoger, rodar, tirar, cortar, abrir, apagar, bloquear, mirar debajo, accionar.
- Una acción puede disparar un comentario, una revelación o un cambio en la habitación (el fenómeno se detiene, se abre
  una puerta, el mecanismo se activa). *(Arreglo 3.2)* Cuando una acción ya no produce nada nuevo (mirar la ventana después
  de la revelación, examinar de nuevo lo examinado) el ícono E no aparece sobre ella.

### 7.4 La libreta
- **Expediente:** lo encontrado en cada habitación (pistas, marcas, muebles, revelaciones) con su texto. Solo muestra lo
  encontrado.
- **Cómo se abre:** Tab o I; Esc la cierra. Mientras está abierta el juego se pausa. Solo muestra lo encontrado: las
  pruebas con su nombre corto y las pistas con su título y su texto. *(Arreglo 3.3)* Desde que hay una pregunta resuelta
  añade una sección "DEDUCCIÓN" con cada pregunta resuelta, su conclusión y una marca ✔; las pendientes no se muestran. Lo
  resuelto no se pierde: si se falla la pregunta 2 y se sale a buscar más pruebas, al volver sigue en la 2 (nunca vuelve a
  la 1).
- **Deducción:** desde que hay pruebas suficientes (sección 5) la libreta muestra el botón "Resolver el caso", y se abre
  sola la primera vez que se cumple el mínimo (sección 3, punto 6). Pregunta por pregunta: 1) elegir la conclusión entre
  3 opciones en orden mezclado y 2) elegir las pruebas (máximo 2) y pulsar "Presentar pruebas". Funciona con ratón y con teclado
  (flechas o WASD mueven, E o Enter eligen, Esc vuelve un paso).

### 7.5 Presentación de novela visual
- **Importantes** (`intro`, revelaciones, `cierre`): pausa real, retrato del inspector, caja de texto grande; el jugador
  avanza cuando quiere. Es la pausa narrativa de la v1.1 con nueva cara.
- **Comentarios, marcas, muebles, pistas, pilas:** no detienen el juego; salen en una caja pequeña mientras el jugador
  sigue moviéndose, con las colas y prioridades del `Narrador` de la v1.1.
- **El `cierre`:** el fenómeno se apaga y entra luz. *(Fase 3: sale como importante, las cortinas se
  calman y la ayuda se apaga; al cerrar el texto se pasa **directo al informe**. La luz llega en la fase 4.)*

### 7.6 La mansión como recorrido
- Las habitaciones se conectan por puertas, en el orden de la historia. Al resolver una se abre el paso y el jugador
  camina a la siguiente. **[DECIDIR]** conectadas o niveles separados.
- El menú de niveles se conserva para volver a jugar las habitaciones resueltas.

### 7.7 Informe y progreso
- El informe muestra el título del nivel, el texto de `informe` sin cambios y lo encontrado: "Pistas: X de 2" y "Pilas:
  encontradas / no encontradas". Es el único lugar con contadores. Botones: "Siguiente habitación" (por ahora lleva a
  EnConstruccion de la habitación siguiente) y "Volver al menú". *(Fase 3. Las marcas descubiertas y el tiempo del diseño
  original quedaron fuera de esta versión.)*
- Ya no hay récords de pasos ni empujones. **[DECIDIR]** si quieres un récord de tiempo.
- El progreso se guarda en `localStorage`: al resolver, el nivel queda completado y el siguiente se desbloquea en el menú.
  La investigación no se guarda a medias: al volver a entrar a una habitación se empieza de cero. Las pistas del Registro
  se conservan.

---

## 8. Controles

| Acción | Teclado y ratón | Celular (horizontal) |
|---|---|---|
| Caminar | WASD / flechas | Control táctil a la izquierda |
| Apuntar la linterna | Ratón | Sigue la dirección del control |
| Interactuar / avanzar texto | E / Espacio / clic | Botón de acción a la derecha |
| Libreta | Tab o I | Botón de libreta |
| Pausa / menú | Esc | Botón de pausa |

*(Arreglo 3.3)* En el juego, Esc abre un **menú de pausa** (el juego se detiene) con "Continuar" y "Salir al menú"; esta última
pide confirmar ("Se perderá lo investigado en esta habitación. ¿Salir?", con "Salir" y "Cancelar"), porque la investigación
no se guarda a medias. Esc dentro del menú equivale a "Continuar" (y a "Cancelar" en la confirmación). Con la libreta
abierta, Esc retrocede un paso y, desde la libreta, cierra. Durante un texto importante Esc solo avisa de cómo continuar.

---

## 9. Dirección de arte (2.5D)

- **Perspectiva:** cenital 3/4 (suelo desde arriba; paredes y muebles con algo de frente y altura). **[DECIDIR]**
- **Pantalla:** lienzo base 1280×720 (16:9) con `Phaser.Scale.FIT`; celular en horizontal, con un aviso en vertical.
- **Profundidad sin 3D:**
  - orden por profundidad;
  - luz bloqueada por paredes y muebles;
  - mapas de normales;
  - sombras bajo los objetos;
  - relámpagos, lluvia en las ventanas y polvo en el haz.
- **Arte necesario:**
  - el inspector en el mapa (caminar en 8 direcciones, quieto, examinar) y en retrato con capas (neutral, pensativo,
    sonrisa irónica, sorprendido, serio, satisfecho);
  - tilesets de las habitaciones;
  - objetos interactuables con mapas de normales;
  - la sombra del nivel 5.
- **Arte provisional:** primero todo con arte generado por código, con los tamaños del arte final. **[DECIDIR]** quién
  hará el arte final.

---

## 10. Audio

**El cómplice en el suelo** (2026-11-26). Al capturar la sombra, con el cierre del nivel 5 aparece la ilustración del cómplice caído
y asustado (`assets/ilustraciones/complice-capturado.png`, anotada en `assets/ilustraciones/lista.json`), en el lado contrario al retrato
y por detrás de la caja. Solo decora: se va al cerrar el texto y no cambia nada del juego.

**Sin esperas obligatorias entre textos** (2026-11-26, por pedido del autor). Una nota nueva de la libreta reemplaza al instante la que se
estaba leyendo; una tarjeta de rastro nueva quita la más vieja si ya hay tres; y la revelación sale en cuanto su causa está a la vista
(antes había 1,2 s de cuenta). Lo que sale de un mismo suceso, o lo que se juntó durante una pausa, sí se lee en orden.

**Solo música de fondo, por decisión del autor** (2026-11-26; antes, sin audio). Ningún efecto de sonido: lo que el diseño contaba con el oído
se cuenta con la vista (el suelo hueco hace una onda, los golpes de la cocina un anillo) y los relámpagos son solo luz. Cada parte tiene su
canción (`assets/musica/lista.json`: inicio, nivel1…nivel6 y final, que empieza con el cierre de la última habitación), con fundidos entre
una y otra, volumen bajo (`src/motor/ListaDeMusica.js`) y **M** para silenciar.

---

## 11. Arquitectura técnica

### Principios

1. **El texto vive solo en `assets/narrativa/`**, incluidos los textos de las deducciones una vez aprobados. Los mapas y
   las reglas de cada habitación solo usan referencias por `id`.
2. **Las habitaciones se dibujan en Tiled** (editor gratuito de mapas) y se exportan a JSON, que Phaser carga de forma
   nativa.
3. **Lógica separada de la presentación:** `src/motor/` no conoce Phaser y se prueba con `node --test`.
4. **Todo se puede pausar y retomar**, como ya hace la v1.1.
5. **Validación automática:** el validador comprueba que:
   - cada texto tenga su disparador;
   - cada revelación se pueda alcanzar respetando las dependencias físicas;
   - cada deducción tenga al menos una combinación de pruebas válida que se pueda conseguir **en la misma
     habitación**, para que una pista opcional de una habitación anterior nunca sea obligatoria.

### Datos de una habitación

- **Mapa de Tiled** `assets/mapas/nivelN.json`: suelo, paredes, decoración y una capa de objetos.

  | Tipo de objeto | Propiedades |
  |---|---|
  | `inicio` | Dónde aparece el inspector |
  | `puerta` | Destino y si empieza cerrada |
  | `interactuable` | `accion` (examinar, rodar, tirar, cortar…) y `ref` |
  | `revelable` | Algo que solo existe al alumbrarlo (marca, hilo, huella, camino) |
  | `bloqueaLuz` | Paredes y muebles altos que cortan el cono |
  | `pista` / `mueble` / `marca` / `bateria` | `ref` al `id` de la narrativa |
  | `fenomeno` | Efecto de la habitación (cortinas, golpes, juguetes) y su origen |
  | `luz` | Ventanas y velas: color e intensidad |
  | `zona` | Áreas que disparan algo al entrar (el suelo hueco) |

- **Reglas** `assets/investigaciones/nivelN.json`, sin texto:
  - qué acción dispara cada comentario y cada revelación;
  - las dependencias físicas;
  - qué detiene el fenómeno;
  - la ayuda sin texto;
  - las preguntas y las combinaciones de pruebas válidas de la deducción;
  - en el nivel 5, la ruta de la sombra y los tiempos.

### Carpetas propuestas

```
src/
  main.js                  1280×720 FIT, física Arcade, escenas
  motor/                   lógica pura
    Investigacion.js       hallazgos, dependencias, revelaciones, fenómeno, habitación resuelta
    Interacciones.js       qué pasa al usar cada objeto
    Visibilidad.js         cono de luz, polígono de visibilidad, qué toca la luz
    Deduccion.js           conclusiones y combinaciones de pruebas válidas
    Persecucion.js         la sombra del nivel 5
    Ayuda.js               cuándo y cómo orientar sin texto
    Progreso.js
  presentacion/
    Inspector.js · Linterna.js · Fenomenos.js · Ambiente.js
    RetratoInspector.js · CajaDeTexto.js · IndicadorDeAccion.js · Musica.js · ArteProvisional.js
  escenas/
    Carga.js · MenuPrincipal.js · Interludio.js · MenuNiveles.js   (se adaptan)
    Habitacion.js          exploración (reemplaza a VentanaDeJuego.js)
    Libreta.js             expediente y deducción
    Pausa.js
  ui/
    Narrador.js            se conserva
    Entradas.js · tiemposDeLectura.js · Registro.js · Boton.js · ControlesTactiles.js (nuevo control táctil)
assets/
  narrativa/               la historia (con los cambios aprobados)
  mapas/ · investigaciones/ · tilesets/ · sprites/ · retratos/inspector/
herramientas/validar_investigaciones.mjs
pruebas/
```

### Qué se conserva y qué se retira

| Se conserva | Para qué |
|---|---|
| La historia, el inspector, los informes y la estructura de seis habitaciones | Es lo que tenía valor |
| `Narrador.js`, `Entradas.js`, `tiemposDeLectura.js` | Mismo ritmo y prioridades de los textos |
| La aparición temporal de las marcas | Lo que revela la linterna |
| La corrección de temporizadores por identidad | Caja de texto |
| `Registro.js` (expediente) y el progreso de niveles | Libreta y desbloqueo |
| Las pruebas con el reloj real de Phaser | Caja de texto y efectos |
| `servidor.py`, `.gitignore`, `.nojekyll`, GitHub Pages | Igual que ahora |

| Se retira | Motivo |
|---|---|
| Todo lo del Sokoban: `src/modelo/`, `VentanaDeJuego.js`, `Distribucion.js` | El juego ya no es Sokoban |
| `assets/niveles/`, `validar_niveles.py`, pruebas del tablero | Ídem |
| Récords de pasos y empujones | Ya no hay pasos |

---

## 12. Plan por fases

Primero se construye **un pasillo pequeño y se comprueba que se siente bien**. La iluminación, las colisiones y la
profundidad definen gran parte de la calidad del juego; si esa base no funciona, no se avanza.

| Fase | Contenido | Resultado visible |
|---|---|---|
| **0. Base** | Rama nueva, retirar el Sokoban, aplicar los textos aprobados, 1280×720, estructura | Título y menú funcionando |
| **1. Prototipo del pasillo** | Un pasillo pequeño con arte provisional (ver la lista de abajo) | **Se camina y se alumbra un pasillo que se siente bien** |
| **2. Investigar el pasillo** | Revelables, interacciones, comentarios, revelaciones, fenómeno de las cortinas, polvo en el haz, ayuda sin texto | El truco del pasillo se descubre en cualquier orden |
| **3. Libreta y deducción** | Expediente, deducción en dos pasos, cierre, informe | **Nivel 1 jugable de principio a fin** |
| **4. Presentación** | Retrato, caja de texto de novela visual, efecto del cierre, relámpagos (sin audio) | El nivel 1 con todo su ambiente |
| **5. Habitaciones 2 a 4** | Mecanismos de la cocina *(5a, hecha: `Habitacion` generalizada, un módulo por habitación en `src/presentacion/habitaciones/`, acciones `rodar`, `tirar` y `oyo-cerca`)*, rastreo y acceso de la puerta, hilos de los juguetes | Cada una con su identidad propia |
| **6. Persecución y final** | Nivel 5 en tiempo real, nivel 6 con la deducción final, puertas entre habitaciones, validador | Juego completo con arte provisional |
| **7. Arte y pulido** | Arte final, control táctil, rendimiento en celular, README | Versión 2.0 publicable |

### Lista de la fase 1 (el prototipo debe pasarla entera)

- [ ] Movimiento en 8 direcciones fluido, con la diagonal a la misma velocidad.
- [ ] Colisiones con paredes y muebles, sin trabarse en las esquinas.
- [ ] Cámara que sigue al inspector sin mareos y respeta los bordes de la habitación.
- [ ] Orden por profundidad correcto al pasar delante y detrás de los muebles.
- [ ] Oscuridad con el cono de la linterna: bordes suaves y luz bloqueada por paredes y muebles.
- [ ] La linterna apunta bien con ratón y solo con teclado.
- [ ] Un objeto revelable que solo aparece con luz.
- [ ] Interacción con un objeto: ícono al acercarse y acción.
- [ ] 60 cuadros por segundo en un equipo normal; medir también en un celular.

---

## 13. Decisiones pendientes

| # | Decisión | Se necesita en | Recomendación |
|---|---|---|---|
| 1 | Aprobar los cambios de líneas (sección 6) | Fase 0 | — |
| 2 | Aprobar el contenido de las deducciones (sección 5) | Fase 3 | **Niveles 1 (fase 3) y 2 (fase 5a) aprobados** (niveles 3 a 6, con su fase) |
| 3 | ¿Está bien que la deducción final nombre a Voss? | Fase 6 | Sí; todas las pistas apuntan a él |
| 4 | ¿Rama nueva para la v2? | Fase 0 | Sí, por ejemplo `v2-investigacion` |
| 5 | Renombrar `empujar`→`comentarios`, `cajas`→`revelaciones`, `retirar`→`error` | Fase 0 | Sí |
| 6 | Perspectiva: cenital 3/4 o lateral | Fase 1 | Cenital 3/4 |
| 7 | ¿Castigo por equivocarse en la deducción? | Fase 3 | **Decidido: no** |
| 8 | Habitaciones conectadas o niveles separados | Fase 6 | Conectadas |
| 9 | ¿Récord de tiempo? | Fase 3 | Opcional |
| 10 | ¿Quién hace el arte final? | Fase 7 | — |
| 12 | Reglas de interfaz (sección 14): maquetación en flujo, revisor F6 y tabla "Maquetación" en cada informe | Arreglo 5a.1 | **Vigente en todas las fases** |

---

## 14. Reglas de interfaz

*(Arreglo 5a.1. Valen para todas las pantallas y todas las fases siguientes.)*

El fallo que originó estas reglas: en la deducción de la cocina, con todo encontrado, hay 8 pruebas; la lista crecía hacia
abajo sin límite y la TAZA DE CAFÉ quedaba debajo de "Presentar pruebas". La causa era que cada pantalla colocaba cada cosa
en una posición fija (`PANEL.y + 184`, `PANEL.y + 392`…). Arreglar un caso suelto no sirve: el nivel 6 usará más de 20 pruebas.

### La regla

1. **Ninguna posición vertical fija para el contenido.** Cada pantalla se arma en flujo: cada bloque se coloca debajo del
   anterior según su **alto real**, medido después de partir el texto en líneas. La cuenta la hace una función pura, sin
   Phaser y con pruebas: `src/motor/Maquetacion.js` (`maquetarPantalla`, `apilar`, `repartirEnFilas`). `src/ui/Pantalla.js`
   la usa para colocar los objetos de Phaser.
2. **Zonas fijas y zona que crece.**
   - Arriba van la cabecera, la pregunta y la conclusión; abajo, los botones y la ayuda de teclas: **siempre visibles**.
   - Lo que puede crecer (listas de pruebas, hallazgos, pistas, opciones, textos largos) va en una **zona con
     desplazamiento** (`src/ui/ZonaDesplazable.js`): máscara, rueda del ratón, flechas (↑ ↓, RePág / AvPág, Inicio / Fin) e
     indicadores ▲ ▼ que solo aparecen si hay más contenido en esa dirección (y que se pueden pulsar).
   - Al mover el foco con el teclado, la lista se desplaza sola para que el elemento enfocado se vea **entero**.
   - Si la cabecera (la pregunta más larga) se comiese el espacio, su bloque pasa a la zona con desplazamiento.
3. **Nada se encima y nada sale de su recuadro.** Los textos tienen márgenes interiores y nunca tocan los bordes. Los
   botones y las filas crecen con su texto; no se corta nada.
4. **Una pantalla nueva = una `Pantalla`.** No se escribe `y = algo + 184`. Se piden bloques (`texto`, `control`, `botones`,
   `objeto`, `propio`) a `enCabecera`, `enCuerpo` y `enPie`, y se llama a `componer()`.

### La comprobación (obligatoria en cada fase)

- **a) Prueba automática** (`pruebas/maquetacion.test.mjs`): con 1, 8 y 25 elementos y con textos muy largos no hay solapes,
  todo queda dentro del recuadro y la zona con desplazamiento aparece solo cuando hace falta.
- **b) Revisor en el juego, tecla F6** (`src/presentacion/Revisor.js`): recorre los objetos de interfaz visibles de la
  pantalla actual con `getBounds()` y marca **en rojo** (y en la consola) cualquier par que se encime o cualquier cosa fuera de
  su recuadro. Sin solapes, no muestra nada. Lo que está debajo de un velo modal no cuenta. Desde la consola:
  `__revisor()`.
- **c) Modo de prueba de carga** (`?carga=extrema` en la dirección, `src/presentacion/CargaExtrema.js`): llena las pantallas
  con contenido extremo — 25 pruebas, 10 pistas con textos largos, y la pregunta, la conclusión y el informe más largos de los
  seis niveles (repetidos para llevarlos al límite) —; en una habitación, F7 lanza tarjetas extremas y F8 un texto importante
  larguísimo. `window.__recorrido()` pasa el revisor por **todas** las pantallas (en modo normal y en modo de carga) y
  devuelve la tabla; `window.__pantalla('nombre')` deja una pantalla preparada. Una pantalla nueva se añade a la lista
  `PANTALLAS` de `src/presentacion/RecorridoDeRevision.js`.
- **d) Todo informe de fase incluye una tabla "Maquetación"**: cada pantalla × (contenido real máximo, carga extrema) →
  solapes encontrados (**tiene que ser 0**), con capturas de la carga extrema.
- Se verifica **siempre con el máximo de contenido**, no con un ejemplo cómodo (la captura que no mostró el fallo se tomó
  con 4 pruebas).

## 15. Niveles 3 a 6 como quedaron en la fase 6 (esta sección manda sobre las tablas de las secciones 4 y 5 para esos niveles)

**Regla de oro (sección 5): una pregunta, una sola respuesta.** Todas las preguntas de los niveles 3, 4 y 6 tienen UNA combinación válida; las tablas con
varias combinaciones de las secciones 4 y 5 quedan reemplazadas por esta.

| Nivel | Mecánica propia (todas, UNA pulsación de E; nada de Sokoban) | Deducción (única respuesta) | Acción final |
|---|---|---|---|
| 3 · La Puerta con Candado | polvo intacto / camino limpio (luz), tablas que crujen, **mirar debajo** de la caja | «¿Por qué hay un candado nuevo…?» → *Alguien entra y sale a diario…* con **Camino sin polvo + Huellas recientes**; la carta es obligatoria | **abrir** la puerta con la llave o las ganzúas → informe |
| 4 · El Cuarto de los Juguetes | juguetes que se mueven solos (`Fenomeno`), **tirar** de un hilo, **cortar** otro, trampilla | → **Oso con hilo cosido + Trampilla del techo** | **cortar** el último hilo (el del oso); silueta en la ventana |
| 5 · La Sombra en la Ventana | **persecución en tiempo real** (`src/motor/Persecucion.js`): cerrar la salida, apagar la chimenea, captura a ≤ 150 px durante 1,5 s, papeles a los 60 s | **sin deducción**: la captura es la prueba | tras la captura, **abrir** la puerta al despacho (con la chimenea apagada) |
| 6 · La Verdad Revelada | **ordenar** los archivos, suelo hueco con onda, cartas de compradores; la libreta es el **expediente** (pistas del Registro por habitación) | ¿Quién? → **Pluma «G. V.» + Recibo de ferretería** · ¿Por qué? → **Carta sin enviar + Planos de la mansión** | al resolver: cierre, compartimento bajo el reloj, informe con «Ver créditos» |

- Acciones nuevas del motor (`Investigacion`): `mirar-debajo`, `cortar`, `ordenar`, `cerrar`, `apagar`, `abrir` (con `alguno`: la llave **o** las ganzúas) y los
  hechos `piso:X`, `vio-cerca:X`, `capturo`; `despuesDelCierre` retiene una línea hasta que termina el texto del cierre.
- El nivel 6 no puede quedar sin salida: al entrar, si falta en el Registro una pista que la deducción final necesita y su habitación está completada, se repone
  (`src/motor/Reposicion.js`). El nivel 5 cuenta como completado al salir por la puerta del despacho.
- Los planos del nivel 5 salen **después** de la revelación 1 y no se pueden perder.
- Verificación: `?papeles=N` cambia los segundos de los papeles (solo para probar); `docs/fase6/herramientas/jugador_de_verificacion.js` camina y deduce con teclas.
- **Arreglo 6.1:** el informe nunca llega encima de algo sin leer: la última tarjeta se escribe, cumple su tiempo de lectura, aparece «E / Espacio / clic para
  continuar» y se espera la pulsación. La ayuda del nivel 5 llega a los 15 s (los demás, 45 s). El resplandor de las ayudas es tenue y respira (ciclo 2,5 s,
  alfa máximo 0,25, 1,2 veces lo que señala): nunca un foco fijo.

