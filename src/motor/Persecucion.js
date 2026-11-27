// La persecución del nivel 5 (La Sombra en la Ventana), sin Phaser y determinista (con semilla). Una sombra quema papeles en la chimenea
// y reacciona al inspector y a su luz:
//   · "ruta": recorre en círculo los puntos junto a la chimenea;
//   · "huir": si la alumbran (desde menos de 400 px) o el inspector se acerca, corre hacia la salida al jardín; si la salida está bloqueada, hacia el escondite
//     que queda más lejos del inspector;
//   · "escondida": espera tapada; si el inspector se acerca demasiado, se cambia de escondite; si la dejan en paz un rato, vuelve a su ruta.
// CAPTURA: mantener a la sombra dentro del cono a ≤ 150 px durante 1,5 s MIENTRAS NO TIENE SALIDA (la salida bloqueada).
// Intento fallido: la sombra sale por el jardín (la salida abierta) o los papeles se terminan de quemar (60 s desde que termina la intro,
// salvo que la chimenea ya esté apagada).
// El tiempo no corre fuera del `activo` (durante las pausas narrativas, la libreta o la pausa del juego).
//
// actualizar(dt, { activo, inspector, iluminada, salidaBloqueada, chimeneaApagada }) devuelve la lista de sucesos de este cuadro:
//   'captura' | 'escapo' | 'papeles'
// `iluminada(p)`: ¿la luz del inspector toca el punto p? (lo decide quien llama: el cono, los muebles que tapan…)
export const PERSECUCION = Object.freeze({
    velocidadDeRuta: 70,
    velocidadDeHuida: 190,           // menos que los 230 del inspector: se la puede alcanzar
    radioDeHuida: 170,               // si el inspector se acerca a menos de esto, huye
    radioDeAviso: 400,               // si la alumbran desde más lejos que esto, todavía no se da cuenta (la luz de lejos no la espanta)
    alcanceDeCaptura: 150,
    segundosDeCaptura: 1.5,
    segundosDeLosPapeles: 60,        // configurable
    radioDelEscondite: 110,          // si el inspector se acerca a menos de esto, la sombra se cambia de escondite
    segundosParaVolver: 5,
    llegada: 14                      // a esta distancia de un punto, se considera que llegó
});

// Un generador de números con semilla (mulberry32): la misma semilla, la misma sombra
export function generador(semilla) {
    let a = semilla >>> 0;
    return () => {
        a = (a + 0x6D2B79F5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const distancia = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

export default class Persecucion {
    // ruta: puntos que recorre · salida: { x, y } del jardín · escondites: [{ x, y }] · semilla: para variar el punto de partida
    constructor({ ruta, salida, escondites, semilla = 1, config = {} }) {
        if (!ruta?.length || !salida || !escondites?.length) throw new Error('la persecución necesita una ruta, una salida y escondites');
        this.ruta = ruta;
        this.salida = salida;
        this.escondites = escondites;
        this.config = { ...PERSECUCION, ...config };
        this.semilla = semilla;
        this.reiniciar();
    }

    // Vuelve a empezar el intento: la sombra a su ruta, el tiempo a cero (lo ya logrado lo guarda quien llama: la salida bloqueada, la chimenea…)
    reiniciar() {
        const azar = generador(this.semilla + (this.intentos ?? 0));
        this.indiceDeRuta = Math.floor(azar() * this.ruta.length);
        this.pos = { ...this.ruta[this.indiceDeRuta] };
        this.estado = 'ruta';
        this.objetivo = null;
        this.tiempo = 0;               // segundos del intento
        this.quemado = 0;              // segundos que llevan ardiendo los papeles
        this.captura = 0;              // segundos seguidos con la sombra en el cono
        this.tranquila = 0;            // segundos sin amenaza (para volver a su ruta)
        this.intentos = (this.intentos ?? -1) + 1;
        this.escondite = null;
    }

    get terminada() { return this.estado === 'capturada' || this.estado === 'escapada' || this.estado === 'perdida'; }

    actualizar(dt, { activo = true, inspector, iluminada = () => false, salidaBloqueada = false, chimeneaApagada = false } = {}) {
        if (!activo || this.terminada) return [];
        const c = this.config;
        this.tiempo += dt;
        // Los papeles
        if (!chimeneaApagada) {
            this.quemado += dt;
            if (this.quemado >= c.segundosDeLosPapeles) { this.estado = 'perdida'; return ['papeles']; }
        }
        const lejos = distancia(inspector, this.pos);
        const alumbrada = iluminada(this.pos);
        const amenazada = (alumbrada && lejos <= c.radioDeAviso) || lejos < c.radioDeHuida;
        this.tranquila = amenazada ? 0 : this.tranquila + dt;

        if (this.estado === 'ruta') {
            this.avanzarPorLaRuta(dt);
            if (amenazada) this.empezarAHuir(inspector, salidaBloqueada);
        } else if (this.estado === 'huir') {
            // Si la salida se bloqueó (o se abrió) mientras corría, cambia de rumbo
            if (salidaBloqueada && this.objetivo === this.salida) this.objetivo = this.elegirEscondite(inspector);
            if (!salidaBloqueada && this.objetivo !== this.salida) this.objetivo = this.salida;
            this.ir(this.objetivo, c.velocidadDeHuida, dt);
            if (distancia(this.pos, this.objetivo) <= c.llegada) {
                if (this.objetivo === this.salida) { this.estado = 'escapada'; return ['escapo']; }
                this.estado = 'escondida';
                this.escondite = this.objetivo;
            }
        } else if (this.estado === 'escondida') {
            if (lejos < c.radioDelEscondite) {
                this.objetivo = this.elegirEscondite(inspector, this.escondite);
                this.estado = 'huir';
            } else if (this.tranquila >= c.segundosParaVolver) {
                this.estado = 'ruta';
            }
        }

        // La captura: en el cono y cerca, sin salida
        if (salidaBloqueada && lejos <= c.alcanceDeCaptura && alumbrada) this.captura += dt;
        else this.captura = Math.max(0, this.captura - 2 * dt);
        if (this.captura >= c.segundosDeCaptura) { this.estado = 'capturada'; return ['captura']; }
        return [];
    }

    avanzarPorLaRuta(dt) {
        const destino = this.ruta[(this.indiceDeRuta + 1) % this.ruta.length];
        this.ir(destino, this.config.velocidadDeRuta, dt);
        if (distancia(this.pos, destino) <= this.config.llegada) this.indiceDeRuta = (this.indiceDeRuta + 1) % this.ruta.length;
    }

    empezarAHuir(inspector, salidaBloqueada) {
        this.estado = 'huir';
        this.objetivo = salidaBloqueada ? this.elegirEscondite(inspector) : this.salida;
    }

    // El escondite más lejos del inspector (sin contar el que acaba de dejar, si se pide)
    elegirEscondite(inspector, excepto = null) {
        const candidatos = this.escondites.filter(e => e !== excepto);
        const lista = candidatos.length ? candidatos : this.escondites;
        return lista.reduce((mejor, e) => (distancia(e, inspector) > distancia(mejor, inspector) ? e : mejor), lista[0]);
    }

    ir(objetivo, velocidad, dt) {
        const d = distancia(this.pos, objetivo);
        if (d < 1e-6) return;
        const paso = Math.min(d, velocidad * dt);
        this.pos = { x: this.pos.x + (objetivo.x - this.pos.x) / d * paso, y: this.pos.y + (objetivo.y - this.pos.y) / d * paso };
    }
}
