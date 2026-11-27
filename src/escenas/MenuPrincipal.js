import Boton from '../ui/Boton.js';
import Pantalla from '../ui/Pantalla.js';
import { etiquetar } from '../ui/etiquetas.js';
import { fondoCubriendo } from './utilidades.js';

const PREAMBULO = "PREÁMBULO: La Mansión Flieder lleva años abandonada. Los lugareños afirman que sombras malditas mueven los objetos por las noches. El Inspector Lógica ha llegado bajo la tormenta. Su objetivo: entrar habitación por habitación, ordenar el caos y demostrar con pruebas físicas que la 'magia' es solo una fachada. Enciende tu linterna... la investigación comienza ahora. [Presiona ESPACIO para continuar]";
const CAJA = { x: 340, y: 0, ancho: 600, alto: 720 };          // la columna central: 500 × 600 ampliada 1,2

export default class MenuPrincipal extends Phaser.Scene {
    constructor() { super('MenuPrincipal'); }

    // El título, el logo y los botones, uno debajo del otro según lo que miden (src/ui/Pantalla.js)
    init(data) { this.alAbrirCreditos = !!data?.creditos; }

    create() {
        fondoCubriendo(this, 'fondoMenu');
        const p = this.pantalla = new Pantalla(this, { caja: CAJA, margen: { x: 20, y: 56 }, hueco: 30, marco: false, prefijo: 'principal' });
        const logo = etiquetar(this.add.image(0, 0, 'logo').setDisplaySize(192, 192), { tipo: 'contenido' });
        const jugar = new Boton(this, 0, 0, 'Jugar', () => this.scene.start('Interludio', { texto: PREAMBULO, siguiente: 'MenuNiveles' }), 240, 53, 24);
        const creditos = new Boton(this, 0, 0, 'Créditos', () => this.mostrarCreditos(), 240, 53, 24);
        const titulo = p.texto('titulo', 'INSPECTOR LÓGICA:\nEl Misterio de la Mansión', { size: 32, color: '#ffffff', centrado: true });
        titulo.texto.setStroke('#000000', 7);
        p.enCuerpo(
            titulo,
            p.objeto('logo', logo, { ancho: 192, alto: 192 }),
            { ...p.objeto('jugar', jugar, { ancho: jugar.ancho, alto: jugar.alto }), antes: 70 },
            p.objeto('creditos', creditos, { ancho: creditos.ancho, alto: creditos.alto })
        );
        p.componer();
        this.events.once('shutdown', () => p.destruir());
        if (this.alAbrirCreditos) this.mostrarCreditos();      // el informe final lleva a los créditos
    }

    mostrarCreditos() {
        const p = new Pantalla(this, {
            caja: { x: 376, y: 96, ancho: 528, alto: 528 }, margen: { x: 30, y: 30 }, hueco: 20, profundidad: 100, velo: true, prefijo: 'creditos',
            estilo: { fondo: 0x1b1b1b, borde: 0xffffff, opacidad: 1 }
        });
        const cerrar = () => p.destruir();
        p.enCuerpo(p.texto('creditos',
            'CRÉDITOS\n\nDonoban Ramón\n\nAyuda al Inspector Lógica a demostrar que los fantasmas no existen usando la razón. Recorre la mansión y encuentra cada pista.',
            { size: 22, color: '#ffffff', espacio: 8, centrado: true }));
        const boton = new Boton(this, 0, 0, 'Cerrar', cerrar, 192, 48, 24);
        p.enPie(p.objeto('cerrar', boton, { ancho: boton.ancho, alto: boton.alto }));
        p.componer();
    }
}

