// La pantalla de informe de una habitación (provisional, 1280×720): el título del nivel, el texto "informe" de la
// narrativa tal cual y lo encontrado. Es el único lugar del juego con contadores (DISENO_V2.md, sección 3).
// Botones: "Siguiente habitación" (a la habitación siguiente si ya se puede jugar, y si no a EnConstruccion) y "Volver al menú".
// Se arma en flujo (src/ui/Pantalla.js): cabecera arriba, botones y ayuda abajo y, en medio, el informe y lo encontrado
// en una zona que se desplaza si no cabe. Ratón o teclado (← → / A D mueven entre los botones, ↑ ↓ desplazan si hace
// falta, E / Enter / Espacio eligen, Esc vuelve al menú).
import Pantalla, { TEXTO } from '../ui/Pantalla.js';
import { TOTAL_NIVELES, TITULOS_DE_NIVELES, esJugable } from '../motor/niveles.js';
import { cargaExtrema, informeExtremo } from '../presentacion/CargaExtrema.js';

const CAJA = { x: 120, y: 40, ancho: 1040, alto: 640 };

export default class Informe extends Phaser.Scene {
    constructor() { super('Informe'); }

    // resumen: { pistas, totalDePistas, pilas } de la partida que acaba de terminar
    init(data) {
        this.numeroDeNivel = data.numeroDeNivel ?? 1;
        this.resumen = data.resumen ?? { extras: 0, totalDeExtras: 0, pilas: false };
    }

    create() {
        const n = this.numeroDeNivel;
        const narrativa = this.cache.json.get('narrativa' + n);
        this.cameras.main.setBackgroundColor('#05080d');
        const p = this.pantalla = new Pantalla(this, { caja: CAJA, profundidad: 0, prefijo: 'informe' });
        const informe = cargaExtrema() ? informeExtremo(this) : narrativa.informe;

        p.enCabecera(
            p.texto('numero', `HABITACIÓN ${n} · INFORME`, { size: 16, color: TEXTO.tenue, centrado: true }),
            p.textoAjustado('titulo', TITULOS_DE_NIVELES[n - 1].toUpperCase(), { size: 44, minimo: 24, altoMaximo: 110, color: TEXTO.ambar, centrado: true }),
            p.linea()
        );
        // El texto del informe, exacto como está en la narrativa, y lo encontrado
        const r = this.resumen;
        p.enCuerpo(
            p.texto('informe', informe, { size: 22, espacio: 9, ancho: p.anchoCuerpo }),
            { ...p.linea(), antes: 10 },
            p.texto('encontrado', 'LO ENCONTRADO', { size: 14, color: TEXTO.tenue }),
            p.texto('extras', `📜  Hallazgos extra: ${r.extras} de ${r.totalDeExtras}`, { size: 24, emoji: true }),
            p.texto('pilas', `🔋  Pilas: ${r.pilas ? 'encontradas' : 'no encontradas'}`, { size: 24, emoji: true })
        );
        const botones = [];
        if (n < TOTAL_NIVELES) botones.push({ texto: 'Siguiente habitación', primario: true, ancho: 340, alActivar: () => this.siguiente() });
        else botones.push({ texto: 'Ver créditos', primario: true, ancho: 300, alActivar: () => this.scene.start('MenuPrincipal', { creditos: true }) });
        botones.push({ texto: 'Volver al menú', primario: true, ancho: 300, alActivar: () => this.volver() });
        const base = '← →  /  A  D: mover     ·     E / Enter / clic: elegir     ·     Esc: volver al menú';
        const ayuda = p.texto('ayuda', '↑ ↓: desplazar     ·     ' + base, { size: 12, color: TEXTO.tenue, centrado: true });
        p.enPie(p.botones('botones', botones, { alto: 56 }), ayuda);
        p.componer();
        if (!p.desplazable) ayuda.texto.setText(base);
        p.enfocar(0);

        const kb = this.input.keyboard;
        kb.addCapture('SPACE');
        const arriba = () => (p.desplazable ? p.desplazar(-1) : p.moverFoco(-1));
        const abajo = () => (p.desplazable ? p.desplazar(1) : p.moverFoco(1));
        for (const t of ['A', 'LEFT']) kb.on(`keydown-${t}`, () => p.moverFoco(-1));
        for (const t of ['D', 'RIGHT']) kb.on(`keydown-${t}`, () => p.moverFoco(1));
        for (const t of ['W', 'UP']) kb.on(`keydown-${t}`, arriba);
        for (const t of ['S', 'DOWN']) kb.on(`keydown-${t}`, abajo);
        kb.on('keydown-PAGEUP', () => p.desplazar(-2));
        kb.on('keydown-PAGEDOWN', () => p.desplazar(2));
        for (const t of ['E', 'ENTER', 'SPACE']) kb.on(`keydown-${t}`, ev => { if (!ev.repeat) p.items[p.foco]?.activar(); });
        kb.on('keydown-ESC', () => this.volver());
        this.events.once('shutdown', () => { kb.clearCaptures(); p.destruir(); });
    }

    siguiente() {
        const siguiente = this.numeroDeNivel + 1;
        this.scene.start(esJugable(siguiente) ? 'Habitacion' : 'EnConstruccion', { numeroDeNivel: siguiente });
    }

    volver() {
        this.scene.start('MenuNiveles');
    }
}
