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

test('falta el recibo y el nivel 2 está completado → se repone, anotado en la habitación 2', () => {
    assert.deepEqual(reponer([1, 2], { 'n3-pista-carta': { nivel: 3 }, 'n5-pista-planos': { nivel: 5 } }), [{ id: 'n2-pista-recibo', nivel: 2 }]);
});

test('el nivel 2 sin completar → el recibo no se repone (ni la carta ni los planos sin sus niveles)', () => {
    assert.deepEqual(reponer([1], {}), []);
    assert.deepEqual(reponer([1, 3, 4, 5], {}), [{ id: 'n3-pista-carta', nivel: 3 }, { id: 'n5-pista-planos', nivel: 5 }], 'el recibo no');
});

test('reponer no duplica nada: lo que ya está no se toca y una segunda entrada no cambia el Registro', () => {
    const original = { 'n2-pista-recibo': { nivel: 2, descubierta: 'antes' }, 'n1-pista-huella': { nivel: 1, descubierta: 'antes' } };
    conAlmacen(original, () => {
        assert.deepEqual(aplicar([1, 2, 3, 4, 5]).map(p => p.id), ['n3-pista-carta', 'n5-pista-planos']);
        const despues = Registro.leer().pistas;
        assert.deepEqual(Object.keys(despues).sort(), ['n1-pista-huella', 'n2-pista-recibo', 'n3-pista-carta', 'n5-pista-planos']);
        assert.equal(despues['n2-pista-recibo'].descubierta, 'antes', 'la que ya estaba no se reescribe');
        assert.deepEqual(aplicar([1, 2, 3, 4, 5]), [], 'la segunda vez no hay nada que reponer');
        assert.deepEqual(Registro.leer().pistas, despues);
    });
});

test('solo se reponen las pistas que la deducción final usa (no la taza, la huella ni el abrigo)', () => {
    assert.deepEqual(reponer([1, 2, 3, 4, 5], {}).map(p => p.id), ['n2-pista-recibo', 'n3-pista-carta', 'n5-pista-planos']);
});

test('con el Registro vacío y los cinco niveles completados, la deducción final se puede resolver tras reponer', () => {
    conAlmacen({}, () => {
        aplicar([1, 2, 3, 4, 5]);
        const inv = new Investigacion(reglas, narrativa);
        inv.examino('n6-mueble-pluma');
        const libreta = new Libreta(reglas.deduccion, narrativa, inv, { nivel: 6, registro: () => Registro.leer().pistas, narrativas });
        const deduccion = new Deduccion(reglas.deduccion, libreta);
        assert.equal(deduccion.disponible(), true);
        assert.equal(deduccion.responder('detras', 'voss', ['pluma-gv', 'n2-pista-recibo']).estado, 'correcta');
        assert.equal(deduccion.responder('espantaba', 'buscar-tesoro', ['n3-pista-carta', 'n5-pista-planos']).estado, 'resuelto');
    });
});
