// Clase base abstracta de todos los elementos del escenario (equivale a Bloque.java).
export default class Bloque {
    constructor(textura, esTangible) {
        if (new.target === Bloque) {
            throw new TypeError('Bloque es abstracta y no puede instanciarse directamente');
        }
        this.textura = textura;       // clave de la imagen cargada en Phaser
        this.esTangible = esTangible; // true = el personaje puede pisarlo
    }

    getTextura() {
        return this.textura;
    }
}
