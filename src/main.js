import Carga from './escenas/Carga.js';
import MenuPrincipal from './escenas/MenuPrincipal.js';
import Interludio from './escenas/Interludio.js';
import MenuNiveles from './escenas/MenuNiveles.js';
import Habitacion from './escenas/Habitacion.js';
import Informe from './escenas/Informe.js';
import EnConstruccion from './escenas/EnConstruccion.js';
import Revisor from './presentacion/Revisor.js';
import RecorridoDeRevision from './presentacion/RecorridoDeRevision.js';
import AyudasDeVerificacion from './presentacion/AyudasDeVerificacion.js';

const config = {
    type: Phaser.AUTO,
    parent: 'juego',
    backgroundColor: '#000000',
    // Lienzo fijo de 1280×720 (16:9) escalado para caber en la ventana; si sobra espacio, quedan franjas negras
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: 1280, height: 720 },
    // Física Arcade sin gravedad: la vista es cenital
    physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 }, debug: false } },
    scene: [Carga, MenuPrincipal, Interludio, MenuNiveles, Habitacion, Informe, EnConstruccion]
};

const juego = new Phaser.Game(config);
const revisor = new Revisor(juego);
revisor.instalar();                      // F6: revisa la maquetación de la pantalla actual (DISENO_V2.md, "Reglas de interfaz")
new RecorridoDeRevision(juego, revisor).instalar();      // window.__recorrido(): la tabla de maquetación de todas las pantallas
new AyudasDeVerificacion(juego).instalar();      // window.__v: caminar y apuntar para verificar en el navegador (no cambia el juego)
