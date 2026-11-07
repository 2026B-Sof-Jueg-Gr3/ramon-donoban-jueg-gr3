import Bloque from './Bloque.js';

// La caja es el único bloque móvil: guarda su posición en la matriz.
// Su ID (la letra de la capa [sokoban]) no cambia al moverla, deshacer o reiniciar.
export default class Caja extends Bloque {
    constructor(id, fila, columna) {
        super('caja', false);
        this.id = id;
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
