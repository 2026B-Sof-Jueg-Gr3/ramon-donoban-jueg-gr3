// Hacia dónde apunta la linterna. Sin Phaser.
//   · Con ratón: hacia el cursor.
//   · Solo con teclado (el ratón lleva quieto un rato): hacia donde camina el inspector.
// Cualquier movimiento del ratón vuelve al modo ratón.
import { normalizarAngulo, diferenciaDeAngulos } from './Geometria.js';

// Gira desde `actual` hacia `objetivo` por el camino más corto, como mucho `velocidadMaxima` rad/s
export function suavizarAngulo(actual, objetivo, dt, velocidadMaxima) {
    const diferencia = diferenciaDeAngulos(objetivo, actual);
    const paso = velocidadMaxima * dt;
    if (Math.abs(diferencia) <= paso) return normalizarAngulo(objetivo);
    return normalizarAngulo(actual + Math.sign(diferencia) * paso);
}

export default class ControlDeApuntado {
    // espera: segundos con el ratón quieto antes de apuntar según el teclado
    constructor({ espera = 0.8, velocidadDeGiro = 18, anguloInicial = Math.PI / 2, distanciaMinima = 6 } = {}) {
        this.espera = espera;
        this.velocidadDeGiro = velocidadDeGiro;
        this.distanciaMinima = distanciaMinima;
        this.angulo = anguloInicial;
        this.modo = 'teclado';
        this.sinMoverRaton = 0;
    }

    // origen: posición del inspector · raton: posición del cursor en el mundo · ratonMovido: ¿se movió en este cuadro?
    // movimiento: dirección que pide el teclado ({x, y}, ya normalizada)
    actualizar({ dt, origen, raton, ratonMovido, movimiento }) {
        if (ratonMovido) {
            this.modo = 'raton';
            this.sinMoverRaton = 0;
        } else {
            this.sinMoverRaton += dt;
        }
        const camina = movimiento.x !== 0 || movimiento.y !== 0;
        if (this.modo === 'raton' && camina && this.sinMoverRaton >= this.espera) this.modo = 'teclado';

        let objetivo = this.angulo;
        if (this.modo === 'raton' && raton) {
            const dx = raton.x - origen.x, dy = raton.y - origen.y;
            if (Math.hypot(dx, dy) >= this.distanciaMinima) objetivo = Math.atan2(dy, dx);
        } else if (this.modo === 'teclado' && camina) {
            objetivo = Math.atan2(movimiento.y, movimiento.x);
        }
        this.angulo = suavizarAngulo(this.angulo, objetivo, dt, this.velocidadDeGiro);
        return this.angulo;
    }
}
