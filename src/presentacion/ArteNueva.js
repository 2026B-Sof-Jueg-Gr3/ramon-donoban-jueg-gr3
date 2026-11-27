// El arte provisional de las habitaciones 3 a 6 (fase 6), también generado por código y sin imágenes externas: los objetos pequeños
// se dibujan con un emoji sobre un fondo (hasta que llegue el arte final de la fase 7), las puertas y la trampilla con formas, y las
// marcas que solo se ven con la luz (el camino limpio, las pisadas mojadas…) con formas suaves. Las claves y los tamaños son los de siempre.

function lienzo(escena, clave, ancho, alto, dibujar) {
    if (escena.textures.exists(clave)) return;
    const g = escena.make.graphics({ x: 0, y: 0, add: false });
    dibujar(g);
    g.generateTexture(clave, ancho, alto);
    g.destroy();
}

// Un emoji dibujado en el centro de una textura que ya existe (la de un mueble) o nueva
export function ponerEmoji(escena, clave, simbolo, cx, cy, tam) {
    const textura = escena.textures.get(clave);
    const imagen = textura?.getSourceImage?.();
    if (!imagen || typeof imagen.getContext !== 'function') return;
    const ctx = imagen.getContext('2d');
    ctx.font = `${tam}px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(simbolo, cx, cy);
    textura.refresh?.();
}

// Emoji de los muebles: se dibuja sobre su cara de frente
export const EMOJI_DE_MUEBLE = { barril: '🛢️', sofa: '🛋️', reloj: '🕰️', archivos: '🗂️', archivador: '🗄️', caballito: '🎠', munecas: '🎎', oso: '🧸', tren: '🚂', juguetero: '🧰', velas: '🕯️', escritorio: '🖋️' };

export const ESTILOS_NUEVOS = {
    barril: { tapa: 0x6b4f2d, cara: 0x5a4125, borde: 0x2e2012 },
    sofa: { tapa: 0x7a3b3b, cara: 0x6a3232, borde: 0x331616 },
    cortina: { tapa: 0x6a2f58, cara: 0x7e3b69, borde: 0x34162c },
    reloj: { tapa: 0x4a3524, cara: 0x3a2a1c, borde: 0x1c130c },
    archivos: { tapa: 0x8a8a82, cara: 0x727068, borde: 0x383630 },
    archivador: { tapa: 0x7c8088, cara: 0x62666e, borde: 0x30333a },
    escritorio: { tapa: 0x8a6a46, cara: 0x6e5236, borde: 0x372818 },
    caballito: { tapa: 0xb28a50, cara: 0x95703c, borde: 0x4a3418 },
    munecas: { tapa: 0x9a7aa0, cara: 0x7e5e86, borde: 0x3a2a40 },
    oso: { tapa: 0x8a6a4a, cara: 0x735638, borde: 0x3a2a1a },
    tren: { tapa: 0x56667a, cara: 0x44525f, borde: 0x20262e },
    juguetero: { tapa: 0xb08a58, cara: 0x8c6c43, borde: 0x4a3720 },
    velas: { tapa: 0x6e5a3c, cara: 0x594630, borde: 0x30241a }
};

// Objetos pequeños de la habitación: [emoji, ancho, alto, tamaño del emoji]
const OBJETOS = {
    carta: ['✉️', 44, 34, 28], llave: ['🗝️', 40, 34, 26], llavero: ['🔑', 56, 62, 36], herramientas: ['🧰', 64, 42, 32],
    bobina: ['🧵', 44, 44, 30], diario: ['📖', 52, 38, 30], abrigo: ['🧥', 48, 44, 32], planos: ['🗺️', 50, 40, 30], cartas: ['✉️', 52, 40, 30],
    pluma: ['🖋️', 48, 34, 28], cuadro: ['🖼️', 64, 64, 44], 'cuentas': ['📒', 48, 40, 30]
};

function puerta(g, w, h, madera, marco, extra) {
    g.fillStyle(marco, 1).fillRect(0, 0, w, h);
    g.fillStyle(madera, 1).fillRect(6, 6, w - 12, h - 6);
    g.lineStyle(2, 0x000000, 0.35);
    g.strokeRect(6, 6, w - 12, h - 6).lineBetween(w / 2, 6, w / 2, h);
    g.fillStyle(0xd1a640, 1).fillCircle(w / 2 - 9, h * 0.55, 3).fillCircle(w / 2 + 9, h * 0.55, 3);
    extra?.(g);
}

export function generarObjetoNuevo(escena, dibujo) {
    const clave = `item-${dibujo}`;
    if (escena.textures.exists(clave)) return true;
    if (OBJETOS[dibujo]) {
        const [simbolo, w, h, tam] = OBJETOS[dibujo];
        lienzo(escena, clave, w, h, g => { g.fillStyle(0x000000, 0.0).fillRect(0, 0, w, h); });
        ponerEmoji(escena, clave, simbolo, w / 2, h / 2 + 2, tam);
        return true;
    }
    switch (dibujo) {
        case 'tapiada':          // una puerta tapiada con tablones nuevos
            lienzo(escena, clave, 96, 108, g => {
                puerta(g, 96, 108, 0x5a4630, 0x3a2a1c);
                g.fillStyle(0xc89a5a, 1);
                for (const y of [18, 46, 74]) g.fillRect(0, y, 96, 14).fillStyle(0xe2b878, 1).fillRect(0, y, 96, 3).fillStyle(0xc89a5a, 1);
                g.fillStyle(0xe8e0c8, 1);
                for (const y of [24, 52, 80]) for (const x of [10, 48, 84]) g.fillCircle(x, y, 2);        // los clavos que todavía brillan
            });
            return true;
        case 'puerta-candado':   // la puerta vieja con el candado nuevo
            lienzo(escena, clave, 96, 108, g => {
                puerta(g, 96, 108, 0x4a3a2a, 0x2e2418, gg => {
                    gg.fillStyle(0x9aa4b4, 1).fillRoundedRect(70, 52, 18, 16, 3);
                    gg.lineStyle(3, 0xc6d0e0, 1).strokeCircle(79, 52, 6);
                });
            });
            return true;
        case 'puerta-jardin':
            lienzo(escena, clave, 64, 128, g => { puerta(g, 64, 128, 0x3f5f46, 0x24382a); g.fillStyle(0x9ec8ff, 0.25).fillRect(10, 14, 44, 40); });
            return true;
        case 'puerta-atrancada':   // la puerta por la que se entra, atrancada con una tabla
            lienzo(escena, clave, 56, 128, g => { puerta(g, 56, 128, 0x4a3a2a, 0x2e2418); g.fillStyle(0xb48a50, 1).fillRect(0, 56, 56, 12).fillStyle(0xd6aa6a, 1).fillRect(0, 56, 56, 3); });
            return true;
        case 'puerta-despacho':
            lienzo(escena, clave, 96, 108, g => puerta(g, 96, 108, 0x5b3d2a, 0x2e1f15));
            return true;
        case 'trampilla':        // la trampilla del techo, vista desde abajo
            lienzo(escena, clave, 96, 108, g => {
                g.fillStyle(0x2a1f16, 1).fillRect(8, 30, 80, 70);
                g.fillStyle(0x5a4630, 1).fillRect(14, 36, 68, 58);
                g.lineStyle(2, 0x2a1f16, 1).strokeRect(14, 36, 68, 58).lineBetween(48, 36, 48, 94);
                g.lineStyle(3, 0x9a9a94, 1).strokeCircle(48, 78, 6);
            });
            return true;
        case 'hilo':             // el hilo casi invisible: solo se ve cuando la linterna lo toca
            lienzo(escena, clave, 80, 18, g => {
                g.lineStyle(2, 0xf4f0d8, 0.95).lineBetween(2, 9, 78, 9);
                g.lineStyle(1, 0xffffff, 0.6).lineBetween(2, 8, 78, 8);
                g.fillStyle(0xf4f0d8, 1).fillCircle(4, 9, 3);
            });
            return true;
        default:
            return false;
    }
}

export function generarMarcaNueva(escena, clave, ancho, alto, dibujo) {
    const ruido = (g, color, alfa, n, semilla) => {
        g.fillStyle(color, alfa);
        for (let i = 0; i < n; i++) g.fillCircle(((i * 7919 + semilla * 131) % ancho), ((i * 104729 + semilla * 17) % alto), 1 + (i % 3) * 0.6);
    };
    switch (dibujo) {
        case 'polvo-intacto':    // el polvo que nadie ha tocado: una capa pareja y gris
            lienzo(escena, clave, ancho, alto, g => { g.fillStyle(0xb8b4a8, 0.5).fillRoundedRect(0, 0, ancho, alto, 14); ruido(g, 0xd8d4c6, 0.55, 90, 3); });
            return true;
        case 'camino-limpio':    // el camino que alguien recorre a diario: limpio en el medio, con polvo apartado a los lados
            lienzo(escena, clave, ancho, alto, g => {
                g.fillStyle(0xb8b4a8, 0.45).fillRect(0, 0, ancho, alto);
                g.fillStyle(0x3c3a36, 0.35).fillRoundedRect(0, alto * 0.18, ancho, alto * 0.64, 10);
                g.lineStyle(2, 0xd8d4c6, 0.6).lineBetween(0, alto * 0.16, ancho, alto * 0.16).lineBetween(0, alto * 0.84, ancho, alto * 0.84);
            });
            return true;
        case 'tablas':           // las tablas que crujen
            lienzo(escena, clave, ancho, alto, g => {
                g.fillStyle(0x6a5030, 0.8).fillRect(0, 0, ancho, alto);
                g.lineStyle(2, 0x2e2012, 0.9);
                for (let y = 0; y <= alto; y += 18) g.lineBetween(0, y, ancho, y);
                for (let y = 0, k = 0; y < alto; y += 18, k++) for (let x = (k % 2) * 40; x < ancho; x += 80) g.lineBetween(x, y, x, y + 18);
            });
            return true;
        case 'pisadas':          // pisadas mojadas
            lienzo(escena, clave, ancho, alto, g => {
                for (let x = 18, k = 0; x < ancho - 10; x += 52, k++) {
                    const y = alto * (k % 2 ? 0.7 : 0.3);
                    g.fillStyle(0x7ab0d8, 0.55).fillEllipse(x, y, 16, 26).fillEllipse(x + 6, y - 18, 10, 12);
                    g.fillStyle(0xffffff, 0.3).fillEllipse(x - 2, y - 4, 4, 9);
                }
            });
            return true;
        case 'marcas-frescas':   // las marcas frescas de los archivos movidos
            lienzo(escena, clave, ancho, alto, g => {
                g.lineStyle(6, 0xb8b4a8, 0.18);
                g.lineBetween(10, alto * 0.3, ancho - 20, alto * 0.38).lineBetween(14, alto * 0.7, ancho - 30, alto * 0.8);
                g.lineStyle(3, 0xe8e4d6, 0.85);
                g.lineBetween(12, alto * 0.3, ancho - 24, alto * 0.38).lineBetween(16, alto * 0.7, ancho - 34, alto * 0.8);
                ruido(g, 0xe8e4d6, 0.6, 24, 5);
            });
            return true;
        case 'hueco':            // las tablas del suelo hueco
            lienzo(escena, clave, ancho, alto, g => { g.fillStyle(0x7a5a38, 0.55).fillRect(0, 0, ancho, alto); g.lineStyle(2, 0x2e2012, 0.8); for (let x = 0; x <= ancho; x += 22) g.lineBetween(x, 0, x, alto); });
            return true;
        default:
            return false;
    }
}
