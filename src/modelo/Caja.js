import Bloque from './Bloque.js';

// La caja es el único bloque móvil: guarda su posición en la matriz.
export default class Caja extends Bloque {
    constructor(fila, columna) {
        super('caja', false);
        this.fila = fila;
        this.columna = columna;
        this.llegoAlPuntoDeLlegada = false;
    }

    getLlegoAlPuntoDeLlegada() {
        return this.llegoAlPuntoDeLlegada;
    }

    setLlegoAlPuntoDeLlegada(valor) {
        this.llegoAlPuntoDeLlegada = valor;
    }

    moverA(fila, columna) {
        this.fila = fila;
        this.columna = columna;
    }
}
