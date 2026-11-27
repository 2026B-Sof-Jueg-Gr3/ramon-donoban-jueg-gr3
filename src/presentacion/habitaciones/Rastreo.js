// Lo propio de la Puerta con Candado (nivel 3, rastreo y acceso): el candado nuevo que brilla bajo la luz, el polvo en el haz que deja ver
// el camino limpio (allí no hay polvo) y los efectos de su ayuda, todos sin texto:
//   · polvo:  el polvo deriva a lo largo del camino limpio (de oeste a este, hacia la puerta);
//   · caja:   la caja junto a la puerta proyecta un brillo en su borde inferior;
//   · carta:  la carta se agita con la corriente (el papel que asoma bajo la puerta);
//   · final:  después de deducir, brillan la llave y la caja de herramientas (con lo que se abre la puerta).
// La acción final (abrir la puerta con E) la maneja la escena común; aquí solo se anima.
import { acercar } from '../../motor/Movimiento.js';
import { respirar, RESPIRACION } from '../../motor/Respiracion.js';
import PolvoEnElHaz from '../PolvoEnElHaz.js';
import { PROFUNDIDAD } from '../profundidad.js';

const DURACION_DE_ABRIR = 800;

export default class Rastreo {
    constructor(escena) {
        this.escena = escena;
        this.efecto = null;
        this.niveles = { polvo: 0, caja: 0, carta: 0, final: 0 };
    }

    crear() {
        const e = this.escena, mapa = e.mapa;
        const puerta = mapa.interactuables.find(o => o.props.ref === 'puerta-candado');
        this.camino = mapa.revelables.find(r => r.props.ref === 'n3-camino');
        this.cajaDeLaPuerta = mapa.muebles.find(m => m.nombre === 'caja-puerta');
        // El polvo del haz: por todas partes menos sobre el camino limpio (allí se ve el suelo)
        this.polvo = new PolvoEnElHaz(e, {
            origen: { x: puerta.x + puerta.ancho / 2, y: puerta.y + puerta.alto }, profundidad: PROFUNDIDAD.marcas + 0.5,
            profundidadDelHilo: PROFUNDIDAD.marcas + 0.6, cantidad: 110
        });
        const brillo = (escala, color = 0xfff0c0) => e.add.image(0, 0, 'polvo').setBlendMode(Phaser.BlendModes.ADD).setTint(color).setDepth(PROFUNDIDAD.marcas + 0.8).setAlpha(0).setScale(escala);
        // El candado: un destello bajo la luz (va por debajo de la oscuridad, así solo se ve si la luz lo toca)
        this.imagenDeLaPuerta = e.usables.find(u => u.objeto.props.ref === 'puerta-candado')?.imagen;
        const [candado] = mapa.fenomenos.filter(f => f.props.efecto === 'candado');
        this.candado = brillo(3, 0xe8f0ff).setPosition(candado.x + candado.ancho / 2, candado.y + candado.alto / 2).setDepth((this.imagenDeLaPuerta?.depth ?? 300) + 0.4);
        e.registrarSoloConLuz(this.candado);
        // La ayuda
        // Las ayudas van por encima de la oscuridad (se tienen que ver sin luz): un resplandor tenue que respira, apenas mayor que lo que señala
        const ayuda = (ancho, alto, color = 0xffe0a0) => e.add.image(0, 0, 'brillo').setBlendMode(Phaser.BlendModes.ADD).setTint(color).setDepth(PROFUNDIDAD.oscuridad + 0.5).setAlpha(0).setDisplaySize(ancho, alto);
        const junto = objeto => ayuda(objeto.ancho * RESPIRACION.holgura, objeto.alto * RESPIRACION.holgura);
        this.corriente = Array.from({ length: 9 }, () => ayuda(18, 13));
        this.brilloDeLaCaja = ayuda(this.cajaDeLaPuerta.ancho * RESPIRACION.holgura, 20, 0xffd9a0);       // su borde de abajo
        this.brilloDeLaCarta = junto(e.usables.find(u => u.objeto.props.ref === 'n3-pista-carta').objeto);
        const carta = e.usables.find(u => u.objeto.props.ref === 'n3-pista-carta');
        this.carta = carta?.imagen;
        this.cartaBase = this.carta ? { x: this.carta.x, y: this.carta.y } : null;
        this.destellos = ['n3-pista-llave', 'n3-mueble-herramientas'].map(ref => e.usables.find(x => x.objeto.props.ref === ref)).map(u => ({ u, b: junto(u.objeto) }));
    }

    aplicarAyuda(efecto) { this.efecto = efecto ?? null; }

    actualizar(dt, tiempo) {
        const e = this.escena, t = tiempo / 1000;
        const luz = e.linterna;
        this.polvo.actualizar(dt, tiempo, luz.luz, luz.poligono, 1);
        const c = this.camino;
        for (const p of this.polvo.particulas) {
            if (p.x > c.x && p.x < c.x + c.ancho && p.y > c.y && p.y < c.y + c.alto) { p.alfa = 0; p.imagen.setAlpha(0); }
        }
        this.candado.setAlpha(0.25 + 0.5 * Math.pow(Math.max(0, Math.sin(t * 2.6)), 4)).setScale(2.6 + 0.8 * Math.sin(t * 5));
        for (const k of Object.keys(this.niveles)) this.niveles[k] = acercar(this.niveles[k], this.efecto === k ? 1 : 0, dt, 1.2);

        // polvo: partículas que van por el camino hacia la puerta
        this.corriente.forEach((b, i) => {
            const s = (t * 0.22 + i / this.corriente.length) % 1;
            b.setPosition(c.x + 30 + s * (c.ancho - 60), c.y + c.alto / 2 + Math.sin(t * 2 + i * 2) * 8).setAlpha(this.niveles.polvo * respirar(t) * (0.4 + 0.6 * Math.sin(Math.PI * s)));
        });
        // caja: un brillo en el borde inferior
        const m = this.cajaDeLaPuerta;
        this.brilloDeLaCaja.setPosition(m.x + m.ancho / 2, m.y + m.alto - 2).setAlpha(this.niveles.caja * respirar(t));
        // carta: se agita con la corriente
        if (this.carta && this.cartaBase && this.carta.visible) {
            const f = this.niveles.carta;
            this.carta.setPosition(this.cartaBase.x + Math.sin(t * 9) * 3 * f, this.cartaBase.y + Math.sin(t * 13) * 1.2 * f).setAngle(Math.sin(t * 8) * 9 * f);
            this.brilloDeLaCarta.setPosition(this.cartaBase.x, this.cartaBase.y).setAlpha(f * respirar(t));
        } else {
            this.brilloDeLaCarta.setAlpha(0);
        }
        // final: brillan la llave y la caja de herramientas
        for (const { u, b } of this.destellos) {
            const visible = u && !u.recogido && u.imagen?.visible !== false;
            b.setPosition(u?.imagen?.x ?? 0, u?.imagen?.y ?? 0).setAlpha(visible ? this.niveles.final * respirar(t) : 0);
        }
    }

    // La puerta se abre con una animación fija (una sola pulsación de E); la caja de debajo se sacude un poco al mirar debajo
    alResponder(u, terminado) {
        const { ref, accion } = u.objeto.props;
        if (accion === 'abrir' && ref === 'puerta-candado' && this.imagenDeLaPuerta) {
            this.escena.tweens.add({ targets: this.imagenDeLaPuerta, scaleX: 0.12, alpha: 0.35, duration: DURACION_DE_ABRIR, ease: 'Sine.easeInOut', onComplete: () => terminado() });
            return;
        }
        if (accion === 'mirar-debajo') {
            const caja = this.escena.imagenesDeMuebles['caja-puerta'];
            this.escena.tweens.add({ targets: caja, angle: { from: -2, to: 2 }, duration: 80, yoyo: true, repeat: 3, onComplete: () => { caja.setAngle(0); terminado(); } });
            return;
        }
        terminado();
    }

    calmar() { this.efecto = null; }

    depurar() { return [`polvo ${this.polvo.estadisticas().visibles}/${this.polvo.estadisticas().vivas}`]; }
}
