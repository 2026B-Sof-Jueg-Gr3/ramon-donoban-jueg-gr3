// El armado en flujo de una pantalla de interfaz (la libreta, la deducción, el informe, la pausa, los menús…). Cada pantalla
// pide sus bloques (textos, filas, botones) en tres zonas —cabecera, cuerpo y pie— y Pantalla los mide, los pasa a
// src/motor/Maquetacion.js (que decide dónde va cada uno según su alto real) y los coloca. Nunca hay una posición
// vertical fija. La cabecera y el pie quedan siempre a la vista; el cuerpo, si no cabe, se desplaza dentro de su zona.
//
// Un bloque es { id, alto, ancho?, alinear?, cede?, antes?, objetos, mover(x, y, ancho), item? }: lo que dibuja, su alto
// real y cómo se coloca. Todos los objetos llevan una etiqueta para el revisor (F6): su tipo y a qué control pertenecen.
import { FUENTE } from './Boton.js';
import ZonaDesplazable from './ZonaDesplazable.js';
import { etiquetar } from './etiquetas.js';
import { maquetarPantalla, repartirEnFilas, MARGEN_POR_DEFECTO, HUECO_POR_DEFECTO } from '../motor/Maquetacion.js';

export const COLOR = { fondo: 0x0b1420, borde: 0xc89012, fila: 0x16263a, filaBorde: 0x3a5570, foco: 0x24405c, focoBorde: 0xffd060, marcada: 0x1f4a35, marcadaBorde: 0x4fcf86, primario: 0x1f6f3f };
export const TEXTO = { normal: '#f0e6d3', tenue: '#8aabbf', ambar: '#ffd060', error: '#ff9a7a', acierto: '#4fcf86' };
export const FUENTE_EMOJI = '"Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';

export { etiquetar };

export default class Pantalla {
    // caja: el recuadro { x, y, ancho, alto } · profundidad: capa base (el velo; el recuadro +1; lo de dentro +3)
    // velo: oscurece y bloquea lo de detrás · prefijo: distingue los ids de los grupos entre pantallas
    constructor(escena, { caja, margen = MARGEN_POR_DEFECTO, hueco = HUECO_POR_DEFECTO, profundidad = 0, velo = false, marco = true, ranura = 0, minimoCuerpo, centrarCuerpo = false, prefijo = 'p', estilo = {} }) {
        this.centrarCuerpo = centrarCuerpo;
        this.escena = escena;
        this.caja = caja;
        this.margen = margen;
        this.hueco = hueco;
        this.profundidad = profundidad;
        this.ranura = ranura;
        this.minimoCuerpo = minimoCuerpo;
        this.prefijo = prefijo;
        this.objetos = [];
        this.items = [];
        this.foco = 0;
        this.arriba = [];
        this.centro = [];
        this.abajo = [];
        this.ancho = caja.ancho - 2 * margen.x;            // el ancho de lo de la cabecera y el pie
        this.anchoCuerpo = this.ancho - ranura;           // el ancho de lo de la zona con desplazamiento
        this.zona = new ZonaDesplazable(escena, { profundidad: profundidad + 3 });
        if (velo) {
            const { width, height } = escena.scale;
            this.nuevo(escena.add.rectangle(0, 0, width, height, 0x000000, 0.78).setOrigin(0).setInteractive(), 0).setData('rev', { tipo: 'ignorar', modal: true });
        }
        if (marco) {
            this.nuevo(escena.add.rectangle(caja.x, caja.y, caja.ancho, caja.alto, estilo.fondo ?? COLOR.fondo, estilo.opacidad ?? 0.98).setOrigin(0).setStrokeStyle(3, estilo.borde ?? COLOR.borde, 0.95), 1)
                .setData('rev', { tipo: 'ignorar', marco: true });
        }
    }

    nuevo(objeto, extra = 3) {
        objeto.setScrollFactor(0).setDepth(this.profundidad + extra);
        this.objetos.push(objeto);
        return objeto;
    }

    // ── Bloques ──────────────────────────────────────────────────────────────

    // Un texto que se parte en líneas al ancho que le toque. centrado: centra las líneas en todo el ancho.
    texto(id, contenido, { size = 18, color = TEXTO.normal, espacio = 0, centrado = false, emoji = false, ancho = this.ancho, antes = 0, cede = false } = {}) {
        const t = this.crearTexto(contenido, { size, color, espacio, centrado, emoji, ancho });
        etiquetar(t, { tipo: 'contenido', dentroDe: this.caja });
        return { id, alto: t.height, cede, antes, objetos: [t], mover: (x, y) => t.setPosition(x, y), texto: t };
    }

    // Un texto que cabe: si no cabe a este tamaño, la letra se achica hasta que quepa o llegue al mínimo
    textoAjustado(id, contenido, { size = 34, minimo = 20, altoMaximo = 140, ...opciones } = {}) {
        const b = this.texto(id, contenido, { ...opciones, size });
        let tamano = size;
        while (b.texto.height > altoMaximo && tamano > minimo) {
            tamano--;
            b.texto.setFontSize(`${tamano}px`);
            b.texto.setWordWrapWidth(opciones.ancho ?? this.ancho, true);
        }
        b.alto = b.texto.height;
        return b;
    }

    linea() {
        const r = this.nuevo(this.escena.add.rectangle(0, 0, this.ancho, 2, COLOR.borde, 0.5).setOrigin(0), 2);
        etiquetar(r, { tipo: 'ignorar' });
        return { id: `linea${this.objetos.length}`, alto: 2, objetos: [r], mover: (x, y, ancho) => r.setPosition(x, y).setSize(ancho, 2) };
    }

    crearTexto(contenido, { size = 18, color = TEXTO.normal, espacio = 0, centrado = false, emoji = false, ancho }) {
        const t = this.escena.add.text(0, 0, contenido, {
            fontFamily: emoji ? `${FUENTE}, ${FUENTE_EMOJI}` : FUENTE, fontSize: `${size}px`, color, lineSpacing: espacio, resolution: 2,
            padding: emoji ? { top: 4, bottom: 4 } : undefined,
            wordWrap: ancho ? { width: ancho, useAdvancedWrap: true } : undefined,
            align: centrado ? 'center' : 'left', fixedWidth: centrado && ancho ? ancho : 0
        });
        return this.nuevo(t, 3);
    }

    // Un botón, una opción o una fila de prueba: todos se enfocan y se eligen igual (ratón o teclado).
    //   estilo 'boton' (texto centrado) | 'opcion' (texto largo a la izquierda) | 'prueba' (casilla, nombre y detalle)
    // La altura sale del texto: nunca se corta ni se sale de su fondo.
    control(id, texto, { estilo = 'boton', detalle = null, ancho = this.anchoCuerpo, alto = 52, primario = false, alActivar, tamano = 20, centrar = true } = {}) {
        const grupo = `${this.prefijo}:${id}`;
        const esFila = estilo === 'prueba', esOpcion = estilo === 'opcion';
        const margenIzq = esFila ? 54 : 24, margenDer = 16, aire = 10;
        const anchoDeTexto = ancho - margenIzq - margenDer;
        const etiqueta = esFila || esOpcion
            ? this.crearTexto(texto, { size: esOpcion ? 22 : 19, color: detalle ? TEXTO.ambar : TEXTO.normal, ancho: anchoDeTexto })
            : this.crearTexto(texto, { size: tamano, ancho: ancho - 2 * margenIzq, centrado: true });
        const cuerpo = detalle ? this.crearTexto(detalle, { size: 13, color: TEXTO.tenue, ancho: anchoDeTexto }) : null;
        const casilla = esFila ? this.crearTexto('☐', { size: 26 }) : null;
        const contenido = etiqueta.height + (cuerpo ? 4 + cuerpo.height : 0);
        const altoReal = Math.max(alto, Math.ceil(contenido + 2 * aire));
        const fondo = this.escena.add.rectangle(0, 0, ancho, altoReal, COLOR.fila).setOrigin(0).setStrokeStyle(2, COLOR.filaBorde);
        fondo.setInteractive(new Phaser.Geom.Rectangle(0, 0, ancho, altoReal), Phaser.Geom.Rectangle.Contains);
        fondo.input.cursor = 'pointer';
        this.nuevo(fondo, 2);
        etiquetar(fondo, { tipo: 'control', grupo });
        for (const o of [etiqueta, cuerpo, casilla]) if (o) etiquetar(o, { tipo: 'contenido', grupo });

        const item = {
            id, nombre: texto, habilitado: true, marcado: false, enfocado: false, fondo, y: 0, alto: altoReal, enZona: false,
            activar: () => { if (item.habilitado) alActivar?.(); },
            habilitar: valor => { item.habilitado = valor; item.pintar(item.enfocado); },
            marcarCon: valor => { item.marcado = valor; casilla?.setText(valor ? '☑' : '☐'); item.pintar(item.enfocado); },
            pintar: enfocado => {
                item.enfocado = enfocado;
                fondo.setFillStyle(enfocado ? COLOR.foco : item.marcado ? COLOR.marcada : primario && item.habilitado ? COLOR.primario : COLOR.fila);
                fondo.setStrokeStyle(enfocado ? 3 : 2, enfocado ? COLOR.focoBorde : item.marcado ? COLOR.marcadaBorde : COLOR.filaBorde);
                const alfa = item.habilitado ? 1 : 0.4;
                for (const o of [fondo, etiqueta, cuerpo, casilla]) o?.setAlpha(alfa);
            }
        };
        fondo.on('pointerover', () => { const k = this.items.indexOf(item); if (k >= 0) this.enfocar(k); });
        fondo.on('pointerdown', () => item.activar());
        this.items.push(item);
        item.pintar(false);

        return {
            id, alto: altoReal, ancho, alinear: centrar ? 'centro' : 'izquierda', item,
            objetos: [fondo, etiqueta, ...(cuerpo ? [cuerpo] : []), ...(casilla ? [casilla] : [])],
            mover: (x, y) => {
                fondo.setPosition(x, y);
                if (esFila || esOpcion) {
                    const alto = etiqueta.height + (cuerpo ? 4 + cuerpo.height : 0);
                    const y0 = y + (altoReal - alto) / 2;
                    etiqueta.setPosition(x + margenIzq, y0);
                    cuerpo?.setPosition(x + margenIzq, y0 + etiqueta.height + 4);
                    casilla?.setPosition(x + 14, y + (altoReal - casilla.height) / 2);
                } else {
                    etiqueta.setPosition(x + margenIzq, y + (altoReal - etiqueta.height) / 2);
                }
            }
        };
    }

    // Varios botones en una misma línea (o en las que hagan falta si no caben), centrados
    botones(id, especificaciones, { ancho = 320, alto = 52, hueco = 24, anchoDeFila = this.ancho } = {}) {
        const hijos = especificaciones.map((e, i) => this.control(`${id}${i}`, e.texto, { ancho: e.ancho ?? ancho, alto, primario: e.primario, alActivar: e.alActivar, centrar: false }));
        const reparto = repartirEnFilas(hijos.map(h => ({ id: h.id, ancho: h.ancho, alto: h.alto })), { ancho: anchoDeFila, hueco });
        return {
            id, alto: reparto.alto, objetos: hijos.flatMap(h => h.objetos), hijos,
            mover: (x, y, anchoReal) => {
                const otro = repartirEnFilas(hijos.map(h => ({ id: h.id, ancho: h.ancho, alto: h.alto })), { x, y, ancho: anchoReal, hueco });
                for (const c of otro.colocados) hijos.find(h => h.id === c.id).mover(c.x, c.y);
            }
        };
    }

    // Un objeto ya armado (un botón, una imagen): ancho y alto son lo que mide. Su centro es el de su contenedor si es un Container.
    objeto(id, objeto, { ancho, alto, antes = 0, alinear = 'centro', centro = true }) {
        objeto.setScrollFactor?.(0);
        objeto.setDepth?.(this.profundidad + 3);
        this.objetos.push(objeto);
        return { id, alto, ancho, antes, alinear, objetos: [objeto], mover: (x, y) => objeto.setPosition(centro ? x + ancho / 2 : x, centro ? y + alto / 2 : y) };
    }

    // Un bloque propio: una columna o varias de cosas que se arman a mano (la libreta). mover(x, y, ancho) los coloca.
    propio(id, alto, objetos, mover) {
        return { id, alto, objetos, mover };
    }

    // ── Zonas ────────────────────────────────────────────────────────────────

    enCabecera(...bloques) { this.arriba.push(...bloques); }
    enCuerpo(...bloques) { this.centro.push(...bloques); }
    enPie(...bloques) { this.abajo.push(...bloques); }

    // Mide, maqueta y coloca. Devuelve lo que decidió la función pura (para las pruebas y el revisor).
    componer() {
        const todos = [...this.arriba, ...this.centro, ...this.abajo];
        const disposicion = maquetarPantalla({
            caja: this.caja, margen: this.margen, hueco: this.hueco, ranura: this.ranura, minimoCuerpo: this.minimoCuerpo, centrarCuerpo: this.centrarCuerpo,
            cabecera: this.arriba.map(({ id, alto, ancho, alinear, antes, cede }) => ({ id, alto, ancho, alinear, antes, cede })),
            cuerpo: this.centro.map(({ id, alto, ancho, alinear, antes }) => ({ id, alto, ancho, alinear, antes })),
            pie: this.abajo.map(({ id, alto, ancho, alinear, antes }) => ({ id, alto, ancho, alinear, antes }))
        });
        const z = disposicion.zona;
        const enZona = [...this.arriba.filter(b => disposicion.movidos.includes(b.id)), ...this.centro];
        for (const b of todos) {
            if (disposicion.movidos.includes(b.id)) continue;
            const c = disposicion.colocados[b.id];
            if (c) b.mover(c.x, c.y, c.ancho);
        }
        for (const b of enZona) {
            const c = disposicion.cuerpo[b.id];
            for (const o of b.objetos) this.zona.agregar(o);
            b.mover(c.x, c.y, c.ancho);
            const items = b.item ? [b.item] : [];
            for (const item of items) {
                item.enZona = true;
                item.y = c.y;
                this.zona.registrar(item.fondo, c.y, item.alto);
            }
        }
        const centroDeIndicadores = this.caja.x + this.caja.ancho - this.margen.x / 2;
        this.zona.colocar({ x: z.x, y: z.y, ancho: z.ancho, alto: z.alto }, z.contenido, this.ranura ? z.x + z.ancho + this.ranura / 2 : centroDeIndicadores);
        this.disposicion = disposicion;
        return disposicion;
    }

    // ── Foco y desplazamiento con el teclado ─────────────────────────────────

    enfocar(i) {
        this.foco = i;
        this.items.forEach((item, k) => item.pintar(k === i));
        const item = this.items[i];
        if (item?.enZona) this.zona.verElemento({ y: item.y, alto: item.alto });   // el elegido siempre se ve entero
    }

    moverFoco(paso) {
        const n = this.items.length;
        if (n) this.enfocar((this.foco + paso + n) % n);
    }

    // paso: ±1 línea · ±2 página · 'inicio' / 'fin'
    desplazar(paso) {
        const z = this.zona;
        if (paso === 'inicio') z.desplazar(0);
        else if (paso === 'fin') z.desplazar(z.maximo);
        else z.desplazar(z.desplazamiento + (Math.abs(paso) === 2 ? Math.sign(paso) * z.rect.alto * 0.85 : paso * 70));
    }

    get desplazable() { return this.zona.desplazable; }

    destruir() {
        for (const o of this.objetos) if (o.scene) o.destroy();
        this.zona.destruir();
        this.objetos = [];
        this.items = [];
    }
}
