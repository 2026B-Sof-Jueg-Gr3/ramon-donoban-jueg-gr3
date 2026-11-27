// Narracion: la causa se muestra antes que la consecuencia. Lo que un mismo suceso produce se presenta con la causa
// (tarjeta o nota) de inmediato y la revelación cuando la causa ya está a la vista y pasó un momento, sin perder ni
// duplicar nada.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearEscena } from './escenaSimulada.mjs';
import { LECTURA, tiempoDeLectura } from '../src/ui/tiemposDeLectura.js';

const { default: Narracion } = await import('../src/presentacion/Narracion.js');

const evento = (id, clase, texto = 'Texto de ' + id, categoria = clase === 'ambiental' ? 'marcas' : 'comentarios') =>
    ({ acontecimiento: id, regla: id, ref: id, clase, categoria, texto, alCompletar: 'conservar' });

function crear() {
    const escena = crearEscena({ ancho: 1280, alto: 720 });
    const llamadas = { pausas: 0, reanudaciones: 0 };
    const n = new Narracion(escena, {
        profundidad: 100000, jugadorEnPantalla: () => ({ x: 200, y: 200 }),
        alPausar: () => llamadas.pausas++, alReanudar: () => llamadas.reanudaciones++, alPulsar: () => { }
    });
    // Un cuadro del juego: el reloj y, como en la escena, la actualización de la narración
    const correr = ms => { for (let t = 0; t < ms; t += 16) { escena.cuadro(16); n.actualizar(); } };
    // Cada texto presentado, en orden: primero lo que sale por el panel y por la caja
    const salidas = [];
    const mostrarSecundaria = n.panel.mostrarSecundaria.bind(n.panel), mostrarAmbiental = n.panel.mostrarAmbiental.bind(n.panel);
    n.panel.mostrarSecundaria = (m, op) => { salidas.push(m.acontecimiento); return mostrarSecundaria(m, op); };
    n.panel.mostrarAmbiental = (m, op) => { salidas.push(m.acontecimiento); return mostrarAmbiental(m, op); };
    const abrir = n.dialogo.abrir.bind(n.dialogo);
    n.dialogo.abrir = (texto, op) => { salidas.push(texto); return abrir(texto, op); };
    return { escena, n, llamadas, correr, salidas };
}

const MS = LECTURA.causaAntesDeConsecuenciaMs;

test('la espera entre la causa y la revelación existe y es breve', () => {
    assert.ok(MS >= 800 && MS <= 2500);
    assert.ok(LECTURA.esperaMaximaDeLaCausaMs > MS);
});

test('una marca y su revelación: la tarjeta sale primero y la pausa empieza después de la espera', () => {
    const { n, llamadas, correr, salidas } = crear();
    n.contarTodos([evento('marca', 'ambiental'), evento('rev', 'importante')]);
    assert.deepEqual(salidas, ['marca'], 'la tarjeta de la causa ya está a la vista');
    assert.equal(n.narrador.bloqueando(), false, 'todavía no empezó la pausa narrativa');
    assert.equal(llamadas.pausas, 0);
    assert.equal(n.bloqueando, true, 'pero el jugador ya no puede actuar');
    correr(MS - 100);
    assert.equal(n.narrador.bloqueando(), false, 'antes de cumplirse el tiempo no hay pausa');
    correr(200);
    assert.equal(n.narrador.bloqueando(), true, 'cumplido el tiempo empieza la pausa narrativa');
    assert.equal(llamadas.pausas, 1);
    assert.deepEqual(salidas, ['marca', 'Texto de rev']);
});

test('un comentario y su revelación: igual, el comentario primero', () => {
    const { n, correr, salidas } = crear();
    n.contarTodos([evento('com', 'secundaria'), evento('rev', 'importante')]);
    assert.deepEqual(salidas, ['com']);
    assert.equal(n.narrador.bloqueando(), false);
    correr(MS + 100);
    assert.equal(n.narrador.bloqueando(), true);
    assert.deepEqual(salidas, ['com', 'Texto de rev']);
});

test('una revelación sola (sin causa visible) sale de inmediato, sin espera', () => {
    const { n, llamadas } = crear();
    n.contarTodos([evento('rev', 'importante')]);
    assert.equal(n.narrador.bloqueando(), true);
    assert.equal(llamadas.pausas, 1);
});

test('si la libreta está ocupada, la causa espera su turno y la revelación espera con ella (nunca sale antes)', () => {
    const { n, correr, salidas } = crear();
    n.contarTodos([evento('anterior', 'secundaria')]);                       // la libreta ya muestra otra nota
    assert.deepEqual(salidas, ['anterior']);
    n.contarTodos([evento('com', 'secundaria'), evento('rev', 'importante')]);
    assert.deepEqual(salidas, ['anterior'], 'la causa todavía no se ve');
    assert.equal(n.bloqueando, false, 'y mientras tanto el jugador no está bloqueado');
    correr(tiempoDeLectura('Texto de anterior') + 600);                      // la nota anterior termina y entra la causa
    assert.deepEqual(salidas, ['anterior', 'com'], 'primero la causa');
    assert.equal(n.narrador.bloqueando(), false, 'la revelación todavía espera');
    assert.equal(n.bloqueando, true, 'desde que la causa se ve empieza la cuenta y el jugador queda bloqueado');
    correr(MS + 100);
    assert.deepEqual(salidas, ['anterior', 'com', 'Texto de rev']);
    assert.equal(n.narrador.bloqueando(), true);
});

test('si la causa no llega a verse, la revelación sale igual al cumplirse el tope', () => {
    const { n, correr, salidas } = crear();
    n.narrador.pausado = true;                                                // otra pausa en curso: la causa queda en cola
    n.contarTodos([evento('com', 'secundaria'), evento('rev', 'importante')]);
    assert.deepEqual(salidas, [], 'la causa no se pudo mostrar');
    n.narrador.pausado = false;
    n.narrador.secundarios = [];                                              // la causa se pierde (caso imposible, solo para el tope)
    correr(LECTURA.esperaMaximaDeLaCausaMs + 200);
    assert.deepEqual(salidas, ['Texto de rev']);
});

test('nada se pierde ni se duplica: la tarjeta queda y la revelación sale una sola vez', () => {
    const { n, llamadas, correr, salidas } = crear();
    const lote = [evento('marca', 'ambiental'), evento('rev', 'importante')];
    n.contarTodos(lote);
    correr(MS + 100);
    n.contarTodos(lote);                                  // el mismo suceso otra vez: ya contado
    correr(MS + 100);
    assert.equal(llamadas.pausas, 1);
    assert.equal(n.panel.tarjetas.length, 1);
    assert.equal(n.narrador.secuencia.length, 1, 'una sola revelación en la secuencia');
    assert.deepEqual(salidas, ['marca', 'Texto de rev']);
});

test('durante la cuenta y la pausa el jugador está bloqueado; al terminar, libre', () => {
    const { n, correr } = crear();
    n.contarTodos([evento('marca', 'ambiental'), evento('rev', 'importante')]);
    assert.equal(n.bloqueando, true);
    correr(MS + 100);
    assert.equal(n.bloqueando, true);
    for (let i = 0; i < 6 && n.bloqueando; i++) { n.avanzar(); correr(640); }
    assert.equal(n.bloqueando, false);
});

test('detener durante la cuenta cancela la revelación pendiente', () => {
    const { n, llamadas, correr } = crear();
    n.contarTodos([evento('marca', 'ambiental'), evento('rev', 'importante')]);
    n.detener();
    correr(LECTURA.esperaMaximaDeLaCausaMs + 500);
    assert.equal(llamadas.pausas, 0);
    assert.equal(n.bloqueando, false);
});

test('la tarjeta ya en pantalla sigue cuando empieza la pausa y al reanudar', () => {
    const { n, correr } = crear();
    n.contarTodos([evento('marca', 'ambiental'), evento('rev', 'importante')]);
    correr(MS + 100);
    assert.equal(n.panel.tarjetas.length, 1, 'la tarjeta sigue ahí durante la pausa');
    for (let i = 0; i < 6 && n.bloqueando; i++) { n.avanzar(); correr(640); }
    assert.equal(n.panel.tarjetas.length, 1, 'y sigue ahí al reanudar');
});
