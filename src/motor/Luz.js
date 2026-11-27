// La luz que no es de la linterna, sin Phaser: la que ENTRA con el cierre (la oscuridad se aclara despacio hasta ver la habitación), los
// RELÁMPAGOS de las habitaciones con ventana (un destello breve, solo visual) y cómo se encuadra lo que el cierre revela.
import { desplazamientoDeCamara } from './Movimiento.js';
import { generador } from './Persecucion.js';
import { diferenciaDeAngulos } from './Geometria.js';

export const LUZ_DE_CIERRE = Object.freeze({ duracionS: 2.8, aclarado: 0.82 });       // cuánta oscuridad se quita al final
// El destello da ambiente, no sirve de linterna: la oscuridad nunca baja de `minima` (junto a la ventana) y lejos de ella, de `general`
export const RELAMPAGO = Object.freeze({ minimoS: 9, maximoS: 18, duracionS: 0.5, general: 0.78, minima: 0.55, radioDeVentana: 250 });
// Cuánto hay que borrar de más junto a la ventana para llegar de `general` a `minima`
export const BORRADO_DE_VENTANA = 1 - RELAMPAGO.minima / RELAMPAGO.general;

const suave = x => x * x * (3 - 2 * x);

// Sube de 0 (a oscuras) a 1 (la habitación a la vista) y se queda
export class LuzDeCierre {
    constructor({ duracionS = LUZ_DE_CIERRE.duracionS } = {}) {
        this.duracion = duracionS;
        this.tiempo = null;
    }

    encender() { if (this.tiempo === null) this.tiempo = 0; }
    get encendida() { return this.tiempo !== null; }
    get claridad() { return this.tiempo === null ? 0 : suave(Math.min(1, this.tiempo / this.duracion)); }

    actualizar(dt) {
        if (this.tiempo !== null) this.tiempo += dt;
        return this.claridad;
    }
}

// Alfa general de la oscuridad con la luz del cierre y, si lo hay, el relámpago (que nunca la deja por debajo de `general`)
export function oscuridadCon(alfa, claridad = 0, destello = 0) {
    const a = alfa * (1 - LUZ_DE_CIERRE.aclarado * claridad);
    return a > RELAMPAGO.general ? a - (a - RELAMPAGO.general) * destello : a;
}

// La oscuridad a `distancia` px del centro de una ventana durante un destello: junto a ella aclara más
export function oscuridadJuntoALaVentana(alfa, destello, distancia) {
    const cerca = Math.max(0, 1 - distancia / RELAMPAGO.radioDeVentana);
    return oscuridadCon(alfa, 0, destello) * (1 - BORRADO_DE_VENTANA * destello * cerca);
}

// La forma de la luz de la linterna en el mundo: el abanico del cono (hasta donde lo dejan paredes y muebles) y el halo que rodea al
// inspector. Durante un relámpago, lo que solo se ve con la linterna se recorta a esta forma.
export function formaDeLaLinterna(luz, poligono, radioHalo) {
    const ventana = luz.semiangulo + luz.suavizado;
    const dentro = poligono.map(v => ({ x: v.x, y: v.y, rel: diferenciaDeAngulos(v.angulo, luz.direccion) }))
        .filter(v => Math.abs(v.rel) <= ventana + 1e-9).sort((a, b) => a.rel - b.rel);
    return {
        abanico: dentro.length > 1 ? [{ x: luz.origen.x, y: luz.origen.y }, ...dentro.map(v => ({ x: v.x, y: v.y }))] : [],
        halo: { x: luz.origen.x, y: luz.origen.y, radio: radioHalo }
    };
}

// De vez en cuando un relámpago: el destello (0 a 1) tiene un golpe de luz, se corta un instante y vuelve más flojo
export class Relampagos {
    constructor({ semilla = 1, minimoS = RELAMPAGO.minimoS, maximoS = RELAMPAGO.maximoS, duracionS = RELAMPAGO.duracionS } = {}) {
        this.azar = generador(semilla);
        this.minimo = minimoS;
        this.maximo = maximoS;
        this.duracion = duracionS;
        this.espera = this.siguienteEspera();
        this.destello = null;          // segundos desde que empezó el que está en curso
        this.cuantos = 0;
    }

    siguienteEspera() { return this.minimo + this.azar() * (this.maximo - this.minimo); }

    // activo: false durante las pausas narrativas, la libreta o el cierre (entonces no empiezan ni avanzan)
    actualizar(dt, { activo = true } = {}) {
        if (!activo) { this.destello = null; return 0; }
        if (this.destello === null) {
            this.espera -= dt;
            if (this.espera > 0) return 0;
            this.destello = 0;
            this.cuantos++;
        } else this.destello += dt;
        const x = this.destello / this.duracion;
        if (x >= 1) {
            this.destello = null;
            this.espera = this.siguienteEspera();
            return 0;
        }
        if (x < 0.25) return 1 - x * 2;
        if (x < 0.4) return 0.1;
        return 0.7 * (1 - (x - 0.4) / 0.6);
    }
}

// El desplazamiento de cámara que centra un punto del mundo (sin salirse del mapa)
export function encuadre(punto, mapa, vista) {
    return { x: desplazamientoDeCamara(punto.x, vista.ancho, mapa.ancho), y: desplazamientoDeCamara(punto.y, vista.alto, mapa.alto) };
}
