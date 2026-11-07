// Representación visual por acontecimiento con duración finita. Sigue el contrato común aprobado para el
// Director Visual (etapa 5), que reutilizará esta clase:
//   modo 'acontecimiento' · clave única · entrada → permanencia → salida
//   esValida(contexto): ¿se puede seguir mostrando con el estado actual?
//   retirar(motivo):    'tiempo' | 'invalida' | 'inmediato' (sin animación de salida)
//   pausar() / reanudar(): durante una pausa narrativa no se consume tiempo; se conserva la fase y el restante
// Solo dibuja dentro del contenedor que recibe: nunca modifica el tablero ni el conocimiento.
// Que termine NO significa que la entidad haya desaparecido ni que se olvide su descubrimiento.
export default class PresentacionTemporal {
    constructor(escena, contenedor, clave, tiempos) {
        this.modo = 'acontecimiento';
        this.escena = escena;
        this.contenedor = contenedor;
        this.clave = clave;
        this.tiempos = tiempos;
        this.estado = 'nueva';   // nueva → visible → saliendo → terminada
        this.motivo = null;
    }

    // Las subclases construyen el dibujo y sus animaciones
    crearVista() { throw new Error('crearVista no implementado'); }
    animarEntrada() { }
    animarSalida(duracion, alTerminar) {
        this.escena.tweens.add({ targets: this.vista, alpha: 0, duration: duracion, onComplete: alTerminar });
    }
    esValida() { return true; }

    iniciar(alTerminar) {
        this.alTerminar = alTerminar;
        this.vista = this.crearVista();
        this.contenedor.add(this.vista);
        this.estado = 'visible';
        this.animarEntrada(this.tiempos.entrada);
        this.temporizador = this.escena.time.delayedCall(this.tiempos.entrada + this.tiempos.permanencia, () => this.retirar('tiempo'));
    }

    revisar(contexto) {
        if (this.estado === 'visible' && !this.esValida(contexto)) this.retirar('invalida');
    }

    retirar(motivo) {
        if (this.estado === 'terminada' || (this.estado === 'saliendo' && motivo !== 'inmediato')) return;
        this.temporizador?.remove(false);
        this.motivo = motivo;
        this.escena.tweens.killTweensOf(this.objetosAnimados());
        if (motivo === 'inmediato') {
            this.terminar();
            return;
        }
        this.estado = 'saliendo';
        this.animarSalida(this.tiempos.salida, () => this.terminar());
    }

    terminar() {
        if (this.estado === 'terminada') return;
        this.estado = 'terminada';
        this.escena.tweens.killTweensOf(this.objetosAnimados());
        this.vista?.destroy();
        this.alTerminar?.(this);
    }

    pausar() {
        if (this.pausada || this.estado === 'terminada' || this.estado === 'nueva') return;
        this.pausada = true;
        if (this.temporizador) this.temporizador.paused = true;
        for (const t of this.escena.tweens.getTweensOf(this.objetosAnimados())) t.pause();
    }

    reanudar() {
        if (!this.pausada) return;
        this.pausada = false;
        if (this.temporizador) this.temporizador.paused = false;
        for (const t of this.escena.tweens.getTweensOf(this.objetosAnimados())) t.resume();
    }

    // Objetos con tweens propios (la vista y, si la subclase los declara, sus partes)
    objetosAnimados() {
        return [this.vista, ...(this.partes || [])].filter(Boolean);
    }
}
