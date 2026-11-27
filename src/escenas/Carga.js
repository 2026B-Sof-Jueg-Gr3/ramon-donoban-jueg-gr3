import { TOTAL_NIVELES, NIVELES_JUGABLES } from '../motor/niveles.js';
import { claveDelArte } from '../presentacion/Retrato.js';

export default class Carga extends Phaser.Scene {
    constructor() { super('Carga'); }

    preload() {
        const { width, height } = this.scale;
        const anchoBarra = Math.min(400, width * 0.8);
        const barra = this.add.rectangle((width - anchoBarra) / 2, height / 2, 0, 20, 0x2e9a58).setOrigin(0, 0.5);
        this.load.on('progress', p => barra.width = anchoBarra * p);

        this.load.image('logo', 'assets/img/images.png');
        this.load.image('fondoMenu', 'assets/img/fondoMenuPrincipal.png');
        this.load.image('fondoNiveles', 'assets/img/fondoNiveles.png');
        // El mapa y las reglas de cada habitación que ya se puede jugar
        for (const n of NIVELES_JUGABLES) {
            this.load.tilemapTiledJSON('mapa' + n, `assets/mapas/nivel${n}.json`);
            this.load.json('investigaciones' + n, `assets/investigaciones/nivel${n}.json`);
        }
        for (let i = 1; i <= TOTAL_NIVELES; i++) {
            this.load.json('narrativa' + i, `assets/narrativa/nivel${i}.json`);
        }
        // La expresión de cada línea importante y el arte final del retrato que haya (si no hay, se dibuja por código)
        this.load.json('expresiones', 'assets/presentacion/expresiones.json');
        this.load.on('filecomplete-json-retratos', (clave, tipo, datos) => {
            for (const archivo of datos.archivos ?? []) this.load.image(claveDelArte(archivo.replace('.png', '')), `assets/retratos/inspector/${archivo}`);
        });
        this.load.json('retratos', 'assets/retratos/inspector/disponibles.json');
        // El arte final de los dibujos que haya (inspector.png, mueble-armario.png…): se carga con la misma clave del dibujo hecho por código,
        // y como el arte provisional no vuelve a crear una textura que ya existe, el PNG lo reemplaza sin tocar nada más
        this.load.on('filecomplete-json-sprites', (clave, tipo, datos) => {
            for (const archivo of datos.archivos ?? []) this.load.image(archivo.replace('.png', ''), `assets/sprites/${archivo}`);
        });
        this.load.json('sprites', 'assets/sprites/disponibles.json');
    }

    create() {
        this.scene.start('MenuPrincipal');
    }
}
