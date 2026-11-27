// Las ilustraciones de escena (assets/ilustraciones/lista.json): un personaje que acompaña a una línea importante. Solo decoran.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { ilustracionDe, claveDeIlustracion, lineasImportantes } from '../src/motor/Expresiones.js';
import { leerJson, RAIZ } from './ayudasDeMapa.mjs';

const lista = leerJson('assets/ilustraciones/lista.json');

test('el cómplice aparece en el suelo con el cierre del nivel 5 (la captura), y en ninguna otra línea', () => {
    assert.equal(ilustracionDe(lista, 5, 'cierre'), 'complice-capturado');
    assert.deepEqual(lista.niveles, { 5: { cierre: 'complice-capturado' } });
    assert.equal(ilustracionDe(lista, 5, 'error'), null);
    assert.equal(ilustracionDe(lista, 4, 'cierre'), null);
    assert.equal(ilustracionDe(undefined, 5, 'cierre'), null);
});

test('cada ilustración es una línea importante de su nivel y tiene su PNG', () => {
    for (const [nivel, lineas] of Object.entries(lista.niveles)) {
        const importantes = lineasImportantes(leerJson(`assets/investigaciones/nivel${nivel}.json`));
        for (const [linea, nombre] of Object.entries(lineas)) {
            assert.ok(importantes.includes(linea), `nivel ${nivel}: "${linea}" no es una línea importante`);
            assert.ok(existsSync(new URL(`assets/ilustraciones/${nombre}.png`, RAIZ)), `falta assets/ilustraciones/${nombre}.png`);
        }
    }
    assert.equal(claveDeIlustracion('complice-capturado'), 'ilustracion-complice-capturado');
});
