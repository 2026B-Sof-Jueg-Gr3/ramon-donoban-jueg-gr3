// Movimiento del inspector y de la cámara. Sin Phaser: las funciones reciben y devuelven números.

// Dirección deseada a partir de las teclas. En diagonal el vector se normaliza: la rapidez es la misma en las 8 direcciones.
export function vectorDeEntrada({ izquierda = false, derecha = false, arriba = false, abajo = false }) {
    let x = (derecha ? 1 : 0) - (izquierda ? 1 : 0);
    let y = (abajo ? 1 : 0) - (arriba ? 1 : 0);
    if (x !== 0 && y !== 0) { x *= Math.SQRT1_2; y *= Math.SQRT1_2; }
    return { x, y };
}

// Acerca un valor a su objetivo de forma exponencial. Es independiente de los cuadros por segundo:
// dos pasos de dt/2 dan el mismo resultado que uno de dt. `rapidez` es 1 / tiempo de respuesta (en 1/s).
export function acercar(actual, objetivo, dt, rapidez) {
    if (rapidez === Infinity) return objetivo;
    return actual + (objetivo - actual) * (1 - Math.exp(-dt * rapidez));
}

// Velocidad con una pequeña aceleración: responde rápido pero sin arrancar ni frenar en seco
export function velocidadSuavizada(actual, deseada, dt, tiempoDeRespuesta = 0.07) {
    const rapidez = tiempoDeRespuesta > 0 ? 1 / tiempoDeRespuesta : Infinity;
    const x = acercar(actual.x, deseada.x, dt, rapidez);
    const y = acercar(actual.y, deseada.y, dt, rapidez);
    // Por debajo de medio píxel por segundo se considera parado (evita arrastrarse eternamente)
    return Math.hypot(x, y) < 0.5 && deseada.x === 0 && deseada.y === 0 ? { x: 0, y: 0 } : { x, y };
}

// Desplazamiento de la cámara en un eje para centrar al jugador sin salirse del mapa.
// Si el mapa es más pequeño que la vista, queda centrado.
export function desplazamientoDeCamara(posicionDelJugador, tamanoDeVista, tamanoDeMapa) {
    const maximo = tamanoDeMapa - tamanoDeVista;
    if (maximo <= 0) return maximo / 2;
    return Math.max(0, Math.min(maximo, posicionDelJugador - tamanoDeVista / 2));
}
