// Nivel 4, El Cuarto de los Juguetes: cada línea con su disparador, las dependencias (tirar → cortar → trampilla), el fenómeno cerca, el último hilo y la ayuda.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import Investigacion from '../src/motor/Investigacion.js';
import Libreta from '../src/motor/Libreta.js';
import Deduccion from '../src/motor/Deduccion.js';
import Ayuda from '../src/motor/Ayuda.js';
import { CicloDeGolpes, golpeCerca } from '../src/motor/Fenomeno.js';
import { leerJson, cargarMapa } from './ayudasDeMapa.mjs';

const narrativa = leerJson('assets/narrativa/nivel4.json');
const reglas = leerJson('assets/investigaciones/nivel4.json');
const nueva = () => new Investigacion(reglas, narrativa);
const S = {
    hiloCaja: inv => inv.ilumino('n4-hilo-caja'), caja: inv => inv.examino('caja-juguetes'), tirar: inv => inv.tiro('hilo-caballito'),
    vio: inv => inv.vioCerca('juguete'), cortar: inv => inv.corto('hilo-munecas'), trampilla: inv => inv.examino('trampilla'),
    oso: inv => inv.examino('n4-mueble-oso'), caballito: inv => inv.examino('n4-mueble-caballito'), munecas: inv => inv.examino('n4-mueble-munecas'),
    bobina: inv => inv.recogio('n4-pista-hilo'), diario: inv => inv.recogio('n4-pista-diario'), pilas: inv => inv.recogio('bateria')
};
const partida = (...pasos) => { const inv = nueva(); for (const p of pasos) S[p](inv); const libreta = new Libreta(reglas.deduccion, narrativa, inv); return { inv, libreta, deduccion: new Deduccion(reglas.deduccion, libreta, { azar: () => 0.5 }) }; };
const clases = eventos => eventos.map(e => `${e.regla}:${e.clase}`);

test('intro y comentarios: la caja (tras ver su hilo con la luz), tirar de un hilo y un juguete que se mueve cerca', () => {
    const inv = nueva();
    assert.deepEqual(clases(inv.entro()), ['intro:importante']);
    assert.deepEqual(clases(S.caja(inv)), [], 'la caja no se examina sin ver antes su hilo con la luz');
    S.hiloCaja(inv);
    assert.deepEqual(clases(S.caja(inv)), ['comentario:0:secundaria']);
    assert.deepEqual(clases(S.tirar(inv)), ['comentario:1:secundaria']);
    assert.deepEqual(clases(S.vio(inv)), ['comentario:2:secundaria']);
    assert.deepEqual(clases(S.vio(inv)), [], 'una sola vez');
});

test('no se puede cortar antes de tirar de un hilo', () => {
    const inv = nueva();
    assert.equal(inv.puedeActuar('hilo-munecas', 'cortar'), false);
    assert.deepEqual(S.cortar(inv), []);
    assert.equal(inv.ocurrio('corto:hilo-munecas'), false);
    S.tirar(inv);
    assert.equal(inv.puedeActuar('hilo-munecas', 'cortar'), true);
    assert.deepEqual(clases(S.cortar(inv)), ['revelacion:0:importante']);
});

test('no se puede ver la trampilla antes de la revelación 0; después, sale la revelación 1', () => {
    const inv = nueva();
    assert.equal(inv.puedeActuar('trampilla', 'examinar'), false);
    assert.deepEqual(S.trampilla(inv), []);
    S.tirar(inv); S.cortar(inv);
    assert.equal(inv.hayAlgoNuevo('trampilla', 'examinar'), true);
    assert.deepEqual(clases(S.trampilla(inv)), ['revelacion:1:importante']);
    assert.equal(inv.hayAlgoNuevo('trampilla', 'examinar'), false, 'ya vista: el ícono E no aparece');
});

test('los muebles, las pistas y las pilas salen tal cual, secundarios', () => {
    const inv = nueva();
    for (const [paso, id] of [['oso', 'n4-mueble-oso'], ['caballito', 'n4-mueble-caballito'], ['munecas', 'n4-mueble-munecas']]) {
        const [e] = S[paso](inv);
        assert.equal(e.texto, narrativa.muebles.find(m => m.id === id).texto);
        assert.equal(e.clase, 'secundaria');
    }
    assert.equal(S.bobina(inv)[0].titulo, 'BOBINA DE HILO DE PESCAR');
    assert.equal(S.diario(inv)[0].titulo, 'PÁGINA DE UN DIARIO INFANTIL');
    assert.equal(S.pilas(inv)[0].texto, narrativa.bateria);
});

test('la deducción: oso con hilo cosido + trampilla del techo; el caballito engrasado es la trampa y las pistas no valen', () => {
    const t = () => partida('tirar', 'cortar', 'trampilla', 'oso', 'caballito', 'munecas', 'bobina', 'diario').deduccion;
    assert.equal(partida('tirar', 'cortar', 'oso').deduccion.disponible(), false, 'falta la trampilla');
    assert.equal(partida('tirar', 'cortar', 'trampilla').deduccion.disponible(), false, 'falta el oso');
    assert.equal(partida('tirar', 'cortar', 'trampilla', 'oso').deduccion.disponible(), true);
    assert.equal(t().responder('juguetes', 'con-hilos', ['oso-con-hilo-cosido', 'trampilla-del-techo']).estado, 'resuelto');
    for (const ajena of ['caballito-engrasado', 'munecas-alineadas', 'n4-pista-hilo', 'n4-pista-diario']) {
        assert.deepEqual(t().responder('juguetes', 'con-hilos', ['trampilla-del-techo', ajena]), { estado: 'error', motivo: 'ajena' }, `trampilla + ${ajena}`);
        assert.deepEqual(t().responder('juguetes', 'con-hilos', [ajena]), { estado: 'error', motivo: 'ajena' }, ajena);
    }
    assert.deepEqual(t().responder('juguetes', 'engranajes', ['oso-con-hilo-cosido', 'trampilla-del-techo']), { estado: 'error', motivo: 'conclusion' }, 'la trampa de los engranajes');
    assert.deepEqual(t().responder('juguetes', 'con-hilos', ['oso-con-hilo-cosido']), { estado: 'error', motivo: 'pruebas' });
});

test('la acción final: cortar el último hilo solo después de resolver la deducción', () => {
    const { inv } = partida('tirar', 'cortar');
    assert.equal(inv.puedeActuar('hilo-oso', 'cortar'), false);
    assert.deepEqual(inv.corto('hilo-oso'), []);
    inv.resolvio();
    assert.equal(inv.puedeActuar('hilo-oso', 'cortar'), true);
    inv.corto('hilo-oso');
    assert.ok(inv.ocurrio('corto:hilo-oso'));
});

test('el fenómeno: un juguete que se mueve solo se ve cerca solo con el inspector a ≤ 120 px', () => {
    const m = cargarMapa(4);
    const caballito = m.muebles.find(x => x.nombre === 'caballito');
    assert.equal(golpeCerca({ x: caballito.x + 40, y: caballito.y + caballito.alto + 60 }, caballito, 120), true);
    assert.equal(golpeCerca({ x: caballito.x + 40, y: caballito.y + caballito.alto + 400 }, caballito, 120), false);
    // El ritmo es el del fenómeno común: el primero a los 4 s y luego cada 7–12 s; con un cuadro de más de 12 s no salen dos
    const ciclo = new CicloDeGolpes();
    let movimientos = 0;
    for (let t = 0; t < 60; t += 1 / 60) if (ciclo.actualizar(1 / 60)) movimientos++;
    assert.ok(movimientos >= 4 && movimientos <= 8, `${movimientos} movimientos en un minuto`);
});

test('el mapa: tres hilos que salen de los juguetes, la trampilla en el muro y el caballito se puede mover sin tapar nada', () => {
    const m = cargarMapa(4);
    for (const ref of ['hilo-caballito', 'hilo-munecas', 'hilo-oso', 'n4-hilo-caja']) assert.ok(m.revelables.some(r => r.props.ref === ref), ref);
    const trampilla = m.interactuables.find(o => o.props.ref === 'trampilla');
    assert.equal(trampilla.props.enPared, true);
    assert.ok(m.objetos.some(o => o.tipo === 'ventana'), 'la ventana exterior');
    // Tras tirar del hilo el caballito va 240 px al este: sigue dentro del cuarto y no queda sobre una pista
    const caballito = m.muebles.find(x => x.nombre === 'caballito');
    const despues = { x: caballito.x + 240, y: caballito.y - caballito.props.alto, ancho: caballito.ancho, alto: caballito.alto + caballito.props.alto };
    assert.ok(despues.x + despues.ancho <= 1344);
    for (const o of m.interactuables.filter(o => o.props.dibujo && !o.props.sobre && !o.props.enPared)) {
        assert.ok(!(o.x < despues.x + despues.ancho && o.x + o.ancho > despues.x && o.y < despues.y + despues.alto && o.y + o.alto > despues.y), `${o.nombre} no queda tapado por el caballito movido`);
    }
});

test('los hallazgos extra del nivel 4: el caballito, las muñecas, la bobina y el diario', () => {
    const { libreta } = partida('caballito');
    assert.equal(libreta.resumen().totalDeExtras, 4);
    assert.equal(libreta.resumen().extras, 1);
});

test('la ayuda del nivel 4: libreta, hilos, polvo, oso y, tras deducir, el último hilo', () => {
    assert.deepEqual(reglas.ayuda.refuerzos.map(r => r.efecto), ['libreta', 'hilos', 'polvo', 'oso', 'final']);
    const inv = nueva();
    const estado = { disponible: false, resuelta: false };
    const ayuda = new Ayuda(reglas.ayuda, inv, { deduccionDisponible: () => estado.disponible, deduccionResuelta: () => estado.resuelta });
    const pasar = s => { let r; for (let t = 0; t < s; t += 1 / 60) r = ayuda.actualizar(1 / 60); return r; };
    assert.equal(pasar(46)?.efecto, 'hilos', '1. hasta tirar de un hilo, los hilos brillan con el fenómeno');
    S.tirar(inv); ayuda.alDescubrir();
    assert.equal(pasar(46)?.efecto, 'polvo', '2. hasta la revelación 1, cae polvo de la trampilla');
    S.cortar(inv); S.trampilla(inv); ayuda.alDescubrir();
    assert.equal(pasar(46)?.efecto, 'oso', '3. hasta examinar el oso, su hilo cosido brilla');
    S.oso(inv); ayuda.alDescubrir();
    assert.equal(pasar(100), null);
    estado.disponible = true;
    assert.equal(pasar(46)?.efecto, 'libreta');
    estado.disponible = false; estado.resuelta = true;
    assert.equal(pasar(1)?.efecto, 'final');
});
