// Datos de la campaña que no dependen de Phaser: las habitaciones de la mansión, en el orden de la historia.
// Los textos de cada una viven en assets/narrativa/nivelN.json.
export const TOTAL_NIVELES = 6;

// Los títulos de las habitaciones, para el menú de niveles y el informe
export const TITULOS_DE_NIVELES = [
    'El Pasillo Oscuro',
    'El Fantasma de la Cocina',
    'La Puerta con Candado',
    'El Cuarto de los Juguetes',
    'La Sombra en la Ventana',
    'La Verdad Revelada'
];

// Las habitaciones que ya se pueden jugar (tienen mapa, reglas y módulo propio); las demás llevan a "En construcción"
export const NIVELES_JUGABLES = [1, 2, 3, 4, 5, 6];
export const esJugable = numeroDeNivel => NIVELES_JUGABLES.includes(numeroDeNivel);
