// El contenido de la carga extrema (src/motor/cargaExtrema.js): sale de los textos reales de los seis niveles, es el más
// largo de cada tipo y llega a 25 pruebas y 10 pistas.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { contenidoExtremo, hallazgosExtremos, textoRepetido, CARGA } from '../src/motor/cargaExtrema.js';
import { maquetarPantalla } from '../src/motor/Maquetacion.js';

const RAIZ = new URL('../', import.meta.url);
const narrativas = [1, 2, 3, 4, 5, 6].map(n => JSON.parse(readFileSync(new URL(`assets/narrativa/nivel${n}.json`, RAIZ), 'utf8')));

test('la pregunta, la conclusión y el informe extremos parten de los más largos de los seis niveles', () => {
    const c = contenidoExtremo(narrativas);
    const preguntas = narrativas.flatMap(n => (n.deduccion?.preguntas || []).map(q => q.texto));
    const opciones = narrativas.flatMap(n => (n.deduccion?.preguntas || []).flatMap(q => q.opciones.map(o => o.texto)));
    assert.equal(c.preguntaReal.length, Math.max(...preguntas.map(t => t.length)));
    assert.equal(c.conclusionReal.length, Math.max(...opciones.map(t => t.length)));
    assert.equal(c.informeReal.length, Math.max(...narrativas.map(n => n.informe.length)));
    assert.ok(preguntas.includes(c.preguntaReal) && opciones.includes(c.conclusionReal), 'son textos reales: no se inventa nada');
    // y la carga los repite para llegar al límite
    assert.equal(c.pregunta, textoRepetido(c.preguntaReal, CARGA.vecesPregunta));
    assert.equal(c.conclusion, textoRepetido(c.conclusionReal, CARGA.vecesConclusion));
    assert.equal(c.informe, textoRepetido(c.informeReal, CARGA.vecesInforme));
    assert.ok(c.informe.length > 3 * c.informeReal.length);
});

test('la libreta extrema tiene 25 pruebas y 10 pistas con textos largos, con ids distintos', () => {
    const c = contenidoExtremo(narrativas);
    const h = hallazgosExtremos(c);
    assert.equal(h.filter(x => x.tipo === 'prueba').length, CARGA.pruebas);
    assert.equal(h.filter(x => x.tipo === 'pista').length, CARGA.pistas);
    assert.equal(new Set(h.map(x => x.id)).size, h.length);
    for (const p of h.filter(x => x.tipo === 'pista')) assert.ok(p.texto.length >= 3 * c.textoDePista.length);
});

test('textoRepetido repite el texto las veces pedidas', () => {
    assert.equal(textoRepetido('ab', 3), 'ab ab ab');
});

test('con la carga extrema, una pantalla de la libreta sigue sin salirse: el cuerpo se desplaza y el pie queda a la vista', () => {
    const c = contenidoExtremo(narrativas);
    const filas = hallazgosExtremos(c).map((h, i) => ({ id: `h${i}`, alto: h.tipo === 'pista' ? 66 + 14 * Math.ceil(h.texto.length / 90) : 42 }));
    const p = maquetarPantalla({
        caja: { x: 140, y: 40, ancho: 1000, alto: 640 },
        cabecera: [{ id: 'cab', alto: 18 }, { id: 'pregunta', alto: 120, cede: true }, { id: 'conclusion', alto: 60 }, { id: 'instruccion', alto: 20 }],
        cuerpo: filas, pie: [{ id: 'botones', alto: 52 }, { id: 'ayuda', alto: 28 }]
    });
    assert.ok(p.ok);
    assert.equal(p.zona.desplazable, true);
    assert.ok(p.colocados.ayuda.y + p.colocados.ayuda.alto <= 640 + 40);
});

test('un cuerpo corto se puede centrar en su zona; uno largo siempre empieza arriba', () => {
    const caja = { x: 340, y: 170, ancho: 600, alto: 380 };
    const corto = maquetarPantalla({ caja, cabecera: [{ id: 't', alto: 38 }], cuerpo: [{ id: 'a', alto: 60 }], pie: [{ id: 'p', alto: 14 }], centrarCuerpo: true });
    const pegado = maquetarPantalla({ caja, cabecera: [{ id: 't', alto: 38 }], cuerpo: [{ id: 'a', alto: 60 }], pie: [{ id: 'p', alto: 14 }] });
    assert.equal(pegado.cuerpo.a.y, 0);
    assert.equal(corto.cuerpo.a.y, (corto.zona.alto - 60) / 2);
    const largo = maquetarPantalla({ caja, cuerpo: [{ id: 'a', alto: 900 }], pie: [{ id: 'p', alto: 14 }], centrarCuerpo: true });
    assert.equal(largo.cuerpo.a.y, 0);
});
