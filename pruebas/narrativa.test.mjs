// Presentación narrativa: pausa real en los importantes, colas, identidad, suspensión, cierre del nivel y entradas
import { test } from 'node:test';
import assert from 'node:assert/strict';
import Narrador, { armarPaginasDeCierre } from '../src/ui/Narrador.js';
import { destinoDeEntrada } from '../src/ui/Entradas.js';
import { LECTURA, tiempoDeLectura } from '../src/ui/tiemposDeLectura.js';

// ── Dobles de prueba: registran lo que el Narrador les pide ─────────────────

function presentacionFalsa() {
    const p = {
        abierto: false, paginas: [], escribiendo: false, avisos: 0, cerrada: 0,
        abrir(texto, op) { p.abierto = true; p.escribiendo = true; p.actual = { texto, ...op }; p.paginas.push({ texto, ...op }); },
        actualizarTotal(total) { p.actual.total = total; },
        alTocar() {
            if (p.escribiendo) { p.escribiendo = false; return; }
            const op = p.actual;
            op.alCerrar?.();
        },
        llamarAtencion() { p.avisos++; },
        cerrar() { p.abierto = false; p.cerrada++; }
    };
    return p;
}

function panelFalso() {
    const p = {
        tarjetas: [], pausado: false, retiradas: 0,
        mostrarSecundaria(m, op) { p.tarjetas.push({ tipo: 'libreta', m, op, pausada: p.pausado }); },
        mostrarAmbiental(m, op) { p.tarjetas.push({ tipo: 'ambiental', m, op, pausada: p.pausado }); },
        pausar() { p.pausado = true; p.tarjetas.forEach(t => { t.pausada = true; }); },
        reanudar() { p.pausado = false; p.tarjetas.forEach(t => { t.pausada = false; }); },
        retirarTodo() { p.retiradas += p.tarjetas.length; p.tarjetas = []; },
        libreta: () => p.tarjetas.find(t => t.tipo === 'libreta'),
        ambientales: () => p.tarjetas.filter(t => t.tipo === 'ambiental'),
        // Simula el fin natural de una tarjeta (su lectura y su salida)
        terminar(t) { assert.ok(!t.pausada, 'una tarjeta suspendida no puede terminar'); t.op.alLeida?.(); p.tarjetas = p.tarjetas.filter(x => x !== t); t.op.alTerminar(); }
    };
    return p;
}

const crear = () => {
    const panel = panelFalso(), presentacion = presentacionFalsa();
    const llamadas = { pausar: 0, reanudar: 0 };
    const narrador = new Narrador({ panel, presentacion, alPausar: () => llamadas.pausar++, alReanudar: () => llamadas.reanudar++ });
    return { narrador, panel, presentacion, llamadas };
};
const imp = (id, texto = `texto ${id}`) => ({ acontecimiento: id, ref: id, clase: 'importante', texto });
const sec = (id, texto = `texto ${id}`, extra = {}) => ({ acontecimiento: id, ref: id, clase: 'secundaria', texto, alCompletar: 'conservar', ...extra });
const amb = (id, texto = `texto ${id}`) => ({ acontecimiento: id, ref: id, clase: 'ambiental', texto });
// El jugador lee una página: primer toque completa la escritura, segundo avanza
const leer = narrador => { narrador.avanzar(); narrador.avanzar(); };

// ── Tiempos ───────────────────────────────────────────────────────────────

test('tiempo de lectura: mínimo de 2,5 s y 55 ms por letra, contado desde el final de la escritura', () => {
    assert.equal(tiempoDeLectura('corto'), LECTURA.lecturaMinimaMs);
    assert.equal(tiempoDeLectura('x'.repeat(100)), 5500);
    assert.ok(Object.isFrozen(LECTURA));
});

// ── Pausa narrativa ─────────────────────────────────────────────────────────

test('un importante pausa el juego en la misma llamada que lo registra', () => {
    const { narrador, presentacion, panel, llamadas } = crear();
    assert.equal(narrador.bloqueando(), false);
    narrador.contar(imp('pista:A:recogida'));
    assert.equal(narrador.bloqueando(), true, 'al volver de contar() el juego ya está en pausa');
    assert.equal(llamadas.pausar, 1);
    assert.equal(panel.pausado, true);
    assert.equal(presentacion.actual.texto, 'texto pista:A:recogida');
});

test('varios importantes de una misma acción: una sola pausa, en orden; al final se reanuda', () => {
    const { narrador, presentacion, llamadas } = crear();
    narrador.contar(imp('pista:A:recogida'));
    narrador.contar(imp('avance:1'));
    assert.equal(llamadas.pausar, 1, 'una sola pausa');
    assert.equal(presentacion.actual.total, 2);
    narrador.avanzar();                                   // completa la escritura
    assert.equal(presentacion.actual.texto, 'texto pista:A:recogida');
    narrador.avanzar();                                   // siguiente
    assert.equal(presentacion.actual.texto, 'texto avance:1');
    assert.equal(presentacion.actual.indice, 2);
    assert.equal(narrador.bloqueando(), true);
    leer(narrador);
    assert.equal(narrador.bloqueando(), false);
    assert.equal(llamadas.reanudar, 1);
    assert.equal(presentacion.abierto, false);
    assert.deepEqual(presentacion.paginas.map(p => p.texto), ['texto pista:A:recogida', 'texto avance:1']);
});

test('fuera de la pausa, avanzar no hace nada', () => {
    const { narrador } = crear();
    assert.equal(narrador.avanzar(), false);
});

// ── Identidad y duplicados ──────────────────────────────────────────────────

test('una misma ocurrencia emitida dos veces se presenta una sola vez', () => {
    const { narrador, presentacion } = crear();
    assert.equal(narrador.contar(imp('pista:A:recogida')), true);
    assert.equal(narrador.contar(imp('pista:A:recogida')), false);
    assert.equal(presentacion.actual.total, 1);
});

test('acontecimientos distintos sobre la misma entidad no se fusionan', () => {
    const { narrador, presentacion } = crear();
    narrador.contar({ ...imp('pista:A:recogida', 'La recojo'), ref: 'A' });
    narrador.contar({ ...imp('pista:A:analizada', 'La analizo'), ref: 'A' });
    leer(narrador); leer(narrador);
    assert.deepEqual(presentacion.paginas.map(p => p.texto), ['La recojo', 'La analizo']);
});

test('repetibles: misma interacción duplicada se ignora; nueva igual y pendiente se agrupa; distinta se presenta', () => {
    const { narrador, panel } = crear();
    const examinar = (accion, texto = 'Copas limpias') => sec(`mueble:copas:examinar#${accion}`, texto, { ref: 'copas', repetible: true });
    assert.equal(narrador.contar(examinar(1)), true);
    assert.equal(narrador.contar(examinar(1)), false, 'segunda emisión de la misma acción');
    assert.equal(narrador.contar(examinar(2)), true, 'nueva acción, mismo contenido visible: se agrupa');
    assert.equal(narrador.contar(examinar(3, 'Hay una nota bajo las copas')), true, 'contenido distinto');
    assert.equal(narrador.agrupadas, 1);
    panel.terminar(panel.libreta());
    assert.equal(panel.libreta().m.texto, 'Hay una nota bajo las copas');
    panel.terminar(panel.libreta());
    narrador.contar(examinar(4));
    assert.equal(panel.libreta().m.texto, 'Copas limpias', 'ya no estaba pendiente: es una lectura nueva');
});

// ── Secundarios y ambientales durante la pausa ──────────────────────────────

test('un secundario visible se suspende durante la pausa (no termina oculto) y sigue al reanudar', () => {
    const { narrador, panel } = crear();
    narrador.contar(sec('comentario:a'));
    const tarjeta = panel.libreta();
    narrador.contar(imp('pista'));
    assert.equal(tarjeta.pausada, true);
    assert.throws(() => panel.terminar(tarjeta), /suspendida/);
    narrador.contar(sec('comentario:b'));
    assert.equal(panel.tarjetas.filter(t => t.tipo === 'libreta').length, 1, 'el nuevo espera: no compite con la presentación');
    leer(narrador);
    assert.equal(tarjeta.pausada, false);
    panel.terminar(tarjeta);
    assert.equal(panel.libreta().m.texto, 'texto comentario:b', 'los secundarios conservan su orden');
});

test('ambientales: hasta 3 a la vez, el resto en su cola; durante la pausa la cola no avanza', () => {
    const { narrador, panel } = crear();
    for (let i = 1; i <= 5; i++) narrador.contar(amb(`marca:${i}`));
    assert.deepEqual(panel.ambientales().map(t => t.m.acontecimiento), ['marca:1', 'marca:2', 'marca:3']);
    narrador.contar(imp('pista'));
    assert.ok(panel.ambientales().every(t => t.pausada), 'quedan suspendidos');
    narrador.contar(amb('marca:6'));
    assert.equal(panel.ambientales().length, 3);
    leer(narrador);
    panel.terminar(panel.ambientales()[0]);
    assert.deepEqual(panel.ambientales().map(t => t.m.acontecimiento), ['marca:2', 'marca:3', 'marca:4']);
    assert.deepEqual(narrador.colaAmbiental.map(m => m.acontecimiento), ['marca:5', 'marca:6'], 'nadie se pierde ni se fusiona');
});

// ── Cierre del nivel ────────────────────────────────────────────────────────

test('cierre sin pausa previa: notas con texto completo (la visible a medio leer primero) y el cierre; victoria al final', () => {
    const { narrador, panel, presentacion } = crear();
    narrador.contar(sec('mueble:copas:examinar#3', 'Copas de vino limpias.', { etiqueta: '🍷' }));
    narrador.contar(sec('comentario:error', 'No, eso no encaja.', { alCompletar: 'descartar' }));
    narrador.contar(sec('comentario:comentarios-0', 'Esta caja pesa más de lo que parece.'));
    narrador.contar(amb('marca:1'));
    let victoria = false;
    assert.equal(narrador.cerrarNivel({ texto: 'Caso cerrado.' }, () => { victoria = true; }), true);
    assert.equal(narrador.bloqueando(), true);
    assert.equal(panel.tarjetas.length, 0, 'el panel queda vacío: los ambientales se retiran');
    assert.deepEqual(presentacion.paginas.map(p => p.texto), ['• 🍷 Copas de vino limpias.\n• Esta caja pesa más de lo que parece.']);
    leer(narrador);
    assert.equal(presentacion.actual.texto, 'Caso cerrado.');
    assert.equal(victoria, false, 'la victoria no se adelanta');
    leer(narrador);
    assert.equal(victoria, true);
    assert.equal(narrador.contar(imp('tarde')), false, 'después del cierre no entra nada nuevo');
});

test('cierre: un secundario que ya terminó su lectura no se repite en las notas', () => {
    const { narrador, panel, presentacion } = crear();
    narrador.contar(sec('comentario:a', 'Ya leído.'));
    panel.libreta().op.alLeida();                // terminó su lectura, está desapareciendo
    narrador.contar(sec('comentario:b', 'Pendiente.'));
    narrador.cerrarNivel({ texto: 'Fin.' }, () => { });
    assert.equal(presentacion.actual.texto, '• Pendiente.');
});

test('cierre durante una pausa de la acción final: importantes, notas, cierre y victoria, en ese orden', () => {
    const { narrador, presentacion, llamadas } = crear();
    narrador.contar(sec('comentario:a', 'Nota pendiente.'));
    narrador.contar(imp('pista:final', 'Una pista en el último paso.'));     // la acción final generó un importante
    let victoria = false;
    narrador.cerrarNivel({ texto: 'Caso cerrado.' }, () => { victoria = true; });
    const vistas = [];
    for (let i = 0; i < 10 && !victoria; i++) { vistas.push(presentacion.actual.texto); leer(narrador); }
    assert.deepEqual(vistas, ['Una pista en el último paso.', '• Nota pendiente.', 'Caso cerrado.']);
    assert.equal(victoria, true);
    assert.equal(llamadas.reanudar, 0, 'no se reanuda el juego: el nivel terminó');
});

test('cierre sin nada que presentar ni texto de cierre: devuelve false para que la escena siga sola', () => {
    const { narrador } = crear();
    assert.equal(narrador.cerrarNivel(null, () => { }), false);
});

test('las notas largas se reparten en varias páginas sin cortar ningún texto', () => {
    const largo = n => ({ texto: `${n}: ` + 'x'.repeat(250) });
    const paginas = armarPaginasDeCierre([], [largo('a'), largo('b'), largo('c')], { texto: 'Fin.' });
    assert.deepEqual(paginas.map(p => p.titulo), ['📒 NOTAS DE LA LIBRETA (1/3)', '📒 NOTAS DE LA LIBRETA (2/3)', '📒 NOTAS DE LA LIBRETA (3/3)', undefined]);
    for (const [i, letra] of ['a', 'b', 'c'].entries()) assert.equal(paginas[i].texto, `• ${letra}: ` + 'x'.repeat(250));
});

// ── Reinicio y errores ──────────────────────────────────────────────────────

test('detener (reiniciar o salir) vacía todo y quita la pausa', () => {
    const { narrador, panel, presentacion } = crear();
    narrador.contar(sec('comentario:a'));
    narrador.contar(amb('marca:1'));
    narrador.contar(imp('intro'));
    narrador.detener();
    assert.equal(narrador.bloqueando(), false);
    assert.equal(presentacion.abierto, false);
    assert.equal(panel.tarjetas.length, 0);
    assert.equal(narrador.contar(imp('intro')), true, 'nuevo intento: la intro vuelve a contarse');
});

test('un error de presentación no se propaga ni deja al jugador atrapado', () => {
    const { narrador, panel, presentacion } = crear();
    const errores = [];
    const original = console.error;
    console.error = (...a) => errores.push(a.join(' '));
    try {
        const abrir = presentacion.abrir;
        presentacion.abrir = () => { presentacion.abrir = abrir; throw new Error('fallo de dibujo'); };
        narrador.contar(imp('roto'));
        assert.equal(narrador.bloqueando(), false, 'sin poder presentarlo, el juego no queda en pausa para siempre');
        panel.mostrarSecundaria = () => { throw new Error('fallo de nota'); };
        assert.doesNotThrow(() => narrador.contar(sec('comentario:x')));
        presentacion.abrir = () => { throw new Error('fallo de cierre'); };
        let victoria = false;
        assert.doesNotThrow(() => narrador.cerrarNivel({ texto: 'Fin' }, () => { victoria = true; }));
        assert.equal(victoria, true, 'si la presentación falla, el nivel igual termina');
        assert.ok(errores.length >= 3, 'los errores quedan registrados');
    } finally {
        console.error = original;
    }
});

// ── Distribuidor de entradas ────────────────────────────────────────────────

test('entradas: durante la pausa solo avanzar y Esc; nada queda pendiente', () => {
    const jugando = { pausaNarrativa: false }, pausa = { pausaNarrativa: true };
    for (const tecla of ['mover', 'deshacer', 'reiniciar']) {
        assert.equal(destinoDeEntrada(tecla, jugando), 'juego');
        assert.equal(destinoDeEntrada(tecla, pausa), 'avisar', `${tecla} se descarta durante la pausa`);
    }
    assert.equal(destinoDeEntrada('menu', pausa), 'juego', 'Esc funciona como antes');
    assert.equal(destinoDeEntrada('avanzar', jugando), null);
    assert.equal(destinoDeEntrada('avanzar', pausa), 'narrativa');
    assert.equal(destinoDeEntrada('avanzar', pausa, true), null, 'una tecla mantenida no salta acontecimientos');
});
