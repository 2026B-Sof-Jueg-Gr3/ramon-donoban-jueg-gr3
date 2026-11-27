// La expresión del retrato en cada línea importante: un dato (assets/presentacion/expresiones.json), no texto.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { crearEscena } from './escenaSimulada.mjs';
import { EXPRESIONES, claveDeLinea, expresionDe, lineasImportantes, validarExpresiones } from '../src/motor/Expresiones.js';
import Investigacion from '../src/motor/Investigacion.js';
import { leerJson, RAIZ } from './ayudasDeMapa.mjs';

const { default: Narracion } = await import('../src/presentacion/Narracion.js');

const tabla = leerJson('assets/presentacion/expresiones.json');
const reglas = Object.fromEntries([1, 2, 3, 4, 5, 6].map(n => [n, leerJson(`assets/investigaciones/nivel${n}.json`)]));
const narrativas = Object.fromEntries([1, 2, 3, 4, 5, 6].map(n => [n, leerJson(`assets/narrativa/nivel${n}.json`)]));

test('las seis expresiones del diseño', () => {
    assert.deepEqual([...EXPRESIONES], ['neutral', 'pensativo', 'sonrisa_ironica', 'sorprendido', 'serio', 'satisfecho']);
});

test('cada línea importante de los seis niveles tiene su expresión, y no sobra ninguna', () => {
    assert.deepEqual(validarExpresiones(tabla, reglas), []);
    assert.deepEqual(lineasImportantes(reglas[5]), ['intro', 'revelacion:0', 'revelacion:1', 'pista:n5-pista-planos', 'momento:sombra-vista', 'cierre', 'error']);
    const usadas = new Set(Object.values(tabla.niveles).flatMap(Object.values));
    assert.equal(usadas.size, 6, 'las seis se usan alguna vez');
});

test('la tabla no lleva texto de la historia', () => {
    const contenido = JSON.stringify(tabla.niveles);
    for (const n of Object.values(narrativas)) for (const linea of [n.intro, n.cierre, n.error, ...n.revelaciones]) assert.ok(!contenido.includes(linea));
});

test('la validación avisa de una línea sin expresión, una expresión desconocida y una clave de más', () => {
    const mala = structuredClone(tabla);
    delete mala.niveles[1].cierre;
    mala.niveles[2].intro = 'enfadado';
    mala.niveles[3]['comentario:0'] = 'neutral';
    const errores = validarExpresiones(mala, reglas);
    assert.equal(errores.length, 3, errores.join('\n'));
    assert.equal(expresionDe(mala, 2, 'intro'), 'neutral', 'lo desconocido se ve neutral, sin romperse');
});

test('la clave de cada acontecimiento: su regla; el cierre y el error, su categoría', () => {
    const inv = new Investigacion(reglas[5], narrativas[5]);
    const [intro] = inv.entro();
    assert.equal(claveDeLinea(intro), 'intro');
    const [rev, planos] = inv.apago('chimenea');
    assert.deepEqual([claveDeLinea(rev), claveDeLinea(planos)], ['revelacion:1', 'pista:n5-pista-planos']);
    assert.equal(claveDeLinea({ acontecimiento: 'cierre', categoria: 'cierre' }), 'cierre');
    assert.equal(claveDeLinea({ acontecimiento: 'error#3', categoria: 'error' }), 'error');
    assert.equal(expresionDe(tabla, 5, claveDeLinea(planos)), tabla.niveles[5]['pista:n5-pista-planos']);
});

test('la caja grande muestra la expresión de cada línea que sale (también la segunda de una misma pausa)', () => {
    const escena = crearEscena({ ancho: 1280, alto: 720 });
    const n = new Narracion(escena, {
        profundidad: 100, jugadorEnPantalla: () => ({ x: 900, y: 300 }), alPausar() { }, alReanudar() { }, alPulsar() { },
        expresionDe: e => expresionDe(tabla, 5, claveDeLinea(e))
    });
    const inv = new Investigacion(reglas[5], narrativas[5]);
    n.contarTodos(inv.apago('chimenea'));
    assert.equal(n.decorado.expresion, tabla.niveles[5]['revelacion:1']);
    n.avanzar(); n.avanzar();          // completa y pasa a la siguiente: los planos
    assert.equal(n.decorado.expresion, tabla.niveles[5]['pista:n5-pista-planos']);
    n.avanzar(); n.avanzar();
    assert.equal(n.dialogo.abierto, false);
    assert.equal(n.decorado.expresion, null);
});

test('todo PNG de retrato que haya en la carpeta está anotado (si no, el juego no lo vería)', () => {
    const carpeta = new URL('assets/retratos/inspector/', RAIZ);
    const enLaCarpeta = readdirSync(carpeta).filter(f => f.endsWith('.png')).sort();
    const anotados = [...leerJson('assets/retratos/inspector/disponibles.json').archivos].sort();
    assert.deepEqual(anotados, enLaCarpeta.filter(f => EXPRESIONES.includes(f.replace('.png', ''))), 'correr: node herramientas/listar_retratos.mjs');
});
