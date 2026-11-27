// Arte provisional generado por código: todas las texturas se crean con graphics.generateTexture, sin imágenes externas.
// Cuando exista el arte final, basta con cargar imágenes con estas mismas claves y tamaños.
import { ESTILOS_NUEVOS, EMOJI_DE_MUEBLE, generarObjetoNuevo, generarMarcaNueva, ponerEmoji } from './ArteNueva.js';
const TAM = 64;

// La caja de arriba de la pila (medidas dentro de la imagen de la pila): ahí está la solapa que aletea con la corriente
export const CAJA_DE_ARRIBA = Object.freeze({ x: 34, ancho: 58, alto: 34 });

function textura(escena, clave, ancho, alto, dibujar) {
    if (escena.textures.exists(clave)) return;
    const g = escena.make.graphics({ x: 0, y: 0, add: false });
    dibujar(g);
    g.generateTexture(clave, ancho, alto);
    g.destroy();
}

// ── Baldosas: una tira de 5 (suelo A, suelo B, muro con tapa, solo tapa, solo ladrillo), igual que provisional.png de Tiled ──

function suelo(g, x0, base, linea) {
    g.fillStyle(base, 1).fillRect(x0, 0, TAM, TAM);
    g.fillStyle(linea, 1);
    for (let k = 0; k < 4; k++) {
        g.fillRect(x0, k * 16 + 15, TAM, 1);                  // junta entre tablones
        g.fillRect(x0 + ((20 + 24 * k) % TAM), k * 16, 1, 15); // empalme del tablón
    }
}

function paredConCara(g, x0) {
    g.fillStyle(0x685a52, 1).fillRect(x0, 0, TAM, TAM);       // cara
    g.fillStyle(0xb0a49a, 1).fillRect(x0, 0, TAM, 14);        // tapa (la parte de arriba del muro)
    g.fillStyle(0x80746a, 1).fillRect(x0, 14, TAM, 2);
    g.fillStyle(0x4c403a, 1);
    [27, 38, 49].forEach((y, i) => {
        g.fillRect(x0, y, TAM, 1);
        for (let xj = (i % 2) * 16; xj < TAM; xj += 32) g.fillRect(x0 + xj, y - 10, 1, 10);
    });
}

function paredSoloTapa(g, x0) {
    g.fillStyle(0xa0958c, 1).fillRect(x0, 0, TAM, TAM);
    g.fillStyle(0xbeb4ab, 1).fillRect(x0, 0, TAM, 2).fillRect(x0, 0, 2, TAM);
    g.fillStyle(0x786c62, 1).fillRect(x0, TAM - 2, TAM, 2).fillRect(x0 + TAM - 2, 0, 2, TAM);
}

// La parte baja de un muro alto: solo ladrillo, con la sombra al pie
function paredLadrillo(g, x0) {
    g.fillStyle(0x685a52, 1).fillRect(x0, 0, TAM, TAM);
    g.fillStyle(0x4c403a, 1);
    [11, 22, 33, 44, 55].forEach((y, i) => {
        g.fillRect(x0, y, TAM, 1);
        for (let xj = (i % 2) * 16; xj < TAM; xj += 32) g.fillRect(x0 + xj, y - 10, 1, 10);
    });
    g.fillStyle(0x463a34, 1).fillRect(x0, 60, TAM, 4);
}

function generarBaldosas(escena) {
    textura(escena, 'tilesProvisional', TAM * 5, TAM, g => {
        suelo(g, 0, 0x7e624a, 0x5c4634);
        suelo(g, TAM, 0x765b44, 0x5c4634);
        paredConCara(g, TAM * 2);
        paredSoloTapa(g, TAM * 3);
        paredLadrillo(g, TAM * 4);
    });
    const tex = escena.textures.get('tilesProvisional');
    for (let i = 0; i < 5; i++) if (!tex.has(i)) tex.add(i, 0, i * TAM, 0, TAM, TAM);
}

// ── Inspector, indicador de dirección y sombra ──────────────────────────────

function generarInspector(escena) {
    textura(escena, 'inspector', 36, 58, g => {
        g.fillStyle(0x34505f, 1).fillRoundedRect(6, 22, 24, 33, 7);        // abrigo
        g.fillStyle(0x27404d, 1).fillRect(6, 40, 24, 3);                   // cinturón
        g.fillStyle(0x1d2f39, 1).fillRect(17, 24, 2, 30);                  // botonadura
        g.fillStyle(0x9b3b3b, 1).fillRect(11, 22, 14, 4);                  // bufanda
        g.fillStyle(0x15181d, 1).fillRoundedRect(8, 53, 9, 5, 2).fillRoundedRect(19, 53, 9, 5, 2);   // zapatos
        g.fillStyle(0xe0b48a, 1).fillCircle(18, 15, 8);                    // cabeza
        g.fillStyle(0x2a2f38, 1).fillRoundedRect(8, 9, 20, 4, 2).fillRoundedRect(11, 2, 14, 9, 3);   // sombrero
        g.fillStyle(0x8c6a2a, 1).fillRect(11, 8, 14, 2);                   // cinta del sombrero
    });
    textura(escena, 'flecha', 16, 16, g => {
        g.fillStyle(0xffd27a, 1).fillTriangle(2, 2, 14, 8, 2, 14);
        g.lineStyle(1, 0x7a5a10, 1).strokeTriangle(2, 2, 14, 8, 2, 14);
    });
    textura(escena, 'sombra', 34, 14, g => g.fillStyle(0x000000, 0.5).fillEllipse(17, 7, 32, 12));
}

// ── Muebles: una caja vista en 3/4 (tapa arriba, cara de frente). La textura mide ancho × (alto + profundo) ──

const ESTILOS = {
    armario: { tapa: 0x7d5a42, cara: 0x6b4a35, borde: 0x3a261a },
    estante: { tapa: 0x6e5a3c, cara: 0x594630, borde: 0x30241a },
    banco: { tapa: 0x8a6d49, cara: 0x73593b, borde: 0x3d2d1c },
    mesa: { tapa: 0x93714a, cara: 0x7a5c3a, borde: 0x40301d },
    consola: { tapa: 0x7a5a44, cara: 0x5f4432, borde: 0x30201a },
    cajas: { tapa: 0xb08a58, cara: 0x8c6c43, borde: 0x4a3720 },
    // La cocina
    alacena: { tapa: 0x8d6b4b, cara: 0x7a5a3d, borde: 0x3a261a },
    vitrina: { tapa: 0x5c4a3a, cara: 0x4a3b30, borde: 0x241a14 },
    chimenea: { tapa: 0x8a847e, cara: 0x6f6964, borde: 0x34302d },
    fregadero: { tapa: 0x9a9a94, cara: 0x7a634a, borde: 0x3a2e22 },
    estufa: { tapa: 0x2a2c30, cara: 0x3a3d42, borde: 0x15171a }
};
const LOMOS = [0x8f3b3b, 0x3b6a8f, 0x7a8f3b, 0x8f6a3b, 0x5b3b8f];

// Una caja de madera de frente, con tablones y flejes. `pesada`: más oscura y con un fleje de hierro: parece hundirse
function cajaDeMadera(g, x, y, w, h, color, pesada) {
    g.fillStyle(color, 1).fillRect(x, y, w, h);
    g.lineStyle(1, 0x000000, 0.28);
    for (let ty = y + 11; ty < y + h - 3; ty += 11) g.lineBetween(x + 1, ty, x + w - 1, ty);
    g.fillStyle(pesada ? 0x2e2a28 : 0x5a4326, 1).fillRect(x + 4, y, 5, h).fillRect(x + w - 9, y, 5, h);   // flejes
    g.lineStyle(2, 0x2b1f10, 1).strokeRect(x, y, w, h);
    if (pesada) g.fillStyle(0x000000, 0.22).fillRect(x + 1, y + h - 8, w - 2, 7);
}

function detallesDeMueble(g, estilo, ancho, profundo, alto, e) {
    const yCara = profundo;
    g.lineStyle(1, e.borde, 0.9);
    if (estilo === 'armario') {
        g.strokeRect(6, yCara + 8, ancho / 2 - 9, alto - 18).strokeRect(ancho / 2 + 3, yCara + 8, ancho / 2 - 9, alto - 18);
        g.fillStyle(0xd1a640, 1).fillCircle(ancho / 2 - 8, yCara + alto / 2, 2.5).fillCircle(ancho / 2 + 8, yCara + alto / 2, 2.5);
    } else if (estilo === 'estante') {
        const filas = 4, hFila = (alto - 8) / filas;
        for (let k = 0; k < filas; k++) {
            const yBase = yCara + 4 + (k + 1) * hFila;
            for (let x = 6, i = k; x < ancho - 10; i++) {
                const w = 5 + ((i * 7) % 5), h = hFila * (0.55 + ((i * 3) % 4) * 0.1);
                g.fillStyle(LOMOS[i % LOMOS.length], 1).fillRect(x, yBase - h - 1, w, h);
                x += w + 1;
            }
            g.fillStyle(e.borde, 1).fillRect(3, yBase, ancho - 6, 2);
        }
    } else if (estilo === 'banco') {
        g.fillStyle(e.borde, 0.55).fillRect(0, yCara, 9, alto).fillRect(ancho - 9, yCara, 9, alto);   // patas
        for (let x = 14; x < ancho - 12; x += 11) g.lineBetween(x, yCara + 2, x, yCara + alto - 2);
    } else if (estilo === 'consola') {
        g.strokeRect(8, yCara + 5, ancho / 3 - 10, alto - 12).strokeRect(ancho / 3 + 2, yCara + 5, ancho / 3 - 4, alto - 12).strokeRect((2 * ancho) / 3 + 2, yCara + 5, ancho / 3 - 10, alto - 12);
        g.fillStyle(0xd1a640, 1).fillCircle(ancho / 6, yCara + alto / 2, 2).fillCircle(ancho / 2, yCara + alto / 2, 2).fillCircle((5 * ancho) / 6, yCara + alto / 2, 2);
    } else if (estilo === 'alacena') {
        // Dos puertas, un zócalo y, debajo, las RUEDAS: lo raro de una alacena de cocina
        g.strokeRect(6, yCara + 8, ancho / 2 - 9, alto - 28).strokeRect(ancho / 2 + 3, yCara + 8, ancho / 2 - 9, alto - 28);
        g.fillStyle(0xd1a640, 1).fillCircle(ancho / 2 - 8, yCara + alto / 2 - 8, 2.5).fillCircle(ancho / 2 + 8, yCara + alto / 2 - 8, 2.5);
        g.fillStyle(e.borde, 1).fillRect(4, yCara + alto - 17, ancho - 8, 8);
        for (const x of [16, ancho - 16]) {
            g.fillStyle(0x1b1b1f, 1).fillCircle(x, yCara + alto - 7, 7);
            g.fillStyle(0x70707a, 1).fillCircle(x, yCara + alto - 7, 3);
        }
    } else if (estilo === 'vitrina') {
        // Un vidrio oscuro con baldas y copas de vino
        g.fillStyle(0x1c2733, 0.92).fillRect(5, yCara + 6, ancho - 10, alto - 12);
        g.lineStyle(1, 0x8fa8bf, 0.6).strokeRect(5, yCara + 6, ancho - 10, alto - 12).lineBetween(ancho / 2, yCara + 6, ancho / 2, yCara + alto - 6);
        const hFila = (alto - 12) / 3;
        for (let k = 0; k < 3; k++) {
            const yb = yCara + 6 + (k + 1) * hFila;
            g.fillStyle(e.borde, 1).fillRect(5, yb - 2, ancho - 10, 2);
            for (let x = 10; x < ancho - 16; x += 14) {
                g.fillStyle(0xd4e4f2, 0.92).fillTriangle(x, yb - 15, x + 9, yb - 15, x + 4.5, yb - 7);
                g.fillRect(x + 4, yb - 7, 1, 4).fillRect(x + 1.5, yb - 3, 7, 1);
            }
        }
    } else if (estilo === 'chimenea') {
        // Piedra, una repisa y el hueco oscuro del hogar (la "explicación" del viento que no es)
        g.lineStyle(1, e.borde, 0.5);
        for (let y = yCara + 12; y < yCara + alto; y += 12) g.lineBetween(0, y, ancho, y);
        g.fillStyle(0x9a948e, 1).fillRect(0, yCara, ancho, 8);
        g.fillStyle(0x0a0808, 1).fillRect(ancho * 0.18, yCara + alto * 0.28, ancho * 0.64, alto * 0.72);
        g.fillStyle(0x1a1412, 1).fillRect(ancho * 0.18, yCara + alto * 0.28, ancho * 0.64, 5);
        g.fillStyle(0x2e2a26, 1).fillRect(ancho * 0.3, yCara + alto - 8, ancho * 0.4, 8);                   // cenizas
    } else if (estilo === 'fregadero') {
        g.fillStyle(0x3a3f45, 1).fillRoundedRect(ancho * 0.12, 6, ancho * 0.76, profundo - 12, 4);          // la pila
        g.fillStyle(0xb8bcc2, 1).fillRect(ancho * 0.5 - 2, 2, 4, 9);                                        // el grifo
        g.strokeRect(6, yCara + 6, ancho / 2 - 9, alto - 12).strokeRect(ancho / 2 + 3, yCara + 6, ancho / 2 - 9, alto - 12);
        g.fillStyle(0xd1a640, 1).fillCircle(ancho / 2 - 8, yCara + alto / 2, 2).fillCircle(ancho / 2 + 8, yCara + alto / 2, 2);
    } else if (estilo === 'estufa') {
        for (const cx of [ancho * 0.25, ancho * 0.75]) for (const cy of [profundo * 0.3, profundo * 0.72]) {
            g.lineStyle(2, 0x0c0d0f, 1).strokeCircle(cx, cy, 9);
            g.fillStyle(0x16171a, 1).fillCircle(cx, cy, 5);
        }
        g.fillStyle(0x15171a, 1).fillRect(8, yCara + 14, ancho - 16, alto - 22);
        g.fillStyle(0x3a2a20, 1).fillRect(16, yCara + 22, ancho - 32, alto - 38);
        g.fillStyle(0xcfa040, 1);
        for (let k = 0; k < 4; k++) g.fillCircle(18 + k * ((ancho - 36) / 3), yCara + 8, 2);
    } else if (estilo === 'cajas') {
        // Una pila: dos cajas abajo (la de la derecha pesa más de lo que parece) y una encima
        const fila = alto - 46;
        g.lineStyle(1, 0x000000, 0.25);
        for (let x = 10; x < ancho - 10; x += 14) g.lineBetween(x, 3, x, profundo - 3);       // tablones de la tapa
        cajaDeMadera(g, 4, yCara + fila, 56, 44, 0x9a7747, false);
        cajaDeMadera(g, 66, yCara + fila, 58, 44, 0x6d5130, true);
        cajaDeMadera(g, CAJA_DE_ARRIBA.x, yCara + fila - CAJA_DE_ARRIBA.alto, CAJA_DE_ARRIBA.ancho, CAJA_DE_ARRIBA.alto, 0xa6824f, false);
    } else {
        g.fillStyle(e.borde, 0.5).fillRect(6, yCara + 4, 8, alto - 4).fillRect(ancho - 14, yCara + 4, 8, alto - 4);   // patas
        g.lineBetween(0, yCara + 7, ancho, yCara + 7);                                                      // delantal
    }
}

function generarMueble(escena, clave, { ancho, profundo, alto, estilo }) {
    const e = ESTILOS[estilo] || ESTILOS_NUEVOS[estilo] || ESTILOS.armario;
    textura(escena, clave, ancho, alto + profundo, g => {
        g.fillStyle(e.tapa, 1).fillRect(0, 0, ancho, profundo);
        g.fillStyle(e.cara, 1).fillRect(0, profundo, ancho, alto);
        g.fillStyle(0x000000, 0.2).fillRect(0, profundo + alto - 4, ancho, 4);
        detallesDeMueble(g, estilo, ancho, profundo, alto, e);
        if (estilo !== 'cajas') {
            g.lineStyle(2, e.borde, 1).strokeRect(1, 1, ancho - 2, alto + profundo - 2);
            g.lineStyle(1, e.borde, 0.8).lineBetween(0, profundo, ancho, profundo);
        }
    });
    if (EMOJI_DE_MUEBLE[estilo]) ponerEmoji(escena, clave, EMOJI_DE_MUEBLE[estilo], ancho / 2, profundo + alto / 2, Math.max(18, Math.min(ancho * 0.45, alto * 0.7)));
}

// ── El muro norte: ventanas, cortinas, la sombra que "camina" y el polvo ────

function marcoDeVentana(g, w, h) {
    g.fillStyle(0x3a2a1e, 1).fillRect(0, 0, w, h);
    g.fillStyle(0x0f1c33, 1).fillRect(5, 5, w - 10, h - 10);
    g.fillStyle(0x1b2f52, 1).fillRect(5, 5, w - 10, 28);
    g.fillStyle(0x3a2a1e, 1).fillRect(w / 2 - 2, 5, 4, h - 10).fillRect(5, h * 0.48, w - 10, 4);
    g.fillStyle(0x56402c, 1).fillRect(0, h - 5, w, 5);                              // alféizar
}

function generarVentanasYCortinas(escena) {
    textura(escena, 'ventana', 64, 76, g => {
        marcoDeVentana(g, 64, 76);
        g.lineStyle(1, 0x7f97c0, 0.35).lineBetween(10, 12, 26, 28).lineBetween(38, 44, 54, 60);       // reflejos
    });
    textura(escena, 'ventana-rota', 64, 76, g => {
        marcoDeVentana(g, 64, 76);
        // Los cristales rotos: casi todo el hueco está abierto y quedan unos fragmentos en las esquinas
        g.fillStyle(0x05080f, 1).fillRect(8, 8, 48, 60);
        g.fillStyle(0x6b87b8, 0.55)
            .fillTriangle(6, 6, 24, 6, 6, 30).fillTriangle(58, 6, 40, 6, 58, 24)
            .fillTriangle(6, 70, 6, 52, 20, 70).fillTriangle(58, 70, 44, 70, 58, 56);
        g.lineStyle(1, 0xaec3e8, 0.7).lineBetween(6, 30, 24, 6).lineBetween(58, 24, 40, 6).lineBetween(6, 52, 20, 70).lineBetween(14, 18, 10, 26);
        g.fillStyle(0xaec3e8, 0.8).fillTriangle(22, 71, 26, 66, 29, 71).fillTriangle(38, 71, 41, 67, 45, 71);   // vidrios en el alféizar
    });
    textura(escena, 'cortina', 30, 108, g => {
        g.fillStyle(0x4a1b27, 1).fillRect(0, 0, 30, 108);
        for (let x = 2; x < 30; x += 7) g.fillStyle(0x66253a, 1).fillRect(x, 0, 3, 108);                // pliegues
        g.fillStyle(0x2d1118, 1).fillRect(0, 100, 30, 8);
        g.fillStyle(0x8a6d49, 1).fillRect(0, 0, 30, 4);                                                   // la barra
    });
    textura(escena, 'cortina-rota', 30, 108, g => {
        g.fillStyle(0x4a1b27, 1).fillRect(0, 0, 30, 92);
        for (let x = 2; x < 30; x += 7) g.fillStyle(0x66253a, 1).fillRect(x, 0, 3, 92);
        g.fillStyle(0x4a1b27, 1).fillTriangle(0, 92, 12, 92, 5, 108).fillTriangle(14, 92, 30, 92, 22, 104);   // jirones
        g.fillStyle(0x8a6d49, 1).fillRect(0, 0, 30, 4);
    });
    // La sombra que parece caminar por la pared: una silueta alta, borrosa y muy tenue
    textura(escena, 'sombra-caminante', 44, 110, g => {
        for (let k = 0; k < 6; k++) g.fillStyle(0x000000, 0.07).fillEllipse(22, 62, 40 - k * 4, 100 - k * 6);
        g.fillStyle(0x000000, 0.16).fillCircle(22, 16, 10 - 1);
    });
    // La solapa de la caja de arriba: un trozo de tapa de cartón que la corriente levanta
    textura(escena, 'solapa', 56, 18, g => {
        g.fillStyle(0x000000, 0.35).fillRect(2, 14, 52, 4);                          // sombra bajo la solapa
        g.fillStyle(0xd2b880, 1).fillRect(1, 1, 54, 15);
        g.fillStyle(0xe4cf9c, 1).fillRect(1, 1, 54, 4);
        g.lineStyle(2, 0x2b1f10, 1).strokeRect(1, 1, 54, 15).lineBetween(28, 1, 28, 16);
    });
    textura(escena, 'polvo', 8, 8, g => {
        g.fillStyle(0xffffff, 0.12).fillCircle(4, 4, 4);
        g.fillStyle(0xffffff, 0.3).fillCircle(4, 4, 2.6);
        g.fillStyle(0xffffff, 0.9).fillCircle(4, 4, 1.3);
    });
    // Un resplandor suave y ancho para las ayudas sin texto: la mota de polvo es demasiado pequeña para señalar nada en la oscuridad
    textura(escena, 'brillo', 64, 64, g => {
        for (let r = 32; r > 2; r -= 3) g.fillStyle(0xffffff, 0.09).fillCircle(32, 32, r);
    });
}

// ── Marcas que se descubren con la luz y objetos del suelo ──────────────────

function generarMarca(escena, clave, ancho, alto, dibujo) {
    if (generarMarcaNueva(escena, clave, ancho, alto, dibujo)) return;
    textura(escena, clave, ancho, alto, g => {
        if (dibujo === 'aceite') {
            // La mancha de aceite de máquina: oscura, con un brillo irisado que solo se ve con luz
            g.fillStyle(0x0d0a12, 0.78).fillEllipse(ancho * 0.5, alto * 0.55, ancho * 0.9, alto * 0.72)
                .fillEllipse(ancho * 0.24, alto * 0.42, ancho * 0.4, alto * 0.5).fillEllipse(ancho * 0.8, alto * 0.62, ancho * 0.32, alto * 0.42);
            g.fillStyle(0x4aa8c8, 0.34).fillEllipse(ancho * 0.45, alto * 0.5, ancho * 0.5, alto * 0.24);
            g.fillStyle(0x9a5ac8, 0.3).fillEllipse(ancho * 0.62, alto * 0.64, ancho * 0.34, alto * 0.2);
            g.fillStyle(0xffffff, 0.24).fillEllipse(ancho * 0.4, alto * 0.42, ancho * 0.16, alto * 0.08);
            g.fillStyle(0x0d0a12, 0.7).fillCircle(ancho * 0.96, alto * 0.3, 3).fillCircle(ancho * 0.04, alto * 0.8, 2.5);   // gotas
        } else if (dibujo === 'arrastre') {
            // Dos surcos paralelos con el polvo apartado a los lados
            g.lineStyle(5, 0xa9b8cc, 0.18);
            g.lineBetween(4, alto * 0.38, ancho - 6, alto * 0.62).lineBetween(4, alto * 0.62, ancho - 6, alto * 0.86);
            g.lineStyle(3, 0xcddcf0, 0.85);
            g.lineBetween(6, alto * 0.38, ancho - 10, alto * 0.62).lineBetween(6, alto * 0.62, ancho - 10, alto * 0.86);
            g.fillStyle(0xcddcf0, 0.6);
            for (let k = 0; k < 7; k++) g.fillCircle(14 + k * ((ancho - 30) / 6), alto * (0.3 + 0.07 * (k % 3)), 1.8);
        } else {
            // Polvo removido: manchas barridas con la forma de una mano
            g.fillStyle(0xb9c6d8, 0.4).fillEllipse(ancho * 0.3, alto * 0.5, ancho * 0.42, alto * 0.7).fillEllipse(ancho * 0.64, alto * 0.42, ancho * 0.36, alto * 0.55);
            g.lineStyle(3, 0xd6e2f2, 0.75);
            for (let k = 0; k < 4; k++) g.lineBetween(ancho * (0.18 + k * 0.1), alto * 0.78, ancho * (0.4 + k * 0.1), alto * 0.24);
            g.fillStyle(0xd6e2f2, 0.6).fillEllipse(ancho * 0.86, alto * 0.7, ancho * 0.12, alto * 0.3);
        }
    });
}

function generarObjeto(escena, dibujo) {
    const clave = `item-${dibujo}`;
    if (generarObjetoNuevo(escena, dibujo)) return;
    if (dibujo === 'huella-bota') {
        textura(escena, clave, 48, 40, g => {
            g.fillStyle(0x3a2a1c, 0.9).fillEllipse(24, 20, 44, 34);                          // el barro seco
            g.fillStyle(0x6a5036, 1).fillEllipse(24, 14, 17, 22).fillRoundedRect(17, 24, 15, 11, 3);   // suela y tacón
            g.fillStyle(0x3a2a1c, 1);
            for (let y = 6; y < 22; y += 4) g.fillRect(17, y, 15, 1);                        // dibujo de la suela
            g.fillRect(19, 28, 11, 1).fillRect(19, 31, 11, 1);
        });
    } else if (dibujo === 'recorte') {
        textura(escena, clave, 48, 30, g => {
            g.fillStyle(0xe8dfc6, 1).fillRect(2, 3, 44, 24);
            g.lineStyle(1, 0x7a6e55, 1).strokeRect(2, 3, 44, 24);
            g.fillStyle(0x3b352a, 1).fillRect(6, 7, 26, 4);                                   // el titular
            g.fillStyle(0x8c8268, 1);
            for (let y = 14; y < 25; y += 3) g.fillRect(6, y, y > 20 ? 22 : 36, 1);
            g.fillStyle(0xb7ad90, 1).fillRect(35, 13, 9, 10);                                 // una foto
        });
    } else if (dibujo === 'platos') {
        textura(escena, clave, 56, 30, g => {
            for (const [x, n] of [[16, 4], [40, 3]]) {
                for (let k = 0; k < n; k++) {
                    g.fillStyle(k % 2 ? 0xe2ded2 : 0xf3f0e8, 1).fillEllipse(x, 24 - k * 4, 26, 9);
                    g.lineStyle(1, 0x8a8578, 1).strokeEllipse(x, 24 - k * 4, 26, 9);
                }
            }
        });
    } else if (dibujo === 'taza') {
        textura(escena, clave, 36, 26, g => {
            g.fillStyle(0xf1eee6, 1).fillRoundedRect(5, 7, 20, 15, 4);
            g.lineStyle(3, 0xf1eee6, 1).strokeCircle(27, 14, 5);
            g.fillStyle(0x4a2c1a, 1).fillEllipse(15, 8, 18, 5);
            g.lineStyle(1, 0xffffff, 0.35).lineBetween(11, 4, 12, 0).lineBetween(17, 4, 16, 0);              // un hilo de vapor: todavía está tibia
            g.lineStyle(1, 0x8a8578, 1).strokeRoundedRect(5, 7, 20, 15, 4);
        });
    } else if (dibujo === 'sarten') {
        textura(escena, clave, 70, 30, g => {
            g.fillStyle(0x5a5e66, 1).fillRect(44, 13, 26, 6);                                                // el mango
            g.fillStyle(0x15171a, 1).fillEllipse(24, 17, 46, 24);
            g.fillStyle(0x2a2d33, 1).fillEllipse(24, 15, 38, 17);
            g.fillStyle(0x8a6a2a, 0.7).fillEllipse(20, 15, 18, 8);                                           // restos de aceite
            g.fillStyle(0xffffff, 0.18).fillEllipse(14, 12, 10, 4);
        });
    } else if (dibujo === 'recibo') {
        textura(escena, clave, 48, 30, g => {
            g.fillStyle(0xece3c8, 1).fillRect(2, 3, 44, 24);
            g.lineStyle(1, 0x7a6e55, 1).strokeRect(2, 3, 44, 24);
            g.fillStyle(0x3b352a, 1).fillRect(6, 7, 22, 3);
            g.fillStyle(0x8c8268, 1);
            for (let y = 13; y < 23; y += 3) g.fillRect(6, y, 24, 1);
            g.lineStyle(2, 0x6a1e1e, 1).lineBetween(34, 9, 38, 22).lineBetween(38, 22, 42, 9);               // la firma: una "V"
        });
    } else if (dibujo === 'fuelle') {
        // Un fuelle de cuero y madera, escondido en el muro: las pliegues y la boquilla que apunta a las velas
        textura(escena, clave, 80, 64, g => {
            g.fillStyle(0x3a2a1a, 1).fillRect(0, 6, 8, 52).fillRect(0, 6, 8, 52);                            // la tabla de atrás
            g.fillStyle(0x6a4a2a, 1).fillRoundedRect(4, 4, 10, 56, 3);
            for (let k = 0; k < 6; k++) {
                const x = 14 + k * 8, alto = 46 - k * 5;
                g.fillStyle(k % 2 ? 0x7a5230 : 0x92683e, 1).fillTriangle(x, 32 - alto / 2, x + 8, 32 - (alto - 5) / 2, x + 8, 32 + (alto - 5) / 2).fillTriangle(x, 32 - alto / 2, x + 8, 32 + (alto - 5) / 2, x, 32 + alto / 2);
                g.lineStyle(1, 0x2a1c10, 1).lineBetween(x, 32 - alto / 2, x, 32 + alto / 2);
            }
            g.fillStyle(0x9a9ea6, 1).fillRect(58, 28, 20, 8).fillRect(74, 26, 4, 12);                        // la boquilla
        });
    } else if (dibujo === 'pilas') {
        textura(escena, clave, 48, 36, g => {
            for (const x of [8, 26]) {
                g.fillStyle(0x23272f, 1).fillRoundedRect(x, 6, 14, 26, 3);
                g.fillStyle(0xc89012, 1).fillRect(x, 12, 14, 5);
                g.fillStyle(0xb6bcc6, 1).fillRect(x + 4, 2, 6, 4);                            // el polo
                g.fillStyle(0xffffff, 0.15).fillRect(x + 2, 8, 2, 22);
            }
            g.fillStyle(0xdcd0b0, 1).fillRect(2, 31, 44, 4);                                   // el empaque
        });
    }
}

// ── La cocina: lo que se ve en el fenómeno (ollas, velas, su llama y su resplandor) ──

function generarFenomenoDeLaCocina(escena) {
    textura(escena, 'olla', 34, 40, g => {
        g.lineStyle(2, 0x2a2a2e, 1).lineBetween(17, 0, 17, 7);                                              // el gancho
        g.fillStyle(0x4a4f57, 1).fillRoundedRect(4, 10, 26, 26, 5);
        g.fillStyle(0x6a707a, 1).fillRect(4, 10, 26, 4);                                                    // la tapa
        g.fillStyle(0x2e3238, 1).fillRect(0, 20, 5, 4).fillRect(29, 20, 5, 4);                              // las asas
        g.fillStyle(0xffffff, 0.15).fillRect(8, 16, 3, 16);
    });
    textura(escena, 'vela', 8, 22, g => {
        g.fillStyle(0xe8dfc0, 1).fillRect(1, 4, 6, 18);
        g.fillStyle(0xcfc49a, 1).fillRect(5, 4, 2, 18);
        g.fillStyle(0x2a2118, 1).fillRect(3, 0, 2, 5);                                                      // el pabilo
    });
    textura(escena, 'llama', 16, 28, g => {
        g.fillStyle(0xff8a28, 0.95).fillEllipse(8, 18, 11, 20);
        g.fillStyle(0xffd060, 1).fillEllipse(8, 20, 7, 14);
        g.fillStyle(0xfff4d0, 1).fillEllipse(8, 22, 3.5, 8);
    });
    textura(escena, 'luz-vela', 192, 192, g => {
        for (let r = 96; r > 3; r -= 3) g.fillStyle(0xffffff, 0.034).fillCircle(96, 96, r);
    });
}

// Crea todas las texturas que necesita un mapa (las que ya existen no se vuelven a crear)
export function generarArte(escena, mapa) {
    generarBaldosas(escena);
    generarInspector(escena);
    generarVentanasYCortinas(escena);
    generarFenomenoDeLaCocina(escena);
    for (const m of mapa.muebles) generarMueble(escena, `mueble-${m.nombre}`, { ancho: m.ancho, profundo: m.alto, alto: m.props.alto, estilo: m.props.estilo });
    for (const o of mapa.revelables) generarMarca(escena, `revelable-${o.nombre}`, o.ancho, o.alto, o.props.dibujo);
    for (const dibujo of new Set(mapa.interactuables.map(o => o.props.dibujo).filter(Boolean))) generarObjeto(escena, dibujo);
}
