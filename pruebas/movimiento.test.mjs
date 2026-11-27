// Movimiento del inspector, cámara y apuntado de la linterna
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { vectorDeEntrada, acercar, velocidadSuavizada, desplazamientoDeCamara } from '../src/motor/Movimiento.js';
import ControlDeApuntado, { suavizarAngulo } from '../src/motor/Apuntado.js';
import { diferenciaDeAngulos } from '../src/motor/Geometria.js';

const cerca = (a, b, tolerancia = 1e-9, mensaje = '') => assert.ok(Math.abs(a - b) <= tolerancia, `${mensaje} ${a} no es ≈ ${b}`);
const VELOCIDAD = 230;

// ── Dirección de entrada ────────────────────────────────────────────────────

test('en las 8 direcciones el vector mide 1: la diagonal no es más rápida', () => {
    const combinaciones = [
        { derecha: true }, { izquierda: true }, { arriba: true }, { abajo: true },
        { derecha: true, arriba: true }, { derecha: true, abajo: true }, { izquierda: true, arriba: true }, { izquierda: true, abajo: true }
    ];
    for (const teclas of combinaciones) {
        const v = vectorDeEntrada(teclas);
        cerca(Math.hypot(v.x, v.y), 1, 1e-12, JSON.stringify(teclas));
        cerca(Math.hypot(v.x, v.y) * VELOCIDAD, VELOCIDAD, 1e-9);
    }
    const diagonal = vectorDeEntrada({ derecha: true, abajo: true });
    cerca(diagonal.x, Math.SQRT1_2, 1e-12); cerca(diagonal.y, Math.SQRT1_2, 1e-12);
});

test('sin teclas o con teclas opuestas no hay movimiento', () => {
    assert.deepEqual(vectorDeEntrada({}), { x: 0, y: 0 });
    assert.deepEqual(vectorDeEntrada({ izquierda: true, derecha: true }), { x: 0, y: 0 });
    assert.deepEqual(vectorDeEntrada({ arriba: true, abajo: true }), { x: 0, y: 0 });
    assert.deepEqual(vectorDeEntrada({ izquierda: true, derecha: true, arriba: true }), { x: 0, y: -1 }, 'lo que no se cancela, queda');
});

// ── Suavizado ───────────────────────────────────────────────────────────────

test('acercar no avanza con dt = 0, converge y no depende de los cuadros por segundo', () => {
    assert.equal(acercar(5, 100, 0, 14), 5);
    assert.equal(acercar(5, 100, 0.1, Infinity), 100);
    let v = 0;
    for (let i = 0; i < 600; i++) v = acercar(v, 100, 1 / 60, 14);
    cerca(v, 100, 1e-6);
    const entero = acercar(0, 100, 1 / 30, 14);
    const mitades = acercar(acercar(0, 100, 1 / 60, 14), 100, 1 / 60, 14);
    cerca(entero, mitades, 1e-9, 'un paso de 1/30 = dos de 1/60');
});

test('la velocidad arranca y frena con suavidad, sin cuadros de diferencia entre 30 y 60 FPS', () => {
    const deseada = { x: VELOCIDAD, y: 0 };
    const simular = (fps, segundos) => {
        let v = { x: 0, y: 0 };
        for (let i = 0; i < fps * segundos; i++) v = velocidadSuavizada(v, deseada, 1 / fps);
        return v;
    };
    const medio = simular(60, 0.07);
    assert.ok(medio.x > VELOCIDAD * 0.55 && medio.x < VELOCIDAD * 0.72, 'a los 70 ms lleva ≈63 %');
    cerca(simular(60, 0.5).x, VELOCIDAD, 0.5, 'a los 0,5 s ya va a toda velocidad');
    cerca(simular(30, 0.3).x, simular(60, 0.3).x, 0.01, 'misma velocidad a 30 y a 60 FPS');
    let v = { x: VELOCIDAD, y: 0 };
    for (let i = 0; i < 60; i++) v = velocidadSuavizada(v, { x: 0, y: 0 }, 1 / 60);
    assert.deepEqual(v, { x: 0, y: 0 }, 'al soltar las teclas termina parado del todo');
    assert.deepEqual(velocidadSuavizada({ x: 10, y: 5 }, { x: 99, y: 7 }, 1 / 60, 0), { x: 99, y: 7 }, 'sin tiempo de respuesta es inmediata');
});

// ── Cámara ──────────────────────────────────────────────────────────────────

test('la cámara centra al jugador y nunca se sale del mapa', () => {
    assert.equal(desplazamientoDeCamara(1000, 1280, 2048), 360, 'centrado');
    assert.equal(desplazamientoDeCamara(100, 1280, 2048), 0, 'borde izquierdo');
    assert.equal(desplazamientoDeCamara(2000, 1280, 2048), 768, 'borde derecho (2048 - 1280)');
    assert.equal(desplazamientoDeCamara(500, 720, 960), 140);
    assert.equal(desplazamientoDeCamara(900, 720, 960), 240, 'borde inferior (960 - 720)');
    assert.equal(desplazamientoDeCamara(300, 1280, 1000), -140, 'si el mapa es más chico que la vista, queda centrado');
});

// ── Apuntado ────────────────────────────────────────────────────────────────

test('suavizarAngulo gira por el camino más corto y no más rápido que el máximo', () => {
    const actual = 3, objetivo = -3;               // están a 0,283 rad pasando por ±π
    const primero = suavizarAngulo(actual, objetivo, 0.01, 10);
    cerca(diferenciaDeAngulos(primero, actual), 0.1, 1e-9, 'avanza 0,1 rad hacia el lado corto (el positivo)');
    let a = actual;
    for (let i = 0; i < 3; i++) {
        const siguiente = suavizarAngulo(a, objetivo, 0.01, 10);
        assert.ok(Math.abs(diferenciaDeAngulos(siguiente, a)) <= 0.1 + 1e-9, 'nunca más rápido que el máximo');
        a = siguiente;
    }
    cerca(diferenciaDeAngulos(a, objetivo), 0, 1e-9, 'llega al objetivo sin dar la vuelta larga');
    assert.equal(suavizarAngulo(1, 1, 0.1, 5), 1);
});

const sinEntrada = { x: 0, y: 0 };
const base = { dt: 1 / 60, origen: { x: 100, y: 100 }, raton: { x: 100, y: 100 }, ratonMovido: false, movimiento: sinEntrada };
function repetir(control, parcial, cuadros) {
    let angulo;
    for (let i = 0; i < cuadros; i++) angulo = control.actualizar({ ...base, ...parcial });
    return angulo;
}

test('apuntado: empieza en modo teclado, mirando hacia abajo, y sin teclas no se mueve', () => {
    const control = new ControlDeApuntado();
    assert.equal(control.modo, 'teclado');
    cerca(repetir(control, {}, 30), Math.PI / 2, 1e-12);
});

test('apuntado con teclado: la linterna apunta hacia donde camina', () => {
    const control = new ControlDeApuntado();
    cerca(repetir(control, { movimiento: { x: 1, y: 0 } }, 30), 0, 1e-9, 'a la derecha');
    cerca(repetir(control, { movimiento: { x: -Math.SQRT1_2, y: -Math.SQRT1_2 } }, 30), -3 * Math.PI / 4, 1e-9, 'arriba a la izquierda');
    const quieto = repetir(control, {}, 30);
    cerca(quieto, -3 * Math.PI / 4, 1e-9, 'al parar, conserva la última dirección');
});

test('apuntado con ratón: sigue al cursor y mover el ratón vuelve a este modo', () => {
    const control = new ControlDeApuntado();
    repetir(control, { ratonMovido: true, raton: { x: 100, y: 300 } }, 30);
    assert.equal(control.modo, 'raton');
    cerca(control.angulo, Math.PI / 2, 1e-9, 'cursor debajo');
    repetir(control, { ratonMovido: true, raton: { x: 300, y: 100 } }, 30);
    cerca(control.angulo, 0, 1e-9, 'cursor a la derecha');
    repetir(control, { ratonMovido: true, raton: { x: 0, y: 100 } }, 30);
    cerca(Math.abs(control.angulo), Math.PI, 1e-9, 'cursor a la izquierda');
});

test('apuntado: con el ratón quieto y caminando con teclado, pasa a apuntar hacia donde camina tras la espera', () => {
    const control = new ControlDeApuntado({ espera: 0.8 });
    repetir(control, { ratonMovido: true, raton: { x: 300, y: 100 } }, 10);           // apunta a la derecha
    // Camina hacia arriba con el ratón quieto: durante la espera sigue apuntando al cursor
    repetir(control, { raton: { x: 300, y: 100 }, movimiento: { x: 0, y: -1 } }, 30);  // 0,5 s
    assert.equal(control.modo, 'raton');
    cerca(control.angulo, 0, 1e-9);
    repetir(control, { raton: { x: 300, y: 100 }, movimiento: { x: 0, y: -1 } }, 40);  // pasan los 0,8 s
    assert.equal(control.modo, 'teclado');
    cerca(control.angulo, -Math.PI / 2, 1e-9, 'ahora mira hacia arriba, donde camina');
    // Mover el ratón lo devuelve al cursor de inmediato
    repetir(control, { ratonMovido: true, raton: { x: 300, y: 100 }, movimiento: { x: 0, y: -1 } }, 30);
    assert.equal(control.modo, 'raton');
    cerca(control.angulo, 0, 1e-9);
});

test('apuntado: con el ratón quieto y sin caminar no cambia de modo ni de dirección', () => {
    const control = new ControlDeApuntado({ espera: 0.8 });
    repetir(control, { ratonMovido: true, raton: { x: 100, y: 300 } }, 10);
    repetir(control, { raton: { x: 100, y: 300 } }, 300);                              // 5 s quieto
    assert.equal(control.modo, 'raton');
    cerca(control.angulo, Math.PI / 2, 1e-9);
});

test('apuntado: con el cursor encima del inspector conserva la dirección (sin temblar)', () => {
    const control = new ControlDeApuntado();
    repetir(control, { ratonMovido: true, raton: { x: 100, y: 300 } }, 30);
    const antes = control.angulo;
    repetir(control, { ratonMovido: true, raton: { x: 102, y: 101 } }, 30);
    assert.equal(control.angulo, antes);
});

test('apuntado: el giro es suave, no instantáneo', () => {
    const control = new ControlDeApuntado({ velocidadDeGiro: 18 });
    repetir(control, { ratonMovido: true, raton: { x: 300, y: 100 } }, 1);            // 1 cuadro: máx. 0,3 rad
    assert.ok(Math.abs(control.angulo - Math.PI / 2) <= 18 / 60 + 1e-9);
    assert.ok(control.angulo > 0.5, 'todavía no llegó al cursor');
});
