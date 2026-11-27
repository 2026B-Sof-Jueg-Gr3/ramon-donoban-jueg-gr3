// Reglas de la habitación 1 (Pasillo Oscuro): cada línea sale con su disparador, una sola vez y en cualquier orden
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import Investigacion, { validarReglas, resolverTexto, hecho } from '../src/motor/Investigacion.js';
import { leerMapaTiled } from '../src/motor/Mapa.js';

const RAIZ = new URL('../', import.meta.url);
const leerJson = ruta => JSON.parse(readFileSync(new URL(ruta, RAIZ), 'utf8'));
const narrativa = leerJson('assets/narrativa/nivel1.json');
const reglas = leerJson('assets/investigaciones/nivel1.json');
const mapa = leerMapaTiled(leerJson('assets/mapas/nivel1.json'));
const nueva = () => new Investigacion(reglas, narrativa);
const copia = o => JSON.parse(JSON.stringify(o));
const ids = eventos => eventos.map(e => e.regla);
const textoDeMarca = id => narrativa.marcas.find(m => m.id === id).texto;
const pista = id => narrativa.pistas.find(p => p.id === id);

// ── Las reglas y la narrativa ───────────────────────────────────────────────

test('las reglas del nivel 1 son válidas: todo lo que citan existe en la narrativa y en sus objetos', () => {
    assert.deepEqual(validarReglas(reglas, narrativa), []);
    assert.doesNotThrow(nueva);
});

test('las reglas no llevan texto de la historia: solo referencias', () => {
    const contenido = JSON.stringify(reglas);
    const lineas = [narrativa.intro, narrativa.cierre, narrativa.error, narrativa.bateria, narrativa.informe,
        ...narrativa.comentarios, ...narrativa.revelaciones, ...narrativa.marcas.map(m => m.texto), ...narrativa.pistas.flatMap(p => [p.titulo, p.texto])];
    for (const linea of lineas) assert.ok(!contenido.includes(linea), `el archivo de reglas copia el texto: "${linea.slice(0, 40)}…"`);
});

test('cada línea de la narrativa que toca esta fase se usa exactamente una vez; cierre, error e informe quedan para la fase 3', () => {
    const usadas = reglas.reglas.map(r => r.texto).sort();
    const esperadas = ['intro', 'bateria', 'comentarios:0', 'comentarios:1', 'comentarios:2', 'revelaciones:0', 'revelaciones:1',
        ...narrativa.marcas.map(m => `marcas:${m.id}`), ...narrativa.pistas.map(p => `pistas:${p.id}`)].sort();
    assert.deepEqual(usadas, esperadas);
    for (const reservada of ['cierre', 'error', 'informe']) assert.ok(!usadas.includes(reservada), `"${reservada}" es de la fase 3`);
});

test('resolverTexto devuelve la línea exacta de la narrativa (y el título de las pistas, el ícono de las marcas)', () => {
    assert.deepEqual(resolverTexto(narrativa, 'intro'), { categoria: 'intro', texto: narrativa.intro });
    assert.equal(resolverTexto(narrativa, 'comentarios:2').texto, narrativa.comentarios[2]);
    assert.equal(resolverTexto(narrativa, 'revelaciones:1').texto, narrativa.revelaciones[1]);
    const p = resolverTexto(narrativa, 'pistas:n1-pista-huella');
    assert.deepEqual([p.texto, p.titulo], [pista('n1-pista-huella').texto, pista('n1-pista-huella').titulo]);
    const m = resolverTexto(narrativa, 'marcas:n1-marca-polvo');
    assert.deepEqual([m.texto, m.etiqueta], [textoDeMarca('n1-marca-polvo'), narrativa.marcas[0].icono]);
    for (const mala of ['comentarios:9', 'comentarios', 'comentarios:x', 'marcas:no-existe', 'pistas:', 'cierre:1', 'nada', 'intro:0', 'bateria:1'])
        assert.equal(resolverTexto(narrativa, mala), null, mala);
});

// ── Cada línea con su disparador ────────────────────────────────────────────

const CASOS = [
    { regla: 'intro', clase: 'importante', texto: narrativa.intro, prepara: () => { }, dispara: i => i.entro() },
    { regla: 'marca:n1-marca-polvo', clase: 'ambiental', texto: textoDeMarca('n1-marca-polvo'), prepara: () => { }, dispara: i => i.ilumino('n1-marca-polvo') },
    { regla: 'marca:n1-marca-arrastre', clase: 'ambiental', texto: textoDeMarca('n1-marca-arrastre'), prepara: () => { }, dispara: i => i.ilumino('n1-marca-arrastre') },
    { regla: 'comentario:0', clase: 'secundaria', texto: narrativa.comentarios[0], prepara: () => { }, dispara: i => i.examino('pila-de-cajas') },
    { regla: 'comentario:1', clase: 'secundaria', texto: narrativa.comentarios[1], prepara: i => i.ilumino('n1-marca-arrastre'), dispara: i => i.examino('n1-marca-arrastre') },
    { regla: 'comentario:2', clase: 'secundaria', texto: narrativa.comentarios[2], prepara: () => { }, dispara: i => i.examino('cortinas') },
    { regla: 'revelacion:0', clase: 'importante', texto: narrativa.revelaciones[0], prepara: i => i.ilumino('n1-marca-arrastre'), dispara: i => i.examino('pila-de-cajas') },
    { regla: 'revelacion:1', clase: 'importante', texto: narrativa.revelaciones[1], prepara: () => { }, dispara: i => i.miroDetras('pila-de-cajas', 'ventana') },
    { regla: 'pista:n1-pista-huella', clase: 'secundaria', texto: pista('n1-pista-huella').texto, prepara: () => { }, dispara: i => i.recogio('n1-pista-huella') },
    { regla: 'pista:n1-pista-periodico', clase: 'secundaria', texto: pista('n1-pista-periodico').texto, prepara: () => { }, dispara: i => i.recogio('n1-pista-periodico') },
    { regla: 'bateria', clase: 'secundaria', texto: narrativa.bateria, prepara: () => { }, dispara: i => i.recogio('bateria') }
];

test('hay un caso por cada regla del nivel', () => {
    assert.deepEqual(CASOS.map(c => c.regla).sort(), reglas.reglas.map(r => r.id).sort());
});

for (const caso of CASOS) {
    test(`"${caso.regla}": sale con su disparador, con su texto exacto, con su clase y una sola vez`, () => {
        const inv = nueva();
        caso.prepara(inv);
        const antes = inv.dichas.size;
        const eventos = caso.dispara(inv);
        const suyo = eventos.find(e => e.regla === caso.regla);
        assert.ok(suyo, `no salió ${caso.regla}`);
        assert.equal(suyo.texto, caso.texto);
        assert.equal(suyo.clase, caso.clase);
        assert.equal(suyo.acontecimiento, caso.regla, 'la identidad es la de la regla');
        assert.equal(inv.dichas.size, antes + eventos.length);
        assert.deepEqual(caso.dispara(inv), [], 'repetir el mismo suceso no vuelve a sacarla');
    });
}

test('lo que no hace el jugador no provoca nada: ninguna regla sale sin su disparador', () => {
    const inv = nueva();
    assert.deepEqual(ids(inv.examino('cortinas')), ['comentario:2']);
    assert.equal(inv.dichas.size, 1, 'examinar las cortinas no saca ninguna otra línea');
    assert.ok(!inv.yaSalio('intro'), 'la intro solo sale al entrar');
});

// ── Orden libre y revelación 0 ──────────────────────────────────────────────

test('revelación 0, primero las cajas y después las marcas: sale al descubrir las marcas (lo segundo)', () => {
    const inv = nueva();
    assert.deepEqual(ids(inv.examino('pila-de-cajas')), ['comentario:0'], 'examinar las cajas solas no basta');
    const alIluminar = inv.ilumino('n1-marca-arrastre');
    assert.deepEqual(ids(alIluminar), ['marca:n1-marca-arrastre', 'revelacion:0'], 'la causa (la marca) antes que la revelación');
    assert.equal(alIluminar[1].texto, narrativa.revelaciones[0]);
    assert.equal(alIluminar[1].clase, 'importante');
});

test('revelación 0, primero las marcas y después las cajas: sale al examinar las cajas (lo segundo)', () => {
    const inv = nueva();
    assert.deepEqual(ids(inv.ilumino('n1-marca-arrastre')), ['marca:n1-marca-arrastre'], 'descubrir las marcas solas no basta');
    const alExaminar = inv.examino('pila-de-cajas');
    assert.deepEqual(ids(alExaminar), ['comentario:0', 'revelacion:0'], 'la causa (el comentario) antes que la revelación');
    assert.equal(alExaminar[1].texto, narrativa.revelaciones[0]);
});

test('la causa antes que la consecuencia: las notas y tarjetas salen antes que los importantes del mismo suceso', () => {
    const inv = nueva();
    inv.ilumino('n1-marca-arrastre');
    assert.deepEqual(inv.examino('pila-de-cajas').map(e => e.clase), ['secundaria', 'importante']);
    const otra = nueva();
    otra.examino('pila-de-cajas');
    assert.deepEqual(otra.ilumino('n1-marca-arrastre').map(e => e.clase), ['ambiental', 'importante']);
    assert.deepEqual(otra.historial.map(h => h.regla), ['comentario:0', 'marca:n1-marca-arrastre', 'revelacion:0']);
});

test('revelación 1: mirar detrás de las cajas por el lado de la ventana, antes o después de examinarlas', () => {
    const antes = nueva();
    assert.deepEqual(ids(antes.miroDetras('pila-de-cajas', 'ventana')), ['revelacion:1'], 'sin haber examinado nada');
    const despues = nueva();
    despues.examino('pila-de-cajas');
    assert.deepEqual(ids(despues.miroDetras('pila-de-cajas', 'ventana')), ['revelacion:1']);
    assert.equal(despues.miroDetras('pila-de-cajas', 'ventana').length, 0);
});

test('mirar detrás solo cuenta por el lado de la ventana', () => {
    const inv = nueva();
    assert.deepEqual(inv.miroDetras('pila-de-cajas', 'frente'), []);
    assert.deepEqual(inv.miroDetras('pila-de-cajas'), []);
    assert.equal(inv.puedeActuar('pila-de-cajas', 'mirar-detras', 'frente'), false);
    assert.equal(inv.puedeActuar('pila-de-cajas', 'mirar-detras', 'ventana'), true);
    assert.equal(inv.ocurrio(hecho('miro-detras', 'pila-de-cajas', 'ventana')), false, 'ni quedó registrado');
});

test('las marcas de arrastre no se pueden examinar hasta haberlas descubierto con la luz', () => {
    const inv = nueva();
    assert.equal(inv.puedeActuar('n1-marca-arrastre', 'examinar'), false);
    assert.deepEqual(inv.examino('n1-marca-arrastre'), []);
    assert.equal(inv.ocurrio('examino:n1-marca-arrastre'), false, 'el intento no deja rastro');
    assert.equal(inv.yaSalio('comentario:1'), false);
    inv.ilumino('n1-marca-arrastre');
    assert.equal(inv.puedeActuar('n1-marca-arrastre', 'examinar'), true);
    assert.deepEqual(ids(inv.examino('n1-marca-arrastre')), ['comentario:1']);
});

test('las marcas de polvo no se examinan (solo se descubren) y el polvo no habilita nada más', () => {
    const inv = nueva();
    inv.ilumino('n1-marca-polvo');
    assert.equal(inv.puedeActuar('n1-marca-polvo', 'examinar'), false);
    assert.deepEqual(inv.examino('n1-marca-polvo'), []);
});

test('examinar lo mismo varias veces no repite la línea', () => {
    const inv = nueva();
    assert.equal(inv.examino('pila-de-cajas').length, 1);
    for (let i = 0; i < 5; i++) assert.deepEqual(inv.examino('pila-de-cajas'), []);
});

test('iluminar la misma marca varias veces no repite su tarjeta', () => {
    const inv = nueva();
    assert.equal(inv.ilumino('n1-marca-polvo').length, 1);
    for (let i = 0; i < 5; i++) assert.deepEqual(inv.ilumino('n1-marca-polvo'), []);
});

// ── Recorridos completos ────────────────────────────────────────────────────

const RECORRIDO_A = [   // primero las cajas, después las marcas
    i => i.entro(), i => i.examino('pila-de-cajas'), i => i.ilumino('n1-marca-polvo'), i => i.ilumino('n1-marca-arrastre'),
    i => i.examino('n1-marca-arrastre'), i => i.miroDetras('pila-de-cajas', 'ventana'), i => i.examino('cortinas'),
    i => i.recogio('n1-pista-huella'), i => i.recogio('n1-pista-periodico'), i => i.recogio('bateria')
];
const RECORRIDO_B = [   // primero las marcas, mirando detrás de las cajas antes de examinarlas
    i => i.entro(), i => i.ilumino('n1-marca-polvo'), i => i.ilumino('n1-marca-arrastre'), i => i.miroDetras('pila-de-cajas', 'ventana'),
    i => i.examino('n1-marca-arrastre'), i => i.examino('pila-de-cajas'), i => i.examino('cortinas'),
    i => i.recogio('bateria'), i => i.recogio('n1-pista-periodico'), i => i.recogio('n1-pista-huella')
];

const RECORRIDO_C = [   // el orden de la historia: el fenómeno, las cortinas, las marcas, las cajas y detrás de las cajas
    i => i.entro(), i => i.examino('cortinas'), i => i.ilumino('n1-marca-polvo'), i => i.ilumino('n1-marca-arrastre'),
    i => i.examino('n1-marca-arrastre'), i => i.examino('pila-de-cajas'), i => i.miroDetras('pila-de-cajas', 'ventana'),
    i => i.recogio('n1-pista-huella'), i => i.recogio('n1-pista-periodico'), i => i.recogio('bateria')
];

for (const [nombre, recorrido] of [['A (cajas y luego marcas)', RECORRIDO_A], ['B (marcas, detrás de las cajas y luego cajas)', RECORRIDO_B], ['C (el orden de la historia)', RECORRIDO_C]]) {
    test(`recorrido ${nombre}: salen las 11 líneas, cada una una sola vez y con identidad única`, () => {
        const inv = nueva();
        const salieron = recorrido.flatMap(paso => paso(inv));
        assert.equal(salieron.length, reglas.reglas.length);
        assert.deepEqual(ids(salieron).sort(), reglas.reglas.map(r => r.id).sort());
        assert.equal(new Set(salieron.map(e => e.acontecimiento)).size, salieron.length, 'identidades únicas');
        assert.deepEqual(inv.historial.map(h => h.regla), ids(salieron), 'el historial sigue el orden de salida');
        assert.deepEqual(inv.historial.map(h => h.orden), salieron.map((_, k) => k + 1));
        // Repetir todo el recorrido no saca nada
        assert.deepEqual(recorrido.flatMap(paso => paso(inv)), []);
    });
}

test('cada línea sale por su causa real en los dos recorridos', () => {
    const causa = recorrido => { const inv = nueva(); recorrido.forEach(p => p(inv)); return Object.fromEntries(inv.historial.map(h => [h.regla, h.causa])); };
    const a = causa(RECORRIDO_A), b = causa(RECORRIDO_B);
    assert.equal(a['revelacion:0'], 'ilumino:n1-marca-arrastre', 'en A lo segundo son las marcas');
    assert.equal(b['revelacion:0'], 'examino:pila-de-cajas', 'en B lo segundo son las cajas');
    assert.equal(a['revelacion:1'], 'miro-detras:pila-de-cajas:ventana');
    assert.equal(b['revelacion:1'], 'miro-detras:pila-de-cajas:ventana');
    assert.equal(a['comentario:2'], 'examino:cortinas');
});

test('las clases son las de la fase: intro y revelaciones importantes; pistas, pilas y comentarios no detienen el juego', () => {
    const inv = nueva();
    const todos = RECORRIDO_A.flatMap(p => p(inv));
    const clase = id => todos.find(e => e.regla === id).clase;
    assert.deepEqual(['intro', 'revelacion:0', 'revelacion:1'].map(clase), ['importante', 'importante', 'importante']);
    assert.deepEqual(['marca:n1-marca-polvo', 'marca:n1-marca-arrastre'].map(clase), ['ambiental', 'ambiental']);
    assert.deepEqual(['comentario:0', 'comentario:1', 'comentario:2', 'pista:n1-pista-huella', 'pista:n1-pista-periodico', 'bateria'].map(clase),
        Array(6).fill('secundaria'));
});

test('los sucesos que no existen o no se pueden hacer se ignoran sin error', () => {
    const inv = nueva();
    assert.deepEqual(inv.recibir({ tipo: 'bailo', objeto: 'pila-de-cajas' }), []);
    assert.deepEqual(inv.recibir(), []);
    assert.deepEqual(inv.recibir({ tipo: 'ilumino', objeto: 'pila-de-cajas' }), [], 'las cajas no se descubren con la luz');
    assert.deepEqual(inv.examino('n1-pista-huella'), [], 'una pista se recoge, no se examina');
    assert.deepEqual(inv.recogio('cortinas'), []);
    assert.deepEqual(inv.examino('objeto-que-no-existe'), []);
    assert.equal(inv.dichas.size, 0);
});

test('reiniciar la habitación vuelve a dejar salir todas las líneas', () => {
    const inv = nueva();
    RECORRIDO_A.forEach(p => p(inv));
    inv.reiniciar();
    assert.equal(inv.dichas.size, 0);
    assert.equal(inv.historial.length, 0);
    assert.deepEqual(ids(inv.entro()), ['intro']);
});

// ── La validación detecta errores ───────────────────────────────────────────

test('validarReglas detecta referencias rotas, ids repetidos y hechos imposibles', () => {
    const mal = (cambia, parte) => { const r = copia(reglas); cambia(r); const e = validarReglas(r, narrativa); assert.ok(e.some(x => x.includes(parte)), `esperaba un error con "${parte}" y salió: ${JSON.stringify(e)}`); };
    mal(r => { r.reglas[3].texto = 'comentarios:9'; }, 'la narrativa no tiene');
    mal(r => { r.reglas[2].id = r.reglas[1].id; }, 'id repetido');
    mal(r => { r.reglas[1].clase = 'enorme'; }, 'clase');
    mal(r => { r.reglas[3].cuando = ['examino:pila-fantasma']; }, 'no está definido');
    mal(r => { r.reglas[3].cuando = []; }, '"cuando" vacío');
    mal(r => { r.reglas[3].cuando = ['volo:pila-de-cajas']; }, 'mal formado');
    mal(r => { r.reglas[8].cuando = ['miro-detras:pila-de-cajas:sotano']; }, 'lado');
    mal(r => { r.reglas[3].cuando = ['examino:pila-de-cajas:ventana']; }, 'no distingue lados');
    mal(r => { r.reglas[6].cuando = ['miro-detras:pila-de-cajas']; }, 'lado');
    mal(r => { r.reglas[3].cuando = ['ilumino:pila-de-cajas']; }, 'no se descubre con la luz');
    mal(r => { r.reglas[0].cuando = ['entro:pila-de-cajas']; }, 'no lleva objeto');
    mal(r => { r.ayuda.espera = 0; }, 'espera');
    mal(r => { r.ayuda.refuerzos[0].mientras.sinContar = ['regla-que-no-existe']; }, 'no existe');
    mal(r => { r.objetos['n1-marca-arrastre'].acciones.examinar.requiere = ['ilumino:nada']; }, 'no está definido');
    assert.throws(() => new Investigacion({ objetos: {}, reglas: [{ id: 'x', clase: 'importante', texto: 'intro', cuando: ['entro'] }, { id: 'x', clase: 'importante', texto: 'intro', cuando: ['entro'] }] }, narrativa), /no válidas/);
});

// ── El mapa y las reglas se corresponden ────────────────────────────────────

test('todo lo que el mapa señala existe en las reglas, y todo lo que las reglas piden se puede hacer en el mapa', () => {
    const conRef = [...mapa.revelables, ...mapa.interactuables].filter(o => o.props.ref);
    for (const o of conRef) {
        const def = reglas.objetos[o.props.ref];
        assert.ok(def, `${o.nombre}: las reglas no conocen "${o.props.ref}"`);
        if (o.props.accion) {
            const accion = def.acciones?.[o.props.accion];
            assert.ok(accion, `${o.nombre}: "${o.props.ref}" no permite "${o.props.accion}"`);
            if (accion.lados) assert.ok(accion.lados.includes(o.props.lado), `${o.nombre}: lado "${o.props.lado}"`);
        }
        assert.ok(o.props.accion || def.descubre === 'luz', `${o.nombre}: sin acción ni descubrimiento por luz`);
    }
    for (const [objeto, def] of Object.entries(reglas.objetos)) {
        if (def.descubre === 'luz') assert.ok(mapa.revelables.some(o => o.props.ref === objeto), `${objeto} no tiene revelable en el mapa`);
        for (const [accion, d] of Object.entries(def.acciones || {})) {
            const hay = conRef.some(o => o.props.ref === objeto && o.props.accion === accion && (!d.lados || d.lados.includes(o.props.lado)));
            assert.ok(hay, `el mapa no ofrece "${accion}" para ${objeto}`);
        }
    }
});

test('las marcas y pistas del mapa son las de la narrativa', () => {
    assert.deepEqual(mapa.revelables.map(o => o.props.ref).sort(), narrativa.marcas.map(m => m.id).sort());
    const pistasEnMapa = mapa.interactuables.filter(o => o.props.accion === 'recoger' && o.props.ref !== 'bateria').map(o => o.props.ref);
    assert.deepEqual(pistasEnMapa.sort(), narrativa.pistas.map(p => p.id).sort());
    assert.equal(mapa.interactuables.filter(o => o.props.ref === 'bateria').length, 1, 'las pilas están una sola vez');
});

test('en los tres recorridos la causa sale antes que la consecuencia (importante)', () => {
    for (const recorrido of [RECORRIDO_A, RECORRIDO_B, RECORRIDO_C]) {
        const inv = nueva();
        recorrido.forEach(p => p(inv));
        const clase = Object.fromEntries(reglas.reglas.map(r => [r.id, r.clase]));
        for (const h of inv.historial) {
            if (clase[h.regla] !== 'importante') continue;
            for (const o of inv.historial.filter(o => o.causa === h.causa && clase[o.regla] !== 'importante')) {
                assert.ok(o.orden < h.orden, `${o.regla} antes que ${h.regla}`);
            }
        }
    }
});

test('recorrido C: el historial sigue el orden de la historia', () => {
    const inv = nueva();
    RECORRIDO_C.forEach(p => p(inv));
    assert.deepEqual(inv.historial.map(h => h.regla), [
        'intro', 'comentario:2', 'marca:n1-marca-polvo', 'marca:n1-marca-arrastre', 'comentario:1',
        'comentario:0', 'revelacion:0', 'revelacion:1', 'pista:n1-pista-huella', 'pista:n1-pista-periodico', 'bateria'
    ]);
});

// ── Lo ya usado no vuelve a ofrecerse ───────────────────────────────────────

test('hayAlgoNuevo: una acción que ya ocurrió no produce nada, así que no se ofrece otra vez', () => {
    const inv = nueva();
    assert.equal(inv.hayAlgoNuevo('pila-de-cajas', 'mirar-detras', 'ventana'), true);
    assert.equal(inv.hayAlgoNuevo('pila-de-cajas', 'mirar-detras', 'otro-lado'), false, 'por un lado que no existe no hay nada');
    assert.equal(inv.hayAlgoNuevo('pila-de-cajas', 'examinar'), true);
    assert.equal(inv.hayAlgoNuevo('cortinas', 'examinar'), true);
    inv.miroDetras('pila-de-cajas', 'ventana');
    assert.equal(inv.hayAlgoNuevo('pila-de-cajas', 'mirar-detras', 'ventana'), false, 'mirar la ventana después de la revelación');
    assert.equal(inv.hayAlgoNuevo('pila-de-cajas', 'examinar'), true, 'lo demás sigue dando algo');
    inv.examino('pila-de-cajas');
    assert.equal(inv.hayAlgoNuevo('pila-de-cajas', 'examinar'), false);
    inv.examino('cortinas');
    assert.equal(inv.hayAlgoNuevo('cortinas', 'examinar'), false, 'las tres zonas de cortinas comparten su referencia');
});

test('hayAlgoNuevo: lo que no se puede hacer todavía tampoco se ofrece, y lo que se recoge ya no está', () => {
    const inv = nueva();
    assert.equal(inv.hayAlgoNuevo('n1-marca-arrastre', 'examinar'), false, 'antes de descubrir las marcas no se examinan');
    inv.ilumino('n1-marca-arrastre');
    assert.equal(inv.hayAlgoNuevo('n1-marca-arrastre', 'examinar'), true);
    inv.examino('n1-marca-arrastre');
    assert.equal(inv.hayAlgoNuevo('n1-marca-arrastre', 'examinar'), false);
    assert.equal(inv.hayAlgoNuevo('bateria', 'recoger'), true);
    inv.recogio('bateria');
    assert.equal(inv.hayAlgoNuevo('bateria', 'recoger'), false);
    assert.equal(inv.hayAlgoNuevo('no-existe', 'examinar'), false);
    assert.equal(inv.hayAlgoNuevo('pila-de-cajas', 'volar'), false);
});

// ── Las líneas agregadas en la v2 ("momentos") y los hechos con identificador estable ──

test('resolverTexto encuentra "momentos:<id>" y nada más', () => {
    const n = { momentos: { visto: 'Una línea.' } };
    assert.deepEqual(resolverTexto(n, 'momentos:visto'), { categoria: 'momentos', texto: 'Una línea.' });
    assert.equal(resolverTexto(n, 'momentos:otro'), null);
    assert.equal(resolverTexto(n, 'momentos'), null);
    assert.equal(resolverTexto({}, 'momentos:visto'), null);
    assert.equal(resolverTexto(n, 'momentos:toString'), null);       // solo sus propias claves
});

test('"acerto:<pregunta>" y "en-registro:<pista>": una regla con los dos sale una sola vez, en cualquier orden', () => {
    const r = copia(reglas);
    const n = { ...copia(narrativa), momentos: { union: 'Línea de prueba.' } };
    r.reglas.push({ id: 'momento:union', cuando: ['acerto:detras', 'en-registro:abrigo'], clase: 'importante', texto: 'momentos:union' });
    assert.deepEqual(validarReglas(r, n), []);
    for (const orden of [['acerto', 'enRegistro'], ['enRegistro', 'acerto']]) {
        const inv = new Investigacion(r, n);
        const sale = [];
        for (const metodo of orden) sale.push(...inv[metodo](metodo === 'acerto' ? 'detras' : 'abrigo'));
        assert.deepEqual(ids(sale), ['momento:union'], orden.join(' → '));
        assert.equal(sale[0].texto, 'Línea de prueba.');
        assert.deepEqual(inv.acerto('detras'), []);
        assert.deepEqual(inv.enRegistro('abrigo'), []);
    }
    // Solo con uno de los dos, no sale; con otra pregunta, tampoco
    const inv = new Investigacion(r, n);
    assert.deepEqual(inv.acerto('espantaba'), []);
    assert.deepEqual(inv.acerto('detras'), []);
    assert.equal(inv.yaSalio('momento:union'), false);
    // Sin identificador no es un hecho válido
    r.reglas.push({ id: 'mal', cuando: ['acerto'], clase: 'importante', texto: 'momentos:union' });
    assert.ok(validarReglas(r, n).some(e => e.includes('necesita un identificador')));
});
