/**
 * ControlesTactiles — Controles táctiles temáticos para Inspector Lógica
 *
 * Estética: Detective / linterna de ámbar / mansión oscura
 * Uso de Phaser Graphics para bordes redondeados, hubs decorativos y retroalimentación visual.
 */
import Direccion from '../modelo/Direccion.js';

// ── Dimensiones ────────────────────────────────────────────────────────────
const S   = 58;    // tamaño de cada botón del d-pad (px)
const GAP = 8;     // separación entre botones del d-pad

// Altura total reservada en la pantalla para la franja de controles
export const ALTO_CONTROLES = S * 3 + GAP * 2 + 36;

// ── Paleta ─────────────────────────────────────────────────────────────────
const PANEL_BG  = 0x04090f;   // fondo del panel de controles
const BTN_BASE  = 0x0d1a2b;   // relleno normal del botón
const AMBER     = 0xc89012;   // dorado ámbar (borde normal)
const AMBER_HI  = 0xf5b830;   // ámbar brillante (borde presionado)
const BTN_PRESS = 0x1e3050;   // relleno al presionar
const GREEN_D   = 0x0d2010;   // base botón deshacer
const GREEN_B   = 0x28a048;   // borde botón deshacer
const RED_D     = 0x20080a;   // base botón reiniciar
const RED_B     = 0xcc3333;   // borde botón reiniciar

// ── Helpers de dibujo ──────────────────────────────────────────────────────
function rr(g, w, h, fill, fillA, stroke, strokeA = 0.95, strokeW = 1.5) {
    const rad = Math.min(w, h) * 0.22;
    g.clear();
    g.fillStyle(fill, fillA);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, rad);
    g.lineStyle(strokeW, stroke, strokeA);
    g.strokeRoundedRect(-w / 2, -h / 2, w, h, rad);
}

function pill(g, w, h, fill, fillA, stroke, strokeA = 0.9, strokeW = 1.5) {
    g.clear();
    g.fillStyle(fill, fillA);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, h / 2);
    g.lineStyle(strokeW, stroke, strokeA);
    g.strokeRoundedRect(-w / 2, -h / 2, w, h, h / 2);
}

// ── Fábrica de botón de d-pad ──────────────────────────────────────────────
function crearBtnDpad(scene, flecha, dir, onMover) {
    const g = scene.add.graphics();
    rr(g, S, S, BTN_BASE, 0.92, AMBER);

    const lbl = scene.add.text(0, 1, flecha, {
        fontSize: '28px',
        color: '#c89012',
        stroke: '#03070e',
        strokeThickness: 2,
        resolution: 2
    }).setOrigin(0.5);

    const c = scene.add.container(0, 0, [g, lbl]);
    c.setSize(S, S).setInteractive({ useHandCursor: false });

    function presionar() {
        rr(g, S, S, BTN_PRESS, 0.97, AMBER_HI, 1, 2);
        lbl.setColor('#ffd060').setStroke('#80500a', 2);
        scene.tweens.killTweensOf(c);
        scene.tweens.add({ targets: c, scaleX: 0.84, scaleY: 0.84, duration: 60, ease: 'Power3' });
        onMover(dir);
    }

    function soltar() {
        rr(g, S, S, BTN_BASE, 0.92, AMBER);
        lbl.setColor('#c89012').setStroke('#03070e', 2);
        scene.tweens.killTweensOf(c);
        scene.tweens.add({ targets: c, scaleX: 1, scaleY: 1, duration: 130, ease: 'Back.easeOut' });
    }

    function cancelar() {
        rr(g, S, S, BTN_BASE, 0.92, AMBER);
        lbl.setColor('#c89012').setStroke('#03070e', 2);
        scene.tweens.killTweensOf(c);
        c.setScale(1);
    }

    c.on('pointerdown', presionar);
    c.on('pointerup', soltar);
    c.on('pointerout', cancelar);
    c.on('pointercancel', cancelar);

    return c;
}

// ── Fábrica de botón de acción (deshacer / reiniciar) ─────────────────────
function crearBtnAccion(scene, icono, etiqueta, baseFill, baseBorder, onClic) {
    const aW = S * 1.9, aH = S * 0.76;

    const g = scene.add.graphics();
    pill(g, aW, aH, baseFill, 0.92, baseBorder);

    const ico = scene.add.text(-aW / 2 + 15, 0, icono, {
        fontSize: '21px',
        color: `#${baseBorder.toString(16).padStart(6, '0')}`,
        resolution: 2
    }).setOrigin(0, 0.5);

    const lbl = scene.add.text(-aW / 2 + 40, 0, etiqueta, {
        fontSize: '11px',
        fontStyle: 'bold',
        fontFamily: '"Courier New", Courier, monospace',
        color: '#8aabbf',
        resolution: 2
    }).setOrigin(0, 0.5);

    const c = scene.add.container(0, 0, [g, ico, lbl]);
    c.setSize(aW, aH).setInteractive({ useHandCursor: false });

    const borderHex = `#${baseBorder.toString(16).padStart(6, '0')}`;

    function presionar() {
        g.clear();
        const r = aH / 2;
        g.fillStyle(baseBorder, 0.3);
        g.fillRoundedRect(-aW / 2, -aH / 2, aW, aH, r);
        g.lineStyle(2, 0xffffff, 0.5);
        g.strokeRoundedRect(-aW / 2, -aH / 2, aW, aH, r);
        ico.setColor('#ffffff');
        lbl.setColor('#ffffff');
        scene.tweens.killTweensOf(c);
        scene.tweens.add({ targets: c, scaleX: 0.88, scaleY: 0.88, duration: 60, ease: 'Power3' });
        onClic();
    }

    function soltar() {
        pill(g, aW, aH, baseFill, 0.92, baseBorder);
        ico.setColor(borderHex);
        lbl.setColor('#8aabbf');
        scene.tweens.killTweensOf(c);
        scene.tweens.add({ targets: c, scaleX: 1, scaleY: 1, duration: 130, ease: 'Back.easeOut' });
    }

    function cancelar() {
        pill(g, aW, aH, baseFill, 0.92, baseBorder);
        ico.setColor(borderHex);
        lbl.setColor('#8aabbf');
        scene.tweens.killTweensOf(c);
        c.setScale(1);
    }

    c.on('pointerdown', presionar);
    c.on('pointerup', soltar);
    c.on('pointerout', cancelar);
    c.on('pointercancel', cancelar);

    return c;
}

// ── Clase principal ────────────────────────────────────────────────────────
export default class ControlesTactiles {
    /**
     * @param {Phaser.Scene} scene
     * @param {{ onMover, onDeshacer, onReiniciar }} callbacks
     */
    constructor(scene, { onMover, onDeshacer, onReiniciar }) {
        this._s = scene;

        // Fondo del panel y separador (depth bajo para quedar detrás)
        this._panel    = scene.add.graphics().setDepth(17);
        this._sep      = scene.add.graphics().setDepth(17);
        this._hub      = scene.add.graphics().setDepth(19);

        // D-pad
        this._arr = crearBtnDpad(scene, '▲', Direccion.ARRIBA,    onMover).setDepth(20);
        this._izq = crearBtnDpad(scene, '◀', Direccion.IZQUIERDA, onMover).setDepth(20);
        this._der = crearBtnDpad(scene, '▶', Direccion.DERECHA,   onMover).setDepth(20);
        this._aba = crearBtnDpad(scene, '▼', Direccion.ABAJO,     onMover).setDepth(20);

        // Acciones
        this._undo    = crearBtnAccion(scene, '↩', 'DESHACER',  GREEN_D, GREEN_B, onDeshacer).setDepth(20);
        this._restart = crearBtnAccion(scene, '↺', 'REINICIAR', RED_D,   RED_B,   onReiniciar).setDepth(20);
    }

    /** Reposiciona todos los elementos al redimensionar la ventana. */
    reposicionar(w, h) {
        const s = S, gap = GAP;

        // ── Escala automática para pantallas estrechas ─────────
        // Espacio mínimo horizontal: margen + botones acción + sep + d-pad + margen
        const dpadNat = s * 3 + gap * 2;      // ancho d-pad sin escalar
        const aWNat   = s * 1.9;              // ancho botón acción sin escalar
        const necesario = 12 + aWNat + 16 + dpadNat + 12;
        const sc = Math.min(1.0, w / necesario);

        const eS    = s * sc;
        const eGAP  = gap * sc;
        const eAW   = aWNat * sc;
        const eAH   = s * 0.76 * sc;
        const eDpad = dpadNat * sc;

        // ── Panel de fondo ─────────────────────────────────────
        this._panel.clear();
        this._panel.fillStyle(PANEL_BG, 0.94);
        this._panel.fillRect(0, h - ALTO_CONTROLES, w, ALTO_CONTROLES);
        this._panel.fillStyle(0x000000, 0.25);
        this._panel.fillRect(0, h - ALTO_CONTROLES, 32, ALTO_CONTROLES);
        this._panel.fillRect(w - 32, h - ALTO_CONTROLES, 32, ALTO_CONTROLES);

        // ── Línea separadora ámbar ─────────────────────────────
        this._sep.clear();
        this._sep.lineStyle(1, AMBER, 0.45);
        this._sep.lineBetween(16, h - ALTO_CONTROLES, w - 16, h - ALTO_CONTROLES);
        this._sep.fillStyle(AMBER, 0.6);
        this._sep.fillCircle(16, h - ALTO_CONTROLES, 3);
        this._sep.fillCircle(w - 16, h - ALTO_CONTROLES, 3);

        // ── Centro vertical de la franja ──────────────────────
        const midY = h - ALTO_CONTROLES / 2;

        // ── D-pad con escala (esquina derecha) ────────────────
        const dpadCX = w - eDpad / 2 - 10;
        this._arr.setScale(sc).setPosition(dpadCX,                 midY - eS - eGAP);
        this._izq.setScale(sc).setPosition(dpadCX - eS - eGAP,    midY);
        this._der.setScale(sc).setPosition(dpadCX + eS + eGAP,    midY);
        this._aba.setScale(sc).setPosition(dpadCX,                 midY + eS + eGAP);

        // Hub central decorativo
        const hubR = 13 * sc;
        this._hub.clear();
        this._hub.fillStyle(0x0a1525, 1);
        this._hub.fillCircle(dpadCX, midY, hubR);
        this._hub.lineStyle(Math.max(1, 1.5 * sc), AMBER, 0.7);
        this._hub.strokeCircle(dpadCX, midY, hubR);
        this._hub.fillStyle(AMBER, 0.85);
        this._hub.fillCircle(dpadCX, midY, 5 * sc);

        // ── Botones de acción con escala (esquina izquierda) ───
        const ax   = 10 + eAW / 2;
        const aGap = 7 * sc;
        this._undo.setScale(sc).setPosition(ax,    midY - eAH / 2 - aGap / 2);
        this._restart.setScale(sc).setPosition(ax, midY + eAH / 2 + aGap / 2);
    }

    // Durante una pausa narrativa la presentación ocupa esta zona: los controles se ocultan y no reciben toques
    setHabilitados(habilitados) {
        [this._panel, this._sep, this._hub,
         this._arr, this._izq, this._der, this._aba,
         this._undo, this._restart].forEach(o => {
            o.setVisible(habilitados);
            if (o.input) o.input.enabled = habilitados;
        });
    }

    destruir() {
        [this._panel, this._sep, this._hub,
         this._arr, this._izq, this._der, this._aba,
         this._undo, this._restart].forEach(o => o.destroy());
    }
}
