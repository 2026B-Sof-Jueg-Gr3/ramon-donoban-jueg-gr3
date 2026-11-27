// El aviso de interfaz que aparece cuando lo último ya se pudo leer y falta pulsar para pasar al informe. Es el mismo texto que usa la
// caja de los importantes (src/ui/DialogoPrincipal.js). Va abajo, al centro, fijo a la pantalla.
import { FUENTE } from '../ui/Boton.js';
import { etiquetar } from '../ui/etiquetas.js';

export const TEXTO_DE_CONTINUAR = '▸ E / Espacio / clic para continuar';

export default class AvisoDeContinuar {
    constructor(escena, { profundidad }) {
        this.escena = escena;
        this.profundidad = profundidad;
        this.visible = false;
        this.objetos = [];
    }

    mostrar() {
        if (this.visible) return;
        this.visible = true;
        const e = this.escena, x = e.scale.width / 2, y = e.scale.height - 48;
        const texto = e.add.text(x, y, TEXTO_DE_CONTINUAR, { fontFamily: FUENTE, fontSize: '16px', color: '#f0e6d3', resolution: 2 })
            .setOrigin(0.5).setScrollFactor(0).setDepth(this.profundidad + 1);
        const ancho = texto.width + 40, alto = texto.height + 18;
        const fondo = e.add.graphics().setScrollFactor(0).setDepth(this.profundidad);
        fondo.fillStyle(0x0b1420, 0.96).fillRoundedRect(x - ancho / 2, y - alto / 2, ancho, alto, 8);
        fondo.lineStyle(2, 0xc89012, 0.9).strokeRoundedRect(x - ancho / 2, y - alto / 2, ancho, alto, 8);
        // Para el revisor (F6): el fondo es un Graphics y no sabe medirse
        etiquetar(fondo, { tipo: 'control', grupo: 'continuar', rect: { x: x - ancho / 2, y: y - alto / 2, ancho, alto } });
        etiquetar(texto, { tipo: 'contenido', grupo: 'continuar' });
        this.objetos = [fondo, texto];
        for (const o of this.objetos) o.setAlpha(0);
        e.tweens.add({ targets: this.objetos, alpha: 1, duration: 250 });
    }
}
