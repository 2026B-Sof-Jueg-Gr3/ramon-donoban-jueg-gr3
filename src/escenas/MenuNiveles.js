import Boton, { FUENTE } from '../ui/Boton.js';
import Progreso from '../ui/Progreso.js';
import { TOTAL_NIVELES } from '../modelo/Nivel.js';
import { fondoCubriendo, crearLienzoCentrado } from './utilidades.js';

export default class MenuNiveles extends Phaser.Scene {
    constructor() { super('MenuNiveles'); }

    create() {
        fondoCubriendo(this, 'fondoNiveles');

        const lienzo = crearLienzoCentrado(this);
        lienzo.add([
            this.add.rectangle(250, 120, 300, 60, 0x000000, 0.5),
            this.add.text(250, 120, 'NIVELES', { fontFamily: FUENTE, fontSize: '40px', color: '#ffffff', resolution: 2 }).setOrigin(0.5)
        ]);

        for (let i = 0; i < TOTAL_NIVELES; i++) {
            const numero = i + 1;
            const x = 250 + ((i % 3) - 1) * 155;
            const y = 240 + Math.floor(i / 3) * 75;
            const texto = 'Nivel ' + numero + (Progreso.estaCompletado(numero) ? ' ✔' : '');
            lienzo.add(new Boton(this, x, y, texto, () => this.scene.start('VentanaDeJuego', { numeroDeNivel: numero }), 145, 50));
        }
        lienzo.add(new Boton(this, 250, 470, 'Regresar', () => this.scene.start('MenuPrincipal'), 160, 44));
    }
}
