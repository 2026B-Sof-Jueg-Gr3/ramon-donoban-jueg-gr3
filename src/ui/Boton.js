import { etiquetar } from './etiquetas.js';

export const FUENTE = '"Arial Black", Impact, sans-serif';

const COLOR_NORMAL = 0x1f6f3f;
const COLOR_HOVER = 0x2e9a58;
let contador = 0;

// Botón reutilizable (equivale a los JButton del original). Su alto sale del texto: si la etiqueta no cabe en una línea se
// parte en varias y el botón crece; el texto nunca se sale del fondo.
export default class Boton extends Phaser.GameObjects.Container {
    constructor(scene, x, y, texto, alHacerClic, ancho = 200, alto = 44, tamano = 20) {
        super(scene, x, y);
        const grupo = `boton${++contador}`;
        this.etiqueta = scene.add.text(0, 0, texto, {
            fontFamily: FUENTE, fontSize: `${tamano}px`, color: '#ffffff', resolution: 2, align: 'center',
            wordWrap: { width: ancho - 24, useAdvancedWrap: true }
        }).setOrigin(0.5);
        alto = Math.max(alto, Math.ceil(this.etiqueta.height + 20));
        this.fondo = scene.add.rectangle(0, 0, ancho, alto, COLOR_NORMAL).setStrokeStyle(3, 0xffffff);
        etiquetar(this.fondo, { tipo: 'control', grupo });
        etiquetar(this.etiqueta, { tipo: 'contenido', grupo });
        this.add([this.fondo, this.etiqueta]);
        this.ancho = ancho;
        this.alto = alto;

        this.setSize(ancho, alto).setInteractive({ useHandCursor: true });
        this.on('pointerover', () => this.fondo.setFillStyle(COLOR_HOVER));
        this.on('pointerout', () => this.fondo.setFillStyle(COLOR_NORMAL));
        this.on('pointerup', alHacerClic);

        scene.add.existing(this);
    }
}
