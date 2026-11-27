// Tiempos de la presentación narrativa. Es el único lugar donde se definen.
// Son independientes del movimiento: ningún paso, empujón o deshacer los acorta ni los reinicia,
// y tampoco dependen de los tiempos de las marcas (src/presentacion/configuracion.js).
export const LECTURA = Object.freeze({
    escrituraPorLetraMs: 16,      // velocidad de la escritura letra a letra (libreta)
    escrituraDialogoPorLetraMs: 22,
    lecturaMinimaMs: 2500,        // tiempo mínimo para leer un texto ya escrito
    lecturaPorLetraMs: 55,        // ~18 letras por segundo
    causaAntesDeConsecuenciaMs: 1200,   // desde que la tarjeta o nota ya se ve hasta la revelación del mismo suceso
    esperaMaximaDeLaCausaMs: 8000,      // tope: si la causa no llega a verse, la revelación sale igual
    maximoAmbientales: 3,         // textos ambientales visibles a la vez; el resto espera en su cola
    caracteresPorPaginaDeNotas: 420
});

// Tiempo de lectura de un texto que se cierra solo (secundarios y ambientales), contado desde que
// terminó de escribirse (o de aparecer). Los acontecimientos importantes no tienen: esperan al jugador.
export function tiempoDeLectura(texto) {
    return Math.max(LECTURA.lecturaMinimaMs, (texto || '').length * LECTURA.lecturaPorLetraMs);
}
