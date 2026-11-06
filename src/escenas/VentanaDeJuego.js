import Nivel, { CONFIGURACION_NIVELES } from '../modelo/Nivel.js';
import Direccion from '../modelo/Direccion.js';
import Boton, { FUENTE } from '../ui/Boton.js';
import Progreso from '../ui/Progreso.js';
import { alRedimensionar, crearLienzoCentrado, crearVelo } from './utilidades.js';

const TILE = 60;
const DURACION_MOVIMIENTO = 110;
const PUNTOS_POR_MOVIMIENTO_RESTANTE = 100;
const ALTO_HUD = 64;
const ALTO_AYUDA = 28;
const MARGEN = 16;
const ESCALA_MAXIMA_TABLERO = 1.6;
const INFORMES = [
    "INFORME DEL INSPECTOR: El pasillo está despejado. Las 'sombras' eran solo corrientes de aire moviendo las cortinas viejas. Escucho ruidos extraños viniendo de la cocina... debo investigar. [Presiona ESPACIO]",
    "INFORME DEL INSPECTOR: El 'fantasma de la cocina' resultó ser un mecanismo oculto en la alacena. Alguien quiere asustar a los intrusos a propósito. La puerta hacia el ala oeste está cerrada... busquemos la llave. [Presiona ESPACIO]",
    'INFORME DEL INSPECTOR: Candado abierto. Esta sección de la casa está llena de polvo, pero hay huellas humanas recientes en el suelo. Conducen hacia el cuarto de los niños... [Presiona ESPACIO]',
    'INFORME DEL INSPECTOR: Los juguetes no cobraban vida por magia; estaban conectados a hilos invisibles desde el techo. Alguien nos observa. Una silueta acaba de pasar frente a la ventana exterior... [Presiona ESPACIO]',
    'INFORME DEL INSPECTOR: ¡Atrapado! La sombra de la ventana era el cómplice del culpable intentando borrar las evidencias físicas. Solo queda una habitación, el despacho principal... es hora de resolver el caso. [Presiona ESPACIO]'
];

export default class VentanaDeJuego extends Phaser.Scene {
    constructor() { super('VentanaDeJuego'); }

    init(data) {
        this.numeroDeNivel = data.numeroDeNivel || 1;
    }

    create() {
        this.nivel = new Nivel(this.numeroDeNivel, this.cache.text.get('nivel' + this.numeroDeNivel));
        this.energiaMaxima = CONFIGURACION_NIVELES[this.numeroDeNivel].energiaMaxima;
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

        this.textoNivel.setPosition(MARGEN, 6);
        this.textoCajas.setPosition(w / 2, 6);
        this.textoEnergia.setPosition(MARGEN, 34);
        this.textoSeparador.setPosition(w / 2, 34);
        this.textoPuntaje.setPosition(w - MARGEN, 34);
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
        const estilo = { fontFamily: FUENTE, fontSize: '16px', color: '#ffffff', resolution: 2 };
        this.textoNivel = this.add.text(0, 0, 'Nivel ' + this.numeroDeNivel, estilo);
        this.textoCajas = this.add.text(0, 0, '', { ...estilo, color: '#9be59b' }).setOrigin(0.5, 0);
        this.textoEnergia = this.add.text(0, 0, '', { ...estilo, fontSize: '14px' });
        this.textoSeparador = this.add.text(0, 0, '|', { ...estilo, fontSize: '14px' }).setOrigin(0.5, 0);
        this.textoPuntaje = this.add.text(0, 0, '', { ...estilo, fontSize: '14px' }).setOrigin(1, 0);

        this.textoAyuda = this.add.text(0, 0, 'Flechas/WASD: mover   Z: deshacer   R: reiniciar   ESC: niveles', {
            fontFamily: 'Arial, sans-serif', fontSize: '14px', color: '#cccccc', resolution: 2
        }).setOrigin(0.5, 1);
        this.actualizarHud();
    }

    actualizarHud() {
        const escenario = this.nivel.getEscenario();
        const movimientosRestantes = this.movimientosRestantes();
        this.textoCajas.setText(`Cajas ${escenario.puntosDeLlegadaFinalizados()}/${escenario.totalPuntoDeLlegada()}`);
        this.textoEnergia.setText(`🔦 ENERGÍA DE LINTERNA: ${movimientosRestantes}/${this.energiaMaxima}`);
        this.textoPuntaje.setText(`🏆 PUNTAJE: ${movimientosRestantes * PUNTOS_POR_MOVIMIENTO_RESTANTE}`);
    }

    movimientosRestantes() {
        return Math.max(0, this.energiaMaxima - this.nivel.getMovimientos());
    }

    puntuacionActual() {
        return this.movimientosRestantes() * PUNTOS_POR_MOVIMIENTO_RESTANTE;
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
        if (this.moviendo || this.ganado || this.movimientosRestantes() === 0) return;
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
            else if (this.movimientosRestantes() === 0) this.mostrarFinEnergia();
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

        const puntuaciones = { ...(this.registry.get('puntuacionesPorNivel') || {}) };
        puntuaciones[this.numeroDeNivel] = Math.max(puntuaciones[this.numeroDeNivel] || 0, this.puntuacionActual());
        this.registry.set('puntuacionesPorNivel', puntuaciones);
        const puntuacionTotal = Object.values(puntuaciones).reduce((total, puntuacion) => total + puntuacion, 0);

        if (this.nivel.esUltimoNivel()) {
            const texto = `¡CASO CERRADO! Has ordenado todas las pistas. El culpable ha sido descubierto y la mentira de la mansión embrujada se ha desmoronado gracias a tu deducción. ¡Lógica pura! Score Total: ${puntuacionTotal}`;
            this.scene.start('Interludio', { texto, siguiente: 'MenuNiveles' });
            return;
        }

        this.scene.start('Interludio', {
            texto: INFORMES[this.numeroDeNivel - 1],
            siguiente: 'VentanaDeJuego',
            datosSiguiente: { numeroDeNivel: this.numeroDeNivel + 1 }
        });
    }

    mostrarFinEnergia() {
        this.ganado = true;
        crearVelo(this, 0.7);
        const panel = crearLienzoCentrado(this);
        panel.add([
            this.add.rectangle(250, 300, 440, 250, 0x1b1b1b).setStrokeStyle(3, 0xffffff),
            this.add.text(250, 285, '¡La linterna se apagó y la oscuridad te atrapó!\n\nPresiona R para reiniciar la habitación.', {
                fontFamily: FUENTE, fontSize: '21px', color: '#ffffff', align: 'center', wordWrap: { width: 380 }, lineSpacing: 8, resolution: 2
            }).setOrigin(0.5)
        ]);
    }
}
