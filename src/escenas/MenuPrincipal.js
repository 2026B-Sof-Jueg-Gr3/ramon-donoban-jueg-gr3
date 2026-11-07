import Boton, { FUENTE } from '../ui/Boton.js';
import { fondoCubriendo, crearLienzoCentrado, crearVelo } from './utilidades.js';

const PREAMBULO = "PREÁMBULO: La Mansión Flieder lleva años abandonada. Los lugareños afirman que sombras malditas mueven los objetos por las noches. El Inspector Lógica ha llegado bajo la tormenta. Su objetivo: entrar habitación por habitación, ordenar el caos y demostrar con pruebas físicas que la 'magia' es solo una fachada. Enciende tu linterna... la investigación comienza ahora. [Presiona ESPACIO para continuar]";

export default class MenuPrincipal extends Phaser.Scene {
    constructor() { super('MenuPrincipal'); }

    create() {
        fondoCubriendo(this, 'fondoMenu');

        const lienzo = crearLienzoCentrado(this);
        lienzo.add([
            this.add.text(250, 65, 'INSPECTOR LÓGICA:\nEl Misterio de la Mansión', {
                fontFamily: FUENTE, fontSize: '27px', color: '#ffffff', stroke: '#000000', strokeThickness: 6, align: 'center', resolution: 2
            }).setOrigin(0.5),
            this.add.image(250, 220, 'logo').setDisplaySize(160, 160),
            new Boton(this, 250, 370, 'Jugar', () => this.scene.start('Interludio', { texto: PREAMBULO, siguiente: 'MenuNiveles' })),
            new Boton(this, 250, 430, 'Créditos', () => this.mostrarCreditos())
        ]);
    }

    mostrarCreditos() {
        const velo = crearVelo(this);
        const panel = crearLienzoCentrado(this);
        const cerrar = () => { velo.destroy(); panel.destroy(); };
        panel.add([
            this.add.rectangle(250, 300, 440, 440, 0x1b1b1b).setStrokeStyle(3, 0xffffff),
            this.add.text(250, 285, 'CRÉDITOS\n\nDonoban Ramón\n\nAyuda al Inspector Lógica a demostrar que los fantasmas no existen usando la razón. Pon cada pista en su sitio.', {
                fontFamily: FUENTE, fontSize: '18px', color: '#ffffff', align: 'center', wordWrap: { width: 390 }, lineSpacing: 7, resolution: 2
            }).setOrigin(0.5),
            new Boton(this, 250, 480, 'Cerrar', cerrar, 160, 40)
        ]);
    }
}
