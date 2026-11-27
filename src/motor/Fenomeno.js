// El fenómeno de una habitación: golpes que se repiten cada cierto tiempo y la llama de las velas, que se apaga con cada
// golpe y vuelve. Sin Phaser. Dura hasta el cierre, cuando se calma (no más golpes y las velas encendidas).
import { distanciaARectangulo } from './Geometria.js';

export const GOLPE = Object.freeze({
    primero: 4,            // segundos desde que se entra hasta el primer golpe
    minimo: 7,             // entre un golpe y el siguiente
    maximo: 12,
    alcanceDelOido: 120    // px: "cerca" de un objeto para oír el golpe de su lado
});

// Cuándo suena el siguiente golpe. `azar` devuelve un número en [0, 1).
export class CicloDeGolpes {
    constructor({ primero = GOLPE.primero, minimo = GOLPE.minimo, maximo = GOLPE.maximo, azar = Math.random } = {}) {
        this.minimo = minimo;
        this.maximo = maximo;
        this.azar = azar;
        this.espera = primero;
        this.calmado = false;
        this.golpes = 0;
    }

    // dt en segundos. Devuelve true en el cuadro en que suena un golpe.
    actualizar(dt) {
        if (this.calmado) return false;
        this.espera -= dt;
        if (this.espera > 0) return false;
        return this.golpear();
    }

    // Un golpe ya (por ejemplo, al tirar de la cuerda): cuenta como el último y vuelve a empezar la espera
    golpear() {
        if (this.calmado) return false;
        this.golpes++;
        this.espera = this.minimo + this.azar() * (this.maximo - this.minimo);
        return true;
    }

    // El cierre: no más golpes
    calmar() { this.calmado = true; }
}

// ¿Está el inspector lo bastante cerca del objeto (un rectángulo { x, y, ancho, alto }) como para oír el golpe de su lado?
export function golpeCerca(pies, objeto, alcance = GOLPE.alcanceDelOido) {
    return distanciaARectangulo(pies, objeto) <= alcance;
}

// La llama de una vela (0 apagada · 1 encendida) a los `t` segundos de un golpe: se apaga enseguida, sigue apagada un rato
// y vuelve a encenderse poco a poco. Con `calmado` (tras el cierre) siempre está encendida.
export const VELA = Object.freeze({ apagado: 0.25, apagada: 2.6, encendido: 1.4 });

export function nivelDeLlama(t, calmado = false) {
    if (calmado || !(t >= 0)) return 1;
    if (t < VELA.apagado) return 1 - t / VELA.apagado;
    if (t < VELA.apagado + VELA.apagada) return 0;
    const u = (t - VELA.apagado - VELA.apagada) / VELA.encendido;
    return u >= 1 ? 1 : u * u * (3 - 2 * u);
}
