// Las pistas visuales de la ayuda, sin texto y sutiles. La ayuda (src/motor/Ayuda.js) solo dice qué reforzar; aquí se
// decide cómo se ve. Cada una crece y se apaga con suavidad:
//   · 'marcas': destellos cálidos muy tenues, sueltos, sobre la zona donde están las marcas de arrastre (no dibujan
//               su forma: son puntos que se encienden y se apagan en sitios distintos) y el polvo del haz se asienta
//               hacia esa zona. Las marcas en sí solo aparecen con la linterna, como siempre.
//   · 'pila':   la corriente de la ventana rota, que está detrás, hace aletear la solapa que cuelga por el frente de la
//               caja de arriba con cada ráfaga y le cae un hilo fino de polvo por el frente. Con luz se ven la solapa y el hilo; sin
//               luz, apenas la solapa (un resplandor mínimo por encima de la oscuridad). La pila no se mueve sola.
// La 'corriente' (cortinas y polvo hacia la ventana) la resuelve la escena con el refuerzo de siempre.
import { acercar } from '../motor/Movimiento.js';
import { CAJA_DE_ARRIBA } from './ArteProvisional.js';

const DESTELLOS = 6;
const ENCENDIDO = 0.6;            // 1 / segundos: con qué suavidad crecen y se apagan las pistas
const ALFA_DE_DESTELLO = 0.42;
const ALFA_FANTASMA = 0.2;        // la solapa sobre la oscuridad: apenas se distingue

export default class PistasDeAyuda {
    // zona: { x, y, ancho, alto } de las marcas de arrastre · pila: el mueble del mapa ({ x, y, ancho, alto, props: { alto } })
    // profundidadSobreLaOscuridad: capa justo encima de la oscuridad (para lo que se ve sin luz)
    constructor(escena, { zona, pila, profundidadSobreLaOscuridad }) {
        this.zona = zona;
        this.nivelDeMarcas = 0;
        this.nivelDePila = 0;
        this.destellos = Array.from({ length: DESTELLOS }, (_, i) => ({
            imagen: escena.add.image(0, 0, 'polvo').setBlendMode(Phaser.BlendModes.ADD).setTint(0xffd9a0)
                .setDepth(profundidadSobreLaOscuridad).setAlpha(0),
            x: 0, y: 0, t: 0, duracion: 2.4 + Math.random() * 1.4, espera: i * 0.7 + Math.random() * 0.5, escala: 1.5 + Math.random() * 0.8
        }));
        // La solapa y el hilo de la pila
        const base = pila.y + pila.alto;                                   // borde sur de la huella
        const arriba = base - pila.props.alto;                              // línea donde empieza el frente
        const yDeLaCaja = arriba + (pila.props.alto - 46) - CAJA_DE_ARRIBA.alto;   // borde de arriba de la caja de arriba
        this.bisagra = { x: pila.x + CAJA_DE_ARRIBA.x + CAJA_DE_ARRIBA.ancho / 2, y: yDeLaCaja + 1 };
        this.profundidadDeLaPila = pila.y + pila.alto;
        // La solapa cuelga por el frente de la caja de arriba, de su borde superior hacia abajo (así la ilumina la linterna)
        this.solapa = escena.add.image(this.bisagra.x, this.bisagra.y, 'solapa').setOrigin(0.5, 0).setDepth(this.profundidadDeLaPila + 0.4).setAlpha(0);
        this.resplandor = escena.add.image(this.bisagra.x, this.bisagra.y, 'solapa').setOrigin(0.5, 0).setBlendMode(Phaser.BlendModes.ADD)
            .setTint(0xc8b890).setDepth(profundidadSobreLaOscuridad).setAlpha(0);
        // El hilo de polvo cae desde la punta de la solapa por el frente de la pila. `sonda` es un punto delante de la pila,
        // en el suelo: si la luz llega ahí, la luz llega al frente (los puntos del frente quedan "dentro" del mueble).
        this.hilo = {
            x: this.bisagra.x, y: this.bisagra.y + 16, alto: 26, nivel: 0, rafaga: 0,
            sonda: { x: this.bisagra.x, y: pila.y + pila.alto + 3 }
        };
        this.atraccion = { x: zona.x + zona.ancho / 2, y: zona.y + zona.alto / 2, radio: Math.max(zona.ancho, zona.alto) / 2 + 40, nivel: 0 };
    }

    // efecto: el del refuerzo activo ('marcas', 'pila', 'corriente' u otro) o undefined · empuje: 0..1, cuánto empuja
    // la corriente en este momento (las ráfagas de las cortinas)
    actualizar(dt, tiempo, efecto, empuje = 0) {
        this.nivelDeMarcas = acercar(this.nivelDeMarcas, efecto === 'marcas' ? 1 : 0, dt, ENCENDIDO);
        this.nivelDePila = acercar(this.nivelDePila, efecto === 'pila' ? 1 : 0, dt, ENCENDIDO);
        this.atraccion.nivel = this.nivelDeMarcas;
        this.hilo.nivel = this.nivelDePila;
        this.hilo.rafaga = empuje;
        this.moverDestellos(dt);
        this.moverSolapa(tiempo / 1000, empuje);
    }

    // Puntos sueltos que se encienden y se apagan en sitios distintos de la zona; nunca forman las marcas
    moverDestellos(dt) {
        for (const d of this.destellos) {
            if (d.espera > 0) { d.espera -= dt; d.imagen.setAlpha(0); continue; }
            d.t += dt;
            if (d.t >= d.duracion) {
                d.t = 0;
                d.duracion = 2.4 + Math.random() * 1.4;
                d.x = this.zona.x + Math.random() * this.zona.ancho;
                d.y = this.zona.y + Math.random() * this.zona.alto;
                d.escala = 1.5 + Math.random() * 0.8;
            }
            const onda = Math.sin(Math.PI * d.t / d.duracion);
            d.imagen.setPosition(d.x, d.y).setScale(d.escala).setAlpha(this.nivelDeMarcas * ALFA_DE_DESTELLO * onda * onda);
        }
    }

    // La solapa aletea con cada ráfaga (se balancea y se encoge un poco al ladearse); entre ráfagas casi no se mueve
    moverSolapa(t, empuje) {
        const n = this.nivelDePila;
        const fuerza = n * (0.12 + 0.88 * empuje);
        const onda = Math.sin(t * 12);
        this.solapa.setScale(1, 1 - 0.28 * fuerza * Math.abs(onda)).setAngle(onda * 16 * fuerza).setAlpha(n);
        this.resplandor.setScale(1, this.solapa.scaleY).setAngle(this.solapa.angle).setAlpha(n * ALFA_FANTASMA);
    }

    // Para comprobar en el navegador
    get estado() {
        return { marcas: this.nivelDeMarcas, pila: this.nivelDePila, destellosVisibles: this.destellos.filter(d => d.imagen.alpha > 0.02).length };
    }
}
