import Escenario from './Escenario.js';
import Personaje from './Personaje.js';
import Mueble from './Mueble.js';

export const TOTAL_NIVELES = 6;

const pos = (fila, columna) => Object.freeze({ fila, columna });
const congelar = sucesos => Object.freeze(sucesos.map(s => Object.freeze(s)));
const DIRECCIONES = [[-1, 0], [1, 0], [0, -1], [0, 1]];

// Tablero físico del Sokoban: escenario, inspector, contadores y deshacer.
// No sabe nada de la historia: solo informa lo que pasó físicamente mediante sucesos
// y responde consultas de solo lectura sobre su estado.
//
// Sucesos (en este orden cuando aparecen juntos):
//   mover:     paso {desde, hasta, empuje} · empujon {caja, desde, hasta} · casillaLiberada {en, caja}
//              · casillaCubierta {en, caja} · cajaRetirada {caja, desde} | cajaColocada {caja, en}
//              · objetoRecogido {objeto, clase, en} · completado {pasos, empujones}
//   deshacer:  deshacer {desde, hasta, caja, objeto} · casillaLiberada · casillaCubierta · cajaRetirada | cajaColocada
//   reiniciar: reinicio {}
export default class Nivel {
    constructor(numeroDeNivel, textoDeNivel, entidades = {}) {
        this.numeroDeNivel = numeroDeNivel;
        this.textoDeNivel = textoDeNivel;
        this.entidades = entidades;
        this.suscriptores = new Set();
        this.cargarEstadoInicial();
    }

    cargarEstadoInicial() {
        this.escenario = new Escenario(this.textoDeNivel, this.entidades);
        const { fila, columna } = this.escenario.getInicio();
        this.personaje = new Personaje(fila, columna);
        this.movimientos = 0;   // pasos del intento, incluidos los empujones
        this.empujones = 0;
        this.historial = [];
    }

    static buscarArchivoDeNivel(numeroDeNivel) {
        return `assets/niveles/nivel${numeroDeNivel}.txt`;
    }

    static buscarArchivoDeEntidades(numeroDeNivel) {
        return `assets/niveles/nivel${numeroDeNivel}.entidades.json`;
    }

    getEscenario() { return this.escenario; }
    getPersonaje() { return this.personaje; }
    getNumeroDeNivel() { return this.numeroDeNivel; }
    getMovimientos() { return this.movimientos; }
    getEmpujones() { return this.empujones; }
    esUltimoNivel() { return this.numeroDeNivel >= TOTAL_NIVELES; }

    // ── Sucesos ────────────────────────────────────────────────────────────

    // Devuelve una función para dejar de escuchar
    suscribir(alSuceder) {
        this.suscriptores.add(alSuceder);
        return () => this.suscriptores.delete(alSuceder);
    }

    emitir(sucesos) {
        const lista = congelar(sucesos);
        for (const alSuceder of this.suscriptores) alSuceder(lista);
        return lista;
    }

    // Sucesos de una caja que pasa de una casilla a otra (empujón o deshacer)
    sucesosDeCaja(caja, desde, hasta, estabaColocada) {
        const sucesos = [
            { tipo: 'casillaLiberada', en: desde, caja: caja.id },
            { tipo: 'casillaCubierta', en: hasta, caja: caja.id }
        ];
        const colocadaAhora = caja.getLlegoAlPuntoDeLlegada();
        if (estabaColocada && !colocadaAhora) sucesos.push({ tipo: 'cajaRetirada', caja: caja.id, desde });
        if (!estabaColocada && colocadaAhora) sucesos.push({ tipo: 'cajaColocada', caja: caja.id, en: hasta });
        return sucesos;
    }

    // ── Acciones ───────────────────────────────────────────────────────────

    mover(direccion) {
        const desde = pos(this.personaje.fila, this.personaje.columna);
        const delante = this.escenario.cajaEn(desde.fila + direccion.df, desde.columna + direccion.dc);
        const estabaColocada = delante ? delante.getLlegoAlPuntoDeLlegada() : false;

        const resultado = this.personaje.interaccion(direccion, this.escenario);
        if (!resultado) return null;

        const { caja } = resultado;
        const hasta = pos(this.personaje.fila, this.personaje.columna);
        const objeto = this.escenario.objetoEn(hasta.fila, hasta.columna);
        if (objeto) objeto.recogido = true;

        const cajaHasta = caja ? pos(caja.fila, caja.columna) : null;
        this.historial.push({ personaje: desde, caja, cajaDesde: caja ? hasta : null, cajaHasta, estabaColocada, objeto });
        this.movimientos++;
        if (caja) this.empujones++;

        const sucesos = [{ tipo: 'paso', desde, hasta, empuje: !!caja }];
        if (caja) {
            sucesos.push({ tipo: 'empujon', caja: caja.id, desde: hasta, hasta: cajaHasta });
            sucesos.push(...this.sucesosDeCaja(caja, hasta, cajaHasta, estabaColocada));
        }
        if (objeto) sucesos.push({ tipo: 'objetoRecogido', objeto: objeto.id, clase: objeto.tipo, en: hasta });
        if (this.estaCompletado()) sucesos.push({ tipo: 'completado', pasos: this.movimientos, empujones: this.empujones });

        const colocadaAhora = caja ? caja.getLlegoAlPuntoDeLlegada() : false;
        return {
            caja,
            objeto,
            colocada: !!caja && !estabaColocada && colocadaAhora,
            retirada: !!caja && estabaColocada && !colocadaAhora,
            sucesos: this.emitir(sucesos)
        };
    }

    // Revierte el último movimiento; devuelve la caja y el objeto afectados para que la vista los restaure
    deshacer() {
        const paso = this.historial.pop();
        if (!paso) return null;
        const desde = pos(this.personaje.fila, this.personaje.columna);
        this.personaje.fila = paso.personaje.fila;
        this.personaje.columna = paso.personaje.columna;
        const sucesos = [{
            tipo: 'deshacer', desde, hasta: paso.personaje,
            caja: paso.caja ? paso.caja.id : null, objeto: paso.objeto ? paso.objeto.id : null
        }];
        if (paso.caja) {
            const estabaColocada = paso.caja.getLlegoAlPuntoDeLlegada();
            paso.caja.moverA(paso.cajaDesde.fila, paso.cajaDesde.columna);
            this.escenario.actualizarCaja(paso.caja);
            sucesos.push(...this.sucesosDeCaja(paso.caja, paso.cajaHasta, paso.cajaDesde, estabaColocada));
        }
        if (paso.objeto) paso.objeto.recogido = false;
        this.movimientos--;
        if (paso.caja) this.empujones--;
        return { caja: paso.caja, objeto: paso.objeto, sucesos: this.emitir(sucesos) };
    }

    // Vuelve al estado inicial del nivel: mismas cajas con los mismos IDs, contadores en 0 y sin historial
    reiniciar() {
        this.cargarEstadoInicial();
        return { sucesos: this.emitir([{ tipo: 'reinicio' }]) };
    }

    muebleDelante(direccion) {
        const bloque = this.escenario.getBloque(this.personaje.fila + direccion.df, this.personaje.columna + direccion.dc);
        return bloque instanceof Mueble ? bloque : null;
    }

    estaCompletado() {
        return this.escenario.acabarJuego();
    }

    // ── Consultas espaciales (solo lectura) ─────────────────────────────────

    // Suelo o destino, sin pared ni obstáculo (las cajas no cuentan: se mueven)
    esTransitable(fila, columna) {
        return this.escenario.estaDentro(fila, columna) && this.escenario.getBloque(fila, columna).esTangible;
    }

    // 'inspector', 'caja' o null
    ocupante(fila, columna) {
        if (this.personaje.fila === fila && this.personaje.columna === columna) return 'inspector';
        return this.escenario.cajaEn(fila, columna) ? 'caja' : null;
    }

    // Qué entidades hay en esa casilla, como datos de solo lectura
    entidadesEn(fila, columna) {
        if (!this.escenario.estaDentro(fila, columna)) return null;
        const aqui = e => e.fila === fila && e.columna === columna;
        const bloque = this.escenario.getBloque(fila, columna);
        const caja = this.escenario.cajaEn(fila, columna);
        return Object.freeze({
            obstaculo: bloque instanceof Mueble ? bloque.id : null,
            caja: caja ? caja.id : null,
            objetos: Object.freeze(this.escenario.getObjetos().filter(aqui).map(o => Object.freeze({ id: o.id, tipo: o.tipo, recogido: o.recogido }))),
            evidencias: Object.freeze(this.escenario.getMarcas().filter(aqui).map(m => m.id))
        });
    }

    // Camino más corto del inspector entre dos casillas (lista de {fila, columna}, incluidos los extremos)
    // por casillas transitables; las cajas bloquean salvo que atravesarCajas sea true. null si no hay camino.
    camino(desde, hasta, { atravesarCajas = false } = {}) {
        const libre = (f, c) => this.esTransitable(f, c) && (atravesarCajas || !this.escenario.cajaEn(f, c));
        if (!libre(hasta.fila, hasta.columna) && !(desde.fila === hasta.fila && desde.columna === hasta.columna)) return null;
        const previo = new Map([[`${desde.fila},${desde.columna}`, null]]);
        const cola = [desde];
        while (cola.length) {
            const actual = cola.shift();
            if (actual.fila === hasta.fila && actual.columna === hasta.columna) {
                const ruta = [];
                for (let p = actual; p; p = previo.get(`${p.fila},${p.columna}`)) ruta.unshift(pos(p.fila, p.columna));
                return Object.freeze(ruta);
            }
            for (const [df, dc] of DIRECCIONES) {
                const f = actual.fila + df, c = actual.columna + dc;
                if (!libre(f, c) || previo.has(`${f},${c}`)) continue;
                previo.set(`${f},${c}`, actual);
                cola.push({ fila: f, columna: c });
            }
        }
        return null;
    }

    // Copia de solo lectura del estado físico actual
    estado() {
        const e = this.escenario;
        return Object.freeze({
            filas: e.getFilas(),
            columnas: e.getColumnas(),
            inspector: pos(this.personaje.fila, this.personaje.columna),
            cajas: Object.freeze(e.getCajas().map(c => Object.freeze({ id: c.id, fila: c.fila, columna: c.columna, enDestino: c.getLlegoAlPuntoDeLlegada() }))),
            objetos: Object.freeze(e.getObjetos().map(o => Object.freeze({ id: o.id, tipo: o.tipo, fila: o.fila, columna: o.columna, recogido: o.recogido }))),
            evidencias: Object.freeze(e.getMarcas().map(m => Object.freeze({ id: m.id, fila: m.fila, columna: m.columna }))),
            pasos: this.movimientos,
            empujones: this.empujones,
            completado: this.estaCompletado()
        });
    }
}
