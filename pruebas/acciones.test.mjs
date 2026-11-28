// El verbo junto a la tecla E (src/motor/Acciones.js): cada acción de los mapas tiene el suyo.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { VERBOS, verboDeAccion, VERBO_POR_DEFECTO } from '../src/motor/Acciones.js';

const carpeta = new URL('../assets/mapas/', import.meta.url);
const accionesDeLosMapas = new Set();
// Todas las propiedades "accion" de los mapas de Tiled, estén donde estén
const recorrer = o => {
    if (Array.isArray(o)) o.forEach(recorrer);
    else if (o && typeof o === 'object') { if (o.name === 'accion') accionesDeLosMapas.add(o.value); Object.values(o).forEach(recorrer); }
};
for (const archivo of readdirSync(carpeta).filter(n => n.endsWith('.json'))) recorrer(JSON.parse(readFileSync(new URL(archivo, carpeta), 'utf8')));

test('cada acción que aparece en los mapas tiene su verbo', () => {
    assert.ok(accionesDeLosMapas.size >= 11, `se encontraron ${accionesDeLosMapas.size} acciones en los mapas`);
    for (const a of accionesDeLosMapas) assert.ok(Object.hasOwn(VERBOS, a), `la acción "${a}" no tiene verbo`);
});

test('los verbos de siempre', () => {
    assert.equal(verboDeAccion('examinar'), 'Examinar');
    assert.equal(verboDeAccion('mirar-detras'), 'Mirar detrás');
    assert.equal(verboDeAccion('recoger'), 'Recoger');
    assert.equal(verboDeAccion('abrir'), 'Abrir');
});

test('una acción desconocida no deja el aviso vacío', () => {
    assert.equal(verboDeAccion('algo-raro'), VERBO_POR_DEFECTO);
    assert.equal(verboDeAccion(undefined), VERBO_POR_DEFECTO);
    assert.equal(verboDeAccion('toString'), VERBO_POR_DEFECTO);
});
