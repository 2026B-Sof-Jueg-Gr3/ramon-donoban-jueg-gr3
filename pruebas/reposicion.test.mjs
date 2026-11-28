// El nivel 6 no puede quedar sin salida: si una habitación está completada y su pista para el final no está en el Registro, se repone.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pistasQueReponer } from '../src/motor/Reposicion.js';
import Registro from '../src/ui/Registro.js';
import Investigacion from '../src/motor/Investigacion.js';
import Libreta from '../src/motor/Libreta.js';
import Deduccion from '../src/motor/Deduccion.js';
import { leerJson } from './ayudasDeMapa.mjs';

const narrativa = leerJson('assets/narrativa/nivel6.json');
const reglas = leerJson('assets/investigaciones/nivel6.json');
const narrativas = Object.fromEntries([1, 2, 3, 4, 5, 6].map(n => [n, leerJson(`assets/narrativa/nivel${n}.json`)]));
const pruebas = reglas.deduccion.pruebas;
const reponer = (completados, registradas) => pistasQueReponer({ pruebas, narrativas, completados, registradas });

// Un localStorage en memoria para probar contra el Registro de verdad
function conAlmacen(registroInicial, hacer) {
    const datos = new Map([['inspector-logica-v2-expediente', JSON.stringify({ pistas: registroInicial })]]);
    const antes = globalThis.localStorage;
    globalThis.localStorage = { getItem: k => datos.get(k) ?? null, setItem: (k, v) => datos.set(k, String(v)) };
    try { return hacer(); } finally { globalThis.localStorage = antes; }
}
const aplicar = completados => reponer(completados, Registro.leer().pistas).filter(({ id, nivel }) => Registro.registrarPista(id, nivel));

test('falta el recorte y el nivel 1 está completado → se repone, anotado en la habitación 1', () => {
    assert.deepEqual(reponer([1, 2], { 'n3-pista-carta': { nivel: 3 }, 'n5-pista-planos': { nivel: 5 } }), [{ id: 'n1-pista-periodico', nivel: 1 }]);
});

test('una habitación sin completar no repone nada; el recibo y el abrigo (opcionales) nunca se reponen', () => {
    assert.deepEqual(reponer([], {}), []);
    assert.deepEqual(reponer([2, 3, 5], {}), [{ id: 'n3-pista-carta', nivel: 3 }, { id: 'n5-pista-planos', nivel: 5 }], 'ni el recibo ni el abrigo');
    assert.deepEqual(reponer([1, 4], {}), [{ id: 'n1-pista-periodico', nivel: 1 }, { id: 'n4-pista-diario', nivel: 4 }]);
});

test('reponer no duplica nada: lo que ya está no se toca y una segunda entrada no cambia el Registro', () => {
    const original = { 'n1-pista-periodico': { nivel: 1, descubierta: 'antes' }, 'n1-pista-huella': { nivel: 1, descubierta: 'antes' } };
    conAlmacen(original, () => {
        assert.deepEqual(aplicar([1, 2, 3, 4, 5]).map(p => p.id), ['n3-pista-carta', 'n4-pista-diario', 'n5-pista-planos']);
        const despues = Registro.leer().pistas;
        assert.deepEqual(Object.keys(despues).sort(), ['n1-pista-huella', 'n1-pista-periodico', 'n3-pista-carta', 'n4-pista-diario', 'n5-pista-planos']);
        assert.equal(despues['n1-pista-periodico'].descubierta, 'antes', 'la que ya estaba no se reescribe');
        assert.deepEqual(aplicar([1, 2, 3, 4, 5]), [], 'la segunda vez no hay nada que reponer');
        assert.deepEqual(Registro.leer().pistas, despues);
    });
});

test('solo se reponen las pistas imprescindibles para terminar su habitación: el recorte, la carta, el diario y los planos', () => {
    assert.deepEqual(reponer([1, 2, 3, 4, 5], {}).map(p => p.id), ['n1-pista-periodico', 'n3-pista-carta', 'n4-pista-diario', 'n5-pista-planos']);
    const marcadas = Object.entries(pruebas).filter(([, p]) => p.reponer).map(([id]) => id);
    assert.deepEqual(marcadas, ['n1-pista-periodico', 'n3-pista-carta', 'n4-pista-diario', 'n5-pista-planos']);
    // Cada una es de verdad imprescindible en su habitación: obligatoria para deducir, o lo que abre la salida (los planos)
    for (const id of marcadas.filter(id => id !== 'n5-pista-planos')) {
        const n = Number(id.match(/^n(\d)/)[1]);
        assert.ok(leerJson(`assets/investigaciones/nivel${n}.json`).deduccion.obligatorias.includes(id), `${id} es obligatoria en el nivel ${n}`);
    }
});

test('con el Registro vacío y los cinco niveles completados, la deducción final se puede resolver tras reponer (sin el recibo ni el abrigo)', () => {
    conAlmacen({}, () => {
        aplicar([1, 2, 3, 4, 5]);
        const inv = new Investigacion(reglas, narrativa);
        inv.examino('n6-mueble-pluma');
        inv.recogio('n6-pista-compradores');          // los siete rechazos están en el despacho: siempre se pueden encontrar
        const libreta = new Libreta(reglas.deduccion, narrativa, inv, { nivel: 6, registro: () => Registro.leer().pistas, narrativas });
        const deduccion = new Deduccion(reglas.deduccion, libreta);
        assert.equal(deduccion.disponible(), true);
        assert.equal(deduccion.responder('detras', 'voss', ['siete-rechazos', 'n1-pista-periodico']).estado, 'correcta');
        assert.equal(deduccion.responder('espantaba', 'buscar-tesoro', ['n4-pista-diario', 'n3-pista-carta']).estado, 'resuelto');
    });
});
