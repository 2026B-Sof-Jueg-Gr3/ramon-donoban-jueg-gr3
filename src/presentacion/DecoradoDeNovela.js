// Lo que acompaña a la caja grande: la viñeta sobre el juego y el retrato del inspector a un lado, que entra con un fundido corto.
// Se queda mientras dure la pausa narrativa (al pasar de página o de línea solo cambia la expresión) y se quita al cerrarla.
import { texturaDeRetrato } from './Retrato.js';
import { etiquetar } from '../ui/etiquetas.js';
import { disposicionDeNovela, RETRATO } from '../motor/Novela.js';

const FUNDIDO_MS = 220;
const CLAVE_DE_VINETA = 'vineta';

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
    constructor(escena, { profundidad, lado, expresionDelTexto, oscurecer = () => 1 }) {
        this.oscurecer = oscurecer;
        this.escena = escena;
        this.profundidad = profundidad;
        this.lado = lado;
        this.expresionDelTexto = expresionDelTexto;
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
    }

    ocultar() {
        for (const o of [this.retrato, this.vineta]) {
            if (!o?.scene) continue;
            this.escena.tweens.killTweensOf(o);
            o.destroy();
        }
        this.retrato = this.vineta = null;
        this.expresion = null;
    }
}
