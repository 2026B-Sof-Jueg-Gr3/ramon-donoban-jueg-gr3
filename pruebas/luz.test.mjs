// El cierre: la luz sube y lo que revela queda a la vista (en el nivel 6, el compartimento bajo el reloj). Y los relámpagos.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LuzDeCierre, Relampagos, oscuridadCon, oscuridadJuntoALaVentana, formaDeLaLinterna, encuadre, LUZ_DE_CIERRE, RELAMPAGO } from '../src/motor/Luz.js';
import { poligonoDeVisibilidad, CONO_DE_LINTERNA, puntoEnPoligono } from '../src/motor/Visibilidad.js';
import { disposicionDeNovela } from '../src/motor/Novela.js';
import { rectangulosSeSolapan } from './ayudasDeNovela.mjs';
import { cargarMapa } from './ayudasDeMapa.mjs';

// Phaser mínimo para importar la escena y el despacho en Node
const clases = new Proxy({}, { get: (t, k) => (t[k] ??= class { }) });
globalThis.Phaser ??= {
    Scene: class { }, GameObjects: clases, Physics: { Arcade: clases }, BlendModes: { ADD: 1 }, Math: {},
    Display: { Color: { HexStringToColor: () => ({ color: 0 }) } }, Geom: { Rectangle: Object.assign(class { }, { Contains: () => true }) }, Input: { Keyboard: {} }
};
const { default: Habitacion } = await import('../src/escenas/Habitacion.js');
const { default: Despacho } = await import('../src/presentacion/habitaciones/Despacho.js');

test('la luz del cierre sube despacio, sin saltos, hasta quedarse', () => {
    const luz = new LuzDeCierre();
    assert.equal(luz.claridad, 0);
    luz.actualizar(5);
    assert.equal(luz.claridad, 0, 'sin cierre no entra luz');
    luz.encender();
    let antes = 0;
    for (let t = 0; t < LUZ_DE_CIERRE.duracionS + 1; t += 1 / 60) {
        const c = luz.actualizar(1 / 60);
        assert.ok(c >= antes && c <= 1 && c - antes < 0.02);
        antes = c;
    }
    assert.equal(luz.claridad, 1);
    assert.ok(LUZ_DE_CIERRE.duracionS >= 2, 'despacio');
    assert.equal(oscuridadCon(0.94, 0), 0.94);
    assert.ok(oscuridadCon(0.94, 1) < 0.2, 'al final se ve la habitación');
});

test('los relámpagos: de vez en cuando (9 a 18 s), un destello breve; nada durante las pausas', () => {
    const r = new Relampagos({ semilla: 10 });
    const inicios = [];
    let antes = 0, maximo = 0, duracion = 0;
    for (let t = 0; t < 120; t += 1 / 60) {
        const d = r.actualizar(1 / 60);
        if (d > 0 && antes === 0) inicios.push(t);
        if (d > 0) duracion += 1 / 60;
        maximo = Math.max(maximo, d);
        antes = d;
    }
    assert.ok(inicios.length >= 6 && inicios.length <= 13, `${inicios.length} en 2 minutos`);
    for (let i = 1; i < inicios.length; i++) assert.ok(inicios[i] - inicios[i - 1] >= RELAMPAGO.minimoS - 0.1);
    assert.ok(maximo > 0.9);
    assert.ok(duracion / inicios.length <= RELAMPAGO.duracionS + 0.05, 'breves');
    const quieto = new Relampagos({ semilla: 10 });
    for (let t = 0; t < 120; t += 1 / 60) assert.equal(quieto.actualizar(1 / 60, { activo: false }), 0);
    assert.equal(quieto.cuantos, 0);
});

test('solo hay relámpagos donde hay ventanas: el pasillo y el cuarto de los juguetes', () => {
    assert.deepEqual([1, 2, 3, 4, 5, 6].filter(n => cargarMapa(n).ventanas.length > 0), [1, 4]);
});

// El nivel 6 con el código de la escena: se resuelve, entra la luz y la cámara lleva la atención al compartimento
function cierreDelDespacho({ jugadorEn }) {
    const mapa = cargarMapa(6);
    const escena = Object.create(Habitacion.prototype);
    const vista = { width: 1280, height: 720, scrollX: 0, scrollY: 0, setScroll(x, y) { this.scrollX = x; this.scrollY = y; } };
    const despacho = new Despacho(escena);
    const comp = mapa.fenomenos.find(f => f.props.efecto === 'compartimento');
    despacho.compartimento = { x: comp.x, y: comp.y, ancho: comp.ancho, alto: comp.alto };
    Object.assign(escena, {
        mapa, habitacion: despacho, fase: 'cierre', linterna: { fuentes: [], actualizar() { } }, luzDeCierre: new LuzDeCierre(), relampagos: null, vidrios: [],
        luzDeLaMirada: null, mirada: null, destelloPrevio: 0, cameras: { main: vista }, desplazamiento: { ...encuadre(jugadorEn, mapa, { ancho: 1280, alto: 720 }) },
        inspector: { origenDeLuz: jugadorEn, direccionDeLuz: Math.PI }      // la linterna apuntando al otro lado
    });
    escena.aplicarDesplazamiento();
    escena.encenderElCierre();
    for (let t = 0; t < 5; t += 1 / 60) escena.actualizarLuces(1 / 60, true);        // en pausa: se está leyendo el texto del cierre
    return { escena, despacho, vista };
}

test('nivel 6: entra la luz y el compartimento queda visible, aunque la linterna apunte a otro lado', () => {
    for (const jugadorEn = { x: 170, y: 560 }; jugadorEn.x <= 1250; jugadorEn.x += 270) {
        const { escena, despacho, vista } = cierreDelDespacho({ jugadorEn: { ...jugadorEn } });
        assert.equal(escena.linterna.claridad, 1);
        const [luz] = escena.linterna.fuentes;
        assert.equal(luz.nivel, 1, 'además, una luz sobre él');
        const c = despacho.compartimento;
        assert.ok(Math.hypot(luz.x - (c.x + c.ancho / 2), luz.y - (c.y + c.alto / 2)) < 1);
        const enPantalla = { x: c.x - vista.scrollX, y: c.y - vista.scrollY, ancho: c.ancho, alto: c.alto };
        assert.ok(enPantalla.x >= 0 && enPantalla.y >= 0 && enPantalla.x + enPantalla.ancho <= 1280 && enPantalla.y + enPantalla.alto <= 720, `en pantalla: ${JSON.stringify(enPantalla)}`);
        for (const lado of ['izquierda', 'derecha']) {
            const { retrato, zona } = disposicionDeNovela(1280, 720, lado);
            assert.equal(rectangulosSeSolapan(enPantalla, zona), false, `la caja no lo tapa (${lado})`);
            assert.equal(rectangulosSeSolapan(enPantalla, retrato), false, `el retrato no lo tapa (${lado})`);
        }
    }
});

// ── El relámpago da ambiente: no sirve de linterna (arreglo 4.1) ──────────────

test('con el destello al máximo la oscuridad nunca baja de 0,55, y solo llega ahí junto a la ventana', () => {
    for (let d = 0; d <= 2000; d += 5) assert.ok(oscuridadJuntoALaVentana(0.94, 1, d) >= RELAMPAGO.minima - 1e-9, `a ${d} px`);
    assert.ok(Math.abs(oscuridadJuntoALaVentana(0.94, 1, 0) - 0.55) < 1e-9);
    assert.ok(Math.abs(oscuridadCon(0.94, 0, 1) - RELAMPAGO.general) < 1e-9, 'lejos de la ventana casi no aclara');
    assert.ok(oscuridadJuntoALaVentana(0.94, 1, 0) < oscuridadJuntoALaVentana(0.94, 1, 200));
    assert.equal(oscuridadJuntoALaVentana(0.94, 0, 0), 0.94, 'sin destello, la de siempre');
});

// Una linterna en (400, 500) apuntando al oeste, sin paredes de por medio
function linternaAlOeste() {
    const origen = { x: 400, y: 500 }, direccion = Math.PI, { alcance, semiangulo, suavizado } = CONO_DE_LINTERNA;
    const angulos = Array.from({ length: 41 }, (_, i) => direccion + (i - 20) * (semiangulo + suavizado) / 20);
    return { luz: { origen, direccion, semiangulo, suavizado, alcance }, poligono: poligonoDeVisibilidad(origen, [], alcance, angulos, 0.06) };
}

test('con el destello al máximo, un revelable fuera del cono sigue con alfa 0', () => {
    const escena = Object.create(Habitacion.prototype);
    let alfa = null;
    const revelable = { objeto: { x: 900, y: 470, ancho: 80, alto: 60 }, ref: 'marca', alfa: 0, descubierta: false, iluminado: false, imagen: { setAlpha: a => { alfa = a; } } };
    Object.assign(escena, { revelables: [revelable], linterna: { ...linternaAlOeste(), destello: 1 }, descubrir: () => assert.fail('no se descubre con un relámpago') });
    for (let t = 0; t < 1; t += 1 / 60) escena.actualizarRevelables(1 / 60);
    assert.equal(revelable.iluminado, false);
    assert.equal(alfa, 0);
});

test('durante el destello, lo que solo se ve con la linterna se recorta a su forma; después se quita el recorte', () => {
    const escena = Object.create(Habitacion.prototype);
    const hilos = { mascara: null, setMask(m) { this.mascara = m; }, clearMask() { this.mascara = null; } };
    const dibujado = [];
    const forma = { clear: () => { dibujado.length = 0; }, fillStyle() { }, fillPoints: p => dibujado.push(p), fillCircle() { }, createGeometryMask: () => 'recorte' };
    Object.assign(escena, { soloConLuz: [], mascaraDeLaLuz: null, formaDeLaLuz: forma, linterna: linternaAlOeste() });
    escena.registrarSoloConLuz(hilos, null);
    assert.equal(escena.soloConLuz.length, 1);
    escena.recortarALaLinterna(1);
    assert.equal(hilos.mascara, 'recorte');
    const [abanico] = dibujado;
    assert.ok(puntoEnPoligono({ x: 200, y: 500 }, abanico), 'lo que está delante, dentro del cono, se ve');
    assert.ok(!puntoEnPoligono({ x: 900, y: 500 }, abanico), 'lo que está detrás, no');
    assert.ok(!puntoEnPoligono({ x: 400, y: 150 }, abanico), 'lo que está a un lado, no');
    escena.recortarALaLinterna(0);
    assert.equal(hilos.mascara, null);
    const f = formaDeLaLinterna(escena.linterna.luz, escena.linterna.poligono, CONO_DE_LINTERNA.radioHalo);
    assert.equal(f.halo.radio, CONO_DE_LINTERNA.radioHalo);
});
