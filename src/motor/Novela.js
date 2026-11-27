// La disposición de la presentación de novela visual: el retrato de medio cuerpo a un lado y la caja grande a su lado, abajo. Sin Phaser,
// para poder probar que nunca se enciman y que nada de lo que hay que ver queda debajo. Todo en píxeles del lienzo (1280 × 720).
export const RETRATO = Object.freeze({ ancho: 360, alto: 480 });      // el tamaño EXACTO que debe tener el arte final
const MARGEN = 8;
const ALTO_DE_LA_ZONA = 262;          // la placa del nombre y la caja
const SEPARACION = 4;

// El retrato va a la izquierda, salvo que ahí esté el panel de las tarjetas con algo dentro
export function ladoDelRetrato(ladoDelPanel, hayTarjetas) {
    return hayTarjetas && ladoDelPanel === 'izquierda' ? 'derecha' : 'izquierda';
}

export function disposicionDeNovela(ancho, alto, lado = 'izquierda') {
    const izquierda = lado !== 'derecha';
    const retrato = { x: izquierda ? MARGEN : ancho - MARGEN - RETRATO.ancho, y: alto - RETRATO.alto, ancho: RETRATO.ancho, alto: RETRATO.alto };
    const libre = ancho - RETRATO.ancho - MARGEN - 2 * SEPARACION;
    const zona = { x: izquierda ? retrato.x + RETRATO.ancho + SEPARACION : SEPARACION, y: alto - ALTO_DE_LA_ZONA - SEPARACION, ancho: libre, alto: ALTO_DE_LA_ZONA };
    return { retrato, zona };
}
