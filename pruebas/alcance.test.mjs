// El perímetro cercano de las acciones: cerca, de frente y con luz. Funciones puras, sin Phaser (src/motor/Alcance.js).
// Las situaciones del mapa real (detrás de la pila, la franja de la ventana…) están en mapa.test.mjs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { alcanceDeAccion, elegirAccion, zonaDeAccion, ALCANCE_DE_ACCION, SEMIANGULO_DE_FRENTE } from '../src/motor/Alcance.js';
import { zonaIluminada, poligonoDeVisibilidad, CONO_DE_LINTERNA } from '../src/motor/Visibilidad.js';
import { leerMapaTiled, segmentosDeLuz } from '../src/motor/Mapa.js';

const RAIZ = new URL('../', import.meta.url);
const mapa = leerMapaTiled(JSON.parse(readFileSync(new URL('assets/mapas/nivel1.json', RAIZ), 'utf8')));
const grados = g => (g * Math.PI) / 180;
const ESTE = 0, NORTE = -Math.PI / 2, SUR = Math.PI / 2, OESTE = Math.PI;

// Un objeto de 40×40 con su esquina en (100, 100): su zona es el cuadrado de (100,100) a (140,140)
const objeto = (extra = {}, props = {}) => ({ nombre: 'caja', x: 100, y: 100, ancho: 40, alto: 40, props, ...extra });
const zona = (props, extra) => zonaDeAccion(objeto(extra, props));

// ── Las tres condiciones ────────────────────────────────────────────────────

test('lejos → no, aunque mire al objeto y tenga luz', () => {
    const r = alcanceDeAccion({ x: 120, y: 200 }, NORTE, zona(), true);       // a 60 px por debajo
    assert.equal(r.posible, false);
    assert.equal(r.razon, 'lejos');
    assert.equal(r.distancia, 60);
});

test('cerca pero de espaldas → no', () => {
    const r = alcanceDeAccion({ x: 120, y: 160 }, SUR, zona(), true);         // a 20 px por debajo, mirando hacia abajo
    assert.equal(r.posible, false);
    assert.equal(r.razon, 'de-espaldas');
});

test('cerca, de frente y a oscuras → no', () => {
    const r = alcanceDeAccion({ x: 120, y: 160 }, NORTE, zona(), false);
    assert.equal(r.posible, false);
    assert.equal(r.razon, 'a-oscuras');
});

test('cerca, de frente y con luz → sí', () => {
    const r = alcanceDeAccion({ x: 120, y: 160 }, NORTE, zona(), true);
    assert.equal(r.posible, true);
    assert.equal(r.razon, null);
    assert.equal(r.distancia, 20);
    assert.ok(r.desvio < 1e-9);
});

test('la distancia justa: a 40 px sí, a 41 px no (el alcance general)', () => {
    assert.equal(ALCANCE_DE_ACCION, 40);
    assert.equal(alcanceDeAccion({ x: 120, y: 180 }, NORTE, zona(), true).posible, true, 'a 40 px del borde');
    assert.equal(alcanceDeAccion({ x: 120, y: 181 }, NORTE, zona(), true).razon, 'lejos', 'a 41 px');
});

test('cada objeto puede bajar el alcance, pero no superarlo', () => {
    const pies = { x: 120, y: 170 };                                          // a 30 px
    assert.equal(zona({ distancia: 20 }).distancia, 20);
    assert.equal(alcanceDeAccion(pies, NORTE, zona({ distancia: 20 }), true).razon, 'lejos', 'lo baja: a 30 px ya es lejos');
    assert.equal(zona({ distancia: 110 }).distancia, 40, 'no puede superar el general');
    assert.equal(zona({ distancia: 70 }).distancia, 40);
    assert.equal(alcanceDeAccion({ x: 120, y: 200 }, NORTE, zona({ distancia: 110 }), true).razon, 'lejos', 'pedir 110 no amplía nada');
    assert.equal(zona({ distancia: 0 }).distancia, 0);
    assert.equal(zona({ distancia: -5 }).distancia, 0);
    assert.equal(zona({}).distancia, 40);
    // El alcance general es configurable
    assert.equal(zonaDeAccion(objeto(), [], { alcance: 25 }).distancia, 25);
    assert.equal(zonaDeAccion(objeto({}, { distancia: 30 }), [], { alcance: 25 }).distancia, 25);
});

test('de frente es ±60° hacia el objeto: 59° sí, 61° no', () => {
    assert.ok(Math.abs(SEMIANGULO_DE_FRENTE - grados(60)) < 1e-12);
    const pies = { x: 120, y: 160 };                                          // directamente debajo del objeto
    for (const lado of [1, -1]) {
        assert.equal(alcanceDeAccion(pies, NORTE + lado * grados(59), zona(), true).posible, true, `59° a un lado (${lado})`);
        assert.equal(alcanceDeAccion(pies, NORTE + lado * grados(61), zona(), true).razon, 'de-espaldas', `61° (${lado})`);
        assert.equal(alcanceDeAccion(pies, NORTE + lado * grados(90), zona(), true).razon, 'de-espaldas', `90° (${lado})`);
    }
});

test('se mira hacia el punto más cercano del objeto, no hacia su centro (un objeto largo, desde su extremo)', () => {
    // Una cortina de 200 px de ancho; los pies están bajo su extremo oeste. Mirar hacia arriba es mirarla.
    const larga = zonaDeAccion({ nombre: 'larga', x: 100, y: 100, ancho: 200, alto: 20, props: {} });
    assert.equal(alcanceDeAccion({ x: 105, y: 140 }, NORTE, larga, true).posible, true);
    assert.equal(alcanceDeAccion({ x: 105, y: 140 }, ESTE, larga, true).razon, 'de-espaldas', 'mirar a lo largo del muro no es mirarla');
});

test('si los pies están dentro de la zona, se mira hacia su centro; si están encima del centro, no se exige dirección', () => {
    const z = zona();
    assert.equal(alcanceDeAccion({ x: 105, y: 120 }, ESTE, z, true).posible, true, 'dentro, hacia el centro');
    assert.equal(alcanceDeAccion({ x: 105, y: 120 }, OESTE, z, true).razon, 'de-espaldas');
    assert.equal(alcanceDeAccion({ x: 120, y: 120 }, OESTE, z, true).posible, true, 'justo en el centro no hay hacia dónde mirar');
});

test('"iluminado" puede ser un valor o una función, que solo se pregunta si las otras dos condiciones se cumplen', () => {
    let preguntas = 0;
    const luz = () => { preguntas++; return true; };
    assert.equal(alcanceDeAccion({ x: 120, y: 300 }, NORTE, zona(), luz).razon, 'lejos');
    assert.equal(alcanceDeAccion({ x: 120, y: 160 }, SUR, zona(), luz).razon, 'de-espaldas');
    assert.equal(preguntas, 0, 'no se calcula la luz de lo que ya está lejos o a la espalda');
    assert.equal(alcanceDeAccion({ x: 120, y: 160 }, NORTE, zona(), luz).posible, true);
    assert.equal(preguntas, 1);
});

// ── Propiedades del mapa: sobre, mira y luz ─────────────────────────────────

test('un objeto sobre un mueble se usa desde el mueble', () => {
    const consola = { nombre: 'consola', x: 100, y: 100, ancho: 200, alto: 50, props: {} };
    const recorte = { nombre: 'recorte', x: 150, y: 70, ancho: 40, alto: 30, props: { sobre: 'consola' } };
    const z = zonaDeAccion(recorte, [consola]);
    assert.deepEqual(z.huella, { x: 100, y: 100, ancho: 200, alto: 50 });
    assert.equal(alcanceDeAccion({ x: 170, y: 190 }, NORTE, z, true).posible, true, 'a 40 px del borde frontal de la consola');
    assert.equal(alcanceDeAccion({ x: 170, y: 192 }, NORTE, z, true).razon, 'lejos');
    assert.deepEqual(z.luz, { x: 150, y: 70, ancho: 40, alto: 30 }, 'pero la luz tiene que tocar el recorte');
    assert.throws(() => zonaDeAccion({ nombre: 'x', x: 0, y: 0, ancho: 1, alto: 1, props: { sobre: 'no-existe' } }, [consola]));
});

test('"mira" fija el punto al que hay que mirar y "luz" la zona que tiene que tocar la luz', () => {
    const z = zona({ mira: '120,0', luz: '100,90,40,6' });
    assert.deepEqual(z.mira, { x: 120, y: 0 });
    assert.deepEqual(z.luz, { x: 100, y: 90, ancho: 40, alto: 6 });
    // Dentro de la zona, mirando hacia el punto de mira (arriba): sí; hacia el lado contrario: no
    assert.equal(alcanceDeAccion({ x: 120, y: 130 }, NORTE, z, true).posible, true);
    assert.equal(alcanceDeAccion({ x: 120, y: 130 }, SUR, z, true).razon, 'de-espaldas');
    assert.throws(() => zona({ mira: '120' }), /mira/);
    assert.throws(() => zona({ luz: '1,2,3' }), /luz/);
    assert.throws(() => zona({ luz: 'a,b,c,d' }), /luz/);
});

// ── Dos objetos cerca ───────────────────────────────────────────────────────

test('dos objetos cerca: gana el que está de frente y más cerca', () => {
    const delante = zonaDeAccion({ nombre: 'delante', x: 100, y: 100, ancho: 40, alto: 20, props: {} });
    const lejosDelante = zonaDeAccion({ nombre: 'lejosDelante', x: 100, y: 60, ancho: 40, alto: 20, props: {} });   // arriba, más lejos
    const detras = zonaDeAccion({ nombre: 'detras', x: 100, y: 150, ancho: 40, alto: 20, props: {} });            // abajo, a la espalda
    const pies = { x: 120, y: 140 };       // entre los tres; 20 px de "delante" hacia arriba y 10 px de "detras" hacia abajo
    const siempre = () => true;
    assert.equal(elegirAccion(pies, NORTE, [detras, lejosDelante, delante], siempre).zona, delante, 'el de frente aunque haya otro más cerca a la espalda');
    assert.equal(elegirAccion(pies, SUR, [delante, detras], siempre).zona, detras, 'si mira hacia abajo, el de abajo');
    assert.equal(elegirAccion(pies, NORTE, [lejosDelante, delante], siempre).zona, delante, 'entre dos de frente, el más cerca');
    assert.equal(elegirAccion(pies, NORTE, [delante, lejosDelante], siempre).zona, delante, 'sin importar el orden');
});

test('dos objetos de frente a la misma distancia: gana el más centrado en la mirada', () => {
    const izquierda = zonaDeAccion({ nombre: 'izq', x: 85, y: 100, ancho: 20, alto: 20, props: {} });
    const derecha = zonaDeAccion({ nombre: 'der', x: 135, y: 100, ancho: 20, alto: 20, props: {} });
    const pies = { x: 120, y: 140 };                 // 20 px por debajo de las dos; una queda 15 px a la izquierda y la otra 15 px a la derecha
    const e = elegirAccion(pies, NORTE - grados(10), [derecha, izquierda], () => true);
    assert.equal(e.zona, izquierda, 'mirando un poco hacia la izquierda, gana la de la izquierda');
});

test('si ninguno es posible, no gana ninguno; un objeto a oscuras no le quita el sitio a otro con luz', () => {
    const a = zonaDeAccion({ nombre: 'a', x: 100, y: 100, ancho: 40, alto: 20, props: {} });
    const b = zonaDeAccion({ nombre: 'b', x: 100, y: 80, ancho: 40, alto: 20, props: {} });
    const pies = { x: 120, y: 140 };
    assert.equal(elegirAccion(pies, NORTE, [a, b], () => false), null);
    assert.equal(elegirAccion(pies, NORTE, [a, b], z => z === b)?.zona, b, 'a (más cerca) está a oscuras: gana b');
    assert.equal(elegirAccion(pies, NORTE, [], () => true), null);
});

// ── Con la linterna ─────────────────────────────────────────────────────────

test('zonaIluminada: una zona delgada junto a una pared se ilumina aunque el cono ahí sea muy estrecho', () => {
    const segmentos = segmentosDeLuz(mapa);
    const origen = { x: 1984, y: 270 };              // 14 px del muro norte; apuntando hacia él
    const luz = { origen, direccion: NORTE, semiangulo: CONO_DE_LINTERNA.semiangulo, alcance: CONO_DE_LINTERNA.alcance };
    const poligono = poligonoDeVisibilidad(origen, segmentos, luz.alcance);
    const alPieDeLaVentana = { x: 1952, y: 257, ancho: 64, alto: 8 };
    assert.equal(zonaIluminada(alPieDeLaVentana, luz, poligono), true);
    assert.equal(zonaIluminada({ x: 1952, y: 257, ancho: 20, alto: 8 }, luz, poligono), false, 'a un lado, el cono recto no llega');
    const haciaAbajo = { ...luz, direccion: SUR };
    assert.equal(zonaIluminada(alPieDeLaVentana, haciaAbajo, poligono), false, 'de espaldas no hay luz sobre ella');
    // El halo (la luz ambiente alrededor del inspector) ilumina lo que está a la vista cerca, aunque el cono no lo toque...
    assert.equal(zonaIluminada(alPieDeLaVentana, haciaAbajo, poligono, 4, CONO_DE_LINTERNA.radioHalo), true);
    assert.equal(zonaIluminada({ x: 1952, y: 257, ancho: 20, alto: 8 }, luz, poligono, 4, CONO_DE_LINTERNA.radioHalo), true);
    // ...pero no lo que queda tapado, ni lo que queda fuera del halo
    const tras = poligonoDeVisibilidad({ x: 1984, y: 330 }, segmentos, CONO_DE_LINTERNA.alcance);
    const detrasDeLaPila = { x: 1936, y: 449, ancho: 96, alto: 8 };               // el suelo delante de la pila, visto desde atrás
    assert.equal(zonaIluminada(detrasDeLaPila, { ...luz, origen: { x: 1984, y: 330 }, direccion: SUR }, tras, 4, CONO_DE_LINTERNA.radioHalo), false, 'la pila lo tapa');
    assert.equal(zonaIluminada({ x: 1952, y: 257, ancho: 64, alto: 8 }, { ...luz, origen: { x: 1000, y: 400 } }, poligonoDeVisibilidad({ x: 1000, y: 400 }, segmentos, CONO_DE_LINTERNA.alcance), 4, CONO_DE_LINTERNA.radioHalo), false, 'lejos');
});

// ── El ícono no aparece sobre lo ya usado ───────────────────────────────────

test('tras la revelación de la ventana, en la franja ya no hay candidato; lo que sigue dando algo no cambia', async () => {
    const { default: Investigacion } = await import('../src/motor/Investigacion.js');
    const reglas = JSON.parse(readFileSync(new URL('assets/investigaciones/nivel1.json', RAIZ), 'utf8'));
    const narrativa = JSON.parse(readFileSync(new URL('assets/narrativa/nivel1.json', RAIZ), 'utf8'));
    const inv = new Investigacion(reglas, narrativa);
    const zonas = [...mapa.interactuables, ...mapa.revelables.filter(o => o.props.accion)].map(o => zonaDeAccion(o, mapa.muebles));
    const segmentos = segmentosDeLuz(mapa);
    // Lo que haría la escena: solo lo que todavía puede dar algo, y cerca, de frente y con luz
    const candidato = (pies, direccion) => {
        const origen = { x: pies.x, y: pies.y - 9 + Math.sin(direccion) * 8 };
        const luz = { origen, direccion, semiangulo: CONO_DE_LINTERNA.semiangulo, alcance: CONO_DE_LINTERNA.alcance };
        const poligono = poligonoDeVisibilidad(origen, segmentos, luz.alcance);
        const posibles = zonas.filter(z => inv.hayAlgoNuevo(z.objeto.props.ref, z.objeto.props.accion, z.objeto.props.lado));
        return elegirAccion(pies, direccion, posibles, z => zonaIluminada(z.luz, luz, poligono, 4, CONO_DE_LINTERNA.radioHalo))?.zona.objeto.nombre ?? null;
    };
    const enLaFranja = { x: 1984, y: 285 };
    assert.equal(candidato(enLaFranja, NORTE), 'mirar-detras', 'antes de mirar la ventana, el ícono aparece');
    inv.miroDetras('pila-de-cajas', 'ventana');
    assert.equal(candidato(enLaFranja, NORTE), null, 'después de la revelación, en la franja ya no hay candidato');
    // Lo que sigue dando algo no cambia: la pila se examina desde el frente
    const alFrente = { x: 1995, y: 478 };
    assert.equal(candidato(alFrente, NORTE), 'examinar-pila');
    inv.examino('pila-de-cajas');
    assert.equal(candidato(alFrente, NORTE), null, 'y una vez examinada, tampoco');
});
