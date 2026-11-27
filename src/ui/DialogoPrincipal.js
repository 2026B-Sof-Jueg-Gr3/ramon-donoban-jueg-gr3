import { FUENTE } from './Boton.js';
import { LECTURA } from './tiemposDeLectura.js';
import { maquetarPantalla } from '../motor/Maquetacion.js';

// La caja grande de novela visual para los acontecimientos importantes, durante la pausa narrativa: semitransparente, abajo, con la placa
// del nombre; el juego queda detrás, oscurecido. El retrato y la viñeta los pone un "decorado" aparte (src/presentacion/DecoradoDeNovela.js).
// Los textos que no caben se reparten en páginas sin perder contenido. No escucha el teclado: Espacio y Enter le llegan desde el
// distribuidor de entradas; tocarla también avanza.
const PADDING = 22;
const AMBAR = 0xc89012;
const ALTO_DE_LA_PLACA = 30;
export const NOMBRE = 'INSPECTOR LÓGICA';
const TITULO_POR_DEFECTO = '🕵️ ' + NOMBRE;

export default class DialogoPrincipal {
    // alPulsar: lo que hace un toque sobre la presentación (lo decide el distribuidor de entradas)
    // profundidad: capa en la que se dibuja (el velo; la caja va por encima). Se dibuja fijo a la pantalla.
    // decorado: { mostrar(texto), ocultar() } (la viñeta y el retrato); es opcional
    // oscurecer(): cuánto se oscurece lo de detrás (0 a 1). Con el cierre casi nada: tiene que verse la luz que entra
    constructor(scene, alPulsar, { profundidad = 30, decorado = null, oscurecer = () => 1 } = {}) {
        this.oscurecer = oscurecer;
        this.scene = scene;
        this.alPulsar = alPulsar;
        this.profundidad = profundidad;
        this.decorado = decorado;
        this.abierto = false;
        this.zona = { x: 0, y: 0, ancho: scene.scale.width, alto: 200 };
        this.areaVelo = { x: 0, y: 0, ancho: scene.scale.width, alto: scene.scale.height };
    }

    // zona: donde se dibuja (la placa del nombre y la caja) · areaVelo: lo que cubre el velo
    reposicionar(zona, areaVelo) {
        this.zona = zona;
        this.areaVelo = areaVelo;
        if (this.abierto) this.dibujar(false);
    }

    // indice/total: posición del acontecimiento dentro de la secuencia de la pausa
    abrir(texto, { titulo = TITULO_POR_DEFECTO, indice = 1, total = 1, alCerrar } = {}) {
        this.texto = texto;
        this.titulo = titulo || TITULO_POR_DEFECTO;
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
        if (this.escritura) return '▸ E / Espacio / clic: completar' + posicion;
        return (this.pagina < this.paginas.length - 1 ? '▸ E / Espacio / clic: sigue' : '▸ E / Espacio / clic para continuar') + posicion;
    }

    // La caja se arma en flujo (src/motor/Maquetacion.js): arriba el título de la página si no es el del inspector (las notas, una pista),
    // abajo la pista de teclas y el texto entre las dos. Las páginas se reparten con las líneas que caben de verdad: nunca se corta una
    // palabra, no se pierde texto y nada se encima.
    dibujar(escribir) {
        this.escritura?.remove();
        this.escritura = null;
        this.destruirVista();
        const scene = this.scene;
        const z = this.zona, v = this.areaVelo;
        const ancho = Math.max(160, z.ancho - 24);
        const alto = Math.max(80, z.alto - ALTO_DE_LA_PLACA - 6);
        const px = z.x + (z.ancho - ancho) / 2, py = z.y + ALTO_DE_LA_PLACA;

        this.velo = scene.add.rectangle(v.x, v.y, v.ancho, v.alto, 0x000000, 0.45 * this.oscurecer()).setOrigin(0).setDepth(this.profundidad).setScrollFactor(0).setInteractive();
        this.velo.setData('rev', { tipo: 'ignorar' });
        this.velo.on('pointerdown', () => this.alPulsar?.());
        this.decorado?.mostrar(this.texto);

        const dentroDe = { x: px, y: z.y, ancho, alto: alto + ALTO_DE_LA_PLACA };
        // La placa del nombre, montada sobre el borde de arriba de la caja
        const nombre = scene.add.text(0, 0, NOMBRE, { fontFamily: FUENTE, fontSize: '15px', color: '#1a1206', resolution: 2 });
        const placa = scene.add.graphics();
        const anchoDePlaca = 220;
        placa.fillStyle(AMBAR, 0.96);
        placa.fillRoundedRect(18, -ALTO_DE_LA_PLACA, anchoDePlaca, ALTO_DE_LA_PLACA - 2, 8);
        nombre.setOrigin(0.5).setPosition(18 + anchoDePlaca / 2, -(ALTO_DE_LA_PLACA + 2) / 2);
        placa.setData('rev', { tipo: 'control', grupo: 'placa', rect: { x: 18, y: -ALTO_DE_LA_PLACA, ancho: anchoDePlaca, alto: ALTO_DE_LA_PLACA - 2 } });
        nombre.setData('rev', { tipo: 'contenido', grupo: 'placa', dentroDe });

        const propio = this.titulo !== TITULO_POR_DEFECTO ? this.titulo : '';
        const cabecera = scene.add.text(0, 0, propio, { fontFamily: FUENTE, fontSize: '13px', color: '#ffd060', resolution: 2, wordWrap: { width: ancho - PADDING * 2, useAdvancedWrap: true } });
        const cuerpo = scene.add.text(0, 0, '', {
            fontFamily: FUENTE, fontSize: z.ancho < 360 ? '14px' : '22px', color: '#f6efe0', lineSpacing: 7, resolution: 2,
            wordWrap: { width: ancho - PADDING * 2, useAdvancedWrap: true }
        });
        const pista = scene.add.text(0, 0, '', { fontFamily: FUENTE, fontSize: '12px', color: '#8aabbf', resolution: 2, align: 'right', wordWrap: { width: ancho - PADDING * 2 - 24, useAdvancedWrap: true } });
        pista.setText('▸ E / Espacio / clic: completar · 99 de 99');        // la pista más larga posible: se reserva su alto
        const altoDePista = pista.height;
        const altoDeCabecera = propio ? cabecera.height : 0;
        pista.setText('');
        // Cuánto espacio queda para el texto entre la cabecera y la pista
        const hueco = 8;
        const libre = maquetarPantalla({
            caja: { x: 0, y: 0, ancho, alto }, margen: { x: PADDING, y: 14 }, hueco,
            cabecera: altoDeCabecera ? [{ id: 'cabecera', alto: altoDeCabecera }] : [], pie: [{ id: 'pista', alto: altoDePista }], cuerpo: [], minimoCuerpo: 0
        });
        // Páginas: tantas líneas como quepan en ese espacio
        const lineas = cuerpo.getWrappedText(this.texto);
        cuerpo.setText('X');
        const altoLinea = cuerpo.height;
        const porPagina = Math.max(1, Math.floor((libre.zona.alto + 7) / (altoLinea + 7)));
        this.paginas = [];
        for (let i = 0; i < lineas.length; i += porPagina) this.paginas.push(lineas.slice(i, i + porPagina).join('\n'));
        if (!this.paginas.length) this.paginas.push('');
        this.pagina = Math.min(this.pagina, this.paginas.length - 1);
        cuerpo.setWordWrapWidth(null).setText(escribir ? '' : this.paginas[this.pagina]);

        if (altoDeCabecera) cabecera.setPosition(libre.colocados.cabecera.x, libre.colocados.cabecera.y);
        cabecera.setVisible(!!propio);
        cuerpo.setPosition(libre.zona.x, libre.zona.y);
        // La pista de teclas abajo a la derecha, con sitio a su lado para la flecha que avisa que se puede continuar
        const borde = libre.colocados.pista.x + libre.colocados.pista.ancho;
        pista.setOrigin(1, 0).setPosition(borde - 24, libre.colocados.pista.y);
        const flecha = scene.add.text(borde - 14, libre.colocados.pista.y, '▼', { fontFamily: FUENTE, fontSize: '12px', color: '#ffd060', resolution: 2 });
        flecha.setVisible(false);
        const fondo = scene.add.graphics();
        fondo.fillStyle(0x070d18, 0.82);
        fondo.fillRoundedRect(0, 0, ancho, alto, 14);
        fondo.lineStyle(2, AMBAR, 0.85);
        fondo.strokeRoundedRect(0, 0, ancho, alto, 14);
        fondo.setData('rev', { tipo: 'ignorar' });
        for (const t of [cabecera, cuerpo, pista, flecha]) t.setData('rev', { tipo: 'contenido', dentroDe });

        this.panel = scene.add.container(px, py, [fondo, placa, nombre, cabecera, cuerpo, pista, flecha]).setDepth(this.profundidad + 2).setScrollFactor(0);
        this.panel.setInteractive(new Phaser.Geom.Rectangle(0, 0, ancho, alto), Phaser.Geom.Rectangle.Contains);
        this.panel.on('pointerdown', () => this.alPulsar?.());
        this.cuerpo = cuerpo;
        this.pista = pista;
        this.flecha = flecha;
        this.flechaY = libre.colocados.pista.y;
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
        this.ocultarFlecha();
    }

    mostrarPista() {
        this.escritura?.remove();
        this.escritura = null;
        this.cuerpo.setText(this.paginas[this.pagina]);
        this.pista.setText(this.textoDePista()).setAlpha(1);
        this.scene.tweens.killTweensOf(this.pista);
        this.scene.tweens.add({ targets: this.pista, alpha: { from: 1, to: 0.35 }, duration: 700, yoyo: true, repeat: -1 });
        this.animarFlecha();
    }

    // El indicador animado de "continuar": una flecha que sube y baja cuando la página ya está escrita
    animarFlecha() {
        if (!this.flecha?.scene) return;
        this.scene.tweens.killTweensOf(this.flecha);
        this.flecha.setPosition(this.flecha.x, this.flechaY).setVisible(true);
        this.scene.tweens.add({ targets: this.flecha, y: this.flechaY + 5, duration: 360, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }

    ocultarFlecha() {
        if (!this.flecha?.scene) return;
        this.scene.tweens.killTweensOf(this.flecha);
        this.flecha.setVisible(false);
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
        this.decorado?.ocultar();
    }

    destruirVista() {
        if (this.pista?.scene) this.scene.tweens.killTweensOf(this.pista);
        if (this.flecha?.scene) this.scene.tweens.killTweensOf(this.flecha);
        if (this.velo?.scene) this.velo.destroy();
        if (this.panel?.scene) this.panel.destroy();
        this.velo = this.panel = this.pista = this.flecha = null;
    }
}
