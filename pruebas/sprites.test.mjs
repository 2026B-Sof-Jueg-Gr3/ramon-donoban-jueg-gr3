// El arte final que reemplaza a los dibujos hechos por código (assets/sprites/): todo PNG de la carpeta tiene que estar anotado en
// disponibles.json (si no, el juego no lo carga) y tener el tamaño exacto del dibujo que reemplaza (si no, no encaja con las colisiones).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';

const RAIZ = new URL('../', import.meta.url);
const carpeta = new URL('assets/sprites/', RAIZ);
const anotados = JSON.parse(readFileSync(new URL('disponibles.json', carpeta), 'utf8')).archivos;

// Ancho y alto de un PNG, leídos de su cabecera
function tamanoPng(url) {
    const datos = readFileSync(url);
    assert.equal(datos.toString('latin1', 1, 4), 'PNG', `${url.pathname} no es un PNG`);
    return { ancho: datos.readUInt32BE(16), alto: datos.readUInt32BE(20) };
}

// Tamaño de los dibujos que ya tienen arte final (el mismo que el dibujo por código: ver docs/arte_actual/LEEME.md)
const TAMANOS = { inspector: { ancho: 36, alto: 58 } };

test('todo PNG de assets/sprites está anotado en disponibles.json, y nada anotado falta', () => {
    const enLaCarpeta = readdirSync(carpeta).filter(f => f.endsWith('.png')).sort();
    assert.deepEqual([...anotados].sort(), enLaCarpeta, 'correr: node herramientas/listar_sprites.mjs');
});

test('cada dibujo de arte final tiene el tamaño exacto del dibujo que reemplaza', () => {
    for (const archivo of anotados) {
        const clave = archivo.replace('.png', '');
        const esperado = TAMANOS[clave];
        assert.ok(esperado, `${archivo}: agrega su tamaño a TAMANOS (sale en docs/arte_actual/LEEME.md)`);
        assert.deepEqual(tamanoPng(new URL(archivo, carpeta)), esperado, archivo);
    }
});
