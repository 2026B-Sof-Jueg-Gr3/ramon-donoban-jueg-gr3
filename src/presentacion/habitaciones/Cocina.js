// Lo propio de la Cocina (nivel 2, "El Fantasma de la Cocina"): el fenómeno (un golpe metálico cada cierto tiempo: las ollas
// vibran, sale una onda desde la alacena y las velas de la mesa se apagan y se vuelven a encender), la cuerda que aparece al
// rodar la alacena y los efectos visuales de su ayuda, todos sin texto:
//   · onda:   la onda del golpe se ve más fuerte, del lado de la alacena;
//   · ruedas: las ruedas de la alacena brillan un instante;
//   · cuerda: la cuerda brilla a lo largo de su recorrido hacia el fuelle;
//   · taza:   un hilo de vapor sube de la taza (solo se ve con la luz);
//   · recibo: el recibo se agita sobre la mesa con cada golpe;
//   · platos: en cada golpe los platos del fregadero tintinean de forma visible.
// El ritmo del fenómeno está en src/motor/Fenomeno.js (se prueba sin Phaser); aquí solo se dibuja.
import { CicloDeGolpes, nivelDeLlama, golpeCerca } from '../../motor/Fenomeno.js';
import { acercar } from '../../motor/Movimiento.js';
import { PROFUNDIDAD } from '../profundidad.js';

const DESPLAZAMIENTO_DE_LA_ALACENA = 192;     // px hacia el este: la animación fija de "rodar"
const DURACION_DE_RODAR = 950;                // ms
const PROFUNDIDAD_DE_PARED = 256.3;           // por encima del muro, por debajo de todo lo que pisa
const COLOR_DE_ONDA = 0xffe2a8;

export default class Cocina {
    constructor(escena) {
        this.escena = escena;
        this.efecto = null;
        this.desdeElGolpe = 99;        // segundos desde el último golpe
        this.rodada = false;
        this.sacudidaDeCuerda = 0;
        this.sacudidaDePlatos = 0;
        this.nivelDeRuedas = 0; this.nivelDeCuerda = 0; this.nivelDePlatos = 0; this.nivelDeTaza = 0; this.nivelDeRecibo = 0;
        this.sacudidaDeRecibo = 0;
    }

    crear() {
        const e = this.escena, mapa = e.mapa;
        this.ciclo = new CicloDeGolpes();
        this.alacena = mapa.muebles.find(m => m.nombre === 'alacena');
        const mesa = mapa.muebles.find(m => m.nombre === 'mesa');

        // Las velas de la mesa: la vela, su llama (se ve en la oscuridad), su resplandor y la luz que le dan a la habitación
        this.velas = mapa.velas.map((v, i) => ({
            fase: i * 1.7,
            vela: e.add.image(v.x + v.ancho / 2, v.y, 'vela').setOrigin(0.5, 1).setDepth(mesa.y + mesa.alto + 0.6),
            llama: e.add.image(v.x + v.ancho / 2, v.y - 18, 'llama').setOrigin(0.5, 0.85).setBlendMode(Phaser.BlendModes.ADD).setDepth(PROFUNDIDAD.oscuridad + 0.3),
            brillo: e.add.image(v.x + v.ancho / 2, v.y - 22, 'luz-vela').setBlendMode(Phaser.BlendModes.ADD).setTint(0xffb35a).setDepth(PROFUNDIDAD.oscuridad + 0.2).setAlpha(0)
        }));
        e.linterna.fuentes = this.velas.map(v => ({ x: v.vela.x, y: v.vela.y - 22, radio: 150, nivel: 1 }));

        // Las ollas colgadas sobre la cocina
        this.ollas = mapa.ollas.map((o, i) => ({
            fase: i * 2.1,
            imagen: e.add.image(o.x + o.ancho / 2, o.y, 'olla').setOrigin(0.5, 0.1).setDepth(PROFUNDIDAD_DE_PARED - 0.1)
        }));

        // La onda del golpe: un anillo que sale de la alacena
        this.ondas = [0, 1].map(() => ({ aro: e.add.circle(0, 0, 100).setStrokeStyle(4, COLOR_DE_ONDA, 1).setBlendMode(Phaser.BlendModes.ADD).setDepth(PROFUNDIDAD.oscuridad + 0.5).setVisible(false), edad: 99, fuerza: 1 }));

        // La cuerda (oculta hasta rodar la alacena) y el fuelle
        const [cuerda] = mapa.cuerdas;
        this.recorrido = cuerda.puntos;
        this.largos = [];
        let total = 0;
        for (let i = 1; i < this.recorrido.length; i++) { total += Math.hypot(this.recorrido[i].x - this.recorrido[i - 1].x, this.recorrido[i].y - this.recorrido[i - 1].y); this.largos.push(total); }
        this.largoTotal = total;
        this.cuerda = e.add.graphics().setDepth(PROFUNDIDAD_DE_PARED).setVisible(false);
        this.fuelle = e.usables.find(u => u.objeto.props.ref === 'fuelle')?.imagen;
        this.fuelle?.setVisible(false);

        // Los destellos de la ayuda (sobre la oscuridad, muy tenues)
        const destello = (escala) => e.add.image(0, 0, 'polvo').setBlendMode(Phaser.BlendModes.ADD).setTint(0xffd9a0).setDepth(PROFUNDIDAD.oscuridad + 0.6).setAlpha(0).setScale(escala);
        this.brillosDeRuedas = [destello(3), destello(3)];
        this.brillosDeCuerda = Array.from({ length: 7 }, () => destello(2.6));
        this.platos = e.usables.find(u => u.objeto.props.ref === 'n2-mueble-platos')?.imagen;
        this.platosBase = this.platos ? { x: this.platos.x, y: this.platos.y } : null;
        this.brillosDePlatos = [destello(2.2), destello(2.2), destello(2.2)];
        // La taza y el recibo (las pistas obligatorias): el vapor va debajo de la oscuridad, así solo se ve donde llega la luz
        const taza = e.usables.find(u => u.objeto.props.ref === 'n2-pista-taza'), recibo = e.usables.find(u => u.objeto.props.ref === 'n2-pista-recibo');
        this.taza = taza?.imagen; this.recibo = recibo?.imagen;
        this.reciboBase = this.recibo ? { x: this.recibo.x, y: this.recibo.y } : null;
        this.vapor = Array.from({ length: 7 }, () => e.add.image(0, 0, 'polvo').setBlendMode(Phaser.BlendModes.ADD).setTint(0xdfeaff).setDepth((this.taza?.depth ?? 300) + 0.2).setAlpha(0).setScale(2.2));
        e.registrarSoloConLuz(...this.vapor);
    }

    aplicarAyuda(efecto) { this.efecto = efecto ?? null; }

    // ── Cada cuadro ──────────────────────────────────────────────────────────

    actualizar(dt, tiempo, { pausado = false } = {}) {
        const t = tiempo / 1000;
        // Durante una pausa (un texto importante, la libreta…) no suena ningún golpe: el juego está detenido
        if (!pausado && this.ciclo.actualizar(dt)) this.golpe();
        if (!pausado) this.desdeElGolpe += dt;
        this.sacudidaDeCuerda = Math.max(0, this.sacudidaDeCuerda - dt * 1.4);
        this.sacudidaDePlatos = Math.max(0, this.sacudidaDePlatos - dt * 1.2);

        // Las velas: se apagan con el golpe y vuelven
        const nivel = nivelDeLlama(this.desdeElGolpe, this.ciclo.calmado);
        this.velas.forEach((v, i) => {
            const parpadeo = 0.82 + 0.18 * Math.sin(t * 9 + v.fase) * Math.sin(t * 3.7 + v.fase * 2);
            v.llama.setAlpha(nivel * parpadeo).setScale(0.9 + 0.12 * Math.sin(t * 11 + v.fase), nivel * (0.85 + 0.15 * parpadeo));
            v.brillo.setAlpha(nivel * 0.3 * parpadeo).setScale(1);
            this.escena.linterna.fuentes[i].nivel = nivel * 0.6 * parpadeo;
        });

        // Las ollas vibran un momento tras cada golpe
        const vibracion = Math.max(0, 1 - this.desdeElGolpe / 0.9);
        this.ollas.forEach(o => o.imagen.setAngle(Math.sin(t * 58 + o.fase) * 5 * vibracion).setX(o.imagen.x));

        // La onda
        for (const o of this.ondas) {
            if (o.edad > 1.4) { o.aro.setVisible(false); continue; }
            o.edad += dt;
            const u = Math.min(1, o.edad / 1.2);
            o.aro.setVisible(true).setScale(0.25 + u * (1.6 + 1.2 * (o.fuerza - 1))).setAlpha((1 - u) * (o.fuerza > 1 ? 0.85 : 0.3));
            o.aro.lineWidth = o.fuerza > 1 ? 5 : 3;
        }

        // La cuerda y el fuelle, una vez rodada la alacena
        if (this.rodada) {
            this.cuerda.setVisible(true);
            this.fuelle?.setVisible(true);
            this.dibujarCuerda(t);
        }

        // La ayuda, sin texto
        this.nivelDeRuedas = acercar(this.nivelDeRuedas, this.efecto === 'ruedas' ? 1 : 0, dt, 1.2);
        this.nivelDeCuerda = acercar(this.nivelDeCuerda, this.efecto === 'cuerda' ? 1 : 0, dt, 1.2);
        this.nivelDePlatos = acercar(this.nivelDePlatos, this.efecto === 'platos' ? 1 : 0, dt, 1.2);
        this.nivelDeTaza = acercar(this.nivelDeTaza, this.efecto === 'taza' && !this.taza?.recogida ? 1 : 0, dt, 1.2);
        this.nivelDeRecibo = acercar(this.nivelDeRecibo, this.efecto === 'recibo' ? 1 : 0, dt, 1.2);
        this.sacudidaDeRecibo = Math.max(0, this.sacudidaDeRecibo - dt * 1.3);
        this.actualizarAyuda(t);
    }

    actualizarAyuda(t) {
        const rueda = (lado) => {
            const img = this.escena.imagenesDeMuebles.alacena, m = this.alacena;
            const x0 = img.x + (lado ? m.ancho - 16 : 16), y = m.y + m.alto - 6;
            return { x: x0, y };
        };
        this.brillosDeRuedas.forEach((b, i) => {
            const p = rueda(i);
            const pulso = Math.pow(Math.max(0, Math.sin(t * 4.2 + i * 1.3)), 6);       // un destello corto cada rato
            b.setPosition(p.x, p.y).setAlpha(this.nivelDeRuedas * (0.15 + 0.6 * pulso));
        });
        this.brillosDeCuerda.forEach((b, i) => {
            const s = (t * 0.32 + i / this.brillosDeCuerda.length) % 1;
            const p = this.puntoEn(s);
            b.setPosition(p.x, p.y).setAlpha(this.nivelDeCuerda * (0.25 + 0.45 * Math.abs(Math.sin(t * 3 + i))));
        });
        // El vapor de la taza: partículas que suben y se disuelven
        if (this.taza?.visible) {
            this.vapor.forEach((v, i) => {
                const s = (t * 0.45 + i / this.vapor.length) % 1;
                v.setPosition(this.taza.x + Math.sin(t * 2 + i * 1.7) * 5 * s, this.taza.y - 8 - s * 46)
                    .setAlpha(this.nivelDeTaza * 0.55 * Math.sin(Math.PI * s)).setScale(1.6 + s * 1.6);
            });
        } else this.vapor.forEach(v => v.setAlpha(0));
        // El recibo se agita sobre la mesa con cada golpe (y solo cuando la ayuda lo pide)
        if (this.recibo && this.reciboBase && this.recibo.visible) {
            const r = this.nivelDeRecibo * this.sacudidaDeRecibo;
            this.recibo.setPosition(this.reciboBase.x + Math.sin(t * 66) * 4 * r, this.reciboBase.y + Math.sin(t * 79) * 1.5 * r).setAngle(Math.sin(t * 52) * 7 * r);
        }
        if (this.platos && this.platosBase) {
            const s = this.sacudidaDePlatos;
            this.platos.setPosition(this.platosBase.x + Math.sin(t * 70) * 3.4 * s, this.platosBase.y + Math.sin(t * 83) * 1.6 * s);
            this.brillosDePlatos.forEach((b, i) => {
                b.setPosition(this.platosBase.x - 14 + i * 14, this.platosBase.y - 4 + Math.sin(t * 40 + i) * 3)
                    .setAlpha(this.nivelDePlatos * Math.min(1, s * 1.6) * (0.4 + 0.5 * Math.abs(Math.sin(t * 30 + i * 2))));
            });
        }
    }

    // Un punto del recorrido de la cuerda, con s entre 0 (al pie del muro) y 1 (el fuelle)
    puntoEn(s) {
        let d = s * this.largoTotal;
        for (let i = 1; i < this.recorrido.length; i++) {
            const largo = this.largos[i - 1] - (i > 1 ? this.largos[i - 2] : 0);
            if (d <= largo || i === this.recorrido.length - 1) {
                const a = this.recorrido[i - 1], b = this.recorrido[i], u = largo ? Math.min(1, d / largo) : 0;
                return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u };
            }
            d -= largo;
        }
        return this.recorrido[0];
    }

    // La cuerda: una línea por el muro con un poco de vaivén cuando se tira de ella
    dibujarCuerda(t) {
        const g = this.cuerda;
        g.clear();
        const pasos = Math.ceil(this.largoTotal / 14);
        const puntos = [];
        for (let i = 0; i <= pasos; i++) {
            const s = i / pasos, p = this.puntoEn(s);
            const onda = Math.sin(t * 38 - s * 24) * 6 * this.sacudidaDeCuerda * Math.sin(Math.PI * s);
            // Perpendicular al tramo: en el tramo vertical se mueve de lado; en el horizontal, arriba y abajo
            const vertical = Math.abs(this.puntoEn(Math.min(1, s + 0.01)).y - this.puntoEn(Math.max(0, s - 0.01)).y) > Math.abs(this.puntoEn(Math.min(1, s + 0.01)).x - this.puntoEn(Math.max(0, s - 0.01)).x);
            puntos.push({ x: p.x + (vertical ? onda : 0), y: p.y + (vertical ? 0 : onda) });
        }
        g.lineStyle(5, 0x2b2017, 1);
        g.beginPath(); puntos.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y))); g.strokePath();
        g.lineStyle(3, 0xc8b078, 1);
        g.beginPath(); puntos.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y))); g.strokePath();
        // Las poleas de las esquinas
        g.fillStyle(0x3a3328, 1).lineStyle(2, 0x9a8e70, 1);
        for (const p of [this.recorrido[1], this.recorrido[2]]) g.fillCircle(p.x, p.y, 6).strokeCircle(p.x, p.y, 6);
    }

    // ── El golpe ─────────────────────────────────────────────────────────────

    // Suena un golpe metálico: las ollas vibran, sale la onda de la alacena y las velas se apagan. Si el inspector está
    // cerca de la alacena, lo oye (un suceso para las reglas). El evento 'golpe' queda como aviso para quien quiera escucharlo.
    golpe() {
        const e = this.escena;
        this.desdeElGolpe = 0;
        const refuerzo = this.efecto === 'onda' ? 1.6 : 1;
        const onda = this.ondas.find(o => o.edad > 1.4) ?? this.ondas[0];
        const img = e.imagenesDeMuebles.alacena, m = this.alacena;
        onda.aro.setPosition(img.x + m.ancho / 2, m.y + m.alto / 2);
        onda.edad = 0;
        onda.fuerza = refuerzo;
        this.sacudidaDePlatos = this.efecto === 'platos' ? 1 : 0.25;
        this.sacudidaDeRecibo = 1;
        e.events.emit('golpe');
        if (golpeCerca(e.inspector.pies, this.alacena)) e.contar(e.investigacion.oyoCerca('alacena'));
    }

    // ── Lo que hacen las acciones con E ──────────────────────────────────────

    alResponder(u, terminado) {
        const { ref, accion } = u.objeto.props;
        if (ref === 'alacena' && accion === 'rodar') {
            // UNA acción con E: la alacena rueda hacia el este con una animación fija, y deja a la vista la cuerda
            this.escena.desplazarMueble('alacena', DESPLAZAMIENTO_DE_LA_ALACENA, DURACION_DE_RODAR, () => { this.rodada = true; terminado(); });
            return;
        }
        if (ref === 'cuerda' && accion === 'tirar') {
            // Tirar de la cuerda reproduce el fantasma: un golpe y las velas se apagan
            this.sacudidaDeCuerda = 1;
            if (this.ciclo.golpear()) this.golpe();
        }
        terminado();
    }

    // El cierre: no más golpes y las velas quedan encendidas
    calmar() {
        this.ciclo.calmar();
        this.desdeElGolpe = 99;
    }

    depurar() {
        return [`golpes ${this.ciclo.golpes}  ·  próximo en ${Math.max(0, this.ciclo.espera).toFixed(1)} s${this.ciclo.calmado ? '  ·  calmado' : ''}  ·  alacena ${this.rodada ? 'rodada' : 'en su sitio'}`];
    }
}
