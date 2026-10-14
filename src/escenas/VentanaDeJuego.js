import Nivel from '../modelo/Nivel.js';
import Direccion from '../modelo/Direccion.js';
import Boton, { FUENTE } from '../ui/Boton.js';
import Progreso from '../ui/Progreso.js';
import { alRedimensionar, crearLienzoCentrado, crearVelo } from './utilidades.js';

const TILE = 60;
const DURACION_MOVIMIENTO = 110;
const ALTO_HUD = 40;
const ALTO_AYUDA = 28;
const MARGEN = 16;
const ESCALA_MAXIMA_TABLERO = 1.6;

export default class VentanaDeJuego extends Phaser.Scene {
    constructor() { super('VentanaDeJuego'); }

    init(data) {
        this.numeroDeNivel = data.numeroDeNivel || 1;
    }

    create() {
        this.nivel = new Nivel(this.numeroDeNivel, this.cache.text.get('nivel' + this.numeroDeNivel));
        this.moviendo = false;
        this.ganado = false;

        // El tablero usa coordenadas de casillas de 60 px; al redimensionar solo se escala y centra
        this.tablero = this.add.container(0, 0);
        this.pintarElEscenario();
        this.pintarPersonaje();
        this.crearHud();
        this.registrarControles();

        alRedimensionar(this, (w, h) => this.reacomodar(w, h));
    }

    reacomodar(w, h) {
        const escenario = this.nivel.getEscenario();
        const anchoTablero = escenario.getColumnas() * TILE;
        const altoTablero = escenario.getFilas() * TILE;
        const escala = Math.min(
            (w - MARGEN * 2) / anchoTablero,
            (h - ALTO_HUD - ALTO_AYUDA) / altoTablero,
            ESCALA_MAXIMA_TABLERO
        );
        this.tablero.setScale(escala).setPosition(
            (w - anchoTablero * escala) / 2,
            ALTO_HUD + (h - ALTO_HUD - ALTO_AYUDA - altoTablero * escala) / 2
        );

        this.textoNivel.setPosition(MARGEN, 10);
        this.textoCajas.setPosition(w / 2, 10);
        this.textoMovimientos.setPosition(w - MARGEN, 10);
        this.textoAyuda.setPosition(w / 2, h - 6);
    }

    aPixel(fila, columna) {
        return { x: columna * TILE + TILE / 2, y: fila * TILE + TILE / 2 };
    }

    agregarImagen(fila, columna, textura) {
        const { x, y } = this.aPixel(fila, columna);
        const img = this.add.image(x, y, textura).setDisplaySize(TILE, TILE);
        this.tablero.add(img);
        return img;
    }

    pintarElEscenario() {
        const escenario = this.nivel.getEscenario();
        for (let f = 0; f < escenario.getFilas(); f++) {
            for (let c = 0; c < escenario.getColumnas(); c++) {
                const bloque = escenario.getBloque(f, c);
                if (bloque.getTextura() === 'llegada') this.agregarImagen(f, c, 'suelo');
                this.agregarImagen(f, c, bloque.getTextura());
            }
        }

        // En un contenedor manda el orden de inserción: cajas y personaje van al final para quedar encima
        this.spritesDeCajas = new Map();
        for (const caja of escenario.getCajas()) {
            this.spritesDeCajas.set(caja, this.agregarImagen(caja.fila, caja.columna, caja.getTextura()));
            this.pintarCaja(caja);
        }
    }

    pintarCaja(caja) {
        const sprite = this.spritesDeCajas.get(caja);
        if (caja.getLlegoAlPuntoDeLlegada()) sprite.setTint(0x7dff7d);
        else sprite.clearTint();
    }

    pintarPersonaje() {
        const personaje = this.nivel.getPersonaje();
        this.spritePersonaje = this.agregarImagen(personaje.fila, personaje.columna, personaje.getTextura());
    }

    crearHud() {
        const estilo = { fontFamily: FUENTE, fontSize: '18px', color: '#ffffff', resolution: 2 };
        this.textoNivel = this.add.text(0, 0, 'Nivel ' + this.numeroDeNivel, estilo);
        this.textoCajas = this.add.text(0, 0, '', { ...estilo, color: '#9be59b' }).setOrigin(0.5, 0);
        this.textoMovimientos = this.add.text(0, 0, '', estilo).setOrigin(1, 0);

        this.textoAyuda = this.add.text(0, 0, 'Flechas/WASD: mover   Z: deshacer   R: reiniciar   ESC: niveles', {
            fontFamily: 'Arial, sans-serif', fontSize: '14px', color: '#cccccc', resolution: 2
        }).setOrigin(0.5, 1);
        this.actualizarHud();
    }

    actualizarHud() {
        const escenario = this.nivel.getEscenario();
        this.textoCajas.setText(`Cajas ${escenario.puntosDeLlegadaFinalizados()}/${escenario.totalPuntoDeLlegada()}`);
        this.textoMovimientos.setText('Mov: ' + this.nivel.getMovimientos());
    }

    registrarControles() {
        this.cursores = this.input.keyboard.createCursorKeys();
        this.teclas = this.input.keyboard.addKeys('W,A,S,D');
        this.input.keyboard.on('keydown-R', () => this.scene.restart({ numeroDeNivel: this.numeroDeNivel }));
        this.input.keyboard.on('keydown-Z', () => this.deshacer());
        this.input.keyboard.on('keydown-ESC', () => this.scene.start('MenuNiveles'));
    }

    update() {
        const presionada = Phaser.Input.Keyboard.JustDown;
        if (presionada(this.cursores.up) || presionada(this.teclas.W)) this.mover(Direccion.ARRIBA);
        else if (presionada(this.cursores.down) || presionada(this.teclas.S)) this.mover(Direccion.ABAJO);
        else if (presionada(this.cursores.left) || presionada(this.teclas.A)) this.mover(Direccion.IZQUIERDA);
        else if (presionada(this.cursores.right) || presionada(this.teclas.D)) this.mover(Direccion.DERECHA);
    }

    mover(direccion) {
        if (this.moviendo || this.ganado) return;
        const resultado = this.nivel.mover(direccion);
        if (!resultado) return;

        this.moviendo = true;
        if (resultado.caja) this.animar(this.spritesDeCajas.get(resultado.caja), resultado.caja.fila, resultado.caja.columna);
        const personaje = this.nivel.getPersonaje();
        this.animar(this.spritePersonaje, personaje.fila, personaje.columna, () => {
            this.moviendo = false;
            if (resultado.caja) this.pintarCaja(resultado.caja);
            this.actualizarHud();
            if (this.nivel.estaCompletado()) this.mostrarVictoria();
        });
    }

    deshacer() {
        if (this.moviendo || this.ganado) return;
        const caja = this.nivel.deshacer();
        if (caja === undefined) return;

        const personaje = this.nivel.getPersonaje();
        const p = this.aPixel(personaje.fila, personaje.columna);
        this.spritePersonaje.setPosition(p.x, p.y);
        if (caja) {
            const b = this.aPixel(caja.fila, caja.columna);
            this.spritesDeCajas.get(caja).setPosition(b.x, b.y);
            this.pintarCaja(caja);
        }
        this.actualizarHud();
    }

    animar(sprite, fila, columna, alTerminar) {
        const { x, y } = this.aPixel(fila, columna);
        this.tweens.add({ targets: sprite, x, y, duration: DURACION_MOVIMIENTO, ease: 'Sine.easeOut', onComplete: alTerminar });
    }

    mostrarVictoria() {
        this.ganado = true;
        Progreso.marcarCompletado(this.numeroDeNivel);

        crearVelo(this, 0.65);
        const panel = crearLienzoCentrado(this);
        panel.add([
            this.add.rectangle(250, 300, 460, 260, 0x1b1b1b).setStrokeStyle(3, 0xffffff),
            this.add.text(250, 230, '¡Felicidades!\nHas completado el nivel.', {
                fontFamily: FUENTE, fontSize: '24px', color: '#ffffff', align: 'center', resolution: 2
            }).setOrigin(0.5),
            this.add.text(250, 285, 'Movimientos: ' + this.nivel.getMovimientos(), {
                fontFamily: FUENTE, fontSize: '18px', color: '#9be59b', resolution: 2
            }).setOrigin(0.5)
        ]);

        const irANiveles = () => this.scene.start('MenuNiveles');
        const irASiguiente = () => this.scene.restart({ numeroDeNivel: this.numeroDeNivel + 1 });

        if (this.nivel.esUltimoNivel()) {
            panel.add(new Boton(this, 250, 350, 'Niveles', irANiveles, 200, 44));
            this.input.keyboard.once('keydown-ENTER', irANiveles);
        } else {
            panel.add([
                new Boton(this, 155, 350, 'Siguiente', irASiguiente, 170, 44),
                new Boton(this, 345, 350, 'Niveles', irANiveles, 170, 44)
            ]);
            this.input.keyboard.once('keydown-ENTER', irASiguiente);
        }
    }
}
