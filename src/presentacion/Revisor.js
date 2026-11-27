// El revisor de la interfaz (tecla F6): recorre los objetos de interfaz visibles de la pantalla actual, mide cada uno con
// getBounds() y marca en rojo —y en la consola— cualquier par que se encime y cualquier cosa que salga de su recuadro o de
// la pantalla. Si no hay ningún problema, no muestra nada. La comprobación geométrica es la de src/motor/Maquetacion.js
// (encontrarProblemas), la misma que usan las pruebas automáticas.
//
// Qué mira: los textos y las imágenes visibles que están fijos a la pantalla, y todo lo que lleve la etiqueta 'rev'
// (src/ui/Pantalla.js → etiquetar). Lo que está dentro de una zona con desplazamiento (container con 'clip') se mide solo
// en su parte visible. Los fondos que se encima a propósito (marcos, velos) se etiquetan 'ignorar'.
import { encontrarProblemas, interseccion } from '../motor/Maquetacion.js';

const MIN_ALFA = 0.05;
const COLOR_DE_MARCA = 0xff2a2a;
const PROFUNDIDAD_DE_MARCA = 1e6;

const esTexto = o => o instanceof Phaser.GameObjects.Text || o instanceof Phaser.GameObjects.BitmapText;
const esImagen = o => o instanceof Phaser.GameObjects.Image && !(o instanceof Phaser.GameObjects.Sprite && o.anims?.isPlaying);

export default class Revisor {
    constructor(juego) {
        this.juego = juego;
        this.marcas = [];
        this.temporizador = null;
    }

    // F6 en cualquier pantalla. Lo que devuelve revisar() también se puede pedir desde la consola: window.__revisor()
    instalar() {
        window.addEventListener('keydown', ev => {
            if (ev.key !== 'F6' || ev.repeat) return;
            ev.preventDefault();
            this.revisar({ marcar: true });
        });
        window.__revisor = (opciones = {}) => this.revisar({ marcar: false, ...opciones });
    }

    escenasActivas() {
        return this.juego.scene.getScenes(true);
    }

    // Todos los elementos de interfaz visibles de una escena, listos para encontrarProblemas
    recoger(escena, recortados = []) {
        const elementos = [];
        const modales = [];                     // la capa de cada velo modal (un menú encima de otra pantalla)
        const sinCamara = escena.sys.settings.key === 'Habitacion';      // en la habitación solo cuenta lo fijo a la pantalla (el mundo no)
        const recorrer = (objeto, ancestros) => {
            if (!objeto.visible) return;
            const alfa = ancestros.reduce((a, c) => a * c.alpha, objeto.alpha);
            if (alfa < MIN_ALFA) return;
            const datos = objeto.getData?.('rev');
            if (datos?.modal) modales.push((ancestros[0] ?? objeto).depth);
            if (datos?.tipo === 'ignorar') return;
            if (objeto instanceof Phaser.GameObjects.Container) {
                for (const hijo of objeto.list) recorrer(hijo, [...ancestros, objeto]);
                return;
            }
            const raiz = ancestros[0] ?? objeto;
            if (sinCamara && raiz.scrollFactorX !== 0) return;
            if (!datos && !esTexto(objeto) && !esImagen(objeto)) return;
            let rect = this.rectDe(objeto, datos);
            if (!rect) return;
            for (const c of ancestros) {
                const clip = c.getData?.('clip');
                if (!clip) continue;
                // La zona solo se desplaza hacia arriba y abajo: lo que sobresale por un lado queda recortado para siempre
                const entero = rect;
                rect = interseccion(rect, clip);
                if (!rect) return;
                if (entero.x < clip.x - 1 || entero.x + entero.ancho > clip.x + clip.ancho + 1) recortados.push({ tipo: 'recortado', a: this.nombreDe(objeto), caja: clip, rect });
            }
            elementos.push({
                id: this.nombreDe(objeto), rect, tipo: datos?.tipo ?? 'contenido', grupo: datos?.grupo, dentroDe: datos?.dentroDe, objeto,
                capa: raiz.depth
            });
        };
        for (const o of escena.children.list) recorrer(o, []);
        // Lo que queda debajo de un velo modal está tapado a propósito: no cuenta
        if (modales.length) {
            const capa = Math.max(...modales);
            for (let i = elementos.length - 1; i >= 0; i--) if (elementos[i].capa < capa) elementos.splice(i, 1);
        }
        // Cada elemento con un nombre propio, aunque haya dos textos iguales
        const vistos = new Map();
        for (const e of elementos) {
            const n = (vistos.get(e.id) ?? 0) + 1;
            vistos.set(e.id, n);
            if (n > 1) e.id = `${e.id} #${n}`;
        }
        return elementos;
    }

    rectDe(objeto, datos) {
        if (datos?.rect) {                                               // un Graphics no mide sí mismo: se declara
            const m = objeto.getWorldTransformMatrix();
            const a = m.transformPoint(datos.rect.x, datos.rect.y), b = m.transformPoint(datos.rect.x + datos.rect.ancho, datos.rect.y + datos.rect.alto);
            return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), ancho: Math.abs(b.x - a.x), alto: Math.abs(b.y - a.y) };
        }
        if (typeof objeto.getBounds !== 'function') return null;
        const r = objeto.getBounds();
        return { x: r.x, y: r.y, ancho: r.width, alto: r.height };
    }

    nombreDe(objeto) {
        if (esTexto(objeto)) return `texto «${String(objeto.text).replace(/\s+/g, ' ').slice(0, 28)}»`;
        const grupo = objeto.getData?.('rev')?.grupo;
        const clave = objeto.texture?.key && objeto.texture.key !== '__DEFAULT' ? `:${objeto.texture.key}` : '';
        return `${objeto.type}${clave}${grupo ? ` [${grupo}]` : ''}`;
    }

    // Revisa la pantalla actual. marcar: pinta en rojo lo que está mal. Devuelve { escena, revisados, problemas: [...] }.
    revisar({ marcar = true, silencioso = false } = {}) {
        this.limpiar();
        const { width, height } = this.juego.scale;
        const pantalla = { x: 0, y: 0, ancho: width, alto: height };
        const resultado = { escenas: [], revisados: 0, problemas: [] };
        for (const escena of this.escenasActivas()) {
            const recortados = [];
            const elementos = this.recoger(escena, recortados);
            const problemas = [...encontrarProblemas(elementos, pantalla), ...recortados].map(p => ({ ...p, escena: escena.sys.settings.key }));
            resultado.escenas.push(escena.sys.settings.key);
            resultado.revisados += elementos.length;
            resultado.problemas.push(...problemas);
            if (problemas.length && marcar) this.marcar(escena, elementos, problemas);
            if (problemas.length && !silencioso) this.informar(escena.sys.settings.key, problemas);
        }
        return resultado;
    }

    informar(clave, problemas) {
        console.error(`[Revisor F6] ${problemas.length} problema(s) de maquetación en «${clave}»:`);
        for (const p of problemas) {
            if (p.tipo === 'solape') console.error(`  · SE ENCIMA: ${p.a}  ⟷  ${p.b}  (zona ${this.texto(p.rect)})`);
            else if (p.tipo === 'recortado') console.error(`  · RECORTADO POR UN LADO: ${p.a}  (zona ${this.texto(p.caja)})`);
            else console.error(`  · FUERA DE SU RECUADRO: ${p.a}  (recuadro ${this.texto(p.caja)})`);
        }
    }

    texto(r) { return r ? `${Math.round(r.x)},${Math.round(r.y)} ${Math.round(r.ancho)}×${Math.round(r.alto)}` : '?'; }

    // Rojo: el contorno de lo que está mal y, en los solapes, la zona que se encima rellena
    marcar(escena, elementos, problemas) {
        const g = escena.add.graphics().setScrollFactor(0).setDepth(PROFUNDIDAD_DE_MARCA);
        const rectDe = id => elementos.find(e => e.id === id)?.rect;
        for (const p of problemas) {
            if (p.tipo === 'solape') {
                for (const r of [rectDe(p.a), rectDe(p.b)]) if (r) { g.lineStyle(3, COLOR_DE_MARCA, 1); g.strokeRect(r.x, r.y, r.ancho, r.alto); }
                if (p.rect) { g.fillStyle(COLOR_DE_MARCA, 0.45); g.fillRect(p.rect.x, p.rect.y, p.rect.ancho, p.rect.alto); }
            } else {
                const r = rectDe(p.a);
                if (r) { g.lineStyle(3, COLOR_DE_MARCA, 1); g.strokeRect(r.x, r.y, r.ancho, r.alto); g.fillStyle(COLOR_DE_MARCA, 0.25); g.fillRect(r.x, r.y, r.ancho, r.alto); }
            }
        }
        this.marcas.push(g);
        this.temporizador = escena.time.delayedCall(12000, () => this.limpiar());
    }

    limpiar() {
        this.temporizador?.remove(false);
        this.temporizador = null;
        for (const g of this.marcas) if (g.scene) g.destroy();
        this.marcas = [];
    }
}
