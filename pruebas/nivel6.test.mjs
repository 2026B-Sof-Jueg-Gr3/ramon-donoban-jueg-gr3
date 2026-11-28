// Nivel 6, La Verdad Revelada: cada línea con su disparador, las dependencias (archivos: examinar → ordenar; el comentario del reloj y el suelo hueco),
// la pista antes de la revelación en las cartas, el EXPEDIENTE (las pruebas del despacho y las pistas del Registro agrupadas por habitación), las dos
// preguntas con UNA sola respuesta (la pluma y el recibo; la carta y los planos), qué pasa si falta una pista de un nivel anterior, el cierre con
// la pista del compartimento DESPUÉS y la ayuda en orden.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import Investigacion from '../src/motor/Investigacion.js';
import Libreta from '../src/motor/Libreta.js';
import Deduccion from '../src/motor/Deduccion.js';
import Ayuda from '../src/motor/Ayuda.js';
import { leerJson } from './ayudasDeMapa.mjs';

const narrativa = leerJson('assets/narrativa/nivel6.json');
const reglas = leerJson('assets/investigaciones/nivel6.json');
const narrativas = Object.fromEntries([1, 2, 3, 4, 5, 6].map(n => [n, leerJson(`assets/narrativa/nivel${n}.json`)]));
const nueva = () => new Investigacion(reglas, narrativa);
const clases = eventos => eventos.map(e => `${e.regla}:${e.clase}`);
const S = {
    marcas: inv => inv.ilumino('n6-marcas'), archivos: inv => inv.examino('archivos'), ordenar: inv => inv.ordeno('archivos'),
    hueco: inv => inv.piso('hueco'), reloj: inv => inv.examino('n6-mueble-reloj'), libros: inv => inv.examino('n6-mueble-libros'),
    archivador: inv => inv.examino('n6-mueble-archivador'), pluma: inv => inv.examino('n6-mueble-pluma'),
    cartas: inv => inv.recogio('n6-pista-compradores'), pilas: inv => inv.recogio('bateria')
};
// Lo que el Registro guardó en los niveles anteriores (id de pista → nivel)
const TODO_EL_REGISTRO = { 'n1-pista-huella': { nivel: 1 }, 'n1-pista-periodico': { nivel: 1 }, 'n4-pista-diario': { nivel: 4 }, 'n2-pista-recibo': { nivel: 2 }, 'n2-pista-taza': { nivel: 2 }, 'n3-pista-carta': { nivel: 3 }, 'n3-pista-llave': { nivel: 3 }, 'n5-pista-planos': { nivel: 5 }, 'n5-pista-abrigo': { nivel: 5 } };
const partida = (registro, ...pasos) => {
    const inv = nueva();
    for (const p of pasos) S[p](inv);
    const libreta = new Libreta(reglas.deduccion, narrativa, inv, { nivel: 6, registro: () => registro, narrativas });
    return { inv, libreta, deduccion: new Deduccion(reglas.deduccion, libreta, { azar: () => 0.5 }) };
};

test('intro; los archivos solo se examinan tras ver sus marcas con la luz; el suelo hueco y el reloj dan sus comentarios, en cualquier orden', () => {
    const inv = nueva();
    assert.deepEqual(clases(inv.entro()), ['intro:importante']);
    assert.deepEqual(clases(S.archivos(inv)), [], 'sin ver las marcas frescas no se examinan');
    S.marcas(inv);
    assert.deepEqual(clases(S.archivos(inv)), ['comentario:0:secundaria']);
    assert.deepEqual(clases(S.hueco(inv)), ['comentario:1:secundaria'], 'el suelo hueco solo, sin el reloj: no sale el 3');
    assert.deepEqual(clases(S.reloj(inv)).sort(), ['comentario:2:secundaria', 'mueble:n6-mueble-reloj:secundaria'], 'reloj + suelo hueco');
    const otro = nueva();            // al revés: primero el reloj, luego el suelo
    S.reloj(otro);
    assert.deepEqual(clases(S.hueco(otro)).sort(), ['comentario:1:secundaria', 'comentario:2:secundaria']);
    assert.deepEqual(clases(S.hueco(otro)), [], 'una sola vez');
});

test('ordenar los archivos exige haberlos examinado y da la revelación 0', () => {
    const inv = nueva();
    assert.equal(inv.puedeActuar('archivos', 'ordenar'), false);
    assert.deepEqual(S.ordenar(inv), []);
    S.marcas(inv); S.archivos(inv);
    assert.equal(inv.hayAlgoNuevo('archivos', 'ordenar'), true);
    const [e] = S.ordenar(inv);
    assert.deepEqual([e.regla, e.clase, e.texto], ['revelacion:0', 'importante', narrativa.revelaciones[0]]);
    assert.equal(inv.hayAlgoNuevo('archivos', 'ordenar'), false, 'ya ordenados: no aparece el E');
});

test('las cartas de compradores: primero sale la pista y después la revelación 1', () => {
    const eventos = S.cartas(nueva());
    assert.deepEqual(clases(eventos), ['pista:n6-pista-compradores:secundaria', 'revelacion:1:importante']);
    assert.equal(eventos[0].titulo, 'CARTAS DE COMPRADORES');
    assert.equal(eventos[1].texto, narrativa.revelaciones[1]);
});

test('los muebles (reloj, libros, archivador, pluma) y las pilas salen tal cual, secundarios', () => {
    const inv = nueva();
    for (const [paso, id] of [['libros', 'n6-mueble-libros'], ['archivador', 'n6-mueble-archivador'], ['pluma', 'n6-mueble-pluma']]) {
        const [e] = S[paso](inv);
        assert.equal(e.texto, narrativa.muebles.find(m => m.id === id).texto);
        assert.equal(e.clase, 'secundaria');
    }
    assert.equal(S.pilas(inv)[0].texto, narrativa.bateria);
});

test('EXPEDIENTE: lo encontrado en el despacho y las pistas del Registro, agrupadas por habitación (la del nivel 6 aparece sin repetir)', () => {
    assert.equal(reglas.deduccion.expediente, true);
    const { libreta } = partida(TODO_EL_REGISTRO, 'marcas', 'archivos', 'ordenar', 'pluma', 'cartas');
    const hallazgos = libreta.hallazgos();
    const porNivel = n => hallazgos.filter(h => h.nivel === n).map(h => h.id);
    assert.deepEqual(porNivel(1), ['n1-pista-periodico', 'n1-pista-huella']);
    assert.deepEqual(porNivel(2), ['n2-pista-recibo', 'n2-pista-taza']);
    assert.deepEqual(porNivel(3), ['n3-pista-carta', 'n3-pista-llave']);
    assert.deepEqual(porNivel(4), ['n4-pista-diario']);
    assert.deepEqual(porNivel(5).sort(), ['n5-pista-abrigo', 'n5-pista-planos']);
    assert.deepEqual(porNivel(6).sort(), ['cuentas-que-no-cuadran', 'n6-pista-compradores', 'pluma-gv', 'siete-rechazos']);
    assert.equal(new Set(hallazgos.map(h => h.id)).size, hallazgos.length, 'ninguno repetido');
    for (const h of hallazgos.filter(x => x.tipo === 'pista')) assert.ok(h.nombre && h.texto, `${h.id} con título y texto`);
    assert.ok(hallazgos.every(h => [1, 2, 3, 4, 5, 6].includes(h.nivel)));
});

test('las pruebas del Registro aparecen en el expediente con los nombres que ya conocen (el recibo, la carta, los planos)', () => {
    const { libreta } = partida({ 'n2-pista-recibo': { nivel: 2 }, 'n3-pista-carta': { nivel: 3 }, 'n5-pista-planos': { nivel: 5 } });
    const nombres = libreta.hallazgos().map(h => h.nombre);
    assert.deepEqual(nombres, ['RECIBO DE FERRETERÍA', 'CARTA SIN ENVIAR', 'PLANOS DE LA MANSIÓN']);
    // pero lo que NO está en el Registro no está
    assert.deepEqual(partida({}).libreta.hallazgos(), []);
});

// La tabla completa de cada selección posible está en pruebas/niveles.test.mjs (el oráculo). Aquí, los casos que se discutieron.
const OK = { estado: 'correcta' }, FALTA = { estado: 'error', motivo: 'insuficiente' };
const TODO6 = () => partida(TODO_EL_REGISTRO, 'marcas', 'archivos', 'ordenar', 'pluma', 'archivador', 'reloj', 'libros', 'cartas').deduccion;

test('DEDUCCIÓN: ¿Quién está detrás? → Voss: hay que probar que el albacea (o «V») está detrás Y que ese es Gerhard Voss', () => {
    const q = p => TODO6().responder('detras', 'voss', p);
    assert.equal(TODO6().disponible(), true);
    assert.deepEqual(q(['siete-rechazos', 'n1-pista-periodico']), OK, 'el albacea rechazó las ofertas «por los fantasmas», y el recorte dice que es Gerhard Voss');
    assert.deepEqual(q(['n2-pista-recibo', 'pluma-gv', 'n1-pista-periodico']), OK, 'la «V» del recibo, la pluma «G. V.» y el nombre del recorte');
    assert.deepEqual(q(['n5-pista-abrigo', 'pluma-gv', 'n1-pista-periodico']), OK, 'la «V» de la nota del cómplice, la pluma y el recorte');
    assert.deepEqual(q(['siete-rechazos', 'pluma-gv', 'n1-pista-periodico']), OK);
    assert.deepEqual(q(['n6-pista-compradores', 'n1-pista-periodico']), OK, 'la pista de las cartas dice lo mismo que «Siete rechazos»');
    for (const falta of [['pluma-gv', 'n1-pista-periodico'], ['pluma-gv', 'n2-pista-recibo'], ['siete-rechazos'], ['pluma-gv'], ['n5-pista-abrigo', 'n1-pista-periodico'], ['siete-rechazos', 'pluma-gv'], ['cuentas-que-no-cuadran', 'n1-pista-periodico']]) {
        assert.deepEqual(q(falta), FALTA, falta.join(' + '));
    }
    for (const ajena of ['archivador-forzado', 'reloj-detenido', 'n3-pista-carta', 'n5-pista-planos', 'n4-pista-diario', 'n2-pista-taza', 'n1-pista-huella']) {
        assert.deepEqual(q(['siete-rechazos', 'n1-pista-periodico', ajena]).motivo, 'ajena', ajena);
    }
    for (const mala of ['complice', 'maldicion']) assert.deepEqual(TODO6().responder('detras', mala, ['siete-rechazos', 'n1-pista-periodico']), { estado: 'error', motivo: 'conclusion' }, mala);
    assert.deepEqual(q(['siete-rechazos', 'n1-pista-periodico', 'pluma-gv', 'n2-pista-recibo']), { estado: 'invalida', motivo: 'demasiadas' }, 'como máximo 3 pruebas');
    // los libros no son prueba: ni siquiera están entre las pruebas de la libreta
    assert.ok(!TODO6().libreta.idsEncontrados().includes('n6-mueble-libros'));
});

test('DEDUCCIÓN: ¿Por qué espantaba a los compradores? → el diario (hay un tesoro) con la carta o los siete rechazos (espantaba compradores)', () => {
    const d = TODO6();
    assert.deepEqual(d.responder('detras', 'voss', ['siete-rechazos', 'n1-pista-periodico']), OK);
    assert.deepEqual(d.responder('espantaba', 'buscar-tesoro', ['n4-pista-diario', 'n3-pista-carta']), { estado: 'resuelto' });
    const q = p => TODO6().responder('espantaba', 'buscar-tesoro', p);
    assert.deepEqual(q(['n4-pista-diario', 'siete-rechazos']), OK);
    assert.deepEqual(q(['n4-pista-diario', 'n6-pista-compradores']), OK);
    assert.deepEqual(q(['n4-pista-diario', 'n5-pista-planos', 'n3-pista-carta']), OK, 'los planos al lado no estorban');
    for (const falta of [['n3-pista-carta', 'n5-pista-planos'], ['n5-pista-planos', 'reloj-detenido'], ['n4-pista-diario'], ['n3-pista-carta'], ['siete-rechazos', 'archivador-forzado'], ['n4-pista-diario', 'n5-pista-planos']]) {
        assert.deepEqual(q(falta), FALTA, `${falta.join(' + ')}: los planos y el reloj dicen dónde buscar, no que haya un tesoro`);
    }
    for (const ajena of ['cuentas-que-no-cuadran', 'pluma-gv', 'n2-pista-recibo', 'n1-pista-periodico']) assert.equal(q(['n4-pista-diario', 'n3-pista-carta', ajena]).motivo, 'ajena', ajena);
    for (const mala of ['memoria', 'creia']) assert.deepEqual(TODO6().responder('espantaba', mala, ['n4-pista-diario', 'n3-pista-carta']), { estado: 'error', motivo: 'conclusion' }, mala);
});

test('si falta una pista de un nivel anterior: sin el recorte o sin el diario no hay salida (por eso son obligatorios); sin el recibo, el abrigo o la carta, sí', () => {
    const sin = (...ids) => { const r = { ...TODO_EL_REGISTRO }; for (const id of ids) delete r[id]; return partida(r, 'marcas', 'archivos', 'ordenar', 'pluma', 'archivador', 'reloj', 'cartas'); };
    for (const [falta, pregunta] of [['n1-pista-periodico', 'detras'], ['n4-pista-diario', 'espantaba']]) {
        const { deduccion } = sin(falta);
        assert.equal(deduccion.disponible(), false, `sin ${falta} no se puede resolver «${pregunta}»`);
        assert.equal(deduccion.responder(pregunta, deduccion.pregunta(pregunta).correcta, [falta]).motivo, 'no-encontradas', 'ni forzándolo');
    }
    for (const falta of [['n2-pista-recibo'], ['n5-pista-abrigo'], ['n2-pista-recibo', 'n5-pista-abrigo'], ['n3-pista-carta'], ['n5-pista-planos']]) {
        assert.equal(sin(...falta).deduccion.disponible(), true, `sin ${falta.join(' ni ')} sigue habiendo un camino`);
    }
    // Sin las cartas de compradores (los siete rechazos) hace falta la pluma con el recibo o el abrigo
    assert.equal(partida(TODO_EL_REGISTRO, 'marcas', 'archivos', 'ordenar', 'pluma').deduccion.disponible(), true);
    assert.equal(partida(TODO_EL_REGISTRO, 'marcas', 'archivos', 'ordenar', 'archivador').deduccion.disponible(), false, 'ni los rechazos ni la pluma');
});

test('el cierre: al resolver sale la pista del compartimento, retenida para DESPUÉS del texto del cierre, y no entra en la deducción', () => {
    const { inv } = partida(TODO_EL_REGISTRO, 'pluma');
    const eventos = inv.resolvio();
    assert.deepEqual(clases(eventos), ['pista:n6-pista-compartimento:secundaria']);
    assert.equal(eventos[0].despuesDelCierre, true, 'la escena la retiene hasta que termine el cierre');
    assert.equal(eventos[0].titulo, 'COMPARTIMENTO BAJO EL RELOJ');
    assert.equal(eventos[0].referencia, 'pistas:n6-pista-compartimento', 'y por eso queda en el Registro');
    assert.ok(!(('n6-pista-compartimento') in reglas.deduccion.pruebas));
    for (const q of reglas.deduccion.preguntas) assert.ok(!('n6-pista-compartimento' in q.aportan));
    assert.match(narrativa.cierre, /bajo el reloj detenido/);
});

test('no hay acción final: al resolver el caso, el nivel se cierra solo', () => {
    assert.equal(reglas.final, undefined);
});

test('la ayuda del nivel 6, en orden: libreta, marcas de los archivos, onda del suelo hueco, cartas', () => {
    assert.deepEqual(reglas.ayuda.refuerzos.map(r => r.efecto), ['libreta', 'marcas', 'onda', 'cartas']);
    const inv = nueva();
    const estado = { disponible: false };
    const ayuda = new Ayuda(reglas.ayuda, inv, { deduccionDisponible: () => estado.disponible });
    const pasar = s => { let r; for (let t = 0; t < s; t += 1 / 60) r = ayuda.actualizar(1 / 60); return r; };
    assert.equal(pasar(44), null);
    assert.equal(pasar(1.2)?.efecto, 'marcas', '2. hasta ordenar los archivos, las marcas brillan');
    S.marcas(inv); S.archivos(inv); S.ordenar(inv); ayuda.alDescubrir();
    assert.equal(pasar(46)?.efecto, 'onda', '3. hasta pisar el suelo hueco, la onda se ve más fuerte');
    S.hueco(inv); ayuda.alDescubrir();
    assert.equal(pasar(46)?.efecto, 'cartas', '4. hasta recoger las cartas, se agitan');
    S.cartas(inv); ayuda.alDescubrir();
    assert.equal(pasar(100), null);
    estado.disponible = true;
    assert.equal(pasar(46)?.efecto, 'libreta', '1. con la deducción disponible, la libreta primero');
    ayuda.apagar();
    assert.equal(pasar(100), null);
});

test('los hallazgos extra del nivel 6 salen de los datos: reloj, libros y archivador (la pluma y las cartas están en respuestas; el compartimento es del final)', () => {
    const { libreta } = partida(TODO_EL_REGISTRO, 'reloj', 'pluma');
    const r = libreta.resumen();
    assert.equal(r.totalDeExtras, 3);
    assert.equal(r.extras, 1);
    assert.equal(r.pilas, false);
    S.pilas(libreta.investigacion);
    assert.equal(libreta.resumen().pilas, true);
});

// ── La conexión de la «V»: al acertar la primera pregunta, con el abrigo del nivel 5 en el expediente ──

const clasesDeCodigo = new Proxy({}, { get: (t, k) => (t[k] ??= class { }) });
globalThis.Phaser ??= {
    Scene: class { }, GameObjects: clasesDeCodigo, Physics: { Arcade: clasesDeCodigo }, BlendModes: { ADD: 1 }, Math: {},
    Display: { Color: { HexStringToColor: () => ({ color: 0 }) } }, Geom: { Rectangle: Object.assign(class { }, { Contains: () => true }) }, Input: { Keyboard: {} }
};
const { default: Habitacion } = await import('../src/escenas/Habitacion.js');
const { default: Cuaderno } = await import('../src/presentacion/Cuaderno.js');

const conAbrigo = () => { const inv = nueva(); inv.enRegistro('n5-pista-abrigo'); S.pluma(inv); return inv; };       // con la pluma ya examinada

test('la conexión de la «V» sale al acertar "detras" con el abrigo en el Registro y la pluma examinada, como importante, pensativo y con su texto exacto', () => {
    const inv = conAbrigo();
    const eventos = inv.acerto('detras');
    assert.deepEqual(clases(eventos), ['momento:conexion-v:importante']);
    assert.equal(eventos[0].texto, 'El cómplice no habló. No hizo falta: la «V» de su nota es la misma que firma esta pluma.');
    assert.equal(eventos[0].texto, narrativa.momentos['conexion-v']);
    assert.equal(leerJson('assets/presentacion/expresiones.json').niveles['6']['momento:conexion-v'], 'pensativo', 'la expresión aprobada');
});

test('no sale sin el abrigo, ni al acertar "espantaba", ni dos veces, ni solo por tener el abrigo', () => {
    assert.deepEqual(nueva().acerto('detras'), []);
    const sinAbrigo = nueva();
    for (const id of Object.keys(TODO_EL_REGISTRO)) if (id !== 'n5-pista-abrigo') sinAbrigo.enRegistro(id);
    assert.deepEqual(sinAbrigo.acerto('detras'), []);
    const inv = nueva();
    S.pluma(inv);
    assert.deepEqual(inv.enRegistro('n5-pista-abrigo'), [], 'tenerlo no cuenta nada al entrar');
    assert.deepEqual(inv.acerto('espantaba'), []);
    assert.equal(inv.acerto('detras').length, 1);
    assert.deepEqual(inv.acerto('detras'), []);
    assert.deepEqual(inv.enRegistro('n5-pista-abrigo'), []);
});

test('la deducción del despacho: hasta 3 pruebas, las mismas preguntas y conclusiones; el abrigo, el recorte y el diario del Registro también son pruebas', () => {
    assert.equal(reglas.deduccion.maximoDePruebas, 3);
    assert.deepEqual(reglas.deduccion.preguntas.map(q => [q.id, q.correcta]), [['detras', 'voss'], ['espantaba', 'buscar-tesoro']]);
    for (const id of ['n1-pista-periodico', 'n4-pista-diario', 'n5-pista-abrigo']) assert.equal(reglas.deduccion.pruebas[id]?.registro, true, id);
});

// Una respuesta correcta de cada pregunta (las demás, en pruebas/niveles.test.mjs)
const RESPUESTA = { detras: ['siete-rechazos', 'n1-pista-periodico'], espantaba: ['n4-pista-diario', 'n3-pista-carta'] };

// La libreta y la escena, con su código: qué pasa al presentar las pruebas
function presentando({ abrigo, pregunta = 'detras', conclusion, pruebas }) {
    const { inv, deduccion } = partida(TODO_EL_REGISTRO, 'marcas', 'archivos', 'ordenar', 'pluma', 'cartas');
    if (abrigo) inv.enRegistro('n5-pista-abrigo');
    if (pregunta === 'espantaba') deduccion.responder('detras', 'voss', RESPUESTA.detras);
    const q = deduccion.pregunta(pregunta);
    const pasos = [];
    const escena = Object.create(Habitacion.prototype);
    const cuaderno = Object.create(Cuaderno.prototype);
    Object.assign(escena, {
        investigacion: inv, cuaderno, despuesDelTexto: null,
        reanudarDeLaLibreta: reiniciar => pasos.push(`reanuda:${reiniciar}`), pausarPorLaLibreta: () => pasos.push('pausa'),
        contar: eventos => pasos.push(`cuenta:${eventos.map(e => e.regla)}`)
    });
    Object.assign(cuaderno, {
        deduccion, seleccion: { conclusion: conclusion ?? q.correcta, pruebas: pruebas ?? [...RESPUESTA[pregunta]] }, modo: 'pruebas',
        cerrar: () => pasos.push('cierra'), abrirPregunta: () => pasos.push('pregunta'), alError: () => pasos.push('error'),
        alResolver: () => pasos.push('resuelto'), alAcertar: id => escena.alAcertar(id)
    });
    cuaderno.presentar();
    return { pasos, escena };
}

test('con el abrigo, la libreta se cierra para mostrar la línea y al terminarla vuelve a la segunda pregunta', () => {
    const { pasos, escena } = presentando({ abrigo: true });
    assert.deepEqual(pasos, ['reanuda:false', 'cuenta:momento:conexion-v', 'cierra']);
    escena.alReanudar();
    assert.deepEqual(pasos.slice(3), ['pausa', 'pregunta']);
});

test('sin el abrigo, pasa directo a la siguiente pregunta sin cerrar la libreta', () => {
    const { pasos, escena } = presentando({ abrigo: false });
    assert.deepEqual(pasos, ['pregunta']);
    assert.equal(escena.despuesDelTexto, null);
});

test('un error en la primera pregunta no la dispara (y funciona como antes); la segunda tampoco la cuenta', () => {
    const mala = presentando({ abrigo: true, conclusion: 'complice' });
    assert.deepEqual(mala.pasos, ['cierra', 'error']);
    assert.equal(mala.escena.investigacion.yaSalio('momento:conexion-v'), false);
    const ajena = presentando({ abrigo: true, pruebas: ['pluma-gv'] });
    assert.deepEqual(ajena.pasos, ['cierra', 'error']);
    const segunda = presentando({ abrigo: true, pregunta: 'espantaba' });
    assert.deepEqual(segunda.pasos, ['cierra', 'resuelto']);
    assert.equal(segunda.escena.investigacion.yaSalio('momento:conexion-v'), false);
});

test('los hallazgos extra de los seis niveles: lo que ninguna respuesta mínima necesita; las líneas "momentos" no cuentan', () => {
    const totales = [2, 1, 2, 2, 4, 3];
    for (const n of [1, 2, 3, 4, 5, 6]) {
        const r = leerJson(`assets/investigaciones/nivel${n}.json`);
        const inv = new Investigacion(r, narrativas[n]);
        const definicion = r.deduccion ?? { pruebas: r.libreta?.pruebas ?? {}, preguntas: [], pilas: r.libreta?.pilas };
        const libreta = new Libreta(definicion, narrativas[n], inv, { nivel: n });
        assert.equal(libreta.resumen().totalDeExtras, totales[n - 1], `nivel ${n}`);
        inv.enRegistro('n5-pista-abrigo'); inv.acerto('detras'); inv.ilumino('sombra');
        assert.deepEqual([libreta.resumen().extras, libreta.resumen().totalDeExtras], [0, totales[n - 1]], `nivel ${n}`);
    }
});

// ── La línea de "insuficiente": las pruebas iban bien, pero les faltaba una pieza ──

test('al equivocarse, Silas dice "insuficiente" si solo faltaba una pieza, y la línea de error en los demás casos', () => {
    const contado = [];
    const escena = Object.create(Habitacion.prototype);
    Object.assign(escena, {
        narrativa, numeroDeErrores: 0, reanudarDeLaLibreta: () => { }, narracion: { contar: m => contado.push(m) }
    });
    escena.alEquivocarse({ estado: 'error', motivo: 'insuficiente' });
    escena.alEquivocarse({ estado: 'error', motivo: 'ajena' });
    escena.alEquivocarse({ estado: 'error', motivo: 'conclusion' });
    escena.alEquivocarse();
    assert.deepEqual(contado.map(m => [m.ref, m.texto]), [
        ['insuficiente', 'Voy bien, pero me falta una pieza.'], ['error', narrativa.error], ['error', narrativa.error], ['error', narrativa.error]
    ]);
    assert.equal(new Set(contado.map(m => m.acontecimiento)).size, 4, 'cada intento es un acontecimiento distinto: siempre sale');
    for (const n of [1, 2, 3, 4, 6]) assert.equal(narrativas[n].insuficiente, 'Voy bien, pero me falta una pieza.', `nivel ${n}`);
});

// ── La pluma «G. V.»: examinarla es obligatorio para responder (no hace falta presentarla como prueba) ──

test('sin examinar la pluma no se puede responder: la deducción no se ofrece, aunque todo lo demás esté', () => {
    assert.deepEqual(reglas.deduccion.obligatorias, ['pluma-gv']);
    const sinPluma = partida(TODO_EL_REGISTRO, 'marcas', 'archivos', 'ordenar', 'archivador', 'reloj', 'cartas');
    assert.equal(sinPluma.libreta.obligatoriasListas(), false);
    assert.equal(sinPluma.deduccion.disponible(), false, 'sin la pluma no aparece «Resolver el caso»');
    S.pluma(sinPluma.inv);
    assert.equal(sinPluma.libreta.obligatoriasListas(), true);
    assert.equal(sinPluma.deduccion.disponible(), true, 'examinada la pluma, ya se puede responder');
});

test('examinada la pluma, la pregunta 1 se resuelve con cualquier respuesta aprobada, presentando la pluma o no', () => {
    const respuestas = [['siete-rechazos', 'n1-pista-periodico'], ['n6-pista-compradores', 'n1-pista-periodico'], ['n5-pista-abrigo', 'pluma-gv', 'n1-pista-periodico'], ['n2-pista-recibo', 'pluma-gv', 'n1-pista-periodico']];
    for (const pruebas of respuestas) {
        const { deduccion } = partida(TODO_EL_REGISTRO, 'pluma', 'cartas');
        assert.equal(deduccion.disponible(), true);
        assert.deepEqual(deduccion.responder('detras', 'voss', pruebas), { estado: 'correcta' }, pruebas.join(' + '));
    }
});

test('la frase de la «V» pide las tres cosas: acertar "detras", el abrigo en el Registro y la pluma examinada; sale una sola vez', () => {
    const conTodo = nueva(); conTodo.enRegistro('n5-pista-abrigo'); S.pluma(conTodo);
    assert.deepEqual(clases(conTodo.acerto('detras')), ['momento:conexion-v:importante']);
    assert.deepEqual(conTodo.acerto('detras'), [], 'ni reabriendo la libreta ni volviendo a acertar');
    const sinAbrigo = nueva(); S.pluma(sinAbrigo);
    assert.deepEqual(sinAbrigo.acerto('detras'), [], 'sin el abrigo no sale');
    const sinPluma = nueva(); sinPluma.enRegistro('n5-pista-abrigo');
    assert.deepEqual(sinPluma.acerto('detras'), [], 'sin la pluma examinada no sale');
    const sinAcertar = nueva(); sinAcertar.enRegistro('n5-pista-abrigo');
    assert.deepEqual(S.pluma(sinAcertar).map(e => e.regla), ['mueble:n6-mueble-pluma'], 'examinar la pluma sin haber acertado no la dispara');
    assert.deepEqual(sinAcertar.acerto('espantaba'), [], 'acertar la otra pregunta tampoco');
});
