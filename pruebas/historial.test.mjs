// El historial de la habitación (src/motor/Historial.js y el Narrador): todo lo que salió, en orden, para releerlo.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import Historial, { entradaDe, ETIQUETA } from '../src/motor/Historial.js';
import Narrador from '../src/ui/Narrador.js';

test('cada clase de texto con su nombre: lo que dice el inspector, la libreta y el rastro', () => {
    assert.deepEqual(entradaDe({ clase: 'importante', texto: 'Hola.' }), { etiqueta: 'SILAS VANE', texto: 'Hola.', clase: 'importante' });
    assert.equal(entradaDe({ clase: 'secundaria', texto: 'Nota.' }).etiqueta, ETIQUETA.secundaria);
    assert.equal(entradaDe({ clase: 'ambiental', texto: 'Polvo.' }).etiqueta, 'RASTRO');
    assert.equal(entradaDe({ clase: 'secundaria', titulo: 'HUELLA DE BOTA', texto: 'Talla 44.' }).etiqueta, 'HUELLA DE BOTA', 'una pista lleva su título');
    assert.equal(entradaDe({ clase: 'importante', titulo: 'OTRA COSA', texto: 'x' }).etiqueta, 'SILAS VANE', 'lo importante siempre es del inspector');
});

test('los cortes de página del cierre no se ven: el texto queda seguido', () => {
    assert.equal(entradaDe({ clase: 'importante', texto: 'Uno...\fEspera.\f¡Dos!' }).texto, 'Uno... Espera. ¡Dos!');
});

test('guarda en orden, ignora lo vacío y olvida lo más viejo si se pasa del máximo', () => {
    const h = new Historial(3);
    assert.equal(h.vacio, true);
    for (const t of ['a', '', 'b', 'c', 'd']) h.agregar({ clase: 'secundaria', texto: t });
    assert.deepEqual(h.entradas.map(e => e.texto), ['b', 'c', 'd']);
});

test('el Narrador anota cada texto que presenta, una sola vez, aunque el mismo suceso llegue dos veces', () => {
    const panel = { tarjetas: [], pausar() { }, reanudar() { }, mostrarSecundaria() { }, mostrarAmbiental() { }, retirar() { }, retirarTodo() { } };
    const presentacion = { abrir() { }, cerrar() { }, actualizarTotal() { }, alTocar() { }, llamarAtencion() { } };
    const n = new Narrador({ panel, presentacion });
    n.contar({ acontecimiento: 'm1', ref: 'm1', clase: 'ambiental', texto: 'Polvo removido.' });
    n.contar({ acontecimiento: 'm1', ref: 'm1', clase: 'ambiental', texto: 'Polvo removido.' });
    n.contar({ acontecimiento: 'r1', ref: 'r1', clase: 'importante', texto: 'Alguien estuvo aquí.' });
    n.contar({ acontecimiento: 'p1', ref: 'p1', clase: 'secundaria', titulo: 'HUELLA DE BOTA', texto: 'Talla 44.' });
    assert.deepEqual(n.historial.entradas.map(e => `${e.etiqueta}: ${e.texto}`),
        ['RASTRO: Polvo removido.', 'SILAS VANE: Alguien estuvo aquí.', 'HUELLA DE BOTA: Talla 44.']);
    n.detener();
    assert.equal(n.historial.entradas.length, 3, 'reintentar no borra lo que ya salió');
});
