// Antes de pasar al informe, lo último que salió se tiene que poder leer. Sin Phaser y sin temporizadores propios del Narrador: se mira
// el estado de las tarjetas y se dice cuáles congelar y cuándo ya se puede ofrecer "continuar".
//
// Una tarjeta pasa por: 'nueva' → 'escribiendo' → 'leyendo' (escrita entera; corre su tiempo mínimo de lectura,
// src/ui/tiemposDeLectura.js) → 'saliendo' → 'terminada'. Si se la dejara, se iría sola justo al cumplirse ese tiempo; por eso, cuando le
// quedan unos milisegundos, se la congela (queda a la vista, escrita entera) y aquí se cuenta lo que le faltaba. Si detrás de ella hay
// otra en cola, no se la congela: tiene que irse para que la otra salga.
//
//   estado: { tarjetas: [{ id, tipo: 'libreta' | 'ambiental', fase, restanteMs }],
//             enCola: { libreta, ambiental },     // las que esperan turno
//             ocupada }                            // hay un texto importante o una revelación por salir
export const MARGEN_PARA_SOSTENER_MS = 250;

const SIN_LEER = ['nueva', 'escribiendo', 'leyendo'];

// ¿Queda algo por leer? Si no, se pasa al informe sin pedir nada
export function quedaPorLeer({ tarjetas, enCola, ocupada }) {
    return !!ocupada || enCola.libreta > 0 || enCola.ambiental > 0 || tarjetas.some(t => SIN_LEER.includes(t.fase));
}

export default class EsperaDeLectura {
    constructor({ margenMs = MARGEN_PARA_SOSTENER_MS } = {}) {
        this.margen = margenMs;
        this.sostenidas = new Map();      // id → ms que le faltan para cumplir su tiempo de lectura
    }

    // dt en ms. Devuelve { sostener: [ids que hay que congelar ahora], listo: ya se puede ofrecer "continuar" }
    actualizar(dtMs, { tarjetas, enCola, ocupada }) {
        for (const [id, falta] of this.sostenidas) this.sostenidas.set(id, Math.max(0, falta - dtMs));
        const sostener = [];
        for (const t of tarjetas) {
            if (this.sostenidas.has(t.id) || t.fase !== 'leyendo' || enCola[t.tipo] > 0 || t.restanteMs > this.margen) continue;
            this.sostenidas.set(t.id, Math.max(0, t.restanteMs));
            sostener.push(t.id);
        }
        const listo = !ocupada && !enCola.libreta && !enCola.ambiental
            && tarjetas.every(t => (this.sostenidas.has(t.id) ? this.sostenidas.get(t.id) === 0 : !SIN_LEER.includes(t.fase)));
        return { sostener, listo };
    }
}
