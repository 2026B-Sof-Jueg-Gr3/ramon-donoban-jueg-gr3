// Mapas en formato Tiled: lectura, colisiones, bordes de luz y el mapa real del Pasillo Oscuro (assets/mapas/nivel1.json)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
    leerMapaTiled, propiedadesDe, rectangulosDeTiles, segmentosDeBorde, segmentosDeRectangulo,
    rectangulosDeColision, segmentosDeLuz, caminableDeSuelo
} from '../src/motor/Mapa.js';
import { poligonoDeVisibilidad, rectanguloIluminado, estaIluminado, puntoEnPoligono, zonaIluminada, CONO_DE_LINTERNA } from '../src/motor/Visibilidad.js';
import { zonaDeAccion, alcanceDeAccion, elegirAccion, ALCANCE_DE_ACCION } from '../src/motor/Alcance.js';
import { distanciaARectangulo } from '../src/motor/Geometria.js';

const RAIZ = new URL('../', import.meta.url);
const json = JSON.parse(readFileSync(new URL('assets/mapas/nivel1.json', RAIZ), 'utf8'));
const mapa = leerMapaTiled(json);
const CUERPO = { ancho: 26, alto: 18 };              // la base del inspector (su cuerpo de física)

const matriz = filas => filas.map(f => [...f].map(ch => ch === '#'));
const solapan = (a, b) => a.x < b.x + b.ancho && a.x + a.ancho > b.x && a.y < b.y + b.alto && a.y + a.alto > b.y;
const porNombre = (lista, nombre) => lista.find(o => o.nombre === nombre);

// ── Rectángulos de colisión ─────────────────────────────────────────────────

function cobertura(solido) {
    const rects = rectangulosDeTiles(solido);
    const cuenta = solido.map(f => f.map(() => 0));
    for (const t of rects) for (let r = t.r; r < t.r + t.alto; r++) for (let c = t.c; c < t.c + t.ancho; c++) cuenta[r][c]++;
    solido.forEach((fila, r) => fila.forEach((s, c) => assert.equal(cuenta[r][c], s ? 1 : 0, `baldosa (${r},${c})`)));
    return rects;
}

test('los rectángulos cubren exactamente las baldosas sólidas, sin superponerse', () => {
    assert.equal(cobertura(matriz(['...', '.#.', '...'])).length, 1);
    assert.deepEqual(cobertura(matriz(['###', '###'])), [{ c: 0, r: 0, ancho: 3, alto: 2 }], 'un bloque es un solo rectángulo');
    assert.equal(cobertura(matriz(['#####', '#...#', '#...#', '#...#', '#####'])).length, 4, 'un marco son 4 rectángulos');
    assert.equal(cobertura(matriz(['#..', '#..', '###'])).length, 2, 'una L');
    assert.deepEqual(rectangulosDeTiles(matriz(['...'])), []);
});

test('propiedad: con matrices al azar la cobertura siempre es exacta', () => {
    let semilla = 12345;
    const azar = () => { semilla = (semilla * 1103515245 + 12345) % 2147483648; return semilla / 2147483648; };
    for (let intento = 0; intento < 60; intento++) {
        const solido = Array.from({ length: 10 }, () => Array.from({ length: 12 }, () => azar() < 0.55));
        cobertura(solido);
    }
});

// ── Segmentos de borde y extrusión ──────────────────────────────────────────

test('una fila de pared sobre el suelo da un solo segmento sur, unido, con la cara hacia arriba', () => {
    const solido = [[true, true, true], [false, false, false]];
    const caminable = [[false, false, false], [true, true, true]];
    assert.deepEqual(segmentosDeBorde(solido, caminable, 64), [
        { ax: 0, ay: 64, bx: 192, by: 64, borde: 'sur', extrusion: { dx: 0, dy: -1, largo: 64 } }
    ]);
});

test('un muro de dos baldosas de alto se ilumina entero: su cara sur se extiende por las dos', () => {
    const solido = [[true, true], [true, true], [false, false]];
    const caminable = [[false, false], [false, false], [true, true]];
    const [segmento] = segmentosDeBorde(solido, caminable, 64);
    assert.deepEqual(segmento.extrusion, { dx: 0, dy: -1, largo: 128 });
    assert.equal(segmento.ay, 128);
    const mezcla = segmentosDeBorde([[false, true], [true, true], [false, false]], [[false, false], [false, false], [true, true]], 64);
    assert.deepEqual(mezcla.map(s => s.extrusion.largo).sort((a, b) => a - b), [64, 128], 'cada columna con su propia altura, sin unirlas');
});

test('una baldosa rodeada de suelo da sus cuatro lados, cada uno extruido hacia dentro de la baldosa', () => {
    const solido = matriz(['...', '.#.', '...']);
    const caminable = solido.map(f => f.map(s => !s));
    const segmentos = segmentosDeBorde(solido, caminable, 64);
    assert.equal(segmentos.length, 4);
    const por = nombre => segmentos.find(s => s.borde === nombre);
    assert.deepEqual(por('sur'), { ax: 64, ay: 128, bx: 128, by: 128, borde: 'sur', extrusion: { dx: 0, dy: -1, largo: 64 } });
    assert.deepEqual(por('norte').extrusion, { dx: 0, dy: 1, largo: 64 });
    assert.deepEqual(por('este').extrusion, { dx: -1, dy: 0, largo: 64 });
    assert.deepEqual(por('oeste').extrusion, { dx: 1, dy: 0, largo: 64 });
});

test('un hueco en la pared parte el segmento; una pared que da al vacío no genera borde', () => {
    const solido = [[true, true, false, true, true], [false, false, false, false, false]];
    const caminable = [[false, false, true, false, false], [true, true, true, true, true]];
    const segmentos = segmentosDeBorde(solido, caminable, 64);
    assert.equal(segmentos.filter(s => s.borde === 'sur').length, 2, 'dos tramos de pared a cada lado del hueco');
    assert.equal(segmentos.filter(s => s.borde === 'este').length, 1);
    assert.equal(segmentos.filter(s => s.borde === 'oeste').length, 1);
    const alVacio = segmentosDeBorde([[true, true]], [[false, false]], 64);
    assert.deepEqual(alVacio, [], 'sin suelo al lado no hay luz que cortar');
});

test('un mueble alto tiene cuatro lados cerrados y solo el sur lleva la cara de la altura indicada', () => {
    const lados = segmentosDeRectangulo({ x: 704, y: 448, ancho: 128, alto: 48 }, { alturaCara: 150 });
    assert.equal(lados.length, 4);
    for (let i = 0; i < 4; i++) {
        const a = lados[i], b = lados[(i + 1) % 4];
        assert.deepEqual([a.bx, a.by], [b.ax, b.ay], 'los lados forman un contorno cerrado');
    }
    assert.deepEqual(lados.find(l => l.borde === 'sur').extrusion, { dx: 0, dy: -1, largo: 150 });
    assert.equal(lados.filter(l => l.extrusion).length, 1);
    assert.equal(segmentosDeRectangulo({ x: 0, y: 0, ancho: 10, alto: 10 }).every(l => l.extrusion === null), true);
});

// ── Lectura de Tiled ────────────────────────────────────────────────────────

const mini = () => ({
    orientation: 'orthogonal', infinite: false, width: 3, height: 2, tilewidth: 16, tileheight: 16,
    layers: [
        { name: 'suelo', type: 'tilelayer', data: [1, 1, 1, 1, 1, 1] },
        { name: 'paredes', type: 'tilelayer', data: [0x80000003, 0, 0, 0, 0, 0] },
        {
            name: 'objetos', type: 'objectgroup', objects: [
                { id: 1, name: 'inicio', type: 'inicio', x: 8, y: 20, width: 0, height: 0, point: true },
                { id: 2, name: 'm', class: 'mueble', x: 0, y: 0, width: 16, height: 16, properties: [{ name: 'alto', type: 'int', value: 30 }] },
                { id: 3, name: 'c', class: 'cortina', x: 0, y: 0, width: 4, height: 8 },
                { id: 4, name: 'v', class: 'ventana', x: 0, y: 0, width: 4, height: 8 },
                { id: 5, name: 'f', class: 'fenomeno', x: 0, y: 0, width: 4, height: 8 }
            ]
        }
    ]
});

test('se leen capas, objetos y propiedades; los giros de baldosa de Tiled se ignoran', () => {
    const m = leerMapaTiled(mini());
    assert.deepEqual([m.ancho, m.alto, m.tam], [48, 32, 16]);
    assert.equal(m.paredes[0][0], 3, 'sin los bits de giro');
    assert.deepEqual(m.inicio, { x: 8, y: 20 });
    assert.equal(m.muebles.length, 1);
    assert.deepEqual(m.muebles[0].props, { alto: 30 });
    assert.deepEqual([m.cortinas.length, m.ventanas.length, m.fenomenos.length], [1, 1, 1]);
    assert.deepEqual(propiedadesDe({ properties: [{ name: 'a', value: 1 }, { name: 'b', value: 'x' }] }), { a: 1, b: 'x' });
    assert.deepEqual(propiedadesDe({}), {});
});

test('un mapa mal formado se rechaza con un mensaje claro', () => {
    const sin = nombre => { const m = mini(); m.layers = m.layers.filter(l => l.name !== nombre); return m; };
    assert.throws(() => leerMapaTiled(sin('objetos')), /objetos/);
    assert.throws(() => leerMapaTiled(sin('suelo')), /suelo/);
    assert.throws(() => leerMapaTiled({ ...mini(), infinite: true }), /infinito/);
    assert.throws(() => leerMapaTiled({ ...mini(), orientation: 'isometric' }), /ortogonal/);
    assert.throws(() => leerMapaTiled({ ...mini(), tileheight: 32 }), /cuadradas/);
    const sinInicio = mini(); sinInicio.layers[2].objects = [];
    assert.throws(() => leerMapaTiled(sinInicio), /inicio/);
    const corto = mini(); corto.layers[0].data = [1, 1];
    assert.throws(() => leerMapaTiled(corto), /baldosas/);
});

// ── El mapa real: el Pasillo Oscuro ─────────────────────────────────────────

test('nivel1.json es un mapa de Tiled válido y más grande que la pantalla', () => {
    assert.equal(json.type, 'map');
    assert.equal(json.orientation, 'orthogonal');
    assert.deepEqual(json.layers.map(l => l.name), ['suelo', 'paredes', 'objetos']);
    assert.ok(mapa.ancho > 1280 && mapa.alto > 720, `${mapa.ancho}×${mapa.alto}: la cámara tiene que moverse en los dos ejes`);
    const tileset = json.tilesets[0];
    assert.equal(tileset.firstgid, 1);
    assert.equal(tileset.tilecount, 5);
    const gids = [...mapa.suelo.flat(), ...mapa.paredes.flat()];
    assert.ok(Math.max(...gids) <= tileset.tilecount, 'todas las baldosas existen en el tileset');
    const ids = json.layers.find(l => l.name === 'objetos').objects.map(o => o.id);
    assert.equal(new Set(ids).size, ids.length, 'ids de objeto únicos');
    assert.ok(Math.max(...ids) < json.nextobjectid);
    const nombres = json.layers.find(l => l.name === 'objetos').objects.map(o => o.name);
    assert.equal(new Set(nombres).size, nombres.length, 'nombres de objeto únicos (son las claves de sus texturas)');
});

test('es EL PASILLO OSCURO: la pila de cajas delante de la ventana rota, con las marcas, las pistas y las pilas', () => {
    // La pila de cajas: un mueble alto que corta la luz
    const pila = porNombre(mapa.muebles, 'pila-de-cajas');
    assert.ok(pila && pila.props.alto > 0, 'hay una pila de cajas');
    assert.ok(mapa.bloqueaLuz.some(b => b.x === pila.x && b.y === pila.y && b.ancho === pila.ancho && b.alto === pila.alto && b.props.alturaCara === pila.props.alto), 'la pila corta la luz');
    assert.ok(mapa.muebles.length >= 3 && mapa.muebles.some(m => !mapa.bloqueaLuz.some(b => b.x === m.x && b.y === m.y)), 'hay más muebles, también bajos');

    // La ventana rota está justo detrás de la pila; las demás ventanas están enteras
    assert.equal(mapa.ventanas.length, 4);
    const rotas = mapa.ventanas.filter(v => v.props.rota);
    assert.equal(rotas.length, 1);
    const centro = rotas[0].x + rotas[0].ancho / 2;
    assert.ok(centro >= pila.x && centro <= pila.x + pila.ancho, 'la ventana rota queda detrás de la pila');
    assert.ok(mapa.cortinas.length >= 2 * mapa.ventanas.length, 'las ventanas tienen cortinas');
    const [origen] = mapa.fenomenos.filter(f => f.props.efecto === 'corriente');
    assert.ok(origen, 'hay un origen de la corriente');
    assert.ok(origen.x >= rotas[0].x && origen.x + origen.ancho <= rotas[0].x + rotas[0].ancho, 'el origen de la corriente es la ventana rota');

    // Mirar detrás: una franja pequeña justo debajo de la ventana rota, pegada al muro (no todo el hueco hasta la pila)
    const detras = mapa.interactuables.find(o => o.props.accion === 'mirar-detras');
    const ventanaRota = rotas[0];
    assert.equal(detras.props.lado, 'ventana');
    assert.equal(detras.props.ref, 'pila-de-cajas');
    assert.equal(detras.y, 4 * mapa.tam, 'pegada al muro norte');
    assert.equal(detras.x, ventanaRota.x - 16, '16 px de margen a la izquierda de la ventana');
    assert.equal(detras.x + detras.ancho, ventanaRota.x + ventanaRota.ancho + 16, '16 px de margen a la derecha');
    assert.ok(detras.alto <= 48 && detras.y + detras.alto < pila.y - 64, 'es una franja delgada: no llega a la pila');
    assert.equal(detras.props.distancia, 0, 'hay que estar dentro de la franja');
    const [mx, my] = detras.props.mira.split(',').map(Number);
    assert.ok(mx >= ventanaRota.x && mx <= ventanaRota.x + ventanaRota.ancho && my >= ventanaRota.y && my <= ventanaRota.y + ventanaRota.alto, 'hay que mirar a la ventana');

    // Marcas, pistas y pilas con las referencias de la narrativa
    assert.deepEqual(mapa.revelables.map(o => o.props.ref).sort(), ['n1-marca-arrastre', 'n1-marca-polvo']);
    const por = (ref, accion) => mapa.interactuables.filter(o => o.props.ref === ref && o.props.accion === accion);
    assert.equal(por('pila-de-cajas', 'examinar').length, 1);
    assert.equal(por('cortinas', 'examinar').length, 3);
    assert.equal(por('n1-pista-huella', 'recoger').length, 1);
    assert.equal(por('n1-pista-periodico', 'recoger').length, 1);
    assert.equal(por('bateria', 'recoger').length, 1);
    assert.ok(mapa.revelables.find(o => o.props.ref === 'n1-marca-arrastre').props.accion === 'examinar', 'las marcas de arrastre se pueden examinar');
});

test('las pilas están escondidas en un rincón del pasillo, fuera de la línea principal', () => {
    const [pilas] = mapa.interactuables.filter(o => o.props.ref === 'bateria');
    const suelo = caminableDeSuelo(mapa);
    const fila = Math.floor(pilas.y / mapa.tam), col = Math.floor(pilas.x / mapa.tam);
    assert.ok(suelo[fila][col], 'sobre suelo');
    const ladosLibres = [[-1, 0], [1, 0], [0, 1], [0, -1]].filter(([dc, dr]) => suelo[fila + dr]?.[col + dc]).length;
    assert.ok(ladosLibres <= 2, 'es un rincón: la baldosa tiene como mucho dos lados abiertos');
    const pasillo = { fila: Math.floor(mapa.inicio.y / mapa.tam) };
    assert.ok(fila > pasillo.fila + 1, 'queda aparte, debajo del pasillo');
});

test('todo está sobre suelo caminable, dentro del mapa y sin atravesar paredes', () => {
    const caminable = caminableDeSuelo(mapa);
    const sobreSuelo = r => {
        for (let fila = Math.floor(r.y / mapa.tam); fila <= Math.floor((r.y + r.alto - 1) / mapa.tam); fila++) {
            for (let col = Math.floor(r.x / mapa.tam); col <= Math.floor((r.x + r.ancho - 1) / mapa.tam); col++) {
                if (!caminable[fila]?.[col]) return false;
            }
        }
        return true;
    };
    for (const o of [...mapa.muebles, ...mapa.revelables, ...mapa.interactuables]) {
        if (o.props.sobre || o.props.enPared) continue;      // sobre un mueble o sobre el muro: no es suelo
        assert.ok(sobreSuelo(o), `${o.nombre} está sobre suelo`);
    }
    const cuerpoInicial = { x: mapa.inicio.x - CUERPO.ancho / 2, y: mapa.inicio.y - CUERPO.alto, ...CUERPO };
    assert.ok(sobreSuelo(cuerpoInicial), 'el inspector empieza sobre suelo');
    const colisiones = rectangulosDeColision(mapa);
    assert.ok(!colisiones.some(r => solapan(cuerpoInicial, r)), 'y no empieza dentro de nada');
    const paredes = colisiones.slice(0, colisiones.length - mapa.muebles.length);
    for (const m of mapa.muebles) assert.ok(!paredes.some(p => solapan(m, p)), `${m.nombre} no se mete en una pared`);
    for (const v of [...mapa.ventanas, ...mapa.cortinas]) {
        assert.ok(v.y >= 2 * mapa.tam && v.y + v.alto <= 4 * mapa.tam + 8, `${v.nombre} está en la pared norte`);
    }
});

test('el dibujo alto de un mueble nunca tapa un revelable ni un interactuable', () => {
    // El dibujo de un mueble sube por encima de su huella (su altura + su profundidad); si tiene más profundidad
    // que lo que hay detrás, lo oculta. Los revelables están siempre al fondo; los interactuables, según su base.
    const dibujo = m => ({ x: m.x, y: m.y - m.props.alto, ancho: m.ancho, alto: m.alto + m.props.alto });
    for (const m of mapa.muebles) {
        for (const r of mapa.revelables) assert.ok(!solapan(r, dibujo(m)), `${r.nombre} queda tapado por el dibujo de ${m.nombre}`);
        for (const i of mapa.interactuables) {
            if (!solapan(i, dibujo(m))) continue;
            // Lo que está sobre un mueble se dibuja encima de él; una zona sin dibujo (detrás de la pila, cortinas) no se tapa
            assert.ok(i.props.sobre === m.nombre || !i.props.dibujo, `${i.nombre} queda tapado por el dibujo de ${m.nombre}`);
        }
    }
});

test('las paredes se unen en pocos rectángulos grandes (menos juntas donde engancharse)', () => {
    const paredes = rectangulosDeColision(mapa).slice(0, -mapa.muebles.length);
    const baldosas = mapa.paredes.flat().filter(g => g !== 0).length;
    assert.ok(paredes.length < baldosas / 8, `${paredes.length} rectángulos para ${baldosas} baldosas`);
});

// Todas las posiciones (pies) a las que llega el inspector, cada 16 px, por búsqueda desde la salida
let _alcanzables = null;
function posicionesAlcanzables() {
    if (_alcanzables) return _alcanzables;
    const colisiones = rectangulosDeColision(mapa);
    const paso = 16;
    const bloqueado = (x, y) => x < 0 || y < 0 || x >= mapa.ancho || y >= mapa.alto
        || colisiones.some(r => solapan({ x: x - CUERPO.ancho / 2, y: y - CUERPO.alto, ...CUERPO }, r));
    const visitado = new Set([`${mapa.inicio.x},${mapa.inicio.y}`]);
    const cola = [[mapa.inicio.x, mapa.inicio.y]];
    while (cola.length) {
        const [x, y] = cola.pop();
        for (const [dx, dy] of [[paso, 0], [-paso, 0], [0, paso], [0, -paso]]) {
            const nx = x + dx, ny = y + dy, clave = `${nx},${ny}`;
            if (visitado.has(clave) || bloqueado(nx, ny)) continue;
            visitado.add(clave);
            cola.push([nx, ny]);
        }
    }
    _alcanzables = [...visitado].map(k => k.split(',').map(Number));
    return _alcanzables;
}

test('el inspector puede llegar a todo: el pasillo entero, el rincón y junto a cada mueble y cada marca', () => {
    const posiciones = posicionesAlcanzables();
    assert.ok(posiciones.some(([x]) => x > 2200), 'extremo este del pasillo');
    assert.ok(posiciones.some(([, y]) => y > 600), 'el rincón del sur');
    for (const o of [...mapa.muebles, ...mapa.revelables.filter(r => !r.props.accion)]) {
        assert.ok(posiciones.some(([x, y]) => distanciaARectangulo({ x, y }, o) <= 84), `se llega junto a ${o.nombre}`);
    }
});

test('el hueco de detrás de la pila está abierto por los dos lados, y la franja de la ventana es alcanzable', () => {
    const posiciones = posicionesAlcanzables();
    const pila = porNombre(mapa.muebles, 'pila-de-cajas');
    const detras = mapa.interactuables.find(o => o.props.accion === 'mirar-detras');
    const dentro = posiciones.filter(([x, y]) => distanciaARectangulo({ x, y }, detras) <= detras.props.distancia);
    assert.ok(dentro.length >= 4, `los pies caben dentro de la franja (${dentro.length} posiciones)`);
    const hueco = ([x, y]) => y > detras.y && y < pila.y;                        // las filas entre el muro y la pila
    assert.ok(posiciones.some(p => hueco(p) && p[0] < pila.x - 16) && posiciones.some(p => hueco(p) && p[0] > pila.x + pila.ancho + 16),
        'se entra al hueco desde el oeste o desde el este');
    assert.ok(posiciones.some(p => hueco(p) && p[1] >= pila.y - 20 && p[0] > pila.x && p[0] < pila.x + pila.ancho), 'y se puede estar justo detrás de la pila, lejos de la ventana');
    assert.ok(!posiciones.some(p => p[1] > pila.y && p[1] < pila.y + pila.alto + CUERPO.alto && p[0] > pila.x - 13 && p[0] < pila.x + pila.ancho + 13), 'la pila no se atraviesa');
});

// ── La luz en el mapa real ──────────────────────────────────────────────────

const luzEn = (origen, direccion) => ({ origen, direccion, semiangulo: CONO_DE_LINTERNA.semiangulo, alcance: CONO_DE_LINTERNA.alcance });
const poligonoDe = (luz, segmentos = segmentosDeLuz(mapa)) => poligonoDeVisibilidad(luz.origen, segmentos, luz.alcance);

test('el muro norte es de dos baldosas y su cara se ilumina entera', () => {
    const muro = segmentosDeLuz(mapa).filter(s => s.borde === 'sur' && s.ay === 4 * mapa.tam);
    assert.ok(muro.length >= 1);
    assert.ok(muro.every(s => s.extrusion.largo === 2 * mapa.tam), 'la cara del muro mide 128 px');
});

test('la luz no atraviesa las paredes: el vacío de fuera del mapa nunca queda iluminado', () => {
    const luz = luzEn(mapa.inicio, 0);
    const poligono = poligonoDe(luz);
    for (const fuera of [{ x: 50, y: 50 }, { x: 600, y: 100 }, { x: 600, y: 760 }, { x: 2280, y: 800 }]) {
        assert.equal(puntoEnPoligono(fuera, poligono), false, `(${fuera.x}, ${fuera.y})`);
    }
    assert.equal(puntoEnPoligono({ x: 400, y: 440 }, poligono), true, 'el pasillo sí se ve');
});

test('la pila de cajas tapa el hueco de detrás desde el frente, pero no desde un lado', () => {
    const pila = porNombre(mapa.muebles, 'pila-de-cajas');
    const hueco = { x: pila.x + pila.ancho / 2, y: 330 };
    const desdeElFrente = luzEn({ x: hueco.x, y: 520 }, -Math.PI / 2);
    assert.equal(estaIluminado(hueco, desdeElFrente, poligonoDe(desdeElFrente)), false, 'desde el sur la pila lo tapa');
    const desdeUnLado = luzEn({ x: 1800, y: 330 }, 0);
    assert.equal(estaIluminado(hueco, desdeUnLado, poligonoDe(desdeUnLado)), true, 'desde el oeste, por el lado de la ventana, se ve');
});

test('las marcas de arrastre se descubren alumbrándolas desde el pasillo, y las de polvo desde el otro lado', () => {
    const arrastre = mapa.revelables.find(o => o.props.ref === 'n1-marca-arrastre');
    const polvo = mapa.revelables.find(o => o.props.ref === 'n1-marca-polvo');
    const haciaArrastre = { x: arrastre.x + arrastre.ancho / 2, y: arrastre.y + arrastre.alto / 2 };
    const luzA = luzEn({ x: 1500, y: 420 }, Math.atan2(haciaArrastre.y - 420, haciaArrastre.x - 1500));
    assert.equal(rectanguloIluminado(arrastre, luzA, poligonoDe(luzA)), true);
    assert.equal(rectanguloIluminado(polvo, luzA, poligonoDe(luzA)), false, 'cada marca está en su sitio');
    const haciaPolvo = { x: polvo.x + polvo.ancho / 2, y: polvo.y + polvo.alto / 2 };
    const luzP = luzEn({ x: 400, y: 460 }, Math.atan2(haciaPolvo.y - 460, haciaPolvo.x - 400));
    assert.equal(rectanguloIluminado(polvo, luzP, poligonoDe(luzP)), true);
    assert.equal(rectanguloIluminado(arrastre, luzP, poligonoDe(luzP)), false);
});

test('calcular el polígono de visibilidad en el mapa real es barato (cabe de sobra en un cuadro de 60 FPS)', () => {
    const segmentos = segmentosDeLuz(mapa);
    const extras = Array.from({ length: 80 }, (_, i) => -0.74 + i * 0.0175);
    const antes = performance.now();
    for (let i = 0; i < 60; i++) poligonoDeVisibilidad({ x: 400 + i * 20, y: 440 }, segmentos, CONO_DE_LINTERNA.alcance, extras, 0.06);
    const media = (performance.now() - antes) / 60;
    assert.ok(media < 8, `${media.toFixed(2)} ms por polígono con ${segmentos.length} segmentos`);
});

// ── El alcance de las acciones en el mapa real (cerca, de frente y con luz) ──────────────────────────────────

const zonaPor = nombre => zonaDeAccion(porNombre([...mapa.interactuables, ...mapa.revelables], nombre), mapa.muebles);
const accionables = () => [...mapa.interactuables, ...mapa.revelables.filter(o => o.props.accion)];
// La luz como la escena: nace en el centro del cuerpo, 8 px por delante de donde mira el inspector
function luzDesde(pies, direccion) {
    const origen = { x: pies.x + Math.cos(direccion) * 8, y: pies.y - CUERPO.alto / 2 + Math.sin(direccion) * 8 };
    return luzEn(origen, direccion);
}
const segmentos = segmentosDeLuz(mapa);
// ¿Puede usar esa zona alguien con los pies en `pies`, mirando hacia `direccion`, con la linterna real?
function intento(pies, direccion, zona) {
    const luz = luzDesde(pies, direccion), poligono = poligonoDe(luz, segmentos);
    return alcanceDeAccion(pies, direccion, zona, () => zonaIluminada(zona.luz, luz, poligono, 4, CONO_DE_LINTERNA.radioHalo));
}
const hacia = (desde, a) => Math.atan2(a.y - desde.y, a.x - desde.x);
const centroDe = r => ({ x: r.x + r.ancho / 2, y: r.y + r.alto / 2 });
const todasLasDirecciones = Array.from({ length: 36 }, (_, i) => (i / 36) * 2 * Math.PI - Math.PI);

test('el alcance general es de 40 px y ningún objeto del mapa lo supera', () => {
    assert.equal(ALCANCE_DE_ACCION, 40);
    for (const o of accionables()) {
        const z = zonaDeAccion(o, mapa.muebles);
        assert.ok(z.distancia <= ALCANCE_DE_ACCION, `${o.nombre}: ${z.distancia}`);
        if (o.props.distancia !== undefined) assert.ok(o.props.distancia <= ALCANCE_DE_ACCION, `${o.nombre} pide más que el alcance general`);
    }
    // Ya no hay alcances de 70, 84 ni 110 px
    assert.ok(accionables().every(o => (o.props.distancia ?? 0) <= 40));
});

test('todo se puede usar desde alguna posición alcanzable: cerca, de frente y con la luz real', () => {
    const posiciones = posicionesAlcanzables();
    for (const o of accionables()) {
        const zona = zonaDeAccion(o, mapa.muebles);
        const candidatos = posiciones.filter(([x, y]) => distanciaARectangulo({ x, y }, zona.huella) <= zona.distancia);
        assert.ok(candidatos.length > 0, `${o.nombre}: hay sitio donde pararse a menos de ${zona.distancia} px`);
        const sirve = candidatos.some(([x, y]) => intento({ x, y }, hacia({ x, y }, zona.mira ?? centroDe(zona.luz)), zona).posible);
        assert.ok(sirve, `${o.nombre}: se puede usar de frente y con luz`);
    }
});

test('detrás de la pila, a 140 px de la ventana: ninguna acción, mire hacia donde mire', () => {
    const pies = { x: 1985, y: 378 };
    assert.equal(Math.round(pies.y - (porNombre(mapa.ventanas, 'ventana-4').y + 76)), 140, 'a 140 px del borde de la ventana');
    assert.ok(posicionesAlcanzables().some(([x, y]) => x === 1978 && y >= 376), 'es un sitio al que se llega');
    const zonas = accionables().map(o => zonaDeAccion(o, mapa.muebles));
    assert.equal(intento(pies, -Math.PI / 2, zonaPor('mirar-detras')).razon, 'lejos');
    for (const direccion of todasLasDirecciones) {
        const luz = luzDesde(pies, direccion), poligono = poligonoDe(luz, segmentos);
        assert.equal(elegirAccion(pies, direccion, zonas, z => zonaIluminada(z.luz, luz, poligono, 4, CONO_DE_LINTERNA.radioHalo)), null, `mirando a ${Math.round(direccion * 180 / Math.PI)}°`);
    }
});

test('en la franja de la ventana, mirándola: sí; de espaldas, de lado o sin la luz sobre ella: no', () => {
    const zona = zonaPor('mirar-detras');
    const ventana = centroDe(porNombre(mapa.ventanas, 'ventana-4'));
    const pies = { x: 1984, y: 286 };
    assert.equal(distanciaARectangulo(pies, zona.huella), 0, 'los pies están dentro de la franja');
    assert.equal(intento(pies, hacia(pies, ventana), zona).posible, true, 'mirando a la ventana, con luz');
    assert.equal(intento(pies, -Math.PI / 2, zona).posible, true, 'mirando hacia arriba');
    assert.equal(intento(pies, Math.PI / 2, zona).razon, 'de-espaldas', 'mirando hacia abajo');
    assert.equal(intento(pies, 0, zona).razon, 'de-espaldas', 'mirando hacia el este');
    assert.equal(intento(pies, Math.PI, zona).razon, 'de-espaldas', 'mirando hacia el oeste');
    // Pegado al muro (el mínimo: pies a y = 274) el cono casi no toca la pared, pero el halo sí: se puede usar
    assert.equal(intento({ x: 1984, y: 274 }, -Math.PI / 2, zona).posible, true, 'pegado al muro, mirando hacia arriba');
    assert.equal(intento({ x: 1940, y: 274 }, hacia({ x: 1940, y: 274 }, ventana), zona).posible, true, 'desde un extremo de la franja, mirando a la ventana');
    assert.equal(alcanceDeAccion({ x: 1940, y: 286 }, -Math.PI / 2, zona, false).razon, 'a-oscuras', 'y sin luz sobre ella, no');
});

test('fuera de la franja (aunque sea detrás de la pila) no se mira detrás: a 34 px de la franja ya es lejos', () => {
    const zona = zonaPor('mirar-detras');
    for (const [x, y] of [[1984, 340], [1984, 330], [1900, 290], [2060, 290], [1984, 378]]) {
        assert.equal(intento({ x, y }, -Math.PI / 2, zona).razon, 'lejos', `(${x}, ${y})`);
    }
});

test('la pila se examina desde el frente, de frente y con luz; no desde atrás ni desde los lados', () => {
    const zona = zonaPor('examinar-pila');
    assert.equal(intento({ x: 1984, y: 478 }, -Math.PI / 2, zona).posible, true, 'desde el frente, 30 px');
    assert.equal(intento({ x: 1900, y: 476 }, hacia({ x: 1900, y: 476 }, { x: 1960, y: 430 }), zona).posible, true, 'desde el frente en diagonal');
    assert.equal(intento({ x: 1984, y: 478 }, Math.PI / 2, zona).razon, 'de-espaldas');
    assert.equal(intento({ x: 1984, y: 560 }, -Math.PI / 2, zona).razon, 'lejos', 'a 112 px');
    assert.equal(intento({ x: 1984, y: 380 }, Math.PI / 2, zona).razon, 'a-oscuras', 'desde atrás la pila tapa su cara');
    assert.equal(intento({ x: 1900, y: 420 }, 0, zona).razon, 'a-oscuras', 'desde un lado la pila tapa su cara');
});

test('cortinas, huella, recorte, pilas y marcas de arrastre: solo desde cerca, de frente y con luz', () => {
    // Cortinas: desde el suelo pegado al muro
    const cortinas = zonaPor('cortinas-1');
    assert.equal(intento({ x: 512, y: 284 }, -Math.PI / 2, cortinas).posible, true);
    assert.equal(intento({ x: 512, y: 284 }, Math.PI / 2, cortinas).razon, 'de-espaldas');
    assert.equal(intento({ x: 512, y: 340 }, -Math.PI / 2, cortinas).razon, 'lejos');
    assert.equal(intento({ x: 700, y: 284 }, -Math.PI / 2, cortinas).razon, 'lejos', 'fuera de las cortinas, al lado');
    // Huella de bota, en el suelo
    const huella = zonaPor('huella-bota');
    assert.equal(intento({ x: 324, y: 558 }, -Math.PI / 2, huella).posible, true);
    assert.equal(intento({ x: 324, y: 558 }, Math.PI / 2, huella).razon, 'de-espaldas');
    assert.equal(intento({ x: 324, y: 620 }, -Math.PI / 2, huella).razon, 'lejos');
    // Pilas, en el rincón
    const pilas = zonaPor('pilas');
    assert.equal(intento({ x: 448, y: 574 }, Math.PI / 2, pilas).posible, true, 'desde la entrada del rincón, mirando hacia ellas');
    assert.equal(intento({ x: 448, y: 574 }, -Math.PI / 2, pilas).razon, 'de-espaldas');
    assert.equal(intento({ x: 448, y: 520 }, Math.PI / 2, pilas).razon, 'lejos');
    // Recorte: de pie frente a la consola, a unos 40 px de su borde frontal (y = 320)
    const recorte = zonaPor('recorte');
    assert.equal(recorte.huella.y + recorte.huella.alto, 320, 'se usa desde el borde frontal de la consola');
    assert.equal(intento({ x: 1252, y: 350 }, -Math.PI / 2, recorte).posible, true, 'a 30 px del borde frontal');
    assert.equal(intento({ x: 1252, y: 358 }, -Math.PI / 2, recorte).posible, true, 'a 38 px');
    assert.equal(intento({ x: 1252, y: 372 }, -Math.PI / 2, recorte).razon, 'lejos', 'a 52 px ya no');
    assert.equal(intento({ x: 1252, y: 350 }, Math.PI / 2, recorte).razon, 'de-espaldas');
    // Marcas de arrastre: se ven y se examinan desde cerca
    const arrastre = zonaPor('arrastre');
    assert.equal(arrastre.distancia, ALCANCE_DE_ACCION);
    assert.equal(intento({ x: 1780, y: 340 }, -Math.PI / 2, arrastre).posible, true);
    assert.equal(intento({ x: 1780, y: 420 }, -Math.PI / 2, arrastre).razon, 'lejos');
});
