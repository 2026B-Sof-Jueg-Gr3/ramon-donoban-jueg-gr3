// Visibilidad de la linterna: polígono de visibilidad, cono de luz y cuánta luz llega a un punto.
// Todo es geometría pura (sin Phaser): la presentación solo dibuja lo que se calcula aquí.
//
// Un segmento bloqueador es { ax, ay, bx, by, ...datos }; los datos extra (por ejemplo la extrusión de una cara)
// no se usan aquí: solo se devuelven por índice para que quien dibuja los consulte.
import { normalizarAngulo, diferenciaDeAngulos, distanciaASegmento, puntosDeMuestra } from './Geometria.js';

// Valores de la linterna del inspector (píxeles y radianes)
export const CONO_DE_LINTERNA = Object.freeze({
    alcance: 560,          // hasta dónde llega el cono
    semiangulo: 0.52,      // 30°: mitad del ángulo del cono; ahí la luz vale la mitad
    suavizado: 0.22,       // ≈12,6°: ancho de la transición suave a cada lado del borde
    radioHalo: 120,        // luz ambiente alrededor del inspector, en todas direcciones
    radioInterior: 18      // el cono nace a esta distancia del origen (el halo cubre el centro)
});

const EPSILON_ANGULAR = 1e-4;

// Primer segmento que corta el rayo { origen, angulo } antes de `radio`. Devuelve { distancia, segmento }
// (segmento = índice en `segmentos`, o -1 si el rayo llega libre hasta `radio`).
function lanzarRayo(origen, angulo, segmentos, indices, radio) {
    const dx = Math.cos(angulo), dy = Math.sin(angulo);
    let distancia = radio, segmento = -1;
    for (const i of indices) {
        const s = segmentos[i];
        const sx = s.bx - s.ax, sy = s.by - s.ay;
        const denominador = dx * sy - dy * sx;
        if (Math.abs(denominador) < 1e-12) continue;               // paralelo
        const qx = s.ax - origen.x, qy = s.ay - origen.y;
        const t = (qx * sy - qy * sx) / denominador;               // distancia a lo largo del rayo
        const u = (qx * dy - qy * dx) / denominador;               // posición a lo largo del segmento (0..1)
        if (t >= 0 && t < distancia && u >= -1e-9 && u <= 1 + 1e-9) { distancia = t; segmento = i; }
    }
    return { distancia, segmento };
}

export function distanciaDeRayo(origen, angulo, segmentos, radio) {
    return lanzarRayo(origen, angulo, segmentos, segmentos.map((_, i) => i), radio);
}

// Polígono de lo que se ve desde `origen` hasta `radio`. Devuelve los vértices ordenados por ángulo:
// { x, y, angulo, distancia, segmento }. Se lanzan rayos a cada extremo de segmento (un poco antes y un poco
// después, para que las sombras tengan borde recto), en pasos uniformes de `pasoBase` radianes (para aproximar
// el arco del alcance) y en los ángulos extra que pida quien llama.
export function poligonoDeVisibilidad(origen, segmentos, radio, angulosExtra = [], pasoBase = 0.05) {
    const cercanos = [];
    for (let i = 0; i < segmentos.length; i++) {
        if (distanciaASegmento(origen, segmentos[i]) <= radio) cercanos.push(i);
    }
    const angulos = [];
    for (let a = -Math.PI; a < Math.PI; a += pasoBase) angulos.push(a);
    for (const a of angulosExtra) angulos.push(normalizarAngulo(a));
    for (const i of cercanos) {
        const s = segmentos[i];
        for (const [px, py] of [[s.ax, s.ay], [s.bx, s.by]]) {
            const a = Math.atan2(py - origen.y, px - origen.x);
            angulos.push(normalizarAngulo(a - EPSILON_ANGULAR), a, normalizarAngulo(a + EPSILON_ANGULAR));
        }
    }
    angulos.sort((p, q) => p - q);

    const vertices = [];
    let previo = NaN;
    for (const angulo of angulos) {
        if (angulo - previo < 1e-9) continue;
        previo = angulo;
        const { distancia, segmento } = lanzarRayo(origen, angulo, segmentos, cercanos, radio);
        vertices.push({ x: origen.x + Math.cos(angulo) * distancia, y: origen.y + Math.sin(angulo) * distancia, angulo, distancia, segmento });
    }
    return vertices;
}

// ¿Está el punto dentro del polígono? (regla par-impar; el polígono es simple porque rodea al origen)
export function puntoEnPoligono(punto, vertices) {
    let dentro = false;
    for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
        const a = vertices[i], b = vertices[j];
        if ((a.y > punto.y) !== (b.y > punto.y) && punto.x < ((b.x - a.x) * (punto.y - a.y)) / (b.y - a.y) + a.x) dentro = !dentro;
    }
    return dentro;
}

// luz = { origen: {x, y}, direccion (rad), semiangulo, alcance }
export function puntoEnCono(punto, luz) {
    const dx = punto.x - luz.origen.x, dy = punto.y - luz.origen.y;
    const distancia = Math.hypot(dx, dy);
    if (distancia > luz.alcance) return false;
    if (distancia < 1e-9) return true;
    return Math.abs(diferenciaDeAngulos(Math.atan2(dy, dx), luz.direccion)) <= luz.semiangulo;
}

// Iluminado = dentro del cono Y visible desde la linterna (no tapado por paredes ni muebles altos).
// Con `halo` (px) también cuenta la luz ambiente que rodea al inspector en todas direcciones (CONO_DE_LINTERNA.radioHalo):
// lo que está a la vista dentro de ese radio no está a oscuras aunque el cono, tan estrecho de cerca, no lo toque.
export function estaIluminado(punto, luz, poligono, halo = 0) {
    const enElHalo = halo > 0 && Math.hypot(punto.x - luz.origen.x, punto.y - luz.origen.y) <= halo;
    return (enElHalo || puntoEnCono(punto, luz)) && puntoEnPoligono(punto, poligono);
}

// ¿El cono ilumina alguna parte del rectángulo? (se prueban nueve puntos del rectángulo)
export function rectanguloIluminado(rectangulo, luz, poligono, margen = 4) {
    return puntosDeMuestra(rectangulo, margen).some(p => estaIluminado(p, luz, poligono));
}

// ¿El cono ilumina alguna parte de la zona? A diferencia de rectanguloIluminado (nueve puntos), prueba una rejilla fina
// (un punto cada `paso` px): cerca de una pared o de un mueble el cono es muy estrecho (a 20 px apenas cubre 25 px de ancho)
// y una zona delgada podría quedar entre dos puntos aunque la luz la toque. `halo`: ver estaIluminado.
export function zonaIluminada(zona, luz, poligono, paso = 4, halo = 0) {
    const nx = Math.max(1, Math.ceil(zona.ancho / paso)), ny = Math.max(1, Math.ceil(zona.alto / paso));
    for (let j = 0; j <= ny; j++) {
        for (let i = 0; i <= nx; i++) {
            if (estaIluminado({ x: zona.x + (zona.ancho * i) / nx, y: zona.y + (zona.alto * j) / ny }, luz, poligono, halo)) return true;
        }
    }
    return false;
}

// Transición suave del borde del cono: 1 en el centro, 0,5 justo en el borde (|delta| = semiangulo), 0 fuera
export function factorAngular(delta, semiangulo, suavizado) {
    const a = Math.abs(delta);
    if (a <= semiangulo - suavizado) return 1;
    if (a >= semiangulo + suavizado) return 0;
    const t = (semiangulo + suavizado - a) / (2 * suavizado);
    return t * t * (3 - 2 * t);
}

// Caída de la intensidad con la distancia: 1 junto a la linterna, 0 en el alcance
export function caidaDeLuz(distancia, alcance) {
    if (distancia >= alcance) return 0;
    return Math.pow(1 - Math.max(0, distancia) / alcance, 1.1);
}

// Intensidad del cono (sin contar sombras) a una distancia y con una desviación respecto a la dirección
export function intensidadDeCono(distancia, delta, luz) {
    return factorAngular(delta, luz.semiangulo, luz.suavizado) * caidaDeLuz(distancia, luz.alcance);
}
