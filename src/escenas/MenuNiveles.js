import Boton, { FUENTE } from '../ui/Boton.js';
import Progreso from '../ui/Progreso.js';
import { TOTAL_NIVELES } from '../modelo/Nivel.js';
import { fondoCubriendo, crearLienzoCentrado } from './utilidades.js';

const NOMBRES_NIVELES = [
    '1. El Pasillo Oscuro',
    '2. El Fantasma de la Cocina',
    '3. La Puerta con Candado',
    '4. El Cuarto de los Juguetes',
    '5. La Sombra en la Ventana',
    '6. La Verdad Revelada'
];

export default class MenuNiveles extends Phaser.Scene {
    constructor() { super('MenuNiveles'); }

    create() {
        fondoCubriendo(this, 'fondoNiveles');

        const lienzo = crearLienzoCentrado(this);
        lienzo.add([
            this.add.rectangle(250, 120, 300, 60, 0x000000, 0.5),
            this.add.text(250, 120, 'NIVELES', { fontFamily: FUENTE, fontSize: '40px', color: '#ffffff', resolution: 2 }).setOrigin(0.5),
            this.add.text(250, 170, 'Completa cada habitación para desbloquear la siguiente', {
                fontFamily: FUENTE, fontSize: '13px', color: '#ffffff', align: 'center', resolution: 2
            }).setOrigin(0.5)
        ]);

        for (let i = 0; i < TOTAL_NIVELES; i++) {
            const numero = i + 1;
            const x = i % 2 === 0 ? 130 : 370;
            const y = 220 + Math.floor(i / 2) * 78;
            const completado = Progreso.estaCompletado(numero);
            const desbloqueado = numero === 1 || Progreso.estaCompletado(numero - 1);
            const texto = NOMBRES_NIVELES[i] + (completado ? ' ✔' : desbloqueado ? '' : ' 🔒');
            const boton = new Boton(this, x, y, texto, () => {
                if (!desbloqueado) return;
                this.scene.start('VentanaDeJuego', { numeroDeNivel: numero });
            }, 230, 52);
            boton.etiqueta.setFontSize(desbloqueado ? '13px' : '12px');
            if (!desbloqueado) {
                boton.fondo.setFillStyle(0x555555);
                boton.etiqueta.setColor('#b5b5b5');
                boton.disableInteractive();
            }
            lienzo.add(boton);
        }
        lienzo.add(new Boton(this, 250, 480, 'Regresar', () => this.scene.start('MenuPrincipal'), 160, 44));
    }
}
