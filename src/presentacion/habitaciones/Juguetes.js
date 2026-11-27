// Lo propio del Cuarto de los Juguetes (nivel 4, experimentación): los hilos casi invisibles que unen los juguetes con la trampilla del
// techo, el fenómeno (cada cierto tiempo los juguetes se mueven solos: el caballito se mece y las muñecas giran, y sus hilos se tensan y brillan si
// les da la luz), tirar de un hilo (el caballito se va al otro lado del cuarto), cortar un hilo y, al cerrar, la silueta que cruza la ventana.
// El ritmo del fenómeno es el de src/motor/Fenomeno.js (se prueba sin Phaser); aquí solo se dibuja. Efectos de la ayuda, sin texto:
//   · hilos: los hilos brillan un instante, aunque no les dé la luz, cuando el fenómeno mueve un juguete;
//   · polvo: cae polvo desde la trampilla (después de la revelación 0);
//   · oso:   el hilo cosido del oso brilla;
//   · final: después de deducir, brilla el último hilo (el del oso).
import { CicloDeGolpes, golpeCerca } from '../../motor/Fenomeno.js';
import { acercar } from '../../motor/Movimiento.js';
import { zonaDeAccion } from '../../motor/Alcance.js';
import { respirar } from '../../motor/Respiracion.js';
import { PROFUNDIDAD } from '../profundidad.js';

const DESPLAZAMIENTO_DEL_CABALLITO = 240;       // px hacia el este: "se mueve al otro lado del cuarto"
const DURACION_DE_TIRAR = 900;
const DURACION_DE_LA_SILUETA = 3200;
const ESPERA_DE_LA_SILUETA = 1400;               // cruza cuando la cámara ya llegó a la ventana y ya entró algo de luz
const ALCANCE_DEL_OJO = 120;                     // un juguete se mueve "cerca" si el inspector está a menos de esto

export default class Juguetes {
    constructor(escena) {
        this.escena = escena;
        this.efecto = null;
        this.niveles = { hilos: 0, polvo: 0, oso: 0, final: 0 };
        this.desdeElMovimiento = 99;
        this.cortados = new Set();                  // los juguetes cuyo hilo ya se cortó
        this.mecer = 0; this.girar = 0;
    }

    crear() {
        const e = this.escena, mapa = e.mapa;
        this.ciclo = new CicloDeGolpes();
        const mueble = n => mapa.muebles.find(m => m.nombre === n);
        this.caballito = mueble('caballito'); this.munecas = mueble('munecas'); this.oso = mueble('oso');
        const trampilla = mapa.interactuables.find(o => o.props.ref === 'trampilla');
        this.techo = { x: trampilla.x + trampilla.ancho / 2, y: trampilla.y + 64 };
        // Los hilos de cada juguete hasta la trampilla: [nombre del juguete, mueble, ref del hilo]
        this.hilos = [['caballito', this.caballito, 'hilo-caballito'], ['munecas', this.munecas, 'hilo-munecas'], ['oso', this.oso, 'hilo-oso']].map(([nombre, m, ref]) => ({ nombre, m, ref }));
        this.debajo = e.add.graphics().setDepth(PROFUNDIDAD.marcas + 0.4);                          // solo se ve donde llega la luz
        e.registrarSoloConLuz(this.debajo);      // los hilos son la mecánica del nivel: ni un relámpago los enseña
        this.encima = e.add.graphics().setDepth(PROFUNDIDAD.oscuridad + 0.4).setAlpha(0);       // la ayuda: se ve aunque no haya luz
        // El polvo que cae de la trampilla
        this.polvo = Array.from({ length: 16 }, () => e.add.image(0, 0, 'brillo').setBlendMode(Phaser.BlendModes.ADD).setTint(0xfff0d0).setDepth(PROFUNDIDAD.oscuridad + 0.55).setAlpha(0).setDisplaySize(13, 13));      // sobre la oscuridad (es una ayuda), tenue
        // El hilo cosido del oso y el último hilo: un brillo sobre la oscuridad
        const brillo = (escala) => e.add.image(0, 0, 'polvo').setBlendMode(Phaser.BlendModes.ADD).setTint(0xfff0c0).setDepth(PROFUNDIDAD.oscuridad + 0.6).setAlpha(0).setScale(escala);
        this.brilloDelOso = [brillo(3), brillo(3), brillo(3)];
        // La ventana exterior y la silueta que la cruza al cerrar el nivel
        const v = mapa.objetos.find(o => o.tipo === 'ventana');
        this.ventana = { x: v.x, y: v.y, ancho: v.ancho, alto: v.alto };
        const g = e.add.graphics().setDepth(PROFUNDIDAD.enLaPared);          // sobre el muro: con una capa más baja quedaba tapada por él
        g.fillStyle(0x2a2218, 1).fillRect(v.x - 5, v.y - 5, v.ancho + 10, v.alto + 10);
        g.fillStyle(0x0c1626, 1).fillRect(v.x, v.y, v.ancho, v.alto);
        g.fillStyle(0xdfe8ff, 0.9).fillCircle(v.x + v.ancho - 16, v.y + 18, 7);
        g.lineStyle(3, 0x2a2218, 1).lineBetween(v.x + v.ancho / 2, v.y, v.x + v.ancho / 2, v.y + v.alto).lineBetween(v.x, v.y + v.alto / 2, v.x + v.ancho, v.y + v.alto / 2);
        this.silueta = e.add.image(v.x - 30, v.y + v.alto - 6, 'inspector').setTint(0x000000).setAlpha(0).setDepth(PROFUNDIDAD.enLaPared + 0.1).setOrigin(0.5, 1).setScale(1.1);
    }

    aplicarAyuda(efecto) { this.efecto = efecto ?? null; }

    // ── Cada cuadro ──────────────────────────────────────────────────────────

    actualizar(dt, tiempo, { pausado = false } = {}) {
        const t = tiempo / 1000;
        if (!pausado && this.ciclo.actualizar(dt)) this.mover();
        if (!pausado) this.desdeElMovimiento += dt;
        this.mecer = Math.max(0, this.mecer - dt * 0.55);
        this.girar = Math.max(0, this.girar - dt * 0.55);
        for (const k of Object.keys(this.niveles)) this.niveles[k] = acercar(this.niveles[k], this.efecto === k ? 1 : 0, dt, 1.2);

        const e = this.escena;
        // Los juguetes se mueven solos un rato tras cada movimiento
        const cab = e.imagenesDeMuebles.caballito, mun = e.imagenesDeMuebles.munecas;
        cab.setAngle(Math.sin(t * 7) * 7 * this.mecer);
        mun.setScale(1 + 0.04 * Math.sin(t * 9) * this.girar, 1).setAngle(Math.sin(t * 6) * 3 * this.girar);

        // Los hilos: apenas se ven; al moverse un juguete se tensan y brillan
        const tension = Math.max(0, 1 - this.desdeElMovimiento / 1.1);
        const reveladoPor0 = this.cortados.has('munecas');
        this.debajo.clear(); this.encima.clear();
        for (const h of this.hilos) {
            if (this.cortados.has(h.nombre) && h.nombre !== 'munecas') continue;
            const a = { x: h.m.x + h.m.ancho / 2, y: h.m.y - h.m.props.alto * 0.4 };
            // tras cortar el hilo de las muñecas, el resto sube a la vista hasta la trampilla
            const fuerte = h.nombre === 'munecas' && reveladoPor0;
            const alfa = fuerte ? 0.85 : 0.16 + 0.7 * tension;
            const puntos = this.linea(a, this.techo, tension);
            this.dibujar(this.debajo, puntos, alfa);
            this.dibujar(this.encima, puntos, 0.8);
        }
        // La ayuda: los hilos se ven un instante aunque no les dé la luz, polvo de la trampilla, el hilo del oso
        this.encima.setAlpha(this.niveles.hilos * tension);
        const oso = this.hilos[2], base = { x: oso.m.x + oso.m.ancho / 2, y: oso.m.y - oso.m.props.alto * 0.4 };
        const brilla = Math.max(this.niveles.oso, this.niveles.final);
        this.brilloDelOso.forEach((b, i) => {
            const s = (t * 0.4 + i / 3) % 1;
            b.setPosition(base.x + (this.techo.x - base.x) * s, base.y + (this.techo.y - base.y) * s).setAlpha(brilla * (0.3 + 0.5 * Math.abs(Math.sin(t * 3 + i))));
        });
        this.polvo.forEach((p, i) => {
            const s = (t * 0.3 + i / this.polvo.length) % 1;
            p.setPosition(this.techo.x + Math.sin(t * 1.7 + i * 2.1) * 34, this.techo.y + 20 + s * 260).setAlpha(this.niveles.polvo * respirar(t) * (0.4 + 0.6 * Math.sin(Math.PI * s)));
        });
    }

    // Una línea casi recta del juguete a la trampilla, con una pequeña curva (la tensión la endereza)
    linea(a, b, tension) {
        const puntos = [];
        for (let i = 0; i <= 12; i++) {
            const s = i / 12;
            puntos.push({ x: a.x + (b.x - a.x) * s + Math.sin(s * Math.PI) * 10 * (1 - tension), y: a.y + (b.y - a.y) * s });
        }
        return puntos;
    }

    dibujar(g, puntos, alfa) {
        g.lineStyle(2, 0xf4f0d8, alfa);
        g.beginPath();
        puntos.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)));
        g.strokePath();
    }

    // Los juguetes se mueven solos: el caballito se mece, las muñecas giran, los hilos se tensan. Si el inspector está cerca de
    // alguno lo ve (un suceso para las reglas).
    mover() {
        const e = this.escena;
        this.desdeElMovimiento = 0;
        this.mecer = 1; this.girar = 1;
        e.events.emit('juguetes');             // aviso de que los juguetes se movieron
        const pies = e.inspector.pies;
        if (golpeCerca(pies, this.caballito, ALCANCE_DEL_OJO) || golpeCerca(pies, this.munecas, ALCANCE_DEL_OJO)) e.contar(e.investigacion.vioCerca('juguete'));
    }

    // ── Lo que hacen las acciones con E ──────────────────────────────────────

    alResponder(u, terminado) {
        const { ref, accion } = u.objeto.props;
        const e = this.escena;
        if (ref === 'hilo-caballito' && accion === 'tirar') {
            // Tirar del hilo: el caballito se desplaza al otro lado del cuarto con una animación fija, y los hilos se tensan
            this.desdeElMovimiento = 0;
            e.desplazarMueble('caballito', DESPLAZAMIENTO_DEL_CABALLITO, DURACION_DE_TIRAR, () => {
                // El hilo se va con el caballito: su dibujo, su sitio en el mapa y su zona de uso
                const r = e.revelables.find(x => x.ref === 'hilo-caballito');
                r.imagen.x += DESPLAZAMIENTO_DEL_CABALLITO;
                r.objeto.x += DESPLAZAMIENTO_DEL_CABALLITO;
                u.zona = zonaDeAccion(u.objeto, e.mapa.muebles);
                terminado();
            });
            return;
        }
        if (accion === 'cortar') {
            const hilo = this.hilos.find(h => h.ref === ref);
            // Un destello y el hilo se suelta: el trozo cercano al suelo desaparece
            const destello = e.add.image(u.objeto.x + u.objeto.ancho / 2, u.objeto.y + u.objeto.alto / 2, 'polvo').setBlendMode(Phaser.BlendModes.ADD).setDepth(PROFUNDIDAD.interfaz).setScale(1);
            e.tweens.add({ targets: destello, scale: 6, alpha: 0, duration: 420, onComplete: () => destello.destroy() });
            const r = e.revelables.find(x => x.ref === ref);
            if (r) r.oculto = true;                 // el hilo cortado ya no se ve (la escena deja de dibujarlo)
            if (hilo) this.cortados.add(hilo.nombre);
            u.recogido = true;
            e.time.delayedCall(350, () => terminado());
            return;
        }
        terminado();
    }

    // El cierre: los juguetes se quedan quietos y una silueta cruza frente a la ventana exterior (mientras sale el texto del cierre)
    calmar() { this.ciclo.calmar(); this.mecer = 0; this.girar = 0; }

    // Lo que revela el cierre: la silueta que cruza frente a la ventana exterior
    focoDelCierre() {
        const v = this.ventana;
        return { x: v.x + v.ancho / 2, y: v.y + v.alto / 2, radio: 190 };
    }

    alIniciarCierre() {
        const v = this.ventana;
        this.silueta.setPosition(v.x - 30, v.y + v.alto - 4).setAlpha(0);
        this.escena.tweens.add({ targets: this.silueta, alpha: 0.95, delay: ESPERA_DE_LA_SILUETA, duration: 200 });
        this.escena.tweens.add({ targets: this.silueta, x: v.x + v.ancho + 30, delay: ESPERA_DE_LA_SILUETA, duration: DURACION_DE_LA_SILUETA, ease: 'Sine.easeInOut', onComplete: () => this.silueta.setAlpha(0) });
    }

    depurar() {
        return [`juguetes: movimientos ${this.ciclo.golpes}  ·  próximo en ${Math.max(0, this.ciclo.espera).toFixed(1)} s  ·  hilos cortados ${[...this.cortados].join(',') || 'ninguno'}`];
    }
}
