// Registro de pistas (expediente): clave propia de la v2, sin heredar el de la v1.1, con un localStorage falso
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import Registro from '../src/ui/Registro.js';

const CLAVE_V2 = 'inspector-logica-v2-expediente';
const CLAVE_V1 = 'inspector-logica-expediente';

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

test('sin datos guardados el expediente está vacío', () => {
    assert.deepEqual(Registro.leer(), { pistas: {} });
    assert.deepEqual(Registro.pistasDelNivel(1), []);
});

test('registrar una pista la guarda solo con la clave de la v2 y dice si era nueva', () => {
    assert.equal(Registro.registrarPista('n1-pista-huella', 1), true);
    assert.deepEqual(Object.keys(almacen), [CLAVE_V2]);
    const guardado = JSON.parse(almacen[CLAVE_V2]);
    assert.equal(guardado.pistas['n1-pista-huella'].nivel, 1);
    assert.ok(!Number.isNaN(Date.parse(guardado.pistas['n1-pista-huella'].descubierta)), 'con fecha válida');
    assert.equal(Registro.registrarPista('n1-pista-huella', 1), false, 'la segunda vez ya no es nueva');
});

test('las pistas se agrupan por nivel', () => {
    Registro.registrarPista('n1-pista-huella', 1);
    Registro.registrarPista('n1-pista-periodico', 1);
    Registro.registrarPista('n2-pista-taza', 2);
    assert.deepEqual(Registro.pistasDelNivel(1).sort(), ['n1-pista-huella', 'n1-pista-periodico']);
    assert.deepEqual(Registro.pistasDelNivel(2), ['n2-pista-taza']);
    assert.deepEqual(Registro.pistasDelNivel(3), []);
});

test('el expediente de la v1.1 no cuenta como pistas encontradas en la v2', () => {
    const viejo = { pistas: { 'n1-pista-huella': { nivel: 1, descubierta: '2026-01-01T00:00:00.000Z' } } };
    instalarAlmacenFalso({ [CLAVE_V1]: JSON.stringify(viejo) });
    assert.deepEqual(Registro.pistasDelNivel(1), []);
    assert.equal(Registro.registrarPista('n1-pista-huella', 1), true, 'en la v2 todavía es nueva');
    assert.deepEqual(JSON.parse(almacen[CLAVE_V1]), viejo, 'los datos de la v1.1 no se tocan');
});

test('datos corruptos se tratan como un expediente vacío y no lanzan error', () => {
    instalarAlmacenFalso({ [CLAVE_V2]: '{no es json' });
    assert.deepEqual(Registro.leer(), { pistas: {} });
    assert.doesNotThrow(() => Registro.registrarPista('n1-pista-huella', 1));
    assert.deepEqual(Registro.pistasDelNivel(1), ['n1-pista-huella']);
});

test('si el navegador no deja guardar (modo privado), no lanza error', () => {
    Object.defineProperty(globalThis, 'localStorage', {
        configurable: true,
        value: { getItem() { throw new Error('bloqueado'); }, setItem() { throw new Error('bloqueado'); } }
    });
    assert.deepEqual(Registro.leer(), { pistas: {} });
    assert.doesNotThrow(() => Registro.registrarPista('n1-pista-huella', 1));
});
