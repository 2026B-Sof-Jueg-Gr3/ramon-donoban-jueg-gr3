// El fenómeno de la cocina (golpes y velas) y el desplazamiento de un mueble, sin Phaser
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CicloDeGolpes, golpeCerca, nivelDeLlama, VELA, GOLPE } from '../src/motor/Fenomeno.js';
import { desplazarObjeto } from '../src/motor/Alcance.js';
import { desplazarMueble } from '../src/motor/Mapa.js';
import { cargarMapa, copia } from './ayudasDeMapa.mjs';

const correr = (ciclo, segundos, dt = 1 / 60) => { let golpes = 0; for (let t = 0; t < segundos - 1e-9; t += dt) if (ciclo.actualizar(dt)) golpes++; return golpes; };

test('el primer golpe llega pronto y los siguientes cada 7 a 12 segundos', () => {
    const ciclo = new CicloDeGolpes({ azar: () => 0 });
    assert.equal(correr(ciclo, 3.9), 0);
    assert.equal(correr(ciclo, 0.2), 1, 'el primero a los 4 s');
    assert.equal(correr(ciclo, 6.9), 0);
    assert.equal(correr(ciclo, 0.2), 1, 'con azar 0 el siguiente a los 7 s');
    const largo = new CicloDeGolpes({ azar: () => 0.999 });
    correr(largo, 4.1);
    assert.equal(correr(largo, 11.9), 0);
    assert.equal(correr(largo, 0.2), 1, 'con el azar más alto a los 12 s');
});

test('con azar real, los golpes siempre quedan entre el mínimo y el máximo', () => {
    const ciclo = new CicloDeGolpes();
    const instantes = [];
    let t = 0;
    for (; t < 600; t += 1 / 60) if (ciclo.actualizar(1 / 60)) instantes.push(t);
    assert.ok(instantes.length >= 40);
    for (let i = 1; i < instantes.length; i++) {
        const espera = instantes[i] - instantes[i - 1];
        assert.ok(espera >= GOLPE.minimo - 0.05 && espera <= GOLPE.maximo + 0.05, `${espera.toFixed(2)} s`);
    }
});

test('un golpe forzado (tirar de la cuerda) cuenta y reinicia la espera', () => {
    const ciclo = new CicloDeGolpes({ azar: () => 0 });
    correr(ciclo, 2);
    assert.equal(ciclo.golpear(), true);
    assert.equal(correr(ciclo, 6.9), 0, 'tras el forzado hay que esperar otra vez');
    assert.equal(correr(ciclo, 0.2), 1);
    assert.equal(ciclo.golpes, 2);
});

test('calmar el fenómeno: no más golpes, ni solos ni forzados', () => {
    const ciclo = new CicloDeGolpes({ azar: () => 0 });
    correr(ciclo, 5);
    ciclo.calmar();
    assert.equal(correr(ciclo, 120), 0);
    assert.equal(ciclo.golpear(), false);
    assert.equal(ciclo.calmado, true);
});

test('las velas se apagan enseguida, siguen apagadas un rato y se vuelven a encender', () => {
    assert.equal(nivelDeLlama(0), 1);
    assert.ok(nivelDeLlama(VELA.apagado / 2) > 0.4 && nivelDeLlama(VELA.apagado / 2) < 0.6);
    assert.equal(nivelDeLlama(VELA.apagado), 0);
    assert.equal(nivelDeLlama(VELA.apagado + VELA.apagada / 2), 0);
    const reencendiendo = nivelDeLlama(VELA.apagado + VELA.apagada + VELA.encendido / 2);
    assert.ok(reencendiendo > 0.3 && reencendiendo < 0.7);
    assert.equal(nivelDeLlama(VELA.apagado + VELA.apagada + VELA.encendido), 1);
    assert.equal(nivelDeLlama(99), 1);
    // Sube sin saltos hacia atrás
    let previo = 0;
    for (let t = VELA.apagado + VELA.apagada; t < VELA.apagado + VELA.apagada + VELA.encendido; t += 0.01) { const n = nivelDeLlama(t); assert.ok(n >= previo - 1e-9); previo = n; }
    // Las velas apagadas siempre vuelven antes del siguiente golpe
    assert.ok(VELA.apagado + VELA.apagada + VELA.encendido < GOLPE.minimo);
});

test('con el fenómeno calmado (el cierre) las velas quedan encendidas', () => {
    for (const t of [0, 0.1, 1, 2, 3, 4]) assert.equal(nivelDeLlama(t, true), 1);
    assert.equal(nivelDeLlama(undefined), 1);
    assert.equal(nivelDeLlama(-1), 1);
});

test('golpeCerca mide desde los pies hasta el borde del objeto', () => {
    const objeto = { x: 200, y: 256, ancho: 128, alto: 64 };
    assert.equal(golpeCerca({ x: 264, y: 440 }, objeto), true, 'a 120 px del borde');
    assert.equal(golpeCerca({ x: 264, y: 441 }, objeto), false);
    assert.equal(golpeCerca({ x: 264, y: 300 }, objeto), true, 'encima');
    assert.equal(golpeCerca({ x: 450, y: 300 }, objeto), false, '122 px al este');
    assert.equal(golpeCerca({ x: 1000, y: 500 }, objeto), false, 'al otro lado de la cocina');
    assert.equal(golpeCerca({ x: 264, y: 500 }, objeto, 200), true, 'con otro alcance');
});

test('desplazarObjeto mueve el objeto y los puntos de mira y de luz que lleva', () => {
    const o = { x: 200, y: 256, ancho: 128, alto: 64, props: { mira: '264,300', luz: '216,321,96,8', ref: 'a' } };
    desplazarObjeto(o, 192);
    assert.deepEqual([o.x, o.y], [392, 256]);
    assert.equal(o.props.mira, '456,300');
    assert.equal(o.props.luz, '408,321,96,8');
    desplazarObjeto(o, -92, 10);
    assert.deepEqual([o.x, o.y], [300, 266]);
    assert.equal(o.props.luz, '316,331,96,8');
    const sin = { x: 0, y: 0, ancho: 1, alto: 1, props: {} };
    desplazarObjeto(sin, 5);
    assert.equal(sin.x, 5);
});

test('desplazarMueble mueve el mueble, su bloque de luz y lo que está sobre él, y nada más', () => {
    const mapa = cargarMapa(2);
    const antes = copia({ muebles: mapa.muebles, interactuables: mapa.interactuables, bloqueaLuz: mapa.bloqueaLuz });
    desplazarMueble(mapa, 'alacena', 192);
    const x = (lista, nombre) => lista.find(o => o.nombre === nombre).x;
    assert.equal(x(mapa.muebles, 'alacena'), x(antes.muebles, 'alacena') + 192);
    assert.equal(x(mapa.bloqueaLuz, 'alacena-luz'), x(antes.bloqueaLuz, 'alacena-luz') + 192);
    for (const n of ['examinar-alacena', 'rodar-alacena']) assert.equal(x(mapa.interactuables, n), x(antes.interactuables, n) + 192, n);
    for (const n of ['fuelle', 'platos', 'tirar-cuerda', 'recibo']) assert.equal(x(mapa.interactuables, n), x(antes.interactuables, n), `${n} no se mueve`);
    for (const n of ['vitrina', 'mesa', 'chimenea']) assert.equal(x(mapa.muebles, n), x(antes.muebles, n), n);
    assert.throws(() => desplazarMueble(mapa, 'no-existe', 5));
});
