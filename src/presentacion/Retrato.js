// El retrato del inspector (medio cuerpo), PROVISIONAL: se dibuja por código, por capas, con el tamaño exacto del arte final (360 × 480,
// src/motor/Novela.js). Capas, de abajo arriba: cuerpo · cabeza · ojos y cejas · boca · sombrero.
// Cuando exista el arte final (assets/retratos/inspector/<expresion>.png, anotado en disponibles.json) se usa en lugar del dibujado: ver
// assets/retratos/inspector/README.md.
import { EXPRESIONES } from '../motor/Expresiones.js';
import { RETRATO } from '../motor/Novela.js';

export const claveDeRetrato = expresion => `retrato-${expresion}`;
export const claveDelArte = expresion => `retrato-arte-${expresion}`;

const TINTA = '#1a1210';
const PIEL = '#d9a57c', PIEL_SOMBRA = '#b98562';

function forma(ctx, puntos, relleno, borde = TINTA, grosor = 3) {
    ctx.beginPath();
    ctx.moveTo(puntos[0][0], puntos[0][1]);
    for (const p of puntos.slice(1)) {
        if (p.length === 4) ctx.quadraticCurveTo(p[0], p[1], p[2], p[3]);
        else ctx.lineTo(p[0], p[1]);
    }
    ctx.closePath();
    ctx.fillStyle = relleno;
    ctx.fill();
    if (borde) { ctx.lineWidth = grosor; ctx.strokeStyle = borde; ctx.stroke(); }
}
function linea(ctx, puntos, grosor = 4, color = TINTA) {
    ctx.beginPath();
    ctx.moveTo(puntos[0][0], puntos[0][1]);
    for (const p of puntos.slice(1)) {
        if (p.length === 4) ctx.quadraticCurveTo(p[0], p[1], p[2], p[3]);
        else ctx.lineTo(p[0], p[1]);
    }
    ctx.lineWidth = grosor; ctx.lineCap = 'round'; ctx.strokeStyle = color; ctx.stroke();
}
function ovalo(ctx, x, y, rx, ry, relleno, borde = null, grosor = 3) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = relleno; ctx.fill();
    if (borde) { ctx.lineWidth = grosor; ctx.strokeStyle = borde; ctx.stroke(); }
}

// ── Capas ────────────────────────────────────────────────────────────────────

export function capaCuerpo(ctx) {
    // La gabardina: hombros anchos hasta el borde de abajo, solapas, camisa y corbata
    forma(ctx, [[18, 480], [30, 380], [44, 318, 118, 292], [180, 306], [242, 292], [316, 318, 330, 380], [342, 480]], '#4a3b2c');
    forma(ctx, [[130, 292], [180, 420], [230, 292], [180, 306]], '#e8e0cf', TINTA, 2);
    forma(ctx, [[170, 312], [190, 312], [197, 392], [180, 430], [163, 392]], '#7a2430', TINTA, 2);
    forma(ctx, [[118, 292], [182, 440], [150, 450], [78, 340], [102, 332], [92, 312]], '#5d4a36');
    forma(ctx, [[242, 292], [178, 440], [210, 450], [282, 340], [258, 332], [268, 312]], '#5d4a36');
    linea(ctx, [[180, 440], [182, 478]], 3);
    for (const y of [452, 470]) ovalo(ctx, 204, y, 6, 6, '#c9a44a', TINTA, 2);
    linea(ctx, [[70, 400], [64, 478]], 3, '#32271c');
    linea(ctx, [[290, 400], [296, 478]], 3, '#32271c');
}

export function capaCabeza(ctx) {
    forma(ctx, [[152, 250], [152, 300], [180, 318, 208, 300], [208, 250]], PIEL_SOMBRA);
    ovalo(ctx, 111, 186, 13, 22, PIEL, TINTA);
    ovalo(ctx, 249, 186, 13, 22, PIEL, TINTA);
    forma(ctx, [[114, 150], [112, 226, 138, 256], [158, 282, 180, 284], [202, 282, 222, 256], [248, 226, 246, 150], [246, 100, 180, 100], [114, 100, 114, 150]], PIEL);
    // Patillas con canas y la sombra del ala del sombrero
    forma(ctx, [[114, 138], [126, 150], [124, 196], [114, 178]], '#6d655c', null);
    forma(ctx, [[246, 138], [234, 150], [236, 196], [246, 178]], '#6d655c', null);
    ctx.fillStyle = 'rgba(40,20,10,0.28)';
    ctx.fillRect(116, 124, 128, 24);
    linea(ctx, [[180, 186], [172, 222, 168, 228], [180, 234, 190, 229]], 3, PIEL_SOMBRA);      // nariz
}

// Cada ojo: [apertura vertical, mirada x, mirada y, párpado (0 abierto … 1 medio cerrado)]; cejas: [y exterior, y interior] por lado
const GESTOS = {
    neutral: { ojo: [9, 0, 0, 0], cejas: [[158, 160], [160, 158]], boca: 'recta' },
    pensativo: { ojo: [8, 4, -3, 0.35], cejas: [[158, 163], [148, 152]], boca: 'ladeada' },
    sonrisa_ironica: { ojo: [8, 3, 0, 0.45], cejas: [[162, 166], [148, 150]], boca: 'ironica' },
    sorprendido: { ojo: [13, 0, 0, 0], cejas: [[148, 143], [143, 148]], boca: 'abierta' },
    serio: { ojo: [7, 0, 0, 0.4], cejas: [[154, 167], [167, 154]], boca: 'apretada' },
    satisfecho: { ojo: [0, 0, 0, 1], cejas: [[156, 154], [154, 156]], boca: 'sonrisa' }
};

export function capaOjosYCejas(ctx, expresion) {
    const g = GESTOS[expresion] ?? GESTOS.neutral;
    const [apertura, mx, my, parpado] = g.ojo;
    for (const x of [148, 212]) {
        if (!apertura) linea(ctx, [[x - 15, 180], [x, 169, x + 15, 180]], 4);          // ojos cerrados, contentos
        else {
            ovalo(ctx, x, 178, 16, apertura, '#f2ede2', TINTA, 2.5);
            ovalo(ctx, x + mx, 178 + my, 6.5, Math.min(6.5, apertura), '#3a2a1e');
            ovalo(ctx, x + mx + 2, 176 + my, 2, 2, '#ffffff');
            if (parpado) {
                const y = 178 - apertura + apertura * 2 * parpado * 0.5;
                forma(ctx, [[x - 17, 178 - apertura - 3], [x + 17, 178 - apertura - 3], [x + 17, y], [x - 17, y]], PIEL, null);
                linea(ctx, [[x - 16, y], [x + 16, y]], 2.5);
            }
        }
    }
    const [[ie, ii], [di, de]] = g.cejas;
    linea(ctx, [[128, ie], [166, ii]], 7, '#3c2e22');
    linea(ctx, [[194, di], [232, de]], 7, '#3c2e22');
}

export function capaBoca(ctx, expresion) {
    const tipo = (GESTOS[expresion] ?? GESTOS.neutral).boca;
    // Bigote corto, el mismo en todas las expresiones
    forma(ctx, [[150, 244], [164, 236, 180, 242], [196, 236, 210, 244], [196, 250, 180, 247], [164, 250, 150, 244]], '#4a3a2c', null);
    if (tipo === 'recta') linea(ctx, [[162, 259], [198, 259]]);
    else if (tipo === 'ladeada') linea(ctx, [[164, 262], [182, 258, 198, 255]]);
    else if (tipo === 'ironica') { linea(ctx, [[158, 261], [186, 266, 206, 250]], 4.5); linea(ctx, [[205, 247], [210, 255]], 3); }
    else if (tipo === 'abierta') ovalo(ctx, 180, 263, 12, 14, '#4a1a18', TINTA, 3);
    else if (tipo === 'apretada') { linea(ctx, [[160, 263], [180, 255, 200, 263]], 4.5); }
    else if (tipo === 'sonrisa') forma(ctx, [[154, 253], [180, 258, 206, 253], [196, 276, 180, 276], [164, 276, 154, 253]], '#f4efe4', TINTA, 3);
}

export function capaSombrero(ctx) {
    forma(ctx, [[122, 118], [126, 52, 152, 46], [180, 62, 208, 46], [234, 52, 238, 118]], '#4a3b2c');
    forma(ctx, [[122, 100], [238, 100], [240, 122], [120, 122]], '#7a2430', TINTA, 2);
    forma(ctx, [[66, 128], [100, 110, 180, 114], [260, 110, 294, 128], [262, 144, 180, 136], [98, 144, 66, 128]], '#3d3024');
    linea(ctx, [[152, 48], [180, 78, 208, 48]], 3, '#2a2018');
}

export const CAPAS = [
    ['cuerpo', capaCuerpo], ['cabeza', capaCabeza], ['ojos y cejas', capaOjosYCejas], ['boca', capaBoca], ['sombrero', capaSombrero]
];

export function dibujarRetrato(ctx, expresion) {
    for (const [, capa] of CAPAS) capa(ctx, expresion);
}

// Crea las seis texturas dibujadas (una vez)
export function generarRetratos(escena) {
    for (const expresion of EXPRESIONES) {
        const clave = claveDeRetrato(expresion);
        if (escena.textures.exists(clave)) continue;
        const textura = escena.textures.createCanvas(clave, RETRATO.ancho, RETRATO.alto);
        dibujarRetrato(textura.getContext(), expresion);
        textura.refresh();
    }
}

// La textura que toca: el arte final si se cargó; si no, el dibujado
export function texturaDeRetrato(escena, expresion) {
    if (escena.textures.exists(claveDelArte(expresion))) return claveDelArte(expresion);
    generarRetratos(escena);
    return claveDeRetrato(expresion);
}
