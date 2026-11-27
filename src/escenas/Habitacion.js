// La escena de TODAS las habitaciones (fase 5): recibe numeroDeNivel y carga mapaN, investigacionesN y narrativaN.
// Hace lo común: un mapa de Tiled con el inspector caminando libre, la linterna, las marcas que solo se ven con luz, el
// alcance de las acciones (cerca, de frente y con luz), las líneas de la narrativa según lo que el jugador hace
// (src/motor/Investigacion.js, en cualquier orden y una sola vez, por el Narrador de la v1.1), la libreta (Tab o I), el
// aviso de que ya se puede resolver el caso, la deducción pregunta por pregunta, la pausa (Esc), el cierre y el informe.
// Lo propio de cada habitación (su fenómeno, su ambiente, los efectos de su ayuda y cómo se calma al cierre) está en un
// módulo por habitación: src/presentacion/habitaciones/. Todavía no hay retrato ni música (fase 4).
import { leerMapaTiled, rectangulosDeParedes, segmentosDeLuz, desplazarMueble } from '../motor/Mapa.js';
import { desplazamientoDeCamara, acercar } from '../motor/Movimiento.js';
import { rectanguloIluminado, zonaIluminada, CONO_DE_LINTERNA } from '../motor/Visibilidad.js';
import { zonaDeAccion, elegirAccion } from '../motor/Alcance.js';
import Investigacion from '../motor/Investigacion.js';
import Ayuda from '../motor/Ayuda.js';
import Libreta from '../motor/Libreta.js';
import Deduccion, { validarDeduccion, DeduccionVacia } from '../motor/Deduccion.js';
import { TOTAL_NIVELES } from '../motor/niveles.js';
import AvisoDeDeduccion from '../motor/AvisoDeDeduccion.js';
import { destinoDeEntrada } from '../ui/Entradas.js';
import Registro from '../ui/Registro.js';
import { pistasQueReponer } from '../motor/Reposicion.js';
import EsperaDeLectura, { quedaPorLeer } from '../motor/EsperaDeLectura.js';
import AvisoDeContinuar from '../presentacion/AvisoDeContinuar.js';
import { claveDeLinea, expresionDe, ilustracionDe } from '../motor/Expresiones.js';
import { LuzDeCierre, Relampagos, encuadre, formaDeLaLinterna } from '../motor/Luz.js';
import Progreso from '../ui/Progreso.js';
import AparicionDeMarca from '../presentacion/AparicionDeMarca.js';
import { generarArte } from '../presentacion/ArteProvisional.js';
import Inspector from '../presentacion/Inspector.js';
import Linterna from '../presentacion/Linterna.js';
import IndicadorDeAccion from '../presentacion/IndicadorDeAccion.js';
import Depuracion from '../presentacion/Depuracion.js';
import { crearHabitacion } from '../presentacion/habitaciones/index.js';
import { PROFUNDIDAD } from '../presentacion/profundidad.js';
import Narracion from '../presentacion/Narracion.js';
import Cuaderno from '../presentacion/Cuaderno.js';
import IconoDeLibreta from '../presentacion/IconoDeLibreta.js';
import { iconoDeRastro } from '../presentacion/ArteDibujado.js';
import { cargaExtrema, aplicarALaHabitacion, lanzarTarjetas, lanzarCaja } from '../presentacion/CargaExtrema.js';

export { PROFUNDIDAD };
const OSCURECIDO_EN_EL_CIERRE = 0.15;     // con el cierre, lo de detrás de la caja casi no se oscurece: se ve entrar la luz
const SUAVIZADO_DE_CAMARA = 7;          // 1 / segundos: cuánto tarda la cámara en alcanzar al inspector
const TECLAS_DE_MOVER = ['W', 'A', 'S', 'D', 'UP', 'DOWN', 'LEFT', 'RIGHT'];
// Qué suceso del motor de investigación produce cada acción con E (src/motor/Investigacion.js)
const SUCESO_DE_ACCION = {
    examinar: 'examino', 'mirar-detras': 'miroDetras', recoger: 'recogio', rodar: 'rodo', tirar: 'tiro', 'mirar-debajo': 'miroDebajo',
    cortar: 'corto', ordenar: 'ordeno', cerrar: 'cerro', apagar: 'apago', abrir: 'abrio'
};

export default class Habitacion extends Phaser.Scene {
    constructor() { super('Habitacion'); }

    init(data) {
        this.numeroDeNivel = data.numeroDeNivel ?? 1;
    }

    create() {
        this.mapa = leerMapaTiled(this.cache.tilemap.get('mapa' + this.numeroDeNivel).data);
        this.narrativa = this.cache.json.get('narrativa' + this.numeroDeNivel);
        const reglas = this.cache.json.get('investigaciones' + this.numeroDeNivel);
        this.investigacion = new Investigacion(reglas, this.narrativa);
        this.reglas = reglas;
        this.final = reglas.final ?? null;             // la acción final (abrir la puerta, cortar el último hilo…) o el cierre automático
        // La libreta: las pruebas del nivel y, en el expediente del nivel 6, las pistas que el Registro guardó en los anteriores
        const narrativas = Object.fromEntries(Array.from({ length: TOTAL_NIVELES }, (_, i) => [i + 1, this.cache.json.get('narrativa' + (i + 1))]));
        // El expediente no puede quedar incompleto sin salida: las pistas para el final de habitaciones ya completadas que falten se reponen
        if (reglas.deduccion?.expediente) {
            const faltan = pistasQueReponer({ pruebas: reglas.deduccion.pruebas, narrativas, completados: Progreso.leerCompletados(), registradas: Registro.leer().pistas });
            for (const { id, nivel } of faltan) Registro.registrarPista(id, nivel);
        }
        // Solo informa a la investigación qué conserva el expediente persistente: no registra nada ni toca estadísticas. Es
        // intencional que cuente una pista recogida en una partida anterior. (Lo que devuelva se descarta: al entrar no se cuenta nada.)
        for (const id of Object.keys(Registro.leer().pistas)) this.investigacion.enRegistro(id);
        if (reglas.deduccion) {
            const problemas = validarDeduccion(reglas, this.narrativa);
            if (problemas.length) throw new Error('Deducción de la habitación no válida:\n- ' + problemas.join('\n- '));
        }
        // Una habitación sin deducción (la persecución) todavía muestra sus pistas en la libreta: "libreta": { "pruebas": {…} }
        const definicion = reglas.deduccion ?? { pruebas: reglas.libreta?.pruebas ?? {}, preguntas: [], pilas: reglas.libreta?.pilas };
        this.libreta = new Libreta(definicion, this.narrativa, this.investigacion, { nivel: this.numeroDeNivel, registro: () => Registro.leer().pistas, narrativas });
        this.deduccion = reglas.deduccion ? new Deduccion(reglas.deduccion, this.libreta) : new DeduccionVacia();
        this.aviso = new AvisoDeDeduccion();
        if (cargaExtrema()) aplicarALaHabitacion(this);      // modo de prueba (?carga=extrema): la interfaz con el contenido máximo
        this.ayuda = new Ayuda(reglas.ayuda, this.investigacion, {
            deduccionDisponible: () => this.deduccion.disponible() && !this.deduccion.completa,
            deduccionResuelta: () => this.deduccion.completa
        });
        this.fase = 'investigando';        // 'investigando' | 'final' (hay una acción final por hacer) | 'cierre' (el texto del cierre y el paso al informe)
        this.saliendo = false;             // ya va camino del informe
        this.espera = null;                // lo último todavía se está leyendo: el informe espera (y después, una pulsación)
        this.despuesDelTexto = null;       // lo que pasa cuando termina el importante en curso (el error y el cierre)
        this.numeroDeErrores = 0;
        this.animando = false;             // una acción con animación (rodar la alacena) en curso: el juego espera
        this.habitacion = crearHabitacion(this.numeroDeNivel, this);     // lo propio de esta habitación
        this.soloConLuz = [];              // lo dibujado que solo debe verse donde toca la linterna (ni un relámpago lo enseña)
        this.pisos = this.mapa.objetos.filter(o => o.tipo === 'piso');

        generarArte(this, this.mapa);
        this.cameras.main.setBackgroundColor('#000000');
        this.crearEscenario();
        this.crearFisica();
        this.inspector = new Inspector(this, this.mapa.inicio.x, this.mapa.inicio.y);
        this.physics.add.collider(this.inspector.sprite, this.obstaculos);
        this.colocarCamara();
        this.linterna = new Linterna(this, segmentosDeLuz(this.mapa), { ancho: this.scale.width, alto: this.scale.height, profundidad: PROFUNDIDAD.oscuridad });
        // Primera luz antes de que pueda empezar cualquier pausa: así la intro se lee ya con la habitación a oscuras
        this.linterna.actualizar(this.inspector.origenDeLuz, this.inspector.direccionDeLuz, this.cameras.main);
        this.habitacion.crear();           // el fenómeno, el ambiente y los efectos de la ayuda de esta habitación
        this.crearLuces();
        this.indicador = new IndicadorDeAccion(this, PROFUNDIDAD.interfaz);
        this.depuracion = new Depuracion(this, PROFUNDIDAD.interfaz + 30);
        this.capaMarcas = this.add.container(0, 0).setDepth(PROFUNDIDAD.interfaz - 1);
        this.narracion = new Narracion(this, {
            profundidad: PROFUNDIDAD.interfaz + 10,
            jugadorEnPantalla: () => this.jugadorEnPantalla(),
            alPausar: () => this.alPausar(),
            alReanudar: () => this.alReanudar(),
            alPulsar: () => this.recibirEntrada('avanzar'),
            expresionDe: evento => expresionDe(this.cache.json.get('expresiones'), this.numeroDeNivel, claveDeLinea(evento)),
            ilustracionDe: evento => ilustracionDe(this.cache.json.get('ilustraciones'), this.numeroDeNivel, claveDeLinea(evento)),
            oscurecer: () => (this.luzDeCierre.encendida && this.fase === 'cierre' ? OSCURECIDO_EN_EL_CIERRE : 1),
            // La habitación puede acompañar las páginas de su cierre (la silueta del nivel 4 cruza al aparecer «Espera.»)
            alMostrarTramo: (i, texto) => { if (this.fase === 'cierre' && texto === this.narrativa.cierre) this.habitacion.alMostrarTramoDelCierre?.(i); }
        });
        // La libreta y la deducción: por encima de las tarjetas y por debajo de los textos importantes (el error sale encima)
        this.cuaderno = new Cuaderno(this, {
            profundidad: PROFUNDIDAD.interfaz + 14, libreta: this.libreta, deduccion: this.deduccion, narrativa: this.narrativa,
            alCerrar: () => this.reanudarDeLaLibreta(),
            alError: () => this.alEquivocarse(),
            alResolver: () => this.alResolver(),
            alAcertar: id => this.alAcertar(id),
            alContinuar: () => this.reanudarDeLaLibreta(false),
            alSalir: () => this.salir()
        });
        this.icono = new IconoDeLibreta(this, {
            profundidad: PROFUNDIDAD.interfaz + 5, x: this.scale.width - 70, y: this.scale.height - 72, alPulsar: () => this.abrirLibreta(false)
        });
        this.acciones = 0;
        this.avisoDeContinuar = new AvisoDeContinuar(this, { profundidad: PROFUNDIDAD.interfaz + 16 });
        this.crearControles();
        this.input.on('pointerdown', () => this.continuarAlInforme());
        this.events.once('shutdown', () => { this.narracion.detener(); this.cuaderno.cerrar(); });

        // Entrar a la habitación: la intro (importante) pausa el juego desde el primer cuadro
        this.contar(this.investigacion.entro());
    }

    // ── El escenario ─────────────────────────────────────────────────────────

    crearEscenario() {
        const { tam } = this.mapa;
        // Suelo: la capa de baldosas de Tiled, con las baldosas provisionales generadas por código
        const tilemap = this.make.tilemap({ key: 'mapa' + this.numeroDeNivel });
        const baldosas = tilemap.addTilesetImage('provisional', 'tilesProvisional');
        tilemap.createLayer('suelo', baldosas, 0, 0).setDepth(PROFUNDIDAD.suelo);
        // Paredes: una imagen por baldosa, con su propia profundidad, para poder pasar por detrás de ellas
        this.mapa.paredes.forEach((fila, r) => fila.forEach((gid, c) => {
            if (gid) this.add.image(c * tam, r * tam, 'tilesProvisional', gid - 1).setOrigin(0, 0).setDepth((r + 1) * tam);
        }));
        // Muebles: la imagen termina en el borde sur de su huella; la profundidad es esa línea
        this.imagenesDeMuebles = {};
        for (const m of this.mapa.muebles) {
            this.imagenesDeMuebles[m.nombre] = this.add.image(m.x, m.y + m.alto, `mueble-${m.nombre}`).setOrigin(0, 1).setDepth(m.y + m.alto);
        }
        // Marcas: solo se ven cuando el cono de la linterna las toca
        this.revelables = this.mapa.revelables.map(o => ({
            objeto: o, ref: o.props.ref, alfa: 0, descubierta: false, iluminado: false,
            imagen: this.add.image(o.x + o.ancho / 2, o.y + o.alto / 2, `revelable-${o.nombre}`).setDepth(PROFUNDIDAD.marcas).setAlpha(0)
        }));
        // Todo lo que se puede usar con E: lo que el mapa señala y las marcas que además se pueden examinar
        this.usables = this.mapa.interactuables.map(o => {
            const u = { objeto: o, recogido: false, imagen: null };
            if (o.props.dibujo) {
                const mueble = this.mapa.muebles.find(m => m.nombre === o.props.sobre);
                // Sobre un mueble, justo por encima de él; sobre el muro, por encima de la pared; en el suelo, según su base
                const profundidad = mueble ? mueble.y + mueble.alto + 0.5 : o.props.enPared ? 256.3 : o.y + o.alto;
                u.imagen = this.add.image(o.x + o.ancho / 2, o.y + o.alto / 2, `item-${o.props.dibujo}`).setDepth(profundidad);
            }
            return u;
        });
        for (const r of this.revelables) if (r.objeto.props.accion) this.usables.push({ objeto: r.objeto, recogido: false, imagen: null });
        // La zona de alcance de cada uno: dónde hay que estar, hacia dónde mirar y qué tiene que tocar la luz (src/motor/Alcance.js)
        for (const u of this.usables) u.zona = zonaDeAccion(u.objeto, this.mapa.muebles);
    }

    // Una zona estática por cada rectángulo de colisión (las paredes ya vienen unidas en rectángulos grandes) y por cada
    // mueble (se guarda su zona: una alacena que rueda la mueve)
    crearFisica() {
        this.physics.world.setBounds(0, 0, this.mapa.ancho, this.mapa.alto);
        this.obstaculos = this.physics.add.staticGroup();
        const nueva = r => {
            const zona = this.add.zone(r.x + r.ancho / 2, r.y + r.alto / 2, r.ancho, r.alto);
            this.physics.add.existing(zona, true);
            this.obstaculos.add(zona);
            return zona;
        };
        for (const r of rectangulosDeParedes(this.mapa)) nueva(r);
        this.zonasDeMuebles = {};
        for (const m of this.mapa.muebles) this.zonasDeMuebles[m.nombre] = nueva(m);
    }

    // Un mueble rueda `dx` px con una animación fija. Al terminar cambian el mapa (el mueble, su bloque de luz y lo que está
    // sobre él), la colisión, la luz y las zonas de uso: lo que cuenta es dónde queda. (La acción es UNA pulsación de E:
    // el mueble no se empuja con física ni se lleva a ningún lugar.)
    desplazarMueble(nombre, dx, ms, alTerminar) {
        const imagen = this.imagenesDeMuebles[nombre];
        this.tweens.add({
            targets: imagen, x: imagen.x + dx, duration: ms, ease: 'Sine.easeInOut',
            onComplete: () => {
                desplazarMueble(this.mapa, nombre, dx);
                const zona = this.zonasDeMuebles[nombre];
                zona.x += dx;
                zona.body.updateFromGameObject();
                this.linterna.segmentos = segmentosDeLuz(this.mapa);
                for (const u of this.usables) u.zona = zonaDeAccion(u.objeto, this.mapa.muebles);
                alTerminar?.();
            }
        });
    }

    // ── La luz que no es de la linterna ──────────────────────────────────────
    // La que entra con el cierre y los relámpagos de las habitaciones con ventana (src/motor/Luz.js). Solo visual.
    crearLuces() {
        this.luzDeCierre = new LuzDeCierre();
        this.relampagos = this.mapa.ventanas.length ? new Relampagos({ semilla: this.numeroDeNivel * 7 + 3 }) : null;
        this.vidrios = this.mapa.ventanas.map(v => this.add.rectangle(v.x + v.ancho / 2, v.y + v.alto / 2, v.ancho, v.alto, 0xdfe8ff)
            .setBlendMode(Phaser.BlendModes.ADD).setDepth(PROFUNDIDAD.oscuridad + 0.1).setAlpha(0));
        this.destelloPrevio = 0;
        this.mirada = null;                // lo que revela el cierre: la cámara lo encuadra y se le pone una luz
        this.luzDeLaMirada = null;
        if (this.relampagos) this.linterna.ponerVentanas(this, this.mapa.ventanas.map(v => ({ x: v.x + v.ancho / 2, y: v.y + v.alto / 2 })));
        this.formaDeLaLuz = this.make.graphics({ x: 0, y: 0, add: false });
        this.mascaraDeLaLuz = null;
        // Lo que se descubre con la linterna y lo que se puede recoger: un destello no debe enseñarlo
        for (const r of this.revelables) this.registrarSoloConLuz(r.imagen);
        for (const u of this.usables) if (u.objeto.props.accion === 'recoger' && u.imagen) this.registrarSoloConLuz(u.imagen);
    }

    // Cada habitación registra aquí lo suyo que solo se ve con la linterna (los hilos, el vapor, las tablas huecas…)
    registrarSoloConLuz(...objetos) { this.soloConLuz.push(...objetos.filter(Boolean)); }

    // Durante un destello, todo lo "solo con luz" se recorta a la forma de la linterna: fuera de ella sigue sin verse
    recortarALaLinterna(destello) {
        if (destello <= 0) {
            if (this.mascaraDeLaLuz) {
                for (const o of this.soloConLuz) o.clearMask?.();
                this.mascaraDeLaLuz = null;
            }
            return;
        }
        const { luz, poligono } = this.linterna;
        if (!luz) return;
        const forma = formaDeLaLinterna(luz, poligono, CONO_DE_LINTERNA.radioHalo);
        const g = this.formaDeLaLuz;
        g.clear();
        g.fillStyle(0xffffff, 1);
        if (forma.abanico.length) g.fillPoints(forma.abanico, true);
        g.fillCircle(forma.halo.x, forma.halo.y, forma.halo.radio);
        if (!this.mascaraDeLaLuz) {
            this.mascaraDeLaLuz = g.createGeometryMask();
            for (const o of this.soloConLuz) o.setMask?.(this.mascaraDeLaLuz);
        }
    }

    // Con el cierre: empieza a entrar la luz y, si la habitación tiene algo que enseñar, la cámara va hacia ello
    encenderElCierre() {
        this.luzDeCierre.encender();
        this.mirada = this.habitacion.focoDelCierre?.() ?? null;
        if (this.mirada) {
            this.luzDeLaMirada = { x: this.mirada.x, y: this.mirada.y, radio: this.mirada.radio ?? 190, nivel: 0 };
            this.linterna.fuentes.push(this.luzDeLaMirada);
        }
    }

    get mirando() { return !!this.mirada && (this.fase === 'cierre' || this.fase === 'espera'); }

    actualizarLuces(dt, pausado) {
        const claridad = this.luzDeCierre.actualizar(dt);
        const destello = this.relampagos?.actualizar(dt, { activo: !pausado && this.fase === 'investigando' }) ?? 0;
        this.linterna.claridad = claridad;
        this.linterna.destello = destello;
        for (const vidrio of this.vidrios) vidrio.setAlpha(0.6 * destello);
        this.recortarALaLinterna(destello);
        if (this.luzDeLaMirada) this.luzDeLaMirada.nivel = claridad;
        if (this.mirando) {
            const cam = this.cameras.main, o = encuadre(this.mirada, this.mapa, { ancho: cam.width, alto: cam.height });
            this.desplazamiento = { x: acercar(this.desplazamiento.x, o.x, dt, 2.2), y: acercar(this.desplazamiento.y, o.y, dt, 2.2) };
            this.aplicarDesplazamiento();
        }
        // La oscuridad se redibuja aunque el juego esté en pausa, si la luz está cambiando o la cámara se mueve
        if (pausado && (this.luzDeCierre.encendida || destello > 0 || this.destelloPrevio > 0)) {
            this.linterna.actualizar(this.inspector.origenDeLuz, this.inspector.direccionDeLuz, this.cameras.main);
        }
        this.destelloPrevio = destello;
    }

    // ── La cámara ────────────────────────────────────────────────────────────
    // No usa startFollow: se mueve aquí, antes de dibujar la luz, para que la oscuridad (fija a la pantalla)
    // y el mundo usen siempre el mismo desplazamiento y la linterna no vaya un cuadro por detrás.

    objetivoDeCamara() {
        const cam = this.cameras.main, p = this.inspector.centro;
        return {
            x: desplazamientoDeCamara(p.x, cam.width, this.mapa.ancho),
            y: desplazamientoDeCamara(p.y, cam.height, this.mapa.alto)
        };
    }

    colocarCamara() {
        this.cameras.main.setBounds(0, 0, this.mapa.ancho, this.mapa.alto);
        this.desplazamiento = this.objetivoDeCamara();
        this.aplicarDesplazamiento();
    }

    // El desplazamiento se guarda con decimales y solo se redondea al aplicarlo: si se redondeara en cada cuadro,
    // a muchos FPS el paso del suavizado sería menor que medio píxel y la cámara se quedaría corta del objetivo.
    seguirConLaCamara(dt) {
        const o = this.objetivoDeCamara();
        this.desplazamiento = {
            x: acercar(this.desplazamiento.x, o.x, dt, SUAVIZADO_DE_CAMARA),
            y: acercar(this.desplazamiento.y, o.y, dt, SUAVIZADO_DE_CAMARA)
        };
        this.aplicarDesplazamiento();
    }

    aplicarDesplazamiento() {
        this.cameras.main.setScroll(Math.round(this.desplazamiento.x), Math.round(this.desplazamiento.y));
    }

    jugadorEnPantalla() {
        const cam = this.cameras.main, p = this.inspector.pies;
        return { x: p.x - cam.scrollX, y: p.y - cam.scrollY };
    }

    // ── Entradas ─────────────────────────────────────────────────────────────
    // Todas pasan por destinoDeEntrada (src/ui/Entradas.js): una tecla nunca hace dos cosas, y durante una pausa
    // narrativa solo avanzan el texto (E, Espacio, Enter o un toque) y Esc; mover avisa de cómo continuar.

    crearControles() {
        const kb = this.input.keyboard;
        kb.addCapture('F3,F4,F6,F7,F8,SPACE,TAB');   // que el navegador no abra su buscador, no baje la página ni cambie de foco
        kb.on('keydown-F3', () => this.depuracion.alternarFps());
        kb.on('keydown-F4', () => this.depuracion.alternarCuerpos());
        if (cargaExtrema()) {                         // F6 (el revisor) está en todas las pantallas: lo instala main.js
            kb.on('keydown-F7', () => lanzarTarjetas(this));
            kb.on('keydown-F8', () => lanzarCaja(this));
        }
        // Con la libreta abierta, todas las teclas son del cuaderno. Cada pulsación es de una sola cosa: se marca el evento
        // según el cuaderno estuviera abierto (suyo) o cerrado (del juego) cuando llegó, sea cual sea el orden en que
        // Phaser avise a cada escucha. Así la pulsación que abre el cuaderno (Tab, o el Espacio que cierra el texto del
        // error) no cuenta también como una tecla dentro de él, ni la que lo cierra como una acción del juego.
        kb.on('keydown', ev => {
            if (!this.cuaderno.abierta || ev.cuadernoCerrado) return;
            ev.cuadernoAbierto = true;
            this.cuaderno.tecla(ev.keyCode, ev.repeat);
        });
        kb.on('keydown-TAB', ev => this.alPulsarLibreta(ev));
        kb.on('keydown-I', ev => this.alPulsarLibreta(ev));
        kb.on('keydown-ESC', ev => { if (!this.delCuaderno(ev)) this.recibirEntrada('menu', ev); });
        kb.on('keydown-SPACE', ev => { if (!this.delCuaderno(ev)) this.recibirEntrada('avanzar', ev); });
        kb.on('keydown-ENTER', ev => { if (!this.delCuaderno(ev)) this.recibirEntrada('avanzar', ev); });
        kb.on('keydown-E', ev => { if (!this.delCuaderno(ev)) this.alPulsarE(ev); });
        for (const tecla of TECLAS_DE_MOVER) kb.on(`keydown-${tecla}`, ev => { if (!this.delCuaderno(ev) && !ev.repeat) this.recibirEntrada('mover', ev); });
        this.events.once('shutdown', () => kb.clearCaptures());
    }

    // ¿Esta pulsación es del cuaderno (libreta o deducción)?
    delCuaderno(evento) {
        if (evento.cuadernoAbierto || this.cuaderno.abierta) return true;
        evento.cuadernoCerrado = true;
        return false;
    }

    // Tab o I abren la libreta (y, con ella abierta, la cierran: eso lo hace el cuaderno)
    alPulsarLibreta(evento) {
        if (this.delCuaderno(evento) || evento.repeat) return;
        if (this.narracion.bloqueando) this.narracion.llamarAtencion();      // durante un texto importante no se abre
        else this.abrirLibreta(false);
    }

    // E avanza el texto durante una pausa; fuera de ella, usa lo que tiene al lado
    alPulsarE(evento) {
        if (this.narracion.bloqueando || this.espera) this.recibirEntrada('avanzar', evento);
        else if (!evento.repeat) this.interactuar();
    }

    recibirEntrada(tecla, evento) {
        if (this.espera) {                    // esperando para pasar al informe: solo cuenta "continuar" (y nunca una tecla sostenida)
            if (tecla === 'avanzar' && !evento?.repeat) this.continuarAlInforme();
            return;
        }
        const destino = destinoDeEntrada(tecla, { pausaNarrativa: this.narracion.bloqueando }, !!evento?.repeat);
        if (destino === 'narrativa') this.narracion.avanzar();
        else if (destino === 'avisar') this.narracion.llamarAtencion();
        else if (destino === 'juego' && tecla === 'menu') this.alPulsarEsc(evento);
    }

    // Esc en el juego ya no saca de la habitación: abre el menú de pausa ("Continuar" o "Salir al menú", que pide
    // confirmación porque se pierde lo investigado). Durante un texto importante solo se avisa de cómo continuar.
    alPulsarEsc(evento) {
        if (evento?.repeat) return;
        if (this.narracion.bloqueando) this.narracion.llamarAtencion();
        else this.abrirPausa();
    }

    abrirPausa() {
        if (this.cuaderno.abierta || this.narracion.bloqueando || !this.puedeActuar() || this.saliendo || this.animando) return;
        this.pausarPorLaLibreta();
        this.cuaderno.abrirPausa();
    }

    // Salir de la habitación (ya confirmado): al volver a entrar se empieza de cero
    salir() {
        this.scene.start('MenuNiveles');
    }

    // ── Pausa narrativa ──────────────────────────────────────────────────────
    // El inspector se detiene, la linterna y la cámara se quedan quietas (el cuadro de update las salta) y la ayuda no cuenta.

    alPausar() {
        this.inspector.sprite.setVelocity(0, 0);
        this.indicador.ocultar();
    }

    // Termina un texto importante. Si había algo esperando ese momento (volver a la pregunta tras el error, pasar al
    // informe tras el cierre), pasa ahora.
    alReanudar() {
        const siguiente = this.despuesDelTexto;
        this.despuesDelTexto = null;
        siguiente?.();
    }

    // ── Cada cuadro ──────────────────────────────────────────────────────────

    update(tiempo, delta) {
        const dt = Math.min(delta, 50) / 1000;
        const pausado = this.narracion.bloqueando || this.cuaderno.abierta || this.saliendo || this.animando || !!this.espera;
        const cam = this.cameras.main;
        this.actualizarLuces(dt, pausado);          // antes de dibujar la oscuridad: así el destello no llega un cuadro tarde
        if (pausado) {
            this.inspector.sprite.setVelocity(0, 0);
        } else {
            if (!this.mirando) this.seguirConLaCamara(dt);
            this.inspector.actualizar(dt, cam);
            this.linterna.actualizar(this.inspector.origenDeLuz, this.inspector.direccionDeLuz, cam);
        }
        // La ayuda sin texto: tras un rato sin descubrir nada se refuerza lo que falta. Cómo se ve lo decide cada habitación.
        // No cuenta durante la pausa, ni durante la cuenta previa a una revelación, ni con la libreta abierta.
        const efecto = this.ayuda.actualizar(dt, { pausado })?.efecto;
        this.habitacion.aplicarAyuda(efecto);
        this.habitacion.actualizar(dt, tiempo, { pausado });
        if (!pausado) {
            this.actualizarPisos();
            this.actualizarRevelables(dt);
            this.actualizarInteraccion(dt, tiempo);
        } else {
            this.indicador.ocultar();
            this.indicador.actualizar(dt, tiempo);
        }
        this.narracion.actualizar();
        this.actualizarEspera(delta);
        // La libreta: avisa sola la primera vez que ya se puede resolver (cuando no hay ningún importante en curso) y, si
        // el jugador sigue investigando, queda su ícono en la esquina (más fuerte si la ayuda lo pide)
        if (this.fase === 'investigando' && !this.saliendo && !this.cuaderno.abierta) {
            const bloqueado = this.narracion.bloqueando;
            if (this.aviso.actualizar(dt, { disponible: this.deduccion.disponible(), bloqueado })) this.abrirLibreta(true);
        }
        this.icono.actualizar(dt, tiempo, { visible: this.aviso.iconoVisible && this.fase === 'investigando' && !pausado, fuerte: efecto === 'libreta' });
        this.depuracion.actualizar(this.game.loop.rawDelta, {
            luz: this.linterna.estadisticas, apuntado: this.inspector.modoDeApuntado,
            extra: [
                `ayuda ${this.ayuda.activa ? 'ACTIVA ' + this.ayuda.refuerzo.efecto : 'no'} (${this.ayuda.inactividad.toFixed(0)} s)`,
                ...this.habitacion.depurar(),
                `pausa ${pausado ? 'sí' : 'no'}  ·  fase ${this.fase}  ·  deducción ${this.deduccion.disponible() ? 'disponible' : 'no'}`
            ]
        });
    }

    // Caminar sobre una zona del mapa (tipo "piso", con su "ref") es un suceso: las tablas que crujen, el suelo hueco, la chimenea
    // cerca. Cada zona cuenta una sola vez (el motor ignora un hecho repetido).
    actualizarPisos() {
        const p = this.inspector.pies;
        for (const z of this.pisos) {
            if (p.x >= z.x && p.x <= z.x + z.ancho && p.y >= z.y && p.y <= z.y + z.alto) this.contar(this.investigacion.piso(z.props.ref));
        }
    }

    // ── Lo que descubre la luz ───────────────────────────────────────────────
    // Una marca existe para el jugador solo mientras el cono ilumina alguna parte visible de ella. La primera vez
    // que la toca se descubre: aparece su tarjeta y su aparición temporal, y las reglas deciden si sale alguna línea más.

    actualizarRevelables(dt) {
        for (const r of this.revelables) {
            const o = r.objeto;
            if (r.oculto) { r.imagen.setAlpha(0); continue; }          // un hilo cortado, por ejemplo
            r.iluminado = rectanguloIluminado({ x: o.x, y: o.y, ancho: o.ancho, alto: o.alto }, this.linterna.luz, this.linterna.poligono);
            r.alfa = acercar(r.alfa, r.iluminado ? 1 : 0, dt, r.iluminado ? 16 : 7);
            r.imagen.setAlpha(r.alfa);
            if (r.iluminado && !r.descubierta) this.descubrir(r);
        }
    }

    descubrir(r) {
        r.descubierta = true;
        const datos = (this.narrativa.marcas || []).find(m => m.id === r.ref);
        const o = r.objeto;
        // Una marca sin tarjeta en la narrativa (la mancha de aceite de la cocina) solo aparece en el suelo, sin texto
        if (datos) {
            this.narracion.gestor.mostrar(new AparicionDeMarca(this, this.capaMarcas, { id: r.ref }, {
                // Una lupa dorada dibujada (antes era el emoji de la narrativa: la pata, la lupa…)
                x: o.x + o.ancho / 2, y: o.y + o.alto / 2 - 10, icono: 'rastro',
                crearIcono: (x, y) => this.add.image(x, y, iconoDeRastro(this)).setOrigin(0.5)
            }));
        }
        this.contar(this.investigacion.ilumino(r.ref));
    }

    // ── Interactuar con E ────────────────────────────────────────────────────
    // Algo se puede usar (y aparece su ícono) solo si el inspector está CERCA (40 px desde los pies como máximo), lo mira
    // DE FRENTE (la linterna apunta hacia ello, dentro de ±60°) y la luz LO TOCA (el cono o el halo que rodea al inspector;
    // lo que está tapado por un mueble o una pared no recibe luz). Gana el más cercano. Además las reglas
    // pueden exigir antes otras cosas: las marcas de arrastre solo se examinan si ya se descubrieron con la luz.

    buscarCandidato() {
        const { luz, poligono } = this.linterna;
        // Solo lo que todavía puede dar algo: sobre lo ya usado (mirar la ventana después de la revelación) no hay ícono
        const posibles = this.usables.filter(u => !u.recogido && this.investigacion.hayAlgoNuevo(u.objeto.props.ref, u.objeto.props.accion, u.objeto.props.lado));
        const elegido = elegirAccion(this.inspector.pies, this.inspector.direccionDeLuz, posibles.map(u => u.zona), z => zonaIluminada(z.luz, luz, poligono, 4, CONO_DE_LINTERNA.radioHalo));
        return elegido ? posibles.find(u => u.zona === elegido.zona) : null;
    }

    actualizarInteraccion(dt, tiempo) {
        this.candidato = this.buscarCandidato();
        if (this.candidato) {
            const o = this.candidato.objeto, p = this.inspector.pies;
            // El ícono flota sobre el punto de lo usable más cercano al inspector
            this.indicador.mostrarEn(Math.max(o.x, Math.min(p.x, o.x + o.ancho)), Math.max(o.y, Math.min(p.y, o.y + o.alto)) - 38);
        } else {
            this.indicador.ocultar();
        }
        this.indicador.actualizar(dt, tiempo);
    }

    interactuar() {
        const u = this.candidato;
        if (!u || this.narracion.bloqueando || this.cuaderno.abierta || !this.puedeActuar() || this.animando) return;
        const { ref, accion, lado } = u.objeto.props;
        this.acciones++;
        const eventos = this.investigacion[SUCESO_DE_ACCION[accion]](ref, lado);
        if (accion === 'recoger') {
            this.recoger(u);
            this.contar(eventos);
        } else {
            // Si la acción tiene animación (rodar la alacena), lo que sale de ella llega cuando termina: primero la causa
            this.animando = true;
            this.responder(u, () => {
                this.animando = false;
                this.contar(eventos);
                // La acción final (abrir la puerta, cortar el último hilo): al hacerla, el nivel se cierra (o, en el nivel 5, pasa al informe)
                if (this.fase === 'final' && this.final?.objeto === ref && this.final?.accion === accion) {
                    if (this.final.despuesDelCierre) this.irAlInforme();
                    else this.cerrarNivel();
                }
            });
        }
    }

    // El juego sigue en marcha: investigando, o con una acción final por hacer
    puedeActuar() { return this.fase === 'investigando' || this.fase === 'final'; }

    // Lo que ocurre con cada acción, sin texto: un anillo que se expande y la reacción propia de la habitación.
    // terminado() se llama una vez, cuando la reacción acaba.
    responder(u, terminado) {
        const o = u.objeto;
        const x = o.x + o.ancho / 2, y = o.y + o.alto / 2;
        const anillo = this.add.circle(x, y, 14).setStrokeStyle(3, 0xffd27a, 1).setDepth(PROFUNDIDAD.interfaz);
        this.tweens.add({ targets: anillo, scale: 4, alpha: 0, duration: 520, ease: 'Cubic.easeOut', onComplete: () => anillo.destroy() });
        this.habitacion.alResponder(u, terminado);
    }

    // Una pista o las pilas se recogen: desaparecen del suelo; las pistas quedan guardadas en el Registro
    recoger(u) {
        u.recogido = true;
        const { ref } = u.objeto.props;
        if ((this.narrativa.pistas || []).some(p => p.id === ref)) Registro.registrarPista(ref, this.numeroDeNivel);
        const imagen = u.imagen;
        if (!imagen) return;
        this.tweens.add({ targets: imagen, scale: 1.8, alpha: 0, y: imagen.y - 12, duration: 320, ease: 'Cubic.easeOut', onComplete: () => imagen.setVisible(false) });
    }

    // ── La libreta, la deducción, el cierre y el informe ─────────────────────

    // La libreta pausa el juego: el inspector se detiene, la ayuda no cuenta y los textos de las notas y las apariciones
    // de las marcas se quedan como estaban. aviso: se abre sola porque ya se puede resolver el caso.
    abrirLibreta(aviso = false) {
        if (this.cuaderno.abierta || this.narracion.bloqueando || !this.puedeActuar() || this.saliendo || this.animando) return;
        this.aviso.alAbrirLaLibreta(this.deduccion.disponible());
        this.ayuda.alDescubrir();                      // abrirla es hacer algo: la ayuda empieza de nuevo al cerrarla
        this.pausarPorLaLibreta();
        this.cuaderno.abrirLibreta({ aviso });
    }

    pausarPorLaLibreta() {
        this.inspector.sprite.setVelocity(0, 0);
        this.indicador.ocultar();
        this.narracion.panel.pausar();
        this.narracion.gestor.pausarTodas();
    }

    // reiniciarAyuda: abrir y cerrar la libreta cuenta como hacer algo; la pausa no
    reanudarDeLaLibreta(reiniciarAyuda = true) {
        this.narracion.panel.reanudar();
        this.narracion.gestor.reanudarTodas();
        if (reiniciarAyuda) this.ayuda.alDescubrir();
    }

    // Una respuesta equivocada: sale la línea de error de la narrativa como importante y, al terminarla, se vuelve a esa
    // misma pregunta (sin castigo). Cada error es un acontecimiento distinto, así que siempre sale.
    alEquivocarse() {
        this.reanudarDeLaLibreta();
        this.despuesDelTexto = () => { this.pausarPorLaLibreta(); this.cuaderno.abrirPregunta(); };
        this.narracion.contar({
            acontecimiento: `error#${++this.numeroDeErrores}`, ref: 'error', clase: 'importante', categoria: 'error',
            texto: this.narrativa.error, alCompletar: 'descartar'
        });
    }

    // Se acertó una pregunta y quedan más. Si ese acierto cuenta una línea (la conexión de la «V»), sale como importante y, al
    // terminarla, se vuelve a la libreta en la siguiente pregunta. Devuelve true solo en ese caso: entonces la libreta se cierra.
    alAcertar(idDePregunta) {
        const eventos = this.investigacion.acerto(idDePregunta);
        if (!eventos.length) return false;
        this.reanudarDeLaLibreta(false);
        this.despuesDelTexto = () => { this.pausarPorLaLibreta(); this.cuaderno.abrirPregunta(); };
        this.contar(eventos);
        return true;
    }

    // Las preguntas resueltas. Si el nivel tiene una acción final (abrir la puerta, cortar el último hilo), ahora hay que hacerla
    // (la ayuda sigue); si no, el nivel se cierra: queda completado, la ayuda se apaga, el fenómeno se calma y sale el cierre
    // como importante; al cerrarlo, pasa al informe.
    alResolver() {
        this.reanudarDeLaLibreta();
        this.aviso.alResolver();
        const eventos = this.investigacion.resolvio();
        this.retenidos = eventos.filter(e => e.despuesDelCierre);          // lo que sale DESPUÉS del texto del cierre (la pista del compartimento)
        this.contar(eventos.filter(e => !e.despuesDelCierre));
        if (this.final?.objeto && !this.final.despuesDelCierre) {
            this.fase = 'final';
            return;
        }
        this.cerrarNivel();
    }

    // El cierre del nivel (el texto "cierre" de la narrativa). aTrasElTexto: qué pasa al terminarlo; por defecto, el informe
    // (con lo que cada habitación quiera hacer antes: el compartimento que se abre, la silueta que cruza la ventana).
    cerrarNivel({ alTerminar = null } = {}) {
        this.fase = 'cierre';
        // El cierre de la última habitación es el final del caso: empieza la música del final (src/presentacion/MusicaDeFondo.js)
        if (this.numeroDeNivel === 6) this.game?.events.emit('musica-final');
        if (!this.final?.despuesDelCierre) this.ayuda.apagar();
        this.habitacion.calmar();
        this.habitacion.alIniciarCierre?.();
        this.encenderElCierre();
        this.resumen = this.libreta.resumen();
        // Con una puerta que abrir tras el cierre (nivel 5), la habitación cuenta como completada al salir por ella: así nunca está completada sin los planos
        if (!this.final?.despuesDelCierre) Progreso.marcarCompletado(this.numeroDeNivel);
        this.despuesDelTexto = alTerminar ?? (() => {
            if (this.habitacion.alTerminarCierre) this.habitacion.alTerminarCierre(() => this.irAlInforme());
            else this.irAlInforme();
        });
        this.narracion.contar({
            acontecimiento: 'cierre', ref: 'cierre', clase: 'importante', categoria: 'cierre',
            texto: this.narrativa.cierre, alCompletar: 'conservar'
        });
    }

    // Un intento perdido (nivel 5: la sombra escapó o los papeles se quemaron): sale la línea "error" como importante, sin castigo, y al
    // terminarla se repite el tramo: el inspector vuelve a su sitio y la habitación (su sombra, su tiempo) a empezar. Lo logrado se conserva.
    fallar(reintentar) {
        this.despuesDelTexto = () => { this.reponerInspector(); reintentar(); };
        this.narracion.contar({
            acontecimiento: `error#${++this.numeroDeErrores}`, ref: 'error', clase: 'importante', categoria: 'error',
            texto: this.narrativa.error, alCompletar: 'descartar'
        });
    }

    // El inspector vuelve a la entrada de la habitación, quieto y con la cámara ya sobre él
    reponerInspector() {
        this.inspector.sprite.body.reset(this.mapa.inicio.x, this.mapa.inicio.y);
        this.inspector.sprite.setVelocity(0, 0);
        Object.assign(this.inspector.apuntado, { angulo: Math.PI / 2, modo: 'teclado', sinMoverRaton: 0 });      // la linterna vuelve a apuntar al sur, como al entrar
        this.desplazamiento = this.objetivoDeCamara();
        this.aplicarDesplazamiento();
        this.linterna.actualizar(this.inspector.origenDeLuz, this.inspector.direccionDeLuz, this.cameras.main);
    }

    // Entrega lo que se retuvo hasta el final del cierre. Devuelve si había algo.
    soltarRetenidos() {
        const lista = this.retenidos ?? [];
        this.retenidos = [];
        this.contar(lista);
        return lista.length > 0;
    }

    // Se llama al terminar la habitación (tras el cierre, o al salir por la puerta del nivel 5). Si todavía hay algo por leer (la pista del
    // compartimento, una tarjeta recién recogida), el informe NO llega solo: espera a que se escriba entera y pase su tiempo de lectura, y
    // después a que el jugador pulse (src/motor/EsperaDeLectura.js; el Narrador y sus tiempos no cambian).
    irAlInforme() {
        if (this.saliendo || this.espera) return;
        if (this.final?.despuesDelCierre) {
            Progreso.marcarCompletado(this.numeroDeNivel);
            this.resumen = this.libreta.resumen();      // lo que se recogió tras el cierre (el abrigo, las pilas) también cuenta
        }
        if (quedaPorLeer(this.estadoDeLectura())) {
            this.fase = 'espera';
            this.espera = new EsperaDeLectura();
            this.ayuda.apagar();
            return;
        }
        this.salirAlInforme();
    }

    estadoDeLectura() {
        const { panel, narrador, pendientes, bloqueando } = this.narracion;
        return {
            tarjetas: panel.tarjetas.map(t => ({ id: t, tipo: t.tipo, fase: t.fase, restanteMs: t.temporizador?.getRemaining() ?? 0 })),
            enCola: { libreta: narrador.secundarios.length, ambiental: narrador.colaAmbiental.length },
            ocupada: bloqueando || pendientes.length > 0
        };
    }

    actualizarEspera(delta) {
        if (!this.espera || this.saliendo || this.avisoDeContinuar.visible) return;
        const { sostener, listo } = this.espera.actualizar(delta, this.estadoDeLectura());
        for (const tarjeta of sostener) if (tarjeta.temporizador) tarjeta.temporizador.paused = true;      // ya leída: se queda a la vista
        if (listo) this.avisoDeContinuar.mostrar();
    }

    // E, Espacio, Enter o un clic con el aviso a la vista
    continuarAlInforme() {
        if (this.espera && this.avisoDeContinuar.visible) this.salirAlInforme();
    }

    salirAlInforme() {
        if (this.saliendo) return;
        this.saliendo = true;
        const cam = this.cameras.main;
        cam.once('camerafadeoutcomplete', () => this.scene.start('Informe', { numeroDeNivel: this.numeroDeNivel, resumen: this.resumen ?? this.libreta.resumen() }));
        cam.fadeOut(450, 0, 0, 0);
    }

    // Pasa lo que salió de las reglas al Narrador: primero la causa (tarjeta o nota) y, un momento después, la
    // revelación. Descubrir algo apaga y reinicia la ayuda.
    contar(eventos) {
        // Una pista que sale de una regla (los planos, tras apagar la chimenea) también queda en el Registro para el expediente
        for (const e of eventos) if (e.categoria === 'pistas' && e.referencia) Registro.registrarPista(e.referencia.split(':')[1], this.numeroDeNivel);
        this.narracion.contarTodos(eventos);
        if (eventos.length) this.ayuda.alDescubrir();
    }
}
