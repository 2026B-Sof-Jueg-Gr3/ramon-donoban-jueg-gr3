import Carga from './escenas/Carga.js';
import MenuPrincipal from './escenas/MenuPrincipal.js';
import MenuNiveles from './escenas/MenuNiveles.js';
import VentanaDeJuego from './escenas/VentanaDeJuego.js';

const config = {
    type: Phaser.AUTO,
    parent: 'juego',
    backgroundColor: '#2d2d2d',
    scale: { mode: Phaser.Scale.RESIZE, width: '100%', height: '100%' },
    scene: [Carga, MenuPrincipal, MenuNiveles, VentanaDeJuego]
};

new Phaser.Game(config);
