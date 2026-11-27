// Qué expresión pone el inspector en cada línea importante. Es un DATO (assets/presentacion/expresiones.json), no texto: la clave de cada
// línea es "intro", el id de su regla ("revelacion:0", "pista:n5-pista-planos"), "cierre" o "error". Sin Phaser.
export const EXPRESIONES = Object.freeze(['neutral', 'pensativo', 'sonrisa_ironica', 'sorprendido', 'serio', 'satisfecho']);
export const EXPRESION_POR_DEFECTO = 'neutral';

// La clave de un acontecimiento: su regla si la tiene; el cierre y el error, su categoría
export function claveDeLinea(evento) {
    return evento?.regla ?? evento?.categoria ?? null;
}

export function expresionDe(tabla, nivel, clave) {
    const expresion = tabla?.niveles?.[nivel]?.[clave];
    return EXPRESIONES.includes(expresion) ? expresion : EXPRESION_POR_DEFECTO;
}

// La ilustración de escena que acompaña a una línea importante (assets/ilustraciones/lista.json), o null. Solo decora.
export function ilustracionDe(tabla, nivel, clave) {
    const nombre = tabla?.niveles?.[nivel]?.[clave];
    return typeof nombre === 'string' && nombre ? nombre : null;
}

// La clave de la textura de una ilustración
export function claveDeIlustracion(nombre) {
    return `ilustracion-${nombre}`;
}

// Las líneas importantes de un nivel: las reglas "importante" más el cierre y el error de la narrativa
export function lineasImportantes(reglas) {
    return [...reglas.reglas.filter(r => r.clase === 'importante').map(r => r.id), 'cierre', 'error'];
}

// Problemas de la tabla: líneas sin expresión, expresiones desconocidas o claves que no son líneas importantes
export function validarExpresiones(tabla, reglasPorNivel) {
    const errores = [];
    for (const [nivel, reglas] of Object.entries(reglasPorNivel)) {
        const lineas = lineasImportantes(reglas);
        const del = tabla?.niveles?.[nivel] ?? {};
        for (const linea of lineas) {
            if (!(linea in del)) errores.push(`nivel ${nivel}: la línea "${linea}" no tiene expresión`);
            else if (!EXPRESIONES.includes(del[linea])) errores.push(`nivel ${nivel}: "${del[linea]}" no es una expresión`);
        }
        for (const linea of Object.keys(del)) if (!lineas.includes(linea)) errores.push(`nivel ${nivel}: "${linea}" no es una línea importante`);
    }
    return errores;
}
