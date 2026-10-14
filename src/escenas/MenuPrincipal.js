import Boton, { FUENTE } from '../ui/Boton.js';
import { fondoCubriendo, crearLienzoCentrado, crearVelo } from './utilidades.js';

export default class MenuPrincipal extends Phaser.Scene {
    constructor() { super('MenuPrincipal'); }

    create() {
        fondoCubriendo(this, 'fondoMenu');

        const lienzo = crearLienzoCentrado(this);
        lienzo.add([
            this.add.text(250, 70, 'Bienvenido a SOKOBAN', {
                fontFamily: FUENTE, fontSize: '32px', color: '#ffffff', stroke: '#000000', strokeThickness: 6, resolution: 2
            }).setOrigin(0.5),
            this.add.image(250, 220, 'logo').setDisplaySize(180, 180),
            new Boton(this, 250, 380, 'Jugar', () => this.scene.start('MenuNiveles')),
            new Boton(this, 250, 440, 'Créditos', () => this.mostrarCreditos())
        ]);
    }

    mostrarCreditos() {
        const velo = crearVelo(this);
        const panel = crearLienzoCentrado(this);
        const cerrar = () => { velo.destroy(); panel.destroy(); };
        panel.add([
            this.add.rectangle(250, 300, 380, 300, 0x1b1b1b).setStrokeStyle(3, 0xffffff),
            this.add.text(250, 270, 'CRÉDITOS\n\nDonoban Ramón', {
                fontFamily: FUENTE, fontSize: '20px', color: '#ffffff', align: 'center', resolution: 2
            }).setOrigin(0.5),
            new Boton(this, 250, 410, 'Cerrar', cerrar, 160, 40)
        ]);
    }
}
