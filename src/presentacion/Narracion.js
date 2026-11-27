// Conecta el Narrador de la v1.1 (sin cambiar su lógica) con DialogoPrincipal, para los acontecimientos importantes,
// y con PanelInvestigacion, para las tarjetas. Aquí solo se decide DÓNDE se dibuja, dentro de los 1280×720 y sin tapar
// al inspector: la caja de los importantes abajo (o arriba si el inspector está abajo) y el panel en el lado de la
// pantalla donde no está el inspector. Es provisional: la presentación de novela visual llega en la fase 4.
import PanelInvestigacion from '../ui/PanelInvestigacion.js';
import DialogoPrincipal from '../ui/DialogoPrincipal.js';
import Narrador from '../ui/Narrador.js';
import { LECTURA } from '../ui/tiemposDeLectura.js';
import GestorDePresentaciones from './GestorDePresentaciones.js';
import DecoradoDeNovela from './DecoradoDeNovela.js';
import { disposicionDeNovela, ladoDelRetrato } from '../motor/Novela.js';

const COLOR_PISTA = '#ffd060';
const PANEL = { ancho: 330, alto: 330, margen: 24 };

export default class Narracion {
    // jugadorEnPantalla(): { x, y } del inspector en la pantalla · alPausar / alReanudar: lo que hace la escena
    // alPulsar: lo que hace un toque sobre la caja de texto · profundidad: capa del panel (la caja va por encima)
    // expresionDe(evento): la expresión del inspector para una línea importante (src/motor/Expresiones.js)
    // oscurecer(): 1 en las pausas normales; con el cierre mucho menos, para que se vea la luz que entra
    // alMostrarTramo(indice, texto): empieza a verse un tramo de un texto importante (ver DialogoPrincipal)
    // ilustracionDe(evento): el nombre de la ilustración de escena que acompaña a una línea importante, o null
    constructor(escena, { profundidad, jugadorEnPantalla, alPausar, alReanudar, alPulsar, expresionDe = () => 'neutral', oscurecer = () => 1, alMostrarTramo = null, ilustracionDe = () => null }) {
        this.escena = escena;
        this.jugadorEnPantalla = jugadorEnPantalla;
        this.panel = new PanelInvestigacion(escena, { profundidad, ajustarAlContenido: true });
        // La caja grande lleva el retrato. Qué expresión toca se sabe por el texto que se está mostrando (el Narrador solo pasa el texto)
        this.expresionDe = expresionDe;
        this.expresiones = new Map();       // texto de un importante → expresión
        this.ilustracionDe = ilustracionDe;
        this.ilustraciones = new Map();     // texto de un importante → ilustración de escena (casi siempre ninguna)
        this.ladoDelRetrato = 'izquierda';
        this.decorado = new DecoradoDeNovela(escena, {
            profundidad: profundidad + 10, lado: () => this.ladoDelRetrato, expresionDelTexto: texto => this.expresiones.get(texto), oscurecer,
            ilustracionDelTexto: texto => this.ilustraciones.get(texto) ?? null
        });
        this.dialogo = new DialogoPrincipal(escena, alPulsar, { profundidad: profundidad + 10, decorado: this.decorado, oscurecer, alMostrarTramo });
        this.gestor = new GestorDePresentaciones();          // apariciones temporales de las marcas
        this.narrador = new Narrador({
            panel: this.panel,
            presentacion: this.dialogo,
            alPausar: () => { this.colocarCaja(); this.gestor.pausarTodas(); alPausar?.(); },
            alReanudar: () => { this.gestor.reanudarTodas(); alReanudar?.(); }
        });
        this.lado = null;
        this.pendientes = [];              // revelaciones que esperan a que se vea la causa del mismo suceso
        this.mostradas = new Set();        // causas que ya estuvieron a la vista
        this.colocarPanel(this.ladoLibre());
    }

    // Bloquea durante la pausa narrativa.
    get bloqueando() { return this.narrador.bloqueando(); }
    avanzar() { return this.narrador.avanzar(); }
    llamarAtencion() { if (this.narrador.bloqueando()) this.narrador.llamarAtencion(); }

    detener() {
        for (const p of this.pendientes) p.seguro?.remove(false);
        this.pendientes = [];
        this.mostradas.clear();
        this.narrador.detener();
    }

    // Pasa un acontecimiento de la habitación (src/motor/Investigacion.js) al Narrador. Devuelve true si se presentó.
    contar(evento) {
        if (evento.clase === 'importante') {
            this.expresiones.set(evento.texto, this.expresionDe(evento));
            const ilustracion = this.ilustracionDe(evento);
            if (ilustracion) this.ilustraciones.set(evento.texto, ilustracion);
        }
        return this.narrador.contar(this.aMensaje(evento));
    }

    // Pasa lo que produjo UN mismo suceso, con la causa primero (así llega de Investigacion). Sin esperas obligatorias: si
    // trae una nota nueva, la que se estaba leyendo se va (Narrador.dejarPasar); las tarjetas y notas se presentan de
    // inmediato y la revelación sale en cuanto su causa está a la vista. La revelación nunca sale antes que su causa: si la
    // causa no puede verse todavía (una pausa), la revelación espera con ella.
    contarTodos(eventos) {
        const importantes = eventos.filter(e => e.clase === 'importante');
        const causas = eventos.filter(e => e.clase !== 'importante');
        if (causas.some(e => e.clase === 'secundaria')) this.narrador.dejarPasar();
        for (const e of causas) this.contar(e);
        if (!importantes.length) return;
        if (!causas.length) { importantes.forEach(e => this.contar(e)); return; }
        const pendiente = { importantes, causas: causas.map(e => e.acontecimiento), seguro: null };
        // Por si la causa no llega a mostrarse nunca (no debería pasar), la revelación sale igualmente
        pendiente.seguro = this.escena.time.delayedCall(LECTURA.esperaMaximaDeLaCausaMs, () => this.soltar(pendiente));
        this.pendientes.push(pendiente);
        this.revisar();
    }

    // Una causa "está a la vista" cuando es la nota de la libreta o una tarjeta ambiental visible; entonces sale su
    // revelación. Se llama al contar y en cada cuadro.
    revisar() {
        const n = this.narrador;
        if (n.actual) this.mostradas.add(n.actual.acontecimiento);
        for (const a of n.ambientalesActivos) this.mostradas.add(a.acontecimiento);
        for (const p of [...this.pendientes]) {
            if (!p.causas.every(id => this.mostradas.has(id))) continue;
            this.soltar(p);
        }
    }

    soltar(pendiente) {
        if (!this.pendientes.includes(pendiente)) return;
        this.pendientes = this.pendientes.filter(p => p !== pendiente);
        pendiente.seguro?.remove(false);
        for (const e of pendiente.importantes) this.contar(e);
    }

    // El título y el color son de interfaz (sin emojis); el texto es exactamente el de la narrativa
    aMensaje(e) {
        const m = { acontecimiento: e.acontecimiento, ref: e.ref, clase: e.clase, texto: e.texto, alCompletar: e.alCompletar };
        if (e.categoria === 'pistas') Object.assign(m, { titulo: e.titulo, color: COLOR_PISTA });
        else if (e.categoria === 'bateria') m.titulo = 'PILAS';
        return m;
    }

    // Cada cuadro: el panel cambia de lado según dónde esté el inspector (solo cuando no hay tarjetas, para no
    // recomponer textos a medio leer) y no se dibuja su marco mientras está vacío
    actualizar() {
        this.revisar();
        const n = this.narrador;
        const vacio = this.panel.tarjetas.length === 0 && n.colaAmbiental.length === 0 && n.secundarios.length === 0 && !n.actual;
        if (vacio) {
            const lado = this.ladoLibre();
            if (lado !== this.lado) this.colocarPanel(lado);
        }
        this.panel.fondo.setVisible(this.panel.tarjetas.some(t => t.vista.visible));      // sin tarjetas a la vista no queda un marco vacío
    }

    // El panel va en la mitad de la pantalla donde no está el inspector (con un margen para que no cambie de lado sin parar)
    ladoLibre() {
        const mitad = this.escena.scale.width / 2, j = this.jugadorEnPantalla();
        if (j.x < mitad - 90) return 'derecha';
        if (j.x > mitad + 90) return 'izquierda';
        return this.lado ?? 'derecha';
    }

    colocarPanel(lado) {
        this.lado = lado;
        const { width } = this.escena.scale;
        this.panel.reposicionar({ x: lado === 'derecha' ? width - PANEL.margen - PANEL.ancho : PANEL.margen, y: PANEL.margen, ancho: PANEL.ancho, alto: PANEL.alto });
    }

    // La caja grande va siempre abajo, con el retrato a un lado: a la izquierda, salvo que ahí estén las tarjetas
    colocarCaja() {
        const { width, height } = this.escena.scale;
        this.ladoDelRetrato = ladoDelRetrato(this.lado, this.panel.tarjetas.length > 0);
        const { zona } = disposicionDeNovela(width, height, this.ladoDelRetrato);
        this.dialogo.reposicionar(zona, { x: 0, y: 0, ancho: width, alto: height });
    }
}
