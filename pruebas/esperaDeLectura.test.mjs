// Antes del informe, la última tarjeta se lee: se escribe entera, pasa su tiempo mínimo de lectura (src/ui/tiemposDeLectura.js) y se queda a
// la vista. Se prueba la regla sola y también con el Narrador y el panel de verdad sobre el reloj simulado de Phaser.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearEscena } from './escenaSimulada.mjs';
import EsperaDeLectura, { quedaPorLeer, MARGEN_PARA_SOSTENER_MS } from '../src/motor/EsperaDeLectura.js';
import Narrador from '../src/ui/Narrador.js';
import PanelInvestigacion from '../src/ui/PanelInvestigacion.js';
import { LECTURA, tiempoDeLectura } from '../src/ui/tiemposDeLectura.js';
import { leerJson } from './ayudasDeMapa.mjs';

const nada = { tarjetas: [], enCola: { libreta: 0, ambiental: 0 }, ocupada: false };
const con = (tarjeta, extra = {}) => ({ ...nada, tarjetas: [{ id: 'a', tipo: 'libreta', ...tarjeta }], ...extra });

test('si no queda nada por leer, no se espera; si queda algo, sí', () => {
    assert.equal(quedaPorLeer(nada), false);
    assert.equal(quedaPorLeer(con({ fase: 'saliendo', restanteMs: 0 })), false, 'ya cumplió su tiempo y se va');
    for (const fase of ['nueva', 'escribiendo', 'leyendo']) assert.equal(quedaPorLeer(con({ fase, restanteMs: 100 })), true, fase);
    assert.equal(quedaPorLeer({ ...nada, enCola: { libreta: 1, ambiental: 0 } }), true);
    assert.equal(quedaPorLeer({ ...nada, enCola: { libreta: 0, ambiental: 2 } }), true);
    assert.equal(quedaPorLeer({ ...nada, ocupada: true }), true);
});

test('no está lista mientras se escribe ni antes de cumplir el tiempo de lectura; al final se congela y recién entonces está lista', () => {
    const espera = new EsperaDeLectura();
    assert.deepEqual(espera.actualizar(16, con({ fase: 'escribiendo', restanteMs: 0 })), { sostener: [], listo: false });
    assert.deepEqual(espera.actualizar(16, con({ fase: 'leyendo', restanteMs: 3000 })), { sostener: [], listo: false });
    const r = espera.actualizar(16, con({ fase: 'leyendo', restanteMs: 200 }));
    assert.deepEqual(r, { sostener: ['a'], listo: false }, 'se congela, pero aún le faltan 200 ms');
    assert.equal(espera.actualizar(150, con({ fase: 'leyendo', restanteMs: 200 })).listo, false);
    assert.deepEqual(espera.actualizar(60, con({ fase: 'leyendo', restanteMs: 200 })), { sostener: [], listo: true });
});

test('con otra tarjeta esperando turno no se congela (tiene que salir); con un texto importante en curso no está lista', () => {
    const espera = new EsperaDeLectura();
    const enCola = con({ fase: 'leyendo', restanteMs: 50 }, { enCola: { libreta: 1, ambiental: 0 } });
    assert.deepEqual(espera.actualizar(16, enCola), { sostener: [], listo: false });
    const otra = new EsperaDeLectura();
    otra.actualizar(16, con({ fase: 'leyendo', restanteMs: 10 }));
    assert.equal(otra.actualizar(500, con({ fase: 'leyendo', restanteMs: 10 }, { ocupada: true })).listo, false);
    assert.equal(otra.actualizar(16, con({ fase: 'leyendo', restanteMs: 10 })).listo, true);
});

// Con el Narrador y el panel de verdad: la pista del compartimento (la del nivel 6), cuadro a cuadro
function montar() {
    const escena = crearEscena();
    const panel = new PanelInvestigacion(escena, { profundidad: 1, ajustarAlContenido: true });
    panel.reposicionar({ x: 0, y: 0, ancho: 330, alto: 330 });
    const narrador = new Narrador({ panel, presentacion: { abrir() { }, cerrar() { }, actualizarTotal() { } } });
    const estado = () => ({
        tarjetas: panel.tarjetas.map(t => ({ id: t, tipo: t.tipo, fase: t.fase, restanteMs: t.temporizador?.getRemaining() ?? 0 })),
        enCola: { libreta: narrador.secundarios.length, ambiental: narrador.colaAmbiental.length }, ocupada: narrador.bloqueando()
    });
    return { escena, panel, narrador, estado };
}

// Hace lo que hace la escena cada cuadro; devuelve los ms hasta que se puede ofrecer "continuar"
function esperar({ escena, estado }, delta = 16, tope = 60000) {
    const espera = new EsperaDeLectura();
    for (let ms = delta; ms <= tope; ms += delta) {
        escena.cuadro(delta);
        const { sostener, listo } = espera.actualizar(delta, estado());
        for (const t of sostener) t.temporizador.paused = true;
        if (listo) return ms;
    }
    return null;
}

const pista = leerJson('assets/narrativa/nivel6.json').pistas.find(p => p.id === 'n6-pista-compartimento');
const mensaje = (acontecimiento, texto) => ({ acontecimiento, ref: acontecimiento, texto, clase: 'secundaria', alCompletar: 'conservar' });

test('la pista del compartimento se escribe entera, pasa su tiempo de lectura y SIGUE a la vista cuando se ofrece continuar', () => {
    for (const delta of [6, 16, 50]) {
        const m = montar();
        m.narrador.contar(mensaje('pista', pista.texto));
        const tarjeta = m.panel.tarjetas[0];
        assert.equal(quedaPorLeer(m.estado()), true);
        const ms = esperar(m, delta);
        const escritura = pista.texto.length * LECTURA.escrituraPorLetraMs;
        assert.ok(ms >= escritura + tiempoDeLectura(pista.texto) - delta, `con cuadros de ${delta} ms: ${ms} ms`);
        assert.equal(tarjeta.fase, 'leyendo', 'sigue a la vista, no se fue');
        assert.equal(tarjeta.cuerpo.text, tarjeta.envuelto, 'escrita entera');
        m.escena.cuadros(2000, 16);                   // mucho después, sin pulsar, sigue ahí
        assert.equal(tarjeta.fase, 'leyendo');
    }
    assert.ok(MARGEN_PARA_SOSTENER_MS < LECTURA.lecturaMinimaMs);
});

test('con dos tarjetas pendientes (el abrigo y las pilas del nivel 5), la primera se lee, sale y la segunda se queda', () => {
    const m = montar();
    m.narrador.contar(mensaje('abrigo', 'Empapado, escondido tras la cortina.'));
    m.narrador.contar(mensaje('pilas', 'Pilas en el bolsillo de un abrigo ajeno.'));
    const primera = m.panel.tarjetas[0];
    const ms = esperar(m);
    assert.ok(ms >= 2 * LECTURA.lecturaMinimaMs, `${ms} ms: las dos cumplieron su tiempo`);
    assert.equal(primera.fase, 'terminada');
    assert.equal(m.panel.tarjetas.length, 1);
    assert.equal(m.panel.tarjetas[0].mensaje.acontecimiento, 'pilas');
    assert.equal(m.narrador.secundarios.length, 0);
});

test('una tarjeta ambiental (una marca) también se espera', () => {
    const m = montar();
    m.narrador.contar({ ...mensaje('marca', 'El polvo está intacto.'), clase: 'ambiental' });
    assert.equal(quedaPorLeer(m.estado()), true);
    assert.ok(esperar(m) >= tiempoDeLectura('El polvo está intacto.') - 16);
    assert.equal(m.panel.tarjetas.length, 1);
});

// El resplandor de las ayudas: respira despacio y nunca pasa del alfa bajo
import { respirar, RESPIRACION } from '../src/motor/Respiracion.js';

test('el resplandor de las ayudas aparece y se apaga cada 2,5 s con un máximo de 0,25', () => {
    assert.equal(RESPIRACION.cicloS, 2.5);
    assert.equal(RESPIRACION.alfaMaximo, 0.25);
    assert.ok(respirar(0) < 1e-9);
    assert.ok(Math.abs(respirar(1.25) - 0.25) < 1e-9, 'el más brillante, a la mitad del ciclo');
    assert.ok(respirar(2.5) < 1e-9);
    for (let t = 0; t < 10; t += 0.01) assert.ok(respirar(t) >= 0 && respirar(t) <= 0.25 + 1e-9);
    for (let t = 0; t < 2.5; t += 1 / 60) assert.ok(Math.abs(respirar(t + 1 / 60) - respirar(t)) < 0.006, 'sin saltos');
});
