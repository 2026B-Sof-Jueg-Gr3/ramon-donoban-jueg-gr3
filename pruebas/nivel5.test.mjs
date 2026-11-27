// Nivel 5, La Sombra en la Ventana: cada línea con su disparador, las dependencias (la captura antes de recoger el abrigo y de abrir la puerta),
// los planos DESPUÉS de la revelación 1, la persecución sobre los puntos del mapa (se puede ganar, se puede perder de las dos maneras, el reintento
// conserva lo logrado y el tiempo no corre en las pausas) y la ayuda. El motor de la persecución se prueba además en persecucion.test.mjs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import Investigacion from '../src/motor/Investigacion.js';
import Libreta from '../src/motor/Libreta.js';
import Ayuda from '../src/motor/Ayuda.js';
import Persecucion from '../src/motor/Persecucion.js';
import { leerJson, cargarMapa } from './ayudasDeMapa.mjs';

const narrativa = leerJson('assets/narrativa/nivel5.json');
const reglas = leerJson('assets/investigaciones/nivel5.json');
const mapa = cargarMapa(5);
const nueva = () => new Investigacion(reglas, narrativa);
const clases = eventos => eventos.map(e => `${e.regla}:${e.clase}`);

test('intro al entrar; las pisadas solo se examinan tras verlas con la luz; el humo y la puerta atrancada dan sus comentarios', () => {
    const inv = nueva();
    assert.deepEqual(clases(inv.entro()), ['intro:importante']);
    assert.deepEqual(clases(inv.examino('n5-pisadas')), [], 'sin verlas con la luz no se examinan');
    inv.ilumino('n5-pisadas');
    assert.deepEqual(clases(inv.examino('n5-pisadas')), ['comentario:0:secundaria']);
    assert.deepEqual(clases(inv.piso('cerca-chimenea')), ['comentario:1:secundaria']);
    assert.deepEqual(clases(inv.piso('cerca-chimenea')), [], 'una sola vez');
    assert.deepEqual(clases(inv.examino('puerta-atrancada')), ['comentario:2:secundaria']);
});

test('cerrar la salida es la revelación 0; apagar la chimenea, la 1 y DESPUÉS los planos (que quedan como pista)', () => {
    const inv = nueva();
    assert.deepEqual(clases(inv.cerro('salida-jardin')), ['revelacion:0:importante']);
    const eventos = inv.apago('chimenea');
    assert.deepEqual(clases(eventos), ['revelacion:1:importante', 'pista:n5-pista-planos:importante'], 'los planos salen después de la revelación');
    assert.equal(eventos[0].texto, narrativa.revelaciones[1]);
    assert.equal(eventos[1].texto, narrativa.pistas.find(p => p.id === 'n5-pista-planos').texto);
    assert.equal(eventos[1].referencia, 'pistas:n5-pista-planos');
    assert.deepEqual(clases(inv.apago('chimenea')), [], 'una sola vez');
});

test('los planos no se pueden perder: salen con la revelación 1 pase lo que pase en la persecución, también después de la captura', () => {
    const inv = nueva();
    inv.capturo();
    assert.deepEqual(clases(inv.apago('chimenea')), ['revelacion:1:importante', 'pista:n5-pista-planos:importante']);
    const libreta = new Libreta({ pruebas: reglas.libreta.pruebas, preguntas: [] }, narrativa, inv, { nivel: 5 });
    assert.ok(libreta.idsEncontrados().includes('n5-pista-planos'));
});

test('los muebles (velas, cuadro, sofá) salen tal cual, secundarios y en cualquier momento', () => {
    const inv = nueva();
    for (const id of ['n5-mueble-sofa', 'n5-mueble-velas', 'n5-mueble-cuadro']) {
        const [e] = inv.examino(id);
        assert.equal(e.texto, narrativa.muebles.find(m => m.id === id).texto);
        assert.equal(e.clase, 'secundaria');
    }
});

test('el abrigo y las pilas solo se recogen tras la captura (y las pilas, tras el abrigo); la puerta al despacho, tras la captura y con la chimenea apagada', () => {
    const inv = nueva();
    assert.equal(inv.puedeActuar('n5-pista-abrigo', 'recoger'), false);
    assert.deepEqual(inv.recogio('n5-pista-abrigo'), []);
    assert.equal(inv.puedeActuar('puerta-despacho', 'abrir'), false);
    inv.capturo();
    assert.equal(inv.puedeActuar('bateria', 'recoger'), false, 'las pilas están en el bolsillo del abrigo');
    assert.deepEqual(clases(inv.recogio('n5-pista-abrigo')), ['pista:n5-pista-abrigo:secundaria']);
    assert.deepEqual(clases(inv.recogio('bateria')), ['bateria:secundaria']);
    assert.equal(inv.puedeActuar('puerta-despacho', 'abrir'), false, 'con la chimenea encendida los planos se perderían: primero se apaga');
    inv.apago('chimenea');
    assert.equal(inv.hayAlgoNuevo('puerta-despacho', 'abrir'), true);
    assert.deepEqual(inv.abrio('puerta-despacho'), [], 'abrir la puerta no cuenta ninguna línea: lleva al informe');
    assert.equal(inv.hayAlgoNuevo('puerta-despacho', 'abrir'), false);
});

test('no hay deducción en este nivel: la captura es la prueba', () => {
    assert.equal(reglas.deduccion, undefined);
    assert.equal(reglas.final.objeto, 'puerta-despacho');
    assert.equal(reglas.final.despuesDelCierre, true);
});

// ── La persecución sobre el mapa real ────────────────────────────────────────

const puntos = tipo => mapa.objetos.filter(o => o.tipo === tipo).sort((a, b) => a.nombre.localeCompare(b.nombre)).map(o => ({ x: o.x, y: o.y }));
const persecucion = (config = {}, semilla = 5) => new Persecucion({ ruta: puntos('ruta'), salida: puntos('salida-sombra')[0], escondites: puntos('escondite'), semilla, config });
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

// Un jugador que va hacia la sombra a 230 px/s apuntándole la luz (sin muebles que la tapen)
function jugar(p, { salidaBloqueada, chimeneaApagada = false, segundos = 70, ve = true, inicio = mapa.inicio, activo = () => true }) {
    const inspector = { ...inicio };
    const sucesos = [];
    for (let t = 0; t < segundos; t += 1 / 60) {
        const d = dist(inspector, p.pos);
        const a = Math.atan2(p.pos.y - inspector.y, p.pos.x - inspector.x);
        if (d > 70) { inspector.x += Math.cos(a) * 230 / 60; inspector.y += Math.sin(a) * 230 / 60; }
        const s = p.actualizar(1 / 60, { activo: activo(t), inspector, iluminada: () => ve && d <= 520, salidaBloqueada, chimeneaApagada });
        if (s.length) sucesos.push({ suceso: s[0], t: Math.round(t * 10) / 10 });
    }
    return sucesos;
}

test('mapa: la ruta, los escondites (sofá y cortina) y la salida al jardín están marcados; la sombra empieza junto a la chimenea', () => {
    assert.equal(puntos('ruta').length, 4);
    assert.equal(puntos('escondite').length, 2);
    assert.equal(puntos('salida-sombra').length, 1);
    const chimenea = mapa.muebles.find(m => m.nombre === 'chimenea');
    for (const r of puntos('ruta')) assert.ok(dist(r, { x: chimenea.x + chimenea.ancho / 2, y: chimenea.y + chimenea.alto }) < 260, 'la ruta es junto a la chimenea');
});

test('se puede GANAR: con la salida cerrada y la luz sobre ella, la captura sale (con varias semillas)', () => {
    for (const semilla of [1, 2, 3, 5, 8]) {
        const r = jugar(persecucion({}, semilla), { salidaBloqueada: true, chimeneaApagada: true });
        assert.equal(r[0]?.suceso, 'captura', `semilla ${semilla}`);
        assert.ok(r[0].t < 30, `tarda ${r[0].t} s`);
    }
});

test('se puede PERDER por la salida: con la salida abierta la sombra escapa por el jardín', () => {
    const r = jugar(persecucion(), { salidaBloqueada: false, chimeneaApagada: true });
    assert.equal(r[0]?.suceso, 'escapo');
});

test('se puede PERDER por los papeles: sin hacer nada, a los 60 s (configurable)', () => {
    const lejos = { x: 100, y: 600 };
    const p = persecucion();
    const r = jugar(p, { salidaBloqueada: false, chimeneaApagada: false, ve: false, inicio: lejos, segundos: 75 }).filter(s => s.suceso === 'papeles');
    // El inspector camina hacia la sombra aunque no la vea: puede hacerla huir por la salida antes; con la salida cerrada solo quedan los papeles
    const q = persecucion();
    const quemados = jugar(q, { salidaBloqueada: true, chimeneaApagada: false, ve: false, inicio: lejos, segundos: 75 }).find(s => s.suceso === 'papeles');
    assert.ok(quemados, 'los papeles se queman');
    assert.ok(quemados.t >= 59.9 && quemados.t <= 60.2, `a los ${quemados.t} s`);
    assert.ok(r.length <= 1);
    const corto = persecucion({ segundosDeLosPapeles: 15 });
    assert.equal(jugar(corto, { salidaBloqueada: true, ve: false, inicio: lejos, segundos: 30 })[0].suceso, 'papeles');
});

test('apagar la chimenea a tiempo evita que los papeles se quemen, por mucho que dure la persecución', () => {
    const p = persecucion();
    const r = jugar(p, { salidaBloqueada: true, chimeneaApagada: true, ve: false, inicio: { x: 100, y: 600 }, segundos: 200 });
    assert.deepEqual(r.filter(s => s.suceso === 'papeles'), []);
});

test('el reintento conserva lo logrado: los hechos de la investigación no se tocan y la persecución vuelve a empezar de cero', () => {
    const inv = nueva();
    inv.entro();
    inv.cerro('salida-jardin'); inv.apago('chimenea'); inv.piso('cerca-chimenea');
    const antes = new Set(inv.hechos);
    const p = persecucion({ segundosDeLosPapeles: 10 });
    jugar(p, { salidaBloqueada: true, chimeneaApagada: false, ve: false, inicio: { x: 100, y: 600 }, segundos: 20 });
    assert.equal(p.estado, 'perdida');
    p.reiniciar();     // lo que hace la escena tras la línea "error"
    assert.equal(p.estado, 'ruta');
    assert.equal(p.tiempo, 0);
    assert.equal(p.quemado, 0);
    assert.equal(p.captura, 0);
    assert.deepEqual([...inv.hechos], [...antes], 'lo ya logrado se conserva');
    assert.deepEqual(clases(inv.cerro('salida-jardin')), [], 'y las líneas ya dichas no se repiten');
});

test('el tiempo no corre durante las pausas narrativas: 100 s en pausa no queman los papeles ni cuentan para el intento', () => {
    const p = persecucion();
    const r = jugar(p, { salidaBloqueada: true, ve: false, inicio: { x: 100, y: 600 }, segundos: 100, activo: () => false });
    assert.deepEqual(r, []);
    assert.equal(p.tiempo, 0);
    assert.equal(p.quemado, 0);
});

test('la ayuda (sin texto) llega a los 15 s: las huellas mientras la salida siga abierta, el humo mientras la chimenea siga encendida', () => {
    assert.equal(reglas.ayuda.espera, 15);
    assert.ok(reglas.ayuda.espera < persecucion().config.segundosDeLosPapeles / 2, 'da tiempo de aprovecharla antes de que se quemen los papeles');
    const inv = nueva();
    const ayuda = new Ayuda(reglas.ayuda, inv);
    assert.equal(ayuda.actualizar(14, {}), null);
    assert.equal(ayuda.actualizar(2, {}).efecto, 'pisadas');
    inv.cerro('salida-jardin');
    assert.equal(ayuda.actualizar(0.1, {}).efecto, 'humo');
    inv.apago('chimenea');
    assert.equal(ayuda.actualizar(0.1, {}), null, 'con todo hecho no queda nada que reforzar');
});

test('el informe cuenta lo recogido tras el cierre: las pilas, los hallazgos extra (velas, cuadro, sofá, abrigo) y no cuenta los planos como extra', () => {
    const inv = nueva();
    const libreta = new Libreta({ pruebas: reglas.libreta.pruebas, preguntas: [], pilas: reglas.libreta.pilas }, narrativa, inv, { nivel: 5 });
    assert.deepEqual(libreta.resumen(), { extras: 0, totalDeExtras: 4, pistas: 0, totalDePistas: 2, pilas: false });
    inv.capturo(); inv.apago('chimenea'); inv.recogio('n5-pista-abrigo'); inv.recogio('bateria');
    assert.deepEqual(libreta.resumen(), { extras: 1, totalDeExtras: 4, pistas: 2, totalDePistas: 2, pilas: true });
});

// ── «Ahí estás...»: la primera vez que la luz da en la sombra ─────────────────
// Con el código de la habitación (Sombra.actualizar) y la persecución de verdad; la escena y los dibujos, simulados.

const { default: Sombra } = await import('../src/presentacion/habitaciones/Sombra.js');
const dibujo = () => { const o = { alpha: 0, setAlpha(a) { o.alpha = a; return o; }, setPosition() { return o; }, setDepth() { return o; }, setScale() { return o; } }; return o; };

function habitacionDeLaSombra({ luz = true } = {}) {
    const inv = nueva();
    inv.entro();
    const dichas = [];
    const escena = {
        fase: 'investigando', inspector: { pies: { ...mapa.inicio } }, investigacion: inv, contar: eventos => dichas.push(...eventos),
        events: { emit() { } }, cerrarNivel() { }, fallar: reintentar => reintentar()
    };
    const sombra = new Sombra(escena);
    Object.assign(sombra, {
        persecucion: persecucion(), imagen: dibujo(), reborde: dibujo(), llama: [dibujo(), dibujo()], humo: [], huellas: [], despues: [],
        chimenea: { x: 600, y: 300 }, luz
    });
    sombra.iluminada = () => sombra.luz;
    const cuadros = (n, opciones) => { for (let i = 0; i < n; i++) sombra.actualizar(1 / 60, i * 1000 / 60, opciones); };
    return { inv, escena, sombra, p: sombra.persecucion, dichas, cuadros };
}

test('«Ahí estás...» sale la primera vez que se ilumina la sombra, como importante y con su texto exacto', () => {
    const { dichas, cuadros } = habitacionDeLaSombra();
    cuadros(1);
    assert.deepEqual(clases(dichas), ['momento:sombra-vista:importante']);
    assert.equal(dichas[0].texto, 'Ahí estás...');
    assert.equal(dichas[0].texto, narrativa.momentos['sombra-vista']);
    assert.equal(dichas[0].categoria, 'momentos');
});

test('«Ahí estás...» no sale si la sombra no se ilumina, ni en pausa, ni cuando ya está capturada o se escapó', () => {
    const aOscuras = habitacionDeLaSombra({ luz: false });
    aOscuras.cuadros(120);
    assert.deepEqual(aOscuras.dichas, []);
    const enPausa = habitacionDeLaSombra();
    enPausa.cuadros(120, { pausado: true });
    assert.deepEqual(enPausa.dichas, []);
    for (const estado of ['capturada', 'escapada']) {
        const h = habitacionDeLaSombra();
        h.p.estado = estado;
        h.cuadros(5);
        assert.deepEqual(h.dichas, [], estado);
    }
});

test('«Ahí estás...» no se repite: ni con la luz encima, ni al perder un intento (reintentar solo reinicia la persecución)', () => {
    const { inv, sombra, p, dichas, cuadros } = habitacionDeLaSombra();
    cuadros(60);
    assert.equal(dichas.length, 1);
    assert.deepEqual(inv.ilumino('sombra'), []);
    sombra.reintentar();
    assert.equal(p.tiempo, 0);
    cuadros(60);
    assert.equal(dichas.length, 1);
});

test('el cuadro en que sale y la pausa narrativa no mueven la sombra ni avanzan los papeles', () => {
    const { sombra, p, dichas, cuadros } = habitacionDeLaSombra({ luz: false });
    cuadros(30);                                    // la persecución ya lleva medio segundo
    const estado = () => ({ pos: { ...p.pos }, quemado: p.quemado, tiempo: p.tiempo });
    const antes = estado();
    assert.ok(antes.quemado > 0.4);
    sombra.luz = true;
    cuadros(1);                                     // sale la línea
    assert.equal(dichas.length, 1);
    assert.deepEqual(estado(), antes, 'ni un cuadro antes de la pausa');
    cuadros(300, { pausado: true });                // leyendo
    assert.deepEqual(estado(), antes);
    cuadros(1);                                     // al cerrar el texto sigue
    assert.ok(p.quemado > antes.quemado);
});

test('la captura sigue exigiendo 1,5 s de luz: el cuadro de «Ahí estás...» no cuenta', () => {
    const { escena, sombra, p, dichas, cuadros } = habitacionDeLaSombra();
    sombra.salidaBloqueada = true;
    sombra.chimeneaApagada = true;
    const pegado = () => { escena.inspector.pies = { ...p.pos }; };
    pegado();
    cuadros(1);
    assert.equal(dichas[0].regla, 'momento:sombra-vista');
    assert.equal(p.captura, 0);
    let n = 0;
    while (p.estado !== 'capturada' && n < 600) { pegado(); cuadros(1); n++; }
    assert.equal(p.estado, 'capturada');
    assert.ok(n >= 90 && n <= 92, `${n} cuadros de luz`);
    assert.equal(p.config.segundosDeCaptura, 1.5);
});
