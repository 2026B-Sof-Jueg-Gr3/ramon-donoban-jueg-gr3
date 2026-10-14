import Escenario from './Escenario.js';
import Personaje from './Personaje.js';

export const TOTAL_NIVELES = 6;

export default class Nivel {
    constructor(numeroDeNivel, textoDeNivel) {
        this.numeroDeNivel = numeroDeNivel;
        this.escenario = new Escenario(textoDeNivel);
        this.personaje = new Personaje();
        this.movimientos = 0;
        this.historial = [];
    }

    static buscarArchivoDeNivel(numeroDeNivel) {
        return `assets/niveles/nivel${numeroDeNivel}.txt`;
    }

    getEscenario() { return this.escenario; }
    getPersonaje() { return this.personaje; }
    getNumeroDeNivel() { return this.numeroDeNivel; }
    getMovimientos() { return this.movimientos; }
    esUltimoNivel() { return this.numeroDeNivel >= TOTAL_NIVELES; }

    mover(direccion) {
        const antes = { fila: this.personaje.fila, columna: this.personaje.columna };
        const resultado = this.personaje.interaccion(direccion, this.escenario);
        if (!resultado) return null;

        const { caja } = resultado;
        this.historial.push({
            personaje: antes,
            caja,
            cajaDesde: caja ? { fila: caja.fila - direccion.df, columna: caja.columna - direccion.dc } : null
        });
        this.movimientos++;
        return resultado;
    }

    // Revierte el último movimiento; devuelve la caja afectada (o null) para que la vista la reposicione
    deshacer() {
        const paso = this.historial.pop();
        if (!paso) return undefined;
        this.personaje.fila = paso.personaje.fila;
        this.personaje.columna = paso.personaje.columna;
        if (paso.caja) {
            paso.caja.moverA(paso.cajaDesde.fila, paso.cajaDesde.columna);
            this.escenario.actualizarCaja(paso.caja);
        }
        this.movimientos--;
        return paso.caja;
    }

    estaCompletado() {
        return this.escenario.acabarJuego();
    }
}
