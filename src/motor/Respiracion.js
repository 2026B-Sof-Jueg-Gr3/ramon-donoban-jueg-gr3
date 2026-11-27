// El resplandor de las ayudas sin texto: tenue y "respirando". Aparece y se apaga despacio, con un alfa máximo bajo, para que se vea si
// se presta atención sin parecer un foco de interfaz. Sin Phaser: cada habitación multiplica este alfa por lo que dure su ayuda.
export const RESPIRACION = Object.freeze({
    cicloS: 2.5,
    alfaMaximo: 0.25,
    holgura: 1.2          // el resplandor mide apenas más que lo que señala
});

// t en segundos → alfa entre 0 y alfaMaximo (0 al empezar el ciclo, el máximo a la mitad)
export function respirar(t, { cicloS = RESPIRACION.cicloS, alfaMaximo = RESPIRACION.alfaMaximo } = {}) {
    return alfaMaximo * (0.5 - 0.5 * Math.cos((2 * Math.PI * t) / cicloS));
}
