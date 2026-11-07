// Objeto físico fuera de la matriz que el inspector recoge al pisarlo: una pista o una batería.
// "recogido" es estado físico del intento: deshacer y reiniciar lo revierten.
export default class Objeto {
    constructor(id, tipo, fila, columna) {
        this.id = id;
        this.tipo = tipo;         // 'pista' | 'bateria'
        this.fila = fila;
        this.columna = columna;
        this.recogido = false;
    }
}
