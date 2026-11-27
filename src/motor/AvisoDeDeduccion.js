// Cuándo avisar de que ya se puede resolver el caso. Sin Phaser. La primera vez que la deducción está disponible, y
// solo cuando no hay ningún texto importante en curso, espera un momento (para que el jugador alcance a asimilar lo
// último que descubrió) y entonces dice que hay que abrir la libreta. Avisa una sola vez; si el jugador abre la libreta
// por su cuenta antes, ya no hace falta avisar.
export const ESPERA_DEL_AVISO = 1.5;      // segundos

export default class AvisoDeDeduccion {
    constructor({ espera = ESPERA_DEL_AVISO } = {}) {
        this.espera = espera;
        this.reiniciar();
    }

    reiniciar() {
        this.transcurrido = 0;
        this.avisado = false;       // ya se avisó (o el jugador ya vio la libreta con la deducción disponible)
        this.resuelto = false;
    }

    // dt en segundos · disponible: la deducción se puede resolver · bloqueado: hay un importante en curso o la libreta está abierta
    // Devuelve true UNA vez, en el cuadro en que hay que abrir la libreta.
    actualizar(dt, { disponible, bloqueado }) {
        if (this.avisado || this.resuelto || !disponible) { this.transcurrido = 0; return false; }
        if (bloqueado) { this.transcurrido = 0; return false; }      // la espera empieza cuando termina lo que estaba en curso
        this.transcurrido += dt;
        if (this.transcurrido < this.espera) return false;
        this.avisado = true;
        return true;
    }

    // El jugador abrió la libreta con la deducción ya disponible: ya la vio
    alAbrirLaLibreta(disponible) { if (disponible) this.avisado = true; }

    alResolver() { this.resuelto = true; }

    // El ícono de la libreta en la esquina: desde que se avisó (y se siguió investigando) hasta que se resuelve
    get iconoVisible() { return this.avisado && !this.resuelto; }
}
