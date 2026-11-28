// Lo que comparten los seis niveles (fase 6): acciones nuevas (mirar debajo, cortar, ordenar, cerrar, apagar, abrir), sucesos del
// mundo (piso, vio-cerca, resolvio), "alguno" en los requisitos, pistas obligatorias, expediente del Registro y ayuda "resuelta".
import { test } from 'node:test';
import assert from 'node:assert/strict';
import Investigacion, { validarReglas } from '../src/motor/Investigacion.js';
import Libreta from '../src/motor/Libreta.js';
import Deduccion, { validarDeduccion, DeduccionVacia } from '../src/motor/Deduccion.js';
import Ayuda from '../src/motor/Ayuda.js';

const narrativa = {
    intro: 'intro', comentarios: ['c0', 'c1'], revelaciones: ['r0'], cierre: 'cierre', error: 'error', bateria: 'pilas',
    pistas: [{ id: 'p-llave', titulo: 'LLAVE', texto: 'la llave' }, { id: 'p-carta', titulo: 'CARTA', texto: 'la carta' }],
    muebles: [{ id: 'm-caja', emoji: '🧰', texto: 'herramientas' }],
    deduccion: { pruebas: { huellas: 'Huellas', 'caja-herramientas': 'Herramientas' }, preguntas: [{ id: 'q', texto: '¿?', opciones: [{ id: 'a', texto: 'a' }, { id: 'b', texto: 'b' }, { id: 'c', texto: 'c' }] }] }
};
const reglas = () => ({
    objetos: {
        cajas: { acciones: { examinar: {}, 'mirar-debajo': { requiere: ['examino:cajas'] } } },
        hilo: { acciones: { tirar: {}, cortar: { requiere: ['tiro:hilo'] } } },
        puerta: { acciones: { abrir: { requiere: ['resolvio'], alguno: ['recogio:p-llave', 'examino:m-caja'] } } },
        'p-llave': { acciones: { recoger: {} } }, 'm-caja': { acciones: { examinar: {} } }, 'p-carta': { acciones: { recoger: {} } },
        archivos: { acciones: { examinar: {}, ordenar: { requiere: ['examino:archivos'] } } },
        chimenea: { acciones: { apagar: {} } }, salida: { acciones: { cerrar: {} } },
        tablas: {}, juguete: {}
    },
    reglas: [
        { id: 'c0', cuando: ['piso:tablas'], clase: 'secundaria', texto: 'comentarios:0' },
        { id: 'c1', cuando: ['vio-cerca:juguete'], clase: 'secundaria', texto: 'comentarios:1' },
        { id: 'r0', cuando: ['miro-debajo:cajas'], clase: 'importante', texto: 'revelaciones:0' },
        { id: 'pista:p-carta', cuando: ['recogio:p-carta'], clase: 'secundaria', texto: 'pistas:p-carta' },
        { id: 'pista:p-llave', cuando: ['recogio:p-llave'], clase: 'secundaria', texto: 'pistas:p-llave' },
        { id: 'mueble:m-caja', cuando: ['examino:m-caja'], clase: 'secundaria', texto: 'muebles:m-caja' }
    ],
    deduccion: {
        obligatorias: ['p-carta'],
        pruebas: { huellas: { sale: 'r0' }, 'p-carta': { sale: 'pista:p-carta' }, 'p-llave': { sale: 'pista:p-llave' }, 'caja-herramientas': { sale: 'mueble:m-caja' } },
        preguntas: [{ id: 'q', correcta: 'a', necesita: ['alguien-paso'], aportan: { huellas: ['alguien-paso'] } }]
    },
    ayuda: { espera: 45, refuerzos: [{ efecto: 'final', mientras: { deduccion: 'resuelta' } }, { efecto: 'carta', mientras: { sinContar: ['pista:p-carta'] } }] }
});
const nueva = () => new Investigacion(reglas(), narrativa);

test('las reglas con las acciones y sucesos nuevos son válidas', () => {
    assert.deepEqual(validarReglas(reglas(), narrativa), []);
    assert.deepEqual(validarDeduccion(reglas(), narrativa), []);
});

test('cada acción nueva produce su suceso y solo se puede si se cumplen sus requisitos', () => {
    const inv = nueva();
    assert.equal(inv.puedeActuar('cajas', 'mirar-debajo'), false, 'antes hay que examinar las cajas');
    assert.deepEqual(inv.miroDebajo('cajas'), [], 'y si se intenta antes, no pasa nada');
    inv.examino('cajas');
    assert.equal(inv.puedeActuar('cajas', 'mirar-debajo'), true);
    assert.deepEqual(inv.miroDebajo('cajas').map(e => e.regla), ['r0']);
    assert.equal(inv.puedeActuar('hilo', 'cortar'), false, 'no se puede cortar antes de tirar');
    assert.deepEqual(inv.corto('hilo'), []);
    inv.tiro('hilo');
    assert.equal(inv.puedeActuar('hilo', 'cortar'), true);
    inv.corto('hilo');
    assert.ok(inv.ocurrio('corto:hilo'));
    assert.equal(inv.hayAlgoNuevo('hilo', 'cortar'), false, 'ya cortado: el ícono E no aparece');
    assert.equal(inv.puedeActuar('archivos', 'ordenar'), false);
    inv.examino('archivos');
    inv.ordeno('archivos');
    assert.ok(inv.ocurrio('ordeno:archivos'));
    inv.cerro('salida'); inv.apago('chimenea');
    assert.ok(inv.ocurrio('cerro:salida') && inv.ocurrio('apago:chimenea'));
});

test('"alguno": la puerta se abre con la llave O con la caja de herramientas, y solo tras resolver; sin ellas no', () => {
    const intentar = (...antes) => {
        const inv = nueva();
        for (const h of antes) { if (h === 'resolvio') inv.resolvio(); else if (h === 'llave') inv.recogio('p-llave'); else if (h === 'caja') inv.examino('m-caja'); }
        return inv.puedeActuar('puerta', 'abrir');
    };
    assert.equal(intentar(), false);
    assert.equal(intentar('resolvio'), false, 'resuelta, pero sin llave ni ganzúas');
    assert.equal(intentar('llave'), false, 'con la llave, pero sin resolver');
    assert.equal(intentar('resolvio', 'llave'), true);
    assert.equal(intentar('resolvio', 'caja'), true);
    assert.equal(intentar('resolvio', 'llave', 'caja'), true);
});

test('piso y vio-cerca: salen una sola vez y solo para objetos que la habitación define', () => {
    const inv = nueva();
    assert.deepEqual(inv.piso('tablas').map(e => e.regla), ['c0']);
    assert.deepEqual(inv.piso('tablas'), []);
    assert.deepEqual(inv.vioCerca('juguete').map(e => e.regla), ['c1']);
    assert.deepEqual(inv.vioCerca('juguete'), []);
    assert.deepEqual(nueva().piso('no-existe'), []);
    assert.deepEqual(nueva().vioCerca('no-existe'), []);
});

test('las reglas mal escritas con los sucesos nuevos se detectan', () => {
    const r = reglas();
    r.reglas.push({ id: 'x', cuando: ['piso:fantasma'], clase: 'secundaria', texto: 'comentarios:0' });
    r.reglas.push({ id: 'y', cuando: ['resolvio:algo'], clase: 'secundaria', texto: 'comentarios:0' });
    r.objetos.puerta.acciones.abrir.alguno.push('recogio:no-existe');
    const problemas = validarReglas(r, narrativa);
    assert.equal(problemas.length, 3, problemas.join(' | '));
});

test('las pistas obligatorias: no hay deducción hasta recogerlas, aunque las pruebas ya estén', () => {
    const inv = nueva();
    const libreta = new Libreta(reglas().deduccion, narrativa, inv);
    const deduccion = new Deduccion(reglas().deduccion, libreta);
    inv.examino('cajas'); inv.miroDebajo('cajas');
    assert.equal(libreta.obligatoriasListas(), false);
    assert.equal(deduccion.disponible(), false, 'falta la carta');
    inv.recogio('p-carta');
    assert.equal(deduccion.disponible(), true);
    assert.equal(deduccion.responder('q', 'a', ['p-carta']).motivo, 'ajena', 'la carta es obligatoria, pero no responde la pregunta');
    assert.equal(deduccion.responder('q', 'a', ['huellas']).estado, 'resuelto');
});

test('el resumen cuenta los hallazgos extra: lo que no hace falta para deducir ni es para el final', () => {
    const r = reglas();
    r.reglas.find(x => x.id === 'pista:p-carta').paraElFinal = true;
    const inv = new Investigacion(r, narrativa);
    const libreta = new Libreta(r.deduccion, narrativa, inv);
    assert.deepEqual(libreta.resumen(), { extras: 0, totalDeExtras: 2, pistas: 0, totalDePistas: 2, pilas: false }, 'la llave y la caja de herramientas; la carta no cuenta');
    inv.recogio('p-llave'); inv.recogio('p-carta');
    assert.equal(libreta.resumen().extras, 1);
});

test('la deducción vacía (nivel 5) no pregunta nada ni se puede resolver', () => {
    const d = new DeduccionVacia();
    assert.equal(d.disponible(), false);
    assert.equal(d.preguntaActual(), null);
    assert.deepEqual(d.logradas(), []);
    assert.equal(d.responder('q', 'a', ['x']).estado, 'invalida');
});

test('el expediente: las pruebas del nivel y todas las pistas que el Registro guardó en los anteriores, agrupadas por habitación', () => {
    const anterior = { pistas: [{ id: 'n2-pista-recibo', titulo: 'RECIBO', texto: 'poleas' }, { id: 'n3-pista-carta', titulo: 'CARTA', texto: 'carta' }, { id: 'n3-pista-llave', titulo: 'LLAVE', texto: 'llave' }] };
    const registro = { 'n2-pista-recibo': { nivel: 2 }, 'n3-pista-carta': { nivel: 3 }, 'n3-pista-llave': { nivel: 3 }, 'n6-pista-propia': { nivel: 6 } };
    const nar6 = { ...narrativa, pistas: [{ id: 'n6-pista-propia', titulo: 'CARTAS', texto: 'compradores' }], deduccion: { pruebas: { huellas: 'Huellas' }, preguntas: [] } };
    const def = { expediente: true, pruebas: { huellas: { sale: 'r0' }, 'n2-pista-recibo': { registro: true }, 'n3-pista-carta': { registro: true }, 'n5-pista-planos': { registro: true } }, preguntas: [{ id: 'q', correcta: 'a', necesita: ['x', 'y'], aportan: { 'n2-pista-recibo': ['x'], 'n3-pista-carta': ['y'] } }] };
    const inv = new Investigacion({ objetos: { cajas: { acciones: { examinar: {}, 'mirar-debajo': {} } } }, reglas: [{ id: 'r0', cuando: ['miro-debajo:cajas'], clase: 'importante', texto: 'revelaciones:0' }] }, nar6);
    const libreta = new Libreta(def, nar6, inv, { nivel: 6, registro: () => registro, narrativas: { 2: anterior, 3: anterior, 6: nar6 } });
    assert.deepEqual(libreta.hallazgos().map(h => [h.id, h.nivel]), [['n2-pista-recibo', 2], ['n3-pista-carta', 3], ['n3-pista-llave', 3]], 'las del Registro, agrupadas por nivel');
    inv.miroDebajo('cajas');
    assert.deepEqual(libreta.hallazgos().map(h => h.id), ['huellas', 'n2-pista-recibo', 'n3-pista-carta', 'n3-pista-llave']);
    assert.equal(libreta.hallazgos()[1].nombre, 'RECIBO');
    // Si falta una pista de un nivel anterior (los planos), la pregunta que la necesita no se puede resolver
    def.preguntas[0].aportan = { 'n3-pista-carta': ['x'], 'n5-pista-planos': ['y'] };
    const deduccion = new Deduccion(def, libreta);
    assert.equal(deduccion.disponible(), false, 'faltan los planos del nivel 5');
    assert.equal(deduccion.responder('q', 'a', ['n3-pista-carta', 'n5-pista-planos']).motivo, 'no-encontradas');
    registro['n5-pista-planos'] = { nivel: 5 };
    nar6.pistas = []; anterior.pistas.push({ id: 'n5-pista-planos', titulo: 'PLANOS', texto: 'despacho' });
    libreta.narrativas[5] = anterior;
    assert.equal(deduccion.disponible(), true);
    assert.equal(deduccion.responder('q', 'a', ['n3-pista-carta', 'n5-pista-planos']).estado, 'resuelto');
});

test('la ayuda "resuelta": solo vale después de resolver la deducción; antes, la que sigue', () => {
    const inv = nueva();
    let resuelta = false;
    const ayuda = new Ayuda(reglas().ayuda, inv, { deduccionResuelta: () => resuelta });
    const pasar = s => { let r; for (let t = 0; t < s; t += 1 / 60) r = ayuda.actualizar(1 / 60); return r; };
    assert.equal(pasar(46)?.efecto, 'carta');
    resuelta = true;
    ayuda.actualizar(1 / 60);
    assert.equal(ayuda.refuerzo.efecto, 'final');
    inv.recogio('p-carta');
    ayuda.actualizar(1 / 60);
    assert.equal(ayuda.refuerzo.efecto, 'final');
    ayuda.apagar();
    assert.equal(ayuda.actualizar(1 / 60), null);
});
