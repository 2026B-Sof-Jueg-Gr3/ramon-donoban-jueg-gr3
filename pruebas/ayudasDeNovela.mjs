// ¿Se enciman dos rectángulos { x, y, ancho, alto }? (tocarse por el borde no cuenta)
export const rectangulosSeSolapan = (a, b) => a.x < b.x + b.ancho && b.x < a.x + a.ancho && a.y < b.y + b.alto && b.y < a.y + a.alto;
