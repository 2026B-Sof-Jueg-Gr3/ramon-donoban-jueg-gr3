// Pruebas de los récords globales. Ejecutar desde la raíz:  node --test "pruebas/*.test.mjs"
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import Records, { aplicarIntento, mejora } from '../src/ui/Records.js';

// localStorage en memoria para probar la persistencia sin navegador
const almacen = new Map();
globalThis.localStorage = {
    getItem: k => (almacen.has(k) ? almacen.get(k) : null),
    setItem: (k, v) => almacen.set(k, String(v)),
    removeItem: k => almacen.delete(k)
};
beforeEach(() => almacen.clear());

test('el primer intento completado establece ambos récords', () => {
    const r = aplicarIntento(null, { pasos: 40, empujones: 10 });
    assert.deepEqual(r.records, { pasos: { pasos: 40, empujones: 10 }, empujones: { pasos: 40, empujones: 10 } });
    assert.equal(r.nuevoPasos, true);
    assert.equal(r.nuevoEmpujones, true);
});

test('mejorar solo los pasos no toca el récord de empujones', () => {
    const base = aplicarIntento(null, { pasos: 40, empujones: 10 }).records;
    const r = aplicarIntento(base, { pasos: 30, empujones: 14 });
    assert.deepEqual(r.records.pasos, { pasos: 30, empujones: 14 });
    assert.deepEqual(r.records.empujones, { pasos: 40, empujones: 10 });
    assert.equal(r.nuevoPasos, true);
    assert.equal(r.nuevoEmpujones, false);
});

test('mejorar solo los empujones no toca el récord de pasos', () => {
    const base = aplicarIntento(null, { pasos: 30, empujones: 14 }).records;
    const r = aplicarIntento(base, { pasos: 50, empujones: 9 });
    assert.deepEqual(r.records.pasos, { pasos: 30, empujones: 14 });
    assert.deepEqual(r.records.empujones, { pasos: 50, empujones: 9 });
});

test('desempates: mismo valor principal y mejor secundario sí es récord; igual en todo no lo es', () => {
    const base = aplicarIntento(null, { pasos: 30, empujones: 10 }).records;
    const empatePeor = aplicarIntento(base, { pasos: 30, empujones: 10 });
    assert.equal(empatePeor.nuevoPasos, false);
    assert.equal(empatePeor.nuevoEmpujones, false);
    const mejorDesempate = aplicarIntento(base, { pasos: 30, empujones: 8 });
    assert.equal(mejorDesempate.nuevoPasos, true, 'mismos pasos, menos empujones');
    const desempateEmpujones = aplicarIntento(base, { pasos: 28, empujones: 10 });
    assert.equal(desempateEmpujones.nuevoEmpujones, true, 'mismos empujones, menos pasos');
    assert.equal(mejora({ pasos: 30, empujones: 10 }, { pasos: 31, empujones: 0 }, 'pasos'), false);
});

test('un intento peor en todo no cambia nada', () => {
    const base = aplicarIntento(null, { pasos: 30, empujones: 10 }).records;
    const r = aplicarIntento(base, { pasos: 60, empujones: 20 });
    assert.deepEqual(r.records, base);
});

test('rechaza intentos imposibles (negativos, no enteros, más empujones que pasos)', () => {
    assert.throws(() => aplicarIntento(null, { pasos: -1, empujones: 0 }));
    assert.throws(() => aplicarIntento(null, { pasos: 3.5, empujones: 1 }));
    assert.throws(() => aplicarIntento(null, { pasos: 3, empujones: 4 }));
});

test('persistencia: los récords se guardan por nivel y un nivel no afecta a otro', () => {
    Records.registrarIntento(1, { pasos: 20, empujones: 6 });
    Records.registrarIntento(2, { pasos: 50, empujones: 12 });
    Records.registrarIntento(1, { pasos: 18, empujones: 7 });
    assert.deepEqual(Records.delNivel(1), { pasos: { pasos: 18, empujones: 7 }, empujones: { pasos: 20, empujones: 6 } });
    assert.deepEqual(Records.delNivel(2).pasos, { pasos: 50, empujones: 12 });
    assert.equal(Records.delNivel(3), null);
});

test('datos guardados corruptos no rompen la lectura', () => {
    localStorage.setItem('inspector-logica-records', '{no es json');
    assert.deepEqual(Records.leerTodos(), {});
    assert.equal(Records.registrarIntento(1, { pasos: 5, empujones: 1 }).nuevoPasos, true);
});
