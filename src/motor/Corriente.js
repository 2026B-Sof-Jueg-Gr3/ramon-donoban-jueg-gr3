// La corriente de aire que entra por la ventana rota. Sin Phaser.
// El polvo que flota en el haz de la linterna deriva hacia su origen: seguirlo lleva a la ventana.
// `fuerza` sube de 1 cuando la ayuda refuerza la pista.
export const CORRIENTE = Object.freeze({
    base: 14,         // px/s lejos del origen
    extra: 30,        // px/s más cuanto más cerca del origen
    alcance: 900      // a partir de esta distancia ya no se nota el efecto de cercanía
});

// Velocidad (px/s) que la corriente le da a una partícula en `punto`
export function velocidadDeCorriente(punto, origen, { fuerza = 1, base = CORRIENTE.base, extra = CORRIENTE.extra, alcance = CORRIENTE.alcance } = {}) {
    const dx = origen.x - punto.x, dy = origen.y - punto.y;
    const distancia = Math.hypot(dx, dy);
    if (distancia < 1e-6) return { x: 0, y: 0 };
    const cercania = Math.max(0, 1 - distancia / alcance);
    const rapidez = (base + extra * cercania) * fuerza;
    return { x: (dx / distancia) * rapidez, y: (dy / distancia) * rapidez };
}
