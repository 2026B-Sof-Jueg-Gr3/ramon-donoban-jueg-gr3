// Gestor mínimo de presentaciones temporales: no muestra dos veces la misma clave a la vez, revisa su validez
// después de cada cambio físico, las suspende durante una pausa narrativa y las retira todas al salir o reiniciar.
// En la etapa 5 el Director Visual lo ampliará (modo por estado, prioridades, saltar…); hoy no hace nada más.
export default class GestorDePresentaciones {
    constructor() {
        this.activas = new Map();
        this.pausado = false;
    }

    // Devuelve false si ya hay una presentación activa con esa clave
    mostrar(presentacion) {
        if (this.activas.has(presentacion.clave)) return false;
        this.activas.set(presentacion.clave, presentacion);
        presentacion.iniciar(terminada => {
            if (this.activas.get(terminada.clave) === terminada) this.activas.delete(terminada.clave);
        });
        if (this.pausado) presentacion.pausar();   // si aparece durante una pausa, empieza suspendida
        return true;
    }

    revisar(contexto) {
        for (const presentacion of [...this.activas.values()]) presentacion.revisar(contexto);
    }

    pausarTodas() {
        this.pausado = true;
        for (const presentacion of this.activas.values()) presentacion.pausar();
    }

    reanudarTodas() {
        this.pausado = false;
        for (const presentacion of this.activas.values()) presentacion.reanudar();
    }

    retirarTodas(motivo = 'inmediato') {
        for (const presentacion of [...this.activas.values()]) presentacion.retirar(motivo);
    }

    estaActiva(clave) {
        return this.activas.has(clave);
    }
}
