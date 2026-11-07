import Bloque from './Bloque.js';

// Obstáculo físico (capa [obstaculos]) que bloquea el paso y la vista. El inspector puede examinarlo al chocar.
// Su ID viene del archivo de entidades y enlaza con su descripción en la narrativa del nivel.
export default class Mueble extends Bloque {
    constructor(id, fila, columna) {
        super('suelo', false);
        this.id = id;
        this.fila = fila;
        this.columna = columna;
    }
}
