// Progreso de la campaña: clave propia de la v2, sin heredar el de la v1.1, con un localStorage falso
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import Progreso from '../src/ui/Progreso.js';

const CLAVE_V2 = 'inspector-logica-v2-completados';
const CLAVE_V1 = 'sokoban-completados';

let almacen;
const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');

function instalarAlmacenFalso(datos = {}) {
    almacen = { ...datos };
    Object.defineProperty(globalThis, 'localStorage', {
        configurable: true,
        value: {
            getItem: k => (k in almacen ? almacen[k] : null),
            setItem: (k, v) => { almacen[k] = String(v); },
            removeItem: k => { delete almacen[k]; }
        }
    });
}

beforeEach(() => instalarAlmacenFalso());
afterEach(() => {
    if (original) Object.defineProperty(globalThis, 'localStorage', original);
    else delete globalThis.localStorage;
});

test('sin datos guardados no hay ninguna habitación completada', () => {
    assert.deepEqual(Progreso.leerCompletados(), []);
    assert.equal(Progreso.estaCompletado(1), false);
});

test('marcar una habitación la guarda solo con la clave de la v2', () => {
    Progreso.marcarCompletado(1);
    assert.deepEqual(Object.keys(almacen), [CLAVE_V2]);
    assert.deepEqual(JSON.parse(almacen[CLAVE_V2]), [1]);
    assert.equal(Progreso.estaCompletado(1), true);
    assert.equal(Progreso.estaCompletado(2), false);
});

test('marcar dos veces la misma habitación no la duplica', () => {
    Progreso.marcarCompletado(2);
    Progreso.marcarCompletado(2);
    assert.deepEqual(Progreso.leerCompletados(), [2]);
});

test('el progreso de la v1.1 no desbloquea nada en la v2', () => {
    instalarAlmacenFalso({ [CLAVE_V1]: JSON.stringify([1, 2, 3, 4, 5, 6]) });
    assert.deepEqual(Progreso.leerCompletados(), []);
    for (let n = 1; n <= 6; n++) assert.equal(Progreso.estaCompletado(n), false, `habitación ${n}`);
    Progreso.marcarCompletado(1);
    assert.deepEqual(JSON.parse(almacen[CLAVE_V1]), [1, 2, 3, 4, 5, 6], 'los datos de la v1.1 no se tocan');
});

test('datos corruptos se tratan como sin progreso y no lanzan error', () => {
    instalarAlmacenFalso({ [CLAVE_V2]: '{no es json' });
    assert.deepEqual(Progreso.leerCompletados(), []);
    assert.doesNotThrow(() => Progreso.marcarCompletado(3));
    assert.deepEqual(Progreso.leerCompletados(), [3]);
});

test('si el navegador no deja guardar (modo privado), no lanza error', () => {
    Object.defineProperty(globalThis, 'localStorage', {
        configurable: true,
        value: { getItem() { throw new Error('bloqueado'); }, setItem() { throw new Error('bloqueado'); } }
    });
    assert.deepEqual(Progreso.leerCompletados(), []);
    assert.doesNotThrow(() => Progreso.marcarCompletado(1));
});
