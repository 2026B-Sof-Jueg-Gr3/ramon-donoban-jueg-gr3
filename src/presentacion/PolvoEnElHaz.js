// Polvo en el haz de la linterna: partículas que solo se ven dentro del cono iluminado (y no tapado por paredes o
// muebles) y que derivan hacia la ventana rota. Seguirlo lleva al origen de la corriente.
// Con la ayuda activa también hace dos cosas, siempre sin texto y solo dentro de la luz: se asienta sobre una zona
// (`atraccion`) y deja caer un hilo fino de polvo por el frente de la pila (`actualizarHilo`).
// La física de la corriente está en src/motor/Corriente.js; la geometría del cono, en src/motor/Visibilidad.js.
import { velocidadDeCorriente } from '../motor/Corriente.js';
import { puntoEnPoligono, intensidadDeCono } from '../motor/Visibilidad.js';
import { diferenciaDeAngulos } from '../motor/Geometria.js';
import { acercar } from '../motor/Movimiento.js';

const ABSORCION = 34;      // cerca de la ventana el polvo se va por ella
const HILOS = 14;          // partículas del hilo de polvo de la pila

export default class PolvoEnElHaz {
    // profundidadDelHilo: el hilo cae por el frente de un mueble, así que se dibuja por encima de él
    constructor(escena, { origen, profundidad, cantidad = 90, profundidadDelHilo = profundidad }) {
        this.origen = origen;
        this.hilo = Array.from({ length: HILOS }, (_, i) => ({
            imagen: escena.add.image(0, 0, 'polvo').setBlendMode(Phaser.BlendModes.ADD).setDepth(profundidadDelHilo).setAlpha(0),
            x: 0, y: 0, avance: i / HILOS, velocidad: 0.8 + Math.random() * 0.5, alfa: 0, desvio: (Math.random() * 2 - 1) * 3
        }));
        this.particulas = Array.from({ length: cantidad }, () => ({
            imagen: escena.add.image(0, 0, 'polvo').setBlendMode(Phaser.BlendModes.ADD).setDepth(profundidad).setAlpha(0),
            x: 0, y: 0, vida: 0, edad: 0, alfa: 0, fase: Math.random() * Math.PI * 2, tamano: 0.7 + Math.random() * 0.9
        }));
    }

    // luz y poligono: los de la linterna. fuerza: 1 normal, más cuando la ayuda refuerza la corriente.
    // atraccion: { x, y, radio, nivel } (nivel 0..1) mientras la ayuda hace que el polvo se asiente sobre esa zona.
    actualizar(dt, tiempo, luz, poligono, fuerza = 1, atraccion = null) {
        const t = tiempo / 1000;
        for (const p of this.particulas) {
            if (p.vida <= 0 && !this.nacer(p, luz, poligono)) {
                p.imagen.setAlpha(0);
                continue;
            }
            const v = this.velocidad(p, fuerza, atraccion);
            // Un poco de turbulencia para que no sean líneas rectas
            p.x += (v.x + Math.sin(t * 0.9 + p.fase) * 7) * dt;
            p.y += (v.y + Math.cos(t * 1.1 + p.fase) * 5) * dt;
            p.edad += dt;
            p.vida -= dt;
            if (Math.hypot(this.origen.x - p.x, this.origen.y - p.y) < ABSORCION) p.vida = 0;

            // Solo existe para el jugador dentro del cono y a la vista de la linterna
            const dx = p.x - luz.origen.x, dy = p.y - luz.origen.y;
            const distancia = Math.hypot(dx, dy);
            const intensidad = distancia <= luz.alcance ? intensidadDeCono(distancia, diferenciaDeAngulos(Math.atan2(dy, dx), luz.direccion), luz) : 0;
            const iluminada = intensidad > 0.02 && puntoEnPoligono(p, poligono);
            const aparicion = Math.min(1, p.edad / 0.6, Math.max(0, p.vida) / 0.8);
            const meta = iluminada ? Math.min(1, intensidad * 1.7) * aparicion * 0.9 : 0;
            p.alfa = acercar(p.alfa, meta, dt, 12);
            p.imagen.setPosition(p.x, p.y).setAlpha(p.alfa).setScale(p.tamano);
        }
    }

    // La corriente de la ventana; con la atracción activa, se mezcla con la que lleva el polvo hacia la zona y
    // dentro de la zona el polvo casi se detiene (se asienta)
    velocidad(p, fuerza, atraccion) {
        const ventana = velocidadDeCorriente(p, this.origen, { fuerza });
        if (!atraccion || atraccion.nivel <= 0) return ventana;
        const zona = velocidadDeCorriente(p, atraccion, { fuerza: 1.5 });
        const dentro = Math.hypot(atraccion.x - p.x, atraccion.y - p.y) < atraccion.radio;
        const k = atraccion.nivel, freno = dentro ? 0.3 : 1;
        return { x: (ventana.x * (1 - k) + zona.x * k) * (1 - k + k * freno), y: (ventana.y * (1 - k) + zona.y * k) * (1 - k + k * freno) };
    }

    // El hilo fino de polvo por el frente de la pila: cae despacio desde la solapa. Como todo el polvo, solo se
    // ve dentro de la luz. hilo: { x, y, alto, nivel (0..1), rafaga (0..1: cuánto empuja la corriente ahora), sonda }.
    // `sonda`: punto de suelo delante del mueble; el frente de un mueble no está "dentro" del polígono de luz.
    actualizarHilo(dt, luz, poligono, hilo) {
        const frenteIluminado = !hilo.sonda || puntoEnPoligono(hilo.sonda, poligono);
        for (const p of this.hilo) {
            p.avance += dt * 0.34 * p.velocidad;
            if (p.avance >= 1) { p.avance -= 1; p.desvio = (Math.random() * 2 - 1) * 3; p.velocidad = 0.8 + Math.random() * 0.5; }
            p.x = hilo.x + p.desvio + Math.sin(p.avance * 9 + p.desvio) * 1.2;
            p.y = hilo.y + p.avance * hilo.alto;
            const dx = p.x - luz.origen.x, dy = p.y - luz.origen.y;
            const distancia = Math.hypot(dx, dy);
            const intensidad = distancia <= luz.alcance ? intensidadDeCono(distancia, diferenciaDeAngulos(Math.atan2(dy, dx), luz.direccion), luz) : 0;
            const iluminada = intensidad > 0.02 && frenteIluminado;
            const caida = Math.min(1, p.avance / 0.15, (1 - p.avance) / 0.3);
            const meta = iluminada ? Math.min(1, intensidad * 1.7) * caida * hilo.nivel * (0.55 + 0.45 * hilo.rafaga) * 0.75 : 0;
            p.alfa = acercar(p.alfa, meta, dt, 10);
            p.imagen.setPosition(p.x, p.y).setAlpha(p.alfa).setScale(0.6);
        }
    }

    // Una partícula nueva aparece en un punto al azar del cono que la linterna realmente alcanza
    nacer(p, luz, poligono) {
        for (let intento = 0; intento < 4; intento++) {
            const angulo = luz.direccion + (Math.random() * 2 - 1) * luz.semiangulo * 0.95;
            const distancia = 40 + Math.pow(Math.random(), 1.4) * (luz.alcance - 70);
            const x = luz.origen.x + Math.cos(angulo) * distancia, y = luz.origen.y + Math.sin(angulo) * distancia;
            if (!puntoEnPoligono({ x, y }, poligono)) continue;
            Object.assign(p, { x, y, edad: 0, alfa: 0, vida: 3 + Math.random() * 4 });
            return true;
        }
        return false;
    }

    // Para comprobar: cuántas están vivas y cuántas se están viendo (alfa visible)
    estadisticas() {
        const vivas = this.particulas.filter(p => p.vida > 0);
        return { vivas: vivas.length, visibles: vivas.filter(p => p.alfa > 0.02).length };
    }
}
