import Pared from './Pared.js';
import Suelo from './Suelo.js';
import PuntoDeLlegada from './PuntoDeLlegada.js';
import Caja from './Caja.js';
import Mueble from './Mueble.js';
import Objeto from './Objeto.js';
import Marca from './Marca.js';
import { leerCapas } from './FormatoNivel.js';

export const RADIO_LINTERNA = 2;

const clave = (fila, columna) => `${fila},${columna}`;

export default class Escenario {
    // textoDeNivel: assets/niveles/nivelN.txt (capas físicas)
    // entidades:    assets/niveles/nivelN.entidades.json (obstáculos con ID, objetos y evidencias fuera de la matriz)
    constructor(textoDeNivel, entidades = {}) {
        this.matrizDeObjetos = [];
        this.cajas = [];
        this.objetos = (entidades.objetos || []).map(o => new Objeto(o.id, o.tipo, o.en[0], o.en[1]));
        this.marcas = (entidades.evidencias || []).map(e => new Marca(e.id, e.en[0], e.en[1]));
        this.inicio = null;
        this.crearMatrizDeBloques(leerCapas(textoDeNivel), entidades.obstaculos || []);
    }

    // La matriz guarda los bloques fijos (terreno y obstáculos); las cajas van aparte porque se mueven
    // y debajo de ellas sigue habiendo suelo o un punto de llegada.
    crearMatrizDeBloques(capas, obstaculos) {
        const idDeObstaculo = new Map(obstaculos.map(o => [clave(o.en[0], o.en[1]), o.id]));
        const usados = new Set();
        for (let f = 0; f < capas.filas; f++) {
            const fila = [];
            for (let c = 0; c < capas.columnas; c++) {
                const terreno = capas.en('terreno', f, c);
                let bloque = terreno === '#' ? new Pared() : terreno === '.' ? new PuntoDeLlegada() : new Suelo();
                if (capas.en('obstaculos', f, c) === 'm') {
                    const id = idDeObstaculo.get(clave(f, c));
                    if (!id) throw new Error(`el obstáculo de la fila ${f}, columna ${c} no tiene ID en el archivo de entidades`);
                    if (terreno !== ' ') throw new Error(`el obstáculo ${id} no está sobre suelo`);
                    usados.add(clave(f, c));
                    bloque = new Mueble(id, f, c);
                }
                const sokoban = capas.en('sokoban', f, c);
                if (sokoban !== ' ' && !bloque.esTangible) throw new Error(`"${sokoban}" está sobre una pared u obstáculo (fila ${f}, columna ${c})`);
                if (sokoban === '@') {
                    if (this.inicio) throw new Error('hay más de un inicio (@)');
                    this.inicio = { fila: f, columna: c };
                } else if (sokoban !== ' ') {
                    if (this.cajas.some(caja => caja.id === sokoban)) throw new Error(`la caja ${sokoban} está repetida`);
                    const caja = new Caja(sokoban, f, c);
                    caja.setLlegoAlPuntoDeLlegada(bloque instanceof PuntoDeLlegada);
                    this.cajas.push(caja);
                }
                fila.push(bloque);
            }
            this.matrizDeObjetos.push(fila);
        }
        if (!this.inicio) throw new Error('falta el inicio del inspector (@)');
        for (const o of obstaculos) {
            if (!usados.has(clave(o.en[0], o.en[1]))) throw new Error(`el obstáculo ${o.id} apunta a una casilla sin "m"`);
        }
    }

    getFilas() { return this.matrizDeObjetos.length; }
    getColumnas() { return this.matrizDeObjetos[0].length; }
    getBloque(fila, columna) { return this.matrizDeObjetos[fila][columna]; }
    getCajas() { return this.cajas; }
    getCaja(id) { return this.cajas.find(c => c.id === id) || null; }
    getObjetos() { return this.objetos; }
    getMarcas() { return this.marcas; }
    getMuebles() { return this.matrizDeObjetos.flat().filter(b => b instanceof Mueble); }
    getInicio() { return this.inicio; }

    estaDentro(fila, columna) {
        return fila >= 0 && columna >= 0 && fila < this.getFilas() && columna < this.getColumnas();
    }

    objetoEn(fila, columna) {
        return this.objetos.find(o => !o.recogido && o.fila === fila && o.columna === columna) || null;
    }

    contarObjetos(tipo, soloRecogidos = false) {
        return this.objetos.filter(o => o.tipo === tipo && (!soloRecogidos || o.recogido)).length;
    }

    // Visibilidad básica: marcas a RADIO_LINTERNA casillas o menos (distancia euclídea), con línea de visión
    // y sin una caja encima. No decide si ya se descubrieron: eso no es un dato físico.
    // Debe coincidir con herramientas/validar_niveles.py
    marcasVisiblesDesde(fila, columna) {
        return this.marcas.filter(m => !this.cajaEn(m.fila, m.columna)
            && (m.fila - fila) ** 2 + (m.columna - columna) ** 2 <= RADIO_LINTERNA ** 2
            && this.hayLineaDeVision(fila, columna, m.fila, m.columna));
    }

    // Recorre la línea entre ambas casillas (Bresenham); paredes y muebles intermedios tapan la vista
    hayLineaDeVision(f0, c0, f1, c1) {
        const dx = Math.abs(c1 - c0), dy = -Math.abs(f1 - f0);
        const sx = c0 < c1 ? 1 : -1, sy = f0 < f1 ? 1 : -1;
        let error = dx + dy, f = f0, c = c0;
        while (f !== f1 || c !== c1) {
            const e2 = 2 * error;
            if (e2 >= dy) { error += dy; c += sx; }
            if (e2 <= dx) { error += dx; f += sy; }
            if ((f !== f1 || c !== c1) && !this.getBloque(f, c).esTangible) return false;
        }
        return true;
    }

    cajaEn(fila, columna) {
        return this.cajas.find(c => c.fila === fila && c.columna === columna) || null;
    }

    // Una casilla está libre si su bloque es tangible y no hay una caja encima
    estaLibre(fila, columna) {
        return this.getBloque(fila, columna).esTangible && !this.cajaEn(fila, columna);
    }

    esDestino(fila, columna) {
        return this.getBloque(fila, columna) instanceof PuntoDeLlegada;
    }

    actualizarCaja(caja) {
        caja.setLlegoAlPuntoDeLlegada(this.esDestino(caja.fila, caja.columna));
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
