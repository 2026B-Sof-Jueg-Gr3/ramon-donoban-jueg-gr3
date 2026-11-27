// El menú de niveles. Se arma en flujo (src/ui/Pantalla.js): el título arriba, la rejilla de niveles (que baja a más filas si
// hacen falta y se desplaza si no cabe) y "Regresar" abajo. Ninguna posición vertical es fija.
import Boton from '../ui/Boton.js';
import Pantalla from '../ui/Pantalla.js';
import { etiquetar } from '../ui/etiquetas.js';
import { FUENTE_NOVELA, COLOR } from '../ui/estilo.js';
import Progreso from '../ui/Progreso.js';
import { TOTAL_NIVELES, TITULOS_DE_NIVELES, esJugable } from '../motor/niveles.js';
import { repartirEnFilas } from '../motor/Maquetacion.js';
import { fondoDeTormenta } from './utilidades.js';
import { iconoDeCandado } from '../presentacion/ArteDibujado.js';

const NOMBRES_NIVELES = TITULOS_DE_NIVELES.map((titulo, i) => `${i + 1}. ${titulo}`);
const CAJA = { x: 290, y: 0, ancho: 700, alto: 720 };          // la columna central
const BOTON = { ancho: 312, alto: 62, hueco: 14, huecoVertical: 22 };

export default class MenuNiveles extends Phaser.Scene {
    constructor() { super('MenuNiveles'); }

    create() {
        fondoDeTormenta(this, 0.55);
        const p = this.pantalla = new Pantalla(this, { caja: CAJA, margen: { x: 18, y: 70 }, hueco: 16, marco: false, prefijo: 'niveles' });

        // El título, con la misma letra y el mismo dorado de la caja de diálogo
        const titulo = p.texto('titulo', 'LA MANSIÓN', { size: 52, color: COLOR.titulo, centrado: true, fuente: FUENTE_NOVELA });
        titulo.texto.setFontStyle('bold').setShadow(0, 4, '#000000', 10, false, true);
        titulo.alto = titulo.texto.height;
        const filete = this.add.rectangle(0, 0, 320, 2, COLOR.dorado, 0.85);
        etiquetar(filete, { tipo: 'ignorar' });
        const subtitulo = p.texto('subtitulo', 'Completa cada habitación para desbloquear la siguiente', { size: 18, color: COLOR.textoTenue, centrado: true, fuente: FUENTE_NOVELA });
        subtitulo.texto.setFontStyle('italic');
        p.enCabecera(titulo, p.objeto('filete', filete, { ancho: 320, alto: 2 }), subtitulo);

        // La rejilla de niveles
        const botones = [];
        for (let i = 0; i < TOTAL_NIVELES; i++) {
            const numero = i + 1;
            const completado = Progreso.estaCompletado(numero);
            const desbloqueado = numero === 1 || Progreso.estaCompletado(numero - 1);
            const texto = NOMBRES_NIVELES[i] + (completado ? ' ✔' : '');
            const boton = new Boton(this, 0, 0, texto, () => {
                if (!desbloqueado) return;
                // Las habitaciones con mapa se juegan; las demás todavía están en construcción
                this.scene.start(esJugable(numero) ? 'Habitacion' : 'EnConstruccion', { numeroDeNivel: numero });
            }, BOTON.ancho, BOTON.alto, 18);
            if (!desbloqueado) boton.bloquear().ponerIcono(iconoDeCandado(this));          // un candado dibujado, no un emoji
            botones.push(boton);
        }
        const medidas = botones.map((b, i) => ({ id: `n${i}`, ancho: b.ancho, alto: b.alto }));
        const alto = repartirEnFilas(medidas, { ancho: p.anchoCuerpo, hueco: BOTON.hueco, huecoVertical: BOTON.huecoVertical }).alto;
        p.enCuerpo(p.propio('rejilla', alto, botones, (x, y, ancho) => {
            const r = repartirEnFilas(medidas, { x, y, ancho, hueco: BOTON.hueco, huecoVertical: BOTON.huecoVertical });
            for (const c of r.colocados) botones[Number(c.id.slice(1))].setPosition(c.x + c.ancho / 2, c.y + c.alto / 2);
        }));

        const regresar = new Boton(this, 0, 0, 'Regresar', () => this.scene.start('MenuPrincipal'), 220, 50, 22);
        p.enPie(p.objeto('regresar', regresar, { ancho: regresar.ancho, alto: regresar.alto }));
        p.componer();
        this.events.once('shutdown', () => p.destruir());
    }
}
