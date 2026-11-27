// El fenómeno del pasillo: las cortinas se mueven cada cierto tiempo y, con cada ráfaga, sus sombras parecen caminar
// por la pared. Sigue activo mientras dure la habitación; con el cierre (`calmar()`) se detiene: las cortinas se quedan
// quietas y las sombras ya no vuelven.
//
// `intensidad` (1 normal, más con la ayuda) multiplica el vaivén: las cortinas se agitan más fuerte.
// `sacudir()` provoca una ráfaga inmediata (por ejemplo, al examinar las cortinas).
import { acercar } from '../motor/Movimiento.js';

const MIN_ENTRE_RAFAGAS = 6, MAX_ENTRE_RAFAGAS = 11;       // segundos
const DURACION_DE_RAFAGA = 2.8;
const BASE = 0.16;                                         // el vaivén de reposo (nunca están del todo quietas)
const SOMBRAS = 3;

export default class Cortinas {
    constructor(escena, mapa) {
        this.escena = escena;
        // La decoración se dibuja justo por encima de la cara del muro (su base) y por debajo de todo lo que pisa
        const pie = Math.ceil(Math.max(...mapa.ventanas.map(v => v.y + v.alto)) / mapa.tam) * mapa.tam;
        this.profundidad = pie + 0.1;
        this.ventanas = mapa.ventanas.map(v => escena.add.image(v.x, v.y, v.props.rota ? 'ventana-rota' : 'ventana').setOrigin(0, 0).setDepth(this.profundidad));
        this.cortinas = mapa.cortinas.map((c, i) => ({
            imagen: escena.add.image(c.x + c.ancho / 2, c.y, c.props.rota ? 'cortina-rota' : 'cortina').setOrigin(0.5, 0).setDepth(this.profundidad + 0.1),
            fuerza: c.props.fuerza ?? 1,
            fase: (i * 1.7) % (Math.PI * 2),
            velocidad: 1.3 + (i % 3) * 0.35
        }));
        // Las sombras caminan por el muro, entre sus ventanas y ahí donde cae el borde del pasillo
        const xs = mapa.ventanas.map(v => v.x + v.ancho / 2);
        this.recorrido = { desde: Math.min(...xs) - 120, hasta: Math.max(...xs) + 40, y: pie - 62 };
        this.sombras = Array.from({ length: SOMBRAS }, (_, i) => ({
            imagen: escena.add.image(0, this.recorrido.y, 'sombra-caminante').setDepth(this.profundidad + 0.2).setAlpha(0),
            x: 0, activa: false, retraso: i * 0.55, alfa: 0
        }));
        this.intensidad = 1;
        this.impulso = 0;
        this.rafaga = null;                                    // { t } mientras dura una ráfaga
        this.siguiente = 3 + Math.random() * 3;                // la primera ráfaga llega pronto
        this.nivel = BASE;
        this.calma = 1;                                        // 1 con el fenómeno activo; baja a 0 cuando se calma
        this.calmando = false;
    }

    // Cuánto empuja la corriente ahora mismo (0 en reposo, 1 en lo más fuerte de una ráfaga)
    get empuje() { return Math.max(0, (this.nivel - BASE) / (1 - BASE)) * this.calma; }

    // El cierre: el fenómeno se detiene (poco a poco, sin cortes)
    calmar() {
        this.calmando = true;
        this.rafaga = null;
        this.impulso = 0;
        for (const s of this.sombras) s.activa = false;
    }

    get calmadas() { return this.calmando && this.calma < 0.01; }

    // Ráfaga inmediata (0..1)
    sacudir(fuerza = 1) {
        this.impulso = Math.max(this.impulso, fuerza);
    }

    actualizar(dt, tiempo, intensidad = 1) {
        this.intensidad = intensidad;
        this.calma = acercar(this.calma, this.calmando ? 0 : 1, dt, 1.1);
        this.siguiente -= dt;
        if (!this.calmando && !this.rafaga && this.siguiente <= 0) this.empezarRafaga();
        if (this.rafaga) {
            this.rafaga.t += dt;
            if (this.rafaga.t >= DURACION_DE_RAFAGA) {
                this.rafaga = null;
                this.siguiente = MIN_ENTRE_RAFAGAS + Math.random() * (MAX_ENTRE_RAFAGAS - MIN_ENTRE_RAFAGAS);
            }
        }
        this.impulso = Math.max(0, this.impulso - dt * 0.7);
        const envolvente = this.rafaga ? Math.sin((this.rafaga.t / DURACION_DE_RAFAGA) * Math.PI) : 0;
        this.nivel = Math.min(1, BASE + (1 - BASE) * Math.max(envolvente, this.impulso));

        const t = tiempo / 1000;
        for (const c of this.cortinas) {
            const fuerza = this.nivel * c.fuerza * this.intensidad * this.calma;
            const onda = Math.sin(t * c.velocidad + c.fase);
            c.imagen.setAngle(onda * 5.5 * fuerza);
            c.imagen.setScale(1 + Math.sin(t * c.velocidad * 1.7 + c.fase) * 0.07 * fuerza, 1);
        }
        this.moverSombras(dt, t, envolvente);
    }

    empezarRafaga() {
        this.rafaga = { t: 0 };
        this.sombras.forEach((s, i) => {
            s.activa = true;
            s.x = this.recorrido.hasta - Math.random() * 120;
            s.retraso = i * 0.5;
        });
    }

    // Durante la ráfaga las sombras aparecen cerca de la ventana rota y caminan hacia el oeste, hasta desvanecerse
    moverSombras(dt, t, envolvente) {
        for (const s of this.sombras) {
            if (s.activa) {
                s.retraso -= dt;
                if (s.retraso <= 0) s.x -= (95 + 80 * envolvente) * this.intensidad * dt;
                if (s.x < this.recorrido.desde || (!this.rafaga && s.alfa < 0.01)) s.activa = false;
            }
            const meta = s.activa && s.retraso <= 0 ? 0.95 * Math.max(envolvente, this.impulso * 0.7) : 0;
            s.alfa = acercar(s.alfa, meta, dt, 6);
            // El paso: la silueta sube y baja un poco, como alguien que camina
            s.imagen.setPosition(s.x, this.recorrido.y + Math.abs(Math.sin(t * 6 + s.x * 0.05)) * -4).setAlpha(s.alfa);
        }
    }
}
