import PresentacionTemporal from './PresentacionTemporal.js';
import { TIEMPOS } from './configuracion.js';

// Aparición temporal de una marca de investigación (huellas, lupa…) al descubrirse.
// Aparece, permanece TIEMPOS.marca.permanencia y desaparece. La marca sigue existiendo en el escenario.
// Solo termina por tiempo o porque se la retire de forma explícita (usa la validez por defecto de PresentacionTemporal).
export default class AparicionDeMarca extends PresentacionTemporal {
    // dibujo: { x, y, icono, crearIcono(x, y, icono) } — posición en píxeles de la escena y cómo dibujar el icono
    constructor(escena, contenedor, marca, dibujo) {
        super(escena, contenedor, `marca:${marca.id}`, TIEMPOS.marca);
        this.marca = marca;
        this.dibujo = dibujo;
    }

    crearVista() {
        const { x, y, icono, crearIcono } = this.dibujo;
        this.brillo = this.escena.add.circle(0, 0, 24, 0xffd27a, 0.25);
        const simbolo = crearIcono(0, 0, icono);
        this.partes = [this.brillo];
        return this.escena.add.container(x, y, [this.brillo, simbolo]).setAlpha(0).setScale(0.4);
    }

    animarEntrada(duracion) {
        this.escena.tweens.add({ targets: this.vista, alpha: 0.9, scale: 1, duration: duracion, ease: 'Back.easeOut' });
        this.escena.tweens.add({ targets: this.brillo, alpha: 0.08, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }

    animarSalida(duracion, alTerminar) {
        this.escena.tweens.add({ targets: this.vista, alpha: 0, scale: 0.6, duration: duracion, ease: 'Sine.easeIn', onComplete: alTerminar });
    }
}
