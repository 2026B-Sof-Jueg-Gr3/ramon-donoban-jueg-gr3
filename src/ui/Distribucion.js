// Distribución estable de la pantalla de juego en zonas que no se superponen:
//   HUD (arriba) · panel de investigación · zona del tablero · zona de controles (abajo)
// Se calcula solo al cargar el nivel y al cambiar el tamaño de la ventana: mostrar u ocultar textos
// narrativos nunca cambia la escala ni la posición del tablero. La narrativa nunca se dibuja sobre la zona
// del tablero (la escena además recorta el tablero a su zona).
//
//   lateral (pantallas apaisadas anchas): el panel es una columna fija a la derecha del tablero
//   franja  (vertical o estrechas):       el panel es una franja de alto fijo bajo el HUD; si su contenido
//                                          no cabe, se desplaza dentro del panel (nunca se recorta)
export const DISTRIBUCION = Object.freeze({
    altoHud: 64,
    margen: 12,
    anchoMinimoLateral: 700,
    panelLateral: Object.freeze({ proporcion: 0.27, minimo: 240, maximo: 340 }),
    franja: Object.freeze({ proporcion: 0.2, minimo: 92, maximo: 140 }),
    lado: 60,
    escalaMinima: 0.5,        // casillas de 30 px como mínimo; si el tablero no cabe, la cámara sigue al inspector
    escalaMaxima: 1.6
});

const limitar = (v, min, max) => Math.min(max, Math.max(min, v));

export function calcularDistribucion(ancho, alto, columnas, filas, altoControles) {
    const D = DISTRIBUCION;
    const m = D.margen;
    const util = { y: D.altoHud, alto: Math.max(0, alto - D.altoHud - altoControles) };
    const modo = ancho > alto && ancho >= D.anchoMinimoLateral ? 'lateral' : 'franja';
    let panel, tablero;
    if (modo === 'lateral') {
        const anchoPanel = Math.round(limitar(ancho * D.panelLateral.proporcion, D.panelLateral.minimo, D.panelLateral.maximo));
        panel = { x: ancho - anchoPanel - m, y: util.y + m, ancho: anchoPanel, alto: Math.max(0, util.alto - 2 * m) };
        tablero = { x: m, y: util.y + m / 2, ancho: Math.max(0, ancho - anchoPanel - 3 * m), alto: Math.max(0, util.alto - m) };
    } else {
        const altoPanel = Math.round(limitar(util.alto * D.franja.proporcion, D.franja.minimo, D.franja.maximo));
        panel = { x: m, y: util.y + 6, ancho: Math.max(0, ancho - 2 * m), alto: altoPanel };
        const arriba = panel.y + panel.alto + 6;
        tablero = { x: m, y: arriba, ancho: Math.max(0, ancho - 2 * m), alto: Math.max(0, alto - altoControles - arriba - 4) };
    }
    const anchoTablero = columnas * D.lado, altoTablero = filas * D.lado;
    const escala = Math.max(D.escalaMinima, Math.min(tablero.ancho / anchoTablero, tablero.alto / altoTablero, D.escalaMaxima));
    return {
        modo,
        hud: { x: 0, y: 0, ancho, alto: D.altoHud },
        panel,
        tablero,
        controles: { x: 0, y: alto - altoControles, ancho, alto: altoControles },
        escala
    };
}

// true si dos rectángulos {x, y, ancho, alto} se superponen
export function seSuperponen(a, b) {
    return a.x < b.x + b.ancho && b.x < a.x + a.ancho && a.y < b.y + b.alto && b.y < a.y + a.alto;
}
