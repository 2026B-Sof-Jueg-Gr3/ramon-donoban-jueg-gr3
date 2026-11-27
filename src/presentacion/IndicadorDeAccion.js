// Ícono discreto con la tecla de acción (E): aparece suavemente sobre lo que se puede usar cuando el inspector está cerca.
// No lleva ningún texto narrativo: solo la letra de la tecla.
import { FUENTE } from '../ui/Boton.js';
import { acercar } from '../motor/Movimiento.js';

export default class IndicadorDeAccion {
    constructor(escena, profundidad) {
        const fondo = escena.add.circle(0, 0, 15, 0x0b1420, 0.92).setStrokeStyle(2, 0xc89012, 1);
        const letra = escena.add.text(0, 0, 'E', { fontFamily: FUENTE, fontSize: '16px', color: '#ffd27a', resolution: 2 }).setOrigin(0.5);
        this.contenedor = escena.add.container(0, 0, [fondo, letra]).setDepth(profundidad).setAlpha(0);
        this.alfa = 0;
        this.objetivo = 0;
        this.base = { x: 0, y: 0 };
    }

    get visible() { return this.alfa > 0.05; }

    mostrarEn(x, y) {
        this.base = { x, y };
        this.objetivo = 1;
    }

    ocultar() { this.objetivo = 0; }

    actualizar(dt, tiempo) {
        this.alfa = acercar(this.alfa, this.objetivo, dt, 14);
        const flote = Math.sin(tiempo / 260) * 2;
        this.contenedor.setPosition(this.base.x, this.base.y + flote).setAlpha(this.alfa).setScale(0.85 + 0.15 * this.alfa);
    }
}
