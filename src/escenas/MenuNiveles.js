// El menú de niveles. Se arma en flujo (src/ui/Pantalla.js): el título arriba, la rejilla de niveles (que baja a más filas si
// hacen falta y se desplaza si no cabe) y "Regresar" abajo. Ninguna posición vertical es fija.
import Boton, { FUENTE } from '../ui/Boton.js';
import Pantalla from '../ui/Pantalla.js';
import { etiquetar } from '../ui/etiquetas.js';
import Progreso from '../ui/Progreso.js';
import { TOTAL_NIVELES, TITULOS_DE_NIVELES, esJugable } from '../motor/niveles.js';
import { repartirEnFilas } from '../motor/Maquetacion.js';
import { fondoCubriendo } from './utilidades.js';

const NOMBRES_NIVELES = TITULOS_DE_NIVELES.map((titulo, i) => `${i + 1}. ${titulo}`);
const CAJA = { x: 340, y: 0, ancho: 600, alto: 720 };          // la columna central: 500 × 600 ampliada 1,2
const BOTON = { ancho: 276, alto: 62, hueco: 12, huecoVertical: 31 };

export default class MenuNiveles extends Phaser.Scene {
    constructor() { super('MenuNiveles'); }

    create() {
        fondoCubriendo(this, 'fondoNiveles');
        const p = this.pantalla = new Pantalla(this, { caja: CAJA, margen: { x: 18, y: 80 }, hueco: 24, marco: false, prefijo: 'niveles' });

        // El título, sobre una cinta oscura
        const cinta = this.add.rectangle(0, 0, 360, 72, 0x000000, 0.5);
        const titulo = this.add.text(0, 0, 'NIVELES', { fontFamily: FUENTE, fontSize: '48px', color: '#ffffff', resolution: 2 }).setOrigin(0.5);
        etiquetar(cinta, { tipo: 'control', grupo: 'titulo' });
        etiquetar(titulo, { tipo: 'contenido', grupo: 'titulo' });
        const cabeza = this.add.container(0, 0, [cinta, titulo]);
        p.enCabecera(
            p.objeto('titulo', cabeza, { ancho: 360, alto: 72 }),
            p.texto('subtitulo', 'Completa cada habitación para desbloquear la siguiente', { size: 16, color: '#ffffff', centrado: true })
        );

        // La rejilla de niveles
        const botones = [];
        for (let i = 0; i < TOTAL_NIVELES; i++) {
            const numero = i + 1;
            const completado = Progreso.estaCompletado(numero);
            const desbloqueado = numero === 1 || Progreso.estaCompletado(numero - 1);
            const texto = NOMBRES_NIVELES[i] + (completado ? ' ✔' : desbloqueado ? '' : ' 🔒');
            const boton = new Boton(this, 0, 0, texto, () => {
                if (!desbloqueado) return;
                // Las habitaciones con mapa se juegan; las demás todavía están en construcción
                this.scene.start(esJugable(numero) ? 'Habitacion' : 'EnConstruccion', { numeroDeNivel: numero });
            }, BOTON.ancho, BOTON.alto, desbloqueado ? 16 : 14);
            if (!desbloqueado) {
                boton.fondo.setFillStyle(0x555555);
                boton.etiqueta.setColor('#b5b5b5');
                boton.disableInteractive();
            }
            botones.push(boton);
        }
        const medidas = botones.map((b, i) => ({ id: `n${i}`, ancho: b.ancho, alto: b.alto }));
        const alto = repartirEnFilas(medidas, { ancho: p.anchoCuerpo, hueco: BOTON.hueco, huecoVertical: BOTON.huecoVertical }).alto;
        p.enCuerpo(p.propio('rejilla', alto, botones, (x, y, ancho) => {
            const r = repartirEnFilas(medidas, { x, y, ancho, hueco: BOTON.hueco, huecoVertical: BOTON.huecoVertical });
            for (const c of r.colocados) botones[Number(c.id.slice(1))].setPosition(c.x + c.ancho / 2, c.y + c.alto / 2);
        }));

        const regresar = new Boton(this, 0, 0, 'Regresar', () => this.scene.start('MenuPrincipal'), 192, 53, 24);
        p.enPie(p.objeto('regresar', regresar, { ancho: regresar.ancho, alto: regresar.alto }));
        p.componer();
        this.events.once('shutdown', () => p.destruir());
    }
}
