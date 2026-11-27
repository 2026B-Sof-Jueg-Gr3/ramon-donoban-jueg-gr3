// La cocina (nivel 2, "El Fantasma de la Cocina"): reglas, dependencias, deducción, ayuda y mapa. Sin Phaser.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import Investigacion, { validarReglas } from '../src/motor/Investigacion.js';
import Libreta from '../src/motor/Libreta.js';
import Deduccion, { validarDeduccion } from '../src/motor/Deduccion.js';
import Ayuda from '../src/motor/Ayuda.js';
import { golpeCerca, GOLPE } from '../src/motor/Fenomeno.js';
import { desplazarMueble, caminableDeSuelo } from '../src/motor/Mapa.js';
import { CONO_DE_LINTERNA } from '../src/motor/Visibilidad.js';
import { ALCANCE_DE_ACCION } from '../src/motor/Alcance.js';
import {
    leerJson, copia, cargarMapa, solapan, posicionesAlcanzables, accionables, intento, hacia, centroDe,
    zonaDeAccion, distanciaARectangulo, segmentosDeLuz, CUERPO
} from './ayudasDeMapa.mjs';

const narrativa = leerJson('assets/narrativa/nivel2.json');
const reglas = leerJson('assets/investigaciones/nivel2.json');
const nueva = () => new Investigacion(reglas, narrativa);
const ids = eventos => eventos.map(e => e.regla);

// Los sucesos del jugador en la cocina, por nombre
const S = {
    alacena: inv => inv.examino('alacena'),
    rodar: inv => inv.rodo('alacena'),
    mancha: inv => inv.ilumino('n2-mancha-aceite'),
    examinarMancha: inv => inv.examino('n2-mancha-aceite'),
    fuelle: inv => inv.examino('fuelle'),
    tirar: inv => inv.tiro('cuerda'),
    golpeCerca: inv => inv.oyoCerca('alacena'),
    copas: inv => inv.examino('n2-mueble-copas'),
    platos: inv => inv.examino('n2-mueble-platos'),
    sarten: inv => inv.examino('n2-mueble-sarten'),
    recibo: inv => inv.recogio('n2-pista-recibo'),
    taza: inv => inv.recogio('n2-pista-taza'),
    pilas: inv => inv.recogio('bateria')
};
function partida(...sucesos) {
    const inv = nueva();
    for (const s of sucesos) S[s](inv);
    const libreta = new Libreta(reglas.deduccion, narrativa, inv);
    return { inv, libreta, deduccion: new Deduccion(reglas.deduccion, libreta, { azar: () => 0.5 }) };
}
function permutaciones(lista) {
    if (lista.length <= 1) return [lista];
    return lista.flatMap((x, i) => permutaciones([...lista.slice(0, i), ...lista.slice(i + 1)]).map(p => [x, ...p]));
}

// ── Los datos ───────────────────────────────────────────────────────────────

test('las reglas y la deducción de la cocina son válidas y no llevan texto de la historia', () => {
    assert.deepEqual(validarReglas(reglas, narrativa), []);
    assert.deepEqual(validarDeduccion(reglas, narrativa), []);
    assert.doesNotThrow(nueva);
    const contenido = JSON.stringify(reglas);
    const lineas = [narrativa.intro, narrativa.cierre, narrativa.error, narrativa.bateria, narrativa.informe, ...narrativa.comentarios, ...narrativa.revelaciones,
        ...narrativa.muebles.map(m => m.texto), ...narrativa.pistas.flatMap(p => [p.titulo, p.texto]),
        ...Object.values(narrativa.deduccion.pruebas), ...narrativa.deduccion.preguntas.flatMap(q => [q.texto, ...q.opciones.map(o => o.texto)])];
    for (const linea of lineas) assert.ok(!contenido.includes(linea), `el archivo de reglas copia el texto: "${linea.slice(0, 40)}…"`);
});

test('cada línea de la cocina que toca esta fase se usa exactamente una vez; cierre, error e informe quedan fuera de las reglas', () => {
    const usadas = reglas.reglas.map(r => r.texto).sort();
    const esperadas = ['intro', 'bateria', 'comentarios:0', 'comentarios:1', 'comentarios:2', 'revelaciones:0', 'revelaciones:1',
        ...narrativa.muebles.map(m => `muebles:${m.id}`), ...narrativa.pistas.map(p => `pistas:${p.id}`)].sort();
    assert.deepEqual(usadas, esperadas);
    for (const reservada of ['cierre', 'error', 'informe']) assert.ok(!usadas.includes(reservada));
});

// ── Cada línea, con su disparador ───────────────────────────────────────────

test('intro: al entrar, importante', () => {
    const e = nueva().entro();
    assert.deepEqual(ids(e), ['intro']);
    assert.equal(e[0].clase, 'importante');
    assert.equal(e[0].texto, narrativa.intro);
});

test('los comentarios: la alacena, la mancha (solo tras descubrirla) y el golpe oído cerca de la alacena', () => {
    const inv = nueva();
    const [c0] = S.alacena(inv);
    assert.equal(c0.regla, 'comentario:0');
    assert.equal(c0.clase, 'secundaria');
    assert.equal(c0.texto, narrativa.comentarios[0]);
    assert.deepEqual(S.examinarMancha(inv), [], 'sin descubrirla con la luz no se examina');
    assert.deepEqual(ids(S.mancha(inv)), [], 'la mancha no tiene tarjeta propia: al descubrirla no sale ninguna línea');
    const [c1] = S.examinarMancha(inv);
    assert.equal(c1.regla, 'comentario:1');
    assert.equal(c1.texto, narrativa.comentarios[1]);
    const [c2] = S.golpeCerca(inv);
    assert.equal(c2.regla, 'comentario:2');
    assert.equal(c2.clase, 'secundaria');
    assert.equal(c2.texto, narrativa.comentarios[2]);
});

test('las revelaciones: rodar la alacena (tras examinarla) y examinar el fuelle (tras rodarla); las dos importantes', () => {
    const inv = nueva();
    S.alacena(inv);
    const [r0] = S.rodar(inv);
    assert.equal(r0.regla, 'revelacion:0');
    assert.equal(r0.clase, 'importante');
    assert.equal(r0.texto, narrativa.revelaciones[0]);
    const [r1] = S.fuelle(inv);
    assert.equal(r1.regla, 'revelacion:1');
    assert.equal(r1.clase, 'importante');
    assert.equal(r1.texto, narrativa.revelaciones[1]);
});

test('los muebles: examinar cada uno da su texto (secundaria, sin pausa) con su emoji', () => {
    for (const m of narrativa.muebles) {
        const inv = nueva();
        const [e] = inv.examino(m.id);
        assert.equal(e.regla, `mueble:${m.id}`);
        assert.equal(e.clase, 'secundaria');
        assert.equal(e.texto, m.texto);
        assert.equal(e.categoria, 'muebles');
        assert.equal(e.etiqueta, m.emoji);
    }
});

test('las pistas y las pilas: se recogen, con su título y su texto (secundarias, sin pausa)', () => {
    for (const p of narrativa.pistas) {
        const [e] = nueva().recogio(p.id);
        assert.equal(e.regla, `pista:${p.id}`);
        assert.equal(e.clase, 'secundaria');
        assert.equal(e.texto, p.texto);
        assert.equal(e.titulo, p.titulo);
    }
    const [b] = S.pilas(nueva());
    assert.equal(b.regla, 'bateria');
    assert.equal(b.texto, narrativa.bateria);
    assert.equal(b.clase, 'secundaria');
});

test('cada línea sale una sola vez, aunque se repita la acción', () => {
    const inv = nueva();
    for (const s of ['alacena', 'mancha', 'examinarMancha', 'rodar', 'fuelle', 'golpeCerca', 'copas', 'platos', 'sarten', 'recibo', 'taza', 'pilas']) S[s](inv);
    for (const s of ['alacena', 'mancha', 'examinarMancha', 'rodar', 'fuelle', 'golpeCerca', 'copas', 'platos', 'sarten', 'recibo', 'taza', 'pilas']) {
        assert.deepEqual(S[s](inv), [], `${s} otra vez no repite nada`);
    }
    assert.equal(new Set(inv.historial.map(h => h.regla)).size, inv.historial.length);
    assert.equal(inv.historial.length, 11, 'las 11 líneas (intro aparte)');
});

// ── Las dependencias físicas ────────────────────────────────────────────────

test('no se puede rodar la alacena antes de examinarla', () => {
    const inv = nueva();
    assert.equal(inv.puedeActuar('alacena', 'rodar'), false);
    assert.deepEqual(S.rodar(inv), [], 'rodar antes de examinar no hace nada');
    assert.equal(inv.hechos.has('rodo:alacena'), false, 'ni queda como hecho');
    S.alacena(inv);
    assert.equal(inv.puedeActuar('alacena', 'rodar'), true);
    assert.deepEqual(ids(S.rodar(inv)), ['revelacion:0']);
});

test('no se puede examinar la mancha antes de descubrirla con la luz', () => {
    const inv = nueva();
    assert.equal(inv.puedeActuar('n2-mancha-aceite', 'examinar'), false);
    assert.deepEqual(S.examinarMancha(inv), []);
    S.mancha(inv);
    assert.equal(inv.puedeActuar('n2-mancha-aceite', 'examinar'), true);
    assert.deepEqual(ids(S.examinarMancha(inv)), ['comentario:1']);
});

test('el fuelle no se puede usar antes de la revelación 0 (se llega siguiendo la cuerda)', () => {
    const inv = nueva();
    assert.equal(inv.puedeActuar('fuelle', 'examinar'), false);
    assert.deepEqual(S.fuelle(inv), []);
    S.alacena(inv);
    assert.deepEqual(S.fuelle(inv), [], 'examinar la alacena no basta: hay que haberla rodado');
    S.rodar(inv);
    assert.equal(inv.puedeActuar('fuelle', 'examinar'), true);
    assert.deepEqual(ids(S.fuelle(inv)), ['revelacion:1']);
});

test('no se puede tirar de la cuerda antes de las dos revelaciones; después, se puede siempre y no dice nada', () => {
    const inv = nueva();
    assert.equal(inv.puedeActuar('cuerda', 'tirar'), false);
    S.alacena(inv);
    S.rodar(inv);
    assert.equal(inv.puedeActuar('cuerda', 'tirar'), false, 'con una sola revelación no basta');
    assert.deepEqual(S.tirar(inv), []);
    assert.equal(inv.hechos.has('tiro:cuerda'), false);
    S.fuelle(inv);
    assert.equal(inv.puedeActuar('cuerda', 'tirar'), true);
    assert.equal(inv.hayAlgoNuevo('cuerda', 'tirar'), true);
    for (let i = 0; i < 5; i++) {
        assert.deepEqual(S.tirar(inv), [], 'sin texto');
        assert.equal(inv.hayAlgoNuevo('cuerda', 'tirar'), true, 'es opcional y repetible: el ícono sigue');
    }
    // lo demás sí se agota
    assert.equal(inv.hayAlgoNuevo('alacena', 'rodar'), false);
    assert.equal(inv.hayAlgoNuevo('fuelle', 'examinar'), false);
});

// ── oyo-cerca ───────────────────────────────────────────────────────────────

test('oyo-cerca: un golpe lejos de la alacena no dispara nada; uno cerca, sí; y solo una vez', () => {
    const mapa = cargarMapa(2);
    const alacena = mapa.muebles.find(m => m.nombre === 'alacena');
    assert.equal(GOLPE.alcanceDelOido, 120);
    const lejos = { x: 1000, y: 500 }, cerca = { x: 260, y: 400 }, justo = { x: 260, y: 320 + 18 + 82 }, pasado = { x: 260, y: 320 + 18 + 120 };
    const inv = nueva();
    // La escena solo cuenta el suceso cuando el golpe se oye cerca
    const alGolpe = pies => (golpeCerca(pies, alacena) ? inv.oyoCerca('alacena') : []);
    assert.deepEqual(alGolpe(lejos), [], 'lejos de la alacena');
    assert.equal(inv.hechos.has('oyo-cerca:alacena'), false);
    assert.equal(golpeCerca(pasado, alacena), false, 'a 120 px de su borde ya es demasiado lejos para estos pies');
    assert.deepEqual(ids(alGolpe(cerca)), ['comentario:2'], 'cerca de la alacena');
    assert.deepEqual(alGolpe(justo), [], 'otro golpe cerca ya no repite');
    assert.equal(golpeCerca({ x: 260, y: 320 + 120 }, alacena), true, 'a 120 px justos se oye');
});

test('oyo-cerca de un objeto que la habitación no tiene no hace nada', () => {
    assert.deepEqual(nueva().oyoCerca('no-existe'), []);
});

// ── El orden es libre; la causa antes que la consecuencia ───────────────────

test('en cualquier orden, cada línea sale una vez y por su causa (las dependencias se respetan)', () => {
    const sucesos = ['alacena', 'rodar', 'fuelle', 'mancha', 'examinarMancha', 'golpeCerca', 'platos'];
    let ordenes = 0;
    for (const orden of permutaciones(sucesos)) {
        const inv = nueva();
        for (const s of orden) S[s](inv);
        // Con un orden imposible (por ejemplo, rodar antes de examinar) no salen líneas; aquí se repite la lista hasta que todo ocurre
        for (let vuelta = 0; vuelta < sucesos.length; vuelta++) for (const s of orden) S[s](inv);
        const rep = inv.historial.map(h => h.regla);
        assert.equal(new Set(rep).size, rep.length, orden.join(' → '));
        assert.deepEqual([...rep].sort(), ['comentario:0', 'comentario:1', 'comentario:2', 'mueble:n2-mueble-platos', 'revelacion:0', 'revelacion:1'], orden.join(' → '));
        // Una dependencia nunca se salta: la revelación 0 va después del comentario 0, y la 1 después de la 0
        assert.ok(rep.indexOf('comentario:0') < rep.indexOf('revelacion:0'), orden.join(' → '));
        assert.ok(rep.indexOf('revelacion:0') < rep.indexOf('revelacion:1'), orden.join(' → '));
        ordenes++;
    }
    assert.equal(ordenes, 5040);
});

test('ningún suceso produce a la vez una nota y una revelación fuera de orden: la causa sale antes', () => {
    const inv = nueva();
    for (const s of ['alacena', 'rodar', 'fuelle']) {
        const clases = S[s](inv).map(e => e.clase);
        assert.deepEqual([...clases], [...clases].sort((a, b) => ({ ambiental: 0, secundaria: 1, importante: 2 }[a] - { ambiental: 0, secundaria: 1, importante: 2 }[b])));
    }
});

// ── La deducción ────────────────────────────────────────────────────────────

const TODO = () => partida('alacena', 'rodar', 'fuelle', 'mancha', 'examinarMancha', 'golpeCerca', 'copas', 'platos', 'sarten', 'recibo', 'taza', 'pilas');

test('la libreta muestra lo encontrado con sus nombres cortos y los títulos de las pistas', () => {
    assert.deepEqual(partida().libreta.hallazgos(), []);
    const { libreta } = TODO();
    assert.deepEqual(libreta.hallazgos().map(h => h.nombre), [
        'Cuerda al techo', 'Fuelle escondido', 'Alacena con ruedas', 'Platos para dos', 'Copas limpias', 'Sartén con aceite', 'RECIBO DE FERRETERÍA', 'TAZA DE CAFÉ'
    ]);
    assert.deepEqual(libreta.resumen(), { extras: 2, totalDeExtras: 2, pistas: 2, totalDePistas: 2, pilas: true });
});

test('el oráculo: con la conclusión correcta acierta EXACTAMENTE 1 respuesta en cada pregunta: cuerda + fuelle, platos, recibo + taza', () => {
    const ids = TODO().libreta.idsEncontrados();
    assert.equal(ids.length, 8);
    const subconjuntos = [...ids.map(i => [i]), ...ids.flatMap((a, i) => ids.slice(i + 1).map(b => [a, b]))];
    const aciertan = { mecanismo: [], companero: [], responsable: [] };
    for (const q of reglas.deduccion.preguntas) {
        const pertinentes = new Set(q.validas.flat());
        for (const opcion of narrativa.deduccion.preguntas.find(t => t.id === q.id).opciones) {
            for (const pruebas of subconjuntos) {
                const { estado } = TODO().deduccion.responder(q.id, opcion.id, pruebas);
                // Oráculo independiente: conclusión correcta, una combinación completa y ninguna prueba ajena
                const debeAcertar = opcion.id === q.correcta && q.validas.some(c => c.every(p => pruebas.includes(p))) && pruebas.every(p => pertinentes.has(p));
                assert.equal(estado === 'correcta' || estado === 'resuelto', debeAcertar, `${q.id} / ${opcion.id} / ${pruebas}`);
                if (debeAcertar) aciertan[q.id].push([...pruebas].sort().join(' + '));
            }
        }
    }
    assert.deepEqual(aciertan.mecanismo, ['cuerda-al-techo + fuelle-escondido'], 'pregunta 1: una sola respuesta');
    assert.deepEqual(aciertan.companero, ['platos-para-dos'], 'pregunta 3: una sola respuesta');
    assert.deepEqual(aciertan.responsable, ['n2-pista-recibo + n2-pista-taza'], 'pregunta 2: una sola respuesta');
});

test('una pregunta, una sola respuesta: cada pregunta de la cocina tiene UNA combinación válida y ninguna excepción', () => {
    for (const q of reglas.deduccion.preguntas) {
        assert.equal(q.validas.length, 1, `la pregunta "${q.id}" tiene ${q.validas.length} combinaciones`);
        assert.equal(q.excepcion, undefined, `la pregunta "${q.id}" no debería ser una excepción`);
    }
    assert.deepEqual(reglas.deduccion.preguntas.map(q => q.validas), [[['cuerda-al-techo', 'fuelle-escondido']], [['n2-pista-recibo', 'n2-pista-taza']], [['platos-para-dos']]]);
});

test('el recibo y la taza responden JUNTOS la pregunta 2 (¿alguien sigue manejando el fantasma?); solos o en las otras preguntas son error', () => {
    const { deduccion } = TODO();
    const r = 'n2-pista-recibo', t = 'n2-pista-taza';
    assert.equal(deduccion.responder('responsable', 'sigue-viniendo', [r, t]).estado, 'correcta');
    for (const solo of [[r], [t]]) assert.deepEqual(TODO().deduccion.responder('responsable', 'sigue-viniendo', solo), { estado: 'error', motivo: 'pruebas' }, solo.join());
    for (const mala of ['aparato-viejo', 'casa-sola']) assert.deepEqual(TODO().deduccion.responder('responsable', mala, [r, t]), { estado: 'error', motivo: 'conclusion' }, mala);
    // con otra prueba de por medio, error (la cuerda no responde quién lo maneja)
    assert.deepEqual(TODO().deduccion.responder('responsable', 'sigue-viniendo', [r, 'cuerda-al-techo']), { estado: 'error', motivo: 'ajena' });
    // en las otras dos preguntas no valen
    for (const pista of [r, t]) {
        assert.deepEqual(TODO().deduccion.responder('mecanismo', 'poleas-cuerda-fuelle', [pista]), { estado: 'error', motivo: 'ajena' }, pista);
        assert.deepEqual(TODO().deduccion.responder('mecanismo', 'poleas-cuerda-fuelle', [pista, 'cuerda-al-techo']), { estado: 'error', motivo: 'ajena' }, pista);
        assert.deepEqual(TODO().deduccion.responder('companero', 'hay-alguien-mas', [pista]), { estado: 'error', motivo: 'ajena' }, pista);
        assert.deepEqual(TODO().deduccion.responder('companero', 'hay-alguien-mas', [pista, 'platos-para-dos']), { estado: 'error', motivo: 'ajena' }, pista);
    }
    // Cada pista de la cocina responde alguna pregunta: ya no sobra ninguna
    const usadas = new Set(reglas.deduccion.preguntas.flatMap(q => q.validas.flat()));
    for (const pista of narrativa.pistas) assert.ok(usadas.has(pista.id), pista.id);
});

test('las copas, la sartén y la alacena aparecen en la libreta pero no prueban nada: presentarlas es error', () => {
    const { deduccion } = TODO();
    for (const ajena of ['copas-limpias', 'sarten-con-aceite', 'alacena-con-ruedas']) {
        assert.deepEqual(deduccion.responder('companero', 'hay-alguien-mas', [ajena]), { estado: 'error', motivo: 'ajena' }, ajena);
        assert.deepEqual(deduccion.responder('mecanismo', 'poleas-cuerda-fuelle', [ajena, 'cuerda-al-techo']), { estado: 'error', motivo: 'ajena' }, ajena);
        assert.deepEqual(deduccion.responder('mecanismo', 'poleas-cuerda-fuelle', [ajena]), { estado: 'error', motivo: 'ajena' }, ajena);
    }
    // Platos + cualquier otra cosa en la pregunta 2 también es error
    assert.deepEqual(deduccion.responder('companero', 'hay-alguien-mas', ['platos-para-dos', 'n2-pista-taza']), { estado: 'error', motivo: 'ajena' });
    assert.equal(deduccion.resueltas.size, 0);
});

test('la pregunta 1: solo vale cuerda + fuelle; recibo + cuerda, recibo + fuelle, cuerda sola y fuelle solo son error', () => {
    const intento = pruebas => TODO().deduccion.responder('mecanismo', 'poleas-cuerda-fuelle', pruebas);
    assert.deepEqual(intento(['n2-pista-recibo', 'cuerda-al-techo']), { estado: 'error', motivo: 'ajena' }, 'recibo + cuerda');
    assert.deepEqual(intento(['n2-pista-recibo', 'fuelle-escondido']), { estado: 'error', motivo: 'ajena' }, 'recibo + fuelle');
    assert.deepEqual(intento(['cuerda-al-techo']), { estado: 'error', motivo: 'pruebas' }, 'cuerda sola');
    assert.deepEqual(intento(['fuelle-escondido']), { estado: 'error', motivo: 'pruebas' }, 'fuelle solo');
    assert.deepEqual(intento(['n2-pista-recibo']), { estado: 'error', motivo: 'ajena' }, 'recibo solo');
    assert.equal(intento(['cuerda-al-techo', 'fuelle-escondido']).estado, 'correcta', 'cuerda + fuelle');
    // con la conclusión equivocada, error aunque las pruebas sean las buenas
    for (const equivocada of ['viento-chimenea', 'fantasma-ollas']) {
        assert.deepEqual(TODO().deduccion.responder('mecanismo', equivocada, ['cuerda-al-techo', 'fuelle-escondido']), { estado: 'error', motivo: 'conclusion' }, equivocada);
    }
});

test('la deducción está disponible solo con las pruebas de las TRES preguntas: cuerda + fuelle, platos y recibo + taza', () => {
    assert.equal(partida().deduccion.disponible(), false);
    assert.equal(partida('alacena', 'rodar', 'fuelle', 'platos').deduccion.disponible(), false, 'faltan el recibo y la taza');
    assert.equal(partida('alacena', 'rodar', 'fuelle', 'platos', 'recibo').deduccion.disponible(), false, 'falta la taza');
    assert.equal(partida('alacena', 'rodar', 'fuelle', 'platos', 'taza').deduccion.disponible(), false, 'falta el recibo');
    assert.equal(partida('alacena', 'rodar', 'platos', 'recibo', 'taza').deduccion.disponible(), false, 'falta el fuelle');
    assert.equal(partida('alacena', 'rodar', 'fuelle', 'recibo', 'taza').deduccion.disponible(), false, 'faltan los platos');
    assert.equal(partida('alacena', 'rodar', 'fuelle', 'platos', 'recibo', 'taza').deduccion.disponible(), true);
    assert.equal(partida('platos', 'recibo', 'taza').deduccion.disponible(), false);
    assert.equal(partida('alacena', 'rodar', 'fuelle', 'copas', 'sarten', 'recibo', 'taza').deduccion.disponible(), false, 'las copas y la sartén no prueban la pregunta 2');
});

test('la disponibilidad y las respuestas no dependen del orden en que se encontraron las cosas', () => {
    const conjunto = ['alacena', 'rodar', 'fuelle', 'platos', 'recibo', 'taza'];
    const intento = orden => {
        const { deduccion } = partida(...orden);
        return JSON.stringify([deduccion.disponible(),
            deduccion.responder('mecanismo', 'poleas-cuerda-fuelle', ['n2-pista-recibo']),
            deduccion.responder('mecanismo', 'poleas-cuerda-fuelle', ['cuerda-al-techo', 'fuelle-escondido']),
            deduccion.responder('companero', 'hay-alguien-mas', ['platos-para-dos']),
            deduccion.responder('responsable', 'sigue-viniendo', ['n2-pista-recibo', 'n2-pista-taza'])]);
    };
    // 'rodar' solo cuenta si ya se examinó la alacena: se repiten los sucesos hasta que todo ocurre
    const completo = orden => { const inv = nueva(); for (let i = 0; i < 5; i++) for (const s of orden) S[s](inv); return inv; };
    const referencia = intento(conjunto);
    for (const orden of permutaciones(conjunto)) {
        const inv = completo(orden);
        const libreta = new Libreta(reglas.deduccion, narrativa, inv);
        assert.deepEqual(libreta.idsEncontrados(), new Libreta(reglas.deduccion, narrativa, completo(conjunto)).idsEncontrados(), orden.join(' → '));
        assert.equal(JSON.stringify(libreta.hallazgos()), JSON.stringify(new Libreta(reglas.deduccion, narrativa, completo(conjunto)).hallazgos()), orden.join(' → '));
    }
    assert.equal(JSON.parse(referencia)[4].estado, 'resuelto');
});

// ── La ayuda ────────────────────────────────────────────────────────────────

test('la ayuda de la cocina: libreta, onda, ruedas, cuerda, taza, recibo y platos, en ese orden de prioridad', () => {
    assert.deepEqual(reglas.ayuda.refuerzos.map(r => r.efecto), ['libreta', 'onda', 'ruedas', 'cuerda', 'taza', 'recibo', 'platos']);
    assert.equal(reglas.ayuda.espera, 45);
    const inv = nueva();
    const estado = { valor: false };
    const ayuda = new Ayuda(reglas.ayuda, inv, { deduccionDisponible: () => estado.valor });
    const pasar = (s, o) => { let r; for (let t = 0; t < s - 1e-9; t += 1 / 60) r = ayuda.actualizar(1 / 60, o); return r; };
    assert.equal(pasar(44), null, 'antes de 45 s no hay ayuda');
    assert.equal(pasar(1.1)?.efecto, 'onda', '1. hasta comentario:0, la onda del golpe');
    S.alacena(inv); ayuda.alDescubrir();
    assert.equal(pasar(46)?.efecto, 'ruedas', '2. hasta revelacion:0, brillan las ruedas');
    S.rodar(inv); ayuda.alDescubrir();
    assert.equal(pasar(46)?.efecto, 'cuerda', '3. hasta revelacion:1, brilla la cuerda');
    S.fuelle(inv); ayuda.alDescubrir();
    assert.equal(pasar(46)?.efecto, 'taza', '4. hasta recoger la taza, echa un hilo de vapor');
    S.taza(inv); ayuda.alDescubrir();
    assert.equal(pasar(46)?.efecto, 'recibo', '5. hasta recoger el recibo, se agita sobre la mesa');
    S.recibo(inv); ayuda.alDescubrir();
    assert.equal(pasar(46)?.efecto, 'platos', '6. hasta examinar los platos, tintinean');
    S.platos(inv); ayuda.alDescubrir();
    assert.equal(pasar(100), null, 'con todo lo que lleva ayuda hecho, ya no hay');
    estado.valor = true;
    assert.equal(pasar(46)?.efecto, 'libreta', 'y con la deducción disponible, la libreta primero');
});

test('cada ayuda se apaga en cuanto sale su línea y la libreta es la primera aunque falte todo lo demás', () => {
    const inv = nueva();
    const estado = { valor: true };
    const ayuda = new Ayuda(reglas.ayuda, inv, { deduccionDisponible: () => estado.valor });
    for (let t = 0; t < 46; t += 1 / 60) ayuda.actualizar(1 / 60);
    assert.equal(ayuda.refuerzo.efecto, 'libreta', 'con la deducción disponible, la libreta primero sin importar nada más');
    estado.valor = false;
    ayuda.actualizar(1 / 60);
    assert.equal(ayuda.refuerzo.efecto, 'onda');
    S.alacena(inv);
    ayuda.actualizar(1 / 60);
    assert.equal(ayuda.refuerzo.efecto, 'ruedas', 'sin esperar otros 45 s: su línea ya salió');
    S.rodar(inv);
    ayuda.actualizar(1 / 60);
    assert.equal(ayuda.refuerzo.efecto, 'cuerda');
    S.fuelle(inv);
    ayuda.actualizar(1 / 60);
    assert.equal(ayuda.refuerzo.efecto, 'taza');
    S.taza(inv);
    ayuda.actualizar(1 / 60);
    assert.equal(ayuda.refuerzo.efecto, 'recibo');
    S.recibo(inv);
    ayuda.actualizar(1 / 60);
    assert.equal(ayuda.refuerzo.efecto, 'platos');
    S.platos(inv);
    ayuda.actualizar(1 / 60);
    assert.equal(ayuda.refuerzo, null);
    ayuda.apagar();
    assert.equal(ayuda.actualizar(1 / 60), null);
});

test('un descubrimiento reinicia la cuenta; la pausa y la libreta abierta no cuentan', () => {
    const inv = nueva();
    const ayuda = new Ayuda(reglas.ayuda, inv);
    for (let t = 0; t < 100; t += 1 / 60) ayuda.actualizar(1 / 60, { pausado: true });
    assert.equal(ayuda.activa, false);
    for (let t = 0; t < 46; t += 1 / 60) ayuda.actualizar(1 / 60);
    assert.equal(ayuda.activa, true);
    ayuda.alDescubrir();
    assert.equal(ayuda.actualizar(1 / 60), null);
});

// ── El mapa ─────────────────────────────────────────────────────────────────

const mapa = cargarMapa(2);
const posiciones = posicionesAlcanzables(mapa);

test('el mapa de la cocina tiene todo lo pedido y apunta a los ids de la narrativa', () => {
    const nombres = lista => lista.map(o => o.nombre);
    for (const m of ['alacena', 'chimenea', 'mesa', 'fregadero', 'estufa', 'vitrina']) assert.ok(nombres(mapa.muebles).includes(m), m);
    assert.equal(mapa.velas.length, 3, 'las velas de la mesa');
    assert.ok(mapa.ollas.length >= 3, 'las ollas que vibran');
    // La cuerda: sube desde detrás de la alacena, corre por lo alto del muro y baja al fuelle
    const [cuerda] = mapa.cuerdas;
    const alacena = mapa.muebles.find(m => m.nombre === 'alacena');
    const fuelle = mapa.interactuables.find(o => o.props.ref === 'fuelle');
    assert.ok(cuerda.puntos.length >= 4);
    const inicio = cuerda.puntos[0], fin = cuerda.puntos[cuerda.puntos.length - 1];
    assert.ok(inicio.x > alacena.x && inicio.x < alacena.x + alacena.ancho && inicio.y === alacena.y, 'nace detrás de la alacena, al pie del muro');
    assert.ok(Math.min(...cuerda.puntos.map(p => p.y)) < alacena.y - 100, 'sube por el muro hasta el techo');
    assert.ok(fin.x >= fuelle.x && fin.x <= fuelle.x + fuelle.ancho, 'y baja hasta el fuelle');
    // Las referencias
    const refs = new Set([...mapa.interactuables, ...mapa.revelables].map(o => o.props.ref));
    for (const r of ['alacena', 'n2-mancha-aceite', 'fuelle', 'cuerda', 'n2-mueble-copas', 'n2-mueble-platos', 'n2-mueble-sarten', 'n2-pista-recibo', 'n2-pista-taza', 'bateria']) {
        assert.ok(refs.has(r), `el mapa tiene "${r}"`);
        assert.ok(reglas.objetos[r], `las reglas conocen "${r}"`);
    }
    for (const r of refs) assert.ok(reglas.objetos[r], `"${r}" está en las reglas`);
    for (const [ref, def] of Object.entries(reglas.objetos)) {
        for (const accion of Object.keys(def.acciones || {})) {
            assert.ok([...mapa.interactuables, ...mapa.revelables].some(o => o.props.ref === ref && o.props.accion === accion), `${ref}/${accion} existe en el mapa`);
        }
    }
    // La mancha solo se ve con la luz; no hay marcas en la narrativa (sin tarjeta)
    const mancha = mapa.revelables.find(o => o.props.ref === 'n2-mancha-aceite');
    assert.ok(mancha && mancha.props.accion === 'examinar');
    assert.deepEqual(narrativa.marcas, []);
    // Un solo rincón con las pilas, fuera de la cocina principal
    const pilas = mapa.interactuables.find(o => o.props.ref === 'bateria');
    assert.ok(pilas.y >= 640, 'las pilas están en el rincón de más al sur');
});

test('todo está sobre suelo caminable (o sobre un mueble o el muro) y dentro del mapa', () => {
    const caminable = caminableDeSuelo(mapa);
    const sobreSuelo = r => {
        for (let fila = Math.floor(r.y / mapa.tam); fila <= Math.floor((r.y + r.alto - 1) / mapa.tam); fila++) {
            for (let col = Math.floor(r.x / mapa.tam); col <= Math.floor((r.x + r.ancho - 1) / mapa.tam); col++) {
                if (!caminable[fila]?.[col]) return false;
            }
        }
        return true;
    };
    for (const o of [...mapa.muebles, ...mapa.revelables, ...mapa.interactuables, ...mapa.velas]) {
        if (o.props.sobre || o.props.enPared) continue;
        assert.ok(sobreSuelo(o), `${o.nombre} está sobre suelo`);
    }
    for (const m of mapa.muebles) assert.ok(m.x >= 0 && m.x + m.ancho <= mapa.ancho && m.y >= 0 && m.y + m.alto <= mapa.alto, m.nombre);
});

test('nada queda tapado: el dibujo alto de un mueble no cubre una marca ni algo que se use', () => {
    const dibujo = m => ({ x: m.x, y: m.y - m.props.alto, ancho: m.ancho, alto: m.alto + m.props.alto });
    for (const m of mapa.muebles) {
        for (const r of mapa.revelables) assert.ok(!solapan(r, dibujo(m)), `${r.nombre} queda tapado por ${m.nombre}`);
        for (const i of mapa.interactuables) {
            if (!solapan(i, dibujo(m))) continue;
            assert.ok(i.props.sobre === m.nombre || !i.props.dibujo, `${i.nombre} queda tapado por el dibujo de ${m.nombre}`);
        }
    }
    // Las velas están sobre la mesa, a la vista
    const mesa = mapa.muebles.find(m => m.nombre === 'mesa');
    for (const v of mapa.velas) assert.ok(v.x >= mesa.x && v.x <= mesa.x + mesa.ancho && v.y > mesa.y - mesa.props.alto && v.y < mesa.y + mesa.alto, `${v.nombre} sobre la mesa`);
});

test('el inspector llega a todo: la cocina entera, el rincón de las pilas y junto a cada mueble', () => {
    assert.ok(posiciones.some(([x]) => x > 1400), 'el extremo este');
    assert.ok(posiciones.some(([, y]) => y > 650), 'el rincón del sur');
    for (const m of mapa.muebles) assert.ok(posiciones.some(([x, y]) => distanciaARectangulo({ x, y }, m) <= 84), `se llega junto a ${m.nombre}`);
});

test('todo se puede usar desde alguna posición cerca, de frente y con la luz real (la regla del arreglo 3.1)', () => {
    const segmentos = segmentosDeLuz(mapa);
    const sinCuerda = accionables(mapa).filter(o => o.props.ref !== 'cuerda');
    for (const o of sinCuerda) {
        const zona = zonaDeAccion(o, mapa.muebles);
        assert.ok(zona.distancia <= ALCANCE_DE_ACCION);
        const candidatos = posiciones.filter(([x, y]) => distanciaARectangulo({ x, y }, zona.huella) <= zona.distancia);
        assert.ok(candidatos.length > 0, `${o.nombre}: hay sitio donde pararse`);
        const sirve = candidatos.some(([x, y]) => intento(mapa, { x, y }, hacia({ x, y }, zona.mira ?? centroDe(zona.luz)), zona, segmentos).posible);
        assert.ok(sirve, `${o.nombre}: se puede usar de frente y con luz`);
    }
});

test('la cuerda: antes de rodar la alacena no se llega a ella; después, sí, y se usa de frente y con luz', () => {
    const cuerda = mapa.interactuables.find(o => o.props.ref === 'cuerda');
    const zona = zonaDeAccion(cuerda, mapa.muebles);
    assert.equal(posiciones.filter(([x, y]) => distanciaARectangulo({ x, y }, zona.huella) <= zona.distancia).length, 0, 'la alacena tapa el sitio');
    // La alacena rueda 192 px hacia el este; todo lo que está sobre ella se va con ella
    const rodado = cargarMapa(2);
    const antes = rodado.interactuables.find(o => o.props.accion === 'rodar');
    const x0 = antes.x;
    desplazarMueble(rodado, 'alacena', 192);
    assert.equal(rodado.interactuables.find(o => o.props.accion === 'rodar').x, x0 + 192);
    assert.equal(rodado.bloqueaLuz.find(b => b.nombre === 'alacena-luz').x, x0 + 192);
    const despues = posicionesAlcanzables(rodado);
    const zonaDespues = zonaDeAccion(rodado.interactuables.find(o => o.props.ref === 'cuerda'), rodado.muebles);
    const segmentos = segmentosDeLuz(rodado);
    const candidatos = despues.filter(([x, y]) => distanciaARectangulo({ x, y }, zonaDespues.huella) <= zonaDespues.distancia);
    assert.ok(candidatos.length > 0, 'ahora se llega a la cuerda');
    assert.ok(candidatos.some(([x, y]) => intento(rodado, { x, y }, hacia({ x, y }, centroDe(zonaDespues.luz)), zonaDespues, segmentos).posible), 'y se puede tirar de ella');
    // Con la alacena en su nuevo sitio sigue habiendo paso por todo el pasillo y a la mancha
    assert.ok(despues.some(([x, y]) => x > 1400 && y > 560), 'la cocina sigue conectada');
});

test('detrás de la alacena no se puede estar: el muro y la alacena cierran el hueco', () => {
    const alacena = mapa.muebles.find(m => m.nombre === 'alacena');
    assert.ok(!posiciones.some(([x, y]) => x > alacena.x - 13 && x < alacena.x + alacena.ancho + 13 && y < alacena.y + alacena.alto + CUERPO.alto), 'ni encima ni detrás');
});

test('desde lejos, de espaldas o con la alacena entre medias no se usa nada', () => {
    const segmentos = segmentosDeLuz(mapa);
    const alacenaExaminar = zonaDeAccion(mapa.interactuables.find(o => o.props.accion === 'examinar' && o.props.ref === 'alacena'), mapa.muebles);
    assert.equal(intento(mapa, { x: 264, y: 360 }, -Math.PI / 2, alacenaExaminar, segmentos).posible, true, 'de frente, a 40 px del borde');
    assert.equal(intento(mapa, { x: 264, y: 430 }, -Math.PI / 2, alacenaExaminar, segmentos).razon, 'lejos');
    assert.equal(intento(mapa, { x: 264, y: 360 }, Math.PI / 2, alacenaExaminar, segmentos).razon, 'de-espaldas');
    assert.equal(intento(mapa, { x: 180, y: 300 }, 0, alacenaExaminar, segmentos).razon, 'a-oscuras', 'de lado la alacena tapa su cara');
    const fuelle = zonaDeAccion(mapa.interactuables.find(o => o.props.ref === 'fuelle'), mapa.muebles);
    assert.equal(intento(mapa, { x: 980, y: 280 }, -Math.PI / 2, fuelle, segmentos).posible, true, 'bajo el fuelle, mirándolo');
    assert.equal(intento(mapa, { x: 980, y: 330 }, -Math.PI / 2, fuelle, segmentos).razon, 'lejos', 'detrás de la mesa, a 70 px');
    assert.equal(CONO_DE_LINTERNA.radioHalo, 120);
});
