export default class Personaje {
    // En el original empezaba en (120, 120) px con bloques de 60 px => casilla (2, 2)
    constructor(fila = 2, columna = 2) {
        this.fila = fila;
        this.columna = columna;
        this.textura = 'personaje';
    }

    getTextura() { return this.textura; }

    moverPersonaje(direccion) {
        this.fila += direccion.df;
        this.columna += direccion.dc;
    }

    puedeAvanzar(direccion, escenario) {
        return escenario.estaLibre(this.fila + direccion.df, this.columna + direccion.dc);
    }

    // Hay una caja delante y la casilla siguiente a ella está libre
    podreMoverBloque(direccion, escenario) {
        const f = this.fila + direccion.df, c = this.columna + direccion.dc;
        return escenario.cajaEn(f, c) !== null
            && escenario.estaLibre(f + direccion.df, c + direccion.dc);
    }

    moverBloque(direccion, escenario) {
        const caja = escenario.cajaEn(this.fila + direccion.df, this.columna + direccion.dc);
        caja.moverA(caja.fila + direccion.df, caja.columna + direccion.dc);
        escenario.actualizarCaja(caja);
        return caja;
    }

    // Devuelve qué pasó para que la vista lo anime: null si no se movió
    interaccion(direccion, escenario) {
        if (this.puedeAvanzar(direccion, escenario)) {
            this.moverPersonaje(direccion);
            return { caja: null };
        }
        if (this.podreMoverBloque(direccion, escenario)) {
            const caja = this.moverBloque(direccion, escenario);
            this.moverPersonaje(direccion);
            return { caja };
        }
        return null;
    }
}
