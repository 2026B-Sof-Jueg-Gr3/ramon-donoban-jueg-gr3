// Lectura de los mapas en formato JSON de Tiled y datos derivados para la física y la linterna. Sin Phaser.
//
// Capas esperadas: "suelo" y "paredes" (de baldosas) y "objetos" (de objetos). Tipos de objeto: inicio, mueble,
// bloqueaLuz, revelable, interactuable, ventana, cortina, fenomeno y, en la cocina, vela, olla y cuerda (una polilínea:
// sus puntos van en `puntos`). Las coordenadas de los objetos están en píxeles; un `inicio` es un punto (los pies del
// inspector) y los demás son rectángulos.
//
// Lo que se puede usar (`interactuable`, y un `revelable` que además tenga `accion`) lleva en sus propiedades:
//   ref (a quién se refieren las reglas de la habitación) · accion · lado (opcional)
// y, para el alcance (src/motor/Alcance.js, todo opcional): distancia (baja el alcance general de 40 px, nunca lo supera) ·
// sobre (se usa desde ese mueble) · mira "x,y" (el punto al que hay que mirar) · luz "x,y,ancho,alto" (lo que tiene que tocar
// la luz) · enPared (el objeto está sobre el muro, no sobre el suelo)
//
// Lo que bloquea (colisión y luz) sale de la capa "paredes": toda baldosa distinta de 0 es sólida.

import { desplazarObjeto } from './Alcance.js';

const MASCARA_GID = 0x1fffffff;      // Tiled guarda los giros de la baldosa en los bits altos

export function propiedadesDe(objeto) {
    const propiedades = {};
    for (const { name, value } of objeto.properties || []) propiedades[name] = value;
    return propiedades;
}

function matrizDeCapa(capa, ancho, alto) {
    if (!capa || capa.type !== 'tilelayer') throw new Error(`la capa "${capa?.name}" no es de baldosas`);
    if (capa.data.length !== ancho * alto) throw new Error(`la capa "${capa.name}" no tiene ${ancho}×${alto} baldosas`);
    const filas = [];
    for (let r = 0; r < alto; r++) filas.push(capa.data.slice(r * ancho, (r + 1) * ancho).map(g => g & MASCARA_GID));
    return filas;
}

export function leerMapaTiled(json) {
    if (json.orientation !== 'orthogonal') throw new Error('el mapa debe ser ortogonal');
    if (json.infinite) throw new Error('el mapa no puede ser infinito');
    if (json.tilewidth !== json.tileheight) throw new Error('las baldosas deben ser cuadradas');
    const ancho = json.width, alto = json.height, tam = json.tilewidth;
    const capa = nombre => {
        const encontrada = json.layers.find(l => l.name === nombre);
        if (!encontrada) throw new Error(`falta la capa "${nombre}"`);
        return encontrada;
    };
    const objetos = capa('objetos').objects.map(o => ({
        id: o.id, nombre: o.name, tipo: o.class || o.type || '',
        x: o.x, y: o.y, ancho: o.width || 0, alto: o.height || 0, props: propiedadesDe(o),
        puntos: (o.polyline || []).map(p => ({ x: o.x + p.x, y: o.y + p.y }))
    }));
    const deTipo = tipo => objetos.filter(o => o.tipo === tipo);
    const inicio = deTipo('inicio')[0];
    if (!inicio) throw new Error('falta el objeto "inicio"');
    return {
        anchoTiles: ancho, altoTiles: alto, tam, ancho: ancho * tam, alto: alto * tam,
        suelo: matrizDeCapa(capa('suelo'), ancho, alto),
        paredes: matrizDeCapa(capa('paredes'), ancho, alto),
        objetos, inicio: { x: inicio.x, y: inicio.y },
        muebles: deTipo('mueble'), bloqueaLuz: deTipo('bloqueaLuz'),
        revelables: deTipo('revelable'), interactuables: deTipo('interactuable'),
        ventanas: deTipo('ventana'), cortinas: deTipo('cortina'), fenomenos: deTipo('fenomeno'),
        velas: deTipo('vela'), ollas: deTipo('olla'), cuerdas: deTipo('cuerda')
    };
}

// Baldosas sólidas (paredes) y por las que se puede caminar (suelo que no es pared)
export const solidoDePared = mapa => mapa.paredes.map(fila => fila.map(g => g !== 0));
export const caminableDeSuelo = mapa => mapa.suelo.map((fila, r) => fila.map((g, c) => g !== 0 && mapa.paredes[r][c] === 0));

// Cubre las baldosas sólidas con rectángulos que no se superponen (en unidades de baldosa: { c, r, ancho, alto }).
// Unir las baldosas en rectángulos grandes evita que el inspector se "enganche" en las juntas al deslizarse por una pared.
export function rectangulosDeTiles(solido) {
    const resultado = [];
    let abiertos = new Map();
    for (let r = 0; r < solido.length; r++) {
        const siguientes = new Map();
        let c = 0;
        while (c < solido[r].length) {
            if (!solido[r][c]) { c++; continue; }
            const desde = c;
            while (c < solido[r].length && solido[r][c]) c++;
            const clave = `${desde},${c - 1}`;
            const previo = abiertos.get(clave);
            if (previo) {
                previo.alto++;
                siguientes.set(clave, previo);
            } else {
                const rect = { c: desde, r, ancho: c - desde, alto: 1 };
                resultado.push(rect);
                siguientes.set(clave, rect);
            }
        }
        abiertos = siguientes;
    }
    return resultado;
}

// Segmentos de borde: los lados de las baldosas sólidas que dan a suelo caminable, unidos cuando son colineales.
// Cada uno lleva `extrusion` { dx, dy, largo }: hacia dónde (hacia dentro de la pared) se extiende la cara que se
// ve desde el suelo, para que quien dibuja ilumine también esa cara y no solo el borde.
export function segmentosDeBorde(solido, caminable, tam) {
    const lados = [
        { nombre: 'sur', dr: 1, dc: 0, horizontal: true, ext: { dx: 0, dy: -1 } },     // el suelo está debajo
        { nombre: 'norte', dr: -1, dc: 0, horizontal: true, ext: { dx: 0, dy: 1 } },    // el suelo está encima
        { nombre: 'este', dr: 0, dc: 1, horizontal: false, ext: { dx: -1, dy: 0 } },    // el suelo está a la derecha
        { nombre: 'oeste', dr: 0, dc: -1, horizontal: false, ext: { dx: 1, dy: 0 } }   // el suelo está a la izquierda
    ];
    const grupos = new Map();
    for (let r = 0; r < solido.length; r++) {
        for (let c = 0; c < solido[r].length; c++) {
            if (!solido[r][c]) continue;
            for (const lado of lados) {
                if (!caminable[r + lado.dr]?.[c + lado.dc]) continue;
                // Línea en la que está el lado, y tramo que ocupa sobre ella
                const linea = lado.horizontal ? (lado.dr === 1 ? r + 1 : r) : (lado.dc === 1 ? c + 1 : c);
                const desde = lado.horizontal ? c : r;
                // Un muro de varias baldosas de alto se ilumina entero: la cara sur se extiende por todo el apilado
                let altura = 1;
                if (lado.nombre === 'sur') while (solido[r - altura]?.[c]) altura++;
                const clave = `${lado.nombre}:${linea}:${altura}`;
                if (!grupos.has(clave)) grupos.set(clave, { lado, linea, altura, tramos: [] });
                grupos.get(clave).tramos.push(desde);
            }
        }
    }
    const segmentos = [];
    for (const { lado, linea, altura, tramos } of grupos.values()) {
        tramos.sort((p, q) => p - q);
        let inicio = tramos[0], previo = tramos[0];
        const cerrar = fin => {
            const a = inicio * tam, b = (fin + 1) * tam, l = linea * tam;
            const extrusion = { ...lado.ext, largo: tam * altura };
            segmentos.push(lado.horizontal
                ? { ax: a, ay: l, bx: b, by: l, borde: lado.nombre, extrusion }
                : { ax: l, ay: a, bx: l, by: b, borde: lado.nombre, extrusion });
        };
        for (let i = 1; i < tramos.length; i++) {
            if (tramos[i] === previo + 1) { previo = tramos[i]; continue; }
            cerrar(previo);
            inicio = previo = tramos[i];
        }
        cerrar(previo);
    }
    return segmentos;
}

// Los cuatro lados de un rectángulo (por ejemplo, un mueble alto). Solo el lado sur tiene extrusión: es la cara
// frontal que ve la cámara, de `alturaCara` píxeles de alto, hacia arriba.
export function segmentosDeRectangulo(r, { alturaCara = 0 } = {}) {
    const x0 = r.x, y0 = r.y, x1 = r.x + r.ancho, y1 = r.y + r.alto;
    return [
        { ax: x0, ay: y0, bx: x1, by: y0, borde: 'norte', extrusion: null },
        { ax: x1, ay: y0, bx: x1, by: y1, borde: 'este', extrusion: null },
        { ax: x1, ay: y1, bx: x0, by: y1, borde: 'sur', extrusion: alturaCara > 0 ? { dx: 0, dy: -1, largo: alturaCara } : null },
        { ax: x0, ay: y1, bx: x0, by: y0, borde: 'oeste', extrusion: null }
    ];
}

// Un mueble que rueda: se mueve él, el bloque de luz que lleva el mismo nombre más "-luz" (si es alto) y todo lo que está
// sobre él (las zonas para usarlo, con sus puntos de mira y de luz). Cambia el mapa; no dibuja nada.
export function desplazarMueble(mapa, nombre, dx, dy = 0) {
    const mueble = mapa.muebles.find(m => m.nombre === nombre);
    if (!mueble) throw new Error(`no hay un mueble "${nombre}"`);
    mueble.x += dx;
    mueble.y += dy;
    const luz = mapa.bloqueaLuz.find(b => b.nombre === `${nombre}-luz`);
    if (luz) { luz.x += dx; luz.y += dy; }
    for (const o of [...mapa.interactuables, ...mapa.revelables]) if (o.props.sobre === nombre) desplazarObjeto(o, dx, dy);
    return mueble;
}

// Las paredes, en píxeles (unidas en rectángulos grandes)
export function rectangulosDeParedes(mapa) {
    return rectangulosDeTiles(solidoDePared(mapa))
        .map(t => ({ x: t.c * mapa.tam, y: t.r * mapa.tam, ancho: t.ancho * mapa.tam, alto: t.alto * mapa.tam }));
}

// Todo lo que impide el paso, en píxeles: paredes (unidas en rectángulos grandes) y muebles
export function rectangulosDeColision(mapa) {
    const muebles = mapa.muebles.map(m => ({ x: m.x, y: m.y, ancho: m.ancho, alto: m.alto }));
    return [...rectangulosDeParedes(mapa), ...muebles];
}

// Todo lo que corta la luz: los bordes de las paredes y los objetos "bloqueaLuz" (muebles altos)
export function segmentosDeLuz(mapa) {
    const paredes = segmentosDeBorde(solidoDePared(mapa), caminableDeSuelo(mapa), mapa.tam);
    const altos = mapa.bloqueaLuz.flatMap(b => segmentosDeRectangulo(b, { alturaCara: b.props.alturaCara || 0 }));
    return [...paredes, ...altos];
}
