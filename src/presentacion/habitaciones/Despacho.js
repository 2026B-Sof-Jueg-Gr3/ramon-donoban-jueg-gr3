// Lo propio del despacho del viejo Flieder (nivel 6, reconstrucción y deducción final): el gran reloj con el péndulo quieto, el suelo hueco
// a su lado (al caminar sobre él sale una onda visible y un poco de polvo: es la forma de "escuchar" sin audio), las cartas de compradores y,
// al cerrar el caso, el compartimento bajo el reloj que se abre. Efectos de la ayuda, sin texto (el primero, la libreta, lo hace la escena):
//   · marcas: las marcas frescas de los archivos brillan aunque no les dé la luz;
//   · onda:   la onda del suelo hueco se ve más fuerte, cerca del reloj, aunque nadie camine por él;
//   · cartas: las cartas de compradores se agitan.
import { acercar } from '../../motor/Movimiento.js';
import { respirar, RESPIRACION } from '../../motor/Respiracion.js';
import { PROFUNDIDAD } from '../profundidad.js';
import { iconoDeHerramientas } from '../ArteDibujado.js';

const DURACION_DE_ABRIR = 1400;

export default class Despacho {
    constructor(escena) {
        this.escena = escena;
        this.efecto = null;
        this.niveles = { marcas: 0, onda: 0, cartas: 0 };
        this.desdeLaOnda = 99;
        this.abierto = false;
    }

    crear() {
        const e = this.escena, mapa = e.mapa;
        const hueco = mapa.objetos.find(o => o.tipo === 'piso' && o.props.ref === 'hueco');
        this.hueco = { x: hueco.x, y: hueco.y, ancho: hueco.ancho, alto: hueco.alto };
        const comp = mapa.fenomenos.find(f => f.props.efecto === 'compartimento');
        this.compartimento = { x: comp.x, y: comp.y, ancho: comp.ancho, alto: comp.alto };
        const pendulo = mapa.fenomenos.find(f => f.props.efecto === 'reloj');
        // El péndulo, quieto, en la caja del reloj (el reloj está detenido)
        const g = e.add.graphics().setDepth(PROFUNDIDAD.suelo + 0.6);
        const cx = pendulo.x + pendulo.ancho / 2;
        g.lineStyle(3, 0xc8a050, 1).lineBetween(cx, pendulo.y, cx, pendulo.y + pendulo.alto - 12);
        g.fillStyle(0xd9b45a, 1).fillCircle(cx, pendulo.y + pendulo.alto - 8, 8);
        // Las tablas del suelo hueco: apenas se distinguen
        const h = this.hueco;
        const tablas = e.add.graphics().setDepth(PROFUNDIDAD.marcas - 0.2).setAlpha(0.55);
        tablas.fillStyle(0x7a5a38, 0.5).fillRect(h.x, h.y, h.ancho, h.alto);
        tablas.lineStyle(2, 0x2e2012, 0.8);
        for (let x = h.x; x <= h.x + h.ancho; x += 24) tablas.lineBetween(x, h.y, x, h.y + h.alto);
        e.registrarSoloConLuz(tablas);
        // La onda (anillos que se expanden) y el polvo
        this.anillos = Array.from({ length: 6 }, () => e.add.circle(0, 0, 10).setStrokeStyle(3, 0xffe2a0, 1).setFillStyle(0, 0).setDepth(PROFUNDIDAD.oscuridad + 0.3).setAlpha(0).setVisible(false));
        this.polvo = Array.from({ length: 10 }, () => e.add.image(0, 0, 'polvo').setBlendMode(Phaser.BlendModes.ADD).setTint(0xe8dcc0).setDepth(PROFUNDIDAD.oscuridad + 0.2).setAlpha(0).setScale(1));
        this.ondas = [];                  // { x, y, t, fuerza } las ondas en curso
        this.restos = [];                 // las motas de polvo en curso
        // La ayuda: un brillo sobre las marcas frescas y sobre las cartas
        const marcas = mapa.revelables.find(r => r.props.ref === 'n6-marcas');
        this.brilloDeMarcas = e.add.image(marcas.x + marcas.ancho / 2, marcas.y + marcas.alto / 2, 'brillo').setBlendMode(Phaser.BlendModes.ADD).setTint(0xfff0c0).setDepth(PROFUNDIDAD.oscuridad + 0.4).setAlpha(0).setDisplaySize(marcas.ancho * RESPIRACION.holgura, marcas.alto * RESPIRACION.holgura);
        const cartas = e.usables.find(u => u.objeto.props.ref === 'n6-pista-compradores');
        this.cartas = cartas?.imagen;
        this.cartasBase = this.cartas ? { x: this.cartas.x, y: this.cartas.y } : null;
        this.brilloDeCartas = e.add.image(cartas.objeto.x + cartas.objeto.ancho / 2, cartas.objeto.y + cartas.objeto.alto / 2, 'brillo').setBlendMode(Phaser.BlendModes.ADD).setTint(0xfff0c0).setDepth(PROFUNDIDAD.oscuridad + 0.4).setAlpha(0).setDisplaySize(cartas.objeto.ancho * RESPIRACION.holgura, cartas.objeto.alto * RESPIRACION.holgura);
        // El compartimento bajo el reloj: oculto hasta el cierre (una tapa que se desliza y un hueco con un brillo)
        const c = this.compartimento;
        this.hoyo = e.add.rectangle(c.x + c.ancho / 2, c.y + c.alto / 2, c.ancho, c.alto, 0x120c06).setStrokeStyle(2, 0x6b4f2d).setDepth(PROFUNDIDAD.marcas + 0.1).setAlpha(0);
        this.tapa = e.add.rectangle(c.x + c.ancho / 2, c.y + c.alto / 2, c.ancho, c.alto, 0x7a5a38).setStrokeStyle(2, 0x2e2012).setDepth(PROFUNDIDAD.marcas + 0.2).setAlpha(0);
        this.herramientas = e.add.image(c.x + c.ancho / 2, c.y + c.alto / 2, iconoDeHerramientas(e)).setOrigin(0.5).setDepth(PROFUNDIDAD.marcas + 0.3).setAlpha(0);
    }

    aplicarAyuda(efecto) { this.efecto = efecto ?? null; }

    // ── Cada cuadro ──────────────────────────────────────────────────────────

    actualizar(dt, tiempo, { pausado = false } = {}) {
        const e = this.escena, t = tiempo / 1000;
        for (const k of Object.keys(this.niveles)) this.niveles[k] = acercar(this.niveles[k], this.efecto === k ? 1 : 0, dt, 1.2);
        const h = this.hueco;

        // Caminar sobre el suelo hueco: una onda y un poco de polvo, cada cierto paso
        if (!pausado) {
            this.desdeLaOnda += dt;
            const p = e.inspector.pies;
            const encima = p.x >= h.x && p.x <= h.x + h.ancho && p.y >= h.y && p.y <= h.y + h.alto;
            const andando = Math.hypot(e.inspector.sprite.body.velocity.x, e.inspector.sprite.body.velocity.y) > 40;
            if (encima && andando && this.desdeLaOnda > 0.45) {
                this.desdeLaOnda = 0;
                this.ondas.push({ x: p.x, y: p.y, t: 0, fuerza: 1 });
                for (let i = 0; i < 3; i++) this.restos.push({ x: p.x + (Math.random() - 0.5) * 30, y: p.y - 4, t: 0, dx: (Math.random() - 0.5) * 30 });
            }
            // La ayuda: una onda lenta que sale del suelo hueco, junto al reloj, aunque nadie camine por él
            if (this.niveles.onda > 0.3 && (Math.floor(t * 1.2) !== Math.floor((t - dt) * 1.2))) this.ondas.push({ x: h.x + h.ancho / 2, y: h.y + 24, t: 0, fuerza: 1.5 * this.niveles.onda });
        }
        const vivas = this.ondas.filter(o => (o.t += dt) < 1.1);
        this.ondas = vivas;
        this.anillos.forEach((a, i) => {
            const o = vivas[vivas.length - 1 - i];
            if (!o) { a.setVisible(false); return; }
            const s = o.t / 1.1;
            a.setVisible(true).setPosition(o.x, o.y).setRadius(10 + 80 * s * o.fuerza).setAlpha(0.7 * (1 - s) * Math.min(1, o.fuerza));
        });
        this.restos = this.restos.filter(r => (r.t += dt) < 1.4);
        this.polvo.forEach((m, i) => {
            const r = this.restos[this.restos.length - 1 - i];
            if (!r) { m.setAlpha(0); return; }
            const s = r.t / 1.4;
            m.setPosition(r.x + r.dx * s, r.y - 40 * s).setAlpha(0.6 * (1 - s)).setScale(1 + s);
        });

        // La ayuda: las marcas brillan, las cartas se agitan
        this.brilloDeMarcas.setAlpha(this.niveles.marcas * respirar(t));
        if (this.cartas) {
            const k = this.niveles.cartas;
            this.cartas.setPosition(this.cartasBase.x + Math.sin(t * 22) * 2.5 * k, this.cartasBase.y - Math.abs(Math.sin(t * 9)) * 4 * k).setAngle(Math.sin(t * 18) * 8 * k);
            this.brilloDeCartas.setAlpha(k * respirar(t));
        }
    }

    // ── Lo que hacen las acciones con E ──────────────────────────────────────

    alResponder(u, terminado) {
        const { ref, accion } = u.objeto.props;
        const e = this.escena;
        if (accion === 'ordenar') {
            // Ordenar los archivos: un barrido de luz sobre el mueble y las marcas frescas se borran (ya están en orden)
            const o = u.objeto;
            const barrido = e.add.rectangle(o.x + o.ancho / 2, o.y + o.alto / 2, o.ancho, o.alto + 40, 0xfff0c0, 0.5).setBlendMode(Phaser.BlendModes.ADD).setDepth(PROFUNDIDAD.interfaz - 2);
            e.tweens.add({ targets: barrido, scaleX: 0.15, alpha: 0, duration: 520, onComplete: () => { barrido.destroy(); terminado(); } });
            const marcas = e.revelables.find(r => r.ref === 'n6-marcas');
            if (marcas) marcas.oculto = true;
            return;
        }
        terminado();
    }

    calmar() {}

    // Lo que revela el cierre: el compartimento bajo el reloj (la cámara y la luz van hacia él)
    focoDelCierre() {
        const c = this.compartimento;
        return { x: c.x + c.ancho / 2, y: c.y + c.alto / 2, radio: 200 };
    }

    // El cierre: el compartimento bajo el reloj se abre (la tapa se desliza) y se ve el hueco con las herramientas; después sale la pista
    alTerminarCierre(siguiente) {
        const e = this.escena;
        this.abierto = true;
        this.hoyo.setAlpha(1);
        this.herramientas.setAlpha(0);
        this.tapa.setAlpha(1);
        e.tweens.add({ targets: this.tapa, x: this.tapa.x + this.compartimento.ancho + 6, alpha: 0.2, duration: DURACION_DE_ABRIR, ease: 'Sine.easeInOut' });
        e.tweens.add({ targets: this.herramientas, alpha: 1, duration: 600, delay: DURACION_DE_ABRIR * 0.6 });
        e.time.delayedCall(DURACION_DE_ABRIR + 200, () => {
            // La pista del compartimento (queda en el Registro) sale ahora, después del texto del cierre y con el compartimento a la vista.
            // El informe no llega solo: la escena espera a que se lea y a que el jugador pulse
            e.soltarRetenidos();
            siguiente();
        });
    }

    depurar() {
        return [`despacho: ondas ${this.ondas.length}  ·  compartimento ${this.abierto ? 'abierto' : 'cerrado'}`];
    }
}
