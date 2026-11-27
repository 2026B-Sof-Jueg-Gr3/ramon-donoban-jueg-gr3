// El joystick táctil (src/motor/Joystick.js): elige las mismas 8 direcciones que las flechas.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { flechasDelJoystick, limitarAlAro, cambiosDeFlechas, ZONA_MUERTA } from '../src/motor/Joystick.js';

const apretadas = f => Object.keys(f).filter(k => f[k]).sort();

test('cerca del centro no aprieta nada (zona muerta)', () => {
    assert.deepEqual(apretadas(flechasDelJoystick(0, 0, 60)), []);
    assert.deepEqual(apretadas(flechasDelJoystick(60 * ZONA_MUERTA - 1, 0, 60)), []);
    assert.deepEqual(apretadas(flechasDelJoystick(10, 10, 0)), [], 'sin radio no hay joystick');
});

test('las cuatro direcciones rectas', () => {
    assert.deepEqual(apretadas(flechasDelJoystick(50, 0, 60)), ['derecha']);
    assert.deepEqual(apretadas(flechasDelJoystick(-50, 0, 60)), ['izquierda']);
    assert.deepEqual(apretadas(flechasDelJoystick(0, -50, 60)), ['arriba']);
    assert.deepEqual(apretadas(flechasDelJoystick(0, 50, 60)), ['abajo']);
});

test('las cuatro diagonales aprietan dos flechas', () => {
    assert.deepEqual(apretadas(flechasDelJoystick(40, -40, 60)), ['arriba', 'derecha']);
    assert.deepEqual(apretadas(flechasDelJoystick(-40, -40, 60)), ['arriba', 'izquierda']);
    assert.deepEqual(apretadas(flechasDelJoystick(40, 40, 60)), ['abajo', 'derecha']);
    assert.deepEqual(apretadas(flechasDelJoystick(-40, 40, 60)), ['abajo', 'izquierda']);
});

test('se redondea al octante más cercano: un poco inclinado sigue siendo recto', () => {
    assert.deepEqual(apretadas(flechasDelJoystick(50, 15, 60)), ['derecha']);
    assert.deepEqual(apretadas(flechasDelJoystick(50, 30, 60)), ['abajo', 'derecha']);
    assert.deepEqual(apretadas(flechasDelJoystick(-50, -15, 60)), ['izquierda']);
});

test('el pomo no sale del aro', () => {
    assert.deepEqual(limitarAlAro(30, 40, 100), { x: 30, y: 40 });
    const fuera = limitarAlAro(300, 400, 100);
    assert.ok(Math.abs(Math.hypot(fuera.x, fuera.y) - 100) < 1e-9);
    assert.ok(Math.abs(fuera.x - 60) < 1e-9 && Math.abs(fuera.y - 80) < 1e-9);
});

test('al cambiar de dirección se sueltan y aprietan solo las flechas que cambian', () => {
    const nada = { izquierda: false, derecha: false, arriba: false, abajo: false };
    const derecha = { ...nada, derecha: true }, diagonal = { ...nada, derecha: true, arriba: true };
    assert.deepEqual(cambiosDeFlechas(nada, derecha), { soltar: [], apretar: ['derecha'] });
    assert.deepEqual(cambiosDeFlechas(derecha, diagonal), { soltar: [], apretar: ['arriba'] });
    assert.deepEqual(cambiosDeFlechas(diagonal, nada), { soltar: ['derecha', 'arriba'], apretar: [] });
});
