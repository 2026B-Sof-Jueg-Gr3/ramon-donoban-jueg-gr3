// La maquetación de TODAS las pantallas de interfaz. Sin Phaser: recibe bloques con su alto real (medido después de
// partir el texto en líneas) y devuelve dónde va cada uno. Ninguna pantalla usa posiciones verticales fijas.
//
// La regla (DISENO_V2.md, "Reglas de interfaz"):
//   · Cada bloque se coloca debajo del anterior según su alto real.
//   · Arriba van la cabecera, la pregunta y la conclusión; abajo, los botones y la ayuda de teclas: siempre visibles.
//   · Lo que puede crecer (pruebas, hallazgos, pistas, opciones, textos largos) va en una zona con desplazamiento.
//   · Nada se encima y nada sale de su recuadro.
//
// Un rectángulo es { x, y, ancho, alto }. Un bloque es { id, alto, ancho?, alinear?, antes? }:
//   ancho   si falta, el de todo el recuadro interior
//   alinear 'izquierda' (por defecto) | 'centro' | 'derecha'
//   antes   espacio extra por encima de este bloque (además del hueco normal)
//   cede    (solo en la cabecera) puede pasar a la zona con desplazamiento si la cabecera se come el espacio

export const MARGEN_POR_DEFECTO = Object.freeze({ x: 40, y: 24 });
export const HUECO_POR_DEFECTO = 12;
export const MINIMO_DE_CUERPO = 120;           // alto mínimo que tiene que quedarle a la zona del cuerpo
export const TOLERANCIA = 1;                   // píxeles de margen para decidir si algo se encima o se sale

// ── Colocar bloques ─────────────────────────────────────────────────────────

// Bloques uno debajo de otro. x, y: esquina superior izquierda de la pila · ancho: el ancho disponible.
// Devuelve { colocados: [{ id, x, y, ancho, alto }], alto } (alto = lo que mide toda la pila).
export function apilar(bloques, { x = 0, y = 0, ancho = 0, hueco = HUECO_POR_DEFECTO } = {}) {
    const colocados = [];
    let cursor = y;
    bloques.forEach((b, i) => {
        if (i > 0) cursor += hueco;
        cursor += b.antes ?? 0;
        const w = b.ancho ?? ancho;
        const dx = b.alinear === 'centro' ? (ancho - w) / 2 : b.alinear === 'derecha' ? ancho - w : 0;
        colocados.push({ id: b.id, x: x + dx, y: cursor, ancho: w, alto: b.alto });
        cursor += b.alto;
    });
    return { colocados, alto: bloques.length ? cursor - y : 0 };
}

// Bloques de izquierda a derecha, pasando a la fila siguiente cuando no caben, y cada fila centrada (los botones y las
// rejillas). Cada bloque trae su ancho. Devuelve { colocados, alto, filas }.
export function repartirEnFilas(bloques, { x = 0, y = 0, ancho = 0, hueco = HUECO_POR_DEFECTO, huecoVertical = hueco } = {}) {
    const filas = [[]];
    let usado = 0;
    for (const b of bloques) {
        const fila = filas[filas.length - 1];
        const necesario = (fila.length ? hueco : 0) + b.ancho;
        if (fila.length && usado + necesario > ancho + 1e-6) {
            filas.push([b]);
            usado = b.ancho;
        } else {
            fila.push(b);
            usado += necesario;
        }
    }
    const colocados = [];
    let cursor = y;
    filas.forEach((fila, i) => {
        if (!fila.length) return;
        if (i > 0) cursor += huecoVertical;
        const total = fila.reduce((s, b) => s + b.ancho, 0) + hueco * (fila.length - 1);
        const altoDeFila = Math.max(...fila.map(b => b.alto));
        let cx = x + (ancho - total) / 2;
        for (const b of fila) {
            colocados.push({ id: b.id, x: cx, y: cursor + (altoDeFila - b.alto) / 2, ancho: b.ancho, alto: b.alto });
            cx += b.ancho + hueco;
        }
        cursor += altoDeFila;
    });
    return { colocados, alto: cursor - y, filas: filas.filter(f => f.length).length };
}

// Una pantalla entera dentro de un recuadro: cabecera arriba, pie abajo y, en medio, la zona del cuerpo.
//   caja     el recuadro de la pantalla · margen { x, y } interior · hueco entre bloques
//   cabecera, cuerpo, pie   listas de bloques
//   ranura   ancho que se reserva a la derecha de la zona del cuerpo para los indicadores ▲ ▼ (0 si caben en el margen)
//   centrarCuerpo   si el cuerpo cabe, va en medio de su zona en vez de pegado arriba
// Devuelve:
//   colocados   { id: { x, y, ancho, alto } } de la cabecera y el pie, en coordenadas de pantalla
//   cuerpo      { id: { x, y, ancho, alto } } en coordenadas de la zona (0, 0 es su esquina superior izquierda)
//   zona        { x, y, ancho, alto, contenido, desplazable, maximo }: el espacio visible del cuerpo
//   movidos     los ids de la cabecera que pasaron a la zona con desplazamiento
//   ok          false si ni siquiera caben la cabecera y el pie
export function maquetarPantalla({
    caja, margen = MARGEN_POR_DEFECTO, hueco = HUECO_POR_DEFECTO, cabecera = [], cuerpo = [], pie = [],
    minimoCuerpo = MINIMO_DE_CUERPO, ranura = 0, centrarCuerpo = false
}) {
    const interior = { x: caja.x + margen.x, y: caja.y + margen.y, ancho: caja.ancho - 2 * margen.x, alto: caja.alto - 2 * margen.y };
    const colocarArriba = lista => apilar(lista, { x: interior.x, y: interior.y, ancho: interior.ancho, hueco });
    const colocarAbajo = lista => {
        const { alto } = apilar(lista, { ancho: interior.ancho, hueco });
        return { ...apilar(lista, { x: interior.x, y: interior.y + interior.alto - alto, ancho: interior.ancho, hueco }), alto };
    };
    let arriba = cabecera, dentro = cuerpo;
    let altoArriba = colocarArriba(arriba).alto;
    const altoPie = colocarAbajo(pie).alto;
    const espacio = () => interior.alto - altoArriba - altoPie - (arriba.length ? hueco : 0) - (pie.length ? hueco : 0);
    // Una cabecera enorme (la pregunta más larga) deja de comerse la pantalla: sus bloques "cede" pasan al cuerpo
    const movidos = [];
    if (espacio() < minimoCuerpo && arriba.some(b => b.cede)) {
        movidos.push(...arriba.filter(b => b.cede).map(b => b.id));
        dentro = [...arriba.filter(b => b.cede).map(b => ({ ...b, cede: undefined })), ...cuerpo];
        arriba = arriba.filter(b => !b.cede);
        altoArriba = colocarArriba(arriba).alto;
    }
    const cab = colocarArriba(arriba), p = colocarAbajo(pie);
    const colocados = {};
    for (const c of [...cab.colocados, ...p.colocados]) colocados[c.id] = { x: c.x, y: c.y, ancho: c.ancho, alto: c.alto };
    const alto = Math.max(0, espacio());
    const zona = {
        x: interior.x,
        y: interior.y + altoArriba + (arriba.length ? hueco : 0),
        ancho: interior.ancho - ranura,
        alto
    };
    const pila = apilar(dentro, { ancho: zona.ancho, hueco });
    zona.contenido = pila.alto;
    zona.maximo = Math.max(0, pila.alto - alto);
    zona.desplazable = zona.maximo > TOLERANCIA;
    // Un cuerpo corto (un mensaje y poco más) puede ir en medio de la zona; uno que no cabe siempre empieza arriba
    const desfase = centrarCuerpo && !zona.desplazable ? Math.max(0, (alto - pila.alto) / 2) : 0;
    const enCuerpo = {};
    for (const c of pila.colocados) enCuerpo[c.id] = { x: c.x, y: c.y + desfase, ancho: c.ancho, alto: c.alto };
    return { colocados, cuerpo: enCuerpo, zona, movidos, ok: alto > 0 && espacio() >= 0 };
}

// ── La caja de los importantes ──────────────────────────────────────────────

// Dónde va la caja de los importantes: abajo, salvo que el inspector esté en esa parte de la pantalla (entonces, arriba).
// Si queda a la altura del panel de tarjetas y este está a la vista, la caja se queda en el lado libre: nunca se encima.
//   pantalla { ancho, alto } · caja { alto, margen } · panel { x, y, ancho, alto, visible } · lado del panel · jugadorY en la pantalla
export function ubicarCaja(pantalla, caja, panel, lado, jugadorY) {
    const abajo = jugadorY < pantalla.alto * 0.55;
    const y = abajo ? pantalla.alto - caja.margen - caja.alto : caja.margen;
    let x = 0, ancho = pantalla.ancho;
    const aLaAltura = panel.visible && panel.alto > 0 && y < panel.y + panel.alto + 8 && y + caja.alto > panel.y;
    if (aLaAltura) {
        if (lado === 'derecha') ancho = panel.x - 12;
        else { x = panel.x + panel.ancho + 12; ancho = pantalla.ancho - x; }
    }
    return { x, y, ancho, alto: caja.alto };
}

// ── Desplazamiento ──────────────────────────────────────────────────────────

export function limitarDesplazamiento(valor, contenido, visible) {
    return Math.min(Math.max(0, contenido - visible), Math.max(0, valor));
}

// El desplazamiento mínimo para que un elemento (y, alto: en coordenadas del contenido) se vea ENTERO. Si es más alto que
// la zona, se ve su parte de arriba. holgura: píxeles de aire que se dejan por encima y por debajo.
export function desplazamientoParaVer(actual, visible, contenido, { y, alto }, holgura = 6) {
    let valor = actual;
    if (alto + 2 * holgura > visible) valor = y - holgura;
    else if (y - holgura < actual) valor = y - holgura;
    else if (y + alto + holgura > actual + visible) valor = y + alto + holgura - visible;
    return limitarDesplazamiento(valor, contenido, visible);
}

// ¿Hay más contenido por encima o por debajo de lo que se ve?
export function indicadores(desplazamiento, contenido, visible) {
    const maximo = Math.max(0, contenido - visible);
    return { arriba: maximo > TOLERANCIA && desplazamiento > TOLERANCIA, abajo: maximo > TOLERANCIA && desplazamiento < maximo - TOLERANCIA };
}

// ¿Se ve (aunque sea en parte) un elemento del contenido? Los que quedan del todo fuera no deben recibir clics.
export function visibleEnLaZona(desplazamiento, visible, { y, alto }) {
    return y + alto > desplazamiento && y < desplazamiento + visible;
}

// ── Comprobación ────────────────────────────────────────────────────────────

export function solapan(a, b, tolerancia = TOLERANCIA) {
    return a.x < b.x + b.ancho - tolerancia && a.x + a.ancho > b.x + tolerancia && a.y < b.y + b.alto - tolerancia && a.y + a.alto > b.y + tolerancia;
}

export function contiene(caja, r, tolerancia = TOLERANCIA) {
    return r.x >= caja.x - tolerancia && r.y >= caja.y - tolerancia && r.x + r.ancho <= caja.x + caja.ancho + tolerancia && r.y + r.alto <= caja.y + caja.alto + tolerancia;
}

export function interseccion(a, b) {
    const x = Math.max(a.x, b.x), y = Math.max(a.y, b.y);
    const x2 = Math.min(a.x + a.ancho, b.x + b.ancho), y2 = Math.min(a.y + a.alto, b.y + b.alto);
    return x2 > x && y2 > y ? { x, y, ancho: x2 - x, alto: y2 - y } : null;
}

// Revisa los elementos de una pantalla y devuelve los problemas ([] si no hay ninguno). Cada elemento:
//   { id, rect, tipo: 'contenido' | 'control', grupo?, dentroDe? }
//   contenido  un texto o una imagen · control  el fondo de un botón, una fila o una tarjeta (lo suyo va dentro de él)
//   grupo      lo que pertenece a un mismo control (su fondo y sus textos) comparte grupo
//   dentroDe   el recuadro del que no puede salirse (además de la pantalla)
// Problemas: { tipo: 'solape', a, b, rect } · { tipo: 'fuera', a, caja }
export function encontrarProblemas(elementos, pantalla) {
    const problemas = [];
    const reales = elementos.filter(e => e.rect && e.rect.ancho > 0 && e.rect.alto > 0);
    const controles = new Map(reales.filter(e => e.tipo === 'control' && e.grupo !== undefined).map(e => [e.grupo, e]));
    for (const e of reales) {
        const suyo = e.tipo === 'contenido' && e.grupo !== undefined ? controles.get(e.grupo) : null;
        if (pantalla && !contiene(pantalla, e.rect)) problemas.push({ tipo: 'fuera', a: e.id, caja: pantalla });
        else if (e.dentroDe && !contiene(e.dentroDe, e.rect)) problemas.push({ tipo: 'fuera', a: e.id, caja: e.dentroDe });
        else if (suyo && !contiene(suyo.rect, e.rect)) problemas.push({ tipo: 'fuera', a: e.id, caja: suyo.rect });   // lo suyo, dentro de su fondo
    }
    for (let i = 0; i < reales.length; i++) {
        for (let j = i + 1; j < reales.length; j++) {
            const a = reales[i], b = reales[j];
            // El fondo de un control y lo suyo se superponen a propósito (y lo suyo ya se comprobó que cabe dentro)
            if (a.grupo !== undefined && a.grupo === b.grupo && (a.tipo === 'control' || b.tipo === 'control')) continue;
            if (!solapan(a.rect, b.rect)) continue;
            problemas.push({ tipo: 'solape', a: a.id, b: b.id, rect: interseccion(a.rect, b.rect) });
        }
    }
    return problemas;
}
