import Boton from '../ui/Boton.js';
import Pantalla from '../ui/Pantalla.js';

// Escena provisional para las habitaciones que todavía no existen (3 a 6): solo el pasillo y la cocina están hechos.
// Se arma en flujo (src/ui/Pantalla.js): título, aviso y botón uno debajo del otro, en medio de la pantalla.
export default class EnConstruccion extends Phaser.Scene {
    constructor() { super('EnConstruccion'); }

    init(data) {
        this.numeroDeNivel = data.numeroDeNivel || 1;
    }

    create() {
        const { width, height } = this.scale;
        this.cameras.main.setBackgroundColor('#0b1420');
        const p = this.pantalla = new Pantalla(this, {
            caja: { x: 0, y: 0, ancho: width, alto: height }, margen: { x: 160, y: 60 }, hueco: 28, marco: false, centrarCuerpo: true, prefijo: 'construccion'
        });
        const volver = new Boton(this, 0, 0, 'Volver a niveles', () => this.volver(), 240, 44);
        p.enCuerpo(
            p.texto('titulo', `Habitación ${this.numeroDeNivel}`, { size: 36, centrado: true }),
            p.texto('aviso', 'En construcción', { size: 18, color: '#c89012', centrado: true }),
            { ...p.objeto('volver', volver, { ancho: volver.ancho, alto: volver.alto }), antes: 24 }
        );
        p.componer();
        this.input.keyboard.on('keydown-ESC', () => this.volver());
        this.events.once('shutdown', () => p.destruir());
    }

    volver() {
        this.scene.start('MenuNiveles');
    }
}

