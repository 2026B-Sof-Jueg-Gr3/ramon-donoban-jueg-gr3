// Geometría y visibilidad de la linterna: polígono de visibilidad, cono, sombras y qué ilumina la luz
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    normalizarAngulo, diferenciaDeAngulos, distanciaARectangulo, distanciaASegmento, puntosDeMuestra
} from '../src/motor/Geometria.js';
import {
    distanciaDeRayo, poligonoDeVisibilidad, puntoEnPoligono, puntoEnCono, estaIluminado, rectanguloIluminado,
    factorAngular, caidaDeLuz, intensidadDeCono, CONO_DE_LINTERNA
} from '../src/motor/Visibilidad.js';
import { segmentosDeRectangulo } from '../src/motor/Mapa.js';

const O = { x: 0, y: 0 };
const muro = { ax: 100, ay: -50, bx: 100, by: 50 };          // pared vertical delante del origen
const cerca = (a, b, tolerancia = 1e-6, mensaje = '') => assert.ok(Math.abs(a - b) <= tolerancia, `${mensaje} ${a} no es ≈ ${b}`);

// ── Geometría ───────────────────────────────────────────────────────────────

test('los ángulos se normalizan a [-π, π) y la diferencia toma el camino más corto', () => {
    cerca(normalizarAngulo(0.5), 0.5);
    cerca(normalizarAngulo(3 * Math.PI), -Math.PI);
    cerca(normalizarAngulo(-3 * Math.PI), -Math.PI);
    cerca(normalizarAngulo(2 * Math.PI + 0.3), 0.3);
    cerca(diferenciaDeAngulos(-3, 3), 2 * Math.PI - 6, 1e-9, 'cruzar ±π');
    cerca(diferenciaDeAngulos(3, -3), 6 - 2 * Math.PI, 1e-9);
});

test('distancias a rectángulos y segmentos', () => {
    const r = { x: 10, y: 10, ancho: 20, alto: 10 };
    assert.equal(distanciaARectangulo({ x: 15, y: 15 }, r), 0, 'dentro');
    assert.equal(distanciaARectangulo({ x: 0, y: 15 }, r), 10, 'a la izquierda');
    cerca(distanciaARectangulo({ x: 33, y: 24 }, r), 5, 1e-9, 'diagonal 3-4-5');
    assert.equal(distanciaASegmento({ x: 5, y: 3 }, { ax: 0, ay: 0, bx: 10, by: 0 }), 3);
    assert.equal(distanciaASegmento({ x: 14, y: 3 }, { ax: 0, ay: 0, bx: 10, by: 0 }), 5, 'más allá del extremo');
});

test('puntos de muestra: nueve, dentro del rectángulo, incluso si es muy pequeño', () => {
    const r = { x: 100, y: 200, ancho: 80, alto: 40 };
    const puntos = puntosDeMuestra(r, 4);
    assert.equal(puntos.length, 9);
    for (const p of puntos) assert.ok(p.x >= r.x && p.x <= r.x + r.ancho && p.y >= r.y && p.y <= r.y + r.alto);
    assert.deepEqual(puntos[4], { x: 140, y: 220 }, 'el del medio es el centro');
    for (const p of puntosDeMuestra({ x: 0, y: 0, ancho: 4, alto: 4 }, 10)) assert.deepEqual(p.x, p.x >= 0 && p.x <= 4 ? p.x : NaN);
});

// ── Rayos ───────────────────────────────────────────────────────────────────

test('un rayo devuelve la distancia al primer segmento y su índice; sin nada, llega al radio', () => {
    assert.deepEqual(distanciaDeRayo(O, 0, [muro], 500), { distancia: 100, segmento: 0 });
    assert.deepEqual(distanciaDeRayo(O, Math.PI, [muro], 500), { distancia: 500, segmento: -1 }, 'de espaldas al muro');
    assert.deepEqual(distanciaDeRayo(O, Math.atan2(60, 100), [muro], 500), { distancia: 500, segmento: -1 }, 'pasa por encima del muro');
    const cercano = { ax: 50, ay: -50, bx: 50, by: 50 };
    assert.deepEqual(distanciaDeRayo(O, 0, [muro, cercano], 500), { distancia: 50, segmento: 1 }, 'gana el más cercano');
    assert.deepEqual(distanciaDeRayo(O, 0, [{ ax: 0, ay: 10, bx: 200, by: 10 }], 500), { distancia: 500, segmento: -1 }, 'paralelo');
});

// ── Polígono de visibilidad ─────────────────────────────────────────────────

test('sin bloqueadores el polígono es un círculo del radio pedido, ordenado por ángulo', () => {
    const poligono = poligonoDeVisibilidad(O, [], 500);
    assert.ok(poligono.length >= Math.floor((2 * Math.PI) / 0.05));
    for (const v of poligono) { cerca(v.distancia, 500); assert.equal(v.segmento, -1); assert.ok(Number.isFinite(v.x) && Number.isFinite(v.y)); }
    for (let i = 1; i < poligono.length; i++) assert.ok(poligono[i].angulo > poligono[i - 1].angulo, 'orden estrictamente creciente');
    assert.equal(puntoEnPoligono({ x: 499 * Math.SQRT1_2, y: 499 * Math.SQRT1_2 }, poligono), true);
    assert.equal(puntoEnPoligono({ x: 505, y: 0 }, poligono), false);
    assert.equal(puntoEnPoligono(O, poligono), true);
});

test('un muro proyecta sombra: lo de detrás no se ve, lo de los lados sí', () => {
    const poligono = poligonoDeVisibilidad(O, [muro], 500);
    assert.equal(puntoEnPoligono({ x: 50, y: 0 }, poligono), true, 'delante del muro');
    assert.equal(puntoEnPoligono({ x: 150, y: 0 }, poligono), false, 'justo detrás');
    assert.equal(puntoEnPoligono({ x: 150, y: 20 }, poligono), false, 'detrás, algo desviado');
    assert.equal(puntoEnPoligono({ x: 150, y: 150 }, poligono), true, 'pasado el extremo del muro (45°)');
    assert.equal(puntoEnPoligono({ x: 150, y: -150 }, poligono), true);
    assert.equal(puntoEnPoligono({ x: -150, y: 0 }, poligono), true, 'a la espalda');
});

test('en el extremo de un muro hay un vértice sobre el muro y otro libre justo después (borde de sombra recto)', () => {
    const poligono = poligonoDeVisibilidad(O, [muro], 500);
    const anguloDelExtremo = Math.atan2(50, 100);
    const sobreElMuro = poligono.find(v => v.segmento === 0 && Math.abs(v.angulo - anguloDelExtremo) < 1e-3);
    assert.ok(sobreElMuro, 'vértice en el extremo del muro');
    cerca(sobreElMuro.x, 100, 0.1); cerca(sobreElMuro.y, 50, 0.1);
    const libre = poligono.find(v => v.segmento === -1 && v.angulo > anguloDelExtremo && v.angulo - anguloDelExtremo < 1e-3);
    assert.ok(libre, 'vértice libre justo después');
    cerca(libre.distancia, 500);
});

test('un mueble alto (cuatro lados) tapa lo que hay detrás y no lo que queda a sus lados', () => {
    const caja = segmentosDeRectangulo({ x: 200, y: -40, ancho: 100, alto: 80 });
    const poligono = poligonoDeVisibilidad(O, caja, 600);
    assert.equal(puntoEnPoligono({ x: 150, y: 0 }, poligono), true, 'antes del mueble');
    assert.equal(puntoEnPoligono({ x: 250, y: 0 }, poligono), false, 'dentro del mueble');
    assert.equal(puntoEnPoligono({ x: 400, y: 0 }, poligono), false, 'detrás');
    assert.equal(puntoEnPoligono({ x: 400, y: 100 }, poligono), true, 'a un lado, a 14°');
});

test('los índices de segmento son los del arreglo original y los segmentos lejanos no cambian el polígono', () => {
    const lejano = { ax: 5000, ay: -50, bx: 5000, by: 50 };
    const solo = poligonoDeVisibilidad(O, [muro], 500);
    const con = poligonoDeVisibilidad(O, [lejano, muro], 500);
    assert.equal(con.length, solo.length);
    assert.ok(con.some(v => v.segmento === 1), 'el muro es el índice 1');
    assert.ok(!con.some(v => v.segmento === 0), 'el lejano nunca se golpea');
    for (let i = 0; i < solo.length; i++) { cerca(con[i].x, solo[i].x, 1e-9); cerca(con[i].y, solo[i].y, 1e-9); }
});

test('los ángulos extra añaden vértices en esos ángulos exactos', () => {
    const extra = [0.1, 0.2, 0.3];
    const poligono = poligonoDeVisibilidad(O, [], 500, extra);
    for (const a of extra) assert.ok(poligono.some(v => Math.abs(v.angulo - a) < 1e-9), `ángulo ${a}`);
});

// ── Cono e iluminación ──────────────────────────────────────────────────────

const luz = { origen: O, direccion: 0, semiangulo: 0.5, suavizado: 0.2, alcance: 300 };

test('el cono respeta el alcance, el ángulo y el cruce de ±π', () => {
    assert.equal(puntoEnCono({ x: 100, y: 0 }, luz), true);
    assert.equal(puntoEnCono({ x: 100, y: 40 }, luz), true, '≈21°');
    assert.equal(puntoEnCono({ x: 100, y: 60 }, luz), false, '≈31°');
    assert.equal(puntoEnCono({ x: 400, y: 0 }, luz), false, 'más allá del alcance');
    assert.equal(puntoEnCono({ x: -100, y: 0 }, luz), false, 'a la espalda');
    assert.equal(puntoEnCono(O, luz), true);
    const haciaAtras = { ...luz, direccion: Math.PI };
    assert.equal(puntoEnCono({ x: -100, y: -10 }, haciaAtras), true, 'apuntando a 180°, justo debajo del eje');
    assert.equal(puntoEnCono({ x: -100, y: 10 }, haciaAtras), true, 'y justo encima');
    assert.equal(puntoEnCono({ x: 100, y: 0 }, haciaAtras), false);
});

test('iluminado = dentro del cono y visible: un muro corta la luz aunque el punto esté en el cono', () => {
    const poligono = poligonoDeVisibilidad(O, [muro], 300);
    assert.equal(estaIluminado({ x: 50, y: 0 }, luz, poligono), true);
    assert.equal(estaIluminado({ x: 150, y: 0 }, luz, poligono), false, 'en el cono pero tapado');
    assert.equal(estaIluminado({ x: 150, y: 150 }, luz, poligono), false, 'visible pero fuera del cono');
});

test('un rectángulo está iluminado si el cono toca alguna parte visible; no si queda del todo tapado o fuera', () => {
    const poligono = poligonoDeVisibilidad(O, [muro], 300);
    assert.equal(rectanguloIluminado({ x: 80, y: -10, ancho: 40, alto: 20 }, luz, poligono), true, 'cruza la línea del muro: su parte delantera se ve');
    assert.equal(rectanguloIluminado({ x: 120, y: -10, ancho: 40, alto: 20 }, luz, poligono), false, 'del todo detrás del muro');
    assert.equal(rectanguloIluminado({ x: 100, y: 200, ancho: 40, alto: 40 }, luz, poligono), false, 'fuera del cono');
    const libre = poligonoDeVisibilidad(O, [], 300);
    assert.equal(rectanguloIluminado({ x: 120, y: -10, ancho: 40, alto: 20 }, luz, libre), true, 'sin muro sí se ve');
});

test('el borde del cono es suave: 1 en el centro, 0,5 en el borde, 0 fuera, sin saltos', () => {
    const { semiangulo, suavizado } = luz;
    assert.equal(factorAngular(0, semiangulo, suavizado), 1);
    cerca(factorAngular(semiangulo, semiangulo, suavizado), 0.5, 1e-9, 'justo en el borde');
    assert.equal(factorAngular(semiangulo + suavizado, semiangulo, suavizado), 0);
    assert.equal(factorAngular(-(semiangulo + suavizado + 0.1), semiangulo, suavizado), 0);
    assert.equal(factorAngular(0.3, semiangulo, suavizado), factorAngular(-0.3, semiangulo, suavizado), 'simétrico');
    let previo = 1;
    for (let d = 0; d <= semiangulo + suavizado; d += 0.005) {
        const f = factorAngular(d, semiangulo, suavizado);
        assert.ok(f <= previo + 1e-12, 'no crece al alejarse del centro');
        assert.ok(previo - f < 0.05, 'sin saltos bruscos');
        previo = f;
    }
});

test('la intensidad cae con la distancia: 1 junto a la linterna, 0 en el alcance', () => {
    assert.equal(caidaDeLuz(0, 300), 1);
    assert.equal(caidaDeLuz(300, 300), 0);
    assert.equal(caidaDeLuz(500, 300), 0);
    let previo = 1;
    for (let d = 0; d <= 300; d += 5) { const c = caidaDeLuz(d, 300); assert.ok(c <= previo); previo = c; }
    assert.ok(caidaDeLuz(150, 300) > 0.2 && caidaDeLuz(150, 300) < 0.6);
    cerca(intensidadDeCono(150, 0, luz), caidaDeLuz(150, 300), 1e-12);
    assert.equal(intensidadDeCono(150, 1.2, luz), 0, 'fuera del cono no hay luz');
});

test('la configuración de la linterna es coherente', () => {
    const c = CONO_DE_LINTERNA;
    assert.ok(Object.isFrozen(c));
    assert.ok(c.radioInterior < c.radioHalo && c.radioHalo < c.alcance);
    assert.ok(c.semiangulo + c.suavizado < Math.PI / 2, 'el cono nunca llega a ser media circunferencia');
    assert.ok(c.suavizado < c.semiangulo);
});
