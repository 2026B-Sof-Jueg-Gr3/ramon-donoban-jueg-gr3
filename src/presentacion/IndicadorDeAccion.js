// El aviso de acción sobre lo que se puede usar cuando el inspector está cerca: la tecla E y, a su lado, lo que hace ("Examinar",
// "Mirar detrás"…), como los avisos de los juegos de consola. Aparece suavemente y flota un poco. Ningún texto narrativo: solo
// la tecla y el verbo (src/motor/Acciones.js). En una pantalla táctil la E es el botón de la derecha: el aviso dice lo mismo.
import { FUENTE } from '../ui/Boton.js';
import { acercar } from '../motor/Movimiento.js';

const ALTO = 26;

export default class IndicadorDeAccion {
    constructor(escena, profundidad) {
        this.placa = escena.add.graphics();
        const fondo = escena.add.circle(0, 0, 13, 0x04060b, 0.85).setStrokeStyle(1.5, 0xd9b25a, 1);
        const letra = escena.add.text(0, 0, 'E', { fontFamily: 'Arial, Helvetica, sans-serif', fontStyle: 'bold', fontSize: '14px', color: '#ffd27a', resolution: 2 }).setOrigin(0.5);
        this.verbo = escena.add.text(20, 0, '', { fontFamily: FUENTE, fontSize: '15px', color: '#f4efe4', resolution: 2 }).setOrigin(0, 0.5)
            .setShadow(0, 1, '#000000', 4, false, true);
        this.contenedor = escena.add.container(0, 0, [this.placa, fondo, letra, this.verbo]).setDepth(profundidad).setAlpha(0);
        this.alfa = 0;
        this.objetivo = 0;
        this.base = { x: 0, y: 0 };
        this.texto = null;
    }

    get visible() { return this.alfa > 0.05; }

    // x, y: dónde va la tecla (el verbo va a su derecha) · verbo: lo que hace E ahí
    mostrarEn(x, y, verbo = '') {
        this.base = { x, y };
        this.objetivo = 1;
        if (verbo !== this.texto) this.ponerVerbo(verbo);
    }

    // La placa oscura detrás de la tecla y el verbo: una píldora que se ajusta al largo del verbo
    ponerVerbo(verbo) {
        this.texto = verbo;
        this.verbo.setText(verbo);
        this.placa.clear();
        if (!verbo) return;
        const ancho = 20 + this.verbo.width + 12;
        this.placa.fillStyle(0x04060b, 0.62).fillRoundedRect(-16, -ALTO / 2, ancho + 16, ALTO, ALTO / 2);
        this.placa.lineStyle(1, 0xffffff, 0.14).strokeRoundedRect(-16, -ALTO / 2, ancho + 16, ALTO, ALTO / 2);
    }

    ocultar() { this.objetivo = 0; }

    actualizar(dt, tiempo) {
        this.alfa = acercar(this.alfa, this.objetivo, dt, 14);
        const flote = Math.sin(tiempo / 260) * 2;
        this.contenedor.setPosition(this.base.x, this.base.y + flote).setAlpha(this.alfa).setScale(0.88 + 0.12 * this.alfa);
    }
}
