import { etiquetar } from './etiquetas.js';
import { FUENTE_NOVELA, COLOR } from './estilo.js';

// La letra de toda la interfaz: la misma serifa de la caja de diálogo (antes era "Arial Black")
export const FUENTE = FUENTE_NOVELA;

// Botón de los menús, con el estilo de la caja de diálogo: azul noche semitransparente, borde dorado fino y letra con serifa. Su alto
// sale del texto: si la etiqueta no cabe en una línea se parte en varias y el botón crece; el texto nunca se sale del fondo.
let contador = 0;

export default class Boton extends Phaser.GameObjects.Container {
    constructor(scene, x, y, texto, alHacerClic, ancho = 200, alto = 44, tamano = 20) {
        super(scene, x, y);
        const grupo = `boton${++contador}`;
        this.etiqueta = scene.add.text(0, 0, texto, {
            fontFamily: FUENTE_NOVELA, fontSize: `${tamano}px`, color: COLOR.texto, resolution: 2, align: 'center',
            wordWrap: { width: ancho - 28, useAdvancedWrap: true }
        }).setOrigin(0.5).setShadow(0, 2, '#000000', 4, false, true);
        alto = Math.max(alto, Math.ceil(this.etiqueta.height + 20));
        this.fondo = scene.add.rectangle(0, 0, ancho, alto, COLOR.noche, 0.78).setStrokeStyle(1.5, COLOR.dorado, 0.75);
        // Un brillo dorado que aparece con el ratón encima, a lo largo del borde de abajo
        this.brillo = scene.add.rectangle(0, alto / 2 - 3, ancho - 24, 2, COLOR.doradoClaro, 1).setAlpha(0);
        etiquetar(this.fondo, { tipo: 'control', grupo });
        etiquetar(this.etiqueta, { tipo: 'contenido', grupo });
        etiquetar(this.brillo, { tipo: 'ignorar' });
        this.add([this.fondo, this.brillo, this.etiqueta]);
        this.ancho = ancho;
        this.alto = alto;
        this.bloqueado = false;

        this.setSize(ancho, alto).setInteractive({ useHandCursor: true });
        this.on('pointerover', () => this.resaltar(true));
        this.on('pointerout', () => this.resaltar(false));
        this.on('pointerup', alHacerClic);

        scene.add.existing(this);
    }

    resaltar(si) {
        if (this.bloqueado) return;
        this.fondo.setFillStyle(si ? COLOR.nocheClara : COLOR.noche, si ? 0.92 : 0.78).setStrokeStyle(1.5, si ? COLOR.doradoClaro : COLOR.dorado, si ? 1 : 0.75);
        this.etiqueta.setColor(si ? COLOR.titulo : COLOR.texto);
        this.brillo.setAlpha(si ? 0.9 : 0);
    }

    // Un ícono dibujado a la derecha de la etiqueta (por ejemplo, el candado de una habitación cerrada)
    ponerIcono(clave) {
        const icono = this.scene.add.image(0, 0, clave).setOrigin(0.5);
        icono.setData('rev', { tipo: 'ignorar' });
        icono.setPosition(Math.min(this.ancho / 2 - 16, this.etiqueta.width / 2 + 14), 0);
        this.add(icono);
        return this;
    }

    // Una habitación todavía cerrada: apagada y sin responder
    bloquear() {
        this.bloqueado = true;
        this.fondo.setFillStyle(0x0a0d12, 0.6).setStrokeStyle(1, 0x5a6270, 0.6);
        this.etiqueta.setColor('#7d8590');
        this.disableInteractive();
        return this;
    }
}
