// Evidencia física sobre una casilla transitable: existe todo el nivel aunque nadie la haya visto.
// Se puede ver con la visibilidad básica (Escenario.marcasVisiblesDesde); una caja encima la tapa.
// Haberla descubierto NO es un dato físico y no se guarda aquí.
export default class Marca {
    constructor(id, fila, columna) {
        this.id = id;
        this.fila = fila;
        this.columna = columna;
    }
}
