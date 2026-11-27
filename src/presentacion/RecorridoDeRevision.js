// El recorrido de revisión: pone cada pantalla de la interfaz en su estado de contenido máximo y le pasa el revisor (F6).
// Es la tabla "Maquetación" de cada informe de fase: pantalla × (contenido real máximo, carga extrema) → solapes.
//   window.__recorrido()            recorre TODAS las pantallas y devuelve las filas (con ?carga=extrema, en carga extrema)
//   window.__pantalla('nombre')     deja una pantalla preparada (para mirarla o hacerle una captura) y no la revisa
//   window.__pantallas              los nombres
// Para añadir una pantalla nueva en una fase siguiente: una entrada más en PANTALLAS.
// El contenido "real máximo" sale de las habitaciones jugables con todo encontrado; en carga extrema (src/presentacion/
// CargaExtrema.js) la libreta, la deducción y el informe llevan el contenido más grande que puede tener el juego. Para
// dejar lo encontrado se usa el motor de investigación (no se camina): lo que se comprueba aquí es la maquetación.
import { cargaExtrema, lanzarTarjetas, lanzarCaja } from './CargaExtrema.js';
import { CORTE } from '../ui/DialogoPrincipal.js';

const esperar = ms => new Promise(r => setTimeout(r, ms));

// Todo lo que se puede encontrar en cada habitación jugable (sucesos del motor, sin texto)
const TODO_ENCONTRADO = {
    1: inv => {
        inv.ilumino('n1-marca-polvo'); inv.ilumino('n1-marca-arrastre'); inv.examino('n1-marca-arrastre'); inv.examino('pila-de-cajas');
        inv.miroDetras('pila-de-cajas', 'ventana'); inv.examino('cortinas');
        inv.recogio('n1-pista-huella'); inv.recogio('n1-pista-periodico'); inv.recogio('bateria');
    },
    2: inv => {
        inv.examino('alacena'); inv.rodo('alacena'); inv.examino('fuelle'); inv.examino('n2-mueble-platos'); inv.examino('n2-mueble-copas');
        inv.examino('n2-mueble-sarten'); inv.recogio('n2-pista-recibo'); inv.recogio('n2-pista-taza'); inv.recogio('bateria');
    }
};

const METODO = { examinar: 'examino', 'mirar-detras': 'miroDetras', recoger: 'recogio', rodar: 'rodo', tirar: 'tiro', 'mirar-debajo': 'miroDebajo', cortar: 'corto', ordenar: 'ordeno', cerrar: 'cerro', apagar: 'apago', abrir: 'abrio' };

// Los niveles 3 a 6: todo lo que el mapa permite hacer, con los mismos sucesos que las pruebas automáticas (no se camina: aquí se revisa la maquetación)
function todoElMapa(e) {
    const inv = e.investigacion, reglas = e.reglas;
    for (let vuelta = 0; vuelta < 12; vuelta++) {
        inv.entro();
        if (JSON.stringify(reglas.objetos).includes('"capturo"')) inv.capturo();
        for (const r of reglas.reglas) for (const f of r.cuando) { const [tipo, objeto] = f.split(':'); if (['piso', 'vio-cerca', 'oyo-cerca'].includes(tipo)) inv.recibir({ tipo, objeto }); }
        for (const o of [...e.mapa.revelables, ...e.mapa.interactuables]) {
            const { ref, accion, lado } = o.props;
            if (inv.objetos[ref]?.descubre === 'luz') inv.ilumino(ref);
            if (accion && METODO[accion]) inv[METODO[accion]](ref, lado);
        }
    }
}

// Lo que el Registro guarda de los niveles anteriores, completo (solo para esta pantalla: no se escribe nada en lo guardado)
function registroCompleto(juego) {
    const todo = {};
    for (let n = 1; n <= 6; n++) for (const p of juego.cache.json.get('narrativa' + n)?.pistas || []) todo[p.id] = { nivel: n };
    return todo;
}

export default class RecorridoDeRevision {
    constructor(juego, revisor) {
        this.juego = juego;
        this.revisor = revisor;
    }

    instalar() {
        window.__pantallas = Object.keys(this.pantallas());
        window.__pantalla = nombre => this.preparar(nombre);
        window.__recorrido = opciones => this.recorrer(opciones);
    }

    escenaActual() { return this.juego.scene.getScenes(true)[0]; }

    async ir(clave, datos) {
        this.escenaActual().scene.start(clave, datos);
        await esperar(700);
    }

    // Entra a una habitación, cierra la intro y deja todo encontrado
    async habitacion(numero, { todo = true } = {}) {
        await this.ir('Habitacion', { numeroDeNivel: numero });
        const e = this.juego.scene.getScene('Habitacion');
        for (let i = 0; i < 6 && e.narracion.bloqueando; i++) { e.narracion.avanzar(); await esperar(250); }
        e.aviso.alAbrirLaLibreta(true);                  // que el aviso no abra solo la libreta encima de la pantalla que se revisa
        if (todo) {
            if (TODO_ENCONTRADO[numero]) TODO_ENCONTRADO[numero](e.investigacion); else todoElMapa(e);
            if (e.libreta.definicion.expediente) e.libreta.registro = () => registroCompleto(this.juego);      // el expediente con todas las pistas de los niveles 1 a 5
        }
        await esperar(200);
        return e;
    }

    // Las pantallas: nombre → preparar(). Devuelve { alRevisar? } si hay que revisar varias páginas (la caja de importantes).
    pantallas() {
        return {
            'menu-principal': () => this.ir('MenuPrincipal'),
            'creditos': async () => { await this.ir('MenuPrincipal'); this.juego.scene.getScene('MenuPrincipal').mostrarCreditos(); await esperar(300); },
            'interludio': () => this.ir('Interludio', { texto: this.juego.cache.json.get('narrativa1').intro, siguiente: 'MenuNiveles' }),
            'menu-de-niveles': () => this.ir('MenuNiveles'),
            'en-construccion': () => this.ir('EnConstruccion', { numeroDeNivel: 3 }),
            'libreta-pasillo': async () => (await this.habitacion(1)).abrirLibreta(false),
            'libreta-cocina': async () => (await this.habitacion(2)).abrirLibreta(false),
            'aviso-cocina': async () => (await this.habitacion(2)).abrirLibreta(true),
            // la libreta con la sección DEDUCCIÓN: la pregunta 1 ya resuelta
            'libreta-con-deduccion-cocina': async () => {
                const e = await this.habitacion(2);
                e.deduccion.responder('mecanismo', 'poleas-cuerda-fuelle', ['cuerda-al-techo', 'fuelle-escondido']);
                e.abrirLibreta(false);
            },
            'conclusion-cocina': async () => { const e = await this.habitacion(2); e.abrirLibreta(false); e.cuaderno.abrirPregunta(); },
            'pruebas-cocina': async () => {
                const e = await this.habitacion(2);
                e.abrirLibreta(false);
                e.cuaderno.abrirPregunta();
                e.cuaderno.seleccion.conclusion = e.cuaderno.opcionesVistas[0];
                e.cuaderno.mostrarPruebas();
            },
            'conclusion-pasillo': async () => { const e = await this.habitacion(1); e.abrirLibreta(false); e.cuaderno.abrirPregunta(); },
            'pruebas-pasillo': async () => {
                const e = await this.habitacion(1);
                e.abrirLibreta(false);
                e.cuaderno.abrirPregunta();
                e.cuaderno.seleccion.conclusion = e.cuaderno.opcionesVistas[0];
                e.cuaderno.mostrarPruebas();
            },
            // Los niveles 3 a 6: la libreta con todo encontrado, y en los que tienen deducción (3, 4 y 6) la conclusión y las pruebas
            ...Object.fromEntries([3, 4, 5, 6].map(n => [`libreta-nivel${n}`, async () => (await this.habitacion(n)).abrirLibreta(false)])),
            ...Object.fromEntries([3, 4, 6].map(n => [`conclusion-nivel${n}`, async () => { const e = await this.habitacion(n); e.abrirLibreta(false); e.cuaderno.abrirPregunta(); }])),
            ...Object.fromEntries([3, 4, 6].map(n => [`pruebas-nivel${n}`, async () => {
                const e = await this.habitacion(n);
                e.abrirLibreta(false);
                e.cuaderno.abrirPregunta();
                e.cuaderno.seleccion.conclusion = e.cuaderno.opcionesVistas[0];
                e.cuaderno.mostrarPruebas();
            }])),
            'pausa': async () => (await this.habitacion(2, { todo: false })).cuaderno.abrirPausa(),
            'confirmar-salida': async () => (await this.habitacion(2, { todo: false })).cuaderno.confirmarSalida(),
            'informe-pasillo': () => this.ir('Informe', { numeroDeNivel: 1, resumen: { pistas: 2, totalDePistas: 2, pilas: true } }),
            'informe-cocina': () => this.ir('Informe', { numeroDeNivel: 2, resumen: { pistas: 2, totalDePistas: 2, pilas: true } }),
            ...Object.fromEntries([3, 4, 5, 6].map(n => [`informe-nivel${n}`, async () => {
                const e = await this.habitacion(n);
                const resumen = e.libreta.resumen();
                await this.ir('Informe', { numeroDeNivel: n, resumen });
            }])),
            // La espera antes del informe: la pista del compartimento leída entera y el aviso de continuar
            'espera-antes-del-informe': async () => {
                const e = await this.habitacion(6);
                e.contar(e.investigacion.resolvio());
                e.irAlInforme();
                for (let i = 0; i < 60 && !e.avisoDeContinuar.visible; i++) await esperar(250);
                await esperar(400);
            },
            'tarjetas': async () => { await this.tarjetas(); },
            'caja-de-importantes': async () => { await this.caja(); },
            // las dos a la vez: la caja de importantes con el panel de tarjetas a la vista (la caja se aparta de las tarjetas)
            'tarjetas-con-caja': async () => { await this.tarjetas(); await this.caja({ mismaHabitacion: true }); }
        };
    }

    // El panel de tarjetas con el máximo: la nota de la libreta y tres rastros. En carga extrema, F7; si no, los textos
    // reales más largos del nivel 1 (marcas y comentarios).
    async tarjetas() {
        const e = await this.habitacion(1, { todo: false });
        const narrador = e.narracion.narrador;
        if (cargaExtrema()) lanzarTarjetas(e);
        else {
            const n = e.narrativa;
            const largos = [...(n.marcas || []).map(m => m.texto), ...(n.comentarios || [])].sort((a, b) => b.length - a.length);
            narrador.contar({ acontecimiento: 'rev:nota', ref: 'rev-nota', clase: 'secundaria', texto: largos[0], alCompletar: 'descartar' });
            (n.marcas || []).slice(0, 3).forEach((m, i) => narrador.contar({ acontecimiento: `rev:rastro${i}`, ref: m.id, clase: 'ambiental', texto: m.texto, titulo: m.titulo ?? 'RASTRO', etiqueta: m.icono ?? '✦' }));
        }
        await esperar(700);
        // Que el texto de cada tarjeta ya esté escrito entero
        for (const t of e.narracion.panel.tarjetas) { t.cuerpo.setText(t.envuelto); t.escritas = t.envuelto.length; }
        await esperar(500);
    }

    // La caja de importantes con el texto más largo: en carga extrema, F8 (texto enorme en muchas páginas); si no, el
    // texto importante real más largo de las habitaciones jugables (revelaciones, cierre).
    async caja({ mismaHabitacion = false } = {}) {
        const e = mismaHabitacion ? this.juego.scene.getScene('Habitacion') : await this.habitacion(2, { todo: false });
        const reales = [1, 2, 3, 4, 5, 6].flatMap(n => { const x = this.juego.cache.json.get('narrativa' + n); return [x.cierre.replaceAll(CORTE, ' '), x.intro, ...(x.revelaciones || [])]; }).sort((a, b) => b.length - a.length);
        if (cargaExtrema()) lanzarCaja(e);
        else e.narracion.narrador.contar({ acontecimiento: 'rev:importante', ref: 'rev-importante', clase: 'importante', texto: reales[0], alCompletar: 'descartar' });
        await esperar(500);
        e.narracion.dialogo.mostrarPista();                 // la página completa, sin esperar a que se escriba
        await esperar(300);
    }

    async preparar(nombre) {
        const preparar = this.pantallas()[nombre];
        if (!preparar) throw new Error(`Pantalla desconocida: ${nombre}. Las que hay: ${Object.keys(this.pantallas()).join(', ')}`);
        await preparar();
        await esperar(500);
    }

    // Revisa lo que hay en pantalla; en la caja de importantes pasa por todas las páginas
    async revisarActual(nombre) {
        const filas = [];
        const dialogo = this.juego.scene.getScene('Habitacion')?.narracion?.dialogo;
        const paginas = (nombre === 'caja-de-importantes' || nombre === 'tarjetas-con-caja') && dialogo?.abierto ? dialogo.paginas.length : 1;
        let revisados = 0;
        const problemas = [];
        for (let i = 0; i < paginas; i++) {
            if (i > 0) { dialogo.pagina = i; dialogo.dibujar(false); await esperar(80); dialogo.mostrarPista(); await esperar(80); }
            const r = this.revisor.revisar({ marcar: false, silencioso: true });
            revisados = Math.max(revisados, r.revisados);
            problemas.push(...r.problemas.map(p => ({ ...p, pagina: i + 1 })));
        }
        filas.push({ pantalla: nombre, paginas, revisados, problemas });
        return filas[0];
    }

    // Recorre todas (o las que se pidan) y devuelve la tabla
    async recorrer({ solo } = {}) {
        const modo = cargaExtrema() ? 'carga extrema' : 'contenido real máximo';
        const filas = [];
        for (const nombre of Object.keys(this.pantallas())) {
            if (solo && !solo.includes(nombre)) continue;
            await this.preparar(nombre);
            const fila = await this.revisarActual(nombre);
            filas.push({ modo, ...fila, nProblemas: fila.problemas.length, problemas: fila.problemas.map(p => [p.tipo, p.a, p.b, p.pagina].filter(Boolean).join(' | ')) });
        }
        return filas;
    }
}
