// Las pantallas del cuaderno del inspector, provisionales y dentro de los 1280×720: la libreta con los hallazgos, el
// aviso de que ya se puede resolver el caso, la deducción pregunta por pregunta (1. la conclusión, 2. las pruebas) y el
// menú de pausa, y el historial de la habitación (los textos que ya salieron, para releerlos). Solo dibuja y recoge lo que el jugador elige; las reglas están en src/motor (Libreta y Deduccion) y lo
// que ocurre después (la línea de error, el cierre, pausar el juego) lo decide la escena por los avisos alError /
// alResolver / alCerrar.
//
// Todas las pantallas se arman en flujo (src/ui/Pantalla.js y src/motor/Maquetacion.js): cabecera arriba, botones y ayuda
// de teclas abajo, siempre a la vista, y en medio una zona que se desplaza si el contenido no cabe (rueda del ratón,
// flechas e indicadores ▲ ▼). Ninguna posición vertical es fija.
//
// Ratón: pasar por encima enfoca y un clic elige. Teclado: flechas o WASD mueven el foco (la lista se desplaza sola para
// que lo enfocado se vea entero), E / Enter / Espacio eligen y Esc vuelve (de la deducción a la libreta, y de la libreta
// al juego). En la libreta, si hay más contenido del que cabe, ↑ ↓ lo desplazan y ← → mueven entre los botones.
import Pantalla, { TEXTO, etiquetar } from '../ui/Pantalla.js';
import { nombreEnLista } from '../motor/Libreta.js';
import { TITULOS_DE_NIVELES } from '../motor/niveles.js';

const PANEL = { x: 140, y: 40, ancho: 1000, alto: 640 };
const CAJA_DE_PAUSA = { x: 340, y: 170, ancho: 600, alto: 380 };
const MAXIMO_POR_DEFECTO = 2;

// Teclas (keyCode del navegador) que entiende el cuaderno
const TECLAS = {
    arriba: [38, 87], abajo: [40, 83], izquierda: [37, 65], derecha: [39, 68],
    elegir: [69, 13, 32], volver: [27], libreta: [9, 73], historial: [72], paginaArriba: [33], paginaAbajo: [34], inicio: [36], fin: [35]
};
const es = (grupo, codigo) => TECLAS[grupo].includes(codigo);

export default class Cuaderno {
    // libreta y deduccion: los del motor · narrativa: assets/narrativa/nivelN.json (preguntas y opciones)
    // alCerrar(): cerró la libreta o eligió seguir investigando · alError(resultado): una respuesta equivocada
    // alResolver(): las dos preguntas están resueltas
    // alAcertar(idDePregunta): se acertó una y quedan más; si devuelve true (hay una línea que mostrar) la libreta se cierra
    // alContinuar(): se eligió seguir desde el menú de pausa · alSalir(): se confirmó salir de la habitación
    // historial(): las entradas del historial de la habitación ({ etiqueta, texto, clase }, src/motor/Historial.js)
    constructor(escena, { profundidad, libreta, deduccion, narrativa, alCerrar, alError, alResolver, alAcertar, alContinuar, alSalir, historial = () => [] }) {
        this.escena = escena;
        this.profundidad = profundidad;
        this.libreta = libreta;
        this.deduccion = deduccion;
        this.narrativa = narrativa;
        this.alCerrar = alCerrar;
        this.alError = alError;
        this.alResolver = alResolver;
        this.alAcertar = alAcertar;
        this.alContinuar = alContinuar;
        this.alSalir = alSalir;
        this.historial = historial;
        this.pantalla = null;
        this.modo = null;                   // 'libreta' | 'aviso' | 'conclusion' | 'pruebas' | 'pausa' | 'salir' | 'historial'
        this.seleccion = { conclusion: null, pruebas: [] };
    }

    get abierta() { return this.modo !== null; }
    get items() { return this.pantalla?.items ?? []; }
    get foco() { return this.pantalla?.foco ?? 0; }

    // Para comprobar en el navegador
    get estado() {
        const z = this.pantalla?.zona;
        return {
            modo: this.modo, foco: this.foco, seleccion: { conclusion: this.seleccion.conclusion, pruebas: [...this.seleccion.pruebas] },
            items: this.items.map(i => ({ texto: i.nombre, habilitado: i.habilitado, marcado: i.marcado })),
            pregunta: this.preguntaId ?? null, opciones: this.opcionesVistas ?? null,
            zona: z ? { desplazable: z.desplazable, desplazamiento: Math.round(z.desplazamiento), maximo: Math.round(z.maximo), alto: Math.round(z.rect.alto), contenido: Math.round(z.contenido) } : null
        };
    }

    // ── Entrada ──────────────────────────────────────────────────────────────

    // keyCode de una tecla pulsada (repetida: sigue apretada). Devuelve true si el cuaderno la usó.
    // Cada pulsación vale una sola vez al elegir o cambiar de pantalla: la auto-repetición del teclado se ignora (elegir dos
    // veces con un toque largo sería peor que tener que pulsar de nuevo). Desplazar una lista sí admite mantener la tecla.
    tecla(codigo, repetida = false) {
        if (!this.abierta) return false;
        const p = this.pantalla;
        // En la libreta (sin lista de elementos enfocables), ↑ ↓ desplazan el contenido si no cabe
        const desplazaLaLibreta = (this.modo === 'libreta' || this.modo === 'aviso' || this.modo === 'historial') && p.desplazable;
        if (es('paginaArriba', codigo)) p.desplazar(-2);
        else if (es('paginaAbajo', codigo)) p.desplazar(2);
        else if (es('inicio', codigo)) p.desplazar('inicio');
        else if (es('fin', codigo)) p.desplazar('fin');
        else if (desplazaLaLibreta && (es('arriba', codigo) || es('abajo', codigo))) p.desplazar(es('arriba', codigo) ? -1 : 1);
        else if (repetida) return true;
        else if (es('arriba', codigo) || es('izquierda', codigo)) this.moverFoco(-1);
        else if (es('abajo', codigo) || es('derecha', codigo)) this.moverFoco(1);
        else if (es('historial', codigo)) this.alternarHistorial();
        else if (es('libreta', codigo)) this.volverAtras(true);
        else if (es('volver', codigo)) this.volverAtras(false);
        else if (es('elegir', codigo)) this.items[this.foco]?.activar();
        return true;                         // con el cuaderno abierto ninguna otra tecla llega al juego
    }

    moverFoco(paso) { this.pantalla?.moverFoco(paso); }
    enfocar(i) { this.pantalla?.enfocar(i); }

    // Esc vuelve un paso; Tab / I (cerrarDelTodo) cierran la libreta desde cualquier punto
    volverAtras(cerrarDelTodo) {
        // El menú de pausa: Esc equivale a "Continuar" (y a "Cancelar" en la confirmación); Tab o I no hacen nada
        if (this.modo === 'pausa' || this.modo === 'salir') {
            if (cerrarDelTodo) return undefined;
            if (this.modo === 'salir') return this.abrirPausa();
            this.cerrar();
            this.alContinuar?.();
            return undefined;
        }
        if (this.modo === 'pruebas' && !cerrarDelTodo) return this.mostrarConclusion();
        if (this.modo === 'conclusion' && !cerrarDelTodo) return this.abrirLibreta({ aviso: false });
        this.cerrar();
        this.alCerrar?.();
        return undefined;
    }

    // ── Pantallas ────────────────────────────────────────────────────────────

    nueva(modo, caja = PANEL, opciones = {}) {
        this.limpiar();
        this.modo = modo;
        this.pantalla = new Pantalla(this.escena, { caja, profundidad: this.profundidad, velo: true, prefijo: modo, ...opciones });
        return this.pantalla;
    }

    // La libreta con los hallazgos. aviso: se abrió sola porque ya se puede resolver (botones "Resolver el caso" y "Seguir investigando")
    abrirLibreta({ aviso = false } = {}) {
        const p = this.nueva(aviso ? 'aviso' : 'libreta');
        const expediente = !!this.libreta.definicion.expediente;      // nivel 6: todo lo encontrado en la mansión, agrupado por habitación
        p.enCabecera(p.texto('titulo', expediente ? 'EXPEDIENTE DE LA MANSIÓN' : 'LIBRETA DEL INSPECTOR', { size: 26, color: TEXTO.ambar }), p.linea());
        const hallazgos = this.libreta.hallazgos();
        const pruebas = hallazgos.filter(h => h.tipo === 'prueba'), pistas = hallazgos.filter(h => h.tipo === 'pista');
        if (!hallazgos.length) {
            p.enCuerpo(p.texto('vacio', 'Todavía no hay nada anotado.', { size: 20, color: TEXTO.tenue, centrado: true, ancho: p.anchoCuerpo, antes: 60 }));
        } else {
            p.enCuerpo(expediente ? this.grupos(p, hallazgos) : this.columnas(p, pruebas, pistas));
        }
        // Lo ya resuelto: cada pregunta con su conclusión y una marca ✔. Lo pendiente no se muestra.
        const logradas = this.deduccion.logradas();
        if (logradas.length) {
            p.enCuerpo({ ...p.linea(), antes: 12 }, p.texto('deduccion', 'DEDUCCIÓN', { size: 14, color: TEXTO.tenue, ancho: p.anchoCuerpo }));
            logradas.forEach(({ pregunta, conclusion }, i) => {
                const textos = this.textosDe(pregunta);
                const opcion = textos.opciones.find(o => o.id === conclusion);
                p.enCuerpo(this.logro(p, `logro${i}`, textos.texto, opcion?.texto ?? ''));
            });
        }
        // Botones y ayuda de teclas: abajo, siempre a la vista
        const botones = [];
        if (this.deduccion.disponible()) botones.push({ texto: 'Resolver el caso', primario: true, alActivar: () => this.abrirPregunta() });
        botones.push({ texto: aviso ? 'Seguir investigando' : 'Cerrar', alActivar: () => { this.cerrar(); this.alCerrar?.(); } });
        // La ayuda de teclas se mide con la versión más larga (con "desplazar"): si no hay nada que desplazar, la corta
        // ocupa el mismo alto reservado y nada se mueve
        const base = '←  →  /  A  D: mover     ·     E / Enter / clic: elegir' + (aviso ? '' : '     ·     Esc / Tab: cerrar');
        const ayuda = p.texto('ayuda', '↑ ↓: desplazar     ·     ' + base, { size: 12, color: TEXTO.tenue, centrado: true });
        p.enPie(p.botones('botones', botones, { ancho: 320, alto: 52 }), ayuda);
        p.componer();
        if (!p.desplazable) ayuda.texto.setText(base);
        p.enfocar(0);
        return p;
    }

    // Las dos columnas de la libreta (pruebas a la izquierda, pistas con su texto a la derecha), como UN bloque del cuerpo:
    // su alto es el de la columna más alta
    columnas(p, pruebas, pistas) {
        const izq = 400, hueco = 30, der = p.anchoCuerpo - izq - hueco;
        const crear = (contenido, opciones) => etiquetar(p.crearTexto(contenido, opciones), { tipo: 'contenido', dentroDe: p.caja });
        const colocadosI = [], colocadosD = [];
        let yi = 0, yd = 0;
        if (pruebas.length) {
            colocadosI.push({ obj: crear('PRUEBAS', { size: 14, color: TEXTO.tenue, ancho: izq }), x: 0, y: yi });
            yi += colocadosI[0].obj.height + 14;
            pruebas.forEach((h, i) => {
                const t = crear(`▪  ${h.nombre}`, { size: 22, ancho: izq });
                colocadosI.push({ obj: t, x: 0, y: yi });
                yi += t.height + (i < pruebas.length - 1 ? 10 : 0);
            });
        }
        if (pistas.length) {
            colocadosD.push({ obj: crear('PISTAS', { size: 14, color: TEXTO.tenue, ancho: der }), x: izq + hueco, y: yd });
            yd += colocadosD[0].obj.height + 14;
            pistas.forEach((h, i) => {
                const titulo = crear(h.nombre, { size: 19, color: TEXTO.ambar, ancho: der });
                const cuerpo = crear(h.texto, { size: 15, espacio: 4, ancho: der });
                colocadosD.push({ obj: titulo, x: izq + hueco, y: yd }, { obj: cuerpo, x: izq + hueco, y: yd + titulo.height + 4 });
                yd += titulo.height + 4 + cuerpo.height + (i < pistas.length - 1 ? 22 : 0);
            });
        }
        const todos = [...colocadosI, ...colocadosD];
        return p.propio('columnas', Math.max(yi, yd), todos.map(c => c.obj), (x, y) => { for (const c of todos) c.obj.setPosition(x + c.x, y + c.y); });
    }

    // El expediente de la mansión: lo encontrado agrupado por habitación (un encabezado por habitación; debajo, sus pruebas y sus pistas con
    // su texto), como UN bloque del cuerpo. La zona se desplaza si no cabe.
    grupos(p, hallazgos) {
        const ancho = p.anchoCuerpo;
        const crear = (contenido, opciones) => etiquetar(p.crearTexto(contenido, opciones), { tipo: 'contenido', dentroDe: p.caja });
        const colocados = [];
        let y = 0;
        const niveles = [...new Set(hallazgos.map(h => h.nivel))].sort((a, b) => a - b);
        niveles.forEach((nivel, k) => {
            if (k) y += 18;
            const cab = crear(`HABITACIÓN ${nivel}  ·  ${(TITULOS_DE_NIVELES[nivel - 1] ?? '').toLocaleUpperCase('es')}`, { size: 14, color: TEXTO.tenue, ancho });
            colocados.push({ obj: cab, x: 0, y });
            y += cab.height + 10;
            for (const h of hallazgos.filter(x => x.nivel === nivel)) {
                if (h.tipo === 'pista') {
                    const titulo = crear(h.nombre, { size: 19, color: TEXTO.ambar, ancho });
                    const cuerpo = crear(h.texto, { size: 15, espacio: 4, ancho: ancho - 26 });      // va sangrado 26 px: el ancho se lo descuenta
                    colocados.push({ obj: titulo, x: 0, y }, { obj: cuerpo, x: 26, y: y + titulo.height + 2 });
                    y += titulo.height + 2 + cuerpo.height + 12;
                } else {
                    const t = crear(`▪  ${h.nombre}`, { size: 22, ancho });
                    colocados.push({ obj: t, x: 0, y });
                    y += t.height + 10;
                }
            }
        });
        return p.propio('grupos', y, colocados.map(c => c.obj), (x, yy) => { for (const c of colocados) c.obj.setPosition(x + c.x, yy + c.y); });
    }

    // H con el historial abierto lo cierra (con otra pantalla abierta no hace nada: el historial va aparte de la libreta)
    alternarHistorial() {
        if (this.modo === 'historial') return this.volverAtras(false);
        return undefined;
    }

    // El historial de la habitación, como en una novela visual: todo lo que salió, en orden y lo último abajo (se abre ahí).
    // Va aparte de la libreta: se abre desde el juego (tecla H o su botón en pantalla) y al cerrarlo se vuelve al juego.
    abrirHistorial() {
        const p = this.nueva('historial');
        p.enCabecera(p.texto('titulo', 'HISTORIAL', { size: 26, color: TEXTO.ambar }), p.linea());
        const entradas = this.historial();
        if (!entradas.length) {
            p.enCuerpo(p.texto('vacio', 'Todavía no ha salido ningún texto en esta habitación.', { size: 20, color: TEXTO.tenue, centrado: true, ancho: p.anchoCuerpo, antes: 60 }));
        } else {
            p.enCuerpo(this.entradasDelHistorial(p, entradas));
        }
        p.enPie(
            p.botones('botones', [{ texto: 'Volver al juego', primario: true, alActivar: () => this.volverAtras(false), ancho: 320 }], { alto: 52 }),
            p.texto('ayuda', '↑ ↓  /  rueda: desplazar     ·     E / Enter / clic: volver     ·     Esc / H: volver al juego', { size: 12, color: TEXTO.tenue, centrado: true })
        );
        p.componer();
        p.desplazar('fin');
        p.enfocar(0);
        return p;
    }

    // Las entradas del historial como UN bloque del cuerpo: el nombre (quién habla o qué tarjeta era) y debajo el texto
    entradasDelHistorial(p, entradas) {
        const ancho = p.anchoCuerpo;
        const crear = (contenido, opciones) => etiquetar(p.crearTexto(contenido, opciones), { tipo: 'contenido', dentroDe: p.caja });
        const colocados = [];
        let y = 0;
        entradas.forEach((e, i) => {
            if (i) y += 16;
            const nombre = crear(e.etiqueta, { size: 14, color: e.clase === 'importante' ? TEXTO.ambar : TEXTO.tenue, ancho });
            const cuerpo = crear(e.texto, { size: 18, espacio: 4, ancho: ancho - 20 });
            colocados.push({ obj: nombre, x: 0, y }, { obj: cuerpo, x: 20, y: y + nombre.height + 3 });
            y += nombre.height + 3 + cuerpo.height;
        });
        return p.propio('historial', y, colocados.map(c => c.obj), (x, yy) => { for (const c of colocados) c.obj.setPosition(x + c.x, yy + c.y); });
    }

    // Una pregunta ya resuelta: ✔, la pregunta y la conclusión elegida
    logro(p, id, pregunta, conclusion) {
        const marca = etiquetar(p.crearTexto('✔', { size: 22, color: TEXTO.acierto }), { tipo: 'contenido', dentroDe: p.caja });
        const ancho = p.anchoCuerpo - 38;
        const q = etiquetar(p.crearTexto(pregunta, { size: 18, ancho }), { tipo: 'contenido', dentroDe: p.caja });
        const c = etiquetar(p.crearTexto(conclusion, { size: 15, color: TEXTO.ambar, ancho }), { tipo: 'contenido', dentroDe: p.caja });
        const alto = Math.max(marca.height, q.height + 4 + c.height);
        return p.propio(id, alto, [marca, q, c], (x, y) => {
            marca.setPosition(x, y);
            q.setPosition(x + 38, y);
            c.setPosition(x + 38, y + q.height + 4);
        });
    }

    // El menú de pausa (Esc en el juego): el juego se detiene. "Salir al menú" pide confirmación antes.
    abrirPausa() {
        const p = this.nueva('pausa', CAJA_DE_PAUSA, { centrarCuerpo: true });
        p.enCabecera(p.texto('titulo', 'PAUSA', { size: 32, color: TEXTO.ambar, centrado: true }));
        p.enCuerpo(
            p.control('continuar', 'Continuar', { ancho: 380, alto: 60, primario: true, alActivar: () => { this.cerrar(); this.alContinuar?.(); } }),
            p.control('salir', 'Salir al menú', { ancho: 380, alto: 60, alActivar: () => this.confirmarSalida() })
        );
        p.enPie(p.texto('ayuda', '↑ ↓  /  W S: mover     ·     E / Enter / clic: elegir     ·     Esc: continuar', { size: 12, color: TEXTO.tenue, centrado: true }));
        p.componer();
        p.enfocar(0);
    }

    // La confirmación de salida: lo investigado en la habitación se pierde. Foco en "Cancelar" para no salir sin querer.
    confirmarSalida() {
        const p = this.nueva('salir', CAJA_DE_PAUSA, { centrarCuerpo: true });
        p.enCuerpo(p.texto('mensaje', 'Se perderá lo investigado en esta habitación.\n¿Salir?', { size: 21, espacio: 10, centrado: true }));
        p.enPie(
            p.botones('botones', [
                { texto: 'Salir', alActivar: () => { this.cerrar(); this.alSalir?.(); } },
                { texto: 'Cancelar', primario: true, alActivar: () => this.abrirPausa() }
            ], { ancho: 230, alto: 60 }),
            p.texto('ayuda', '←  →  /  A  D: mover     ·     E / Enter / clic: elegir     ·     Esc: cancelar', { size: 12, color: TEXTO.tenue, centrado: true })
        );
        p.componer();
        p.enfocar(1);
    }

    // Paso 1 de la pregunta que toca (la primera sin resolver): elegir la conclusión
    abrirPregunta() {
        this.seleccion = { conclusion: null, pruebas: [] };
        this.mostrarConclusion();
    }

    textosDe(q) { return this.narrativa.deduccion.preguntas.find(t => t.id === q.id); }

    cabeceraDeDeduccion(p, q) {
        const n = this.deduccion.preguntas.length, i = this.deduccion.preguntas.findIndex(x => x.id === q.id) + 1;
        return p.texto('cabecera', `DEDUCCIÓN  ·  Pregunta ${i} de ${n}`, { size: 14, color: TEXTO.ambar });
    }

    mostrarConclusion() {
        const q = this.deduccion.preguntaActual();
        if (!q) return;
        const textos = this.textosDe(q);
        const p = this.nueva('conclusion');
        this.preguntaId = q.id;
        // La pregunta (la más larga de los seis niveles cabe) va arriba; si ni así cabe, pasa a la zona con desplazamiento
        p.enCabecera(
            this.cabeceraDeDeduccion(p, q),
            p.textoAjustado('pregunta', textos.texto, { size: 34, minimo: 22, altoMaximo: 150, cede: true }),
            p.texto('elige', 'Elige tu conclusión', { size: 16, color: TEXTO.tenue })
        );
        // El orden de las opciones está mezclado (y se mantiene mientras dura la partida)
        const orden = this.deduccion.opciones(q.id, textos.opciones.map(o => o.id));
        this.opcionesVistas = orden;
        for (const id of orden) {
            const opcion = textos.opciones.find(o => o.id === id);
            p.enCuerpo(p.control(id, opcion.texto, { estilo: 'opcion', alto: 78, alActivar: () => { this.seleccion.conclusion = id; this.mostrarPruebas(); } }));
        }
        p.enPie(p.texto('ayuda', '↑ ↓  /  W S: mover     ·     E / Enter / clic: elegir     ·     Esc: volver a la libreta', { size: 12, color: TEXTO.tenue, centrado: true }));
        p.componer();
        // Si se vuelve de las pruebas, el foco queda en la conclusión que se había elegido
        p.enfocar(Math.max(0, orden.indexOf(this.seleccion.conclusion)));
    }

    // Paso 2: respaldar la conclusión con 1 o 2 pruebas de la libreta
    mostrarPruebas() {
        const q = this.deduccion.preguntaActual();
        const textos = this.textosDe(q);
        const conclusion = textos.opciones.find(o => o.id === this.seleccion.conclusion);
        const p = this.nueva('pruebas');
        const max = this.deduccion.maximo ?? MAXIMO_POR_DEFECTO;
        const normal = `Elige las pruebas que la respalden (máximo ${max})`;
        this.instruccion = p.texto('instruccion', normal, { size: 16, color: TEXTO.tenue });
        // Al llegar al máximo el texto cambia: se reserva el alto de la versión más larga para que nada se mueva
        const lleno = this.textoDeMaximo(max);
        this.instruccion.texto.setText(lleno);
        this.instruccion.alto = Math.max(this.instruccion.alto, this.instruccion.texto.height);
        this.instruccion.texto.setText(normal);
        p.enCabecera(
            this.cabeceraDeDeduccion(p, q),
            p.textoAjustado('pregunta', textos.texto, { size: 26, minimo: 18, altoMaximo: 100, cede: true }),
            p.texto('conclusion', `Tu conclusión: ${conclusion.texto}`, { size: 20, color: TEXTO.ambar }),
            this.instruccion
        );
        // Todo lo encontrado: si no cabe, la lista se desplaza y "Presentar pruebas" sigue a la vista
        const hallazgos = this.libreta.hallazgos();
        this.idsDePruebas = new Set(hallazgos.map(h => h.id));
        for (const h of hallazgos) {
            // Todas las filas iguales (pruebas y pistas): que una se vea distinta delataría para qué pregunta sirve. El texto de las pistas se lee en la libreta.
            const fila = p.control(h.id, nombreEnLista(h.nombre), { estilo: 'prueba', alto: 42, alActivar: () => this.alternarPrueba(h.id) });
            fila.item.marcarCon(this.seleccion.pruebas.includes(h.id));
            p.enCuerpo(fila);
        }
        p.enPie(
            p.botones('botones', [
                { texto: 'Presentar pruebas', primario: true, alActivar: () => this.presentar(), ancho: 320 },
                { texto: 'Volver', alActivar: () => this.mostrarConclusion(), ancho: 200 }
            ], { alto: 52 }),
            p.texto('ayuda', '↑ ↓  /  W S: mover     ·     E / Enter / clic: marcar     ·     Esc: volver a la conclusión', { size: 12, color: TEXTO.tenue, centrado: true })
        );
        p.componer();
        this.botonPresentar = p.items.find(i => i.nombre === 'Presentar pruebas');
        this.actualizarPresentar();
        p.enfocar(0);
    }

    textoDeMaximo(max) { return `Como máximo ${max} pruebas: quita una para elegir otra`; }

    alternarPrueba(id) {
        const marcadas = this.seleccion.pruebas;
        const max = this.deduccion.maximo ?? MAXIMO_POR_DEFECTO;
        const i = marcadas.indexOf(id);
        if (i >= 0) marcadas.splice(i, 1);
        else if (marcadas.length >= max) { this.avisarMaximo(max); return; }
        else marcadas.push(id);
        for (const item of this.items) if (this.idsDePruebas.has(item.id)) item.marcarCon(marcadas.includes(item.id));
        this.actualizarPresentar();
    }

    avisarMaximo(max) {
        const t = this.instruccion?.texto;
        if (!t?.scene) return;
        t.setText(this.textoDeMaximo(max)).setColor(TEXTO.error);
        this.escena.time.delayedCall(1800, () => {
            if (t.scene && this.modo === 'pruebas' && this.instruccion?.texto === t) t.setText(`Elige las pruebas que la respalden (máximo ${max})`).setColor(TEXTO.tenue);
        });
    }

    actualizarPresentar() {
        this.botonPresentar?.habilitar(this.seleccion.pruebas.length >= 1);
    }

    presentar() {
        const q = this.deduccion.preguntaActual();
        if (!q || !this.seleccion.pruebas.length) return;
        const r = this.deduccion.responder(q.id, this.seleccion.conclusion, this.seleccion.pruebas);
        if (r.estado === 'error') {
            this.cerrar();
            this.alError?.(r);
        } else if (r.estado === 'correcta') {
            // Si el acierto cuenta una línea, la libreta se cierra para mostrarla (la escena la reabre después); si no, sigue la
            // siguiente. La ya resuelta no vuelve a preguntarse.
            if (this.alAcertar?.(q.id)) this.cerrar();
            else this.abrirPregunta();
        } else if (r.estado === 'resuelto') {
            this.cerrar();
            this.alResolver?.();
        }
    }

    cerrar() {
        this.limpiar();
        this.modo = null;
    }

    limpiar() {
        this.pantalla?.destruir();
        this.pantalla = null;
        this.botonPresentar = null;
        this.instruccion = null;
    }
}

