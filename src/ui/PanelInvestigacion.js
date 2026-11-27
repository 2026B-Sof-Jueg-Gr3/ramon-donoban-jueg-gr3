import { FUENTE } from './Boton.js';
import { LECTURA } from './tiemposDeLectura.js';
import { etiquetar } from './etiquetas.js';
import { limitarDesplazamiento, indicadores } from '../motor/Maquetacion.js';

// Panel de investigación: zona fija (ver Distribucion.js) donde se leen los textos que NO detienen el juego.
//   · la nota de la libreta (secundaria), siempre la primera
//   · hasta LECTURA.maximoAmbientales tarjetas ambientales (textos de las marcas), cada una independiente
// Nunca se dibuja sobre el tablero. Si el contenido no cabe, se desplaza dentro del panel (rueda o arrastre):
// ningún texto se recorta. Cada tarjeta tiene sus propios temporizadores y se puede suspender conservando
// su estado exacto (letra escrita o tiempo de lectura restante).
const PADDING = 10;
const SEPARACION = 6;
const AMBAR = 0xc89012;
const PROFUNDIDAD = 22;
const RESERVA = 20;          // la franja de abajo donde va el indicador ▲ ▼ cuando el contenido no cabe (nada se le encima)
let tarjetasCreadas = 0;

export default class PanelInvestigacion {
    // profundidad: capa base del panel. Se dibuja fijo a la pantalla (no se desplaza con la cámara).
    // ajustarAlContenido: el marco mide lo que miden las tarjetas (hasta el alto del panel) en vez de verse vacío.
    constructor(scene, { profundidad = PROFUNDIDAD, ajustarAlContenido = false } = {}) {
        this.ajustarAlContenido = ajustarAlContenido;
        this.scene = scene;
        this.tarjetas = [];
        this.desplazamiento = 0;
        this.rect = { x: 0, y: 0, ancho: 0, alto: 0 };

        this.fondo = scene.add.graphics().setDepth(profundidad).setScrollFactor(0);
        this.contenido = scene.add.container(0, 0).setDepth(profundidad + 1).setScrollFactor(0);
        this.forma = scene.make.graphics({ add: false }).setScrollFactor(0);
        this.contenido.setMask(this.forma.createGeometryMask());
        this.indicador = scene.add.text(0, 0, '', {
            fontFamily: FUENTE, fontSize: '11px', color: '#c89012', resolution: 2
        }).setOrigin(1, 1).setDepth(profundidad + 2).setScrollFactor(0);

        // Desplazamiento: rueda del ratón sobre el panel o arrastre dentro de él
        this.zona = scene.add.zone(0, 0, 1, 1).setOrigin(0).setDepth(profundidad + 2).setScrollFactor(0).setInteractive();
        this.zona.on('pointerdown', p => { this.arrastre = { y: p.y, desde: this.desplazamiento }; });
        scene.input.on('pointermove', p => {
            if (this.arrastre && p.isDown) this.desplazar(this.arrastre.desde - (p.y - this.arrastre.y));
        });
        scene.input.on('pointerup', () => { this.arrastre = null; });
        scene.input.on('wheel', (p, objetos, dx, dy) => {
            const r = this.rect;
            if (p.x >= r.x && p.x <= r.x + r.ancho && p.y >= r.y && p.y <= r.y + r.alto) this.desplazar(this.desplazamiento + dy * 0.5);
        });
    }

    reposicionar(rect) {
        this.rect = rect;
        this.dibujarFondo();
        this.dibujarMascara();
        this.zona.setPosition(rect.x, rect.y).setSize(rect.ancho, rect.alto);
        this.zona.input.hitArea.setSize(rect.ancho, rect.alto);
        // El ancho del texto cambió: las tarjetas se vuelven a componer con el mismo estado
        for (const t of this.tarjetas) t.componer();
        this.acomodar();
    }

    // Lo que se ve de las tarjetas: todo el panel, menos la franja del indicador cuando el contenido no cabe
    get altoVisible() {
        return this.desborda ? this.rect.alto - RESERVA : this.rect.alto;
    }

    get desborda() { return (this.altoContenido || 0) > this.rect.alto; }

    dibujarMascara() {
        const r = this.rect, alto = this.altoVisible;
        this.forma.clear();
        this.forma.fillStyle(0xffffff);
        this.forma.fillRect(r.x, r.y + 2, r.ancho, alto - 4);
        this.contenido.setData('clip', { x: r.x, y: r.y + 2, ancho: r.ancho, alto: alto - 4 });
    }

    dibujarFondo() {
        const r = this.rect;
        const alto = this.ajustarAlContenido ? Math.min(r.alto, Math.max(0, this.altoContenido || 0) + (this.desborda ? RESERVA : 0)) : r.alto;
        this.fondo.clear();
        if (alto <= 0) return;
        this.fondo.fillStyle(0x07101b, 0.9);
        this.fondo.fillRoundedRect(r.x, r.y, r.ancho, alto, 10);
        this.fondo.lineStyle(1, AMBAR, 0.45);
        this.fondo.strokeRoundedRect(r.x, r.y, r.ancho, alto, 10);
    }

    anchoTarjeta() {
        return Math.max(80, this.rect.ancho - PADDING * 2);
    }

    // Coloca las tarjetas una debajo de otra (la libreta primero) y ajusta el desplazamiento
    acomodar() {
        let y = PADDING;
        const ordenadas = [...this.tarjetas.filter(t => t.tipo === 'libreta'), ...this.tarjetas.filter(t => t.tipo !== 'libreta')];
        for (const t of ordenadas) {
            t.y = y;
            y += t.alto + SEPARACION;
        }
        this.altoContenido = y - SEPARACION + PADDING;
        this.dibujarMascara();
        if (this.ajustarAlContenido) this.dibujarFondo();
        this.desplazar(this.desplazamiento);
    }

    desplazar(valor) {
        this.desplazamiento = limitarDesplazamiento(valor, this.altoContenido || 0, this.altoVisible);
        for (const t of this.tarjetas) t.vista.setPosition(this.rect.x + PADDING, this.rect.y + t.y - this.desplazamiento);
        if (!this.indicador.scene) return;            // la escena ya se cerró: el indicador está destruido
        const { arriba, abajo } = indicadores(this.desplazamiento, this.altoContenido || 0, this.altoVisible);
        this.indicador.setText(arriba && abajo ? '▲ ▼ rueda' : abajo ? '▼ rueda' : arriba ? '▲ rueda' : '')
            .setPosition(this.rect.x + this.rect.ancho - 8, this.rect.y + this.rect.alto - 3);
        etiquetar(this.indicador, { tipo: 'contenido' });
    }

    // m: mensaje del Narrador · op: { lecturaMs, alLeida, alTerminar }
    mostrarSecundaria(m, op) {
        return this.agregar(new Tarjeta(this, 'libreta', m, { ...op, escribir: true }));
    }

    mostrarAmbiental(m, op) {
        return this.agregar(new Tarjeta(this, 'ambiental', m, { ...op, escribir: false }));
    }

    agregar(tarjeta) {
        this.tarjetas.push(tarjeta);
        tarjeta.iniciar();
        if (this.pausado) tarjeta.pausar();
        this.acomodar();
        return tarjeta;
    }

    quitar(tarjeta) {
        this.tarjetas = this.tarjetas.filter(t => t !== tarjeta);
        this.acomodar();
    }

    pausar() {
        this.pausado = true;
        for (const t of this.tarjetas) t.pausar();
    }

    reanudar() {
        this.pausado = false;
        for (const t of this.tarjetas) t.reanudar();
    }

    retirar(filtro = () => true) {
        for (const t of this.tarjetas.filter(filtro)) t.retirar();
        this.tarjetas = this.tarjetas.filter(t => !t.retirada);
        this.acomodar();
    }

    retirarTodo() {
        this.retirar();
    }
}

// Una tarjeta del panel. Fases: [escribiendo] → leyendo → saliendo → terminada.
// Todas usan temporizadores y animaciones de la escena que se pueden pausar y reanudar.
class Tarjeta {
    constructor(panel, tipo, mensaje, { escribir, lecturaMs, alLeida, alTerminar }) {
        this.panel = panel;
        this.scene = panel.scene;
        this.tipo = tipo;
        this.mensaje = mensaje;
        this.escribir = escribir;
        this.lecturaMs = lecturaMs;
        this.alLeida = alLeida;
        this.alTerminar = alTerminar;
        this.escritas = 0;
        this.fase = 'nueva';
        this.y = 0;
        this.vista = this.scene.add.container(0, 0);
        panel.contenido.add(this.vista);
        this.componer();
    }

    // Arma el dibujo para el ancho actual del panel conservando cuántas letras se escribieron
    componer() {
        const scene = this.scene, ancho = this.panel.anchoTarjeta(), m = this.mensaje;
        this.vista.removeAll(true);
        const libreta = this.tipo === 'libreta';
        const titulo = libreta ? (m.titulo || '🕵️ LIBRETA DEL INSPECTOR') : `${m.etiqueta || '✦'} ${m.titulo || 'RASTRO'}`;
        const color = libreta ? (m.color || '#c89012') : '#ffd27a';
        const cabecera = scene.add.text(12, 6, titulo, { fontFamily: FUENTE, fontSize: '11px', color, resolution: 2 });
        const cuerpo = scene.add.text(12, 22, '', {
            fontFamily: FUENTE, fontSize: libreta ? '13px' : '12px', color: libreta ? '#f0e6d3' : '#ffe6b0',
            lineSpacing: 3, resolution: 2, wordWrap: { width: Math.max(40, ancho - 22), useAdvancedWrap: true }
        });
        this.envuelto = cuerpo.getWrappedText(m.texto).join('\n');
        cuerpo.setText(this.envuelto);
        this.alto = cuerpo.y + cuerpo.height + 8;
        cuerpo.setWordWrapWidth(null).setText(this.escribir ? this.envuelto.slice(0, this.escritas) : this.envuelto);
        const fondo = scene.add.graphics();
        fondo.fillStyle(libreta ? 0x0b1420 : 0x141008, 0.96);
        fondo.fillRoundedRect(0, 0, ancho, this.alto, 8);
        // Para el revisor (F6): el fondo es un Graphics y no sabe medirse; lo suyo va dentro de él
        const grupo = `tarjeta${++tarjetasCreadas}`;
        etiquetar(fondo, { tipo: 'control', grupo, rect: { x: 0, y: 0, ancho, alto: this.alto } });
        etiquetar(cabecera, { tipo: 'contenido', grupo });
        etiquetar(cuerpo, { tipo: 'contenido', grupo });
        fondo.fillStyle(Phaser.Display.Color.HexStringToColor(color).color, 0.9);
        fondo.fillRoundedRect(4, 6, 3, this.alto - 12, 1.5);
        this.vista.add([fondo, cabecera, cuerpo]);
        this.cuerpo = cuerpo;
    }

    iniciar() {
        this.vista.setAlpha(0);
        this.animacion = this.scene.tweens.add({ targets: this.vista, alpha: 1, duration: this.tipo === 'libreta' ? 200 : 300 });
        if (this.escribir && this.envuelto.length) {
            this.fase = 'escribiendo';
            const escritura = this.scene.time.addEvent({
                delay: LECTURA.escrituraPorLetraMs, loop: true,
                callback: () => {
                    // Solo actúa el temporizador vigente. Phaser 3.80.1, al recuperar un cuadro lento, puede volver a
                    // ejecutar una vez un temporizador repetitivo que se canceló desde su propia función.
                    if (this.escritura !== escritura) return;
                    this.cuerpo.setText(this.envuelto.slice(0, ++this.escritas));
                    if (this.escritas >= this.envuelto.length) {
                        escritura.remove();
                        this.empezarLectura();       // deja this.escritura en null: ya no es el vigente
                    }
                }
            });
            this.escritura = escritura;
        } else {
            this.escritas = this.envuelto.length;
            this.empezarLectura();
        }
    }

    // El tiempo de lectura cuenta desde que el texto está completo
    empezarLectura() {
        this.escritura = null;
        this.fase = 'leyendo';
        this.temporizador = this.scene.time.delayedCall(this.lecturaMs, () => this.salir());
    }

    salir() {
        this.temporizador = null;
        this.fase = 'saliendo';
        this.alLeida?.();
        this.animacion = this.scene.tweens.add({
            targets: this.vista, alpha: 0, duration: this.tipo === 'libreta' ? 220 : 600,
            onComplete: () => this.terminar()
        });
    }

    terminar() {
        if (this.fase === 'terminada') return;
        this.fase = 'terminada';
        this.vista.destroy();
        this.panel.quitar(this);
        this.alTerminar?.();
    }

    // Suspende sin consumir tiempo: la escritura queda en su letra y la lectura conserva su tiempo restante
    pausar() {
        if (this.pausada || this.retirada || this.fase === 'terminada') return;
        this.pausada = true;
        if (this.escritura) this.escritura.paused = true;
        if (this.temporizador) this.temporizador.paused = true;
        if (this.animacion?.isPlaying()) this.animacion.pause();
        if (this.tipo === 'libreta') this.vista.setVisible(false);   // no compite con la presentación importante
    }

    reanudar() {
        if (!this.pausada || this.retirada) return;
        this.pausada = false;
        if (this.escritura) this.escritura.paused = false;
        if (this.temporizador) this.temporizador.paused = false;
        if (this.animacion?.isPaused()) this.animacion.resume();
        this.vista.setVisible(true);
    }

    // Estado medible (para pruebas e informes)
    estado() {
        return {
            fase: this.fase, escritas: this.escritas, total: this.envuelto.length,
            lecturaRestanteMs: this.temporizador ? Math.round(this.temporizador.getRemaining()) : null, pausada: !!this.pausada
        };
    }

    // Al terminar o reiniciar el nivel: se quita sin avisar
    retirar() {
        this.retirada = true;
        this.escritura?.remove();
        this.temporizador?.remove();
        this.escritura = this.temporizador = null;   // ninguna ejecución pendiente sigue siendo la vigente
        this.animacion?.stop();
        if (this.vista.scene) this.vista.destroy();
    }
}
