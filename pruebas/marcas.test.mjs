// Aparición temporal de las marcas (lo que revela la linterna): ciclo, pausa narrativa y contrato
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TIEMPOS } from '../src/presentacion/configuracion.js';
import PresentacionTemporal from '../src/presentacion/PresentacionTemporal.js';
import AparicionDeMarca from '../src/presentacion/AparicionDeMarca.js';
import GestorDePresentaciones from '../src/presentacion/GestorDePresentaciones.js';

const POLVO = { id: 'n1-marca-polvo' };
const ARRASTRE = { id: 'n1-marca-arrastre' };

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

test('ciclo de una aparición: aparece, permanece, sale y termina', () => {
    const escena = escenaFalsa();
    const gestor = new GestorDePresentaciones();
    const aparicion = crearAparicion(escena, POLVO);
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
});

test('no hay dos apariciones activas de la misma marca a la vez', () => {
    const escena = escenaFalsa();
    const gestor = new GestorDePresentaciones();
    assert.equal(gestor.mostrar(crearAparicion(escena, ARRASTRE)), true);
    assert.equal(gestor.mostrar(crearAparicion(escena, ARRASTRE)), false);
});

test('una aparición solo termina por tiempo o por retirada explícita: revisar no la retira', () => {
    const escena = escenaFalsa();
    const gestor = new GestorDePresentaciones();
    const aparicion = crearAparicion(escena, POLVO);
    gestor.mostrar(aparicion);
    escena.avanzar(1000);
    assert.equal(aparicion.esValida(), true);
    gestor.revisar({});
    gestor.revisar(null);
    assert.equal(aparicion.estado, 'visible');
});

test('al salir o reiniciar la habitación las apariciones se retiran de inmediato', () => {
    const escena = escenaFalsa();
    const gestor = new GestorDePresentaciones();
    const [a, b] = [POLVO, ARRASTRE].map(m => crearAparicion(escena, m));
    gestor.mostrar(a);
    gestor.mostrar(b);
    gestor.retirarTodas('inmediato');
    assert.deepEqual([a.estado, b.estado], ['terminada', 'terminada']);
    assert.equal(gestor.estaActiva(a.clave) || gestor.estaActiva(b.clave), false);
    a.retirar('tiempo');                        // retirar otra vez no hace nada
    assert.equal(a.estado, 'terminada');
});

test('el contrato de presentación es el aprobado', () => {
    const p = crearAparicion(escenaFalsa(), ARRASTRE);
    assert.ok(p instanceof PresentacionTemporal);
    assert.equal(p.modo, 'acontecimiento');
    for (const metodo of ['iniciar', 'esValida', 'revisar', 'retirar']) assert.equal(typeof p[metodo], 'function');
});

test('una pausa narrativa congela la aparición de una marca y conserva su tiempo restante', () => {
    const escena = escenaFalsa();
    const gestor = new GestorDePresentaciones();
    const aparicion = crearAparicion(escena, ARRASTRE);
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
    const aparicion = crearAparicion(escena, ARRASTRE);
    gestor.mostrar(aparicion);
    escena.avanzar(30000);
    assert.equal(aparicion.estado, 'visible');
    assert.equal(aparicion.pausada, true);
    gestor.reanudarTodas();
    escena.avanzar(TIEMPOS.marca.entrada + TIEMPOS.marca.permanencia);
    assert.equal(aparicion.estado, 'saliendo');
});
