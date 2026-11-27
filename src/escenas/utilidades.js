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
    const img = scene.add.image(0, 0, clave).setData('rev', { tipo: 'ignorar' });      // un fondo: cubre todo a propósito
    alRedimensionar(scene, (w, h) => {
        img.setPosition(w / 2, h / 2).setScale(Math.max(w / img.width, h / img.height));
    });
    return img;
}

// El fondo de las pantallas de fuera de la habitación: la mansión bajo la tormenta, oscurecida y con una viñeta, para que el texto y los
// botones se lean como en la caja de diálogo del juego
const CLAVE_DE_VINETA_DE_MENU = 'vinetaDeMenu';
export function fondoDeTormenta(scene, oscuridad = 0.5) {
    const img = fondoCubriendo(scene, 'fondoMenu');
    const { width: w, height: h } = scene.scale;
    const velo = scene.add.rectangle(0, 0, w, h, 0x03050a, oscuridad).setOrigin(0).setData('rev', { tipo: 'ignorar' });
    if (!scene.textures.exists(CLAVE_DE_VINETA_DE_MENU)) {
        const t = scene.textures.createCanvas(CLAVE_DE_VINETA_DE_MENU, w, h), ctx = t.getContext();
        const g = ctx.createRadialGradient(w / 2, h * 0.45, h * 0.25, w / 2, h * 0.5, w * 0.7);
        g.addColorStop(0, 'rgba(0,0,0,0)');
        g.addColorStop(1, 'rgba(0,0,0,0.85)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
        t.refresh();
    }
    const vineta = scene.add.image(0, 0, CLAVE_DE_VINETA_DE_MENU).setOrigin(0).setData('rev', { tipo: 'ignorar' });
    return { img, velo, vineta };
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
