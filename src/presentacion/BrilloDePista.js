// La ayuda que señala una pista obligatoria todavía sin recoger (el recorte del pasillo, el diario del cuarto de los juguetes):
// un resplandor tenue que respira sobre ella, por encima de la oscuridad (se tiene que ver sin luz). Sin texto. Se apaga al
// recogerla.
import { acercar } from '../motor/Movimiento.js';
import { respirar, RESPIRACION } from '../motor/Respiracion.js';
import { PROFUNDIDAD } from './profundidad.js';

export default class BrilloDePista {
    // ref: la de la pista en el mapa (la propiedad "ref" del objeto)
    constructor(escena, ref) {
        this.usable = escena.usables.find(u => u.objeto.props.ref === ref) ?? null;
        this.nivel = 0;
        const o = this.usable?.objeto;
        this.brillo = o
            ? escena.add.image(o.x + o.ancho / 2, o.y + o.alto / 2, 'brillo').setBlendMode(Phaser.BlendModes.ADD).setTint(0xffe0a0)
                .setDepth(PROFUNDIDAD.oscuridad + 0.5).setAlpha(0).setDisplaySize(o.ancho * RESPIRACION.holgura, o.alto * RESPIRACION.holgura)
            : null;
    }

    // activo: la ayuda pide señalarla
    actualizar(dt, tiempo, activo) {
        if (!this.brillo) return;
        this.nivel = acercar(this.nivel, activo && !this.usable.recogido ? 1 : 0, dt, 1.2);
        const imagen = this.usable.imagen;
        if (imagen) this.brillo.setPosition(imagen.x, imagen.y);
        this.brillo.setAlpha(this.nivel * respirar(tiempo / 1000));
    }
}
