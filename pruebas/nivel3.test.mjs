// Nivel 3, La Puerta con Candado: cada línea con su disparador, las dependencias, la carta obligatoria, la puerta con llave o ganzúas y la ayuda.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import Investigacion from '../src/motor/Investigacion.js';
import Libreta from '../src/motor/Libreta.js';
import Deduccion from '../src/motor/Deduccion.js';
import Ayuda from '../src/motor/Ayuda.js';
import { leerJson } from './ayudasDeMapa.mjs';

const narrativa = leerJson('assets/narrativa/nivel3.json');
const reglas = leerJson('assets/investigaciones/nivel3.json');
const nueva = () => new Investigacion(reglas, narrativa);
const S = {
    intactoYCamino: inv => [...inv.ilumino('n3-intacto'), ...inv.ilumino('n3-camino')],
    camino: inv => inv.ilumino('n3-camino'), intacto: inv => inv.ilumino('n3-intacto'),
    examinarCamino: inv => inv.examino('n3-camino'), cajas: inv => inv.examino('cajas'), debajo: inv => inv.miroDebajo('caja-puerta'),
    tablas: inv => inv.piso('tablas'), llavero: inv => inv.examino('n3-mueble-llavero'), tapiada: inv => inv.examino('n3-mueble-puerta'),
    herramientas: inv => inv.examino('n3-mueble-herramientas'), barril: inv => inv.examino('n3-mueble-barril'),
    carta: inv => inv.recogio('n3-pista-carta'), llave: inv => inv.recogio('n3-pista-llave'), pilas: inv => inv.recogio('bateria')
};
const partida = (...pasos) => { const inv = nueva(); for (const p of pasos) S[p](inv); const libreta = new Libreta(reglas.deduccion, narrativa, inv); return { inv, libreta, deduccion: new Deduccion(reglas.deduccion, libreta, { azar: () => 0.5 }) }; };
const clases = eventos => eventos.map(e => `${e.regla}:${e.clase}`);

test('intro: al entrar, importante', () => {
    assert.deepEqual(clases(nueva().entro()), ['intro:importante']);
    assert.equal(nueva().entro()[0].texto, narrativa.intro);
});

test('los comentarios: las cajas, el camino (solo tras descubrirlo con la luz) y las tablas que crujen', () => {
    const inv = nueva();
    assert.deepEqual(clases(S.examinarCamino(inv)), [], 'el camino no se examina sin haberlo iluminado');
    assert.deepEqual(clases(S.cajas(inv)), ['comentario:0:secundaria']);
    S.camino(inv);
    assert.deepEqual(clases(S.examinarCamino(inv)), ['comentario:1:secundaria']);
    assert.deepEqual(clases(S.tablas(inv)), ['comentario:2:secundaria']);
    assert.deepEqual(clases(S.tablas(inv)), [], 'una sola vez');
});

test('revelación 0: iluminar la zona intacta Y el camino limpio, en cualquier orden; sale una sola vez', () => {
    const a = nueva();
    assert.deepEqual(clases(S.intacto(a)), []);
    assert.deepEqual(clases(S.camino(a)), ['revelacion:0:importante']);
    const b = nueva();
    assert.deepEqual(clases(S.camino(b)), []);
    assert.deepEqual(clases(S.intacto(b)), ['revelacion:0:importante']);
    assert.deepEqual(clases(S.intacto(b)), []);
    assert.equal(a.historial.filter(h => h.regla === 'revelacion:0').length, 1);
});

test('revelación 1: mirar debajo de la caja junto a la puerta; antes hay que examinar las cajas', () => {
    const inv = nueva();
    assert.equal(inv.puedeActuar('caja-puerta', 'mirar-debajo'), false);
    assert.deepEqual(S.debajo(inv), [], 'si se intenta antes, nada');
    S.cajas(inv);
    assert.equal(inv.hayAlgoNuevo('caja-puerta', 'mirar-debajo'), true);
    assert.deepEqual(clases(S.debajo(inv)), ['revelacion:1:importante']);
    assert.equal(inv.hayAlgoNuevo('caja-puerta', 'mirar-debajo'), false, 'ya mirado: el ícono E no aparece');
});

test('los muebles, las pistas y las pilas: cada uno con su texto, secundarios', () => {
    const inv = nueva();
    for (const [paso, id] of [['llavero', 'n3-mueble-llavero'], ['tapiada', 'n3-mueble-puerta'], ['herramientas', 'n3-mueble-herramientas'], ['barril', 'n3-mueble-barril']]) {
        const [e] = S[paso](inv);
        assert.equal(e.texto, narrativa.muebles.find(m => m.id === id).texto);
        assert.equal(e.clase, 'secundaria');
    }
    const [carta] = S.carta(inv);
    assert.equal(carta.texto, narrativa.pistas.find(p => p.id === 'n3-pista-carta').texto);
    assert.equal(carta.titulo, 'CARTA SIN ENVIAR');
    assert.equal(S.pilas(inv)[0].texto, narrativa.bateria);
    // Los muebles "borrador" también salen tal cual
    assert.ok(narrativa.muebles.filter(m => m.borrador).length === 2);
});

test('la deducción: hace falta saber que alguien entra seguido Y que no quiere visitas, y no se ofrece hasta recoger la CARTA SIN ENVIAR', () => {
    const { deduccion, libreta } = partida('intactoYCamino', 'cajas', 'debajo');
    assert.equal(libreta.obligatoriasListas(), false);
    assert.equal(deduccion.disponible(), false, 'sin la carta no hay deducción');
    S.carta(deduccion.libreta.investigacion);
    assert.equal(deduccion.disponible(), true, 'el camino (o las huellas) con la carta');
    assert.deepEqual(deduccion.responder('candado', 'entra-a-diario', ['camino-sin-polvo', 'n3-pista-carta']), { estado: 'resuelto' });
    assert.equal(partida('carta').deduccion.disponible(), false, 'la carta sola no basta: nada dice que alguien entra seguido');
    assert.equal(partida('llave', 'carta').deduccion.disponible(), true, 'la llave de copia con la carta');
});

test('las dos partes: una prueba de que alguien entra seguido y otra de que no quiere visitas; una parte sola es insuficiente', () => {
    const t = () => partida('intactoYCamino', 'cajas', 'debajo', 'carta', 'llave', 'llavero', 'tapiada', 'herramientas', 'barril').deduccion;
    const USO = ['camino-sin-polvo', 'huellas-recientes', 'n3-pista-llave', 'aceite-para-bisagras'], VISITAS = ['n3-pista-carta', 'puerta-tapiada'];
    for (const uso of USO) for (const visitas of VISITAS) assert.deepEqual(t().responder('candado', 'entra-a-diario', [uso, visitas]), { estado: 'resuelto' }, `${uso} + ${visitas}`);
    for (const uso of USO) assert.deepEqual(t().responder('candado', 'entra-a-diario', [uso]), { estado: 'error', motivo: 'insuficiente' }, uso);
    assert.deepEqual(t().responder('candado', 'entra-a-diario', ['camino-sin-polvo', 'huellas-recientes']), { estado: 'error', motivo: 'insuficiente' }, 'dos de uso: falta por qué no quiere visitas');
    assert.deepEqual(t().responder('candado', 'entra-a-diario', ['n3-pista-carta', 'puerta-tapiada']), { estado: 'error', motivo: 'insuficiente' }, 'dos de visitas: falta que alguien entra');
    for (const parcial of ['llavero-vacio', 'herramientas-de-cerrajero']) {
        assert.deepEqual(t().responder('candado', 'entra-a-diario', [parcial]), { estado: 'error', motivo: 'insuficiente' }, parcial);
        assert.deepEqual(t().responder('candado', 'entra-a-diario', [parcial, 'n3-pista-carta']), { estado: 'error', motivo: 'insuficiente' }, `${parcial} + carta`);
    }
    for (const mala of ['nadie-en-anos', 'sellaron-algo']) assert.deepEqual(t().responder('candado', mala, ['camino-sin-polvo', 'n3-pista-carta']), { estado: 'error', motivo: 'conclusion' }, mala);
});

test('la acción final: la puerta se abre con la llave O con las ganzúas, solo tras resolver; sin ellas no', () => {
    const intento = (...pasos) => { const { inv } = partida(...pasos.filter(p => p !== 'resolver')); if (pasos.includes('resolver')) inv.resolvio(); return inv.puedeActuar('puerta-candado', 'abrir'); };
    assert.equal(intento('llave'), false, 'antes de resolver, ni con la llave');
    assert.equal(intento('resolver'), false, 'resuelta, pero sin llave ni ganzúas');
    assert.equal(intento('resolver', 'llave'), true);
    assert.equal(intento('resolver', 'herramientas'), true, 'las ganzúas: examinar la caja de herramientas');
    assert.equal(intento('resolver', 'barril', 'llavero', 'tapiada'), false, 'los demás muebles no abren');
});

test('el orden libre: dos recorridos distintos dan las mismas líneas, cada una una vez y la causa antes', () => {
    const a = partida('cajas', 'tablas', 'intacto', 'camino', 'examinarCamino', 'debajo', 'llavero', 'carta').inv;
    const b = partida('tablas', 'camino', 'examinarCamino', 'intacto', 'cajas', 'debajo', 'carta', 'llavero').inv;
    const unico = inv => [...new Set(inv.historial.map(h => h.regla))].sort();
    assert.deepEqual(unico(a), unico(b));
    assert.equal(a.historial.length, unico(a).length);
    // ningún suceso trae una revelación antes que su causa
    for (const inv of [a, b]) for (const h of inv.historial) if (h.regla.startsWith('revelacion')) assert.ok(h.orden > 0);
});

test('los hallazgos extra del nivel 3: el llavero y las herramientas; la carta (para el final) no cuenta', () => {
    const { libreta } = partida('llavero', 'carta');
    assert.equal(libreta.resumen().totalDeExtras, 2, 'el llavero y las herramientas: orientan, pero ninguna respuesta mínima los necesita');
    assert.equal(libreta.resumen().extras, 1);
});

test('la ayuda del nivel 3: libreta, polvo, caja, carta y, tras deducir, la llave o las ganzúas', () => {
    assert.deepEqual(reglas.ayuda.refuerzos.map(r => r.efecto), ['libreta', 'polvo', 'caja', 'carta', 'final']);
    const inv = nueva();
    const estado = { disponible: false, resuelta: false };
    const ayuda = new Ayuda(reglas.ayuda, inv, { deduccionDisponible: () => estado.disponible, deduccionResuelta: () => estado.resuelta });
    const pasar = s => { let r; for (let t = 0; t < s; t += 1 / 60) r = ayuda.actualizar(1 / 60); return r; };
    assert.equal(pasar(44), null);
    assert.equal(pasar(1.2)?.efecto, 'polvo', '1. hasta la revelación 0, el polvo deriva por el camino');
    S.intactoYCamino(inv); ayuda.alDescubrir();
    assert.equal(pasar(46)?.efecto, 'caja', '2. hasta la revelación 1, la caja brilla');
    S.cajas(inv); S.debajo(inv); ayuda.alDescubrir();
    assert.equal(pasar(46)?.efecto, 'carta', '3. hasta recoger la carta, se agita');
    S.carta(inv); ayuda.alDescubrir();
    assert.equal(pasar(100), null, 'sin nada que reforzar');
    estado.disponible = true;
    assert.equal(pasar(46)?.efecto, 'libreta', 'con la deducción disponible, la libreta primero');
    estado.disponible = false; estado.resuelta = true;
    assert.equal(pasar(1)?.efecto, 'final', 'tras deducir, brillan la llave o la caja de herramientas');
    ayuda.apagar();
    assert.equal(ayuda.actualizar(1 / 60), null);
});
