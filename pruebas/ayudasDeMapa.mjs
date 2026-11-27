// Ayudantes para probar un mapa real sin Phaser: a dónde llega el inspector y con qué luz usaría cada cosa.
import { readFileSync } from 'node:fs';
import { leerMapaTiled, rectangulosDeColision, segmentosDeLuz } from '../src/motor/Mapa.js';
import { poligonoDeVisibilidad, zonaIluminada, CONO_DE_LINTERNA } from '../src/motor/Visibilidad.js';
import { zonaDeAccion, alcanceDeAccion } from '../src/motor/Alcance.js';
import { distanciaARectangulo } from '../src/motor/Geometria.js';

export const RAIZ = new URL('../', import.meta.url);
export const leerJson = ruta => JSON.parse(readFileSync(new URL(ruta, RAIZ), 'utf8'));
export const copia = o => JSON.parse(JSON.stringify(o));
export const CUERPO = { ancho: 26, alto: 18 };               // la base del inspector (su cuerpo de física)
export const solapan = (a, b) => a.x < b.x + b.ancho && a.x + a.ancho > b.x && a.y < b.y + b.alto && a.y + a.alto > b.y;
export const cargarMapa = n => leerMapaTiled(leerJson(`assets/mapas/nivel${n}.json`));

// Todas las posiciones (pies) a las que llega el inspector, cada 16 px, por búsqueda desde la salida
export function posicionesAlcanzables(mapa, paso = 16) {
    const colisiones = rectangulosDeColision(mapa);
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
    return [...visitado].map(k => k.split(',').map(Number));
}

// Todo lo que se puede usar con E: lo que el mapa señala y las marcas que además se pueden examinar
export const accionables = mapa => [...mapa.interactuables, ...mapa.revelables.filter(o => o.props.accion)];

// La luz como la escena: nace en el centro del cuerpo, 8 px por delante de donde mira el inspector
export function luzDesde(pies, direccion) {
    const origen = { x: pies.x + Math.cos(direccion) * 8, y: pies.y - CUERPO.alto / 2 + Math.sin(direccion) * 8 };
    return { origen, direccion, semiangulo: CONO_DE_LINTERNA.semiangulo, alcance: CONO_DE_LINTERNA.alcance };
}

// ¿Puede usar esa zona alguien con los pies en `pies`, mirando hacia `direccion`, con la linterna real?
export function intento(mapa, pies, direccion, zona, segmentos = segmentosDeLuz(mapa)) {
    const luz = luzDesde(pies, direccion), poligono = poligonoDeVisibilidad(luz.origen, segmentos, luz.alcance);
    return alcanceDeAccion(pies, direccion, zona, () => zonaIluminada(zona.luz, luz, poligono, 4, CONO_DE_LINTERNA.radioHalo));
}

export const hacia = (desde, a) => Math.atan2(a.y - desde.y, a.x - desde.x);
export const centroDe = r => ({ x: r.x + r.ancho / 2, y: r.y + r.alto / 2 });
export { zonaDeAccion, distanciaARectangulo, segmentosDeLuz };
