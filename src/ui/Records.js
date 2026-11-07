// Récords globales del jugador, por nivel: no pertenecen a una partida y nunca se borran al empezar otra.
// Hay dos récords independientes y cada uno solo se reemplaza si el intento completado lo mejora:
//   pasos:     menos pasos; si empatan, menos empujones
//   empujones: menos empujones; si empatan, menos pasos
// Solo se actualizan al completar un intento: deshacer, reiniciar o abandonar no los tocan.
const CLAVE = 'inspector-logica-records';

const esConteo = n => Number.isInteger(n) && n >= 0;

// true si el intento (pasos, empujones) mejora el récord según su criterio principal y su desempate
export function mejora(record, intento, criterio) {
    if (!record) return true;
    const desempate = criterio === 'pasos' ? 'empujones' : 'pasos';
    return intento[criterio] < record[criterio]
        || (intento[criterio] === record[criterio] && intento[desempate] < record[desempate]);
}

// Función pura: devuelve los récords del nivel tras un intento completado y qué categorías mejoró
export function aplicarIntento(recordsDelNivel, intento) {
    if (!esConteo(intento.pasos) || !esConteo(intento.empujones) || intento.empujones > intento.pasos) {
        throw new Error(`intento inválido: ${JSON.stringify(intento)}`);
    }
    const actual = recordsDelNivel || {};
    const marca = { pasos: intento.pasos, empujones: intento.empujones };
    const nuevoPasos = mejora(actual.pasos, marca, 'pasos');
    const nuevoEmpujones = mejora(actual.empujones, marca, 'empujones');
    return {
        records: {
            pasos: nuevoPasos ? marca : actual.pasos,
            empujones: nuevoEmpujones ? { ...marca } : actual.empujones
        },
        nuevoPasos,
        nuevoEmpujones
    };
}

export default class Records {
    static leerTodos() {
        try { return JSON.parse(localStorage.getItem(CLAVE)) || {}; }
        catch (e) { return {}; }
    }

    static delNivel(numeroDeNivel) {
        return Records.leerTodos()[numeroDeNivel] || null;
    }

    // Registra un intento completado; devuelve { records, nuevoPasos, nuevoEmpujones }
    static registrarIntento(numeroDeNivel, intento) {
        const todos = Records.leerTodos();
        const resultado = aplicarIntento(todos[numeroDeNivel], intento);
        todos[numeroDeNivel] = resultado.records;
        try { localStorage.setItem(CLAVE, JSON.stringify(todos)); } catch (e) { }
        return resultado;
    }
}
