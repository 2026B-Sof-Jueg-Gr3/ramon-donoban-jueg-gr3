// La música de fondo: qué canción suena en cada parte del juego. Sin Phaser.
// Solo música de fondo, sin efectos de sonido. Los archivos están en assets/musica/ y assets/musica/lista.json dice cuál suena dónde.
export const EXTENSIONES = ['mp3', 'ogg', 'm4a', 'wav'];
export const PARTES = ['inicio', 'nivel1', 'nivel2', 'nivel3', 'nivel4', 'nivel5', 'nivel6', 'final'];
export const VOLUMEN = 0.18;          // se oye como el 60 % del volumen inicial (0,45): el oído no sigue el número, por eso baja tanto
export const FUNDIDO_MS = 900;
export const CLAVE_DE_SILENCIO = 'inspector-logica-v2-musica-silenciada';

// Las partes de la lista con un archivo válido: { parte: archivo }
export function pistasValidas(lista) {
    const pistas = lista?.pistas && typeof lista.pistas === 'object' ? lista.pistas : {};
    const validas = {};
    for (const parte of PARTES) {
        const archivo = pistas[parte];
        if (typeof archivo === 'string' && /^[^/\\]+$/.test(archivo) && EXTENSIONES.includes(archivo.split('.').pop().toLowerCase())) validas[parte] = archivo;
    }
    return validas;
}

export const claveDePista = parte => `musica-${parte}`;

// Qué parte de la música corresponde a una pantalla.
//   escena: la clave de la escena de Phaser · nivel: el número de habitación (Habitacion, Informe) · creditos: el menú se abrió con los
//   créditos del final · final: ya empezó el cierre de la última habitación
export function parteDeLaEscena({ escena, nivel = null, creditos = false, final = false }) {
    if (final) return 'final';
    if (escena === 'Habitacion' || escena === 'Informe') {
        if (escena === 'Informe' && nivel === 6) return 'final';
        return nivel >= 1 && nivel <= 6 ? `nivel${nivel}` : 'inicio';
    }
    if (escena === 'MenuPrincipal' && creditos) return 'final';
    return 'inicio';
}
