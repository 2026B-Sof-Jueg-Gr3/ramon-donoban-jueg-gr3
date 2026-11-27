// Anota en assets/sprites/disponibles.json los PNG de arte final que haya en la carpeta. Correr después de añadir o quitar un dibujo:
//   node herramientas/listar_sprites.mjs
// (El juego no puede preguntar al servidor qué archivos existen sin llenar la consola de errores 404, así que lee esta lista.)
// Cada PNG se llama como la clave del dibujo que reemplaza (inspector.png, mueble-armario.png, item-taza.png…): las claves y los tamaños
// están en docs/arte_actual/LEEME.md.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';

const carpeta = new URL('../assets/sprites/', import.meta.url);
const lista = new URL('disponibles.json', carpeta);
const archivos = readdirSync(carpeta).filter(n => /^[a-zA-Z0-9_-]+\.png$/.test(n)).sort();
const raros = readdirSync(carpeta).filter(n => n.toLowerCase().endsWith('.png') && !archivos.includes(n));
const datos = JSON.parse(readFileSync(lista, 'utf8'));
writeFileSync(lista, JSON.stringify({ ...datos, archivos }, null, 2) + '\n');
console.log(`Dibujos anotados: ${archivos.join(', ') || 'ninguno (todo se dibuja por código)'}`);
if (raros.length) console.warn(`OJO, nombres con espacios o caracteres raros, no se usan: ${raros.join(', ')}`);
