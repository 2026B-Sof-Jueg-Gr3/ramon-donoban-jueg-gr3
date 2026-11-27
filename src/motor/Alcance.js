// El perímetro cercano de las acciones: cuándo el inspector puede usar algo (y cuándo aparece el ícono E). Sin Phaser.
//
// Para que una acción sea posible se cumplen TRES condiciones a la vez:
//   1. CERCA:    los pies del inspector están como máximo a `distancia` px de la zona del objeto. Hay un solo valor general
//                (ALCANCE_DE_ACCION); cada objeto puede bajarlo (propiedad `distancia` del mapa) pero nunca superarlo.
//   2. DE FRENTE: la dirección hacia la que mira el inspector (la de la linterna) apunta al objeto, dentro de ±60°.
//   3. CON LUZ:  el cono ilumina alguna parte del objeto (lo decide quien llama, con src/motor/Visibilidad.js).
// Así el ícono nunca aparece sobre algo que el jugador no ve ni sobre algo que tiene a la espalda.
//
// Las propiedades de un objeto del mapa que afectan al alcance (todas opcionales):
//   distancia  px, como máximo ALCANCE_DE_ACCION (0 = hay que estar dentro de su zona)
//   sobre      nombre de un mueble: el objeto está sobre él, así que se usa desde el mueble (su huella)
//   mira       "x,y": el punto al que hay que mirar (por ejemplo, la ventana desde su franja)
//   luz        "x,y,ancho,alto": la zona que tiene que tocar la luz (por ejemplo, el suelo justo delante de una pared)
import { distanciaARectangulo, diferenciaDeAngulos } from './Geometria.js';

export const ALCANCE_DE_ACCION = 40;                 // px desde los pies hasta la zona del objeto
export const SEMIANGULO_DE_FRENTE = Math.PI / 3;     // ±60°
const MUY_CERCA = 6;                                 // por debajo de esto, "mirar hacia un punto" no tiene dirección

const rectangulo = o => ({ x: o.x, y: o.y, ancho: o.ancho, alto: o.alto });

function numeros(texto, cuantos, nombre) {
    if (texto === undefined || texto === null || texto === '') return null;
    const valores = String(texto).split(',').map(t => Number(t.trim()));
    if (valores.length !== cuantos || valores.some(v => !Number.isFinite(v))) throw new Error(`la propiedad "${nombre}" debe ser ${cuantos} números separados por comas: "${texto}"`);
    return valores;
}

// Desplaza un objeto del mapa (y los puntos que lleva en sus propiedades "mira" y "luz") para cuando el mueble sobre el que
// está se mueve: una alacena que rueda arrastra su zona de uso con ella.
export function desplazarObjeto(objeto, dx, dy = 0) {
    objeto.x += dx;
    objeto.y += dy;
    const p = objeto.props || {};
    if (p.mira) { const [x, y] = numeros(p.mira, 2, 'mira'); p.mira = `${x + dx},${y + dy}`; }
    if (p.luz) { const [x, y, w, h] = numeros(p.luz, 4, 'luz'); p.luz = `${x + dx},${y + dy},${w},${h}`; }
}

// Zona de alcance de un objeto del mapa ({ x, y, ancho, alto, props }): lo que necesita alcanceDeAccion.
// muebles: los muebles del mapa (para los objetos que están sobre uno)
export function zonaDeAccion(objeto, muebles = [], { alcance = ALCANCE_DE_ACCION } = {}) {
    const p = objeto.props || {};
    const mueble = p.sobre ? muebles.find(m => m.nombre === p.sobre) : null;
    if (p.sobre && !mueble) throw new Error(`${objeto.nombre}: el mueble "${p.sobre}" no existe`);
    const mira = numeros(p.mira, 2, 'mira'), luz = numeros(p.luz, 4, 'luz');
    return {
        objeto,
        huella: rectangulo(mueble || objeto),
        distancia: Math.max(0, Math.min(Number.isFinite(p.distancia) ? p.distancia : alcance, alcance)),
        mira: mira ? { x: mira[0], y: mira[1] } : null,
        luz: luz ? { x: luz[0], y: luz[1], ancho: luz[2], alto: luz[3] } : rectangulo(objeto)
    };
}

// Hacia dónde hay que mirar para "mirar al objeto": su punto de mira si lo tiene; si no, el punto de su zona más cercano a
// los pies; y si los pies están sobre la zona, su centro. null = no hay dirección que exigir (se está encima).
function puntoDeMira(pies, zona) {
    const lejos = p => Math.hypot(p.x - pies.x, p.y - pies.y) >= MUY_CERCA;
    if (zona.mira) return lejos(zona.mira) ? zona.mira : null;
    const r = zona.huella;
    const cercano = { x: Math.max(r.x, Math.min(pies.x, r.x + r.ancho)), y: Math.max(r.y, Math.min(pies.y, r.y + r.alto)) };
    if (lejos(cercano)) return cercano;
    const centro = { x: r.x + r.ancho / 2, y: r.y + r.alto / 2 };
    return lejos(centro) ? centro : null;
}

// pies: { x, y } · direccion: radianes (hacia donde mira y apunta la linterna) · zona: de zonaDeAccion
// iluminado: ¿el cono toca el objeto? (boolean, o una función que se llama solo si las otras dos condiciones se cumplen)
// Devuelve { posible, razon, distancia, desvio }: razon es null si es posible, o 'lejos' | 'de-espaldas' | 'a-oscuras'.
export function alcanceDeAccion(pies, direccion, zona, iluminado, { semiangulo = SEMIANGULO_DE_FRENTE } = {}) {
    const distancia = distanciaARectangulo(pies, zona.huella);
    const objetivo = puntoDeMira(pies, zona);
    const desvio = objetivo ? Math.abs(diferenciaDeAngulos(Math.atan2(objetivo.y - pies.y, objetivo.x - pies.x), direccion)) : 0;
    let razon = null;
    if (distancia > zona.distancia + 1e-9) razon = 'lejos';
    else if (desvio > semiangulo + 1e-9) razon = 'de-espaldas';
    else if (!(typeof iluminado === 'function' ? iluminado(zona) : iluminado)) razon = 'a-oscuras';
    return { posible: razon === null, razon, distancia, desvio };
}

// De varias zonas posibles, la que se usaría: gana la más cercana (y, a igual distancia, la que está más de frente).
// iluminadoDe(zona): ¿el cono toca esa zona? Devuelve { zona, distancia, desvio } o null si ninguna es posible.
export function elegirAccion(pies, direccion, zonas, iluminadoDe, ajustes) {
    let mejor = null;
    for (const zona of zonas) {
        const r = alcanceDeAccion(pies, direccion, zona, () => iluminadoDe(zona), ajustes);
        if (!r.posible) continue;
        if (!mejor || r.distancia < mejor.distancia - 1e-9 || (Math.abs(r.distancia - mejor.distancia) <= 1e-9 && r.desvio < mejor.desvio)) {
            mejor = { zona, distancia: r.distancia, desvio: r.desvio };
        }
    }
    return mejor;
}
