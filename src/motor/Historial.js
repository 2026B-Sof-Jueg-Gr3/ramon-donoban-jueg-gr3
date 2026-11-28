// El historial de la habitación, como el de una novela visual: todos los textos que salieron (lo que dijo el inspector, las notas
// de la libreta y las tarjetas de rastro), en orden, para releerlos. Solo guarda: no cambia nada del juego. Sin Phaser.
export const ETIQUETA = Object.freeze({ importante: 'SILAS VANE', secundaria: 'LIBRETA', ambiental: 'RASTRO' });
export const MAXIMO = 300;            // de sobra para una habitación; si se pasara, se olvidan los más viejos

// La entrada de un mensaje del Narrador (src/ui/Narrador.js): con qué nombre se muestra y su texto, sin cortes de página
export function entradaDe(mensaje) {
    const etiqueta = (mensaje.clase === 'importante' ? null : mensaje.titulo) || ETIQUETA[mensaje.clase] || ETIQUETA.secundaria;
    const texto = String(mensaje.texto ?? '').replaceAll('\f', ' ').replace(/\s+/g, ' ').trim();
    return { etiqueta, texto, clase: mensaje.clase ?? 'secundaria' };
}

export default class Historial {
    constructor(maximo = MAXIMO) {
        this.maximo = maximo;
        this.lista = [];
    }

    agregar(mensaje) {
        const entrada = entradaDe(mensaje);
        if (!entrada.texto) return;
        this.lista.push(entrada);
        if (this.lista.length > this.maximo) this.lista.splice(0, this.lista.length - this.maximo);
    }

    get entradas() { return [...this.lista]; }
    get vacio() { return this.lista.length === 0; }
}
