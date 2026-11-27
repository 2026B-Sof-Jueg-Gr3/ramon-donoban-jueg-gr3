// Cuándo cuenta una habitación como completada, con el código de la escena de verdad (src/escenas/Habitacion.js) sobre un Phaser mínimo.
// El nivel 5 se completa al SALIR POR LA PUERTA del despacho (que pide haber apagado la chimenea), no al capturar a la sombra.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import Investigacion from '../src/motor/Investigacion.js';
import Progreso from '../src/ui/Progreso.js';
import { leerJson } from './ayudasDeMapa.mjs';

// Phaser mínimo para que la escena y sus módulos se puedan importar en Node
const clases = new Proxy({}, { get: (t, k) => (t[k] ??= class { }) });
globalThis.Phaser = {
    Scene: class { }, GameObjects: clases, Physics: { Arcade: clases }, BlendModes: { ADD: 1 }, Math: {},
    Display: { Color: { HexStringToColor: () => ({ color: 0 }) } }, Geom: { Rectangle: Object.assign(class { }, { Contains: () => true }) }, Input: { Keyboard: {} }
};
const { default: Habitacion } = await import('../src/escenas/Habitacion.js');

const narrativa = leerJson('assets/narrativa/nivel5.json');
const reglas = leerJson('assets/investigaciones/nivel5.json');

function conAlmacen(hacer) {
    const datos = new Map();
    const antes = globalThis.localStorage;
    globalThis.localStorage = { getItem: k => datos.get(k) ?? null, setItem: (k, v) => datos.set(k, String(v)) };
    try { return hacer(); } finally { globalThis.localStorage = antes; }
}

// La escena sin dibujar: solo lo que usan el cierre, la acción final y la salida
function escenaDe(numeroDeNivel, final, investigacion = new Investigacion(reglas, narrativa)) {
    const e = Object.create(Habitacion.prototype);
    const escenas = [];
    Object.assign(e, {
        numeroDeNivel, final, investigacion, narrativa, fase: 'investigando', saliendo: false, espera: null, animando: false, acciones: 0,
        ayuda: { apagar() { }, alDescubrir() { } }, habitacion: { calmar() { } }, libreta: { resumen: () => ({}) }, luzDeCierre: { encender() { } },
        cuaderno: { abierta: false }, avisoDeContinuar: { visible: false, mostrar() { } },
        narracion: { bloqueando: false, pendientes: [], panel: { tarjetas: [] }, narrador: { secundarios: [], colaAmbiental: [] }, contar() { }, contarTodos() { } },
        cameras: { main: { once: (ev, fn) => { e.alOscurecer = fn; }, fadeOut: () => e.alOscurecer?.() } },
        scene: { start: clave => escenas.push(clave) },
        responder: (u, terminado) => terminado(),       // sin animaciones
        escenas
    });
    return e;
}
const puerta = { objeto: { props: { ref: 'puerta-despacho', accion: 'abrir' } } };

// La captura: lo que hace el módulo de la sombra al atraparla
function capturar(e) {
    e.investigacion.capturo();
    e.cerrarNivel({ alTerminar: () => { e.fase = 'final'; } });
    e.despuesDelTexto();          // el jugador cierra el texto del cierre
}

test('capturar y salir al menú → el nivel 5 NO queda completado', () => conAlmacen(() => {
    const e = escenaDe(5, reglas.final);
    capturar(e);
    assert.equal(e.fase, 'final');
    assert.equal(Progreso.estaCompletado(5), false, 'la captura sola no completa');
    e.salir();                    // Esc → "Salir al menú" (confirmado)
    assert.deepEqual(e.escenas, ['MenuNiveles']);
    assert.equal(Progreso.estaCompletado(5), false);
}));

test('capturar, apagar la chimenea y salir por la puerta del despacho → completado', () => conAlmacen(() => {
    const e = escenaDe(5, reglas.final);
    capturar(e);
    // La puerta solo se ofrece (ícono E) si todavía puede dar algo: con la chimenea encendida, no
    assert.equal(e.investigacion.hayAlgoNuevo('puerta-despacho', 'abrir'), false);
    e.investigacion.apago('chimenea');
    assert.equal(e.investigacion.hayAlgoNuevo('puerta-despacho', 'abrir'), true);
    assert.equal(Progreso.estaCompletado(5), false, 'apagar no completa: falta salir');
    e.candidato = puerta;
    e.interactuar();
    assert.equal(Progreso.estaCompletado(5), true);
    assert.deepEqual(e.escenas, ['Informe']);
}));

test('si al salir por la puerta queda una tarjeta por leer, queda completado y el informe espera', () => conAlmacen(() => {
    const e = escenaDe(5, reglas.final);
    capturar(e);
    e.investigacion.apago('chimenea');
    e.narracion.panel.tarjetas = [{ tipo: 'libreta', fase: 'escribiendo', temporizador: null }];
    e.candidato = puerta;
    e.interactuar();
    assert.equal(Progreso.estaCompletado(5), true, 'salió por la puerta');
    assert.equal(e.fase, 'espera');
    assert.deepEqual(e.escenas, [], 'el informe no llega solo');
    e.continuarAlInforme();
    assert.deepEqual(e.escenas, [], 'sin el aviso a la vista, una pulsación no hace nada');
    e.avisoDeContinuar.visible = true;
    e.recibirEntrada('avanzar', { repeat: true });
    assert.deepEqual(e.escenas, [], 'una tecla sostenida no cuenta');
    e.recibirEntrada('avanzar', { repeat: false });
    assert.deepEqual(e.escenas, ['Informe']);
}));

test('las habitaciones sin puerta final quedan completadas al cerrar el caso', () => conAlmacen(() => {
    const e = escenaDe(6, null, new Investigacion(leerJson('assets/investigaciones/nivel6.json'), leerJson('assets/narrativa/nivel6.json')));
    e.cerrarNivel({ alTerminar: () => { } });
    assert.equal(Progreso.estaCompletado(6), true);
}));
