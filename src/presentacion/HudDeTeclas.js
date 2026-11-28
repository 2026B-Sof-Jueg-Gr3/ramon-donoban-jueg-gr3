// Los íconos del inspector en la esquina de abajo a la derecha, cada uno con su tecla debajo, como el equipo de un juego de consola:
// la libreta (Tab), el historial (H) y la música (M). Son discretos; la libreta late cuando ya se puede resolver el caso (y más
// fuerte si la ayuda lo pide). Un clic hace lo mismo que la tecla. Se dibujan fijos a la pantalla, solo en la computadora: en una
// pantalla táctil están los botones de src/presentacion/ControlesTactiles.js.
//
// Además, la primera vez que se juega (en la primera habitación), junto al inspector aparece unos segundos cómo caminar y apuntar
// la linterna; se desvanece en cuanto se camina un poco y no vuelve a salir.
import { acercar } from '../motor/Movimiento.js';
import { FUENTE } from '../ui/Boton.js';
import { iconoDeLibreta, iconoDeHistorial, iconoDeMusica, iconoDeRaton } from './ArteDibujado.js';

const CLAVE_DEL_AVISO = 'inspector-logica-v2-aviso-de-controles';
const FUENTE_DE_TECLA = 'Arial, Helvetica, sans-serif';
const Y_ICONO = 650, Y_TECLA = 690;
const SEPARACION = 78;
const ALFA_EN_REPOSO = 0.7;

function leerAviso() { try { return localStorage.getItem(CLAVE_DEL_AVISO) === '1'; } catch { return false; } }
function guardarAviso() { try { localStorage.setItem(CLAVE_DEL_AVISO, '1'); } catch { /* sin guardado: saldrá otra vez */ } }

// Una tecla dibujada (como la de un teclado: borde dorado, más grueso abajo). Devuelve [gráfico, texto] centrados en (x, y).
export function dibujarTecla(escena, x, y, letra, { tamano = 11 } = {}) {
    const t = escena.add.text(x, y - 1, letra, { fontFamily: FUENTE_DE_TECLA, fontStyle: 'bold', fontSize: `${tamano}px`, color: '#ffd060', resolution: 2 }).setOrigin(0.5);
    const ancho = Math.max(22, t.width + 12), alto = tamano + 11;
    const g = escena.add.graphics();
    g.fillStyle(0x04060b, 0.85).fillRoundedRect(x - ancho / 2, y - alto / 2, ancho, alto, 3);
    g.fillStyle(0xc89012, 0.85).fillRoundedRect(x - ancho / 2, y + alto / 2 - 3, ancho, 3, { tl: 0, tr: 0, bl: 3, br: 3 });
    g.lineStyle(1, 0xc89012, 0.9).strokeRoundedRect(x - ancho / 2, y - alto / 2, ancho, alto, 3);
    return { objetos: [g, t], ancho };
}

export default class HudDeTeclas {
    // alLibreta / alHistorial / alMusica: lo que hace un clic en cada ícono · nivel: el número de la habitación
    constructor(escena, { profundidad, alLibreta, alHistorial, alMusica, nivel }) {
        this.escena = escena;
        this.visible = 0;
        this.fuerza = 0;
        const { width } = escena.scale;
        const crear = (x, textura, letra, alPulsar, escala = 0.82) => {
            const halo = escena.add.circle(x, Y_ICONO, 30, 0xffd27a, 0).setScrollFactor(0);
            const disco = escena.add.circle(x, Y_ICONO, 25, 0x04060b, 0.55).setStrokeStyle(1, 0xd9b25a, 0.45).setScrollFactor(0);
            const icono = escena.add.image(x, Y_ICONO, textura).setScale(escala).setScrollFactor(0);
            const tecla = dibujarTecla(escena, x, Y_TECLA, letra);
            const grupo = escena.add.container(0, 0, [halo, disco, icono, ...tecla.objetos]).setDepth(profundidad).setScrollFactor(0).setAlpha(0);
            // La zona del clic cubre el ícono y su tecla
            const zona = escena.add.zone(x, (Y_ICONO + Y_TECLA) / 2, 60, 86).setScrollFactor(0).setDepth(profundidad + 1).setInteractive({ useHandCursor: true });
            zona.on('pointerover', () => { slot.encima = true; });
            zona.on('pointerout', () => { slot.encima = false; });
            zona.on('pointerdown', () => { if (this.visible > 0.5) alPulsar(); });
            const slot = { grupo, halo, icono, zona, encima: false, brillo: 0 };
            return slot;
        };
        this.libreta = crear(width - 52 - SEPARACION * 2, iconoDeLibreta(escena), 'Tab', alLibreta);
        this.historial = crear(width - 52 - SEPARACION, iconoDeHistorial(escena), 'H', alHistorial);
        this.musica = crear(width - 52, iconoDeMusica(escena), 'M', alMusica);
        this.texturasDeMusica = { si: iconoDeMusica(escena), no: iconoDeMusica(escena, true) };
        this.slots = [this.libreta, this.historial, this.musica];

        // El aviso de la primera vez: caminar y la linterna, junto al inspector
        this.aviso = null;
        if (nivel === 1 && !leerAviso()) this.aviso = this.crearAviso(profundidad);
    }

    crearAviso(profundidad) {
        const e = this.escena;
        const tecla = dibujarTecla(e, 0, 0, 'W  A  S  D');
        const caminar = e.add.text(tecla.ancho / 2 + 8, 0, 'Caminar', { fontFamily: FUENTE, fontSize: '15px', color: '#f4efe4', resolution: 2 }).setOrigin(0, 0.5);
        const xRaton = tecla.ancho / 2 + 8 + caminar.width + 22;
        const raton = e.add.image(xRaton + 7, 0, iconoDeRaton(e)).setScale(0.8);
        const linterna = e.add.text(xRaton + 20, 0, 'Linterna', { fontFamily: FUENTE, fontSize: '15px', color: '#f4efe4', resolution: 2 }).setOrigin(0, 0.5);
        const izquierda = -tecla.ancho / 2 - 12, derecha = xRaton + 20 + linterna.width + 12;
        const placa = e.add.graphics();
        placa.fillStyle(0x04060b, 0.66).fillRoundedRect(izquierda, -17, derecha - izquierda, 34, 17);
        placa.lineStyle(1, 0xffffff, 0.14).strokeRoundedRect(izquierda, -17, derecha - izquierda, 34, 17);
        const contenedor = e.add.container(0, 0, [placa, ...tecla.objetos, caminar, raton, linterna]).setDepth(profundidad).setAlpha(0);
        return { contenedor, desplazamiento: (izquierda + derecha) / 2, alfa: 0, mostrado: 0, caminado: 0, terminado: false };
    }

    // visible: ¿se muestran los íconos? · libretaLista: ya se puede resolver el caso · fuerte: la ayuda pide que lata más
    // silenciada: la música está apagada · inspector: { x, y } de los pies (para el aviso) · puedeAvisar · caminando
    actualizar(dt, tiempo, { visible, libretaLista, fuerte, silenciada, inspector, puedeAvisar, caminando }) {
        const tactil = !!this.escena.game?.registry?.get('tactil');
        this.visible = acercar(this.visible, visible && !tactil ? 1 : 0, dt, visible ? 6 : 12);
        this.fuerza = acercar(this.fuerza, fuerte ? 1 : 0, dt, 1.2);
        const t = tiempo / 1000;
        const latido = libretaLista ? Math.pow(Math.max(0, Math.sin(t * (2.2 + 2.2 * this.fuerza))), 2) : 0;
        for (const s of this.slots) {
            s.brillo = acercar(s.brillo, s.encima ? 1 : 0, dt, 10);
            const base = s === this.libreta && libretaLista ? 0.95 : ALFA_EN_REPOSO;
            s.grupo.setAlpha(this.visible * (base + (1 - base) * s.brillo));
            s.zona.input.enabled = this.visible > 0.5;
        }
        this.libreta.halo.setAlpha((0.12 + latido * (0.3 + 0.4 * this.fuerza)) * (libretaLista ? 1 : 0)).setScale(1 + latido * 0.25);
        this.libreta.icono.setScale(0.82 * (1 + latido * (0.05 + 0.1 * this.fuerza)));
        this.musica.icono.setTexture(silenciada ? this.texturasDeMusica.no : this.texturasDeMusica.si);
        this.actualizarAviso(dt, { inspector, puedeAvisar: puedeAvisar && !tactil, caminando });
    }

    actualizarAviso(dt, { inspector, puedeAvisar, caminando }) {
        const a = this.aviso;
        if (!a) return;
        if (puedeAvisar && !a.terminado) {
            a.mostrado += dt;
            if (caminando) a.caminado += dt;
            if (a.caminado > 2.5 || a.mostrado > 14) { a.terminado = true; guardarAviso(); }
        }
        a.alfa = acercar(a.alfa, puedeAvisar && !a.terminado ? 1 : 0, dt, a.terminado ? 2.5 : 5);
        if (inspector) a.contenedor.setPosition(inspector.x - a.desplazamiento, inspector.y - 82);
        a.contenedor.setAlpha(a.alfa);
        if (a.terminado && a.alfa < 0.01) { a.contenedor.destroy(); this.aviso = null; }
    }
}
