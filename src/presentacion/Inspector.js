// El inspector en el mapa: movimiento libre en 8 direcciones con física Arcade, apuntado de la linterna y su dibujo.
// Las reglas (vector de entrada, suavizado, modo de apuntado) están en src/motor y se prueban sin Phaser.
import { vectorDeEntrada, velocidadSuavizada } from '../motor/Movimiento.js';
import ControlDeApuntado from '../motor/Apuntado.js';

export const VELOCIDAD = 230;                       // píxeles por segundo, igual en las 8 direcciones
export const CUERPO = { ancho: 26, alto: 18 };      // la base del inspector: lo que choca con paredes y muebles
const ANCHO_SPRITE = 36, ALTO_SPRITE = 58;
const SEPARACION_DE_LUZ = 8;                        // la linterna sale un poco por delante del cuerpo
const EMPUJE_CONTRA_PARED = 4;                      // px/s que se siguen aplicando contra lo que bloquea

export default class Inspector {
    constructor(escena, x, y) {
        this.escena = escena;
        this.sombra = escena.add.image(x, y, 'sombra');
        this.sprite = escena.physics.add.sprite(x, y, 'inspector').setOrigin(0.5, 1);
        this.sprite.body.setSize(CUERPO.ancho, CUERPO.alto).setOffset((ANCHO_SPRITE - CUERPO.ancho) / 2, ALTO_SPRITE - CUERPO.alto);
        this.sprite.setCollideWorldBounds(true);
        this.flecha = escena.add.image(x, y, 'flecha');

        const kb = escena.input.keyboard;
        this.teclas = kb.addKeys({ w: 'W', a: 'A', s: 'S', d: 'D', arriba: 'UP', abajo: 'DOWN', izquierda: 'LEFT', derecha: 'RIGHT' });
        this.apuntado = new ControlDeApuntado();
        const p = escena.input.activePointer;
        this.punteroPrevio = { x: p.x, y: p.y };
        this.fase = 0;
        this.entrada = { x: 0, y: 0 };
        this.dibujar();
    }

    // Posición de los pies (el punto del suelo donde está) y centro de la base
    get pies() { return { x: this.sprite.body.center.x, y: this.sprite.body.bottom }; }
    get centro() { return { x: this.sprite.body.center.x, y: this.sprite.body.center.y }; }
    get direccionDeLuz() { return this.apuntado.angulo; }
    get modoDeApuntado() { return this.apuntado.modo; }

    get origenDeLuz() {
        const c = this.centro, a = this.apuntado.angulo;
        return { x: c.x + Math.cos(a) * SEPARACION_DE_LUZ, y: c.y + Math.sin(a) * SEPARACION_DE_LUZ };
    }

    actualizar(dt, camara) {
        const t = this.teclas;
        this.entrada = vectorDeEntrada({
            izquierda: t.a.isDown || t.izquierda.isDown, derecha: t.d.isDown || t.derecha.isDown,
            arriba: t.w.isDown || t.arriba.isDown, abajo: t.s.isDown || t.abajo.isDown
        });
        // Se parte de la velocidad real del cuerpo: si choca con una pared, la física ya la anuló en ese eje
        const cuerpo = this.sprite.body;
        const v = velocidadSuavizada({ x: cuerpo.velocity.x, y: cuerpo.velocity.y },
            { x: this.entrada.x * VELOCIDAD, y: this.entrada.y * VELOCIDAD }, dt);
        // Contra lo que bloquea se sigue empujando muy poco (basta para que la física detecte el contacto), así no
        // vibra al apretarse contra una pared o una esquina
        const b = cuerpo.blocked;
        if ((v.x > 0 && b.right) || (v.x < 0 && b.left)) v.x = Math.sign(v.x) * Math.min(Math.abs(v.x), EMPUJE_CONTRA_PARED);
        if ((v.y > 0 && b.down) || (v.y < 0 && b.up)) v.y = Math.sign(v.y) * Math.min(Math.abs(v.y), EMPUJE_CONTRA_PARED);
        this.sprite.setVelocity(v.x, v.y);
        this.rapidez = Math.hypot(v.x, v.y);

        const p = this.escena.input.activePointer;
        // Un toque en la pantalla táctil no apunta la linterna: en el celular apunta siempre hacia donde camina
        const ratonMovido = !p.wasTouch && Math.hypot(p.x - this.punteroPrevio.x, p.y - this.punteroPrevio.y) > 1.5;
        this.punteroPrevio = { x: p.x, y: p.y };
        this.apuntado.actualizar({
            dt, origen: this.centro, ratonMovido, movimiento: this.entrada,
            raton: { x: p.x + camara.scrollX, y: p.y + camara.scrollY }       // posición del cursor en el mundo
        });
        this.fase += this.rapidez * dt * 0.06;
        this.dibujar();
    }

    // Orden por profundidad: se dibuja según dónde pisa (la base del cuerpo)
    dibujar() {
        const cuerpo = this.sprite.body, c = cuerpo.center, a = this.apuntado.angulo;
        const base = cuerpo.bottom;
        this.sprite.setDepth(base);
        this.sombra.setPosition(c.x, base - 2).setDepth(base - 0.1);
        // Indicador de hacia dónde mira, sobre el suelo y achatado por la perspectiva
        this.flecha.setPosition(c.x + Math.cos(a) * 26, c.y + Math.sin(a) * 19)
            .setRotation(Math.atan2(Math.sin(a) * 0.75, Math.cos(a))).setDepth(base + 0.2);
        const bote = (this.rapidez || 0) > 5 ? Math.sin(this.fase * 2) * 0.03 : 0;     // un pequeño rebote al caminar
        this.sprite.setScale(1 - bote * 0.5, 1 + bote);
    }
}
