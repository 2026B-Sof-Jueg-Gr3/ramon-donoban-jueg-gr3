// Ayuda sin texto y corriente de aire
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import Ayuda from '../src/motor/Ayuda.js';
import Investigacion from '../src/motor/Investigacion.js';
import { velocidadDeCorriente, CORRIENTE } from '../src/motor/Corriente.js';

const RAIZ = new URL('../', import.meta.url);
const leerJson = ruta => JSON.parse(readFileSync(new URL(ruta, RAIZ), 'utf8'));
const narrativa = leerJson('assets/narrativa/nivel1.json');
const reglas = leerJson('assets/investigaciones/nivel1.json');
const nuevaInvestigacion = () => new Investigacion(reglas, narrativa);
const nuevaAyuda = (inv = nuevaInvestigacion(), config = reglas.ayuda) => new Ayuda(config, inv);
const pasar = (ayuda, segundos, opciones, dt = 1 / 60) => {
    let r;
    for (let t = 0; t < segundos - 1e-9; t += dt) r = ayuda.actualizar(dt, opciones);
    return r;
};

// Lo que hace la escena al descubrir algo: las reglas deciden qué sale y la ayuda se reinicia si salió algo
const descubrir = (inv, ayuda, accion) => { const eventos = accion(inv); if (eventos.length) ayuda.alDescubrir(); return eventos; };

// ── Ayuda ───────────────────────────────────────────────────────────────────

test('empieza con 45 segundos, tanto en las reglas como por defecto', () => {
    assert.equal(reglas.ayuda.espera, 45);
    assert.equal(new Ayuda({}, nuevaInvestigacion()).espera, 45);
});

test('no se activa antes de la espera y se activa al cumplirla, indicando qué reforzar', () => {
    const ayuda = nuevaAyuda();
    assert.equal(pasar(ayuda, 44.5), null);
    assert.equal(ayuda.activa, false);
    const refuerzo = pasar(ayuda, 1);
    assert.equal(refuerzo.efecto, 'marcas');
    assert.equal(ayuda.activa, true);
    assert.equal(pasar(ayuda, 30).efecto, 'marcas', 'sigue activa mientras no se descubra nada');
});

test('descubrir algo la apaga y reinicia la cuenta; vuelve a activarse tras otra espera completa', () => {
    const ayuda = nuevaAyuda();
    pasar(ayuda, 50);
    assert.equal(ayuda.activa, true);
    ayuda.alDescubrir();
    assert.equal(ayuda.activa, false, 'se apaga al instante');
    assert.equal(ayuda.actualizar(1 / 60), null);
    assert.equal(pasar(ayuda, 44), null, 'la cuenta empezó de cero');
    assert.equal(pasar(ayuda, 1.5).efecto, 'marcas');
});

test('cada descubrimiento intermedio vuelve a empezar la cuenta', () => {
    const ayuda = nuevaAyuda();
    for (let i = 0; i < 5; i++) {
        pasar(ayuda, 40);
        ayuda.alDescubrir();
    }
    assert.equal(ayuda.activa, false, '5 × 40 s en total, pero nunca 45 seguidos');
});

test('durante una pausa narrativa no cuenta (leer un texto no es quedarse sin ideas)', () => {
    const ayuda = nuevaAyuda();
    pasar(ayuda, 40);
    assert.equal(pasar(ayuda, 300, { pausado: true }), null);
    assert.equal(pasar(ayuda, 4), null, 'siguen faltando 5 s');
    assert.equal(pasar(ayuda, 2).efecto, 'marcas');
});

test('la espera es configurable', () => {
    const ayuda = nuevaAyuda(nuevaInvestigacion(), { espera: 3, refuerzos: reglas.ayuda.refuerzos });
    assert.equal(pasar(ayuda, 2.9), null);
    assert.equal(pasar(ayuda, 0.2).efecto, 'marcas');
    ayuda.espera = 10;
    assert.equal(pasar(ayuda, 1), null, 'cambiar la espera con la ayuda ya activa la apaga hasta cumplir la nueva');
});

test('cuando ya salió la revelación de la ventana, la ayuda deja de empujar hacia la corriente', () => {
    const inv = nuevaInvestigacion();
    const ayuda = nuevaAyuda(inv);
    descubrir(inv, ayuda, i => i.ilumino('n1-marca-arrastre'));
    descubrir(inv, ayuda, i => i.examino('pila-de-cajas'));
    assert.equal(pasar(ayuda, 50).efecto, 'corriente');
    inv.miroDetras('pila-de-cajas', 'ventana');
    assert.notEqual(ayuda.actualizar(1 / 60)?.efecto, 'corriente', 'ya no hace falta');
    inv.recogio('n1-pista-periodico');                 // el recorte (obligatorio) también recogido: ya no queda nada que señalar
    assert.equal(ayuda.actualizar(1 / 60), null);
    assert.equal(pasar(ayuda, 100), null);
});

test('con varios refuerzos elige el primero que todavía vale', () => {
    const inv = nuevaInvestigacion();
    const config = {
        espera: 1, refuerzos: [
            { efecto: 'primero', mientras: { sinContar: ['revelacion:1'] } },
            { efecto: 'segundo', mientras: { sinContar: ['revelacion:0'] } },
            { efecto: 'ultimo' }
        ]
    };
    const ayuda = nuevaAyuda(inv, config);
    assert.equal(pasar(ayuda, 2).efecto, 'primero');
    inv.miroDetras('pila-de-cajas', 'ventana');
    assert.equal(ayuda.actualizar(1 / 60).efecto, 'segundo');
    inv.ilumino('n1-marca-arrastre'); inv.examino('pila-de-cajas');
    assert.equal(ayuda.actualizar(1 / 60).efecto, 'ultimo');
});

test('sin refuerzos configurados nunca se activa', () => {
    assert.equal(pasar(nuevaAyuda(nuevaInvestigacion(), { espera: 1 }), 100), null);
});

test('funciona igual con cuadros lentos o rápidos', () => {
    const lenta = nuevaAyuda(), rapida = nuevaAyuda();
    pasar(lenta, 45.01, undefined, 0.5);
    pasar(rapida, 45.01, undefined, 1 / 180);
    assert.equal(lenta.activa, true);
    assert.equal(rapida.activa, true);
});

// ── Corriente ───────────────────────────────────────────────────────────────

const cerca = (a, b, t = 1e-9) => assert.ok(Math.abs(a - b) <= t, `${a} no es ≈ ${b}`);
const origen = { x: 1984, y: 246 };

test('la corriente apunta siempre hacia la ventana rota, desde cualquier lado', () => {
    for (const p of [{ x: 100, y: 400 }, { x: 1900, y: 500 }, { x: 2200, y: 300 }, { x: 1984, y: 800 }, { x: 1000, y: 246 }]) {
        const v = velocidadDeCorriente(p, origen);
        const hacia = { x: origen.x - p.x, y: origen.y - p.y };
        const d = Math.hypot(hacia.x, hacia.y);
        cerca(v.x / Math.hypot(v.x, v.y), hacia.x / d, 1e-9);
        cerca(v.y / Math.hypot(v.x, v.y), hacia.y / d, 1e-9);
    }
});

test('es más fuerte cuanto más cerca de la ventana, y nunca cero ni infinita', () => {
    const rapidez = d => Math.hypot(...Object.values(velocidadDeCorriente({ x: origen.x - d, y: origen.y }, origen)));
    cerca(rapidez(2000), CORRIENTE.base);
    cerca(rapidez(900), CORRIENTE.base);
    assert.ok(rapidez(600) > rapidez(900) && rapidez(300) > rapidez(600) && rapidez(50) > rapidez(300));
    assert.ok(rapidez(1) <= CORRIENTE.base + CORRIENTE.extra + 1e-9);
});

test('la fuerza (que sube la ayuda) multiplica la velocidad sin cambiar la dirección', () => {
    const p = { x: 1500, y: 400 };
    const normal = velocidadDeCorriente(p, origen), fuerte = velocidadDeCorriente(p, origen, { fuerza: 1.7 });
    cerca(fuerte.x, normal.x * 1.7); cerca(fuerte.y, normal.y * 1.7);
});

test('en el propio origen no hay corriente (sin dividir por cero)', () => {
    assert.deepEqual(velocidadDeCorriente(origen, origen), { x: 0, y: 0 });
    assert.ok(Object.isFrozen(CORRIENTE));
});

// ── Ayuda para lo que hace falta: marcas → pila → corriente ──────────────────

const { crearEscena } = await import('./escenaSimulada.mjs');
const { default: Narracion } = await import('../src/presentacion/Narracion.js');
const { LECTURA } = await import('../src/ui/tiemposDeLectura.js');

test('la prioridad configurada es libreta (solo con la deducción disponible), marcas, pila, corriente y el recorte (obligatorio)', () => {
    assert.deepEqual(reglas.ayuda.refuerzos.map(r => r.efecto), ['libreta', 'marcas', 'pila', 'corriente', 'recorte']);
    assert.deepEqual(reglas.ayuda.refuerzos[0].mientras, { deduccion: 'disponible' });
});

test('sin descubrir nada, ayuda primero con las marcas; después, con la pila; luego, con la corriente; al final, con el recorte', () => {
    const inv = nuevaInvestigacion();
    const ayuda = nuevaAyuda(inv);
    assert.equal(pasar(ayuda, 46).efecto, 'marcas');
    descubrir(inv, ayuda, i => i.ilumino('n1-marca-arrastre'));
    assert.equal(ayuda.activa, false, 'al descubrir las marcas se apaga y la cuenta vuelve a empezar');
    assert.equal(pasar(ayuda, 44), null);
    assert.equal(pasar(ayuda, 2).efecto, 'pila', 'con las marcas descubiertas, ahora la pila');
    descubrir(inv, ayuda, i => i.examino('pila-de-cajas'));
    assert.equal(ayuda.activa, false, 'al examinar la pila se apaga');
    assert.equal(pasar(ayuda, 44), null);
    assert.equal(pasar(ayuda, 2).efecto, 'corriente', 'con las dos cosas hechas y sin mirar detrás, la corriente');
    descubrir(inv, ayuda, i => i.miroDetras('pila-de-cajas', 'ventana'));
    assert.equal(pasar(ayuda, 46).efecto, 'recorte', 'falta el recorte, que es obligatorio');
    descubrir(inv, ayuda, i => i.recogio('n1-pista-periodico'));
    assert.equal(pasar(ayuda, 200), null, 'con todo descubierto ya no ayuda');
});

test('la prioridad no depende del orden en que se descubra: si falta la pila y no las marcas, ayuda con las marcas, y al revés', () => {
    const soloPila = nuevaInvestigacion(), a1 = nuevaAyuda(soloPila);
    descubrir(soloPila, a1, i => i.examino('pila-de-cajas'));      // la pila examinada antes que las marcas
    assert.equal(pasar(a1, 46).efecto, 'marcas');
    const soloMarcas = nuevaInvestigacion(), a2 = nuevaAyuda(soloMarcas);
    descubrir(soloMarcas, a2, i => i.ilumino('n1-marca-arrastre'));
    assert.equal(pasar(a2, 46).efecto, 'pila');
});

test('cada refuerzo se apaga cuando sale su línea, sin esperar a que pase otra espera', () => {
    for (const [efecto, hacer, linea] of [
        ['marcas', i => i.ilumino('n1-marca-arrastre'), 'marca:n1-marca-arrastre'],
        ['pila', i => i.examino('pila-de-cajas'), 'comentario:0'],
        ['corriente', i => i.miroDetras('pila-de-cajas', 'ventana'), 'revelacion:1']
    ]) {
        const inv = nuevaInvestigacion(), ayuda = nuevaAyuda(inv);
        // Se deja hecho lo anterior en la prioridad, para que este refuerzo sea el que ayuda
        if (efecto !== 'marcas') descubrir(inv, ayuda, i => i.ilumino('n1-marca-arrastre'));
        if (efecto === 'corriente') descubrir(inv, ayuda, i => i.examino('pila-de-cajas'));
        assert.equal(pasar(ayuda, 46).efecto, efecto);
        const antes = inv.yaSalio(linea);
        descubrir(inv, ayuda, hacer);
        assert.equal(antes, false);
        assert.equal(inv.yaSalio(linea), true, `salió ${linea}`);
        assert.equal(ayuda.activa, false, `se apagó "${efecto}"`);
        assert.equal(ayuda.actualizar(1 / 60), null);
    }
});

test('un descubrimiento cualquiera (una nota, una marca de polvo) reinicia la cuenta de la ayuda', () => {
    const inv = nuevaInvestigacion(), ayuda = nuevaAyuda(inv);
    pasar(ayuda, 40);
    descubrir(inv, ayuda, i => i.ilumino('n1-marca-polvo'));
    assert.equal(pasar(ayuda, 44), null);
    assert.equal(pasar(ayuda, 2).efecto, 'marcas', 'sigue faltando lo mismo');
});

test('no ayuda con las pistas opcionales ni con las pilas; sí con el recorte, que es obligatorio', () => {
    const obligatorias = (reglas.deduccion.obligatorias || []).map(id => `pista:${id}`);
    assert.deepEqual(obligatorias, ['pista:n1-pista-periodico']);
    const idsOpcionales = reglas.reglas.filter(r => (r.id.startsWith('pista:') || r.id === 'bateria') && !obligatorias.includes(r.id)).map(r => r.id);
    assert.equal(idsOpcionales.length, 2);
    for (const r of reglas.ayuda.refuerzos) {
        assert.ok(!['pista', 'pistas', 'bateria', 'pilas'].includes(r.efecto), `el refuerzo "${r.efecto}" no es de una pista opcional`);
        for (const id of r.mientras?.sinContar || []) assert.ok(!idsOpcionales.includes(id), `"${id}" es opcional`);
    }
    // Con todo lo necesario descubierto (y el recorte), no ayuda aunque no se haya recogido nada más
    const inv = nuevaInvestigacion(), ayuda = nuevaAyuda(inv);
    descubrir(inv, ayuda, i => i.ilumino('n1-marca-arrastre'));
    descubrir(inv, ayuda, i => i.examino('pila-de-cajas'));
    descubrir(inv, ayuda, i => i.miroDetras('pila-de-cajas', 'ventana'));
    descubrir(inv, ayuda, i => i.recogio('n1-pista-periodico'));
    assert.equal(inv.yaSalio('bateria') || inv.yaSalio('pista:n1-pista-huella'), false);
    assert.equal(pasar(ayuda, 600), null);
});

test('no cuenta durante la pausa narrativa (que empieza enseguida, sin cuenta previa a la revelación)', () => {
    const escena = crearEscena({ ancho: 1280, alto: 720 });
    const narracion = new Narracion(escena, { profundidad: 100000, jugadorEnPantalla: () => ({ x: 200, y: 200 }), alPausar() { }, alReanudar() { }, alPulsar() { } });
    const inv = nuevaInvestigacion(), ayuda = nuevaAyuda(inv);
    pasar(ayuda, 20);
    const antes = ayuda.inactividad;
    // Como la escena: cada cuadro, la ayuda no cuenta si la narración bloquea el juego
    const cuadro = () => { escena.cuadro(16); narracion.actualizar(); ayuda.actualizar(0.016, { pausado: narracion.bloqueando }); };
    const marca = { acontecimiento: 'm', regla: 'm', ref: 'm', clase: 'ambiental', categoria: 'marcas', texto: 'Marca', alCompletar: 'conservar' };
    const rev = { acontecimiento: 'r', regla: 'r', ref: 'r', clase: 'importante', categoria: 'revelaciones', texto: 'Revelación', alCompletar: 'conservar' };
    narracion.contarTodos([marca, rev]);
    ayuda.alDescubrir();
    const inicio = ayuda.inactividad;
    assert.equal(narracion.narrador.bloqueando(), true, 'la pausa narrativa empieza enseguida');
    for (let t = 0; t < 5000; t += 16) cuadro();
    assert.equal(ayuda.inactividad, inicio, 'durante la pausa tampoco cuenta');
    for (let i = 0; i < 6 && narracion.bloqueando; i++) { narracion.avanzar(); for (let t = 0; t < 640; t += 16) cuadro(); }
    assert.equal(narracion.bloqueando, false);
    for (let t = 0; t < 1000; t += 16) cuadro();
    assert.ok(ayuda.inactividad > inicio, 'al terminar la pausa vuelve a contar');
    assert.ok(antes > 0);
});
