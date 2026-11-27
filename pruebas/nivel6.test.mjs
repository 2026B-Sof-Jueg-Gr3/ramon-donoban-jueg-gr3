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
const TODO_EL_REGISTRO = { 'n1-pista-huella': { nivel: 1 }, 'n2-pista-recibo': { nivel: 2 }, 'n2-pista-taza': { nivel: 2 }, 'n3-pista-carta': { nivel: 3 }, 'n3-pista-llave': { nivel: 3 }, 'n5-pista-planos': { nivel: 5 }, 'n5-pista-abrigo': { nivel: 5 } };
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
    assert.deepEqual(porNivel(1), ['n1-pista-huella']);
    assert.deepEqual(porNivel(2), ['n2-pista-recibo', 'n2-pista-taza']);
    assert.deepEqual(porNivel(3), ['n3-pista-carta', 'n3-pista-llave']);
    assert.deepEqual(porNivel(5).sort(), ['n5-pista-abrigo', 'n5-pista-planos']);
    assert.deepEqual(porNivel(6).sort(), ['cuentas-que-no-cuadran', 'n6-pista-compradores', 'pluma-gv', 'siete-rechazos']);
    assert.equal(new Set(hallazgos.map(h => h.id)).size, hallazgos.length, 'ninguno repetido');
    for (const h of hallazgos.filter(x => x.tipo === 'pista')) assert.ok(h.nombre && h.texto, `${h.id} con título y texto`);
    // los niveles 1 y 2 y los niveles que no tienen pistas no meten nada raro
    assert.ok(hallazgos.every(h => [1, 2, 3, 5, 6].includes(h.nivel)));
});

test('las pruebas del Registro aparecen en el expediente con los nombres que ya conocen (el recibo, la carta, los planos)', () => {
    const { libreta } = partida({ 'n2-pista-recibo': { nivel: 2 }, 'n3-pista-carta': { nivel: 3 }, 'n5-pista-planos': { nivel: 5 } });
    const nombres = libreta.hallazgos().map(h => h.nombre);
    assert.deepEqual(nombres, ['RECIBO DE FERRETERÍA', 'CARTA SIN ENVIAR', 'PLANOS DE LA MANSIÓN']);
    // pero lo que NO está en el Registro no está
    assert.deepEqual(partida({}).libreta.hallazgos(), []);
});

test('DEDUCCIÓN: ¿Quién está detrás? → Voss, con la pluma «G. V.» y el recibo de ferretería; nada más vale', () => {
    const t = () => partida(TODO_EL_REGISTRO, 'marcas', 'archivos', 'ordenar', 'pluma', 'archivador', 'reloj', 'libros', 'cartas').deduccion;
    assert.equal(t().disponible(), true);
    assert.deepEqual(t().responder('detras', 'voss', ['pluma-gv', 'n2-pista-recibo']), { estado: 'correcta' });
    for (const sola of ['pluma-gv', 'n2-pista-recibo']) assert.deepEqual(t().responder('detras', 'voss', [sola]), { estado: 'error', motivo: 'pruebas' }, sola);
    for (const ajena of ['cuentas-que-no-cuadran', 'siete-rechazos', 'archivador-forzado', 'reloj-detenido', 'n3-pista-carta', 'n5-pista-planos', 'n2-pista-taza', 'n1-pista-huella']) {
        assert.deepEqual(t().responder('detras', 'voss', ['pluma-gv', ajena]).estado, 'error', `pluma + ${ajena}`);
    }
    for (const mala of ['complice', 'maldicion']) assert.deepEqual(t().responder('detras', mala, ['pluma-gv', 'n2-pista-recibo']), { estado: 'error', motivo: 'conclusion' }, mala);
    // los libros no son prueba: ni siquiera están entre las pruebas de la libreta
    assert.ok(!t().libreta.idsEncontrados().includes('n6-mueble-libros'));
});

test('DEDUCCIÓN: ¿Por qué espantaba a los compradores? → buscar el tesoro, con la carta sin enviar y los planos; nada más vale', () => {
    const t = () => partida(TODO_EL_REGISTRO, 'marcas', 'archivos', 'ordenar', 'pluma', 'archivador', 'reloj', 'cartas').deduccion;
    const d = t();
    assert.deepEqual(d.responder('detras', 'voss', ['pluma-gv', 'n2-pista-recibo']), { estado: 'correcta' });
    assert.deepEqual(d.responder('espantaba', 'buscar-tesoro', ['n3-pista-carta', 'n5-pista-planos']), { estado: 'resuelto' });
    for (const sola of ['n3-pista-carta', 'n5-pista-planos']) assert.deepEqual(t().responder('espantaba', 'buscar-tesoro', [sola]), { estado: 'error', motivo: 'pruebas' }, sola);
    for (const ajena of ['siete-rechazos', 'cuentas-que-no-cuadran', 'pluma-gv', 'n2-pista-recibo']) assert.equal(t().responder('espantaba', 'buscar-tesoro', ['n3-pista-carta', ajena]).estado, 'error', ajena);
    for (const mala of ['memoria', 'creia']) assert.deepEqual(t().responder('espantaba', mala, ['n3-pista-carta', 'n5-pista-planos']), { estado: 'error', motivo: 'conclusion' }, mala);
});

test('si falta una pista de un nivel anterior, la pregunta que la necesita no se puede resolver (y la deducción no se ofrece)', () => {
    const sin = id => { const r = { ...TODO_EL_REGISTRO }; delete r[id]; return partida(r, 'marcas', 'archivos', 'ordenar', 'pluma', 'archivador', 'reloj', 'cartas'); };
    for (const [falta, pregunta] of [['n2-pista-recibo', 'detras'], ['n3-pista-carta', 'espantaba'], ['n5-pista-planos', 'espantaba']]) {
        const { deduccion } = sin(falta);
        assert.equal(deduccion.disponible(), false, `sin ${falta} no se puede resolver «${pregunta}»`);
        assert.equal(deduccion.responder(pregunta, deduccion.pregunta(pregunta).correcta, deduccion.pregunta(pregunta).validas[0]).estado, 'invalida', 'ni forzándolo');
    }
    // y sin la pluma tampoco, aunque el Registro esté completo
    assert.equal(partida(TODO_EL_REGISTRO, 'marcas', 'archivos', 'ordenar', 'archivador', 'cartas').deduccion.disponible(), false);
});

test('el cierre: al resolver sale la pista del compartimento, retenida para DESPUÉS del texto del cierre, y no entra en la deducción', () => {
    const { inv } = partida(TODO_EL_REGISTRO, 'pluma');
    const eventos = inv.resolvio();
    assert.deepEqual(clases(eventos), ['pista:n6-pista-compartimento:secundaria']);
    assert.equal(eventos[0].despuesDelCierre, true, 'la escena la retiene hasta que termine el cierre');
    assert.equal(eventos[0].titulo, 'COMPARTIMENTO BAJO EL RELOJ');
    assert.equal(eventos[0].referencia, 'pistas:n6-pista-compartimento', 'y por eso queda en el Registro');
    assert.ok(!(('n6-pista-compartimento') in reglas.deduccion.pruebas));
    for (const q of reglas.deduccion.preguntas) assert.ok(!q.validas.flat().includes('n6-pista-compartimento'));
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

test('los hallazgos extra del nivel 6 salen de los datos: reloj, libros, archivador, cartas (la pluma está en la respuesta; el compartimento es del final)', () => {
    const { libreta } = partida(TODO_EL_REGISTRO, 'reloj', 'pluma');
    const r = libreta.resumen();
    assert.equal(r.totalDeExtras, 4);
    assert.equal(r.extras, 1);
    assert.equal(r.pilas, false);
    S.pilas(libreta.investigacion);
    assert.equal(libreta.resumen().pilas, true);
});
