// La linterna: oscuridad sobre toda la pantalla con la luz "recortada" (borrada) encima.
// La geometría (polígono de visibilidad, intensidad) se calcula en src/motor/Visibilidad.js; aquí solo se dibuja:
//   · halo: luz ambiente alrededor del inspector, en todas direcciones;
//   · cono: franjas desde un anillo interior hasta el borde de lo que se ve, con transparencia por vértice para que
//     el borde angular y la distancia caigan suavemente;
//   · caras: las paredes y muebles altos que la luz toca se iluminan en toda su cara visible, no solo en su borde;
//   · fuentes: luces pequeñas de la habitación (las velas de la cocina), que se apagan y se vuelven a encender.
// Todo se borra de una textura oscura con mezcla "ERASE", así que las sombras salen solas del polígono.
import { poligonoDeVisibilidad, factorAngular, caidaDeLuz, CONO_DE_LINTERNA } from '../motor/Visibilidad.js';
import { diferenciaDeAngulos } from '../motor/Geometria.js';
import { oscuridadCon, RELAMPAGO, BORRADO_DE_VENTANA } from '../motor/Luz.js';

const OSCURIDAD = { color: 0x02040a, alfa: 0.94 };
const INTENSIDAD_HALO = 0.9;
const PASO_BASE = 0.06;                 // radianes entre rayos de apoyo (aproxima el arco del alcance)
const PASOS_DEL_CONO = 43;              // rayos extra a cada lado dentro de la ventana del cono (≈1° cada uno)

export default class Linterna {
    constructor(escena, segmentos, { ancho, alto, profundidad }) {
        this.segmentos = segmentos;
        this.config = CONO_DE_LINTERNA;
        this.oscuridad = escena.add.renderTexture(0, 0, ancho, alto).setOrigin(0, 0).setScrollFactor(0).setDepth(profundidad)
            .setData('rev', { tipo: 'ignorar' });          // cubre toda la pantalla a propósito (revisor de la interfaz, F6)
        this.luzGrafica = escena.make.graphics({ x: 0, y: 0, add: false });
        const ventana = this.config.semiangulo + this.config.suavizado;
        this.desvios = Array.from({ length: PASOS_DEL_CONO * 2 + 1 }, (_, i) => ((i - PASOS_DEL_CONO) / PASOS_DEL_CONO) * ventana);
        this.fuentes = [];                // { x, y, radio, nivel 0..1 } en coordenadas del mundo
        this.luzDeFuente = escena.make.image({ x: 0, y: 0, key: 'luz-vela', add: false });
        this.luz = null;
        this.poligono = [];
        this.estadisticas = { vertices: 0, triangulos: 0, ms: 0 };
        this.triangulos = 0;
        this.claridad = 0;                // 0 a 1: la luz que entra con el cierre
        this.destello = 0;                // 0 a 1: un relámpago
        this.ventanas = [];               // centros de las ventanas (mundo): junto a ellas el destello aclara más
        this.luzDeVentana = null;
    }

    // origen y direccion en el mundo; camara para pasar a coordenadas de pantalla
    actualizar(origen, direccion, camara) {
        const inicio = performance.now();
        const { alcance, semiangulo, suavizado, radioHalo, radioInterior } = this.config;
        const ventana = semiangulo + suavizado;
        this.luz = { origen, direccion, semiangulo, suavizado, alcance };
        const poligono = poligonoDeVisibilidad(origen, this.segmentos, alcance, this.desvios.map(d => direccion + d), PASO_BASE);
        this.poligono = poligono;

        const g = this.luzGrafica;
        g.clear();
        this.triangulos = 0;
        const sx = camara.scrollX, sy = camara.scrollY;
        const ox = origen.x - sx, oy = origen.y - sy;
        const n = poligono.length;

        // Lo que se necesita de cada vértice: cuánta luz le toca como cono, como halo y en su cara
        const info = new Array(n);
        for (let i = 0; i < n; i++) {
            const v = poligono[i];
            const rel = diferenciaDeAngulos(v.angulo, direccion);
            const ang = factorAngular(rel, semiangulo, suavizado);
            const cono = ang * caidaDeLuz(v.distancia, alcance);
            const dh = Math.min(v.distancia, radioHalo);
            const halo = INTENSIDAD_HALO * Math.pow(1 - dh / radioHalo, 1.2);
            info[i] = {
                rel, ang, cono, halo, dh, d: v.distancia,
                x: v.x - sx, y: v.y - sy, ux: Math.cos(v.angulo), uy: Math.sin(v.angulo),
                cara: Math.max(cono, v.distancia < radioHalo ? halo : 0)
            };
        }

        // 1) Halo: abanico desde el origen hasta el radio del halo (o hasta donde lo corte una pared)
        for (let i = 0; i < n; i++) {
            const a = info[i], b = info[(i + 1) % n];
            this.triangulo(g, ox, oy, INTENSIDAD_HALO, ox + a.ux * a.dh, oy + a.uy * a.dh, a.halo, ox + b.ux * b.dh, oy + b.uy * b.dh, b.halo);
        }

        // 2) Cono: franjas entre un anillo interior y el borde visible, solo dentro de la ventana angular
        const dentro = [];
        for (let i = 0; i < n; i++) if (Math.abs(info[i].rel) <= ventana + 1e-9) dentro.push(i);
        dentro.sort((p, q) => info[p].rel - info[q].rel);
        const aInterior = caidaDeLuz(radioInterior, alcance);
        for (let k = 0; k + 1 < dentro.length; k++) {
            const a = info[dentro[k]], b = info[dentro[k + 1]];
            if (a.ang === 0 && b.ang === 0) continue;
            const ra = Math.min(radioInterior, a.d), rb = Math.min(radioInterior, b.d);
            const qax = ox + a.ux * ra, qay = oy + a.uy * ra, qbx = ox + b.ux * rb, qby = oy + b.uy * rb;
            const qa = a.ang * aInterior, qb = b.ang * aInterior;
            this.triangulo(g, qax, qay, qa, a.x, a.y, a.cono, b.x, b.y, b.cono);
            this.triangulo(g, qax, qay, qa, b.x, b.y, b.cono, qbx, qby, qb);
        }

        // 3) Caras: donde el borde visible es un segmento con extrusión (pared o mueble alto), se ilumina toda su cara
        for (let i = 0; i < n; i++) {
            const a = poligono[i], b = poligono[(i + 1) % n];
            if (a.segmento < 0 || a.segmento !== b.segmento) continue;
            const extrusion = this.segmentos[a.segmento].extrusion;
            if (!extrusion) continue;
            const ia = info[i], ib = info[(i + 1) % n];
            if (ia.cara < 0.01 && ib.cara < 0.01) continue;
            const ex = extrusion.dx * extrusion.largo, ey = extrusion.dy * extrusion.largo;
            this.triangulo(g, ia.x, ia.y, ia.cara, ib.x, ib.y, ib.cara, ia.x + ex, ia.y + ey, ia.cara);
            this.triangulo(g, ib.x, ib.y, ib.cara, ib.x + ex, ib.y + ey, ib.cara, ia.x + ex, ia.y + ey, ia.cara);
        }

        this.oscuridad.clear();
        this.oscuridad.fill(OSCURIDAD.color, oscuridadCon(OSCURIDAD.alfa, this.claridad, this.destello));
        this.oscuridad.erase(g, 0, 0);
        for (const f of this.fuentes) {
            if (f.nivel < 0.02) continue;
            this.luzDeFuente.setScale((f.radio * 2) / 192).setAlpha(Math.min(1, f.nivel));
            this.oscuridad.erase(this.luzDeFuente, f.x - sx, f.y - sy);
        }
        if (this.destello > 0) {
            // El relámpago entra por las ventanas (un círculo que se desvanece) y tiñe apenas de azul: ambiente, no una linterna
            for (const v of this.ventanas) {
                this.luzDeVentana.setAlpha(BORRADO_DE_VENTANA * this.destello);
                this.oscuridad.erase(this.luzDeVentana, v.x - sx, v.y - sy);
            }
            this.oscuridad.fill(0xbcd0ff, 0.05 * this.destello);
        }
        this.estadisticas = { vertices: n, triangulos: this.triangulos, ms: performance.now() - inicio };
    }

    // Las ventanas por las que entran los relámpagos: crea el degradado (una vez) con el que se aclara junto a ellas
    ponerVentanas(escena, ventanas) {
        this.ventanas = ventanas;
        if (!ventanas.length) return;
        const radio = RELAMPAGO.radioDeVentana, clave = 'luz-ventana';
        if (!escena.textures.exists(clave)) {
            const textura = escena.textures.createCanvas(clave, radio * 2, radio * 2);
            const ctx = textura.getContext();
            const g = ctx.createRadialGradient(radio, radio, 0, radio, radio, radio);
            g.addColorStop(0, 'rgba(255,255,255,1)');
            g.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, radio * 2, radio * 2);
            textura.refresh();
        }
        this.luzDeVentana = escena.make.image({ x: 0, y: 0, key: clave, add: false });
    }

    // Triángulo con una transparencia por vértice (v0 → esquina superior izquierda, v1 → superior derecha, v2 → inferior izquierda)
    triangulo(g, x0, y0, a0, x1, y1, a1, x2, y2, a2) {
        if (a0 < 0.004 && a1 < 0.004 && a2 < 0.004) return;
        g.fillGradientStyle(0xffffff, 0xffffff, 0xffffff, 0xffffff, a0, a1, a2, a2);
        g.fillTriangle(x0, y0, x1, y1, x2, y2);
        this.triangulos++;
    }
}
