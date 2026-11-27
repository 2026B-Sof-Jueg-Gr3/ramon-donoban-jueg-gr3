import Boton from '../ui/Boton.js';
import Pantalla from '../ui/Pantalla.js';
import { etiquetar } from '../ui/etiquetas.js';
import { FUENTE_NOVELA, COLOR } from '../ui/estilo.js';
import { texturaDeRetrato } from '../presentacion/Retrato.js';
import { RETRATO } from '../motor/Novela.js';
import { fondoDeTormenta } from './utilidades.js';

// El preámbulo, tal cual en la historia. Se presenta en la caja de diálogo (escena Interludio) con «PREÁMBULO» como nombre.
export const TITULO_DEL_PREAMBULO = 'PREÁMBULO';
export const PREAMBULO = "La Mansión Flieder lleva años abandonada. Los lugareños afirman que sombras malditas mueven los objetos por las noches. El inspector Silas Vane ha llegado bajo la tormenta. Su objetivo: entrar habitación por habitación, ordenar el caos y demostrar con pruebas físicas que la 'magia' es solo una fachada. Enciende tu linterna... la investigación comienza ahora.";

const CAJA = { x: 90, y: 0, ancho: 640, alto: 720 };          // la columna del título y del menú, a la izquierda; el retrato va a la derecha
const ESCALA_DEL_RETRATO = 1.25;

export default class MenuPrincipal extends Phaser.Scene {
    constructor() { super('MenuPrincipal'); }

    // El título y los botones, uno debajo del otro según lo que miden (src/ui/Pantalla.js); el inspector, a la derecha
    // Phaser conserva los datos de la última vez si la escena se abre sin datos: se olvidan para que la próxima vez no vuelvan los créditos
    init(data) {
        this.alAbrirCreditos = !!data?.creditos;
        this.sys.settings.data = {};
    }

    create() {
        const { width, height } = this.scale;
        fondoDeTormenta(this, 0.45);

        // El inspector de pie a la derecha, como en una novela visual
        const retrato = this.add.image(width - 20, height, texturaDeRetrato(this, 'neutral')).setOrigin(1, 1)
            .setDisplaySize(RETRATO.ancho * ESCALA_DEL_RETRATO, RETRATO.alto * ESCALA_DEL_RETRATO).setAlpha(0);
        etiquetar(retrato, { tipo: 'ignorar' });
        this.tweens.add({ targets: retrato, alpha: 1, x: width - 60, duration: 900, ease: 'Sine.easeOut' });

        const p = this.pantalla = new Pantalla(this, { caja: CAJA, margen: { x: 20, y: 60 }, hueco: 14, marco: false, prefijo: 'principal', centrarCuerpo: true });
        const titulo = p.texto('titulo', 'SILAS VANE', { size: 66, color: COLOR.titulo, centrado: true, fuente: FUENTE_NOVELA });
        titulo.texto.setFontStyle('bold').setShadow(0, 4, '#000000', 10, false, true);
        titulo.alto = titulo.texto.height;
        const subtitulo = p.texto('subtitulo', 'El Misterio de la Mansión', { size: 30, color: COLOR.texto, centrado: true, fuente: FUENTE_NOVELA });
        subtitulo.texto.setFontStyle('italic').setShadow(0, 2, '#000000', 6, false, true);
        subtitulo.alto = subtitulo.texto.height;
        const filete = this.add.rectangle(0, 0, 360, 2, COLOR.dorado, 0.85);
        etiquetar(filete, { tipo: 'ignorar' });
        const jugar = new Boton(this, 0, 0, 'Comenzar la investigación', () => this.scene.start('Interludio', { titulo: TITULO_DEL_PREAMBULO, texto: PREAMBULO, siguiente: 'MenuNiveles' }), 340, 54, 22);
        const habitaciones = new Boton(this, 0, 0, 'Habitaciones', () => this.scene.start('MenuNiveles'), 340, 54, 22);
        const creditos = new Boton(this, 0, 0, 'Créditos', () => this.mostrarCreditos(), 340, 54, 22);
        p.enCuerpo(
            titulo,
            subtitulo,
            { ...p.objeto('filete', filete, { ancho: 360, alto: 2 }), antes: 10 },
            { ...p.objeto('jugar', jugar, { ancho: jugar.ancho, alto: jugar.alto }), antes: 46 },
            p.objeto('habitaciones', habitaciones, { ancho: habitaciones.ancho, alto: habitaciones.alto }),
            p.objeto('creditos', creditos, { ancho: creditos.ancho, alto: creditos.alto })
        );
        p.componer();
        this.events.once('shutdown', () => p.destruir());
        if (this.alAbrirCreditos) this.mostrarCreditos();      // el informe final lleva a los créditos
    }

    mostrarCreditos() {
        const p = new Pantalla(this, {
            caja: { x: 340, y: 120, ancho: 600, alto: 480 }, margen: { x: 36, y: 32 }, hueco: 18, profundidad: 100, velo: true, prefijo: 'creditos'
        });
        const cerrar = () => p.destruir();
        const titulo = p.texto('titulo', 'CRÉDITOS', { size: 34, color: COLOR.titulo, centrado: true, fuente: FUENTE_NOVELA });
        titulo.texto.setFontStyle('bold');
        titulo.alto = titulo.texto.height;
        p.enCuerpo(
            titulo,
            p.texto('autor', 'Donoban Ramón', { size: 26, color: COLOR.texto, centrado: true, fuente: FUENTE_NOVELA }),
            p.texto('creditos', 'Ayuda al inspector Silas Vane a demostrar que los fantasmas no existen usando la razón. Recorre la mansión y encuentra cada pista.',
                { size: 20, color: COLOR.textoTenue, espacio: 8, centrado: true, fuente: FUENTE_NOVELA })
        );
        const boton = new Boton(this, 0, 0, 'Cerrar', cerrar, 200, 48, 22);
        p.enPie(p.objeto('cerrar', boton, { ancho: boton.ancho, alto: boton.alto }));
        p.componer();
    }
}
