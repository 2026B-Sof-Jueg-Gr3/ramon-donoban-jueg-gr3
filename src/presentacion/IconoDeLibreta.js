// El ícono de la libreta en la esquina de la pantalla, con su tecla. Aparece cuando la deducción ya se puede resolver y
// el jugador siguió investigando; late suave y, si la ayuda lo pide (45 s sin abrirla), más fuerte. No lleva contador ni
// texto: solo el ícono y la tecla. Un clic lo abre. Se dibuja fijo a la pantalla.
import { acercar } from '../motor/Movimiento.js';
import { FUENTE } from '../ui/Boton.js';
import { iconoDeLibreta } from './ArteDibujado.js';

export default class IconoDeLibreta {
    // alPulsar: lo que hace un clic sobre el ícono
    constructor(escena, { profundidad, x, y, alPulsar }) {
        this.visible = 0;                  // 0..1, aparece y desaparece con suavidad
        this.fuerza = 0;                   // 0 latido suave · 1 latido fuerte (ayuda)
        const halo = escena.add.circle(0, 0, 40, 0xffd27a, 0.35);
        const fondo = escena.add.circle(0, 0, 32, 0x04060b, 0.72).setStrokeStyle(1.5, 0xd9b25a, 0.85);
        const emoji = escena.add.image(0, -2, iconoDeLibreta(escena)).setOrigin(0.5);           // un cuaderno dibujado, no un emoji
        const tecla = escena.add.rectangle(0, 40, 54, 22, 0x04060b, 0.72).setStrokeStyle(1, 0xffffff, 0.3);
        const letra = escena.add.text(0, 40, 'TAB', { fontFamily: FUENTE, fontSize: '12px', color: '#ffffff', resolution: 2 }).setOrigin(0.5);
        this.halo = halo;
        this.contenedor = escena.add.container(x, y, [halo, fondo, emoji, tecla, letra]).setDepth(profundidad).setScrollFactor(0).setAlpha(0);
        // El área que recibe el clic: el contenedor mide lo mismo que el ícono con su tecla
        this.contenedor.setSize(76, 100).setInteractive({ useHandCursor: true });
        this.contenedor.on('pointerdown', () => { if (this.visible > 0.5) alPulsar(); });
        this.contenedor.input.enabled = false;
    }

    // visible: ¿se muestra ahora? · fuerte: la ayuda pide que lata más fuerte · tiempo en ms
    actualizar(dt, tiempo, { visible, fuerte }) {
        // Aparece con suavidad, pero se aparta enseguida: si se abre la caja de un texto, ocupa esta misma esquina
        this.visible = visible ? acercar(this.visible, 1, dt, 3) : 0;
        this.fuerza = acercar(this.fuerza, fuerte ? 1 : 0, dt, 1.2);
        const t = tiempo / 1000;
        const velocidad = 2.2 + 2.2 * this.fuerza;
        const latido = Math.pow(Math.max(0, Math.sin(t * velocidad)), 2);            // un pulso corto cada ciclo
        const escala = 1 + latido * (0.05 + 0.13 * this.fuerza);
        this.contenedor.setAlpha(this.visible).setScale(escala);
        this.halo.setAlpha((0.1 + latido * (0.25 + 0.4 * this.fuerza)) * this.visible).setScale(1 + latido * 0.25);
        this.contenedor.input.enabled = this.visible > 0.5;
    }
}
