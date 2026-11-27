// Lo que acompaña a la caja grande: la viñeta sobre el juego y el retrato del inspector a un lado, que entra con un fundido corto.
// Se queda mientras dure la pausa narrativa (al pasar de página o de línea solo cambia la expresión) y se quita al cerrarla.
// Una línea puede traer además una ILUSTRACIÓN DE ESCENA (el cómplice en el suelo al ser capturado): va en el lado contrario al
// retrato, por detrás de la caja, y se quita con ella. Solo decora: no cambia nada del juego.
import { texturaDeRetrato } from './Retrato.js';
import { etiquetar } from '../ui/etiquetas.js';
import { disposicionDeNovela, RETRATO } from '../motor/Novela.js';
import { claveDeIlustracion } from '../motor/Expresiones.js';

const FUNDIDO_MS = 220;
const CLAVE_DE_VINETA = 'vineta';
const ILUSTRACION = Object.freeze({ alto: 440, margen: 16, bajoLaCaja: 120 });   // px; los pies quedan detrás de la caja

function generarVineta(escena, ancho, alto) {
    if (escena.textures.exists(CLAVE_DE_VINETA)) return;
    const textura = escena.textures.createCanvas(CLAVE_DE_VINETA, ancho, alto);
    const ctx = textura.getContext();
    const g = ctx.createRadialGradient(ancho / 2, alto * 0.42, alto * 0.28, ancho / 2, alto * 0.5, ancho * 0.66);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(0.6, 'rgba(0,0,0,0.45)');
    g.addColorStop(1, 'rgba(0,0,0,0.88)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, ancho, alto);
    textura.refresh();
}

export default class DecoradoDeNovela {
    // profundidad: la del velo de la caja · lado(): 'izquierda' | 'derecha' · expresionDelTexto(texto)
    // ilustracionDelTexto(texto): el nombre de la ilustración de escena de esa línea, o null
    constructor(escena, { profundidad, lado, expresionDelTexto, oscurecer = () => 1, ilustracionDelTexto = () => null }) {
        this.oscurecer = oscurecer;
        this.escena = escena;
        this.profundidad = profundidad;
        this.lado = lado;
        this.expresionDelTexto = expresionDelTexto;
        this.ilustracionDelTexto = ilustracionDelTexto;
        this.ilustracion = null;           // { imagen, nombre }
        this.retrato = null;
        this.vineta = null;
        this.expresion = null;
    }

    mostrar(texto) {
        const e = this.escena, { width, height } = e.scale;
        const expresion = this.expresionDelTexto(texto) ?? 'neutral';
        this.expresion = expresion;
        if (!e.textures) return;          // sin gestor de texturas (pruebas en Node) solo se decide la expresión
        const { retrato } = disposicionDeNovela(width, height, this.lado());
        const clave = texturaDeRetrato(e, expresion);
        if (!this.vineta) {
            generarVineta(e, width, height);
            this.vineta = e.add.image(0, 0, CLAVE_DE_VINETA).setOrigin(0).setScrollFactor(0).setDepth(this.profundidad + 0.5).setAlpha(0);
            etiquetar(this.vineta, { tipo: 'ignorar' });
            e.tweens.add({ targets: this.vineta, alpha: this.oscurecer(), duration: FUNDIDO_MS });
        }
        const x = retrato.x + RETRATO.ancho / 2, y = retrato.y + RETRATO.alto;
        if (!this.retrato) {
            this.retrato = e.add.image(x, y, clave).setOrigin(0.5, 1).setDisplaySize(RETRATO.ancho, RETRATO.alto).setScrollFactor(0).setDepth(this.profundidad + 1).setAlpha(0);
            etiquetar(this.retrato, { tipo: 'contenido' });
            e.tweens.add({ targets: this.retrato, alpha: 1, duration: FUNDIDO_MS });
        } else {
            this.retrato.setTexture(clave).setDisplaySize(RETRATO.ancho, RETRATO.alto).setPosition(x, y);
        }
        this.mostrarIlustracion(this.ilustracionDelTexto(texto));
    }

    // La ilustración de la línea, en el lado contrario al retrato. Entra subiendo un poco y con un temblor corto (el susto); si la
    // línea siguiente no la trae, se va con un fundido.
    mostrarIlustracion(nombre) {
        const e = this.escena;
        if (this.ilustracion?.nombre === nombre) return;
        this.quitarIlustracion(true);
        const clave = nombre && claveDeIlustracion(nombre);
        if (!clave || !e.textures.exists(clave)) return;
        const { width, height } = e.scale;
        const fuente = e.textures.get(clave).getSourceImage();
        const alto = ILUSTRACION.alto, ancho = Math.round(alto * fuente.width / fuente.height);
        const izquierda = this.lado() !== 'izquierda';                      // el retrato va de un lado; la ilustración, del otro
        const x = izquierda ? ILUSTRACION.margen + ancho / 2 : width - ILUSTRACION.margen - ancho / 2;
        const y = height - ILUSTRACION.bajoLaCaja;
        const imagen = e.add.image(x, y + 24, clave).setOrigin(0.5, 1).setDisplaySize(ancho, alto)
            .setScrollFactor(0).setDepth(this.profundidad + 0.9).setAlpha(0);
        etiquetar(imagen, { tipo: 'ignorar' });              // va por detrás de la caja a propósito: no es texto que leer
        e.tweens.add({ targets: imagen, alpha: 1, y, duration: 320, ease: 'Sine.easeOut' });
        e.tweens.add({ targets: imagen, x: x + 4, duration: 45, yoyo: true, repeat: 5, delay: 320, ease: 'Sine.easeInOut' });
        this.ilustracion = { imagen, nombre };
    }

    quitarIlustracion(conFundido = false) {
        const imagen = this.ilustracion?.imagen;
        this.ilustracion = null;
        if (!imagen?.scene) return;
        this.escena.tweens.killTweensOf(imagen);
        if (!conFundido) { imagen.destroy(); return; }
        this.escena.tweens.add({ targets: imagen, alpha: 0, duration: FUNDIDO_MS, onComplete: () => imagen.destroy() });
    }

    ocultar() {
        this.quitarIlustracion();
        for (const o of [this.retrato, this.vineta]) {
            if (!o?.scene) continue;
            this.escena.tweens.killTweensOf(o);
            o.destroy();
        }
        this.retrato = this.vineta = null;
        this.expresion = null;
    }
}
