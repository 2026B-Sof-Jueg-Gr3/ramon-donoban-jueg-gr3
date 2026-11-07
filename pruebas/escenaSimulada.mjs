// Escena de Phaser simulada para probar PanelInvestigacion y DialogoPrincipal en Node.
// El reloj es la transcripción de Phaser 3.80.1 (relojPhaser380.mjs); las animaciones avanzan con el mismo paso.
// Cada cuadro hace lo mismo que Phaser: preUpdate del reloj, update del reloj y update de las animaciones.
import { Clock } from './relojPhaser380.mjs';

// Phaser global mínimo que necesitan los módulos al cargarse y al dibujar
globalThis.Phaser ??= {
    GameObjects: { Container: class { } },
    Display: { Color: { HexStringToColor: () => ({ color: 0 }) } },
    Geom: { Rectangle: class { constructor(x, y, w, h) { Object.assign(this, { x, y, w, h }); } } }
};
Phaser.Geom.Rectangle.Contains ??= () => true;

const ANCHO_LETRA = 8, ALTO_LINEA = 18;

function objetoBase(escena) {
    const o = {
        scene: escena, visible: true, alpha: 1, scale: 1, x: 0, y: 0, eventos: {},
        destroy() { if (o.hijos) o.hijos.forEach(h => h.destroy?.()); o.scene = null; o.destruido = true; },
        setDepth() { return o; }, setOrigin() { return o; }, setScale(v) { o.scale = v; return o; },
        setAlpha(v) { o.alpha = v; return o; }, setVisible(v) { o.visible = v; return o; },
        setPosition(x, y) { o.x = x; o.y = y; return o; }, setSize() { return o; }, setMask() { return o; },
        setInteractive() { o.input = { enabled: true, hitArea: { setSize() { } } }; return o; },
        disableInteractive() { return o; }, on(ev, fn) { o.eventos[ev] = fn; return o; }, setStrokeStyle() { return o; }
    };
    return o;
}

function graficos(escena) {
    const g = objetoBase(escena);
    for (const m of ['clear', 'fillStyle', 'fillRoundedRect', 'lineStyle', 'strokeRoundedRect', 'fillRect', 'fillCircle', 'strokeCircle', 'lineBetween']) g[m] = () => g;
    g.createGeometryMask = () => ({});
    return g;
}

function texto(escena, x, y, contenido, estilo = {}) {
    const t = objetoBase(escena);
    Object.assign(t, { x, y, text: String(contenido ?? ''), style: { color: estilo.color }, anchoEnvoltura: estilo.wordWrap?.width ?? null });
    // Envoltura simple y determinista: palabras completas, ANCHO_LETRA px por letra
    t.getWrappedText = s => {
        const porLinea = Math.max(1, Math.floor((t.anchoEnvoltura ?? 1e9) / ANCHO_LETRA));
        const lineas = [];
        for (const parrafo of String(s).split('\n')) {
            let actual = '';
            for (const palabra of parrafo.split(' ')) {
                const prueba = actual ? actual + ' ' + palabra : palabra;
                if (prueba.length > porLinea && actual) { lineas.push(actual); actual = palabra; } else actual = prueba;
            }
            lineas.push(actual);
        }
        return lineas;
    };
    // Como en Phaser 3.80.1, escribir en un texto destruido no lanza error: se registra para detectar
    // ejecuciones obsoletas que tocan referencias ya eliminadas
    t.escriturasTrasDestruir = 0;
    t.setText = s => {
        if (!t.scene) t.escriturasTrasDestruir++;
        t.text = String(s);
        return t;
    };
    Object.defineProperty(t, 'height', { get: () => Math.max(1, t.text.split('\n').length) * ALTO_LINEA });
    t.setWordWrapWidth = w => { t.anchoEnvoltura = w; return t; };
    t.setColor = c => { t.style.color = c; return t; };
    t.setFontSize = () => t;
    return t;
}

function contenedor(escena, x = 0, y = 0, hijos = []) {
    const c = objetoBase(escena);
    Object.assign(c, { x, y, hijos: [...hijos] });
    Object.defineProperty(c, 'list', { get: () => c.hijos });
    c.add = h => { c.hijos.push(...[].concat(h)); return c; };
    c.removeAll = destruir => { if (destruir) c.hijos.forEach(h => h.destroy?.()); c.hijos = []; return c; };
    return c;
}

export function crearEscena({ ancho = 800, alto = 800 } = {}) {
    const reloj = new Clock();
    const animaciones = [];
    let ahora = 0;
    const escena = {
        scale: { width: ancho, height: alto },
        time: reloj,
        input: { on() { } },
        make: { graphics: () => graficos(escena) },
        add: {
            graphics: () => graficos(escena),
            container: (x, y, hijos) => contenedor(escena, x, y, hijos),
            text: (x, y, s, estilo) => texto(escena, x, y, s, estilo),
            zone: () => { const z = objetoBase(escena); z.input = { hitArea: { setSize() { } } }; return z; },
            rectangle: () => objetoBase(escena)
        },
        tweens: {
            add(cfg) {
                const a = {
                    cfg, restante: cfg.duration ?? 0, infinita: cfg.repeat === -1 || cfg.yoyo, estado: 'activa',
                    isPlaying: () => a.estado === 'activa', isPaused: () => a.estado === 'pausada',
                    pause() { if (a.estado === 'activa') a.estado = 'pausada'; }, resume() { if (a.estado === 'pausada') a.estado = 'activa'; },
                    stop() { a.estado = 'detenida'; }
                };
                animaciones.push(a);
                return a;
            },
            killTweensOf(objetivos) { const l = [].concat(objetivos); animaciones.forEach(a => { if ([].concat(a.cfg.targets).some(t => l.includes(t))) a.estado = 'detenida'; }); },
            getTweensOf(objetivos) { const l = [].concat(objetivos); return animaciones.filter(a => a.estado !== 'detenida' && a.estado !== 'completa' && [].concat(a.cfg.targets).some(t => l.includes(t))); }
        },
        // Un cuadro del juego, como en Phaser: preUpdate y update del reloj, luego las animaciones
        cuadro(delta = 16) {
            ahora += delta;
            reloj.preUpdate();
            reloj.update(ahora, delta);
            for (const a of [...animaciones]) {
                if (a.estado !== 'activa' || a.infinita) continue;
                a.restante -= delta;
                if (a.restante <= 0) {
                    a.estado = 'completa';
                    for (const objetivo of [].concat(a.cfg.targets)) {
                        for (const [k, v] of Object.entries(a.cfg)) {
                            if (['targets', 'duration', 'onComplete', 'ease', 'repeat', 'yoyo'].includes(k)) continue;
                            if (objetivo) objetivo[k] = typeof v === 'object' ? v.to : v;
                        }
                    }
                    a.cfg.onComplete?.();
                }
            }
        },
        cuadros(n, delta = 16) { for (let i = 0; i < n; i++) escena.cuadro(delta); }
    };
    return escena;
}
