// El verbo que acompaña a la tecla E sobre lo que se puede usar ("E  Examinar", "E  Mirar detrás"…), como los avisos de acción de
// los juegos de consola: así nunca hay que adivinar qué hace la tecla. Sin Phaser.
// Las acciones son las de los mapas (assets/mapas, propiedad "accion") y las de src/escenas/Habitacion.js (SUCESO_DE_ACCION).
export const VERBOS = Object.freeze({
    examinar: 'Examinar',
    'mirar-detras': 'Mirar detrás',
    'mirar-debajo': 'Mirar debajo',
    recoger: 'Recoger',
    rodar: 'Rodar',
    tirar: 'Tirar',
    cortar: 'Cortar',
    ordenar: 'Ordenar',
    cerrar: 'Cerrar',
    apagar: 'Apagar',
    abrir: 'Abrir'
});
export const VERBO_POR_DEFECTO = 'Usar';

export function verboDeAccion(accion) {
    return Object.hasOwn(VERBOS, accion) ? VERBOS[accion] : VERBO_POR_DEFECTO;
}
