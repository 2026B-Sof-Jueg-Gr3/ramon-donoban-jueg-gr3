// Distribuidor de entradas: decide qué componente recibe cada tecla o toque según el estado de la interfaz.
// Ningún otro componente escucha el teclado, así que una pulsación nunca ejecuta dos acciones.
//
//   tecla:  'mover' | 'deshacer' | 'reiniciar' | 'menu' | 'avanzar'
//   estado: { pausaNarrativa }   (hay un acontecimiento importante en presentación)
//   repetida: la tecla sigue apretada (auto-repetición del teclado)
// Devuelve: 'juego' | 'narrativa' | 'avisar' | null
//   Durante la pausa, las acciones del juego no se ejecutan ni quedan pendientes: se descartan y se avisa cómo continuar.
export function destinoDeEntrada(tecla, { pausaNarrativa }, repetida = false) {
    if (tecla === 'avanzar') return pausaNarrativa && !repetida ? 'narrativa' : null;
    if (tecla === 'menu') return 'juego';        // ESC vuelve a niveles en cualquier estado, como antes
    return pausaNarrativa ? 'avisar' : 'juego';
}
