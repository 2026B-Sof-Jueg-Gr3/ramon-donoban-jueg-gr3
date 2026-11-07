import { LECTURA, tiempoDeLectura } from './tiemposDeLectura.js';

// Punto único por el que pasa todo mensaje de la historia. Ningún mensaje se pierde, se acorta ni sobrescribe a otro.
//
// Mensaje: { acontecimiento, ref, texto, clase, titulo, color, etiqueta, repetible, alCompletar }
//   acontecimiento: identidad de LO QUE OCURRIÓ (p. ej. 'pista:n1-pista-huella:recogida', 'mueble:X:examinar#12').
//                   Se crea una vez por interacción real; si la misma ocurrencia se emite otra vez, se ignora.
//   ref:            entidad o texto al que se refiere (varias ocurrencias distintas pueden compartirla)
//   clase:          'importante' → PAUSA NARRATIVA: el juego no acepta acciones hasta que el jugador lo lee
//                   'secundaria' → nota de la libreta en el panel de investigación; el juego sigue
//                   'ambiental'  → tarjeta de una marca en el panel; el juego sigue
//   repetible:      si una ocurrencia nueva trae el mismo origen (ref) y el mismo texto que uno visible o en cola,
//                   se registra pero no se vuelve a encolar: su contenido ya se va a leer
//   alCompletar:    secundarios: 'conservar' (va a las notas del cierre) | 'descartar' (reacción del momento)
//
// La pausa empieza en la misma llamada que registra el acontecimiento importante: no existe un instante en el que
// ya ocurrió y el jugador todavía pueda actuar. Durante la pausa los secundarios y ambientales quedan suspendidos
// con su estado exacto y nada consume tiempo; al terminar la secuencia se reanudan y el juego continúa.
// Los avisos puramente informativos (✔, 📜) no pasan por aquí.
export default class Narrador {
    // panel: PanelInvestigacion · presentacion: DialogoPrincipal
    // alPausar / alReanudar: la escena detiene o reanuda lo que no es narrativo (controles, apariciones de marcas)
    constructor({ panel, presentacion, alPausar, alReanudar }) {
        this.panel = panel;
        this.presentacion = presentacion;
        this.alPausar = alPausar;
        this.alReanudar = alReanudar;
        this.reiniciarEstado();
    }

    reiniciarEstado() {
        this.vistos = new Set();          // identidades presentadas o pendientes en este intento
        this.secuencia = [];              // páginas de la pausa en curso (importantes y, al cerrar el nivel, notas y cierre)
        this.indice = 0;
        this.pausado = false;
        this.alTerminarSecuencia = null;  // al cerrar el nivel: abrir la pantalla de victoria
        this.secundarios = [];
        this.actual = null;               // secundario visible en la libreta
        this.ambientalesActivos = [];
        this.colaAmbiental = [];
        this.cerrandoNivel = false;
        this.agrupadas = 0;
    }

    // Devuelve true si el mensaje se presentó, quedó en cola o quedó agrupado con uno igual pendiente
    contar(mensaje) {
        return this.proteger('contar', () => this.recibir(mensaje), false);
    }

    recibir(m) {
        if (!m || !m.texto || !m.acontecimiento || this.cerrandoNivel) return false;
        if (this.vistos.has(m.acontecimiento)) return false;
        this.vistos.add(m.acontecimiento);
        if (m.repetible && this.mismoContenidoPendiente(m)) {
            this.agrupadas++;
            return true;
        }
        if (m.clase === 'importante') this.agregarASecuencia([{ texto: m.texto, titulo: m.titulo, acontecimiento: m.acontecimiento }]);
        else if (m.clase === 'ambiental') {
            this.colaAmbiental.push(m);
            this.siguienteAmbiental();
        } else {
            this.secundarios.push(m);
            this.siguienteEnLibreta();
        }
        return true;
    }

    // Mismo origen y mismo contenido que algo visible o en cola (solo para ocurrencias repetibles)
    mismoContenidoPendiente(m) {
        const igual = otro => otro && otro.ref === m.ref && otro.texto === m.texto;
        return [this.actual, ...this.secundarios, ...this.ambientalesActivos, ...this.colaAmbiental].some(igual);
    }

    // ── Pausa narrativa ──────────────────────────────────────────────────────

    agregarASecuencia(paginas) {
        this.secuencia.push(...paginas);
        if (this.pausado) {
            this.proteger('total', () => this.presentacion.actualizarTotal(this.secuencia.length));
            return;
        }
        // La pausa empieza aquí mismo, antes de devolver el control a quien registró el acontecimiento
        this.pausado = true;
        this.proteger('pausar', () => this.panel.pausar());
        this.proteger('alPausar', () => this.alPausar?.());
        this.indice = 0;
        this.abrirPagina();
    }

    abrirPagina() {
        const p = this.secuencia[this.indice];
        try {
            this.presentacion.abrir(p.texto, {
                titulo: p.titulo, indice: this.indice + 1, total: this.secuencia.length,
                alCerrar: () => this.siguientePagina()
            });
        } catch (error) {
            console.error('[Narrador] no se pudo presentar el acontecimiento:', error);
            this.siguientePagina();          // un fallo de presentación no deja al jugador atrapado
        }
    }

    siguientePagina() {
        this.indice++;
        if (this.indice < this.secuencia.length) this.abrirPagina();
        else this.terminarSecuencia();
    }

    terminarSecuencia() {
        this.secuencia = [];
        this.indice = 0;
        if (this.alTerminarSecuencia) {      // fin del nivel: la escena pasa a la victoria
            const alTerminar = this.alTerminarSecuencia;
            this.alTerminarSecuencia = null;
            this.proteger('cerrar', () => this.presentacion.cerrar());
            alTerminar();
            return;
        }
        this.pausado = false;
        this.proteger('cerrar', () => this.presentacion.cerrar());
        this.proteger('reanudar', () => this.panel.reanudar());
        this.proteger('alReanudar', () => this.alReanudar?.());
        this.siguienteEnLibreta();
        this.siguienteAmbiental();
    }

    // Espacio, Enter o un toque durante la pausa: completa la página o pasa a la siguiente
    avanzar() {
        return this.proteger('avanzar', () => {
            if (!this.pausado) return false;
            this.presentacion.alTocar();
            return true;
        }, false);
    }

    llamarAtencion() {
        this.proteger('llamarAtencion', () => this.presentacion.llamarAtencion());
    }

    bloqueando() {
        return this.pausado;
    }

    // ── Libreta (secundarios) ────────────────────────────────────────────────

    siguienteEnLibreta() {
        while (!this.actual && !this.pausado && !this.cerrandoNivel) {
            const m = this.secundarios.shift();
            if (!m) return;
            this.actual = m;
            try {
                this.panel.mostrarSecundaria(m, {
                    lecturaMs: tiempoDeLectura(m.texto),
                    alLeida: () => { m.leida = true; },
                    alTerminar: () => this.terminoSecundaria(m)
                });
            } catch (error) {
                console.error('[Narrador] no se pudo mostrar la nota:', error);
                this.actual = null;          // se sigue con la siguiente: un error no detiene la cola
            }
        }
    }

    terminoSecundaria(m) {
        if (this.actual !== m) return;
        this.actual = null;
        this.siguienteEnLibreta();
    }

    libretaOcupada() {
        return !!this.actual || this.secundarios.length > 0;
    }

    // ── Ambientales ──────────────────────────────────────────────────────────

    siguienteAmbiental() {
        while (!this.pausado && !this.cerrandoNivel && this.ambientalesActivos.length < LECTURA.maximoAmbientales && this.colaAmbiental.length) {
            const m = this.colaAmbiental.shift();
            this.ambientalesActivos.push(m);
            try {
                this.panel.mostrarAmbiental(m, { lecturaMs: tiempoDeLectura(m.texto), alTerminar: () => this.terminoAmbiental(m) });
            } catch (error) {
                console.error('[Narrador] no se pudo mostrar el texto ambiental:', error);
                this.ambientalesActivos = this.ambientalesActivos.filter(a => a !== m);
            }
        }
    }

    terminoAmbiental(m) {
        const antes = this.ambientalesActivos.length;
        this.ambientalesActivos = this.ambientalesActivos.filter(a => a !== m);
        if (this.ambientalesActivos.length !== antes) this.siguienteAmbiental();
    }

    // ── Cierre del nivel ─────────────────────────────────────────────────────

    // Después de los importantes que haya generado la acción final (ya en la secuencia), agrega las notas de la
    // libreta con el texto completo de cada secundario informativo pendiente y el cierre. La victoria solo se abre
    // al terminar la secuencia. Los ambientales se retiran: no afecta a la evidencia ni a su descubrimiento.
    // Devuelve false si no hay nada que presentar.
    cerrarNivel(cierre, alCerrar) {
        return this.proteger('cerrarNivel', () => {
            this.cerrandoNivel = true;
            const notas = [];
            const visible = this.actual;
            if (visible && !visible.leida && visible.alCompletar !== 'descartar') notas.push(visible);   // aún no terminó su lectura
            notas.push(...this.secundarios.filter(m => m.alCompletar !== 'descartar'));
            this.actual = null;
            this.secundarios = [];
            this.colaAmbiental = [];
            this.ambientalesActivos = [];
            this.proteger('retirar', () => this.panel.retirarTodo());

            const paginas = armarPaginasDeCierre([], notas, cierre);
            if (!paginas.length && !this.pausado) return false;
            this.alTerminarSecuencia = alCerrar;
            if (paginas.length) this.agregarASecuencia(paginas);
            return true;
        }, false);
    }

    // Reiniciar o salir del nivel: se vacían las colas y se retiran todos los textos de inmediato
    detener() {
        this.proteger('detener', () => this.presentacion.cerrar());
        this.proteger('retirar', () => this.panel.retirarTodo());
        this.reiniciarEstado();
    }

    // Un error de presentación se registra y no se propaga: un fallo en un texto no puede congelar el juego
    proteger(nombre, accion, siFalla) {
        try {
            return accion();
        } catch (error) {
            console.error(`[Narrador] ${nombre}:`, error);
            return siFalla;
        }
    }
}

// Páginas del diálogo de cierre. Las notas conservan el texto completo de cada secundario; si no caben en una
// página se reparten en varias, sin cortar ninguna.
export function armarPaginasDeCierre(importantes, notas, cierre, caracteresPorPagina = LECTURA.caracteresPorPaginaDeNotas) {
    const paginas = importantes.map(m => ({ texto: m.texto, titulo: m.titulo }));
    const lineas = notas.map(m => `• ${m.etiqueta ? m.etiqueta + ' ' : ''}${m.texto}`);
    const grupos = [];
    for (const linea of lineas) {
        const ultimo = grupos[grupos.length - 1];
        if (ultimo && ultimo.join('\n').length + 1 + linea.length <= caracteresPorPagina) ultimo.push(linea);
        else grupos.push([linea]);
    }
    grupos.forEach((grupo, i) => paginas.push({
        texto: grupo.join('\n'),
        titulo: '📒 NOTAS DE LA LIBRETA' + (grupos.length > 1 ? ` (${i + 1}/${grupos.length})` : '')
    }));
    if (cierre?.texto) paginas.push({ texto: cierre.texto, titulo: cierre.titulo });
    return paginas;
}
