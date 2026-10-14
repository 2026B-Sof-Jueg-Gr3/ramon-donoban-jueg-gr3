import Pared from './Pared.js';
import Suelo from './Suelo.js';
import PuntoDeLlegada from './PuntoDeLlegada.js';
import Caja from './Caja.js';

// Códigos usados en assets/niveles/nivelN.txt (mismo formato que el juego en Java)
const SUELO = 0, PARED = 1, CAJA = 2, LLEGADA = 3;

export default class Escenario {
    // textoDeNivel: contenido del .txt (primera línea = tamaño, luego las filas)
    constructor(textoDeNivel) {
        this.matrizModeloDeEscenario = Escenario.transformarArchivoMapaAMatriz(textoDeNivel);
        this.matrizDeObjetos = [];
        this.cajas = [];
        this.crearMatrizDeBloques();
    }

    static transformarArchivoMapaAMatriz(texto) {
        const lineas = texto.trim().split(/\r?\n/);
        const longitud = parseInt(lineas[0], 10);
        const matriz = [];
        for (let i = 1; i <= longitud; i++) {
            matriz.push(lineas[i].trim().split(/\s+/).map(Number));
        }
        return matriz;
    }

    // La matriz guarda los bloques fijos; las cajas van aparte porque se mueven
    // y debajo de ellas sigue habiendo suelo o un punto de llegada.
    crearMatrizDeBloques() {
        this.matrizModeloDeEscenario.forEach((fila, f) => {
            this.matrizDeObjetos.push(fila.map((valor, c) => {
                switch (valor) {
                    case PARED: return new Pared();
                    case LLEGADA: return new PuntoDeLlegada();
                    case CAJA:
                        this.cajas.push(new Caja(f, c));
                        return new Suelo();
                    case SUELO:
                    default: return new Suelo();
                }
            }));
        });
    }

    getFilas() { return this.matrizDeObjetos.length; }
    getColumnas() { return this.matrizDeObjetos[0].length; }
    getBloque(fila, columna) { return this.matrizDeObjetos[fila][columna]; }
    getCajas() { return this.cajas; }

    cajaEn(fila, columna) {
        return this.cajas.find(c => c.fila === fila && c.columna === columna) || null;
    }

    // Una casilla está libre si su bloque es tangible y no hay una caja encima
    estaLibre(fila, columna) {
        return this.getBloque(fila, columna).esTangible && !this.cajaEn(fila, columna);
    }

    actualizarCaja(caja) {
        caja.setLlegoAlPuntoDeLlegada(this.getBloque(caja.fila, caja.columna) instanceof PuntoDeLlegada);
    }

    totalPuntoDeLlegada() {
        return this.matrizDeObjetos.flat().filter(b => b instanceof PuntoDeLlegada).length;
    }

    puntosDeLlegadaFinalizados() {
        return this.cajas.filter(c => c.getLlegoAlPuntoDeLlegada()).length;
    }

    acabarJuego() {
        return this.puntosDeLlegadaFinalizados() === this.totalPuntoDeLlegada();
    }
}
