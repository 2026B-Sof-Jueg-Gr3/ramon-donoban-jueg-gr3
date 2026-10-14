export const ANCHO_BASE = 500;
export const ALTO_BASE = 600;
const ESCALA_MAXIMA = 1.5;

// Ejecuta fn(ancho, alto) ahora y cada vez que cambia el tamaño de la ventana
export function alRedimensionar(scene, fn, dueno = null) {
    const handler = (gameSize) => fn(gameSize.width, gameSize.height);
    const quitar = () => scene.scale.off('resize', handler);
    scene.scale.on('resize', handler);
    scene.events.once('shutdown', quitar);
    if (dueno) dueno.once('destroy', quitar);
    fn(scene.scale.width, scene.scale.height);
}

export function fondoCubriendo(scene, clave) {
    const img = scene.add.image(0, 0, clave);
    alRedimensionar(scene, (w, h) => {
        img.setPosition(w / 2, h / 2).setScale(Math.max(w / img.width, h / img.height));
    });
    return img;
}

// Contenedor de ANCHO_BASE x ALTO_BASE lógicos, centrado y escalado para caber en pantalla
export function crearLienzoCentrado(scene, ancho = ANCHO_BASE, alto = ALTO_BASE) {
    const lienzo = scene.add.container(0, 0);
    alRedimensionar(scene, (w, h) => {
        const escala = Math.min(w / ancho, h / alto, ESCALA_MAXIMA);
        lienzo.setScale(escala).setPosition((w - ancho * escala) / 2, (h - alto * escala) / 2);
    }, lienzo);
    return lienzo;
}

export function crearVelo(scene, alpha = 0.7) {
    const velo = scene.add.rectangle(0, 0, 10, 10, 0x000000, alpha).setOrigin(0).setInteractive();
    alRedimensionar(scene, (w, h) => velo.setSize(w, h).setInteractive(), velo);
    return velo;
}
