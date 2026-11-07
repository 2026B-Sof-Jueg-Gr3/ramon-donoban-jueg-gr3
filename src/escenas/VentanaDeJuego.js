import Nivel from '../modelo/Nivel.js';
import Direccion from '../modelo/Direccion.js';
import Mueble from '../modelo/Mueble.js';
import { RADIO_LINTERNA } from '../modelo/Escenario.js';
import { FUENTE } from '../ui/Boton.js';
import Progreso from '../ui/Progreso.js';
import Records from '../ui/Records.js';
import Registro from '../ui/Registro.js';
import ControlesTactiles, { ALTO_CONTROLES } from '../ui/ControlesTactiles.js';
import PanelInvestigacion from '../ui/PanelInvestigacion.js';
import DialogoPrincipal from '../ui/DialogoPrincipal.js';
import Narrador from '../ui/Narrador.js';
import { destinoDeEntrada } from '../ui/Entradas.js';
import { calcularDistribucion } from '../ui/Distribucion.js';
import GestorDePresentaciones from '../presentacion/GestorDePresentaciones.js';
import AparicionDeMarca from '../presentacion/AparicionDeMarca.js';
import { alRedimensionar } from './utilidades.js';

const TILE = 60;
const DURACION_MOVIMIENTO = 110;
const ALTO_HUD = 64;
const MARGEN = 16;
const PAUSA_ENTRE_COMENTARIOS = 6000;
const FUENTE_EMOJI = '"Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';
const COLOR_PISTA = '#ffd060', COLOR_MUEBLE = '#8ecbff';

// Los textos de la narrativa se enlazan con las entidades del nivel por su ID
const porId = (lista, id) => (lista || []).find(e => e.id === id);

// Clase narrativa de una marca según su guion: por defecto ambiental (texto breve sobre su casilla).
// 'dialogo' o importancia 'principal': acontecimiento importante (pausa narrativa).
const claseDeMarca = ({ canal = 'ambiental', importancia = 'secundaria' }) =>
    canal === 'ambiental' ? 'ambiental' : (canal === 'dialogo' || importancia === 'principal') ? 'importante' : 'secundaria';

export default class VentanaDeJuego extends Phaser.Scene {
    constructor() { super('VentanaDeJuego'); }

    // data.nivel: el mismo Nivel ya reiniciado por reiniciar(); si falta, se carga de nuevo
    init(data) {
        this.numeroDeNivel = data.numeroDeNivel || 1;
        this.nivelReiniciado = data.nivel || null;
    }

    create() {
        this.nivel = this.nivelReiniciado || new Nivel(this.numeroDeNivel,
            this.cache.text.get('nivel' + this.numeroDeNivel), this.cache.json.get('entidades' + this.numeroDeNivel));
        this.textos = this.cache.json.get('narrativa' + this.numeroDeNivel);
        this.moviendo = false;
        this.ganado = false;
        this.siguienteEmpuje = 0;
        this.ultimoEmpujeComentado = -Infinity;
        // Cada acción aceptada del jugador (pulsación o toque) tiene su número: da identidad a las interacciones
        // repetibles, como examinar un mueble, para no confundirlas con una emisión duplicada
        this.numeroDeAccion = 0;
        // TRANSITORIO hasta la etapa 4: marcas ya descubiertas EN ESTE INTENTO, solo para no volver a mostrarlas.
        // No se guarda ni es conocimiento: en la etapa 4 se elimina y el descubrimiento pasa al expediente.
        this.marcasDescubiertasEnIntento = new Set();
        this.presentaciones = new GestorDePresentaciones();
        this.events.once('shutdown', () => this.presentaciones.retirarTodas('inmediato'));

        // El tablero usa coordenadas de casillas de 60 px; al redimensionar se escala y se encuadra.
        // En un contenedor manda el orden de inserción: suelo, luz, marcas, objetos, cajas y personaje.
        this.tablero = this.add.container(0, 0);
        this.pintarElEscenario();
        this.crearLinterna();
        this.capaMarcas = this.add.container(0, 0);
        this.tablero.add(this.capaMarcas);
        this.pintarObjetos();
        this.pintarCajas();
        this.pintarPersonaje();
        this.crearHud();
        this.registrarControles();
        this.crearControlesTactiles();

        // El tablero solo se ve dentro de su zona: la narrativa vive en zonas propias y nunca lo tapa
        this.formaTablero = this.make.graphics({ add: false });
        this.tablero.setMask(this.formaTablero.createGeometryMask());

        this.panel = new PanelInvestigacion(this);
        this.narrador = new Narrador({
            panel: this.panel,
            presentacion: new DialogoPrincipal(this, () => this.recibirEntrada('avanzar')),
            alPausar: () => this.alPausar(),
            alReanudar: () => this.alReanudar()
        });
        this.events.once('shutdown', () => this.narrador.detener());

        alRedimensionar(this, (w, h) => this.reacomodar(w, h));

        this.time.delayedCall(450, () => {
            this.narrador.contar({ acontecimiento: 'nivel:intro', ref: 'intro', clase: 'importante', texto: this.textos.intro });
            this.actualizarMarcas();
        });
    }

    // La distribución (src/ui/Distribucion.js) solo se calcula aquí: al cargar el nivel y al cambiar el tamaño
    // de la ventana. Mostrar u ocultar textos narrativos nunca mueve ni reescala el tablero.
    reacomodar(w, h) {
        const escenario = this.nivel.getEscenario();
        this.anchoTablero = escenario.getColumnas() * TILE;
        this.altoTablero = escenario.getFilas() * TILE;
        this.distribucion = calcularDistribucion(w, h, escenario.getColumnas(), escenario.getFilas(), ALTO_CONTROLES);
        const zona = this.distribucion.tablero;
        this.vista = zona;
        this.escalaTablero = this.distribucion.escala;
        this.tablero.setScale(this.escalaTablero);
        this.formaTablero.clear().fillStyle(0xffffff).fillRect(zona.x, zona.y, zona.ancho, zona.alto);
        this.encuadrar(false);
        this.panel.reposicionar(this.distribucion.panel);
        const { controles } = this.distribucion;
        this.narrador.presentacion.reposicionar(controles, { x: 0, y: ALTO_HUD, ancho: w, alto: controles.y - ALTO_HUD });

        this.fondoHud.clear();
        this.fondoHud.fillStyle(0x04090f, 0.94);
        this.fondoHud.fillRect(0, 0, w, ALTO_HUD);
        this.fondoHud.lineStyle(1, 0xc89012, 0.45);
        this.fondoHud.lineBetween(16, ALTO_HUD, w - 16, ALTO_HUD);

        const hudFs = w < 300 ? '12px' : '14px';
        this.textoPasos.setFontSize(hudFs);
        this.textoSeparador.setFontSize(hudFs);
        this.textoEmpujones.setFontSize(hudFs);

        this.textoNivel.setPosition(MARGEN, 6);
        this.textoCajas.setPosition(w / 2, 6).setVisible(w >= 260);
        this.textoPistas.setPosition(w - MARGEN, 6);
        this.textoPasos.setPosition(MARGEN, 34);
        this.textoSeparador.setVisible(w >= 320 && !this.narrador.bloqueando()).setPosition(w / 2, 34);
        this.textoEmpujones.setPosition(w - MARGEN, 34);
        // Solo cabe entre los botones táctiles en pantallas anchas
        // En pantallas angostas la etiqueta larga se encimaría con los contadores
        this.textoPausa.setText(w >= 520 ? '⏸ INVESTIGACIÓN' : '⏸ PAUSA').setPosition(w / 2, 34);
        this.textoAyuda.setVisible(w >= 800 && !this.narrador.bloqueando()).setPosition(w / 2, h - ALTO_CONTROLES / 2);

        this.controlesTactiles.reposicionar(w, h);
    }

    // Centra el mapa en su zona si cabe; si no, lo desplaza para mantener al inspector a la vista
    encuadrar(animar) {
        const s = this.escalaTablero;
        const { x: zx, y: zy, ancho, alto } = this.vista;
        const anchoEscalado = this.anchoTablero * s;
        const altoEscalado = this.altoTablero * s;
        const personaje = this.nivel.getPersonaje();
        const p = this.aPixel(personaje.fila, personaje.columna);

        // Posiciones en píxeles enteros: con fracciones aparecen costuras finas entre las baldosas
        const x = Math.round(anchoEscalado <= ancho
            ? zx + (ancho - anchoEscalado) / 2
            : Phaser.Math.Clamp(zx + ancho / 2 - p.x * s, zx + ancho - anchoEscalado, zx));
        const y = Math.round(altoEscalado <= alto
            ? zy + (alto - altoEscalado) / 2
            : Phaser.Math.Clamp(zy + alto / 2 - p.y * s, zy + alto - altoEscalado, zy));

        this.tweens.killTweensOf(this.tablero);
        if (animar) {
            this.tweens.add({ targets: this.tablero, x, y, duration: DURACION_MOVIMIENTO * 1.6, ease: 'Sine.easeOut' });
        } else {
            this.tablero.setPosition(x, y);
        }
    }

    aPixel(fila, columna) {
        return { x: columna * TILE + TILE / 2, y: fila * TILE + TILE / 2 };
    }

    agregarImagen(fila, columna, textura) {
        const { x, y } = this.aPixel(fila, columna);
        const img = this.add.image(x, y, textura).setDisplaySize(TILE, TILE);
        this.tablero.add(img);
        return img;
    }

    agregarEmoji(x, y, emoji, tamano) {
        return this.add.text(x, y, emoji, {
            fontFamily: FUENTE_EMOJI, fontSize: tamano + 'px', padding: { top: 6, bottom: 6 }, resolution: 2
        }).setOrigin(0.5);
    }

    pintarElEscenario() {
        const escenario = this.nivel.getEscenario();
        this.spritesDeMuebles = new Map();
        for (let f = 0; f < escenario.getFilas(); f++) {
            for (let c = 0; c < escenario.getColumnas(); c++) {
                const bloque = escenario.getBloque(f, c);
                if (bloque.getTextura() === 'llegada') this.agregarImagen(f, c, 'suelo');
                this.agregarImagen(f, c, bloque.getTextura());
                if (bloque instanceof Mueble) this.pintarMueble(bloque);
            }
        }
    }

    pintarMueble(mueble) {
        const { x, y } = this.aPixel(mueble.fila, mueble.columna);
        const sombra = this.add.ellipse(x, y + 20, 42, 12, 0x000000, 0.35);
        const icono = this.agregarEmoji(x, y - 2, this.descripcionMueble(mueble).emoji, 38);
        this.tablero.add([sombra, icono]);
        this.spritesDeMuebles.set(mueble, icono);
    }

    descripcionMueble(mueble) {
        return porId(this.textos.muebles, mueble.id)
            || { id: mueble.id, emoji: '📦', texto: 'Muebles viejos cubiertos de polvo.' };
    }

    // Halo cálido que acompaña al inspector: muestra el alcance de la linterna sin oscurecer el tablero
    crearLinterna() {
        const radio = (RADIO_LINTERNA + 0.5) * TILE;
        const capas = [[radio, 0.05], [radio * 0.7, 0.06], [radio * 0.4, 0.07]]
            .map(([r, alfa]) => this.add.circle(0, 0, r, 0xffd27a, alfa).setBlendMode(Phaser.BlendModes.ADD));
        const personaje = this.nivel.getPersonaje();
        const { x, y } = this.aPixel(personaje.fila, personaje.columna);
        this.luz = this.add.container(x, y, capas);
        this.tablero.add(this.luz);
    }

    // Solo se dibujan las pistas. Las baterías siguen en el mapa y en el modelo, pero quedan ocultas y sin
    // efecto hasta que exista la mecánica de cargas de la linterna (etapa 6).
    pintarObjetos() {
        this.spritesDeObjetos = new Map();
        for (const objeto of this.nivel.getEscenario().getObjetos()) {
            if (objeto.tipo !== 'pista') continue;
            const { x, y } = this.aPixel(objeto.fila, objeto.columna);
            const brillo = this.add.circle(0, 0, 22, 0xffc040, 0.3);
            const icono = this.agregarEmoji(0, 0, '📜', 30);
            const vista = this.add.container(x, y, [brillo, icono]);
            this.tweens.add({ targets: brillo, alpha: 0.08, scale: 1.25, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
            this.tweens.add({ targets: icono, y: -5, duration: 1000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
            this.tablero.add(vista);
            this.spritesDeObjetos.set(objeto, vista);
        }
    }

    pintarCajas() {
        this.spritesDeCajas = new Map();
        for (const caja of this.nivel.getEscenario().getCajas()) {
            this.spritesDeCajas.set(caja, this.agregarImagen(caja.fila, caja.columna, caja.getTextura()));
            this.pintarCaja(caja);
        }
    }

    pintarCaja(caja) {
        const sprite = this.spritesDeCajas.get(caja);
        if (caja.getLlegoAlPuntoDeLlegada()) sprite.setTint(0x7dff7d);
        else sprite.clearTint();
    }

    pintarPersonaje() {
        const personaje = this.nivel.getPersonaje();
        this.spritePersonaje = this.agregarImagen(personaje.fila, personaje.columna, personaje.getTextura());
    }

    crearHud() {
        this.fondoHud = this.add.graphics().setDepth(15);
        const estilo = { fontFamily: FUENTE, fontSize: '16px', color: '#ffffff', resolution: 2 };
        this.textoNivel = this.add.text(0, 0, 'Nivel ' + this.numeroDeNivel, estilo);
        this.textoCajas = this.add.text(0, 0, '', { ...estilo, color: '#9be59b' }).setOrigin(0.5, 0);
        this.textoPistas = this.add.text(0, 0, '', { ...estilo, color: COLOR_PISTA }).setOrigin(1, 0);
        this.textoPasos = this.add.text(0, 0, '', { ...estilo, fontSize: '14px' });
        this.textoSeparador = this.add.text(0, 0, '|', { ...estilo, fontSize: '14px' }).setOrigin(0.5, 0);
        this.textoEmpujones = this.add.text(0, 0, '', { ...estilo, fontSize: '14px' }).setOrigin(1, 0);
        // Señal de pausa narrativa: reemplaza al separador central mientras se presenta un acontecimiento importante
        this.textoPausa = this.add.text(0, 0, '⏸ INVESTIGACIÓN', { ...estilo, fontSize: '13px', color: '#ffd060' })
            .setOrigin(0.5, 0).setVisible(false);
        [this.textoNivel, this.textoCajas, this.textoPistas, this.textoPasos, this.textoSeparador, this.textoEmpujones, this.textoPausa]
            .forEach(t => t.setDepth(16));

        this.textoAyuda = this.add.text(0, 0, 'Flechas/WASD: mover   Z: deshacer   R: reiniciar   ESC: niveles', {
            fontFamily: FUENTE, fontSize: '13px', color: '#8aabbf', resolution: 2
        }).setOrigin(0.5).setDepth(18);
        this.actualizarHud();
    }

    actualizarHud() {
        const escenario = this.nivel.getEscenario();
        const totalPistas = escenario.contarObjetos('pista');
        this.textoCajas.setText(`Cajas ${escenario.puntosDeLlegadaFinalizados()}/${escenario.totalPuntoDeLlegada()}`);
        this.textoPistas.setText(totalPistas ? `📜 ${escenario.contarObjetos('pista', true)}/${totalPistas}` : '');
        this.textoPasos.setText(`👣 Pasos ${this.nivel.getMovimientos()}`);
        this.textoEmpujones.setText(`📦 Empujones ${this.nivel.getEmpujones()}`);
    }

    // El modelo vuelve a su estado inicial (mismos IDs) y la escena se redibuja a partir de él
    reiniciar() {
        if (this.narrador.bloqueando()) return;
        this.narrador.detener();
        this.nivel.reiniciar();
        this.scene.restart({ numeroDeNivel: this.numeroDeNivel, nivel: this.nivel });
    }

    crearControlesTactiles() {
        this.controlesTactiles = new ControlesTactiles(this, {
            onMover:     (dir) => this.recibirEntrada('mover', null, dir),
            onDeshacer:  ()    => this.recibirEntrada('deshacer'),
            onReiniciar: ()    => this.recibirEntrada('reiniciar')
        });
    }

    registrarControles() {
        this.cursores = this.input.keyboard.createCursorKeys();
        this.teclas = this.input.keyboard.addKeys('W,A,S,D');
        this.input.keyboard.on('keydown-R', evento => this.recibirEntrada('reiniciar', evento));
        this.input.keyboard.on('keydown-Z', evento => this.recibirEntrada('deshacer', evento));
        this.input.keyboard.on('keydown-ESC', evento => this.recibirEntrada('menu', evento));
        this.input.keyboard.on('keydown-SPACE', evento => this.recibirEntrada('avanzar', evento));
        this.input.keyboard.on('keydown-ENTER', evento => this.recibirEntrada('avanzar', evento));
    }

    update() {
        const presionada = Phaser.Input.Keyboard.JustDown;
        let direccion = null;
        if (presionada(this.cursores.up) || presionada(this.teclas.W)) direccion = Direccion.ARRIBA;
        else if (presionada(this.cursores.down) || presionada(this.teclas.S)) direccion = Direccion.ABAJO;
        else if (presionada(this.cursores.left) || presionada(this.teclas.A)) direccion = Direccion.IZQUIERDA;
        else if (presionada(this.cursores.right) || presionada(this.teclas.D)) direccion = Direccion.DERECHA;
        if (direccion) this.recibirEntrada('mover', null, direccion);
    }

    // Distribuidor de entradas (src/ui/Entradas.js): cada tecla o toque llega a un solo componente
    // Durante la pausa narrativa las acciones del juego se descartan (no quedan pendientes) y se avisa cómo continuar
    recibirEntrada(tecla, evento = null, direccion = null) {
        switch (destinoDeEntrada(tecla, { pausaNarrativa: this.narrador.bloqueando() }, !!evento?.repeat)) {
            case 'narrativa': this.narrador.avanzar(); break;
            case 'avisar': this.narrador.llamarAtencion(); break;
            case 'juego':
                if (tecla === 'mover') this.mover(direccion);
                else if (tecla === 'deshacer') this.deshacer();
                else if (tecla === 'reiniciar') this.reiniciar();
                else if (tecla === 'menu') this.scene.start('MenuNiveles');
                break;
        }
    }

    mover(direccion) {
        if (this.moviendo || this.ganado || this.narrador.bloqueando()) return;
        this.numeroDeAccion++;
        const resultado = this.nivel.mover(direccion);
        if (!resultado) {
            this.examinarMueble(direccion);
            return;
        }

        this.moviendo = true;
        const { caja } = resultado;
        if (caja) this.animar(this.spritesDeCajas.get(caja), caja.fila, caja.columna);
        this.encuadrar(true);
        const personaje = this.nivel.getPersonaje();
        this.animar(this.luz, personaje.fila, personaje.columna);
        this.animar(this.spritePersonaje, personaje.fila, personaje.columna, () => {
            this.moviendo = false;
            if (caja) this.pintarCaja(caja);
            this.actualizarHud();
            this.narrarMovimiento(resultado);
        });
    }

    // Traduce lo que pasó en el movimiento a avisos informativos y mensajes del narrador.
    // Un mismo movimiento produce como mucho un comentario sobre la caja, para no ser redundante.
    narrarMovimiento({ caja, objeto, colocada, retirada }) {
        if (objeto) this.recogerObjeto(objeto);

        if (this.nivel.estaCompletado()) {
            this.flotar(caja.fila, caja.columna, '✔', '#7dff7d');
            this.terminarNivel();
            return;
        }
        if (colocada) {
            this.flotar(caja.fila, caja.columna, '✔', '#7dff7d');
            const n = this.nivel.getEscenario().puntosDeLlegadaFinalizados();
            this.narrador.contar({ acontecimiento: `avance:${n}`, ref: `caja-${n}`, clase: 'importante', texto: this.textos.cajas[n - 1] });
        } else if (retirada) {
            // Reacción del momento: si sigue pendiente al completar el nivel, no pasa a las notas del cierre
            this.narrador.contar({ acontecimiento: 'comentario:retirar', ref: 'retirar', clase: 'secundaria', alCompletar: 'descartar', texto: this.textos.retirar });
        } else if (caja && !objeto) {
            this.comentarEmpuje();
        }

        this.actualizarMarcas();
    }

    // Los comentarios al empujar salen en el orden del guion y solo cuando la libreta está libre
    comentarEmpuje() {
        const lista = this.textos.empujar || [];
        const ahora = this.time.now;
        if (this.siguienteEmpuje >= lista.length || this.narrador.libretaOcupada()) return;
        if (ahora - this.ultimoEmpujeComentado < PAUSA_ENTRE_COMENTARIOS) return;
        const id = `empujar-${this.siguienteEmpuje}`;
        if (this.narrador.contar({ acontecimiento: `comentario:${id}`, ref: id, clase: 'secundaria', alCompletar: 'conservar', texto: lista[this.siguienteEmpuje] })) {
            this.siguienteEmpuje++;
            this.ultimoEmpujeComentado = ahora;
        }
    }

    recogerObjeto(objeto) {
        const vista = this.spritesDeObjetos.get(objeto);
        if (!vista) return;   // batería oculta: no se muestra nada (ver pintarObjetos)
        this.tweens.killTweensOf(vista);
        this.tweens.add({
            targets: vista, scale: 1.8, alpha: 0, duration: 320, ease: 'Cubic.easeOut',
            onComplete: () => vista.setVisible(false)
        });

        this.flotar(objeto.fila, objeto.columna, '📜', COLOR_PISTA);
        const pista = porId(this.textos.pistas, objeto.id);
        if (!pista) return;
        Registro.registrarPista(pista.id, this.numeroDeNivel);
        this.narrador.contar({
            acontecimiento: `pista:${pista.id}:recogida`, ref: pista.id, clase: 'importante',
            texto: pista.texto, titulo: `📜 ${pista.titulo}`, color: COLOR_PISTA
        });
    }

    examinarMueble(direccion) {
        const mueble = this.nivel.muebleDelante(direccion);
        if (!mueble) return;
        const { id, emoji, texto } = this.descripcionMueble(mueble);
        // Una identidad por interacción real (esta acción del jugador); si la misma acción la emitiera dos veces, se ignora
        this.narrador.contar({
            acontecimiento: `mueble:${id}:examinar#${this.numeroDeAccion}`, ref: id, clase: 'secundaria', repetible: true,
            alCompletar: 'conservar', etiqueta: emoji, texto, titulo: `${emoji} EXAMINANDO`, color: COLOR_MUEBLE
        });

        const icono = this.spritesDeMuebles.get(mueble);
        this.tweens.killTweensOf(icono);
        icono.setAngle(0);
        this.tweens.add({ targets: icono, angle: { from: -8, to: 8 }, duration: 70, yoyo: true, repeat: 2, onComplete: () => icono.setAngle(0) });
    }

    // Tras cada cambio físico: retira las apariciones que ya no son válidas (una caja tapó la marca) y descubre
    // las marcas que la visibilidad básica alcanza. Cada marca se descubre una sola vez por intento; su aparición
    // es temporal (src/presentacion) y la marca sigue existiendo en el escenario cuando el dibujo desaparece.
    actualizarMarcas() {
        this.presentaciones.revisar(this.nivel);
        const p = this.nivel.getPersonaje();
        for (const marca of this.nivel.getEscenario().marcasVisiblesDesde(p.fila, p.columna)) {
            if (this.marcasDescubiertasEnIntento.has(marca.id)) continue;
            this.marcasDescubiertasEnIntento.add(marca.id);
            const datos = porId(this.textos.marcas, marca.id) || {};
            this.presentaciones.mostrar(new AparicionDeMarca(this, this.capaMarcas, marca, {
                ...this.aPixel(marca.fila, marca.columna),
                icono: datos.icono || '✦',
                crearIcono: (x, y, icono) => this.agregarEmoji(x, y, icono, 26)
            }));
            this.narrador.contar({
                acontecimiento: `marca:${marca.id}:descubierta`, ref: marca.id, clase: claseDeMarca(datos),
                alCompletar: 'conservar', texto: datos.texto, titulo: datos.titulo, etiqueta: datos.icono
            });
        }
    }

    // Pausa narrativa: lo que no es narrativo se detiene sin consumir tiempo (controles, apariciones de marcas).
    // El modelo del Sokoban no cambia: simplemente no recibe acciones hasta que termina la secuencia.
    alPausar() {
        this.presentaciones.pausarTodas();
        this.controlesTactiles.setHabilitados(false);
        this.textoAyuda.setVisible(false);
        this.textoSeparador.setVisible(false);
        this.textoPausa.setVisible(true);
    }

    alReanudar() {
        this.presentaciones.reanudarTodas();
        this.controlesTactiles.setHabilitados(true);
        this.textoPausa.setVisible(false);
        this.textoSeparador.setVisible(this.scale.width >= 320);
        this.textoAyuda.setVisible(this.scale.width >= 800);
    }

    // Aviso informativo que sube y se desvanece sobre una casilla; vive dentro del tablero para seguir a la cámara
    flotar(fila, columna, texto, color) {
        const s = this.escalaTablero;
        const { x, y } = this.aPixel(fila, columna);
        const t = this.add.text(x, y - TILE * 0.45, texto, {
            fontFamily: FUENTE, fontSize: Math.round(18 / s) + 'px', color,
            stroke: '#000000', strokeThickness: Math.round(4 / s), resolution: 2
        }).setOrigin(0.5);
        this.tablero.add(t);
        this.tweens.add({ targets: t, y: t.y - 50 / s, alpha: 0, duration: 1200, ease: 'Cubic.easeOut', onComplete: () => t.destroy() });
    }

    deshacer() {
        if (this.moviendo || this.ganado || this.narrador.bloqueando()) return;
        const paso = this.nivel.deshacer();
        if (!paso) return;

        const personaje = this.nivel.getPersonaje();
        const p = this.aPixel(personaje.fila, personaje.columna);
        this.spritePersonaje.setPosition(p.x, p.y);
        this.luz.setPosition(p.x, p.y);
        if (paso.caja) {
            const b = this.aPixel(paso.caja.fila, paso.caja.columna);
            this.spritesDeCajas.get(paso.caja).setPosition(b.x, b.y);
            this.pintarCaja(paso.caja);
        }
        const vista = paso.objeto && this.spritesDeObjetos.get(paso.objeto);
        if (vista) {
            this.tweens.killTweensOf(vista);
            vista.setVisible(true).setScale(1).setAlpha(1);
        }
        this.encuadrar(true);
        this.actualizarHud();
        this.actualizarMarcas();
    }

    animar(sprite, fila, columna, alTerminar) {
        const { x, y } = this.aPixel(fila, columna);
        this.tweens.add({ targets: sprite, x, y, duration: DURACION_MOVIMIENTO, ease: 'Sine.easeOut', onComplete: alTerminar });
    }

    // El cierre del nivel es narrativa principal: espera al jugador antes de pasar al informe
    terminarNivel() {
        this.ganado = true;
        // Los récords se guardan en el instante en que se completa el intento, antes de cualquier diálogo
        this.intento = { pasos: this.nivel.getMovimientos(), empujones: this.nivel.getEmpujones() };
        this.resultadoRecords = Records.registrarIntento(this.numeroDeNivel, this.intento);
        const alCerrar = () => this.mostrarVictoria();
        // Lo que no se leyó pasa al diálogo de cierre (importantes y notas de la libreta), y después el cierre
        const cierre = this.textos.cierre ? { texto: this.textos.cierre } : null;
        if (!this.narrador.cerrarNivel(cierre, alCerrar)) {
            this.time.delayedCall(900, alCerrar);
        }
    }

    mostrarVictoria() {
        Progreso.marcarCompletado(this.numeroDeNivel);

        const texto = this.resumenDelIntento() + this.textos.informe;

        if (this.nivel.esUltimoNivel()) {
            this.scene.start('Interludio', { texto, siguiente: 'MenuNiveles' });
            return;
        }
        this.scene.start('Interludio', {
            texto,
            siguiente: 'VentanaDeJuego',
            datosSiguiente: { numeroDeNivel: this.numeroDeNivel + 1 }
        });
    }

    // Intento actual y récords independientes; los demás indicadores se agregan cuando existan sus sistemas
    resumenDelIntento() {
        const { pasos, empujones } = this.intento;
        const { records, nuevoPasos, nuevoEmpujones } = this.resultadoRecords;
        const nuevo = es => (es ? '  ¡NUEVO!' : '');
        const lineas = [
            `Este intento: ${pasos} pasos · ${empujones} empujones`,
            `🏆 Récord de pasos: ${records.pasos.pasos} (${records.pasos.empujones} empujones)${nuevo(nuevoPasos)}`,
            `🏆 Récord de empujones: ${records.empujones.empujones} (${records.empujones.pasos} pasos)${nuevo(nuevoEmpujones)}`
        ];
        const totalPistas = (this.textos.pistas || []).length;
        if (totalPistas) lineas.push(`📜 Pistas en el expediente: ${Registro.pistasDelNivel(this.numeroDeNivel).length}/${totalPistas}`);
        return lineas.join('\n') + '\n\n';
    }
}
