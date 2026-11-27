import { TOTAL_NIVELES, NIVELES_JUGABLES } from '../motor/niveles.js';
import { claveDelArte } from '../presentacion/Retrato.js';
import { iniciarMusica } from '../presentacion/MusicaDeFondo.js';
import { claveDeIlustracion } from '../motor/Expresiones.js';

export default class Carga extends Phaser.Scene {
    constructor() { super('Carga'); }

    preload() {
        const { width, height } = this.scale;
        const anchoBarra = Math.min(400, width * 0.8);
        const barra = this.add.rectangle((width - anchoBarra) / 2, height / 2, 0, 4, 0xc89012).setOrigin(0, 0.5);
        this.load.on('progress', p => barra.width = anchoBarra * p);

        this.load.image('fondoMenu', 'assets/img/fondoMenuPrincipal.png');
        // Qué canción suena en cada parte (las canciones no se descargan aquí: suenan en streaming al llegar a cada parte)
        this.load.json('musica', 'assets/musica/lista.json');
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
        // Las ilustraciones de escena (el cómplice en el suelo al ser capturado): solo decoran una línea importante
        this.load.on('filecomplete-json-ilustraciones', (clave, tipo, datos) => {
            const nombres = new Set(Object.values(datos.niveles ?? {}).flatMap(n => Object.values(n)));
            for (const nombre of nombres) this.load.image(claveDeIlustracion(nombre), `assets/ilustraciones/${nombre}.png`);
        });
        this.load.json('ilustraciones', 'assets/ilustraciones/lista.json');
    }

    create() {
        iniciarMusica(this.game, this.cache.json.get('musica'));
        this.scene.start('MenuPrincipal');
    }
}
