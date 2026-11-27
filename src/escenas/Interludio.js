import DialogoPrincipal from '../ui/DialogoPrincipal.js';
import { fondoDeTormenta } from './utilidades.js';

// Un texto narrado antes de entrar a la mansión (el preámbulo), en la misma caja de diálogo del juego: la mansión bajo la tormenta
// detrás y el texto abajo, escrito letra a letra y repartido en páginas si no cabe. E, Espacio, Enter o un clic completan y avanzan;
// Esc lo salta.
const ZONA = { x: 40, y: 720 - 262 - 28, ancho: 1200, alto: 262 };

export default class Interludio extends Phaser.Scene {
    constructor() { super('Interludio'); }

    init(data) {
        this.texto = data.texto;
        this.titulo = data.titulo || '';
        this.siguiente = data.siguiente;
        this.datosSiguiente = data.datosSiguiente || {};
        this.continuado = false;
    }

    create() {
        const { width, height } = this.scale;
        fondoDeTormenta(this, 0.3);
        // Sin velo extra: la mansión se tiene que ver detrás de la caja, como en una novela visual
        this.dialogo = new DialogoPrincipal(this, () => this.dialogo.alTocar(), { profundidad: 10, oscurecer: () => 0 });
        this.dialogo.reposicionar(ZONA, { x: 0, y: 0, ancho: width, alto: height });
        this.dialogo.abrir(this.texto, { nombre: this.titulo, alCerrar: () => this.avanzar() });

        const avanzarTexto = ev => { if (!ev.repeat) this.dialogo.alTocar(); };
        for (const tecla of ['SPACE', 'ENTER', 'E']) this.input.keyboard.on(`keydown-${tecla}`, avanzarTexto);
        this.input.keyboard.on('keydown-ESC', () => this.avanzar());
        this.events.once('shutdown', () => this.dialogo.cerrar());
    }

    avanzar() {
        if (this.continuado) return;
        this.continuado = true;
        this.time.delayedCall(0, () => this.scene.start(this.siguiente, this.datosSiguiente));
    }
}
