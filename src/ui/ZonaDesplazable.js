// La zona de una pantalla que puede crecer (pruebas, pistas, opciones, textos largos): lo que no cabe se desplaza dentro
// de un recuadro con máscara. Rueda del ratón, teclado (la escena llama a desplazar / verElemento) e indicadores ▲ ▼ que
// aparecen solo cuando hay más contenido arriba o abajo (y que también se pueden pulsar). Se dibuja fijo a la pantalla.
// Las cuentas están en src/motor/Maquetacion.js (sin Phaser y con pruebas).
import { limitarDesplazamiento, desplazamientoParaVer, indicadores, visibleEnLaZona, interseccion } from '../motor/Maquetacion.js';
import { FUENTE } from './Boton.js';

const PASO_DE_RUEDA = 0.6;          // píxeles de desplazamiento por cada unidad de la rueda
const PASO_DE_FLECHA = 140;         // lo que baja o sube un clic en ▲ / ▼

export default class ZonaDesplazable {
    // profundidad: capa del contenido (los indicadores van una por encima)
    constructor(escena, { profundidad }) {
        this.escena = escena;
        this.rect = { x: 0, y: 0, ancho: 0, alto: 0 };
        this.contenido = 0;
        this.desplazamiento = 0;
        this.elementos = [];             // { fondo, y, alto }: filas interactivas del contenido
        this.contenedor = escena.add.container(0, 0).setScrollFactor(0).setDepth(profundidad);
        this.forma = escena.make.graphics({ add: false }).setScrollFactor(0);
        this.mascara = this.forma.createGeometryMask();
        this.arriba = this.crearIndicador('▲', profundidad + 1, -PASO_DE_FLECHA);
        this.abajo = this.crearIndicador('▼', profundidad + 1, PASO_DE_FLECHA);
        this.alRueda = (p, objetos, dx, dy) => {
            if (this.maximo > 0 && this.contiene(p.x, p.y)) this.desplazar(this.desplazamiento + dy * PASO_DE_RUEDA);
        };
        escena.input.on('wheel', this.alRueda);
    }

    crearIndicador(simbolo, profundidad, paso) {
        const texto = this.escena.add.text(0, 0, simbolo, { fontFamily: FUENTE, fontSize: '22px', color: '#e8c97a', backgroundColor: 'rgba(4,6,11,0.72)', padding: { x: 6, y: 2 }, resolution: 2 })
            .setOrigin(0.5).setScrollFactor(0).setDepth(profundidad).setVisible(false);
        texto.setInteractive({ useHandCursor: true });
        texto.on('pointerdown', () => this.desplazar(this.desplazamiento + paso));
        texto.setData('rev', { tipo: 'contenido' });
        return texto;
    }

    get maximo() { return Math.max(0, this.contenido - this.rect.alto); }
    get desplazable() { return this.maximo > 1; }

    contiene(x, y) {
        const r = this.rect;
        return x >= r.x && x <= r.x + r.ancho && y >= r.y && y <= r.y + r.alto;
    }

    // rect: lo que se ve · contenido: lo que mide todo lo de dentro · centroDeIndicadores: x del centro de ▲ y ▼
    colocar(rect, contenido, centroDeIndicadores) {
        this.rect = rect;
        this.contenido = contenido;
        this.forma.clear();
        this.forma.fillStyle(0xffffff);
        this.forma.fillRect(rect.x, rect.y, rect.ancho, rect.alto);
        if (this.desplazable) this.contenedor.setMask(this.mascara);
        else this.contenedor.clearMask();
        this.contenedor.setData('clip', rect);
        this.arriba.setPosition(centroDeIndicadores, rect.y + 16);
        this.abajo.setPosition(centroDeIndicadores, rect.y + rect.alto - 16);
        this.desplazar(this.desplazamiento);
    }

    agregar(objeto) {
        this.contenedor.add(objeto);
        return objeto;
    }

    // Una fila interactiva del contenido: solo recibe clics en la parte que se ve
    registrar(fondo, y, alto) {
        this.elementos.push({ fondo, y, alto });
    }

    desplazar(valor) {
        this.desplazamiento = limitarDesplazamiento(valor, this.contenido, this.rect.alto);
        this.contenedor.setPosition(this.rect.x, this.rect.y - this.desplazamiento);
        const { arriba, abajo } = indicadores(this.desplazamiento, this.contenido, this.rect.alto);
        this.arriba.setVisible(arriba);
        this.abajo.setVisible(abajo);
        this.actualizarEntradas();
    }

    // El elemento (y, alto en coordenadas del contenido) se desplaza hasta verse entero
    verElemento(elemento) {
        this.desplazar(desplazamientoParaVer(this.desplazamiento, this.rect.alto, this.contenido, elemento));
    }

    // Lo que queda del todo fuera no recibe clics; lo que se ve a medias, solo en su parte visible
    actualizarEntradas() {
        for (const e of this.elementos) {
            const entrada = e.fondo.input;
            if (!entrada) continue;
            const visible = visibleEnLaZona(this.desplazamiento, this.rect.alto, e);
            entrada.enabled = visible;
            if (!visible) continue;
            const arriba = Math.max(e.y, this.desplazamiento), abajo = Math.min(e.y + e.alto, this.desplazamiento + this.rect.alto);
            entrada.hitArea.y = arriba - e.y;
            entrada.hitArea.height = abajo - arriba;
        }
    }

    // El rectángulo que se ve en este momento de un elemento (para el revisor)
    visibleDe(rectEnPantalla) {
        return interseccion(rectEnPantalla, this.rect);
    }

    destruir() {
        this.escena.input.off('wheel', this.alRueda);
        this.contenedor.destroy();
        this.arriba.destroy();
        this.abajo.destroy();
        this.forma.destroy();
        this.elementos = [];
    }
}

