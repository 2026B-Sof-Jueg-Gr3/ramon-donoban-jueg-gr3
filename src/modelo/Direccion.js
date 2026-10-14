// Reemplaza a los KeyEvent.VK_UP/DOWN/LEFT/RIGHT del original: el modelo no depende del teclado.
const Direccion = Object.freeze({
    ARRIBA: Object.freeze({ df: -1, dc: 0 }),
    ABAJO: Object.freeze({ df: 1, dc: 0 }),
    IZQUIERDA: Object.freeze({ df: 0, dc: -1 }),
    DERECHA: Object.freeze({ df: 0, dc: 1 })
});

export default Direccion;
