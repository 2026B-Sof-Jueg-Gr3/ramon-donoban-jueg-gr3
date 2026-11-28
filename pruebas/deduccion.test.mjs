// La libreta, la deducción y el aviso de la habitación 1: sin Phaser, con las reglas y la narrativa reales
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import Investigacion, { validarReglas } from '../src/motor/Investigacion.js';
import Libreta, { nombreEnLista } from '../src/motor/Libreta.js';
import Deduccion, { mezclar, validarDeduccion, caminosDe, hechosDe, cubren, coberturaMinima, pruebasNecesarias } from '../src/motor/Deduccion.js';
import AvisoDeDeduccion, { ESPERA_DEL_AVISO } from '../src/motor/AvisoDeDeduccion.js';
import Ayuda from '../src/motor/Ayuda.js';

const RAIZ = new URL('../', import.meta.url);
const leerJson = ruta => JSON.parse(readFileSync(new URL(ruta, RAIZ), 'utf8'));
const narrativa = leerJson('assets/narrativa/nivel1.json');
const reglas = leerJson('assets/investigaciones/nivel1.json');
const copia = o => JSON.parse(JSON.stringify(o));

// Los sucesos que el jugador puede provocar en el pasillo, por nombre
const SUCESOS = {
    polvo: inv => inv.ilumino('n1-marca-polvo'),
    arrastre: inv => inv.ilumino('n1-marca-arrastre'),
    cajas: inv => inv.examino('pila-de-cajas'),
    ventana: inv => inv.miroDetras('pila-de-cajas', 'ventana'),
    huella: inv => inv.recogio('n1-pista-huella'),
    periodico: inv => inv.recogio('n1-pista-periodico'),
    pilas: inv => inv.recogio('bateria')
};
const NOMBRES = Object.keys(SUCESOS);

function partida(...sucesos) {
    const inv = new Investigacion(reglas, narrativa);
    for (const s of sucesos) SUCESOS[s](inv);
    const libreta = new Libreta(reglas.deduccion, narrativa, inv);
    const deduccion = new Deduccion(reglas.deduccion, libreta, { azar: () => 0.5 });
    return { inv, libreta, deduccion };
}

function permutaciones(lista) {
    if (lista.length <= 1) return [lista];
    return lista.flatMap((x, i) => permutaciones([...lista.slice(0, i), ...lista.slice(i + 1)]).map(p => [x, ...p]));
}

// ── Los datos ───────────────────────────────────────────────────────────────

test('las reglas y los textos de la deducción del nivel 1 son coherentes', () => {
    assert.deepEqual(validarDeduccion(reglas, narrativa), []);
    assert.deepEqual(validarReglas(reglas, narrativa), []);
});

test('las reglas de la deducción no llevan texto: solo ids', () => {
    const contenido = JSON.stringify(reglas.deduccion);
    const textos = [...Object.values(narrativa.deduccion.pruebas), ...narrativa.deduccion.preguntas.flatMap(q => [q.texto, ...q.opciones.map(o => o.texto)]),
        ...narrativa.pistas.map(p => p.titulo)];
    for (const t of textos) assert.ok(!contenido.includes(t), `las reglas copian "${t}"`);
});

test('la lógica del nivel 1 es la aprobada: qué es correcto y qué pruebas valen', () => {
    const d = reglas.deduccion;
    assert.equal(d.maximoDePruebas, 2);
    assert.deepEqual(d.pruebas, {
        'ventana-rota': { sale: 'revelacion:1' },
        'cajas-movidas': { sale: 'revelacion:0' },
        'marcas-de-arrastre': { sale: 'marca:n1-marca-arrastre' },
        'polvo-removido': { sale: 'marca:n1-marca-polvo' },
        'n1-pista-huella': { sale: 'pista:n1-pista-huella' },
        'n1-pista-periodico': { sale: 'pista:n1-pista-periodico' }
    });
    // El recorte es obligatorio: es el único que da el nombre de Gerhard Voss (deducción del nivel 6)
    assert.deepEqual(d.obligatorias, ['n1-pista-periodico']);
    // Por hechos: las cortinas solo las explica la ventana; el desorden, las cajas movidas o las marcas de arrastre (dicen que hubo
    // alguien Y que movió las cosas a propósito); la huella y el polvo solo dicen que hubo alguien
    const AMBOS = ['hubo-alguien', 'lo-movio-a-proposito'];
    assert.deepEqual(d.preguntas.map(q => [q.id, q.correcta, q.necesita, q.aportan]), [
        ['cortinas', 'corriente', ['corriente'], { 'ventana-rota': ['corriente'] }],
        ['embrujado', 'a-proposito', AMBOS, { 'cajas-movidas': AMBOS, 'marcas-de-arrastre': AMBOS, 'n1-pista-huella': ['hubo-alguien'], 'polvo-removido': ['hubo-alguien'] }]
    ]);
    assert.ok(!d.preguntas.some(q => 'validas' in q || 'excepcion' in q));
    // El recorte se muestra, pero no prueba nada aquí; las pilas no son prueba
    assert.ok(!d.preguntas.some(q => 'n1-pista-periodico' in q.aportan));
    assert.ok(!('bateria' in d.pruebas) && !Object.values(d.pruebas).some(p => p.sale === 'bateria'));
});

test('la validación detecta datos rotos', () => {
    const roto = (cambiar, cambiarNarrativa = () => { }) => {
        const r = copia(reglas), n = copia(narrativa);
        cambiar(r.deduccion); cambiarNarrativa(n);
        return validarDeduccion(r, n);
    };
    assert.ok(roto(d => { d.pruebas['ventana-rota'].sale = 'no-existe'; }).length);
    assert.ok(roto(() => { }, n => { delete n.deduccion.pruebas['ventana-rota']; }).length, 'prueba sin nombre');
    assert.ok(roto(d => { d.preguntas[0].correcta = 'otra'; }).length, 'correcta inexistente');
    assert.ok(roto(d => { d.preguntas[1].necesita = ['a', 'b', 'c']; d.preguntas[1].aportan = { 'cajas-movidas': ['a'], 'polvo-removido': ['b'], 'n1-pista-huella': ['c'] }; }).length, 'pide más pruebas que el máximo');
    assert.ok(roto(d => { d.preguntas[1].aportan['no-existe'] = ['hubo-alguien']; }).length, 'prueba inexistente');
    assert.ok(roto(d => { d.preguntas[0].aportan = {}; }).length, 'sin pruebas que aporten');
    assert.ok(roto(d => { d.preguntas[0].necesita = []; }).length, 'sin hechos');
    assert.ok(roto(d => { d.preguntas[0].necesita = ['algo-que-nadie-aporta']; }).length, 'un hecho que ninguna prueba aporta');
    assert.ok(roto(d => { d.preguntas[0].aportan['ventana-rota'] = []; }).length, 'una prueba que no aporta nada');
    assert.ok(roto(d => { d.preguntas[0].validas = [['ventana-rota']]; }).length, 'el formato viejo ya no vale');
    assert.ok(roto(() => { }, n => { n.deduccion.preguntas[0].opciones.pop(); }).length, 'opciones != 3');
    assert.ok(roto(() => { }, n => { n.deduccion.preguntas[1].texto = ' '; }).length);
    assert.ok(roto(d => { d.pilas = 'x'; }).length);
    assert.ok(validarDeduccion({ reglas: [] }, narrativa).length);
});

// ── La libreta ──────────────────────────────────────────────────────────────

test('la libreta empieza vacía y solo muestra lo encontrado, nunca lo que falta', () => {
    const { libreta } = partida();
    assert.deepEqual(libreta.hallazgos(), []);
    assert.deepEqual(libreta.resumen(), { extras: 0, totalDeExtras: 2, pistas: 0, totalDePistas: 2, pilas: false });
    // Nada de lo que no se encontró aparece en ningún dato que entregue
    assert.equal(JSON.stringify(libreta.hallazgos()), '[]');
});

test('cada hallazgo sale de su regla y con su nombre corto', () => {
    assert.deepEqual(partida('ventana').libreta.hallazgos().map(h => [h.id, h.nombre]), [['ventana-rota', 'Ventana rota']]);
    assert.deepEqual(partida('polvo').libreta.hallazgos().map(h => [h.id, h.nombre]), [['polvo-removido', 'Polvo removido']]);
    assert.deepEqual(partida('arrastre').libreta.hallazgos().map(h => [h.id, h.nombre]), [['marcas-de-arrastre', 'Marcas de arrastre']]);
    // "Cajas movidas" necesita las dos cosas: las marcas de arrastre y examinar las cajas
    assert.deepEqual(partida('cajas').libreta.hallazgos(), []);
    assert.deepEqual(partida('arrastre', 'cajas').libreta.hallazgos().map(h => h.nombre), ['Cajas movidas', 'Marcas de arrastre'], 'siempre en el orden de las reglas, no en el que se encontraron');
});

test('las pistas usan su título actual y llevan su texto; las pruebas no llevan texto', () => {
    const { libreta } = partida('huella', 'periodico', 'ventana');
    const [ventana, huella, periodico] = libreta.hallazgos();
    assert.deepEqual(ventana, { id: 'ventana-rota', tipo: 'prueba', nombre: 'Ventana rota', texto: null });
    const pista = id => narrativa.pistas.find(p => p.id === id);
    assert.deepEqual(huella, { id: 'n1-pista-huella', tipo: 'pista', nombre: 'HUELLA DE BOTA', texto: pista('n1-pista-huella').texto });
    assert.deepEqual(periodico, { id: 'n1-pista-periodico', tipo: 'pista', nombre: 'RECORTE DE PERIÓDICO', texto: pista('n1-pista-periodico').texto });
});

test('las pilas no son una prueba de la libreta: solo cuentan en el informe', () => {
    const { libreta } = partida('pilas');
    assert.deepEqual(libreta.hallazgos(), []);
    assert.equal(libreta.resumen().pilas, true);
});

test('el resumen del informe cuenta los hallazgos extra (lo que no hace falta para deducir) y las pilas', () => {
    // Extras del pasillo: el polvo y la huella (2): orientan, pero ninguna respuesta mínima los necesita. La ventana, las cajas y las
    // marcas de arrastre son respuesta; el recorte es obligatorio.
    assert.deepEqual(partida('huella').libreta.resumen(), { extras: 1, totalDeExtras: 2, pistas: 1, totalDePistas: 2, pilas: false });
    assert.deepEqual(partida('huella', 'periodico', 'pilas', 'polvo', 'arrastre').libreta.resumen(), { extras: 2, totalDeExtras: 2, pistas: 2, totalDePistas: 2, pilas: true });
    assert.equal(partida('ventana', 'cajas', 'arrastre', 'periodico').libreta.resumen().extras, 0, 'la ventana, las cajas, las marcas y el recorte no son extra');
});

test('la libreta no depende del orden en que se encontraron las cosas (las 5 040 órdenes)', () => {
    const referencia = JSON.stringify(partida(...NOMBRES).libreta.hallazgos());
    assert.equal(partida(...NOMBRES).libreta.hallazgos().length, 6);
    for (const orden of permutaciones(NOMBRES)) assert.equal(JSON.stringify(partida(...orden).libreta.hallazgos()), referencia, orden.join(' → '));
});

// ── Cuándo está disponible ──────────────────────────────────────────────────

test('la deducción no está disponible sin pruebas', () => {
    assert.equal(partida().deduccion.disponible(), false);
});

test('hace falta una prueba de CADA pregunta', () => {
    assert.equal(partida('ventana').deduccion.disponible(), false, 'solo la ventana: falta respaldar el pasillo');
    for (const s of ['polvo', 'arrastre', 'huella']) assert.equal(partida(s).deduccion.disponible(), false, `solo ${s}: falta la ventana`);
});

test('disponible con el recorte, la ventana y las marcas de arrastre (o las cajas movidas, que las piden)', () => {
    assert.equal(partida('periodico', 'ventana', 'arrastre').deduccion.disponible(), true);
    assert.equal(partida('periodico', 'ventana', 'arrastre', 'cajas').deduccion.disponible(), true);
    assert.equal(partida('ventana', 'arrastre', 'cajas').deduccion.disponible(), false, 'sin el recorte (obligatorio) no hay deducción');
    for (const otra of ['polvo', 'huella']) assert.equal(partida('periodico', 'ventana', otra).deduccion.disponible(), false, `la ventana y ${otra}: falta una pieza`);
    assert.equal(partida('periodico', 'ventana', 'polvo', 'huella').deduccion.disponible(), false, 'la huella y el polvo juntos tampoco: solo dicen que hubo alguien');
});

test('lo que no prueba nada no habilita la deducción: recorte, pilas, cajas sin marcas', () => {
    assert.equal(partida('ventana', 'periodico').deduccion.disponible(), false);
    assert.equal(partida('ventana', 'pilas').deduccion.disponible(), false);
    assert.equal(partida('ventana', 'huella', 'polvo').deduccion.disponible(), false);
    assert.equal(partida('ventana', 'cajas').deduccion.disponible(), false, 'examinar las cajas sin las marcas no es "cajas movidas"');
    assert.equal(partida('ventana', 'periodico', 'pilas', 'cajas').deduccion.disponible(), false);
});

test('disponible no depende del orden en que se encontraron las cosas', () => {
    const conjuntos = [['ventana', 'polvo'], ['ventana', 'periodico'], ['cajas', 'arrastre', 'ventana'], ['huella', 'periodico', 'pilas'], NOMBRES];
    for (const conjunto of conjuntos) {
        const esperado = partida(...conjunto).deduccion.disponible();
        for (const orden of permutaciones(conjunto).slice(0, 720)) assert.equal(partida(...orden).deduccion.disponible(), esperado, orden.join(' → '));
    }
});

// ── Validar una respuesta ───────────────────────────────────────────────────

const TODO = () => partida(...NOMBRES);
const NOMBRES_DE_PRUEBAS = Object.keys(reglas.deduccion.pruebas);

test('conclusión correcta con una prueba que la respalda: la pregunta queda resuelta', () => {
    const { deduccion } = partida('ventana', 'arrastre', 'cajas');
    assert.deepEqual(deduccion.responder('cortinas', 'corriente', ['ventana-rota']), { estado: 'correcta' });
    assert.equal(deduccion.resuelta('cortinas'), true);
    assert.deepEqual(deduccion.responder('embrujado', 'a-proposito', ['cajas-movidas']), { estado: 'resuelto' });
    assert.equal(deduccion.completa, true);
});

test('cada forma de error: conclusión equivocada, prueba ajena a la pregunta, o las dos', () => {
    const { deduccion } = TODO();
    // Conclusión equivocada (con las pruebas buenas)
    assert.deepEqual(deduccion.responder('cortinas', 'alguien-detras', ['ventana-rota']), { estado: 'error', motivo: 'conclusion' });
    assert.deepEqual(deduccion.responder('cortinas', 'sombras-malditas', ['ventana-rota']), { estado: 'error', motivo: 'conclusion' });
    assert.deepEqual(deduccion.responder('embrujado', 'con-el-tiempo', ['cajas-movidas']), { estado: 'error', motivo: 'conclusion' });
    assert.deepEqual(deduccion.responder('embrujado', 'rechaza-visitantes', ['n1-pista-huella']), { estado: 'error', motivo: 'conclusion' });
    // Conclusión correcta con pruebas que no tienen nada que ver con la pregunta
    assert.deepEqual(deduccion.responder('cortinas', 'corriente', ['n1-pista-periodico']), { estado: 'error', motivo: 'ajena' });
    assert.deepEqual(deduccion.responder('cortinas', 'corriente', ['polvo-removido']), { estado: 'error', motivo: 'ajena' });
    assert.deepEqual(deduccion.responder('cortinas', 'corriente', ['cajas-movidas', 'marcas-de-arrastre']), { estado: 'error', motivo: 'ajena' });
    assert.deepEqual(deduccion.responder('embrujado', 'a-proposito', ['n1-pista-periodico']), { estado: 'error', motivo: 'ajena' });
    assert.deepEqual(deduccion.responder('embrujado', 'a-proposito', ['ventana-rota']), { estado: 'error', motivo: 'ajena' });
    assert.deepEqual(deduccion.responder('embrujado', 'a-proposito', ['ventana-rota', 'n1-pista-periodico']), { estado: 'error', motivo: 'ajena' });
    // Las dos mal
    assert.deepEqual(deduccion.responder('cortinas', 'sombras-malditas', ['n1-pista-periodico']), { estado: 'error', motivo: 'conclusion' });
    // Nada de eso resolvió algo
    assert.equal(deduccion.resueltas.size, 0);
});

test('prueba que no tiene nada que ver → error, aunque entre las demás haya una combinación válida', () => {
    // El fallo del recorrido completo de la fase 3: Ventana + Cajas resolvía "¿Qué mueve las cortinas?"
    assert.deepEqual(TODO().deduccion.responder('cortinas', 'corriente', ['ventana-rota', 'cajas-movidas']), { estado: 'error', motivo: 'ajena' });
    for (const otra of NOMBRES_DE_PRUEBAS.filter(p => p !== 'ventana-rota')) {
        assert.equal(TODO().deduccion.responder('cortinas', 'corriente', ['ventana-rota', otra]).estado, 'error', `Ventana + ${otra}`);
    }
    assert.deepEqual(TODO().deduccion.responder('embrujado', 'a-proposito', ['polvo-removido', 'n1-pista-periodico']), { estado: 'error', motivo: 'ajena' });
    assert.deepEqual(TODO().deduccion.responder('embrujado', 'a-proposito', ['ventana-rota']), { estado: 'error', motivo: 'ajena' });
    assert.deepEqual(TODO().deduccion.responder('embrujado', 'a-proposito', ['cajas-movidas', 'ventana-rota']), { estado: 'error', motivo: 'ajena' });
    assert.deepEqual(TODO().deduccion.responder('embrujado', 'a-proposito', ['cajas-movidas']), { estado: 'correcta' }, 'Cajas + Huella');
});

test('un error se repite sin castigo: la misma pregunta sigue pendiente y puede acertar después', () => {
    const { deduccion } = partida('ventana', 'arrastre', 'cajas', 'periodico');
    assert.equal(deduccion.preguntaActual().id, 'cortinas');
    assert.equal(deduccion.responder('cortinas', 'alguien-detras', ['ventana-rota']).estado, 'error');
    assert.equal(deduccion.preguntaActual().id, 'cortinas', 'sigue siendo esa pregunta');
    assert.equal(deduccion.responder('cortinas', 'corriente', ['n1-pista-periodico']).estado, 'error');
    for (let i = 0; i < 20; i++) deduccion.responder('cortinas', 'sombras-malditas', ['ventana-rota']);
    assert.equal(deduccion.disponible(), true, 'los errores no quitan nada');
    assert.equal(deduccion.responder('cortinas', 'corriente', ['ventana-rota']).estado, 'correcta');
    assert.equal(deduccion.preguntaActual().id, 'embrujado');
});

test('la pregunta 1 solo vale con Ventana rota; la 2, con Cajas movidas o Marcas de arrastre (la huella y el polvo solos no bastan)', () => {
    assert.equal(TODO().deduccion.responder('cortinas', 'corriente', ['ventana-rota']).estado, 'correcta');
    for (const p of ['cajas-movidas', 'marcas-de-arrastre']) {
        assert.deepEqual(TODO().deduccion.responder('embrujado', 'a-proposito', [p]), { estado: 'correcta' }, p);
        for (const apoyo of ['n1-pista-huella', 'polvo-removido']) assert.deepEqual(TODO().deduccion.responder('embrujado', 'a-proposito', [p, apoyo]), { estado: 'correcta' }, `${p} + ${apoyo}`);
    }
    assert.deepEqual(TODO().deduccion.responder('embrujado', 'a-proposito', ['marcas-de-arrastre', 'cajas-movidas']), { estado: 'correcta' });
    for (const sel of [['n1-pista-huella'], ['polvo-removido'], ['n1-pista-huella', 'polvo-removido']]) {
        assert.deepEqual(TODO().deduccion.responder('embrujado', 'a-proposito', sel), { estado: 'error', motivo: 'insuficiente' }, sel.join(' + '));
    }
    for (const p of ['n1-pista-periodico', 'ventana-rota']) {
        assert.deepEqual(TODO().deduccion.responder('embrujado', 'a-proposito', [p]), { estado: 'error', motivo: 'ajena' }, p);
        assert.deepEqual(TODO().deduccion.responder('embrujado', 'a-proposito', ['cajas-movidas', p]), { estado: 'error', motivo: 'ajena' }, `cajas + ${p}`);
    }
});

test('se eligen como máximo 2 pruebas: con 3 o más no se valora', () => {
    const { deduccion } = TODO();
    assert.deepEqual(deduccion.responder('embrujado', 'a-proposito', ['cajas-movidas', 'polvo-removido', 'marcas-de-arrastre']), { estado: 'invalida', motivo: 'demasiadas' });
    assert.deepEqual(deduccion.responder('cortinas', 'corriente', deduccion.libreta.idsEncontrados()), { estado: 'invalida', motivo: 'demasiadas' });
    assert.equal(deduccion.resueltas.size, 0);
});

test('no se valora sin pruebas ni con pruebas que no se encontraron', () => {
    const { deduccion } = partida('ventana', 'polvo');
    assert.deepEqual(deduccion.responder('cortinas', 'corriente', []), { estado: 'invalida', motivo: 'sin-pruebas' });
    assert.deepEqual(deduccion.responder('embrujado', 'a-proposito', ['cajas-movidas']), { estado: 'invalida', motivo: 'no-encontradas' });
    assert.deepEqual(deduccion.responder('cortinas', 'corriente', ['no-existe']), { estado: 'invalida', motivo: 'no-encontradas' });
    assert.deepEqual(deduccion.responder('no-existe', 'corriente', ['ventana-rota']), { estado: 'invalida', motivo: 'pregunta' });
    assert.equal(deduccion.resueltas.size, 0);
});

test('repetir la misma prueba no la cuenta dos veces', () => {
    const { deduccion } = TODO();
    assert.equal(deduccion.responder('embrujado', 'a-proposito', ['cajas-movidas', 'cajas-movidas', 'cajas-movidas']).estado, 'correcta');
});

test('no se puede ganar marcando todo: solo aciertan las respuestas que de verdad respaldan (todas las respuestas posibles)', () => {
    // Todas las respuestas posibles (3 conclusiones × 1 o 2 pruebas) con todo encontrado, contra la tabla aprobada (escrita a mano)
    const APROBADA = {
        cortinas: { minimas: [['ventana-rota']], pertinentes: ['ventana-rota'] },
        embrujado: { minimas: [['cajas-movidas'], ['marcas-de-arrastre']], pertinentes: ['cajas-movidas', 'marcas-de-arrastre', 'n1-pista-huella', 'polvo-removido'] }
    };
    const { libreta } = TODO();
    const ids = libreta.idsEncontrados();
    const subconjuntos = [...ids.map(i => [i]), ...ids.flatMap((a, i) => ids.slice(i + 1).map(b => [a, b]))];
    const resultado = { cortinas: 0, embrujado: 0 };
    for (const q of reglas.deduccion.preguntas) {
        const { minimas, pertinentes } = APROBADA[q.id];
        for (const opcion of narrativa.deduccion.preguntas.find(t => t.id === q.id).opciones) {
            for (const pruebas of subconjuntos) {
                const { estado } = TODO().deduccion.responder(q.id, opcion.id, pruebas);
                const debeAcertar = opcion.id === q.correcta && minimas.some(c => c.every(p => pruebas.includes(p))) && pruebas.every(p => pertinentes.includes(p));
                assert.equal(estado !== 'error' && estado !== 'invalida', debeAcertar, `${q.id} / ${opcion.id} / ${pruebas}`);
                if (debeAcertar) resultado[q.id]++;
            }
        }
    }
    // Ventana sola · Cajas o Marcas solas, las dos juntas, o cada una con la huella o el polvo
    assert.deepEqual(resultado, { cortinas: 1, embrujado: 7 });
    assert.ok(Math.max(...subconjuntos.map(s => s.length)) <= 2);
});

test('una pregunta ya resuelta no vuelve a preguntarse ni a valorarse', () => {
    const { deduccion } = partida('ventana', 'arrastre', 'cajas');
    deduccion.responder('cortinas', 'corriente', ['ventana-rota']);
    assert.equal(deduccion.preguntaActual().id, 'embrujado');
    assert.deepEqual(deduccion.responder('cortinas', 'corriente', ['ventana-rota']), { estado: 'invalida', motivo: 'ya-resuelta' });
    assert.deepEqual(deduccion.responder('cortinas', 'alguien-detras', ['polvo-removido']), { estado: 'invalida', motivo: 'ya-resuelta' }, 'un intento posterior no la deshace');
    assert.equal(deduccion.resuelta('cortinas'), true);
    assert.equal(deduccion.preguntaActual().id, 'embrujado');
    deduccion.responder('embrujado', 'a-proposito', ['cajas-movidas']);
    assert.equal(deduccion.preguntaActual(), null);
});

test('las dos preguntas correctas dan "resuelto", en el orden que se resuelvan', () => {
    const a = partida('ventana', 'arrastre', 'cajas').deduccion;
    assert.equal(a.responder('cortinas', 'corriente', ['ventana-rota']).estado, 'correcta');
    assert.equal(a.responder('embrujado', 'a-proposito', ['cajas-movidas']).estado, 'resuelto');
    const b = partida('ventana', 'arrastre', 'cajas').deduccion;
    assert.equal(b.responder('embrujado', 'a-proposito', ['cajas-movidas']).estado, 'correcta');
    assert.equal(b.responder('cortinas', 'corriente', ['ventana-rota']).estado, 'resuelto');
});

test('el resultado no depende del orden en que se encontraron las cosas', () => {
    const conjunto = ['ventana', 'polvo', 'periodico', 'arrastre', 'cajas'];
    const intento = orden => {
        const { deduccion } = partida(...orden);
        return JSON.stringify([
            deduccion.disponible(),
            deduccion.responder('cortinas', 'alguien-detras', ['ventana-rota']),
            deduccion.responder('cortinas', 'corriente', ['n1-pista-periodico']),
            deduccion.responder('cortinas', 'corriente', ['ventana-rota']),
            deduccion.responder('embrujado', 'a-proposito', ['n1-pista-periodico']),
            deduccion.responder('embrujado', 'a-proposito', ['cajas-movidas'])
        ]);
    };
    const referencia = intento(conjunto);
    for (const orden of permutaciones(conjunto)) assert.equal(intento(orden), referencia, orden.join(' → '));
    assert.equal(JSON.parse(referencia)[5].estado, 'resuelto');
});

test('los recorridos de las verificaciones: rápido, completo y con errores', () => {
    // Rápido: las marcas de arrastre, la ventana y el recorte (obligatorio)
    const rapido = partida('arrastre', 'ventana', 'periodico').deduccion;
    assert.equal(rapido.disponible(), true);
    assert.equal(rapido.responder('cortinas', 'corriente', ['ventana-rota']).estado, 'correcta');
    assert.equal(rapido.responder('embrujado', 'a-proposito', ['marcas-de-arrastre']).estado, 'resuelto');
    // Completo: todo encontrado
    const completo = TODO().deduccion;
    assert.equal(completo.responder('cortinas', 'corriente', ['ventana-rota']).estado, 'correcta');
    assert.equal(completo.responder('embrujado', 'a-proposito', ['cajas-movidas']).estado, 'resuelto');
    // Con errores: conclusión equivocada, luego la correcta con el recorte (también error), y después resolver
    const errores = partida('arrastre', 'cajas', 'ventana', 'periodico').deduccion;
    assert.equal(errores.responder('cortinas', 'sombras-malditas', ['ventana-rota']).estado, 'error');
    assert.equal(errores.responder('cortinas', 'corriente', ['n1-pista-periodico']).estado, 'error');
    assert.equal(errores.responder('cortinas', 'corriente', ['ventana-rota']).estado, 'correcta');
    assert.equal(errores.responder('embrujado', 'a-proposito', ['cajas-movidas']).estado, 'resuelto');
});

// ── Opciones en orden mezclado ──────────────────────────────────────────────

function generador(semilla) {            // mulberry32: un azar repetible
    let a = semilla >>> 0;
    return () => {
        a = (a + 0x6D2B79F5) >>> 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

test('mezclar devuelve una permutación y no toca la lista original', () => {
    const original = ['a', 'b', 'c'];
    for (let semilla = 1; semilla < 50; semilla++) {
        const m = mezclar(original, generador(semilla));
        assert.deepEqual([...m].sort(), ['a', 'b', 'c']);
    }
    assert.deepEqual(original, ['a', 'b', 'c']);
    assert.deepEqual(mezclar([], generador(1)), []);
    assert.deepEqual(mezclar(['x'], generador(1)), ['x']);
});

test('las opciones salen mezcladas: la correcta no siempre está primera', () => {
    const q = narrativa.deduccion.preguntas[0];
    const todas = q.opciones.map(o => o.id);
    assert.equal(todas[0], 'corriente', 'en el archivo la correcta es la primera');
    const posiciones = new Set();
    for (let semilla = 1; semilla < 200; semilla++) {
        const { libreta } = partida();
        const d = new Deduccion(reglas.deduccion, libreta, { azar: generador(semilla) });
        const orden = d.opciones('cortinas', todas);
        assert.deepEqual([...orden].sort(), [...todas].sort(), 'siempre las mismas 3 opciones');
        posiciones.add(orden.indexOf('corriente'));
    }
    assert.deepEqual([...posiciones].sort(), [0, 1, 2], 'la correcta aparece en las tres posiciones');
});

test('el orden de una pregunta no cambia mientras dura la partida, ni siquiera tras un error', () => {
    const { libreta } = partida('ventana', 'arrastre', 'cajas');
    const d = new Deduccion(reglas.deduccion, libreta, { azar: generador(7) });
    const todas = narrativa.deduccion.preguntas[0].opciones.map(o => o.id);
    const primero = d.opciones('cortinas', todas);
    d.responder('cortinas', 'alguien-detras', ['ventana-rota']);
    assert.deepEqual(d.opciones('cortinas', todas), primero);
    d.reiniciar();
    assert.ok(d.ordenes.size === 0, 'al reiniciar se vuelve a mezclar');
});

// ── El aviso ────────────────────────────────────────────────────────────────

const correr = (aviso, segundos, estado, dt = 1 / 60) => {
    let avisos = 0;
    for (let t = 0; t < segundos - 1e-9; t += dt) if (aviso.actualizar(dt, estado)) avisos++;
    return avisos;
};

test('el aviso sale ~1,5 s después de cumplirse el mínimo, una sola vez', () => {
    assert.equal(ESPERA_DEL_AVISO, 1.5);
    const aviso = new AvisoDeDeduccion();
    assert.equal(correr(aviso, 1.4, { disponible: true, bloqueado: false }), 0);
    assert.equal(correr(aviso, 0.2, { disponible: true, bloqueado: false }), 1);
    assert.equal(correr(aviso, 30, { disponible: true, bloqueado: false }), 0, 'no vuelve a avisar');
    assert.equal(aviso.avisado, true);
});

test('no avisa mientras no esté disponible', () => {
    const aviso = new AvisoDeDeduccion();
    assert.equal(correr(aviso, 60, { disponible: false, bloqueado: false }), 0);
    assert.equal(aviso.avisado, false);
});

test('la espera empieza cuando termina el importante en curso (la revelación de la ventana)', () => {
    const aviso = new AvisoDeDeduccion();
    assert.equal(correr(aviso, 20, { disponible: true, bloqueado: true }), 0, 'mientras dura el importante no avisa, dure lo que dure');
    assert.equal(correr(aviso, 1.4, { disponible: true, bloqueado: false }), 0, 'recién terminó: todavía no');
    assert.equal(correr(aviso, 0.2, { disponible: true, bloqueado: false }), 1);
});

test('si aparece otro importante a mitad de la espera, la espera vuelve a empezar', () => {
    const aviso = new AvisoDeDeduccion();
    correr(aviso, 1.0, { disponible: true, bloqueado: false });
    correr(aviso, 3, { disponible: true, bloqueado: true });
    assert.equal(correr(aviso, 1.4, { disponible: true, bloqueado: false }), 0);
    assert.equal(correr(aviso, 0.2, { disponible: true, bloqueado: false }), 1);
});

test('si el jugador abre la libreta por su cuenta con la deducción disponible, ya no se avisa', () => {
    const aviso = new AvisoDeDeduccion();
    aviso.alAbrirLaLibreta(false);
    assert.equal(aviso.avisado, false, 'abrirla sin poder resolver no cuenta');
    aviso.alAbrirLaLibreta(true);
    assert.equal(correr(aviso, 10, { disponible: true, bloqueado: false }), 0);
});

test('el ícono de la libreta aparece desde que se avisó y desaparece al resolver', () => {
    const aviso = new AvisoDeDeduccion();
    assert.equal(aviso.iconoVisible, false);
    correr(aviso, 2, { disponible: true, bloqueado: false });
    assert.equal(aviso.iconoVisible, true);
    aviso.alResolver();
    assert.equal(aviso.iconoVisible, false);
    assert.equal(correr(aviso, 10, { disponible: true, bloqueado: false }), 0);
});

test('el aviso con las pruebas reales: sale tras la revelación de la ventana y la espera', () => {
    const { inv, deduccion } = partida('arrastre', 'cajas', 'periodico');
    const aviso = new AvisoDeDeduccion();
    assert.equal(correr(aviso, 5, { disponible: deduccion.disponible(), bloqueado: false }), 0);
    SUCESOS.ventana(inv);                                         // la revelación 1: ahora sí hay con qué
    assert.equal(deduccion.disponible(), true);
    assert.equal(correr(aviso, 1.4, { disponible: true, bloqueado: false }), 0);
    assert.equal(correr(aviso, 0.2, { disponible: true, bloqueado: false }), 1);
});

// ── La ayuda de la libreta ──────────────────────────────────────────────────

const ayudaCon = (inv, disponible) => new Ayuda(reglas.ayuda, inv, { deduccionDisponible: () => disponible.valor });
const pasar = (ayuda, segundos, opciones, dt = 1 / 60) => {
    let r;
    for (let t = 0; t < segundos - 1e-9; t += dt) r = ayuda.actualizar(dt, opciones);
    return r;
};

test('la ayuda de la libreta es la primera en la prioridad y solo vale con la deducción disponible', () => {
    assert.deepEqual(reglas.ayuda.refuerzos.map(r => r.efecto), ['libreta', 'marcas', 'pila', 'corriente', 'recorte']);
    const inv = new Investigacion(reglas, narrativa);
    const estado = { valor: false };
    const ayuda = ayudaCon(inv, estado);
    assert.equal(pasar(ayuda, 46)?.efecto, 'marcas', 'sin deducción disponible sigue el orden de siempre');
    estado.valor = true;
    assert.equal(pasar(ayuda, 0.1)?.efecto, 'libreta', 'con la deducción disponible, la libreta va primero');
});

test('la ayuda de la libreta llega a los 45 s sin abrirla y se apaga y reinicia al abrirla', () => {
    const inv = new Investigacion(reglas, narrativa);
    const estado = { valor: true };
    const ayuda = ayudaCon(inv, estado);
    assert.equal(pasar(ayuda, 44), null);
    assert.equal(pasar(ayuda, 1.1)?.efecto, 'libreta');
    ayuda.alDescubrir();                                      // abrir la libreta es hacer algo: la cuenta empieza de nuevo
    assert.equal(ayuda.actualizar(1 / 60), null);
    assert.equal(pasar(ayuda, 44), null);
    assert.equal(pasar(ayuda, 1.1)?.efecto, 'libreta');
});

test('la ayuda no cuenta con la libreta abierta (pausada)', () => {
    const ayuda = ayudaCon(new Investigacion(reglas, narrativa), { valor: true });
    assert.equal(pasar(ayuda, 120, { pausado: true }), null);
    assert.equal(ayuda.inactividad, 0);
});

test('al resolver el caso la ayuda se apaga del todo', () => {
    const ayuda = ayudaCon(new Investigacion(reglas, narrativa), { valor: true });
    pasar(ayuda, 50);
    assert.equal(ayuda.activa, true);
    ayuda.apagar();
    assert.equal(ayuda.activa, false);
    assert.equal(pasar(ayuda, 300), null);
    assert.equal(ayuda.activa, false);
    ayuda.alDescubrir();
    assert.equal(pasar(ayuda, 300), null, 'ni descubrir algo la reactiva');
});

test('"deduccion" en la ayuda solo puede ser "disponible"', () => {
    const r = copia(reglas);
    r.ayuda.refuerzos[0].mientras.deduccion = 'otra';
    assert.ok(validarReglas(r, narrativa).some(e => e.includes('deduccion')));
});

// ── El caso general: deducción por hechos (las habitaciones siguientes) ──────────────────────────────

// Una habitación inventada:
//   "p" necesita los golpes Y las velas: la cuerda da los golpes y el fuelle las velas (juntas valen; solas, falta una pieza);
//   "q" necesita los hilos y que vengan de arriba: el hilo dice las dos cosas (vale solo), la cuerda y la trampilla una cada una;
//   "r" tiene dos caminos: [a y b] o [c]; "w" solo aporta un hecho parcial (pertinente, pero no completa nada).
const GENERAL = {
    maximoDePruebas: 2,
    pruebas: { cuerda: { sale: 'a' }, fuelle: { sale: 'b' }, hilo: { sale: 'c' }, trampilla: { sale: 'd' }, ajena: { sale: 'e' }, x: { sale: 'f' }, y: { sale: 'g' }, z: { sale: 'h' }, w: { sale: 'i' } },
    preguntas: [
        { id: 'p', correcta: 'si', necesita: ['golpes', 'velas'], aportan: { cuerda: ['golpes'], fuelle: ['velas'] } },
        { id: 'q', correcta: 'si', necesita: ['hilos', 'desde-arriba'], aportan: { hilo: ['hilos', 'desde-arriba'], cuerda: ['hilos'], trampilla: ['desde-arriba'] } },
        { id: 'r', correcta: 'si', necesita: [['a', 'b'], ['c']], aportan: { x: ['a'], y: ['b'], z: ['c'], w: ['parcial'] } }
    ]
};
const generalCon = (encontradas = Object.keys(GENERAL.pruebas), definicion = GENERAL) => new Deduccion(definicion, { idsEncontrados: () => encontradas }, { azar: () => 0.5 });

test('general: los hechos de cada prueba, sueltos y juntos', () => {
    const [p, q, r] = GENERAL.preguntas;
    assert.deepEqual(caminosDe(p), [['golpes', 'velas']], 'una lista de hechos es un solo camino');
    assert.deepEqual(caminosDe(r), [['a', 'b'], ['c']]);
    assert.deepEqual(caminosDe({}), []);
    assert.deepEqual([...hechosDe(q, ['hilo'])].sort(), ['desde-arriba', 'hilos']);
    assert.deepEqual([...hechosDe(q, ['cuerda', 'trampilla'])].sort(), ['desde-arriba', 'hilos']);
    assert.deepEqual([...hechosDe(q, ['ajena'])], [], 'una prueba ajena no aporta nada');
    assert.equal(cubren(p, ['cuerda']), false);
    assert.equal(cubren(p, ['cuerda', 'fuelle']), true);
    assert.equal(cubren(r, ['z']), true);
    assert.equal(cubren(r, ['x', 'w']), false);
});

test('general: dos pruebas que se completan → correcta; una sola → insuficiente', () => {
    assert.deepEqual(generalCon().responder('p', 'si', ['cuerda', 'fuelle']), { estado: 'correcta' });
    assert.deepEqual(generalCon().responder('p', 'si', ['fuelle', 'cuerda']), { estado: 'correcta' }, 'el orden da igual');
    assert.deepEqual(generalCon().responder('p', 'si', ['cuerda']), { estado: 'error', motivo: 'insuficiente' }, 'solo la cuerda no basta');
    assert.deepEqual(generalCon().responder('p', 'si', ['fuelle']), { estado: 'error', motivo: 'insuficiente' }, 'solo el fuelle no basta');
});

test('general: una sola prueba que dice todo vale sola, y otra pertinente a su lado no estorba', () => {
    assert.deepEqual(generalCon().responder('q', 'si', ['hilo']), { estado: 'correcta' });
    assert.deepEqual(generalCon().responder('q', 'si', ['hilo', 'cuerda']), { estado: 'correcta' });
    assert.deepEqual(generalCon().responder('q', 'si', ['cuerda', 'trampilla']), { estado: 'correcta' }, 'otra ruta a la misma conclusión');
    assert.deepEqual(generalCon().responder('q', 'si', ['cuerda']), { estado: 'error', motivo: 'insuficiente' });
    assert.deepEqual(generalCon().responder('q', 'si', ['trampilla']), { estado: 'error', motivo: 'insuficiente' });
});

test('general: una prueba ajena invalida la selección, aunque las demás basten; con más del máximo no se valora', () => {
    assert.deepEqual(generalCon().responder('p', 'si', ['cuerda', 'fuelle', 'ajena']), { estado: 'invalida', motivo: 'demasiadas' });
    assert.deepEqual(generalCon().responder('p', 'si', ['ajena', 'cuerda']), { estado: 'error', motivo: 'ajena' });
    assert.deepEqual(generalCon().responder('p', 'si', ['ajena']), { estado: 'error', motivo: 'ajena' });
    assert.deepEqual(generalCon().responder('p', 'si', ['hilo', 'cuerda']), { estado: 'error', motivo: 'ajena' }, 'el hilo es de otra pregunta: para esta es ajeno');
    assert.deepEqual(generalCon().responder('q', 'si', ['hilo', 'ajena']), { estado: 'error', motivo: 'ajena' });
    assert.deepEqual(generalCon().responder('q', 'si', ['hilo', 'fuelle']), { estado: 'error', motivo: 'ajena' }, 'el fuelle no tiene nada que ver con "q"');
    assert.deepEqual(generalCon().responder('q', 'no', ['hilo']), { estado: 'error', motivo: 'conclusion' }, 'la conclusión equivocada se dice primero');
});

test('general: varios caminos, y un hecho parcial orienta pero no completa', () => {
    assert.deepEqual(generalCon().responder('r', 'si', ['x', 'y']), { estado: 'correcta' }, 'primer camino');
    assert.deepEqual(generalCon().responder('r', 'si', ['z']), { estado: 'correcta' }, 'segundo camino');
    assert.deepEqual(generalCon().responder('r', 'si', ['x', 'z']), { estado: 'correcta' }, 'medio camino más el otro entero');
    assert.deepEqual(generalCon().responder('r', 'si', ['z', 'w']), { estado: 'correcta' }, 'la parcial al lado no estorba');
    assert.deepEqual(generalCon().responder('r', 'si', ['x']), { estado: 'error', motivo: 'insuficiente' }, 'medio camino');
    assert.deepEqual(generalCon().responder('r', 'si', ['w']), { estado: 'error', motivo: 'insuficiente' }, 'solo lo parcial');
    assert.deepEqual(generalCon().responder('r', 'si', ['x', 'w']), { estado: 'error', motivo: 'insuficiente' });
});

test('general: se prueban todas las respuestas posibles contra una tabla escrita a mano', () => {
    const TABLA = {
        p: { minimas: [['cuerda', 'fuelle']], pertinentes: ['cuerda', 'fuelle'] },
        q: { minimas: [['hilo'], ['cuerda', 'trampilla']], pertinentes: ['hilo', 'cuerda', 'trampilla'] },
        r: { minimas: [['x', 'y'], ['z']], pertinentes: ['x', 'y', 'z', 'w'] }
    };
    const ids = Object.keys(GENERAL.pruebas);
    const subconjuntos = [...ids.map(i => [i]), ...ids.flatMap((a, i) => ids.slice(i + 1).map(b => [a, b]))];
    for (const q of GENERAL.preguntas) {
        const { minimas, pertinentes } = TABLA[q.id];
        for (const conclusion of ['si', 'no']) {
            for (const pruebas of subconjuntos) {
                const esperado = conclusion !== q.correcta ? { estado: 'error', motivo: 'conclusion' }
                    : !pruebas.every(p => pertinentes.includes(p)) ? { estado: 'error', motivo: 'ajena' }
                        : !minimas.some(m => m.every(p => pruebas.includes(p))) ? { estado: 'error', motivo: 'insuficiente' }
                            : { estado: 'correcta' };
                assert.deepEqual(generalCon().responder(q.id, conclusion, pruebas), esperado, `${q.id} / ${conclusion} / ${pruebas}`);
            }
        }
    }
});

test('general: la disponibilidad pide poder cubrir cada pregunta con lo encontrado, sin pasar del máximo', () => {
    const sinR = { ...GENERAL, preguntas: GENERAL.preguntas.slice(0, 2) };
    assert.equal(generalCon(['cuerda'], sinR).disponible(), false);
    assert.equal(generalCon(['cuerda', 'fuelle'], sinR).disponible(), false, 'p sí, q no');
    assert.equal(generalCon(['cuerda', 'fuelle', 'hilo'], sinR).disponible(), true);
    assert.equal(generalCon(['cuerda', 'fuelle', 'trampilla'], sinR).disponible(), true);
    assert.equal(generalCon(['hilo', 'trampilla', 'ajena'], sinR).disponible(), false);
    // Una pregunta que pide tres pruebas: con máximo 2 nunca se ofrece; con máximo 3, sí
    const tres = { pruebas: { a: { sale: 'a' }, b: { sale: 'b' }, c: { sale: 'c' } }, preguntas: [{ id: 't', correcta: 'si', necesita: ['1', '2', '3'], aportan: { a: ['1'], b: ['2'], c: ['3'] } }] };
    assert.equal(generalCon(['a', 'b', 'c'], { ...tres, maximoDePruebas: 2 }).disponible(), false);
    assert.equal(generalCon(['a', 'b', 'c'], { ...tres, maximoDePruebas: 3 }).disponible(), true);
    assert.deepEqual(generalCon(['a', 'b', 'c'], { ...tres, maximoDePruebas: 3 }).responder('t', 'si', ['a', 'b', 'c']), { estado: 'resuelto' });
});

test('general: la selección mínima y las pruebas que forman parte de alguna respuesta mínima', () => {
    const [p, q, r] = GENERAL.preguntas;
    assert.deepEqual(coberturaMinima(q, Object.keys(GENERAL.pruebas), 2), ['hilo'], 'la más chica');
    assert.deepEqual(coberturaMinima(q, ['cuerda', 'trampilla', 'ajena'], 2), ['cuerda', 'trampilla']);
    assert.equal(coberturaMinima(p, ['cuerda'], 2), null);
    assert.equal(coberturaMinima(p, ['cuerda', 'fuelle'], 1), null, 'respeta el máximo');
    assert.deepEqual([...pruebasNecesarias(q, 2)].sort(), ['cuerda', 'hilo', 'trampilla']);
    assert.deepEqual([...pruebasNecesarias(r, 2)].sort(), ['x', 'y', 'z'], 'la parcial no hace falta nunca');
});

// ── No perder lo resuelto ───────────────────────────────────────────────────

test('pregunta 1 resuelta y pregunta 2 con error: la actual es la 2, también tras nuevos hallazgos; la 1 no se vuelve a responder', () => {
    const { inv, deduccion } = partida('ventana', 'arrastre', 'cajas');
    assert.equal(deduccion.preguntaActual().id, 'cortinas');
    assert.equal(deduccion.responder('cortinas', 'corriente', ['ventana-rota']).estado, 'correcta');
    assert.equal(deduccion.preguntaActual().id, 'embrujado');
    assert.equal(deduccion.responder('embrujado', 'a-proposito', ['n1-pista-periodico']).estado, 'invalida', 'lo que no está en la libreta no se valora');
    inv.recogio('n1-pista-periodico');
    assert.equal(deduccion.responder('embrujado', 'con-el-tiempo', ['cajas-movidas']).estado, 'error');
    assert.equal(deduccion.responder('embrujado', 'a-proposito', ['n1-pista-periodico']).estado, 'error');
    assert.equal(deduccion.preguntaActual().id, 'embrujado', 'tras los errores sigue siendo la 2');
    // Sale a buscar más pruebas...
    SUCESOS.huella(inv); SUCESOS.arrastre(inv); SUCESOS.cajas(inv);
    assert.equal(deduccion.preguntaActual().id, 'embrujado', 'tras nuevos hallazgos sigue siendo la 2');
    // ...y la 1 no se puede volver a responder (ni bien ni mal)
    assert.deepEqual(deduccion.responder('cortinas', 'corriente', ['ventana-rota']), { estado: 'invalida', motivo: 'ya-resuelta' });
    assert.deepEqual(deduccion.responder('cortinas', 'sombras-malditas', ['ventana-rota']), { estado: 'invalida', motivo: 'ya-resuelta' });
    assert.equal(deduccion.resuelta('cortinas'), true);
    assert.equal(deduccion.preguntaActual().id, 'embrujado');
    assert.equal(deduccion.responder('embrujado', 'a-proposito', ['cajas-movidas']).estado, 'resuelto');
});

test('la disponibilidad cuenta la pregunta 1 como resuelta aunque cambien las pruebas encontradas', () => {
    let encontradas = ['ventana-rota', 'cajas-movidas'];
    const libreta = { idsEncontrados: () => encontradas };
    const deduccion = new Deduccion(reglas.deduccion, libreta, { azar: () => 0.5 });
    assert.equal(deduccion.disponible(), true);
    assert.equal(deduccion.responder('cortinas', 'corriente', ['ventana-rota']).estado, 'correcta');
    encontradas = ['cajas-movidas'];                      // la Ventana rota ya no está entre las pruebas (por ejemplo, al recargar la libreta)
    assert.equal(deduccion.disponible(), true, 'la pregunta 1 ya está resuelta: solo falta respaldar la 2');
    encontradas = ['ventana-rota'];
    assert.equal(deduccion.disponible(), false, 'y para la 2 todavía no hay una prueba');
    encontradas = [];
    assert.equal(deduccion.disponible(), false);
    encontradas = ['n1-pista-huella'];
    assert.equal(deduccion.disponible(), false, 'la huella ya no respalda nada');
    encontradas = ['cajas-movidas'];
    assert.equal(deduccion.disponible(), true);
    assert.equal(deduccion.preguntaActual().id, 'embrujado');
});

test('logradas(): lo resuelto con la conclusión elegida, en el orden de las preguntas; lo pendiente no aparece', () => {
    const { deduccion } = TODO();
    assert.deepEqual(deduccion.logradas(), [], 'al empezar no hay nada logrado');
    deduccion.responder('embrujado', 'a-proposito', ['cajas-movidas']);                   // la 2 primero
    assert.deepEqual(deduccion.logradas().map(l => [l.pregunta.id, l.conclusion]), [['embrujado', 'a-proposito']]);
    deduccion.responder('cortinas', 'sombras-malditas', ['ventana-rota']);                // un error no logra nada
    assert.equal(deduccion.logradas().length, 1);
    deduccion.responder('cortinas', 'corriente', ['ventana-rota']);
    assert.deepEqual(deduccion.logradas().map(l => [l.pregunta.id, l.conclusion]), [['cortinas', 'corriente'], ['embrujado', 'a-proposito']], 'en el orden de las preguntas');
    deduccion.reiniciar();
    assert.deepEqual(deduccion.logradas(), [], 'al reiniciar se olvida');
    assert.equal(deduccion.preguntaActual().id, 'cortinas');
});

test('un error no deshace lo resuelto, y una pregunta con error en medio no cambia el orden de lo pendiente', () => {
    const { deduccion } = TODO();
    deduccion.responder('cortinas', 'corriente', ['ventana-rota']);
    for (let i = 0; i < 10; i++) deduccion.responder('embrujado', 'rechaza-visitantes', ['polvo-removido']);
    assert.deepEqual(deduccion.logradas().map(l => l.pregunta.id), ['cortinas']);
    assert.equal(deduccion.preguntaActual().id, 'embrujado');
    assert.equal(deduccion.completa, false);
});

// ── Deducción por hechos en todos los niveles (DISENO_V2.md, sección 5) ──────────────

import { readdirSync } from 'node:fs';

const NIVELES_CON_REGLAS = readdirSync(new URL('../assets/investigaciones/', import.meta.url))
    .filter(f => /^nivel\d+\.json$/.test(f)).map(f => Number(f.match(/\d+/)[0])).sort((a, b) => a - b);

test('ninguna pregunta de ningún nivel usa el formato viejo de combinaciones: todas se definen por hechos', () => {
    assert.ok(NIVELES_CON_REGLAS.length >= 2);
    const incumplen = [];
    for (const n of NIVELES_CON_REGLAS) {
        const r = JSON.parse(readFileSync(new URL(`../assets/investigaciones/nivel${n}.json`, import.meta.url), 'utf8'));
        for (const q of r.deduccion?.preguntas || []) {
            if ('validas' in q || 'excepcion' in q) incumplen.push(`nivel ${n}, pregunta "${q.id}": formato viejo`);
            if (!caminosDe(q).length || !Object.keys(q.aportan || {}).length) incumplen.push(`nivel ${n}, pregunta "${q.id}": sin hechos`);
        }
    }
    assert.deepEqual(incumplen, [], incumplen.join('\n  '));
});
