// Lo propio de la Sombra en la Ventana (nivel 5, persecución en tiempo real, sin deducción): la sombra que quema papeles junto a la chimenea,
// el fuego, el humo, cerrar la salida al jardín, apagar la chimenea, la captura y la puerta al despacho. La persecución misma (la ruta, la
// huida, el escondite, la captura a 1,5 s y los 60 s de los papeles) es src/motor/Persecucion.js, que se prueba sin Phaser; aquí solo se dibuja
// y se le dice qué pasa en el mundo. Efectos de la ayuda, sin texto:
//   · humo:    el humo sube sobre la oscuridad y marca la chimenea (hasta que se apaga);
//   · pisadas: unas huellas mojadas brillan por donde huye la sombra (hasta que se cierra la salida).
// Un intento perdido (la sombra sale por el jardín o los papeles se queman) devuelve al inspector y a la sombra a sus sitios y el tiempo
// vuelve a cero; lo logrado (la salida cerrada, la chimenea apagada, lo contado) se conserva.
import Persecucion from '../../motor/Persecucion.js';
import { rectanguloIluminado } from '../../motor/Visibilidad.js';
import { acercar } from '../../motor/Movimiento.js';
import { PROFUNDIDAD } from '../profundidad.js';

const SEMILLA = 5;
const PIES_DE_LA_SOMBRA = { ancho: 22, alto: 46 };        // el cuerpo de la sombra, para saber si la luz la toca

export default class Sombra {
    constructor(escena) {
        this.escena = escena;
        this.efecto = null;
        this.niveles = { humo: 0, pisadas: 0 };
        this.salidaBloqueada = false;
        this.chimeneaApagada = false;
        this.empezo = false;                         // ya terminó la intro: desde aquí cuentan los 60 s
        this.intentos = [];                          // { resultado: 'salida' | 'papeles' | 'captura', segundos } de cada intento
        this.fuego = 1;
    }

    crear() {
        const e = this.escena, mapa = e.mapa;
        const puntos = tipo => mapa.objetos.filter(o => o.tipo === tipo).sort((a, b) => a.nombre.localeCompare(b.nombre)).map(o => ({ x: o.x, y: o.y }));
        const parametros = new URLSearchParams(globalThis.location?.search ?? '');
        const config = {};
        if (parametros.has('papeles')) config.segundosDeLosPapeles = Number(parametros.get('papeles'));      // para probar: ?papeles=20
        this.persecucion = new Persecucion({ ruta: puntos('ruta'), salida: puntos('salida-sombra')[0], escondites: puntos('escondite'), semilla: SEMILLA, config });
        const chimenea = mapa.muebles.find(m => m.nombre === 'chimenea');
        this.chimenea = { x: chimenea.x + chimenea.ancho / 2, y: chimenea.y + chimenea.alto };
        const salida = mapa.interactuables.find(o => o.props.ref === 'salida-jardin');
        this.salida = salida;

        // La sombra: una silueta oscura que solo se ve donde llega la luz (la oscuridad de la habitación la cubre)
        this.imagen = e.add.image(this.persecucion.pos.x, this.persecucion.pos.y, 'inspector').setTint(0x07070d).setAlpha(0.92).setOrigin(0.5, 1).setScale(1.04);
        this.reborde = e.add.image(0, 0, 'polvo').setBlendMode(Phaser.BlendModes.ADD).setTint(0x6a7aa8).setAlpha(0).setScale(2.2);
        e.registrarSoloConLuz(this.imagen, this.reborde);
        // El fuego y el humo de la chimenea: brillan por encima de la oscuridad (se ven desde lejos)
        const brillo = (escala, color, profundidad) => e.add.image(0, 0, 'polvo').setBlendMode(Phaser.BlendModes.ADD).setTint(color).setDepth(profundidad).setAlpha(0).setScale(escala);
        this.llama = [brillo(3.2, 0xff8a2a, PROFUNDIDAD.oscuridad + 0.4), brillo(2.2, 0xffd27a, PROFUNDIDAD.oscuridad + 0.5)];
        this.llama.forEach(l => l.setPosition(this.chimenea.x, this.chimenea.y - 44));
        this.humo = Array.from({ length: 12 }, () => brillo(2.6, 0xb8bcc8, PROFUNDIDAD.oscuridad + 0.3));
        // La ayuda: las huellas mojadas por donde huye la sombra
        this.huellas = Array.from({ length: 9 }, () => brillo(1.3, 0x9ed0ff, PROFUNDIDAD.oscuridad + 0.6));
        // La tabla que atranca la salida cuando se cierra (aparece al cerrarla)
        this.tabla = e.add.rectangle(salida.x + salida.ancho / 2, salida.y + salida.alto * 0.45, salida.ancho + 8, 12, 0xb48a50).setStrokeStyle(2, 0x5a4020).setDepth(salida.y + salida.alto + 1).setVisible(false);
        // Lo que queda tras la captura (el abrigo y, en su bolsillo, las pilas) no está a la vista antes: aparece cuando la sombra queda atrapada
        this.despues = ['n5-pista-abrigo', 'bateria'].map(ref => e.usables.find(u => u.objeto.props.ref === ref)?.imagen).filter(Boolean);
        this.despues.forEach(i => i.setAlpha(0));
        this.colocar();
    }

    aplicarAyuda(efecto) { this.efecto = efecto ?? null; }

    // Dónde está la luz del inspector sobre la sombra
    iluminada() {
        const p = this.persecucion.pos, e = this.escena;
        return rectanguloIluminado({ x: p.x - PIES_DE_LA_SOMBRA.ancho / 2, y: p.y - PIES_DE_LA_SOMBRA.alto, ancho: PIES_DE_LA_SOMBRA.ancho, alto: PIES_DE_LA_SOMBRA.alto }, e.linterna.luz, e.linterna.poligono);
    }

    colocar() {
        const p = this.persecucion.pos;
        this.imagen.setPosition(p.x, p.y).setDepth(p.y);
        this.reborde.setPosition(p.x, p.y - 24).setDepth(p.y + 0.1);
    }

    // ── Cada cuadro ──────────────────────────────────────────────────────────

    actualizar(dt, tiempo, { pausado = false } = {}) {
        const e = this.escena, t = tiempo / 1000;
        const p = this.persecucion;
        for (const k of Object.keys(this.niveles)) this.niveles[k] = acercar(this.niveles[k], this.efecto === k ? 1 : 0, dt, 1.2);

        // La persecución empieza cuando termina la intro; no corre durante una pausa narrativa, con la libreta ni con la pausa del juego
        if (!pausado && !this.empezo && e.fase === 'investigando') this.empezo = true;
        if (this.empezo && e.fase === 'investigando') {
            // La primera vez que la luz da en la sombra sale su línea (una sola vez por partida: reintentar() no reinicia la investigación).
            // Ese cuadro la persecución no avanza: nada se mueve antes de la pausa
            const vista = !pausado && p.estado !== 'capturada' && p.estado !== 'escapada' && this.iluminada();
            const eventos = vista ? e.investigacion.ilumino('sombra') : [];
            if (eventos.length) e.contar(eventos);
            else {
                const sucesos = p.actualizar(dt, {
                    activo: !pausado, inspector: e.inspector.pies, iluminada: () => this.iluminada(),
                    salidaBloqueada: this.salidaBloqueada, chimeneaApagada: this.chimeneaApagada
                });
                if (sucesos.length) this.alSuceder(sucesos[0]);
            }
        }
        this.colocar();

        // La sombra se nota (apenas) un poco cuando la luz la toca: un reborde azulado
        const alumbrada = !pausado && p.estado !== 'capturada' && p.estado !== 'escapada' && this.iluminada();
        this.reborde.setAlpha(acercar(this.reborde.alpha, alumbrada ? 0.35 : 0, dt, 10));
        if (p.estado === 'capturada') this.imagen.setAlpha(acercar(this.imagen.alpha, 0.5, dt, 2));
        if (p.estado === 'escapada') { this.imagen.setAlpha(acercar(this.imagen.alpha, 0, dt, 6)); this.reborde.setAlpha(0); }

        // El fuego: titila; si los papeles ya se queman hace rato, más fuerte (sin contador: solo la llama)
        const avance = this.chimeneaApagada ? 0 : Math.min(1, p.quemado / p.config.segundosDeLosPapeles);
        this.fuego = acercar(this.fuego, this.chimeneaApagada ? 0 : 1, dt, 3);
        const titileo = 0.75 + 0.25 * Math.sin(t * 11) * Math.sin(t * 7.3);
        this.llama[0].setAlpha(this.fuego * (0.35 + 0.25 * avance) * titileo).setScale(3 + 1.6 * avance + 0.2 * Math.sin(t * 9));
        this.llama[1].setAlpha(this.fuego * 0.5 * titileo).setScale(1.8 + 0.8 * avance);
        // El humo: un hilo suave que sube de la chimenea; con la ayuda, mucho más visible aunque no haya luz
        this.humo.forEach((h, i) => {
            const s = (t * 0.22 + i / this.humo.length) % 1;
            const fuerza = (this.chimeneaApagada ? 0 : 1) * (0.07 + 0.55 * this.niveles.humo);
            h.setPosition(this.chimenea.x + Math.sin(t * 1.3 + i * 1.7) * (18 + 30 * s), this.chimenea.y - 70 - s * 190).setAlpha(fuerza * Math.sin(Math.PI * s)).setScale(1.6 + s * 2.4);
        });
        // La ayuda: las huellas mojadas, de la sombra hacia donde va (su salida o su escondite)
        const destino = p.objetivo ?? p.salida;
        this.huellas.forEach((h, i) => {
            const s = (t * 0.5 + i / this.huellas.length) % 1;
            h.setPosition(p.pos.x + (destino.x - p.pos.x) * s + (i % 2 ? 6 : -6), p.pos.y - 4 + (destino.y - p.pos.y) * s)
                .setAlpha(this.salidaBloqueada && p.estado === 'ruta' ? 0 : this.niveles.pisadas * 0.7 * Math.sin(Math.PI * s));
        });
    }

    // ── Lo que pasa cuando la persecución avisa ──────────────────────────────

    alSuceder(suceso) {
        const e = this.escena;
        const segundos = Math.round(this.persecucion.tiempo * 10) / 10;
        if (suceso === 'captura') {
            this.intentos.push({ resultado: 'captura', segundos });
            e.events.emit('sombra-capturada');
            this.despues.forEach(i => { if (i.visible) e.tweens.add({ targets: i, alpha: 1, duration: 600 }); });
            e.contar(e.investigacion.capturo());
            // Atrapada: la sala queda en calma. Después del cierre solo falta recoger lo que queda y abrir la puerta al despacho.
            e.cerrarNivel({ alTerminar: () => { e.fase = 'final'; } });
            return;
        }
        this.intentos.push({ resultado: suceso === 'escapo' ? 'salida' : 'papeles', segundos });
        e.events.emit('sombra-perdida', suceso);
        if (suceso === 'papeles') this.llama[0].setScale(7);
        e.fallar(() => this.reintentar());
    }

    // Se repite el tramo: la sombra a su ruta y el tiempo a cero (lo logrado se queda: la salida cerrada, la chimenea apagada)
    reintentar() {
        this.persecucion.reiniciar();
        this.imagen.setAlpha(0.92);
        this.empezo = true;
        this.colocar();
    }

    // ── Lo que hacen las acciones con E ──────────────────────────────────────

    alResponder(u, terminado) {
        const { ref } = u.objeto.props;
        const e = this.escena;
        if (ref === 'salida-jardin') {
            // Cerrar la salida: una tabla la atranca
            this.salidaBloqueada = true;
            this.tabla.setVisible(true).setAlpha(0).setScale(0.4, 1);
            e.tweens.add({ targets: this.tabla, alpha: 1, scaleX: 1, duration: 380, ease: 'Back.easeOut', onComplete: () => terminado() });
            return;
        }
        if (ref === 'chimenea') {
            // Apagar la chimenea: el fuego se apaga y una bocanada de humo sale
            this.chimeneaApagada = true;
            const bocanada = e.add.image(this.chimenea.x, this.chimenea.y - 60, 'polvo').setBlendMode(Phaser.BlendModes.ADD).setTint(0xb8bcc8).setDepth(PROFUNDIDAD.oscuridad + 0.7).setScale(2);
            e.tweens.add({ targets: bocanada, y: bocanada.y - 90, scale: 7, alpha: 0, duration: 900, onComplete: () => bocanada.destroy() });
            e.time.delayedCall(450, () => terminado());
            return;
        }
        if (ref === 'puerta-despacho') {
            // Abrir la puerta al despacho: se abre hacia dentro y la pantalla pasa al informe
            const imagen = u.imagen;
            if (imagen) e.tweens.add({ targets: imagen, scaleX: 0.35, duration: 520, ease: 'Sine.easeInOut', onComplete: () => terminado() });
            else terminado();
            return;
        }
        terminado();
    }

    // El cierre: la sombra queda quieta
    calmar() {}

    depurar() {
        const p = this.persecucion;
        const intentos = this.intentos.map(i => `${i.resultado} ${i.segundos}s`).join(' · ') || 'ninguno';
        return [`sombra: ${p.estado}  ·  t ${p.tiempo.toFixed(1)} s  ·  papeles ${p.quemado.toFixed(1)}/${p.config.segundosDeLosPapeles} s  ·  captura ${p.captura.toFixed(2)}/${p.config.segundosDeCaptura}`,
            `salida ${this.salidaBloqueada ? 'bloqueada' : 'abierta'}  ·  chimenea ${this.chimeneaApagada ? 'apagada' : 'encendida'}  ·  intentos: ${intentos}`];
    }
}
