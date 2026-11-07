// Lectura del formato por capas de assets/niveles/nivelN.txt. Debe coincidir con herramientas/validar_niveles.py
//
//   ; comentario
//   [terreno]     # pared · (espacio) suelo · . destino
//   [obstaculos]  m mueble
//   [sokoban]     A-Z caja (la letra es su ID) · @ inicio del inspector
//
// El terreno fija el tamaño. En las otras capas los espacios finales y las filas finales vacías se pueden omitir.
export const CAPAS = ['terreno', 'obstaculos', 'sokoban'];
const VALIDOS = {
    terreno: /^[# .]$/,
    obstaculos: /^[ m]$/,
    sokoban: /^[ @A-Z]$/
};

export function leerCapas(texto) {
    const capas = {};
    let actual = null;
    for (const linea of texto.split(/\r?\n/)) {
        if (linea.startsWith(';')) continue;
        const seccion = linea.trim().match(/^\[(\w+)\]$/);
        if (seccion) {
            const nombre = seccion[1];
            if (!CAPAS.includes(nombre)) throw new Error(`capa desconocida [${nombre}]`);
            if (capas[nombre]) throw new Error(`la capa [${nombre}] está repetida`);
            actual = capas[nombre] = [];
            continue;
        }
        if (actual === null) {
            if (linea.trim() !== '') throw new Error('hay texto antes de la primera capa');
            continue;
        }
        actual.push(linea.replace(/\s+$/, ''));
    }
    if (!capas.terreno) throw new Error('falta la capa [terreno]');
    for (const nombre of CAPAS) {
        const filas = capas[nombre] || (capas[nombre] = []);
        while (filas.length && filas[filas.length - 1] === '') filas.pop();
    }

    const filas = capas.terreno.length;
    const columnas = Math.max(...capas.terreno.map(l => l.length));
    for (const nombre of CAPAS) {
        if (capas[nombre].length > filas) throw new Error(`la capa [${nombre}] tiene más filas que el terreno`);
        capas[nombre].forEach((linea, f) => {
            if (linea.length > columnas) throw new Error(`la capa [${nombre}] es más ancha que el terreno en la fila ${f}`);
            [...linea].forEach((simbolo, c) => {
                if (!VALIDOS[nombre].test(simbolo)) throw new Error(`símbolo "${simbolo}" no válido en [${nombre}], fila ${f}, columna ${c}`);
            });
        });
    }
    return {
        filas,
        columnas,
        // Símbolo de una capa en esa casilla; ' ' si la fila es más corta o no existe
        en: (nombre, f, c) => capas[nombre][f]?.[c] ?? ' '
    };
}
