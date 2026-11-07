import Boton, { FUENTE } from '../ui/Boton.js';
import { fondoCubriendo, crearLienzoCentrado } from './utilidades.js';

// El texto va centrado en y = 270: entre el borde superior del panel (40) y el botón (498)
const ALTO_MAXIMO_TEXTO = 420;

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

        const lienzo = crearLienzoCentrado(this);
        const texto = this.add.text(250, 270, this.texto, {
            fontFamily: FUENTE,
            fontSize: '19px',
            color: '#ffffff',
            align: 'center',
            wordWrap: { width: 400 },
            lineSpacing: 7,
            resolution: 2
        }).setOrigin(0.5);
        // Si el informe no cabe entre el borde del panel y el botón, se reduce la letra
        for (let tamano = 18; texto.height > ALTO_MAXIMO_TEXTO && tamano >= 13; tamano--) {
            texto.setFontSize(tamano).setLineSpacing(Math.round(tamano * 0.35));
        }
        lienzo.add([
            this.add.rectangle(250, 300, 460, 520, 0x111111, 0.94).setStrokeStyle(3, 0xffffff),
            texto,
            new Boton(this, 250, 520, 'Continuar', () => this.avanzar(), 210, 44)
        ]);

            this.input.keyboard.on('keydown-ENTER', () => this.programarAvance());
            this.input.keyboard.on('keydown-SPACE', () => this.programarAvance());
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