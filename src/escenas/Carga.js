import Nivel, { TOTAL_NIVELES } from '../modelo/Nivel.js';

export default class Carga extends Phaser.Scene {
    constructor() { super('Carga'); }

    preload() {
        const { width, height } = this.scale;
        const anchoBarra = Math.min(400, width * 0.8);
        const barra = this.add.rectangle((width - anchoBarra) / 2, height / 2, 0, 20, 0x2e9a58).setOrigin(0, 0.5);
        this.load.on('progress', p => barra.width = anchoBarra * p);

        this.load.image('caja', 'assets/img/caja.png');
        this.load.image('llegada', 'assets/img/endPoint.png');
        this.load.image('pared', 'assets/img/paredDeRoca.png');
        this.load.image('suelo', 'assets/img/sueloHierba.png');
        this.load.image('personaje', 'assets/img/personaje.png');
        this.load.image('logo', 'assets/img/images.png');
        this.load.image('fondoMenu', 'assets/img/fondoMenuPrincipal.png');
        this.load.image('fondoNiveles', 'assets/img/fondoNiveles.png');
        for (let i = 1; i <= TOTAL_NIVELES; i++) {
            this.load.text('nivel' + i, Nivel.buscarArchivoDeNivel(i));
        }
    }

    create() {
        this.scene.start('MenuPrincipal');
    }
}
