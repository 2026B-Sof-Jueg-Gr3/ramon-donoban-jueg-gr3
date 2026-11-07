// Tiempos de las representaciones visuales temporales, en milisegundos. Es el único lugar donde se definen.
// Cambiarlos solo cambia cuánto tiempo se ve el dibujo: no afecta cuándo ni cómo se descubre una evidencia.
//   entrada:     animación de aparición
//   permanencia: tiempo visible después de aparecer
//   salida:      animación de desaparición
export const TIEMPOS = Object.freeze({
    marca: Object.freeze({ entrada: 450, permanencia: 4500, salida: 600 })
});
