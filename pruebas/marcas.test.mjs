// Etapa 2: visibilidad básica de las marcas (sin cambios) y su aparición temporal
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RADIO_LINTERNA } from '../src/modelo/Escenario.js';
import Direccion from '../src/modelo/Direccion.js';
import { TIEMPOS } from '../src/presentacion/configuracion.js';
import PresentacionTemporal from '../src/presentacion/PresentacionTemporal.js';
import AparicionDeMarca from '../src/presentacion/AparicionDeMarca.js';
import GestorDePresentaciones from '../src/presentacion/GestorDePresentaciones.js';
import { cargarNivel, nivelDePrueba, jugar } from './utilidades.mjs';

const visiblesDesde = (nivel, f, c) => nivel.getEscenario().marcasVisiblesDesde(f, c).map(m => m.id);

// ── Visibilidad básica ──────────────────────────────────────────────────────

test('radio 2 euclídeo y línea de visión, sin cambios', () => {
    assert.equal(RADIO_LINTERNA, 2);
    const nivel = cargarNivel(1);              // marcas: arrastre (3,7) y polvo (4,1)
    assert.deepEqual(visiblesDesde(nivel, 3, 5), ['n1-marca-arrastre'], 'a 2 casillas en línea recta');
    assert.deepEqual(visiblesDesde(nivel, 2, 6), ['n1-marca-arrastre'], 'diagonal: 1² + 1² = 2 ≤ 4');
    assert.deepEqual(visiblesDesde(nivel, 1, 6), [], 'distancia² = 4 + 1 = 5 > 4');
    assert.deepEqual(visiblesDesde(nivel, 3, 4), [], 'el inicio no ve ninguna marca');
    assert.deepEqual(visiblesDesde(nivel, 4, 3), ['n1-marca-polvo']);

    const conPared = nivelDePrueba({ terreno: ['#######', '#  #  #', '#######'], sokoban: ['', ' @'] },
        { evidencias: [{ id: 'm', tipo: 'marca', en: [1, 4], descubre: 'visibilidad' }] });
    assert.deepEqual(visiblesDesde(conPared, 1, 2), [], 'una pared en medio tapa la vista');
    const conMueble = nivelDePrueba({ terreno: ['#######', '#     #', '#######'], obstaculos: ['', '   m'], sokoban: ['', ' @'] },
        { obstaculos: [{ id: 'o', tipo: 'mueble', en: [1, 3] }], evidencias: [{ id: 'm', tipo: 'marca', en: [1, 4], descubre: 'visibilidad' }] });
    assert.deepEqual(visiblesDesde(conMueble, 1, 2), [], 'un mueble en medio tapa la vista');
});

test('una caja encima tapa la marca; al sacarla vuelve a verse; la entidad nunca desaparece', () => {
    const nivel = nivelDePrueba({ terreno: ['#######', '#     #', '#######'], sokoban: ['', ' @A'] },
        { evidencias: [{ id: 'huella', tipo: 'marca', en: [1, 3], descubre: 'visibilidad' }] });
    assert.deepEqual(visiblesDesde(nivel, 1, 1), ['huella']);
    nivel.mover(Direccion.DERECHA);            // A pasa a (1,3), encima de la marca
    assert.deepEqual(visiblesDesde(nivel, 1, 2), [], 'tapada por la caja');
    assert.equal(nivel.getEscenario().getMarcas().length, 1, 'sigue existiendo');
    nivel.mover(Direccion.DERECHA);            // A sigue a (1,4)
    assert.deepEqual(visiblesDesde(nivel, 1, 3), ['huella']);
    nivel.deshacer();
    assert.deepEqual(visiblesDesde(nivel, 1, 2), [], 'deshacer vuelve a taparla');
    assert.deepEqual(nivel.entidadesEn(1, 3).evidencias, ['huella']);
});

test('las marcas del nivel 1 se ven siguiendo exactamente las mismas casillas que antes', () => {
    // Igual que el validador: con el récord de pasos se revela solo la marca de polvo
    const nivel = cargarNivel(1);
    const vistas = new Set(visiblesDesde(nivel, 3, 4));
    for (const letra of 'lluRRdlldRRlldRR') {
        nivel.mover({ u: Direccion.ARRIBA, d: Direccion.ABAJO, l: Direccion.IZQUIERDA, r: Direccion.DERECHA }[letra.toLowerCase()]);
        const p = nivel.getPersonaje();
        visiblesDesde(nivel, p.fila, p.columna).forEach(id => vistas.add(id));
    }
    assert.deepEqual([...vistas], ['n1-marca-polvo']);
});

// ── Presentación temporal (con una escena falsa: reloj y tweens controlados) ─────

// Reloj simulado de 1 ms por paso: los temporizadores y animaciones en pausa no consumen tiempo
function escenaFalsa() {
    const temporizadores = [], tweens = [];
    const objeto = () => {
        const o = { destruido: false, alpha: 1, scale: 1, destroy() { o.destruido = true; } };
        o.setAlpha = v => { o.alpha = v; return o; };
        o.setScale = v => { o.scale = v; return o; };
        return o;
    };
    const de = objetivos => { const lista = [].concat(objetivos); return t => [].concat(t.targets).some(x => lista.includes(x)); };
    return {
        tweens: {
            add(cfg) {
                const t = { ...cfg, restante: cfg.repeat === -1 ? Infinity : (cfg.duration || 0), vivo: true, pausado: false };
                t.pause = () => { t.pausado = true; };
                t.resume = () => { t.pausado = false; };
                tweens.push(t);
                return t;
            },
            killTweensOf(objetivos) { tweens.filter(de(objetivos)).forEach(t => { t.vivo = false; }); },
            getTweensOf(objetivos) { return tweens.filter(t => t.vivo).filter(de(objetivos)); }
        },
        time: {
            delayedCall(ms, cb) {
                const t = { restante: ms, cb, activo: true, paused: false, remove() { t.activo = false; } };
                temporizadores.push(t);
                return t;
            }
        },
        add: { circle: objeto, container: () => objeto() },
        avanzar(ms) {
            for (let paso = 0; paso < ms; paso++) {
                for (const t of temporizadores) if (t.activo && !t.paused && --t.restante <= 0) { t.activo = false; t.cb(); }
                for (const t of tweens) if (t.vivo && !t.pausado && --t.restante <= 0) { t.vivo = false; t.onComplete?.(); }
            }
        }
    };
}

const contenedorFalso = () => ({ hijos: [], add(v) { this.hijos.push(v); } });
const crearAparicion = (escena, marca) => new AparicionDeMarca(escena, contenedorFalso(), marca,
    { x: 0, y: 0, icono: '👣', crearIcono: () => ({ destroy() { } }) });

test('la duración está centralizada en configuracion.js', () => {
    assert.deepEqual(TIEMPOS.marca, { entrada: 450, permanencia: 4500, salida: 600 });
    assert.ok(Object.isFrozen(TIEMPOS) && Object.isFrozen(TIEMPOS.marca));
});

test('ciclo de una aparición: aparece, permanece, sale y termina; la marca sigue existiendo', () => {
    const escena = escenaFalsa();
    const nivel = cargarNivel(1);
    const marca = nivel.getEscenario().getMarcas()[1];
    const gestor = new GestorDePresentaciones();
    const aparicion = crearAparicion(escena, marca);
    assert.equal(gestor.mostrar(aparicion), true);
    assert.equal(aparicion.estado, 'visible');
    const { entrada, permanencia, salida } = TIEMPOS.marca;
    escena.avanzar(entrada + permanencia - 1);
    assert.equal(aparicion.estado, 'visible', 'todavía dentro de su tiempo');
    escena.avanzar(1);
    assert.equal(aparicion.estado, 'saliendo');
    assert.equal(aparicion.motivo, 'tiempo');
    escena.avanzar(salida);
    assert.equal(aparicion.estado, 'terminada');
    assert.equal(aparicion.vista.destruido, true, 'el dibujo se quitó');
    assert.equal(gestor.estaActiva('marca:n1-marca-polvo'), false);
    assert.equal(nivel.getEscenario().getMarcas().length, 2, 'la entidad sigue en el escenario');
    assert.deepEqual(nivel.entidadesEn(4, 1).evidencias, ['n1-marca-polvo']);
});

test('no hay dos apariciones activas de la misma marca a la vez', () => {
    const escena = escenaFalsa();
    const marca = cargarNivel(1).getEscenario().getMarcas()[0];
    const gestor = new GestorDePresentaciones();
    assert.equal(gestor.mostrar(crearAparicion(escena, marca)), true);
    assert.equal(gestor.mostrar(crearAparicion(escena, marca)), false);
});

test('si una caja tapa la marca, la aparición se retira antes de tiempo', () => {
    const escena = escenaFalsa();
    const nivel = nivelDePrueba({ terreno: ['#######', '#     #', '#######'], sokoban: ['', ' @A'] },
        { evidencias: [{ id: 'huella', tipo: 'marca', en: [1, 3], descubre: 'visibilidad' }] });
    const gestor = new GestorDePresentaciones();
    const aparicion = crearAparicion(escena, nivel.getEscenario().getMarcas()[0]);
    gestor.mostrar(aparicion);
    escena.avanzar(1000);
    gestor.revisar(nivel);
    assert.equal(aparicion.estado, 'visible', 'mientras no esté tapada sigue');
    nivel.mover(Direccion.DERECHA);            // la caja cubre la marca
    gestor.revisar(nivel);
    assert.equal(aparicion.estado, 'saliendo');
    assert.equal(aparicion.motivo, 'invalida');
    escena.avanzar(TIEMPOS.marca.salida);
    assert.equal(aparicion.estado, 'terminada');
});

test('al salir o reiniciar el nivel las apariciones se retiran de inmediato', () => {
    const escena = escenaFalsa();
    const gestor = new GestorDePresentaciones();
    const [a, b] = cargarNivel(1).getEscenario().getMarcas().map(m => crearAparicion(escena, m));
    gestor.mostrar(a);
    gestor.mostrar(b);
    gestor.retirarTodas('inmediato');
    assert.deepEqual([a.estado, b.estado], ['terminada', 'terminada']);
    assert.equal(gestor.estaActiva(a.clave) || gestor.estaActiva(b.clave), false);
    a.retirar('tiempo');                        // retirar otra vez no hace nada
    assert.equal(a.estado, 'terminada');
});

test('el contrato de presentación es el aprobado', () => {
    const p = crearAparicion(escenaFalsa(), cargarNivel(1).getEscenario().getMarcas()[0]);
    assert.ok(p instanceof PresentacionTemporal);
    assert.equal(p.modo, 'acontecimiento');
    for (const metodo of ['iniciar', 'esValida', 'revisar', 'retirar']) assert.equal(typeof p[metodo], 'function');
});

test('la visibilidad no depende de que el dibujo siga en pantalla', () => {
    // Que la aparición termine no cambia lo que la visibilidad básica alcanza
    const escena = escenaFalsa();
    const nivel = cargarNivel(1);
    jugar(nivel, 'll');
    jugar(nivel, 'd');                          // (4,2): ve la marca de polvo
    const gestor = new GestorDePresentaciones();
    gestor.mostrar(crearAparicion(escena, nivel.getEscenario().getMarcas()[1]));
    escena.avanzar(10000);
    assert.deepEqual(visiblesDesde(nivel, 4, 2), ['n1-marca-polvo']);
});

test('una pausa narrativa congela la aparición de una marca y conserva su tiempo restante', () => {
    const escena = escenaFalsa();
    const gestor = new GestorDePresentaciones();
    const aparicion = crearAparicion(escena, cargarNivel(1).getEscenario().getMarcas()[0]);
    gestor.mostrar(aparicion);
    escena.avanzar(1000);
    gestor.pausarTodas();
    escena.avanzar(20000);                       // 20 s de lectura: no consume nada
    assert.equal(aparicion.estado, 'visible');
    gestor.reanudarTodas();
    const { entrada, permanencia } = TIEMPOS.marca;
    escena.avanzar(entrada + permanencia - 1000 - 1);
    assert.equal(aparicion.estado, 'visible', 'le quedaba exactamente lo mismo que antes de la pausa');
    escena.avanzar(1);
    assert.equal(aparicion.estado, 'saliendo');
});

test('una aparición que empieza durante la pausa nace suspendida', () => {
    const escena = escenaFalsa();
    const gestor = new GestorDePresentaciones();
    gestor.pausarTodas();
    const aparicion = crearAparicion(escena, cargarNivel(1).getEscenario().getMarcas()[0]);
    gestor.mostrar(aparicion);
    escena.avanzar(30000);
    assert.equal(aparicion.estado, 'visible');
    assert.equal(aparicion.pausada, true);
    gestor.reanudarTodas();
    escena.avanzar(TIEMPOS.marca.entrada + TIEMPOS.marca.permanencia);
    assert.equal(aparicion.estado, 'saliendo');
});
