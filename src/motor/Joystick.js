// El joystick táctil: de dónde está el pulgar a qué flechas hay que mantener apretadas. Sin Phaser ni DOM, para probarlo en Node.
// El juego se mueve en 8 direcciones con las flechas (src/motor/Movimiento.js), así que el joystick no inventa otro movimiento:
// elige el sector de 45° más cercano y aprieta esas flechas. Cerca del centro (la zona muerta) no aprieta nada.
export const ZONA_MUERTA = 0.28;          // fracción del radio
export const FLECHAS = Object.freeze(['izquierda', 'derecha', 'arriba', 'abajo']);

// dx, dy: desplazamiento del pulgar desde el centro (en px; y hacia abajo positivo) · radio: el del aro del joystick
// Devuelve { izquierda, derecha, arriba, abajo } (booleanos)
export function flechasDelJoystick(dx, dy, radio) {
    const nada = { izquierda: false, derecha: false, arriba: false, abajo: false };
    if (!(radio > 0) || Math.hypot(dx, dy) < radio * ZONA_MUERTA) return nada;
    // 0 = derecha, sentido horario (y hacia abajo); se redondea al octante más cercano
    const octante = ((Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) % 8) + 8) % 8;
    return {
        derecha: octante === 7 || octante === 0 || octante === 1,
        abajo: octante === 1 || octante === 2 || octante === 3,
        izquierda: octante === 3 || octante === 4 || octante === 5,
        arriba: octante === 5 || octante === 6 || octante === 7
    };
}

// El pomo no sale del aro: devuelve el desplazamiento recortado al radio
export function limitarAlAro(dx, dy, radio) {
    const d = Math.hypot(dx, dy);
    if (d <= radio || d === 0) return { x: dx, y: dy };
    return { x: (dx / d) * radio, y: (dy / d) * radio };
}

// Qué flechas hay que soltar y cuáles apretar para pasar de `antes` a `ahora`
export function cambiosDeFlechas(antes, ahora) {
    return {
        soltar: FLECHAS.filter(f => antes[f] && !ahora[f]),
        apretar: FLECHAS.filter(f => !antes[f] && ahora[f])
    };
}
