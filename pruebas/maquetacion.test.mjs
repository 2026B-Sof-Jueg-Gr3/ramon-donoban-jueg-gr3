// La maquetación en flujo de todas las pantallas (src/motor/Maquetacion.js), sin Phaser: con 1, 8 y 25 elementos y con
// textos larguísimos no hay solapes, todo queda dentro del recuadro y la zona con desplazamiento aparece solo si hace falta.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    apilar, repartirEnFilas, maquetarPantalla, limitarDesplazamiento, desplazamientoParaVer, indicadores, visibleEnLaZona,
    solapan, contiene, interseccion, encontrarProblemas, ubicarCaja, MINIMO_DE_CUERPO
} from '../src/motor/Maquetacion.js';

const CAJA = { x: 140, y: 40, ancho: 1000, alto: 640 };       // la libreta
const PANTALLA = { x: 0, y: 0, ancho: 1280, alto: 720 };
const FILA = 42;                                                // el alto de una fila de prueba

const filas = (n, alto = FILA, prefijo = 'f') => Array.from({ length: n }, (_, i) => ({ id: `${prefijo}${i}`, alto }));
const rect = c => ({ x: c.x, y: c.y, ancho: c.ancho, alto: c.alto });
const sinSolapes = lista => lista.every((a, i) => lista.every((b, j) => i >= j || !solapan(rect(a), rect(b))));

// Una pantalla de ejemplo: cabecera (título + pregunta), cuerpo (n filas) y pie (botones + ayuda de teclas)
function pantalla(n, { alturaDeFila = FILA, pregunta = 40, hueco } = {}) {
    return maquetarPantalla({
        caja: CAJA, hueco,
        cabecera: [{ id: 'titulo', alto: 20 }, { id: 'pregunta', alto: pregunta, cede: true }],
        cuerpo: filas(n, alturaDeFila),
        pie: [{ id: 'botones', alto: 52 }, { id: 'ayuda', alto: 16 }]
    });
}

// Todo lo que se ve de una pantalla, en coordenadas de pantalla, para un desplazamiento dado
function visibles(p, desplazamiento = 0) {
    const lista = [];
    for (const [id, c] of Object.entries(p.colocados)) lista.push({ id, rect: rect(c), tipo: 'contenido', dentroDe: CAJA });
    for (const [id, c] of Object.entries(p.cuerpo)) {
        const real = { x: p.zona.x + c.x, y: p.zona.y + c.y - desplazamiento, ancho: c.ancho, alto: c.alto };
        const visible = interseccion(real, p.zona);
        if (visible) lista.push({ id, rect: visible, tipo: 'contenido', dentroDe: CAJA });
    }
    return lista;
}

// ── apilar ───────────────────────────────────────────────────────────────────

test('apilar: cada bloque va debajo del anterior, con su alto real y el hueco', () => {
    const r = apilar([{ id: 'a', alto: 30 }, { id: 'b', alto: 100 }, { id: 'c', alto: 7 }], { x: 10, y: 20, ancho: 300, hueco: 12 });
    assert.deepEqual(r.colocados.map(c => [c.id, c.y]), [['a', 20], ['b', 62], ['c', 174]]);
    assert.equal(r.alto, 30 + 12 + 100 + 12 + 7);
    assert.ok(r.colocados.every(c => c.x === 10 && c.ancho === 300));
});

test('apilar: "antes" añade aire por encima y "alinear" mueve el bloque a lo ancho', () => {
    const r = apilar([{ id: 'a', alto: 10 }, { id: 'b', alto: 10, antes: 20, ancho: 100, alinear: 'centro' }, { id: 'c', alto: 10, ancho: 100, alinear: 'derecha' }], { ancho: 300, hueco: 5 });
    assert.equal(r.colocados[1].y, 10 + 5 + 20);
    assert.equal(r.colocados[1].x, 100);
    assert.equal(r.colocados[2].x, 200);
});

test('apilar: una lista vacía mide cero', () => {
    assert.deepEqual(apilar([], { ancho: 100 }), { colocados: [], alto: 0 });
});

// ── repartirEnFilas ──────────────────────────────────────────────────────────

test('repartirEnFilas: dos botones caben en una fila y quedan centrados', () => {
    const r = repartirEnFilas([{ id: 'a', ancho: 320, alto: 52 }, { id: 'b', ancho: 320, alto: 52 }], { x: 100, ancho: 1000, hueco: 24 });
    assert.equal(r.filas, 1);
    assert.equal(r.colocados[0].x, 100 + (1000 - 664) / 2);
    assert.equal(r.colocados[1].x, r.colocados[0].x + 344);
});

test('repartirEnFilas: lo que no cabe pasa a la fila siguiente, sin solapes y dentro del ancho', () => {
    const bloques = Array.from({ length: 7 }, (_, i) => ({ id: `b${i}`, ancho: 230, alto: 52 }));
    const r = repartirEnFilas(bloques, { x: 0, y: 0, ancho: 500, hueco: 20 });
    assert.equal(r.filas, 4);
    assert.ok(sinSolapes(r.colocados));
    assert.ok(r.colocados.every(c => c.x >= 0 && c.x + c.ancho <= 500));
    assert.equal(r.alto, 4 * 52 + 3 * 20);
});

test('repartirEnFilas: botones de distinto alto se centran en su fila', () => {
    const r = repartirEnFilas([{ id: 'a', ancho: 100, alto: 20 }, { id: 'b', ancho: 100, alto: 60 }], { ancho: 300 });
    assert.equal(r.colocados[0].y, 20);
    assert.equal(r.colocados[1].y, 0);
});

// ── maquetarPantalla ─────────────────────────────────────────────────────────

for (const n of [1, 8, 25]) {
    test(`maquetarPantalla con ${n} elemento(s): sin solapes y todo dentro del recuadro, en cualquier desplazamiento`, () => {
        const p = pantalla(n);
        assert.ok(p.ok);
        for (let d = 0; d <= p.zona.maximo; d += 17) {
            const lista = visibles(p, d);
            assert.deepEqual(encontrarProblemas(lista, PANTALLA), [], `desplazamiento ${d}`);
            // y nada de lo del cuerpo pisa la cabecera ni el pie
            for (const e of lista) assert.ok(e.rect.y >= p.zona.y - 0.5 && e.rect.y + e.rect.alto <= p.colocados.botones.y || p.colocados[e.id]);
        }
    });
}

test('la zona con desplazamiento aparece solo cuando el contenido no cabe', () => {
    const uno = pantalla(1), ocho = pantalla(8), veinticinco = pantalla(25);
    assert.equal(uno.zona.desplazable, false);
    assert.equal(uno.zona.maximo, 0);
    assert.equal(veinticinco.zona.desplazable, true);
    assert.ok(veinticinco.zona.contenido > veinticinco.zona.alto);
    for (const p of [uno, ocho, veinticinco]) assert.equal(p.zona.desplazable, p.zona.contenido > p.zona.alto + 1, 'desplazable ⇔ no cabe');
    // un contenido que cabe justo no la necesita; con unos píxeles de más, sí
    const justo = maquetarPantalla({ caja: CAJA, cuerpo: [{ id: 'x', alto: 530 }], pie: [{ id: 'p', alto: 50 }] });
    assert.equal(justo.zona.alto, 530);
    assert.equal(justo.zona.desplazable, false);
    const mas = maquetarPantalla({ caja: CAJA, cuerpo: [{ id: 'x', alto: 540 }], pie: [{ id: 'p', alto: 50 }] });
    assert.equal(mas.zona.desplazable, true);
});

test('la cabecera y el pie no se mueven por mucho que crezca el cuerpo', () => {
    const a = pantalla(1), b = pantalla(8), c = pantalla(25);
    for (const id of ['titulo', 'pregunta', 'botones', 'ayuda']) {
        assert.deepEqual(a.colocados[id], b.colocados[id], id);
        assert.deepEqual(a.colocados[id], c.colocados[id], id);
    }
    assert.deepEqual(a.zona.y, c.zona.y);
    assert.deepEqual(a.zona.alto, c.zona.alto);
});

test('el pie queda pegado abajo y la ayuda de teclas es lo último, siempre dentro del recuadro', () => {
    const p = pantalla(25);
    const ayuda = p.colocados.ayuda, botones = p.colocados.botones;
    assert.ok(ayuda.y > botones.y + botones.alto);
    assert.ok(ayuda.y + ayuda.alto <= CAJA.y + CAJA.alto);
    assert.ok(botones.y >= p.zona.y + p.zona.alto);
});

test('con textos muy largos (un bloque mucho más alto que la zona) sigue sin solapes y se puede recorrer entero', () => {
    const p = maquetarPantalla({
        caja: CAJA,
        cabecera: [{ id: 'titulo', alto: 20 }],
        cuerpo: [{ id: 'texto', alto: 2400 }, { id: 'otro', alto: 900 }],
        pie: [{ id: 'botones', alto: 52 }]
    });
    assert.equal(p.zona.contenido, 2400 + 12 + 900);
    assert.equal(p.zona.desplazable, true);
    for (let d = 0; d <= p.zona.maximo; d += 50) assert.deepEqual(encontrarProblemas(visibles(p, d), PANTALLA), []);
    assert.ok(p.zona.maximo + p.zona.alto === p.zona.contenido, 'el último píxel se alcanza');
});

test('una cabecera enorme (la pregunta más larga) cede su bloque al cuerpo en vez de comerse la pantalla', () => {
    const p = pantalla(5, { pregunta: 500 });
    assert.deepEqual(p.movidos, ['pregunta']);
    assert.equal(p.colocados.pregunta, undefined);
    assert.ok(p.cuerpo.pregunta, 'ahora está en la zona con desplazamiento, la primera');
    assert.equal(p.cuerpo.pregunta.y, 0);
    assert.ok(p.zona.alto >= MINIMO_DE_CUERPO);
    for (let d = 0; d <= p.zona.maximo; d += 25) assert.deepEqual(encontrarProblemas(visibles(p, d), PANTALLA), []);
    // con una pregunta normal no se mueve
    assert.deepEqual(pantalla(5, { pregunta: 60 }).movidos, []);
});

test('una pantalla sin cuerpo (el menú de pausa) también se maqueta: pie abajo y nada fuera', () => {
    const p = maquetarPantalla({
        caja: { x: 340, y: 170, ancho: 600, alto: 380 },
        cabecera: [{ id: 'titulo', alto: 38 }],
        cuerpo: [{ id: 'a', alto: 60 }, { id: 'b', alto: 60 }],
        pie: [{ id: 'ayuda', alto: 14 }]
    });
    assert.ok(p.ok);
    assert.equal(p.zona.desplazable, false);
});

test('si ni la cabecera y el pie caben, lo dice (ok = false) en vez de colocar mal', () => {
    const p = maquetarPantalla({ caja: { x: 0, y: 0, ancho: 400, alto: 200 }, cabecera: [{ id: 'a', alto: 150 }], pie: [{ id: 'b', alto: 90 }] });
    assert.equal(p.ok, false);
});

// ── Desplazamiento ───────────────────────────────────────────────────────────

test('limitarDesplazamiento: nunca pasa de los extremos', () => {
    assert.equal(limitarDesplazamiento(-30, 1000, 400), 0);
    assert.equal(limitarDesplazamiento(250, 1000, 400), 250);
    assert.equal(limitarDesplazamiento(9999, 1000, 400), 600);
    assert.equal(limitarDesplazamiento(50, 300, 400), 0, 'si cabe, no hay desplazamiento');
});

test('al mover el foco con el teclado la lista se desplaza sola: el elemento enfocado se ve ENTERO, hacia abajo y hacia arriba', () => {
    const p = pantalla(25);
    const { alto: visible, contenido } = p.zona;
    const items = filas(25).map(f => p.cuerpo[f.id]);
    let d = 0;
    const comprobar = k => {
        d = desplazamientoParaVer(d, visible, contenido, items[k]);
        assert.ok(items[k].y >= d - 1e-9 && items[k].y + items[k].alto <= d + visible + 1e-9, `elemento ${k} entero con desplazamiento ${d}`);
        assert.ok(d >= 0 && d <= p.zona.maximo + 1e-9);
    };
    for (let k = 0; k < 25; k++) comprobar(k);
    assert.equal(d, p.zona.maximo, 'el último queda abajo del todo');
    for (let k = 24; k >= 0; k--) comprobar(k);
    assert.equal(d, 0, 'el primero, arriba del todo');
});

test('desplazamientoParaVer: no se mueve si ya se ve, y con un elemento más alto que la zona enseña su principio', () => {
    assert.equal(desplazamientoParaVer(100, 300, 1000, { y: 150, alto: 40 }), 100);
    assert.equal(desplazamientoParaVer(0, 300, 2000, { y: 500, alto: 900 }), 494);
});

test('indicadores ▲ ▼: solo cuando hay más contenido en esa dirección', () => {
    assert.deepEqual(indicadores(0, 300, 400), { arriba: false, abajo: false });
    assert.deepEqual(indicadores(0, 1000, 400), { arriba: false, abajo: true });
    assert.deepEqual(indicadores(300, 1000, 400), { arriba: true, abajo: true });
    assert.deepEqual(indicadores(600, 1000, 400), { arriba: true, abajo: false });
});

test('visibleEnLaZona: lo que queda del todo fuera no recibe clics', () => {
    assert.equal(visibleEnLaZona(100, 300, { y: 120, alto: 40 }), true);
    assert.equal(visibleEnLaZona(100, 300, { y: 50, alto: 40 }), false);
    assert.equal(visibleEnLaZona(100, 300, { y: 395, alto: 40 }), true, 'a medias también cuenta');
    assert.equal(visibleEnLaZona(100, 300, { y: 405, alto: 40 }), false);
});

// ── El revisor (la parte pura) ───────────────────────────────────────────────

test('encontrarProblemas: detecta dos textos que se encima', () => {
    const p = encontrarProblemas([
        { id: 'a', rect: { x: 10, y: 10, ancho: 100, alto: 20 }, tipo: 'contenido' },
        { id: 'b', rect: { x: 50, y: 20, ancho: 100, alto: 20 }, tipo: 'contenido' }
    ], PANTALLA);
    assert.equal(p.length, 1);
    assert.equal(p[0].tipo, 'solape');
    assert.deepEqual(p[0].rect, { x: 50, y: 20, ancho: 60, alto: 10 });
});

test('encontrarProblemas: dos textos que solo se tocan no son un solape', () => {
    assert.deepEqual(encontrarProblemas([
        { id: 'a', rect: { x: 10, y: 10, ancho: 100, alto: 20 }, tipo: 'contenido' },
        { id: 'b', rect: { x: 10, y: 30, ancho: 100, alto: 20 }, tipo: 'contenido' }
    ], PANTALLA), []);
});

test('encontrarProblemas: lo que sale de la pantalla o de su recuadro es un problema', () => {
    const p = encontrarProblemas([
        { id: 'fuera-de-pantalla', rect: { x: 1200, y: 10, ancho: 100, alto: 20 }, tipo: 'contenido' },
        { id: 'fuera-del-recuadro', rect: { x: 100, y: 100, ancho: 100, alto: 20 }, tipo: 'contenido', dentroDe: { x: 0, y: 0, ancho: 150, alto: 200 } }
    ], PANTALLA);
    assert.deepEqual(p.map(x => [x.tipo, x.a]), [['fuera', 'fuera-de-pantalla'], ['fuera', 'fuera-del-recuadro']]);
});

test('encontrarProblemas: lo de un botón va dentro de su fondo; un texto ajeno sobre el fondo es un solape', () => {
    const fondo = { id: 'fondo', rect: { x: 100, y: 100, ancho: 300, alto: 50 }, tipo: 'control', grupo: 'boton' };
    const suyo = { id: 'etiqueta', rect: { x: 120, y: 110, ancho: 100, alto: 20 }, tipo: 'contenido', grupo: 'boton' };
    assert.deepEqual(encontrarProblemas([fondo, suyo], PANTALLA), []);
    const ajeno = { id: 'otro', rect: { x: 300, y: 110, ancho: 100, alto: 20 }, tipo: 'contenido', grupo: 'otro' };
    assert.deepEqual(encontrarProblemas([fondo, suyo, ajeno], PANTALLA).map(x => [x.tipo, x.a, x.b]), [['solape', 'fondo', 'otro']]);
    const desborda = { id: 'largo', rect: { x: 120, y: 110, ancho: 400, alto: 20 }, tipo: 'contenido', grupo: 'boton' };
    assert.deepEqual(encontrarProblemas([fondo, desborda], PANTALLA).map(x => [x.tipo, x.a]), [['fuera', 'largo']]);
});

test('encontrarProblemas: dos botones que se encima son un solape; uno debajo del otro, no', () => {
    const a = { id: 'a', rect: { x: 100, y: 100, ancho: 300, alto: 50 }, tipo: 'control', grupo: 'a' };
    const b = { id: 'b', rect: { x: 100, y: 140, ancho: 300, alto: 50 }, tipo: 'control', grupo: 'b' };
    assert.equal(encontrarProblemas([a, b], PANTALLA).length, 1);
    assert.deepEqual(encontrarProblemas([a, { ...b, rect: { ...b.rect, y: 162 } }], PANTALLA), []);
});

test('encontrarProblemas: un rectángulo sin área se ignora', () => {
    assert.deepEqual(encontrarProblemas([{ id: 'a', rect: { x: 5000, y: 0, ancho: 0, alto: 0 }, tipo: 'contenido' }], PANTALLA), []);
});

test('el caso que falló: ocho pruebas con dos pistas más altas ya no se encima con "Presentar pruebas"', () => {
    // 6 pruebas de 42 + 2 pistas de 66 (la deducción de la cocina con todo encontrado)
    const altos = [42, 42, 42, 42, 66, 42, 42, 66];
    const p = maquetarPantalla({
        caja: CAJA,
        cabecera: [{ id: 'cab', alto: 18 }, { id: 'pregunta', alto: 34, cede: true }, { id: 'conclusion', alto: 26 }, { id: 'instruccion', alto: 20 }],
        cuerpo: altos.map((alto, i) => ({ id: `p${i}`, alto })),
        pie: [{ id: 'botones', alto: 52 }, { id: 'ayuda', alto: 14 }]
    });
    assert.equal(p.zona.desplazable, true, 'no caben las 8 a la vez: hay zona con desplazamiento');
    for (let d = 0; d <= p.zona.maximo; d += 10) assert.deepEqual(encontrarProblemas(visibles(p, d), PANTALLA), [], `desplazamiento ${d}`);
    assert.ok(p.colocados.botones.y >= p.zona.y + p.zona.alto, '"Presentar pruebas" queda debajo de la zona, siempre visible');
    assert.ok(contiene(CAJA, p.colocados.botones) && contiene(CAJA, p.colocados.ayuda));
});

// ── La caja de los importantes y el panel de tarjetas ────────────────────────

const PANTALLA_DE_JUEGO = { ancho: 1280, alto: 720 };
const CAJA_DE_TEXTO = { alto: 150, margen: 24 };
const PANEL_A_LA_DERECHA = { x: 926, y: 24, ancho: 330, alto: 330, visible: true };
const PANEL_A_LA_IZQUIERDA = { x: 24, y: 24, ancho: 330, alto: 330, visible: true };

test('la caja de los importantes va abajo si el inspector está arriba, y arriba si está abajo', () => {
    assert.equal(ubicarCaja(PANTALLA_DE_JUEGO, CAJA_DE_TEXTO, { ...PANEL_A_LA_DERECHA, visible: false }, 'derecha', 200).y, 720 - 24 - 150);
    assert.equal(ubicarCaja(PANTALLA_DE_JUEGO, CAJA_DE_TEXTO, { ...PANEL_A_LA_DERECHA, visible: false }, 'derecha', 600).y, 24);
});

test('arriba y con tarjetas a la vista, la caja se aparta del panel en el lado libre: nunca se encima', () => {
    for (const [panel, lado] of [[PANEL_A_LA_DERECHA, 'derecha'], [PANEL_A_LA_IZQUIERDA, 'izquierda']]) {
        const caja = ubicarCaja(PANTALLA_DE_JUEGO, CAJA_DE_TEXTO, panel, lado, 600);
        assert.ok(!solapan({ x: caja.x, y: caja.y, ancho: caja.ancho, alto: caja.alto }, { x: panel.x, y: panel.y, ancho: panel.ancho, alto: panel.alto }), `panel a la ${lado}`);
        assert.ok(caja.ancho > 400, 'sigue habiendo sitio para leer');
        assert.ok(contiene({ x: 0, y: 0, ancho: 1280, alto: 720 }, { x: caja.x, y: caja.y, ancho: caja.ancho, alto: caja.alto }));
    }
});

test('abajo, la caja ocupa todo el ancho (el panel está más arriba); sin tarjetas tampoco se aparta', () => {
    const abajo = ubicarCaja(PANTALLA_DE_JUEGO, CAJA_DE_TEXTO, PANEL_A_LA_DERECHA, 'derecha', 200);
    assert.deepEqual(abajo, { x: 0, y: 546, ancho: 1280, alto: 150 });
    const sinTarjetas = ubicarCaja(PANTALLA_DE_JUEGO, CAJA_DE_TEXTO, { ...PANEL_A_LA_DERECHA, visible: false }, 'derecha', 600);
    assert.equal(sinTarjetas.ancho, 1280);
});
