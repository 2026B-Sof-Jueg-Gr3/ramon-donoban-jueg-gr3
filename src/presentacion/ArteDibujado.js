// Los muebles y objetos de las habitaciones 3 a 6 dibujados de verdad (antes eran un emoji sobre un fondo), con el mismo estilo del resto
// del arte provisional: formas planas, un borde oscuro, luz arriba y sombra abajo. Cada dibujo ocupa exactamente la textura que ya tenía
// (las claves y los tamaños no cambian), así que encaja con los mapas y las colisiones sin tocar nada más.
//
// Los muebles se ven en 3/4: la textura mide ancho × (profundo + alto); arriba la parte de encima (profundo) y abajo el frente (alto).

const TINTA = 0x1c140e;

// Un color más claro (f > 1) o más oscuro (f < 1)
function tono(color, f) {
    const r = Math.min(255, Math.round(((color >> 16) & 255) * f));
    const g = Math.min(255, Math.round(((color >> 8) & 255) * f));
    const b = Math.min(255, Math.round((color & 255) * f));
    return (r << 16) | (g << 8) | b;
}

function sombraAlPie(g, x, y, w, h) {
    g.fillStyle(0x000000, 0.28).fillEllipse(x, y, w, h);
}

// ── Muebles ──────────────────────────────────────────────────────────────

const MUEBLES = {
    // Un barril de madera con aros de hierro, de pie
    barril(g, w, p, a) {
        const H = p + a, cx = w / 2, rx = w / 2 - 4, ry = Math.min(12, p / 2);
        sombraAlPie(g, cx, H - 4, w - 6, 10);
        g.fillStyle(0x5a4125, 1).fillRect(cx - rx, ry + 2, rx * 2, H - ry * 2 - 6);
        g.fillStyle(0x5a4125, 1).fillEllipse(cx, H - ry - 4, rx * 2, ry * 2);
        g.fillStyle(0x6e5030, 1).fillRect(cx - rx + 6, ry + 2, rx * 2 - 22, H - ry * 2 - 6);          // luz en las duelas
        g.lineStyle(1, TINTA, 0.5);
        for (let k = 1; k < 5; k++) { const x = cx - rx + (rx * 2 * k) / 5; g.lineBetween(x, ry + 4, x, H - ry - 6); }
        for (const t of [0.24, 0.5, 0.78]) {
            const y = ry + 2 + (H - ry * 2 - 6) * t;
            g.fillStyle(0x2e2a26, 1).fillRect(cx - rx, y - 3, rx * 2, 6);
            g.fillStyle(0x6a6460, 1).fillRect(cx - rx, y - 3, rx * 2, 1.5);
        }
        g.fillStyle(0x7a5a38, 1).fillEllipse(cx, ry + 2, rx * 2, ry * 2);                              // la tapa
        g.lineStyle(2, 0x2e2a26, 1).strokeEllipse(cx, ry + 2, rx * 2, ry * 2);
        g.fillStyle(0x3a2a1a, 0.9).fillEllipse(cx, ry + 2, rx * 0.5, ry * 0.5);                        // el tapón
        g.lineStyle(2, TINTA, 1).strokeRect(cx - rx, ry + 2, rx * 2, H - ry * 2 - 6);
    },

    // Un sofá rojo gastado: respaldo, brazos y dos cojines; la tela del medio, hundida
    sofa(g, w, p, a) {
        const H = p + a;
        sombraAlPie(g, w / 2, H - 4, w - 8, 12);
        const tela = 0x7a3b3b, oscura = 0x562626, clara = 0x93504e;
        g.fillStyle(oscura, 1).fillRoundedRect(4, 2, w - 8, p + 18, 12);                               // respaldo
        g.fillStyle(tela, 1).fillRoundedRect(8, 6, w - 16, p + 10, 10);
        g.fillStyle(oscura, 1).fillRoundedRect(4, p + 14, w - 8, a - 20, 8);                           // base
        g.fillStyle(tela, 1).fillRoundedRect(18, p + 8, (w - 40) / 2, a * 0.45, 8);                    // cojines
        g.fillStyle(tela, 1).fillRoundedRect(22 + (w - 40) / 2, p + 8, (w - 40) / 2, a * 0.45, 8);
        g.fillStyle(0x000000, 0.25).fillEllipse(w / 2 - 12, p + 8 + a * 0.24, (w - 40) / 3, a * 0.18); // lo hundido
        g.fillStyle(clara, 1).fillRect(24, p + 10, (w - 40) / 2 - 12, 3).fillRect(28 + (w - 40) / 2, p + 10, (w - 40) / 2 - 12, 3);
        g.fillStyle(oscura, 1).fillRoundedRect(0, p, 20, a - 6, 8).fillRoundedRect(w - 20, p, 20, a - 6, 8);   // brazos
        g.fillStyle(clara, 1).fillRoundedRect(3, p + 2, 14, 6, 3).fillRoundedRect(w - 17, p + 2, 14, 6, 3);
        g.fillStyle(0x2a1a10, 1).fillRect(12, H - 8, 8, 6).fillRect(w - 20, H - 8, 8, 6);             // patas
        g.lineStyle(2, TINTA, 0.9).strokeRoundedRect(4, 2, w - 8, H - 10, 12);
    },

    // La cortina pesada detrás de la que se esconde el abrigo: pliegues de terciopelo y una barra arriba
    cortina(g, w, p, a) {
        const H = p + a;
        sombraAlPie(g, w / 2, H - 3, w - 10, 8);
        g.fillStyle(0x3a2a1c, 1).fillRect(0, 4, w, 6);
        g.fillStyle(0xc8a050, 1).fillCircle(4, 7, 5).fillCircle(w - 4, 7, 5);
        const pliegues = 6, ancho = (w - 8) / pliegues;
        for (let k = 0; k < pliegues; k++) {
            const x = 4 + k * ancho;
            g.fillStyle(k % 2 ? 0x6a2f58 : 0x7e3b69, 1).fillRect(x, 10, ancho + 1, H - 16);
            g.fillStyle(0x9a5487, 0.55).fillRect(x + ancho * 0.25, 10, ancho * 0.18, H - 16);
        }
        g.fillStyle(0x34162c, 0.5).fillRect(4, H - 14, w - 8, 8);
        g.lineStyle(2, TINTA, 0.8).strokeRect(4, 10, w - 8, H - 16);
    },

    // El gran reloj de pie del despacho, detenido: caja alta, esfera, ventana del péndulo y zócalo
    reloj(g, w, p, a) {
        const H = p + a, cx = w / 2;
        sombraAlPie(g, cx, H - 3, w - 10, 10);
        const madera = 0x4a3524, oscura = 0x2e2016, clara = 0x6a4c34;
        g.fillStyle(oscura, 1).fillRect(8, 10, w - 16, H - 14);                                       // la caja
        g.fillStyle(madera, 1).fillRect(12, 14, w - 24, H - 22);
        g.fillStyle(oscura, 1).fillTriangle(6, 14, w - 6, 14, cx, 0);                                 // el remate
        g.fillStyle(clara, 1).fillTriangle(14, 13, w - 14, 13, cx, 4);
        g.fillStyle(0xc8a050, 1).fillCircle(cx, 44, 24);                                              // la esfera
        g.fillStyle(0xf0e6cc, 1).fillCircle(cx, 44, 20);
        g.lineStyle(2, TINTA, 0.9);
        for (let k = 0; k < 12; k++) {
            const ang = (k / 12) * Math.PI * 2;
            g.lineBetween(cx + Math.cos(ang) * 16, 44 + Math.sin(ang) * 16, cx + Math.cos(ang) * 19, 44 + Math.sin(ang) * 19);
        }
        g.lineStyle(2.5, TINTA, 1).lineBetween(cx, 44, cx - 9, 37).lineBetween(cx, 44, cx + 2, 30);    // las agujas, quietas
        g.fillStyle(TINTA, 1).fillCircle(cx, 44, 2.5);
        const vy = 78, vh = H - vy - 34;                                                               // la ventana del péndulo
        g.fillStyle(0x1a120c, 1).fillRoundedRect(cx - 16, vy, 32, vh, 6);
        g.lineStyle(2, 0xc8a050, 0.9).strokeRoundedRect(cx - 16, vy, 32, vh, 6);
        g.lineStyle(2, 0xc8a050, 1).lineBetween(cx, vy + 4, cx, vy + vh - 22);
        g.fillStyle(0xd8b060, 1).fillCircle(cx, vy + vh - 16, 9);
        g.fillStyle(0xf0d890, 1).fillCircle(cx - 3, vy + vh - 19, 3);
        g.fillStyle(oscura, 1).fillRect(4, H - 26, w - 8, 22);                                        // el zócalo
        g.fillStyle(clara, 1).fillRect(4, H - 26, w - 8, 3);
        g.lineStyle(2, TINTA, 1).strokeRect(8, 10, w - 16, H - 14);
    },

    // Un estante bajo con archivos y carpetas de colores, algunos fuera de su sitio
    archivos(g, w, p, a) {
        const H = p + a;
        sombraAlPie(g, w / 2, H - 3, w - 6, 10);
        g.fillStyle(0x5a4630, 1).fillRect(2, p - 6, w - 4, a + 2);
        g.fillStyle(0x7a6040, 1).fillRect(2, 2, w - 4, p - 6);                                       // la tapa
        const colores = [0x8f3b3b, 0x3b5a8f, 0x7a8f3b, 0xb08a40, 0x6a4a8f, 0x8f6a3b];
        const filas = 2, hFila = (a - 10) / filas;
        for (let f = 0; f < filas; f++) {
            const base = p + (f + 1) * hFila;
            for (let x = 8, k = f * 3; x < w - 16; k++) {
                const ancho = 12 + (k % 3) * 3, alto = hFila - 6 - (k % 2) * 4;
                g.fillStyle(colores[k % colores.length], 1).fillRect(x, base - alto, ancho, alto);
                g.fillStyle(0xf0e6cc, 0.9).fillRect(x + 3, base - alto + 6, ancho - 6, 6);              // la etiqueta
                x += ancho + 2;
            }
            g.fillStyle(0x3a2a1c, 1).fillRect(2, base, w - 4, 3);
        }
        g.fillStyle(0xe8e0c8, 1).fillRect(10, 6, 34, 18).fillRect(18, 10, 34, 18);                  // papeles encima
        g.lineStyle(1, 0x9a9080, 1).strokeRect(18, 10, 34, 18);
        g.lineStyle(2, TINTA, 1).strokeRect(2, 2, w - 4, H - 6);
    },

    // Un archivador metálico de cuatro cajones; uno, forzado y entreabierto
    archivador(g, w, p, a) {
        const H = p + a;
        sombraAlPie(g, w / 2, H - 3, w - 8, 10);
        g.fillStyle(0x7c8088, 1).fillRect(6, 2, w - 12, p);                                           // la tapa
        g.fillStyle(0x62666e, 1).fillRect(6, p, w - 12, a - 6);
        const n = 4, hc = (a - 14) / n;
        for (let k = 0; k < n; k++) {
            const y = p + 4 + k * hc, abierto = k === 1;
            const dx = abierto ? 6 : 0;
            g.fillStyle(abierto ? 0x787c84 : 0x6c7078, 1).fillRect(10 - dx, y + 2, w - 20 + dx * 2, hc - 4);
            g.lineStyle(1, 0x30333a, 1).strokeRect(10 - dx, y + 2, w - 20 + dx * 2, hc - 4);
            g.fillStyle(0xc8ccd4, 1).fillRect(w / 2 - 10, y + hc / 2 - 2, 20, 4);                    // el tirador
            g.fillStyle(0xf0ecdc, 1).fillRect(w / 2 - 8, y + 5, 16, 6);                              // el porta etiquetas
            if (abierto) {
                g.lineStyle(2, 0xe8e0c0, 0.9).lineBetween(14, y + 6, 24, y + hc - 8).lineBetween(18, y + 4, 28, y + hc - 10);   // rayones
                g.fillStyle(0x1a1c20, 1).fillRect(10 - dx, y + 2, w - 20 + dx * 2, 3);
            }
        }
        g.lineStyle(2, 0x30333a, 1).strokeRect(6, 2, w - 12, H - 8);
    },

    // El escritorio del viejo Flieder: papeles, un tintero y cajones al frente
    escritorio(g, w, p, a) {
        const H = p + a;
        sombraAlPie(g, w / 2, H - 3, w - 8, 12);
        g.fillStyle(0x8a6a46, 1).fillRect(2, 2, w - 4, p);                                           // la tapa
        g.fillStyle(0x6e5236, 1).fillRect(2, p, w - 4, a - 6);
        g.fillStyle(0xa07a50, 1).fillRect(2, 2, w - 4, 3);
        g.fillStyle(0xeee6d0, 1).fillRect(20, 8, 40, p - 14);                                        // papeles
        g.fillStyle(0xe2d8c0, 1).fillRect(30, 6, 40, p - 14);
        g.lineStyle(1, 0x8a8070, 1);
        for (let y = 12; y < p - 10; y += 5) g.lineBetween(34, y, 64, y);
        g.fillStyle(0x1a1c2a, 1).fillRoundedRect(w - 56, 10, 16, 14, 3);                             // el tintero
        g.fillStyle(0x3a3e5a, 1).fillRect(w - 52, 8, 8, 4);
        g.lineStyle(3, 0x2a1a10, 1).lineBetween(w - 30, 8, w - 18, p - 8);                            // la pluma
        g.fillStyle(0xc8a050, 1).fillCircle(w - 18, p - 8, 2);
        for (const x of [10, w - 66]) {                                                              // cajones
            for (let k = 0; k < 2; k++) {
                const y = p + 8 + k * ((a - 22) / 2);
                g.lineStyle(1, 0x372818, 1).strokeRect(x, y, 56, (a - 26) / 2);
                g.fillStyle(0xd1a640, 1).fillCircle(x + 28, y + (a - 26) / 4, 2.5);
            }
        }
        g.lineStyle(2, 0x372818, 1).strokeRect(2, 2, w - 4, H - 8);
    },

    // Un caballito de carrusel en su barra dorada, sobre una base redonda
    caballito(g, w, p, a) {
        const H = p + a, cx = w / 2;
        sombraAlPie(g, cx, H - 6, w - 10, 14);
        g.fillStyle(0x6a4a2a, 1).fillEllipse(cx, H - 12, w - 12, 18);                                 // la base
        g.fillStyle(0x8a6a40, 1).fillEllipse(cx, H - 15, w - 16, 14);
        g.fillStyle(0xd8b050, 1).fillRect(cx - 2, 0, 4, H - 14);                                     // la barra
        g.fillStyle(0xf0d890, 1).fillRect(cx - 2, 0, 1.5, H - 14);
        const y = H * 0.48;
        g.fillStyle(0xf0e6d4, 1).fillEllipse(cx, y, w * 0.62, H * 0.2);                               // el cuerpo
        g.fillStyle(0xf0e6d4, 1).fillTriangle(cx + w * 0.2, y - 6, cx + w * 0.42, y - H * 0.2, cx + w * 0.3, y + 4);   // el cuello
        g.fillStyle(0xf0e6d4, 1).fillEllipse(cx + w * 0.4, y - H * 0.2, w * 0.2, H * 0.08);          // la cabeza
        g.fillStyle(0x8a5a2a, 1).fillTriangle(cx + w * 0.16, y - 10, cx + w * 0.36, y - H * 0.24, cx + w * 0.24, y - 2);  // la crin
        g.fillStyle(TINTA, 1).fillCircle(cx + w * 0.42, y - H * 0.21, 1.6);
        g.lineStyle(4, 0xf0e6d4, 1);                                                                  // las patas, al galope
        g.lineBetween(cx - w * 0.2, y + 6, cx - w * 0.32, y + H * 0.16).lineBetween(cx - w * 0.08, y + 8, cx - w * 0.02, y + H * 0.18);
        g.lineBetween(cx + w * 0.1, y + 8, cx + w * 0.2, y + H * 0.15).lineBetween(cx + w * 0.22, y + 4, cx + w * 0.34, y + H * 0.12);
        g.fillStyle(0xa83a3a, 1).fillRoundedRect(cx - w * 0.14, y - H * 0.1, w * 0.26, H * 0.08, 4);  // la montura
        g.fillStyle(0xd8b050, 1).fillRect(cx - w * 0.14, y - H * 0.03, w * 0.26, 2);
        g.lineStyle(1.5, TINTA, 0.7).strokeEllipse(cx, y, w * 0.62, H * 0.2);
    },

    // Una repisa con cuatro muñecas en fila, todas mirando hacia la puerta
    munecas(g, w, p, a) {
        const H = p + a;
        sombraAlPie(g, w / 2, H - 3, w - 8, 10);
        g.fillStyle(0x5e4666, 1).fillRect(2, H - a * 0.38, w - 4, a * 0.38 - 4);                     // la repisa
        g.fillStyle(0x7e5e86, 1).fillRect(2, H - a * 0.38, w - 4, 4);
        const vestidos = [0x8f3b4b, 0x3b6a8f, 0x6a8f3b, 0xb07a3a], n = 4, paso = (w - 20) / n;
        for (let k = 0; k < n; k++) {
            const cx = 10 + paso * (k + 0.5), base = H - a * 0.38;
            g.fillStyle(vestidos[k], 1).fillTriangle(cx - 12, base, cx + 12, base, cx, base - 30);   // el vestido
            g.fillStyle(tono(vestidos[k], 1.25), 1).fillTriangle(cx - 4, base - 4, cx + 2, base - 4, cx, base - 26);
            g.fillStyle(0xf2dcc4, 1).fillCircle(cx, base - 36, 9);                                    // la cara
            g.fillStyle(k % 2 ? 0x3a2416 : 0xc8963a, 1).fillEllipse(cx, base - 42, 22, 10);           // el pelo
            g.fillStyle(TINTA, 1).fillCircle(cx + 3, base - 36, 1.5).fillCircle(cx + 7, base - 36, 1.2);   // miran a un lado
            g.fillStyle(0xd86a6a, 0.8).fillCircle(cx + 4, base - 32, 1.5);
        }
        g.lineStyle(2, 0x3a2a40, 1).strokeRect(2, H - a * 0.38, w - 4, a * 0.38 - 4);
    },

    // Un oso de peluche sentado sobre un cajón; el hilo cosido en la espalda asoma por un lado
    oso(g, w, p, a) {
        const H = p + a, cx = w / 2;
        sombraAlPie(g, cx, H - 3, w - 10, 10);
        g.fillStyle(0x6a5030, 1).fillRect(10, H - 40, w - 20, 36);                                    // el cajón
        g.fillStyle(0x86683e, 1).fillRect(10, H - 40, w - 20, 4);
        g.lineStyle(2, 0x3a2a1a, 1).strokeRect(10, H - 40, w - 20, 36);
        const piel = 0x9a6a3e, clara = 0xc89a6a, base = H - 40;
        g.fillStyle(piel, 1).fillEllipse(cx, base - 20, 46, 40);                                      // el cuerpo
        g.fillStyle(clara, 1).fillEllipse(cx, base - 16, 26, 24);
        g.fillStyle(piel, 1).fillEllipse(cx - 18, base - 4, 18, 12).fillEllipse(cx + 18, base - 4, 18, 12);   // las patas
        g.fillStyle(piel, 1).fillCircle(cx, base - 50, 18);                                           // la cabeza
        g.fillStyle(piel, 1).fillCircle(cx - 14, base - 64, 7).fillCircle(cx + 14, base - 64, 7);     // las orejas
        g.fillStyle(clara, 1).fillCircle(cx - 14, base - 64, 3.5).fillCircle(cx + 14, base - 64, 3.5);
        g.fillStyle(clara, 1).fillEllipse(cx, base - 44, 16, 11);                                     // el hocico
        g.fillStyle(TINTA, 1).fillCircle(cx, base - 46, 2.5).fillCircle(cx - 7, base - 54, 2).fillCircle(cx + 7, base - 54, 2);
        g.lineStyle(1.5, 0xf4f0d8, 0.95).lineBetween(cx + 20, base - 30, w - 4, 4);                   // el hilo
    },

    // Un tren de juguete: locomotora con chimenea, cabina y ruedas rojas
    tren(g, w, p, a) {
        const H = p + a;
        sombraAlPie(g, w / 2, H - 4, w - 8, 10);
        g.fillStyle(0x3b5a8f, 1).fillRoundedRect(8, H - 38, w * 0.56, 22, 6);                         // la caldera
        g.fillStyle(0x5a7ab0, 1).fillRect(8, H - 36, w * 0.56, 4);
        g.fillStyle(0x8f3b3b, 1).fillRect(w * 0.6, H - 54, w * 0.3, 38);                             // la cabina
        g.fillStyle(0xf0e0a0, 1).fillRect(w * 0.64, H - 48, w * 0.2, 12);                            // la ventana
        g.fillStyle(0x2a2a2e, 1).fillRect(w * 0.56, H - 58, w * 0.38, 6);                            // el techo
        g.fillStyle(0x2a2a2e, 1).fillRect(18, H - 54, 10, 18);                                        // la chimenea
        g.fillStyle(0x4a4a50, 1).fillRect(15, H - 58, 16, 5);
        g.fillStyle(0xd8b050, 1).fillCircle(w * 0.46, H - 40, 4);
        for (const x of [20, 40, w * 0.68, w * 0.84]) {                                               // las ruedas
            g.fillStyle(0xb83a3a, 1).fillCircle(x, H - 12, 8);
            g.fillStyle(0x2a2a2e, 1).fillCircle(x, H - 12, 3);
        }
        g.lineStyle(2, 0x20262e, 1).strokeRoundedRect(8, H - 38, w * 0.56, 22, 6).strokeRect(w * 0.6, H - 54, w * 0.3, 38);
    },

    // El baúl de los juguetes, pintado a rayas, con la tapa entreabierta y algún juguete asomando
    juguetero(g, w, p, a) {
        const H = p + a;
        sombraAlPie(g, w / 2, H - 3, w - 6, 10);
        const y0 = p - 4;
        g.fillStyle(0x8c6c43, 1).fillRect(4, y0, w - 8, H - y0 - 6);
        const rayas = [0xb04a4a, 0x4a7ab0, 0xd8b050];
        for (let k = 0; k < 3; k++) g.fillStyle(rayas[k], 0.85).fillRect(4, y0 + 10 + k * ((H - y0 - 22) / 3), w - 8, 6);
        g.fillStyle(0xd84a4a, 1).fillCircle(30, y0 - 4, 11);                                          // una pelota
        g.fillStyle(0xffffff, 0.6).fillCircle(26, y0 - 8, 3);
        g.fillStyle(0x4a8a4a, 1).fillRect(52, y0 - 16, 16, 16);                                      // un cubo con letra
        g.fillStyle(0xf0e6cc, 1).fillRect(56, y0 - 12, 8, 8);
        g.fillStyle(0xa6824f, 1).fillRect(2, 2, w - 4, p - 8);                                       // la tapa abierta, detrás
        g.lineStyle(2, 0x4a3720, 1).strokeRect(2, 2, w - 4, p - 8).strokeRect(4, y0, w - 8, H - y0 - 6);
        g.fillStyle(0xd1a640, 1).fillRect(w / 2 - 8, y0, 16, 8);                                     // la cerradura
    },

    // Una mesita con tres velas apagadas; todavía sale un hilo de humo
    velas(g, w, p, a) {
        const H = p + a;
        sombraAlPie(g, w / 2, H - 3, w - 6, 8);
        g.fillStyle(0x594630, 1).fillRect(6, H - 26, w - 12, 22);                                    // la mesita
        g.fillStyle(0x6e5a3c, 1).fillRect(4, H - 30, w - 8, 6);
        g.fillStyle(0xc8a050, 1).fillEllipse(w / 2, H - 32, w - 20, 6);                               // el candelabro
        for (const [x, alto] of [[w * 0.3, 18], [w * 0.5, 24], [w * 0.7, 16]]) {
            g.fillStyle(0xf2ead6, 1).fillRect(x - 3, H - 32 - alto, 6, alto);
            g.fillStyle(0x2a2016, 1).fillRect(x - 0.5, H - 36 - alto, 1.5, 4);                        // la mecha, negra
            g.lineStyle(1.5, 0xd0d0d8, 0.55).lineBetween(x, H - 38 - alto, x + 3, H - 46 - alto).lineBetween(x + 3, H - 46 - alto, x - 1, H - 54 - alto);
        }
        g.lineStyle(2, 0x30241a, 1).strokeRect(6, H - 26, w - 12, 22);
    }
};

// Dibuja un mueble nuevo en la textura; devuelve false si ese estilo no tiene dibujo propio (se usa la caja de siempre)
export function dibujarMueble(g, estilo, ancho, profundo, alto) {
    const dibujo = MUEBLES[estilo];
    if (!dibujo) return false;
    dibujo(g, ancho, profundo, alto);
    return true;
}

// ── Objetos pequeños (pistas y cosas que se examinan) ─────────────────────

const OBJETOS = {
    // La carta sin enviar: un sobre cerrado con su sello de lacre
    carta(g, w, h) {
        g.fillStyle(0x000000, 0.25).fillEllipse(w / 2, h - 3, w - 6, 6);
        g.fillStyle(0xeee4c8, 1).fillRect(4, 6, w - 8, h - 12);
        g.lineStyle(1, 0x9a8a6a, 1).strokeRect(4, 6, w - 8, h - 12).lineBetween(4, 6, w / 2, h / 2).lineBetween(w - 4, 6, w / 2, h / 2);
        g.fillStyle(0x9a2a2a, 1).fillCircle(w / 2, h / 2, 4);
    },

    // La llave de latón con su etiqueta
    llave(g, w, h) {
        g.fillStyle(0x000000, 0.25).fillEllipse(w / 2, h - 4, w - 8, 6);
        g.lineStyle(4, 0xc8a040, 1).strokeCircle(11, h / 2, 6);
        g.fillStyle(0xc8a040, 1).fillRect(16, h / 2 - 2, 18, 4).fillRect(28, h / 2, 3, 6).fillRect(33, h / 2, 3, 4);
        g.fillStyle(0xf0d890, 1).fillRect(16, h / 2 - 2, 18, 1);
        g.fillStyle(0xeee4c8, 1).fillRect(4, 4, 12, 8);                                             // la etiqueta
        g.lineStyle(1, 0x9a8a6a, 1).strokeRect(4, 4, 12, 8).lineBetween(10, 12, 11, h / 2 - 5);
    },

    // El llavero de pared: una tablita con ganchos; justo el del ala oeste, vacío
    llavero(g, w, h) {
        g.fillStyle(0x5a4228, 1).fillRoundedRect(4, 8, w - 8, h - 20, 4);
        g.fillStyle(0x7a5a38, 1).fillRect(4, 8, w - 8, 3);
        g.lineStyle(2, 0x2e2012, 1).strokeRoundedRect(4, 8, w - 8, h - 20, 4);
        const ganchos = [12, 24, 36, 48].filter(x => x < w - 6);
        ganchos.forEach((x, k) => {
            g.fillStyle(0xb8b0a0, 1).fillRect(x - 1, 18, 2, 6);
            if (k !== 2) {                                                                           // el tercero, vacío
                g.lineStyle(2, 0xc8a040, 1).strokeCircle(x, 30, 4);
                g.fillStyle(0xc8a040, 1).fillRect(x - 1, 33, 2, 12);
            }
        });
    },

    // La caja de herramientas de cerrajero, con las ganzúas gastadas asomando
    herramientas(g, w, h) {
        g.fillStyle(0x000000, 0.25).fillEllipse(w / 2, h - 3, w - 6, 6);
        g.fillStyle(0x8a2a2a, 1).fillRect(4, 14, w - 8, h - 18);
        g.fillStyle(0xa83a3a, 1).fillRect(4, 14, w - 8, 4);
        g.lineStyle(3, 0x3a3a40, 1).strokeRect(w / 2 - 10, 6, 20, 10);                               // el asa
        g.lineStyle(2, 0xb8b8c0, 1).lineBetween(14, 16, 10, 4).lineBetween(20, 16, 18, 2).lineBetween(26, 16, 28, 5);   // las ganzúas
        g.fillStyle(0xd8d8de, 1).fillRect(w / 2 - 4, 22, 8, 6);
        g.lineStyle(2, 0x3a1414, 1).strokeRect(4, 14, w - 8, h - 18);
    },

    // La bobina de hilo de pescar, con el hilo que sale hacia arriba
    bobina(g, w, h) {
        const cx = w / 2, cy = h / 2 + 4;
        g.fillStyle(0x000000, 0.25).fillEllipse(cx, h - 3, w - 8, 6);
        g.fillStyle(0x6a4a2a, 1).fillEllipse(cx, cy - 10, w - 10, 10).fillEllipse(cx, cy + 10, w - 10, 10);
        g.fillStyle(0xe8ecf0, 1).fillRect(cx - (w - 18) / 2, cy - 10, w - 18, 20);
        g.lineStyle(1, 0xb8c4d0, 1);
        for (let y = cy - 8; y < cy + 9; y += 3) g.lineBetween(cx - (w - 18) / 2, y, cx + (w - 18) / 2, y);
        g.fillStyle(0x8a6a40, 1).fillEllipse(cx, cy - 10, w - 10, 10);
        g.fillStyle(0x3a2a1a, 1).fillEllipse(cx, cy - 10, 8, 4);
        g.lineStyle(1, 0xf4f0d8, 0.95).lineBetween(cx + (w - 18) / 2, cy - 2, w - 2, 2);
    },

    // La página arrancada del diario infantil, con renglones y un dibujito
    diario(g, w, h) {
        g.fillStyle(0x000000, 0.25).fillEllipse(w / 2, h - 3, w - 6, 6);
        g.fillStyle(0xf2ead2, 1).fillPoints([{ x: 6, y: 4 }, { x: w - 6, y: 6 }, { x: w - 8, y: h - 6 }, { x: 10, y: h - 4 }, { x: 6, y: h - 10 }, { x: 8, y: h * 0.6 }, { x: 5, y: h * 0.4 }], true);
        g.lineStyle(1, 0x8aa8c8, 0.8);
        for (let y = 11; y < h - 8; y += 5) g.lineBetween(10, y, w - 10, y);
        g.lineStyle(1.5, 0x5a5a8a, 1).lineBetween(12, 12, 30, 12).lineBetween(12, 17, 34, 17);
        g.lineStyle(1.5, 0x9a4a3a, 1).strokeCircle(w - 16, h - 14, 5);                               // un reloj dibujado
        g.lineBetween(w - 16, h - 14, w - 16, h - 18);
    },

    // El abrigo negro, empapado, doblado
    abrigo(g, w, h) {
        g.fillStyle(0x000000, 0.3).fillEllipse(w / 2, h - 3, w - 6, 6);
        g.fillStyle(0x16181e, 1).fillRoundedRect(4, 8, w - 8, h - 12, 6);
        g.fillStyle(0x24272f, 1).fillTriangle(w / 2, 8, 8, 8, w / 2 - 4, h * 0.55).fillTriangle(w / 2, 8, w - 8, 8, w / 2 + 4, h * 0.55);   // solapas
        g.fillStyle(0x6a6e78, 1).fillCircle(w / 2, h * 0.65, 2).fillCircle(w / 2, h * 0.8, 2);
        g.fillStyle(0x7ab0d8, 0.6).fillCircle(10, h - 10, 2).fillCircle(w - 12, 16, 2).fillCircle(w / 2 + 8, h - 8, 1.5);   // gotas
        g.lineStyle(1.5, 0x05060a, 1).strokeRoundedRect(4, 8, w - 8, h - 12, 6);
    },

    // Los planos de la mansión: papel azul con líneas y el despacho marcado en rojo
    planos(g, w, h) {
        g.fillStyle(0x000000, 0.25).fillEllipse(w / 2, h - 3, w - 6, 6);
        g.fillStyle(0x2e4e8a, 1).fillRect(6, 4, w - 12, h - 10);
        g.lineStyle(1, 0xc8d8f0, 0.85).strokeRect(10, 8, w - 20, h - 18).lineBetween(w / 2, 8, w / 2, h - 10).lineBetween(10, h / 2, w - 10, h / 2);
        g.lineStyle(2, 0xd83a3a, 1).strokeCircle(w * 0.72, h * 0.32, 6);
        g.fillStyle(0xe8e0c8, 1).fillEllipse(6, h / 2 - 3, 6, h - 10);                               // el rollo
    },

    // Las cartas de los compradores, atadas con un cordel
    cartas(g, w, h) {
        g.fillStyle(0x000000, 0.25).fillEllipse(w / 2, h - 3, w - 6, 6);
        for (let k = 3; k >= 0; k--) {
            g.fillStyle(k % 2 ? 0xe6dcc0 : 0xf2ead2, 1).fillRect(6 + k * 2, 6 + k * 3, w - 16, h - 18);
            g.lineStyle(1, 0x9a8a6a, 1).strokeRect(6 + k * 2, 6 + k * 3, w - 16, h - 18);
        }
        g.lineStyle(2, 0x8a3a2a, 1).lineBetween(w / 2, 4, w / 2, h - 6).lineBetween(6, h / 2 + 2, w - 6, h / 2 + 2);
    },

    // La pluma estilográfica grabada «G. V.»
    pluma(g, w, h) {
        g.fillStyle(0x000000, 0.25).fillEllipse(w / 2, h - 4, w - 8, 6);
        g.lineStyle(6, 0x1a1c2a, 1).lineBetween(8, h - 10, w - 14, 8);
        g.lineStyle(2, 0xc8a050, 1).lineBetween(14, h - 14, 22, h - 18);                             // el anillo dorado (G. V.)
        g.fillStyle(0xc8a050, 1).fillTriangle(w - 16, 6, w - 4, 2, w - 10, 12);                      // la plumilla
        g.lineStyle(1, 0x2a2016, 1).lineBetween(w - 10, 6, w - 6, 4);
    },

    // El cuadro torcido; detrás asoma el agujero para espiar
    cuadro(g, w, h) {
        const cx = w / 2, cy = h / 2, ang = 0.12;
        const esquina = (x, y) => ({ x: cx + (x * Math.cos(ang) - y * Math.sin(ang)), y: cy + (x * Math.sin(ang) + y * Math.cos(ang)) });
        g.fillStyle(0x0a0806, 1).fillCircle(cx - 14, cy - 10, 5);                                    // el agujero
        const marco = [esquina(-26, -24), esquina(26, -24), esquina(26, 24), esquina(-26, 24)];
        const lienzo = [esquina(-20, -18), esquina(20, -18), esquina(20, 18), esquina(-20, 18)];
        g.fillStyle(0xa8823a, 1).fillPoints(marco, true);
        g.fillStyle(0x3a5a4a, 1).fillPoints(lienzo, true);
        g.fillStyle(0x6a8a6a, 1).fillPoints([esquina(-20, 6), esquina(-4, -8), esquina(10, 4), esquina(20, -4), esquina(20, 18), esquina(-20, 18)], true);   // un paisaje
        g.fillStyle(0xe8d890, 1).fillCircle(esquina(10, -10).x, esquina(10, -10).y, 4);
        g.lineStyle(2, 0x5a3a14, 1).strokePoints(marco, true);
    },

    // Los libros de contabilidad: un libro mayor cerrado, con lomo de cuero
    cuentas(g, w, h) {
        g.fillStyle(0x000000, 0.25).fillEllipse(w / 2, h - 3, w - 6, 6);
        g.fillStyle(0xe8e0c8, 1).fillRect(8, 10, w - 14, h - 16);                                    // las hojas
        g.fillStyle(0x5a2a1a, 1).fillRect(6, 6, w - 14, h - 16);                                    // la tapa
        g.fillStyle(0x3a1a10, 1).fillRect(6, 6, 7, h - 16);                                         // el lomo
        g.fillStyle(0xc8a050, 1).fillRect(18, 12, w - 32, 3).fillRect(18, 18, w - 36, 2);
        g.lineStyle(1.5, 0x2a120a, 1).strokeRect(6, 6, w - 14, h - 16);
    }
};

// Dibuja un objeto pequeño; devuelve false si no tiene dibujo propio
export function dibujarObjeto(g, dibujo, ancho, alto) {
    const f = OBJETOS[dibujo];
    if (!f) return false;
    f(g, ancho, alto);
    return true;
}
export const OBJETOS_DIBUJADOS = Object.keys(OBJETOS);

// ── Íconos de interfaz dibujados (en lugar de emojis) ─────────────────────

function textura(escena, clave, ancho, alto, dibujar) {
    if (escena.textures.exists(clave)) return clave;
    const g = escena.make.graphics({ x: 0, y: 0, add: false });
    dibujar(g);
    g.generateTexture(clave, ancho, alto);
    g.destroy();
    return clave;
}

// La libreta del inspector (el ícono de la esquina): un cuaderno de tapas de cuero con su cinta
export function iconoDeLibreta(escena) {
    return textura(escena, 'icono-libreta', 44, 48, g => {
        g.fillStyle(0xeee4c8, 1).fillRect(10, 6, 30, 38);                                           // las hojas
        g.fillStyle(0x6a3a22, 1).fillRoundedRect(6, 4, 30, 40, 3);                                  // la tapa
        g.fillStyle(0x4a2414, 1).fillRect(6, 4, 6, 40);                                              // el lomo
        g.fillStyle(0xd9b25a, 1).fillRect(16, 12, 14, 2).fillRect(16, 17, 10, 2);                    // el título grabado
        g.fillStyle(0xa83a3a, 1).fillRect(28, 40, 4, 8);                                             // la cinta
        g.lineStyle(1.5, 0x2a140a, 1).strokeRoundedRect(6, 4, 30, 40, 3);
    });
}

// La marca de una huella o rastro recién descubierto (aparece un momento sobre el suelo): una lupa dorada
export function iconoDeRastro(escena) {
    return textura(escena, 'icono-rastro', 40, 40, g => {
        g.fillStyle(0x000000, 0.35).fillCircle(17, 17, 14);
        g.fillStyle(0xbfd8f0, 0.35).fillCircle(16, 16, 11);
        g.lineStyle(3.5, 0xd9b25a, 1).strokeCircle(16, 16, 11);
        g.lineStyle(5, 0x6a4a2a, 1).lineBetween(24, 24, 36, 36);
        g.lineStyle(2, 0xffffff, 0.6).lineBetween(10, 12, 13, 9);
    });
}

// Las herramientas de excavación del compartimento bajo el reloj (un pico y una pala cruzados)
export function iconoDeHerramientas(escena) {
    return textura(escena, 'icono-herramientas', 40, 36, g => {
        g.lineStyle(3, 0x7a5a38, 1).lineBetween(6, 32, 32, 6).lineBetween(8, 6, 34, 32);
        g.fillStyle(0x9aa0a8, 1).fillTriangle(26, 2, 38, 8, 30, 12);                                 // la hoja del pico
        g.fillStyle(0x9aa0a8, 1).fillRoundedRect(30, 26, 9, 10, 2);                                  // la pala
        g.fillStyle(0xc8a050, 1).fillCircle(20, 19, 2);                                              // «G. V.»
    });
}

// Un candado pequeño, para las habitaciones todavía cerradas del menú
export function iconoDeCandado(escena) {
    return textura(escena, 'icono-candado', 18, 22, g => {
        g.lineStyle(2.5, 0x9aa0aa, 1).strokeCircle(9, 8, 5);
        g.fillStyle(0x0a0d12, 1).fillRect(4, 6, 10, 4);
        g.fillStyle(0x9aa0aa, 1).fillRoundedRect(2, 9, 14, 12, 2);
        g.fillStyle(0x3a3e46, 1).fillCircle(9, 14, 2).fillRect(8.2, 14, 1.6, 4);
    });
}

// El historial (los textos que ya salieron): un globo de diálogo de papel con renglones
export function iconoDeHistorial(escena) {
    return textura(escena, 'icono-historial', 44, 44, g => {
        g.fillStyle(0xeee4c8, 1).fillRoundedRect(5, 7, 34, 24, 5);
        g.fillTriangle(12, 29, 20, 29, 10, 38);                                                         // la cola del globo
        g.lineStyle(1.5, 0x2a140a, 1).strokeRoundedRect(5, 7, 34, 24, 5);
        g.lineStyle(2, 0x6a3a22, 1).lineBetween(11, 14, 33, 14).lineBetween(11, 19, 33, 19).lineBetween(11, 24, 25, 24);   // renglones
    });
}

// La música: una corchea de marfil. Silenciada: con una raya roja que la tacha
export function iconoDeMusica(escena, silenciada = false) {
    return textura(escena, silenciada ? 'icono-musica-silenciada' : 'icono-musica', 44, 44, g => {
        g.fillStyle(0xeee4c8, 1).fillEllipse(15, 32, 13, 10);                                          // la cabeza de la nota
        g.fillRect(19, 9, 3.5, 23);                                                                     // la plica
        g.fillTriangle(22.5, 9, 33, 16, 22.5, 18);                                                      // el corchete
        g.lineStyle(1.2, 0x2a140a, 1).strokeEllipse(15, 32, 13, 10);
        if (silenciada) g.lineStyle(3.5, 0xa83a3a, 1).lineBetween(7, 38, 37, 6);
    });
}

// El ratón (para el aviso de la linterna): un contorno con el botón izquierdo marcado en dorado
export function iconoDeRaton(escena) {
    return textura(escena, 'icono-raton', 20, 28, g => {
        g.fillStyle(0xd9b25a, 0.9).fillRoundedRect(3, 2, 7, 10, { tl: 6, tr: 0, bl: 0, br: 0 });
        g.lineStyle(1.6, 0xeee4c8, 1).strokeRoundedRect(3, 2, 14, 24, 7);
        g.lineBetween(10, 2, 10, 12).lineBetween(3, 12, 17, 12);
    });
}
