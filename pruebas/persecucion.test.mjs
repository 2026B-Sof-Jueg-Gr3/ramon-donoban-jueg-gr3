// La persecución del nivel 5 (src/motor/Persecucion.js): determinista, se puede ganar y se puede perder de las dos maneras.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import Persecucion, { PERSECUCION, generador } from '../src/motor/Persecucion.js';

const RUTA = [{ x: 700, y: 340 }, { x: 820, y: 360 }, { x: 760, y: 420 }, { x: 640, y: 380 }];
const SALIDA = { x: 1316, y: 464 };
const ESCONDITES = [{ x: 960, y: 404 }, { x: 1096, y: 292 }];
const nueva = (semilla = 1, config = {}) => new Persecucion({ ruta: RUTA, salida: SALIDA, escondites: ESCONDITES, semilla, config });
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

// Un cono sencillo: ±35° y 520 px de alcance (sin muebles que lo tapen)
const conoDe = (inspector, direccion) => p => {
    const d = dist(inspector, p);
    if (d > 520) return false;
    let delta = Math.atan2(p.y - inspector.y, p.x - inspector.x) - direccion;
    while (delta > Math.PI) delta -= 2 * Math.PI;
    while (delta < -Math.PI) delta += 2 * Math.PI;
    return Math.abs(delta) <= Math.PI / 6 || d < 80;
};

// Un cazador que camina hacia la sombra a 230 px/s y le apunta la linterna (como el jugador del nivel 5)
function cazar(p, { salidaBloqueada = true, chimeneaApagada = false, segundos = 60, inicio = { x: 160, y: 560 }, velocidad = 230, ve = true } = {}) {
    const inspector = { ...inicio };
    const dt = 1 / 60;
    const sucesos = [];
    for (let t = 0; t < segundos; t += dt) {
        const direccion = Math.atan2(p.pos.y - inspector.y, p.pos.x - inspector.x);
        const d = dist(inspector, p.pos);
        if (d > 60) { inspector.x += Math.cos(direccion) * velocidad * dt; inspector.y += Math.sin(direccion) * velocidad * dt; }
        const s = p.actualizar(dt, { inspector, iluminada: ve ? conoDe(inspector, direccion) : () => false, salidaBloqueada, chimeneaApagada });
        if (s.length) { sucesos.push({ s: s[0], t: Math.round(t * 10) / 10 }); break; }
    }
    return sucesos;
}

test('la persecución es determinista: la misma semilla da la misma sombra, otra semilla puede dar otra', () => {
    const a = nueva(7), b = nueva(7);
    assert.deepEqual(a.pos, b.pos);
    assert.deepEqual(cazar(a), cazar(b));
    assert.notEqual(generador(1)(), generador(2)());
    assert.equal(generador(5)(), generador(5)());
});

test('sin amenaza la sombra recorre su ruta y nunca captura, escapa ni se esconde', () => {
    const p = nueva();
    const lejos = { x: 100, y: 700 };
    for (let t = 0; t < 30; t += 1 / 60) assert.deepEqual(p.actualizar(1 / 60, { inspector: lejos, salidaBloqueada: true, chimeneaApagada: true }), []);
    assert.equal(p.estado, 'ruta');
    assert.ok(RUTA.some(r => dist(r, p.pos) < 200), 'sigue junto a la chimenea');
});

test('con la salida bloqueada y la luz sobre ella a ≤ 150 px durante 1,5 s, la captura sale (se puede ganar)', () => {
    for (const semilla of [1, 2, 3, 4, 5]) {
        const p = nueva(semilla);
        const r = cazar(p, { salidaBloqueada: true, chimeneaApagada: true });
        assert.equal(r[0]?.s, 'captura', `semilla ${semilla}: ${JSON.stringify(r)}`);
        assert.ok(r[0].t < 25, `semilla ${semilla}: tarda ${r[0].t} s`);
    }
});

test('la captura necesita los 1,5 s seguidos: un destello de luz no basta', () => {
    const p = nueva();
    const inspector = { x: 700, y: 440 };
    // 1,2 s a ≤ 150 px y alumbrada: todavía no
    let sucesos = [];
    for (let t = 0; t < 1.2; t += 1 / 60) sucesos.push(...p.actualizar(1 / 60, { inspector, iluminada: () => true, salidaBloqueada: true, chimeneaApagada: true }));
    assert.deepEqual(sucesos, []);
    // sin luz, el tiempo acumulado se pierde (más deprisa de lo que se gana)
    for (let t = 0; t < 1.0; t += 1 / 60) p.actualizar(1 / 60, { inspector, iluminada: () => false, salidaBloqueada: true, chimeneaApagada: true });
    assert.equal(p.captura, 0);
});

test('lejos (más de 150 px) la luz no captura; sin luz tampoco', () => {
    const lejos = nueva();
    const r1 = cazar(lejos, { salidaBloqueada: true, chimeneaApagada: true, velocidad: 0, inicio: { x: 120, y: 380 }, segundos: 20 });
    assert.deepEqual(r1, []);
    const sinLuz = nueva();
    assert.deepEqual(cazar(sinLuz, { salidaBloqueada: true, chimeneaApagada: true, ve: false, segundos: 30 }), []);
});

test('con la salida abierta la sombra escapa por el jardín, y no se puede capturar (se pierde el intento)', () => {
    const p = nueva();
    const r = cazar(p, { salidaBloqueada: false, chimeneaApagada: true });
    assert.equal(r[0]?.s, 'escapo');
    assert.equal(p.estado, 'escapada');
    assert.equal(dist(p.pos, SALIDA) <= PERSECUCION.llegada + 1, true);
});

test('con la salida bloqueada la sombra se esconde en el escondite más lejano del inspector', () => {
    const p = nueva();
    const inspector = { x: 700, y: 440 };
    for (let t = 0; t < 4; t += 1 / 60) p.actualizar(1 / 60, { inspector, iluminada: () => false, salidaBloqueada: true, chimeneaApagada: true });
    assert.ok(['huir', 'escondida'].includes(p.estado));
    assert.ok(ESCONDITES.some(e => dist(e, p.pos) < 30), 'está en un escondite');
    // si el inspector se acerca a ese escondite, se cambia al otro
    for (let t = 0; t < 1.5 && p.estado !== 'escondida'; t += 1 / 60) p.actualizar(1 / 60, { inspector, iluminada: () => false, salidaBloqueada: true, chimeneaApagada: true });
    const donde = ESCONDITES.find(e => dist(e, p.pos) < 30);
    const otro = ESCONDITES.find(e => e !== donde);
    const cerca = { x: donde.x - 60, y: donde.y + 20 };
    for (let t = 0; t < 4; t += 1 / 60) p.actualizar(1 / 60, { inspector: cerca, iluminada: () => false, salidaBloqueada: true, chimeneaApagada: true });
    assert.ok(dist(p.pos, otro) < dist(p.pos, donde), 'ahora está en el otro');
});

test('si la dejan en paz un rato vuelve a su ruta (y otra vez huye si se la molesta)', () => {
    const p = nueva();
    const cerca = { x: 700, y: 440 }, lejos = { x: 100, y: 700 };
    for (let t = 0; t < 3; t += 1 / 60) p.actualizar(1 / 60, { inspector: cerca, iluminada: () => false, salidaBloqueada: true, chimeneaApagada: true });
    assert.ok(['huir', 'escondida'].includes(p.estado));
    for (let t = 0; t < 10; t += 1 / 60) p.actualizar(1 / 60, { inspector: lejos, iluminada: () => false, salidaBloqueada: true, chimeneaApagada: true });
    assert.equal(p.estado, 'ruta');
});

test('si la salida se bloquea mientras corre hacia ella, cambia de rumbo y se esconde', () => {
    const p = nueva();
    const inspector = { x: 700, y: 440 };
    for (let t = 0; t < 1; t += 1 / 60) p.actualizar(1 / 60, { inspector, iluminada: () => true, salidaBloqueada: false, chimeneaApagada: true });
    assert.equal(p.estado, 'huir');
    assert.equal(p.objetivo, SALIDA);
    p.actualizar(1 / 60, { inspector, iluminada: () => true, salidaBloqueada: true, chimeneaApagada: true });
    assert.ok(ESCONDITES.includes(p.objetivo));
});

test('los papeles se queman a los 60 s (configurable) si la chimenea sigue encendida; apagada a tiempo, no', () => {
    const p = nueva();
    const lejos = { x: 100, y: 700 };
    let sucesos = [];
    for (let t = 0; t < 59.5; t += 1 / 60) sucesos.push(...p.actualizar(1 / 60, { inspector: lejos, salidaBloqueada: true, chimeneaApagada: false }));
    assert.deepEqual(sucesos, [], 'a los 59,5 s todavía no');
    for (let t = 0; t < 1; t += 1 / 60) sucesos.push(...p.actualizar(1 / 60, { inspector: lejos, salidaBloqueada: true, chimeneaApagada: false }));
    assert.deepEqual(sucesos, ['papeles']);
    assert.equal(p.estado, 'perdida');
    // otro tiempo
    const corta = nueva(1, { segundosDeLosPapeles: 10 });
    let s2 = [];
    for (let t = 0; t < 11; t += 1 / 60) s2.push(...corta.actualizar(1 / 60, { inspector: lejos, salidaBloqueada: true }));
    assert.deepEqual(s2, ['papeles']);
    // apagada: no se queman nunca
    const apagada = nueva();
    for (let t = 0; t < 200; t += 1 / 60) assert.deepEqual(apagada.actualizar(1 / 60, { inspector: lejos, salidaBloqueada: true, chimeneaApagada: true }), []);
});

test('el tiempo no corre mientras no está activo (pausas narrativas, libreta, pausa)', () => {
    const p = nueva();
    const lejos = { x: 100, y: 700 };
    for (let t = 0; t < 120; t += 1 / 60) assert.deepEqual(p.actualizar(1 / 60, { activo: false, inspector: lejos, salidaBloqueada: true }), []);
    assert.equal(p.quemado, 0);
    assert.equal(p.tiempo, 0);
});

test('el reintento: la sombra vuelve a su ruta y el tiempo a cero; lo logrado lo guarda quien llama', () => {
    const p = nueva();
    const lejos = { x: 100, y: 700 };
    for (let t = 0; t < 61; t += 1 / 60) p.actualizar(1 / 60, { inspector: lejos, salidaBloqueada: true });
    assert.equal(p.estado, 'perdida');
    p.reiniciar();
    assert.equal(p.estado, 'ruta');
    assert.equal(p.quemado, 0);
    assert.equal(p.tiempo, 0);
    assert.equal(p.captura, 0);
    assert.equal(p.intentos, 1);
    assert.deepEqual(p.actualizar(1 / 60, { inspector: lejos, salidaBloqueada: true }), [], 'y vuelve a empezar');
    // terminada → no hay más sucesos hasta reiniciar
    const q = nueva();
    cazar(q, { salidaBloqueada: true, chimeneaApagada: true });
    assert.equal(q.estado, 'capturada');
    assert.deepEqual(q.actualizar(1 / 60, { inspector: { x: 0, y: 0 }, iluminada: () => true, salidaBloqueada: true }), []);
});

test('la sombra es más lenta que el inspector (230 px/s): se la puede alcanzar', () => {
    assert.ok(PERSECUCION.velocidadDeHuida < 230);
    assert.equal(PERSECUCION.segundosDeCaptura, 1.5);
    assert.equal(PERSECUCION.alcanceDeCaptura, 150);
    assert.equal(PERSECUCION.segundosDeLosPapeles, 60);
});

test('una persecución mal armada se rechaza', () => {
    assert.throws(() => new Persecucion({ ruta: [], salida: SALIDA, escondites: ESCONDITES }));
    assert.throws(() => new Persecucion({ ruta: RUTA, salida: null, escondites: ESCONDITES }));
    assert.throws(() => new Persecucion({ ruta: RUTA, salida: SALIDA, escondites: [] }));
});

test('la luz desde muy lejos (más de 400 px) no la espanta; desde cerca sí', () => {
    const lejos = nueva();
    const inspector = { x: 170, y: 560 };          // a ≈ 600 px de la ruta
    for (let t = 0; t < 10; t += 1 / 60) lejos.actualizar(1 / 60, { inspector, iluminada: () => true, salidaBloqueada: false, chimeneaApagada: true });
    assert.equal(lejos.estado, 'ruta');
    const cerca = nueva();
    for (let t = 0; t < 1; t += 1 / 60) cerca.actualizar(1 / 60, { inspector: { x: 500, y: 500 }, iluminada: () => true, salidaBloqueada: false, chimeneaApagada: true });
    assert.equal(cerca.estado, 'huir');
});
