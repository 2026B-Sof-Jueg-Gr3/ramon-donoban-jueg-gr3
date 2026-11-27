// Ayuda sin texto: si el jugador lleva un rato sin descubrir nada nuevo, indica qué pista visual reforzar.
// Sin Phaser. No dice cómo se refuerza (eso lo decide la escena: destellos sobre las marcas, la solapa de la pila,
// cortinas y polvo hacia la ventana, el ícono de la libreta); solo devuelve el refuerzo { efecto, ... } que toca, o
// null. En el nivel 1 la prioridad es libreta → marcas → pila → corriente, y cada refuerzo se apaga cuando sale su
// línea. La libreta solo cuenta cuando la deducción ya está disponible. Las pistas y las pilas son opcionales: no
// tienen refuerzo. Al resolver el caso la ayuda se apaga del todo (apagar()).
//
// config (assets/investigaciones/nivelN.json → "ayuda"):
//   espera:     segundos sin descubrir nada antes de ayudar (empieza en 45)
//   refuerzos:  lista en orden de prioridad; cada uno puede tener "mientras": { "sinContar": [ids de reglas] }
//               y solo vale mientras ninguna de esas reglas haya salido todavía; "deduccion": "disponible" hace que
//               solo valga mientras la deducción se pueda resolver; "deduccion": "resuelta", solo después de resolverla
export default class Ayuda {
    // investigacion: lo que sabe qué ya salió (necesita yaSalio(idDeRegla)) · deduccionDisponible(): ¿se puede resolver?
    constructor({ espera = 45, refuerzos = [] } = {}, investigacion, { deduccionDisponible = () => false, deduccionResuelta = () => false } = {}) {
        this.espera = espera;
        this.refuerzos = refuerzos;
        this.investigacion = investigacion;
        this.deduccionDisponible = deduccionDisponible;
        this.deduccionResuelta = deduccionResuelta;
        this.apagada = false;
        this.reiniciar();
    }

    reiniciar() {
        this.inactividad = 0;
        this.refuerzo = null;
    }

    // El caso quedó resuelto: ya no hay nada que reforzar
    apagar() {
        this.apagada = true;
        this.reiniciar();
    }

    // El jugador descubrió algo: la ayuda se apaga y la cuenta empieza de nuevo
    alDescubrir() {
        this.reiniciar();
    }

    get activa() {
        return this.refuerzo !== null;
    }

    // dt en segundos. Durante una pausa narrativa no cuenta: leer un texto no es quedarse sin ideas.
    // Devuelve el refuerzo activo o null.
    actualizar(dt, { pausado = false } = {}) {
        if (this.apagada) return null;
        if (!pausado) this.inactividad += dt;
        this.refuerzo = this.inactividad >= this.espera ? this.elegir() : null;
        return this.refuerzo;
    }

    elegir() {
        return this.refuerzos.find(r => this.vale(r.mientras)) ?? null;
    }

    vale(mientras) {
        if (!mientras) return true;
        if (mientras.deduccion === 'disponible' && !this.deduccionDisponible()) return false;
        if (mientras.deduccion === 'resuelta' && !this.deduccionResuelta()) return false;       // después de deducir (brillan la llave o el último hilo)
        return (mientras.sinContar || []).every(id => !this.investigacion.yaSalio(id));
    }
}
