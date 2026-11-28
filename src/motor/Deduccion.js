// La deducción de una habitación, pregunta por pregunta. Sin Phaser y sin texto propio.
//
// Cada pregunta se resuelve en dos pasos: elegir la conclusión entre varias opciones y respaldarla con pruebas de la libreta
// (como máximo `maximoDePruebas`, para que no se pueda marcar todo). Las pruebas se valoran por lo que DICEN, no por una
// combinación prevista (DISENO_V2.md, sección 5, «Deducción por hechos»):
//   · cada prueba aporta uno o más HECHOS ("aportan": { prueba: [hecho…] });
//   · cada conclusión necesita ciertos hechos ("necesita": [hecho…]), o uno de varios caminos ("necesita": [[hecho…], [hecho…]]);
//   · un hecho que no está en "necesita" es PARCIAL: la prueba es pertinente (orienta), pero no completa nada por sí misma.
// Así una sola prueba que dice todo (la bobina de hilo) vale sola, y dos que se completan (la cuerda y el fuelle) valen juntas,
// sin enumerar las combinaciones.
//
// Una respuesta es correcta solo si se cumplen las TRES condiciones:
//   1. la conclusión es la correcta;
//   2. TODAS las pruebas elegidas son pertinentes a la pregunta (aparecen en "aportan"). Una ajena (las cajas movidas para
//      "¿qué mueve las cortinas?") la convierte en error aunque las demás basten;
//   3. entre todas, las pruebas cubren todos los hechos de algún camino de "necesita".
//   Si falla la 1 o la 2 → 'error'. Si solo falla la 3 → 'error' con motivo 'insuficiente': el razonamiento va bien pero falta
//   una pieza (Silas lo dice con otra línea, "insuficiente" en la narrativa). En los dos casos se repite la pregunta sin castigo.
//   Todas las preguntas resueltas → 'resuelto'
//
// assets/investigaciones/nivelN.json → "deduccion": { maximoDePruebas, preguntas: [{ id, correcta, necesita, aportan }] }
// Los textos (preguntas, opciones) están en la narrativa ("deduccion.preguntas").
export const MAXIMO_DE_PRUEBAS = 2;

// Baraja una copia de la lista (Fisher–Yates). `azar` devuelve un número en [0, 1)
export function mezclar(lista, azar = Math.random) {
    const copia = [...lista];
    for (let i = copia.length - 1; i > 0; i--) {
        const j = Math.min(i, Math.floor(azar() * (i + 1)));
        [copia[i], copia[j]] = [copia[j], copia[i]];
    }
    return copia;
}

// Los caminos de una pregunta: "necesita" es una lista de hechos (un solo camino) o una lista de listas (varios caminos)
export function caminosDe(q) {
    const n = q?.necesita;
    if (!Array.isArray(n) || !n.length) return [];
    return Array.isArray(n[0]) ? n : [n];
}

// Los hechos que aportan, juntas, las pruebas elegidas
export function hechosDe(q, pruebas) {
    const hechos = new Set();
    for (const id of pruebas) for (const h of q.aportan?.[id] || []) hechos.add(h);
    return hechos;
}

// ¿Estas pruebas cubren todos los hechos de algún camino?
export function cubren(q, pruebas) {
    const hechos = hechosDe(q, pruebas);
    return caminosDe(q).some(c => c.every(h => hechos.has(h)));
}

// La selección más chica (de `disponibles`, hasta `max` pruebas) que cubre la pregunta; null si no hay ninguna
export function coberturaMinima(q, disponibles, max) {
    const lista = [...new Set(disponibles)].filter(id => Object.hasOwn(q.aportan || {}, id));
    const buscar = (n, desde, elegidas) => {
        if (elegidas.length === n) return cubren(q, elegidas) ? elegidas : null;
        for (let i = desde; i < lista.length; i++) {
            const r = buscar(n, i + 1, [...elegidas, lista[i]]);
            if (r) return r;
        }
        return null;
    };
    for (let n = 1; n <= Math.min(max, lista.length); n++) {
        const r = buscar(n, 0, []);
        if (r) return r;
    }
    return null;
}

// Las pruebas que forman parte de alguna respuesta mínima (una selección de hasta `max` pruebas que cubre la pregunta y a la que no le
// sobra ninguna). Las demás pertinentes solo orientan: no hacen falta para deducir (el informe las cuenta como hallazgos extra).
export function pruebasNecesarias(q, max) {
    const lista = Object.keys(q.aportan || {});
    const necesarias = new Set();
    const probar = (desde, elegidas) => {
        if (elegidas.length && cubren(q, elegidas) && elegidas.every(p => !cubren(q, elegidas.filter(x => x !== p)))) elegidas.forEach(p => necesarias.add(p));
        if (elegidas.length === max) return;
        for (let i = desde; i < lista.length; i++) probar(i + 1, [...elegidas, lista[i]]);
    };
    probar(0, []);
    return necesarias;
}

// Comprueba la deducción de las reglas contra la narrativa y las pruebas. Devuelve la lista de problemas.
export function validarDeduccion(reglas, narrativa) {
    const errores = [];
    const d = reglas?.deduccion;
    if (!d) return ['faltan las reglas de la "deduccion"'];
    const ids = new Set((reglas.reglas || []).map(r => r.id));
    const pistas = new Set((narrativa.pistas || []).map(p => p.id));
    const nombres = narrativa.deduccion?.pruebas || {};
    if (d.maximoDePruebas !== undefined && !(Number.isInteger(d.maximoDePruebas) && d.maximoDePruebas >= 1)) errores.push('deduccion: "maximoDePruebas" no es válido');
    if (d.pilas !== undefined && !ids.has(d.pilas)) errores.push(`deduccion: la regla de las pilas "${d.pilas}" no existe`);
    for (const [id, p] of Object.entries(d.pruebas || {})) {
        if (p.registro) continue;           // viene del Registro de otra habitación: no sale de una regla de este nivel ni tiene nombre aquí
        if (!ids.has(p.sale)) errores.push(`deduccion: la prueba "${id}" sale de una regla que no existe ("${p.sale}")`);
        if (!pistas.has(id) && !(typeof nombres[id] === 'string' && nombres[id].trim())) errores.push(`deduccion: la prueba "${id}" no tiene nombre corto en la narrativa`);
    }
    for (const id of d.obligatorias || []) if (!(id in (d.pruebas || {}))) errores.push(`deduccion: la prueba obligatoria "${id}" no existe`);
    const textos = narrativa.deduccion?.preguntas || [];
    if (!Array.isArray(d.preguntas) || !d.preguntas.length) errores.push('deduccion: faltan las "preguntas"');
    const max = d.maximoDePruebas ?? MAXIMO_DE_PRUEBAS;
    for (const q of d.preguntas || []) {
        const donde = `deduccion, pregunta "${q.id}"`;
        const texto = textos.find(t => t.id === q.id);
        if (!texto || !String(texto.texto || '').trim()) { errores.push(`${donde}: la narrativa no tiene su texto`); continue; }
        const opciones = texto.opciones || [];
        if (opciones.length !== 3) errores.push(`${donde}: debe tener 3 opciones`);
        if (opciones.some(o => !String(o.texto || '').trim())) errores.push(`${donde}: una opción no tiene texto`);
        if (new Set(opciones.map(o => o.id)).size !== opciones.length) errores.push(`${donde}: opciones con id repetido`);
        if (!opciones.some(o => o.id === q.correcta)) errores.push(`${donde}: la opción correcta "${q.correcta}" no existe`);
        if ('validas' in q) errores.push(`${donde}: "validas" ya no se usa; la pregunta se define por hechos ("necesita" y "aportan")`);
        const caminos = caminosDe(q);
        if (!caminos.length || caminos.some(c => !c.length || c.some(h => typeof h !== 'string' || !h.trim()))) errores.push(`${donde}: "necesita" no es una lista de hechos válida`);
        const aportan = q.aportan && typeof q.aportan === 'object' ? q.aportan : {};
        if (!Object.keys(aportan).length) errores.push(`${donde}: faltan las pruebas que aportan hechos ("aportan")`);
        for (const [id, hechos] of Object.entries(aportan)) {
            if (!(id in (d.pruebas || {}))) errores.push(`${donde}: la prueba "${id}" no existe`);
            if (!Array.isArray(hechos) || !hechos.length) errores.push(`${donde}: la prueba "${id}" no aporta ningún hecho`);
        }
        const dados = new Set(Object.values(aportan).flat());
        for (const c of caminos) for (const h of c) if (!dados.has(h)) errores.push(`${donde}: ninguna prueba aporta el hecho "${h}"`);
        if (caminos.length && !coberturaMinima(q, Object.keys(aportan), max)) errores.push(`${donde}: con ${max} pruebas como máximo no se puede cubrir ningún camino de "necesita"`);
    }
    for (const t of textos) if (!(d.preguntas || []).some(q => q.id === t.id)) errores.push(`la narrativa tiene la pregunta "${t.id}" sin reglas`);
    return errores;
}

export default class Deduccion {
    // definicion: reglas.deduccion · libreta: lo encontrado (necesita idsEncontrados()) · azar: para mezclar las opciones
    constructor(definicion, libreta, { azar = Math.random } = {}) {
        this.definicion = definicion;
        this.libreta = libreta;
        this.azar = azar;
        this.maximo = definicion.maximoDePruebas ?? MAXIMO_DE_PRUEBAS;
        this.preguntas = definicion.preguntas;
        this.reiniciar();
    }

    reiniciar() {
        this.resueltas = new Set();
        this.conclusiones = new Map();    // pregunta resuelta → la conclusión que se eligió
        this.ordenes = new Map();         // el orden mezclado de las opciones de cada pregunta (fijo mientras dura la partida)
    }

    // Lo resuelto hasta ahora, en el orden de las preguntas: [{ pregunta, conclusion }]. Lo pendiente no aparece.
    // Lo resuelto no se pierde: un error en otra pregunta, buscar más pruebas o cerrar la libreta no lo tocan, y
    // preguntaActual() siempre es la primera pendiente.
    logradas() {
        return this.preguntas.filter(q => this.resueltas.has(q.id)).map(q => ({ pregunta: q, conclusion: this.conclusiones.get(q.id) }));
    }

    pregunta(id) { return this.preguntas.find(q => q.id === id) ?? null; }
    resuelta(id) { return this.resueltas.has(id); }
    get completa() { return this.preguntas.every(q => this.resueltas.has(q.id)); }

    // La primera pregunta sin resolver (una ya resuelta no vuelve a preguntarse); null cuando están todas
    preguntaActual() { return this.preguntas.find(q => !this.resueltas.has(q.id)) ?? null; }

    // ¿Las pruebas elegidas cubren los hechos de algún camino de la pregunta?
    respaldan(q, pruebas) { return cubren(q, pruebas); }

    // Las pruebas pertinentes a la pregunta: las que aportan algún hecho (completo o parcial)
    pertinentes(q) { return new Set(Object.keys(q.aportan || {})); }

    // La deducción se habilita cuando cada pregunta se puede cubrir con lo encontrado sin pasar del máximo de pruebas (las ya
    // resueltas cuentan). No depende del orden en que se encontraron.
    // Y las pistas obligatorias (la carta, que hace falta para el final) tienen que estar recogidas.
    disponible() {
        if (this.libreta.obligatoriasListas && !this.libreta.obligatoriasListas()) return false;
        const encontradas = this.libreta.idsEncontrados();
        return this.preguntas.every(q => this.resueltas.has(q.id) || coberturaMinima(q, encontradas, this.maximo) !== null);
    }

    // Los ids de las opciones de la pregunta, en orden mezclado (el mismo cada vez que se pregunta en esta partida)
    opciones(idDePregunta, todas) {
        if (!this.ordenes.has(idDePregunta)) this.ordenes.set(idDePregunta, mezclar(todas, this.azar));
        return [...this.ordenes.get(idDePregunta)];
    }

    // Valida una respuesta. Devuelve { estado, motivo? }:
    //   'resuelto'  las dos preguntas quedaron resueltas
    //   'correcta'  esta pregunta queda resuelta
    //   'error'     se repite la pregunta, sin castigo. motivo: 'conclusion' (equivocada) · 'ajena' (alguna prueba no tiene
    //               nada que ver con la pregunta) · 'insuficiente' (todas pertinentes, pero les falta un hecho)
    //   'invalida'  no se pudo valorar (pregunta desconocida o ya resuelta, ninguna prueba, demasiadas o no encontradas)
    responder(idDePregunta, conclusion, pruebas = []) {
        const q = this.pregunta(idDePregunta);
        if (!q) return { estado: 'invalida', motivo: 'pregunta' };
        if (this.resueltas.has(q.id)) return { estado: 'invalida', motivo: 'ya-resuelta' };
        const elegidas = [...new Set(pruebas)];
        if (!elegidas.length) return { estado: 'invalida', motivo: 'sin-pruebas' };
        if (elegidas.length > this.maximo) return { estado: 'invalida', motivo: 'demasiadas' };
        const encontradas = new Set(this.libreta.idsEncontrados());
        if (elegidas.some(id => !encontradas.has(id))) return { estado: 'invalida', motivo: 'no-encontradas' };
        if (conclusion !== q.correcta) return { estado: 'error', motivo: 'conclusion' };
        const pertinentes = this.pertinentes(q);
        if (!elegidas.every(id => pertinentes.has(id))) return { estado: 'error', motivo: 'ajena' };
        if (!this.respaldan(q, elegidas)) return { estado: 'error', motivo: 'insuficiente' };
        this.resueltas.add(q.id);
        this.conclusiones.set(q.id, conclusion);
        return { estado: this.completa ? 'resuelto' : 'correcta' };
    }
}

// Una habitación sin deducción (la persecución del nivel 5): nada que preguntar ni que resolver
export class DeduccionVacia {
    constructor() { this.preguntas = []; this.maximo = MAXIMO_DE_PRUEBAS; this.resueltas = new Set(); }
    reiniciar() { }
    logradas() { return []; }
    pregunta() { return null; }
    resuelta() { return false; }
    get completa() { return false; }
    preguntaActual() { return null; }
    disponible() { return false; }
    opciones() { return []; }
    responder() { return { estado: 'invalida', motivo: 'pregunta' }; }
}
