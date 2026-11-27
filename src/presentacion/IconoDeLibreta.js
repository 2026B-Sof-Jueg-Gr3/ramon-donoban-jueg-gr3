// El ícono de la libreta en la esquina de la pantalla, con su tecla. Aparece cuando la deducción ya se puede resolver y
// el jugador siguió investigando; late suave y, si la ayuda lo pide (45 s sin abrirla), más fuerte. No lleva contador ni
// texto: solo el ícono y la tecla. Un clic lo abre. Se dibuja fijo a la pantalla.
import { acercar } from '../motor/Movimiento.js';
import { FUENTE } from '../ui/Boton.js';

const FUENTE_EMOJI = '"Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';

export default class IconoDeLibreta {
    // alPulsar: lo que hace un clic sobre el ícono
    constructor(escena, { profundidad, x, y, alPulsar }) {
        this.visible = 0;                  // 0..1, aparece y desaparece con suavidad
        this.fuerza = 0;                   // 0 latido suave · 1 latido fuerte (ayuda)
        const halo = escena.add.circle(0, 0, 40, 0xffd27a, 0.35);
        const fondo = escena.add.circle(0, 0, 32, 0x0b1420, 0.95).setStrokeStyle(3, 0xc89012, 0.95);
        const emoji = escena.add.text(0, -2, '📒', { fontFamily: FUENTE_EMOJI, fontSize: '32px', padding: { top: 6, bottom: 6 }, resolution: 2 }).setOrigin(0.5);
        const tecla = escena.add.rectangle(0, 40, 54, 22, 0x1b1b1b).setStrokeStyle(2, 0xffffff, 0.85);
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
        this.visible = acercar(this.visible, visible ? 1 : 0, dt, 3);
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
