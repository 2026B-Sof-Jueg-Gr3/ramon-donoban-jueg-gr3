// Lo propio del Pasillo Oscuro (nivel 1): el fenómeno de las cortinas, el polvo que delata la corriente y las pistas
// visuales de su ayuda (destellos sobre las marcas de arrastre, la solapa de la pila, la corriente reforzada y el recorte, que es
// obligatorio, cuando todavía no se recogió).
import BrilloDePista from '../BrilloDePista.js';
import { acercar } from '../../motor/Movimiento.js';
import Cortinas from '../Cortinas.js';
import PistasDeAyuda from '../PistasDeAyuda.js';
import PolvoEnElHaz from '../PolvoEnElHaz.js';
import { PROFUNDIDAD } from '../profundidad.js';

const FUERZA_DE_AYUDA = 1.7;            // cuánto se refuerzan las cortinas y el polvo cuando la ayuda se activa (sutil)

export default class Pasillo {
    constructor(escena) {
        this.escena = escena;
        this.efecto = null;
        this.refuerzo = 1;                 // 1 normal; sube suavemente mientras la ayuda refuerza la corriente
    }

    crear() {
        const e = this.escena, mapa = e.mapa;
        this.cortinas = new Cortinas(e, mapa);
        const [corriente] = mapa.fenomenos.filter(f => f.props.efecto === 'corriente');
        const pila = mapa.muebles.find(m => m.nombre === 'pila-de-cajas');
        this.polvo = new PolvoEnElHaz(e, {
            origen: { x: corriente.x + corriente.ancho / 2, y: corriente.y + corriente.alto / 2 },
            profundidad: PROFUNDIDAD.marcas + 0.5,
            profundidadDelHilo: pila.y + pila.alto + 0.6
        });
        // Las pistas visuales de la ayuda: destellos sobre las marcas de arrastre y la solapa de la pila
        const arrastre = mapa.revelables.find(r => r.props.ref === 'n1-marca-arrastre');
        this.pistas = new PistasDeAyuda(e, { zona: arrastre, pila, profundidadSobreLaOscuridad: PROFUNDIDAD.oscuridad + 0.5 });
        this.recorte = new BrilloDePista(e, 'n1-pista-periodico');
    }

    aplicarAyuda(efecto) { this.efecto = efecto ?? null; }

    actualizar(dt, tiempo) {
        const luz = this.escena.linterna;
        this.refuerzo = acercar(this.refuerzo, this.efecto === 'corriente' ? FUERZA_DE_AYUDA : 1, dt, 1.2);
        this.cortinas.actualizar(dt, tiempo, this.refuerzo);
        this.pistas.actualizar(dt, tiempo, this.efecto, this.cortinas.empuje);
        this.polvo.actualizar(dt, tiempo, luz.luz, luz.poligono, this.refuerzo, this.pistas.atraccion);
        this.polvo.actualizarHilo(dt, luz.luz, luz.poligono, this.pistas.hilo);
        this.recorte.actualizar(dt, tiempo, this.efecto === 'recorte');
    }

    // Examinar las cortinas las agita; examinar la pila de cajas la sacude un poco
    alResponder(u, terminado) {
        const { ref } = u.objeto.props;
        if (ref === 'cortinas') this.cortinas.sacudir(1);
        if (ref === 'pila-de-cajas') {
            const pila = this.escena.imagenesDeMuebles['pila-de-cajas'];
            this.escena.tweens.add({ targets: pila, angle: { from: -1.2, to: 1.2 }, duration: 70, yoyo: true, repeat: 2, onComplete: () => pila.setAngle(0) });
        }
        terminado();
    }

    // El cierre: las cortinas se quedan quietas y las sombras no vuelven
    calmar() { this.cortinas.calmar(); }

    depurar() {
        const p = this.polvo.estadisticas();
        return [`refuerzo ${this.refuerzo.toFixed(2)}  ·  polvo ${p.visibles}/${p.vivas}`];
    }
}
