import Boton, { FUENTE } from '../ui/Boton.js';
import { fondoCubriendo, crearLienzoCentrado } from './utilidades.js';

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
        lienzo.add([
            this.add.rectangle(250, 300, 460, 520, 0x111111, 0.94).setStrokeStyle(3, 0xffffff),
            this.add.text(250, 290, this.texto, {
                fontFamily: FUENTE,
                fontSize: '19px',
                color: '#ffffff',
                align: 'center',
                wordWrap: { width: 400 },
                lineSpacing: 7,
                resolution: 2
            }).setOrigin(0.5),
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