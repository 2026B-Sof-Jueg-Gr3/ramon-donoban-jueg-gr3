import { FUENTE } from './Boton.js';
import { LECTURA } from './tiemposDeLectura.js';

// Presentación de los acontecimientos importantes durante la pausa narrativa.
// Ocupa la zona de los controles (que quedan desactivados) y pone un velo suave sobre el tablero, que sigue
// visible y sin cambiar de lugar. Los textos que no caben se reparten en páginas sin perder contenido.
// No escucha el teclado: Espacio y Enter le llegan desde el distribuidor de entradas; tocarla también avanza.
const PADDING = 16;
const AMBAR = 0xc89012;
const ANCHO_MAX = 680;

export default class DialogoPrincipal {
    // alPulsar: lo que hace un toque sobre la presentación (lo decide el distribuidor de entradas)
    constructor(scene, alPulsar) {
        this.scene = scene;
        this.alPulsar = alPulsar;
        this.abierto = false;
        this.zona = { x: 0, y: 0, ancho: scene.scale.width, alto: 200 };
        this.areaVelo = { x: 0, y: 0, ancho: scene.scale.width, alto: scene.scale.height };
    }

    // zona: donde se dibuja (la de los controles) · areaVelo: lo que cubre el velo (tablero y panel)
    reposicionar(zona, areaVelo) {
        this.zona = zona;
        this.areaVelo = areaVelo;
        if (this.abierto) this.dibujar(false);
    }

    // indice/total: posición del acontecimiento dentro de la secuencia de la pausa
    abrir(texto, { titulo = '🕵️ INSPECTOR LÓGICA', indice = 1, total = 1, alCerrar } = {}) {
        this.texto = texto;
        this.titulo = titulo || '🕵️ INSPECTOR LÓGICA';
        this.indice = indice;
        this.total = total;
        this.alCerrar = alCerrar;
        this.pagina = 0;
        this.abierto = true;
        this.dibujar(true);
    }

    actualizarTotal(total) {
        this.total = total;
        if (this.pista) this.pista.setText(this.textoDePista());
    }

    textoDePista() {
        const posicion = this.total > 1 ? ` · ${this.indice} de ${this.total}` : '';
        if (this.escritura) return '▸ Espacio / toca: completar' + posicion;
        return (this.pagina < this.paginas.length - 1 ? '▸ Espacio / toca: sigue' : '▸ Espacio / toca para continuar') + posicion;
    }

    dibujar(escribir) {
        this.escritura?.remove();
        this.escritura = null;
        this.destruirVista();
        const scene = this.scene;
        const z = this.zona, v = this.areaVelo;
        const ancho = Math.max(160, Math.min(z.ancho - 24, ANCHO_MAX));

        this.velo = scene.add.rectangle(v.x, v.y, v.ancho, v.alto, 0x000000, 0.35).setOrigin(0).setDepth(30).setInteractive();
        this.velo.on('pointerdown', () => this.alPulsar?.());

        const cabecera = scene.add.text(PADDING, 10, this.titulo, { fontFamily: FUENTE, fontSize: '12px', color: '#c89012', resolution: 2 });
        const cuerpo = scene.add.text(PADDING, 30, '', {
            fontFamily: FUENTE, fontSize: z.ancho < 360 ? '14px' : '16px', color: '#f0e6d3', lineSpacing: 5, resolution: 2,
            wordWrap: { width: ancho - PADDING * 2, useAdvancedWrap: true }
        });
        // Páginas: tantas líneas como quepan entre la cabecera y la pista; nunca se corta una palabra ni se pierde texto
        const lineas = cuerpo.getWrappedText(this.texto);
        cuerpo.setText('X');
        const altoLinea = cuerpo.height + 5;
        const altoTexto = Math.max(altoLinea, z.alto - 30 - 36);
        const porPagina = Math.max(1, Math.floor(altoTexto / altoLinea));
        this.paginas = [];
        for (let i = 0; i < lineas.length; i += porPagina) this.paginas.push(lineas.slice(i, i + porPagina).join('\n'));
        if (!this.paginas.length) this.paginas.push('');
        this.pagina = Math.min(this.pagina, this.paginas.length - 1);
        cuerpo.setWordWrapWidth(null).setText(escribir ? '' : this.paginas[this.pagina]);

        const alto = z.alto - 12;
        const pista = scene.add.text(ancho - PADDING, alto - 10, '', { fontFamily: FUENTE, fontSize: '11px', color: '#8aabbf', resolution: 2 }).setOrigin(1, 1);
        const fondo = scene.add.graphics();
        fondo.fillStyle(0x0b1420, 0.98);
        fondo.fillRoundedRect(0, 0, ancho, alto, 12);
        fondo.lineStyle(2, AMBAR, 0.95);
        fondo.strokeRoundedRect(0, 0, ancho, alto, 12);

        this.panel = scene.add.container(z.x + (z.ancho - ancho) / 2, z.y + 6, [fondo, cabecera, cuerpo, pista]).setDepth(31);
        this.panel.setInteractive(new Phaser.Geom.Rectangle(0, 0, ancho, alto), Phaser.Geom.Rectangle.Contains);
        this.panel.on('pointerdown', () => this.alPulsar?.());
        this.cuerpo = cuerpo;
        this.pista = pista;
        if (escribir) this.escribirPagina();
        else this.mostrarPista();
    }

    escribirPagina() {
        const texto = this.paginas[this.pagina];
        let i = 0;
        this.cuerpo.setText('');
        if (!texto.length) {
            this.mostrarPista();
            return;
        }
        const escritura = this.scene.time.addEvent({
            delay: LECTURA.escrituraDialogoPorLetraMs, loop: true,
            callback: () => {
                // Solo actúa el temporizador vigente: Phaser 3.80.1 puede volver a ejecutar una vez un temporizador
                // repetitivo cancelado desde su propia función al recuperar un cuadro lento. Sin esta comprobación,
                // la ejecución obsoleta escribiría esta página sobre la siguiente o tocaría la vista ya cerrada.
                if (this.escritura !== escritura) return;
                this.cuerpo.setText(texto.slice(0, ++i));
                if (i >= texto.length) this.mostrarPista();      // deja this.escritura en null
            }
        });
        this.escritura = escritura;
        this.pista.setText(this.textoDePista()).setAlpha(1);
    }

    mostrarPista() {
        this.escritura?.remove();
        this.escritura = null;
        this.cuerpo.setText(this.paginas[this.pagina]);
        this.pista.setText(this.textoDePista()).setAlpha(1);
        this.scene.tweens.killTweensOf(this.pista);
        this.scene.tweens.add({ targets: this.pista, alpha: { from: 1, to: 0.35 }, duration: 700, yoyo: true, repeat: -1 });
    }

    // Si el jugador intenta jugar durante la pausa, se resalta cómo continuar
    llamarAtencion() {
        if (!this.abierto || !this.pista) return;
        const pista = this.pista;
        this.scene.tweens.add({ targets: pista, scale: { from: 1.25, to: 1 }, duration: 260, ease: 'Back.easeOut' });
        pista.setColor('#ffd060');
        this.scene.time.delayedCall(600, () => { if (pista.scene) pista.setColor('#8aabbf'); });
    }

    // Primero completa la página; si quedan páginas, pasa a la siguiente; si no, termina este acontecimiento
    alTocar() {
        if (!this.abierto) return;
        if (this.escritura) {
            this.mostrarPista();
            return;
        }
        if (this.pagina < this.paginas.length - 1) {
            this.pagina++;
            this.escribirPagina();
            return;
        }
        const alCerrar = this.alCerrar;
        this.alCerrar = null;
        alCerrar?.();
    }

    // Fin de la secuencia (o reinicio / salida): quita la presentación y el velo
    cerrar() {
        this.abierto = false;
        this.escritura?.remove();
        this.escritura = null;
        this.destruirVista();
    }

    destruirVista() {
        if (this.pista?.scene) this.scene.tweens.killTweensOf(this.pista);
        if (this.velo?.scene) this.velo.destroy();
        if (this.panel?.scene) this.panel.destroy();
        this.velo = this.panel = this.pista = null;
    }
}
