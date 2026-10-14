export const FUENTE = '"Arial Black", Impact, sans-serif';

const COLOR_NORMAL = 0x1f6f3f;
const COLOR_HOVER = 0x2e9a58;

// Botón reutilizable (equivale a los JButton del original)
export default class Boton extends Phaser.GameObjects.Container {
    constructor(scene, x, y, texto, alHacerClic, ancho = 200, alto = 44) {
        super(scene, x, y);
        this.fondo = scene.add.rectangle(0, 0, ancho, alto, COLOR_NORMAL).setStrokeStyle(3, 0xffffff);
        this.etiqueta = scene.add.text(0, 0, texto, { fontFamily: FUENTE, fontSize: '20px', color: '#ffffff', resolution: 2 }).setOrigin(0.5);
        this.add([this.fondo, this.etiqueta]);

        this.setSize(ancho, alto).setInteractive({ useHandCursor: true });
        this.on('pointerover', () => this.fondo.setFillStyle(COLOR_HOVER));
        this.on('pointerout', () => this.fondo.setFillStyle(COLOR_NORMAL));
        this.on('pointerup', alHacerClic);

        scene.add.existing(this);
    }
}
