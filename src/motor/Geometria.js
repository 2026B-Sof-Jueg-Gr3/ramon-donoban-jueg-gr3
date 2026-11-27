// Geometría 2D sin dependencias de Phaser. Un rectángulo es { x, y, ancho, alto } (esquina superior izquierda, y hacia abajo).
export const DOS_PI = Math.PI * 2;

// Devuelve un ángulo equivalente dentro de [-π, π)
export function normalizarAngulo(angulo) {
    return (((angulo + Math.PI) % DOS_PI) + DOS_PI) % DOS_PI - Math.PI;
}

// Diferencia más corta entre dos ángulos (a - b), dentro de [-π, π)
export const diferenciaDeAngulos = (a, b) => normalizarAngulo(a - b);

// Distancia de un punto a un rectángulo (0 si está dentro o en el borde)
export function distanciaARectangulo(punto, r) {
    const dx = Math.max(r.x - punto.x, 0, punto.x - (r.x + r.ancho));
    const dy = Math.max(r.y - punto.y, 0, punto.y - (r.y + r.alto));
    return Math.hypot(dx, dy);
}

// Distancia de un punto a un segmento { ax, ay, bx, by }
export function distanciaASegmento(punto, s) {
    const sx = s.bx - s.ax, sy = s.by - s.ay;
    const largo2 = sx * sx + sy * sy;
    const t = largo2 === 0 ? 0 : Math.max(0, Math.min(1, ((punto.x - s.ax) * sx + (punto.y - s.ay) * sy) / largo2));
    return Math.hypot(punto.x - (s.ax + t * sx), punto.y - (s.ay + t * sy));
}

// Nueve puntos de un rectángulo (centro, esquinas y mitad de cada lado), metidos hacia dentro `margen` píxeles.
// Sirven para decidir si algo "toca" una zona sin exigir que el centro quede dentro.
export function puntosDeMuestra(r, margen = 4) {
    const m = Math.min(margen, r.ancho / 2, r.alto / 2);
    const xs = [r.x + m, r.x + r.ancho / 2, r.x + r.ancho - m];
    const ys = [r.y + m, r.y + r.alto / 2, r.y + r.alto - m];
    const puntos = [];
    for (const y of ys) for (const x of xs) puntos.push({ x, y });
    return puntos;
}
