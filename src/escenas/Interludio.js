import Boton from '../ui/Boton.js';
import Pantalla from '../ui/Pantalla.js';
import { fondoCubriendo } from './utilidades.js';

const CAJA = { x: 364, y: 48, ancho: 552, alto: 624 };          // el panel de 460 × 520 ampliado 1,2

// Un texto largo sobre fondo oscuro (el preámbulo). Se arma en flujo (src/ui/Pantalla.js): el texto va en una zona que se
// desplaza si no cabe y el botón queda siempre abajo. La letra se achica un poco antes de recurrir a desplazar.
export default class Interludio extends Phaser.Scene {
    constructor() { super('Interludio'); }

    init(data) {
        this.texto = data.texto;
        this.siguiente = data.siguiente;
        this.datosSiguiente = data.datosSiguiente || {};
        this.continuado = false;
    }

    create() {
        fondoCubriendo(this, 'fondoMenu');
        const p = this.pantalla = new Pantalla(this, {
            caja: CAJA, margen: { x: 36, y: 36 }, hueco: 24, prefijo: 'interludio', centrarCuerpo: true,
            estilo: { fondo: 0x111111, borde: 0xffffff, opacidad: 0.94 }
        });
        const texto = p.textoAjustado('texto', this.texto, { size: 23, minimo: 16, altoMaximo: 440, color: '#ffffff', espacio: 8, centrado: true });
        p.enCuerpo(texto);
        const continuar = new Boton(this, 0, 0, 'Continuar', () => this.avanzar(), 252, 53, 24);
        p.enPie(p.objeto('continuar', continuar, { ancho: continuar.ancho, alto: continuar.alto }));
        p.componer();

        this.input.keyboard.on('keydown-ENTER', () => this.programarAvance());
        this.input.keyboard.on('keydown-SPACE', () => this.programarAvance());
        this.input.keyboard.on('keydown-UP', () => p.desplazar(-1));
        this.input.keyboard.on('keydown-DOWN', () => p.desplazar(1));
        this.events.once('shutdown', () => p.destruir());
    }

    programarAvance() {
        if (this.continuado) return;
        this.time.delayedCall(0, () => this.avanzar());
    }

    avanzar() {
        if (this.continuado) return;
        this.continuado = true;
        this.scene.start(this.siguiente, this.datosSiguiente);
    }
}
