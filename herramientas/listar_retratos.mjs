// Anota en assets/retratos/inspector/disponibles.json los PNG de arte final que haya en la carpeta. Correr después de añadir o quitar un retrato:
//   node herramientas/listar_retratos.mjs
// (El juego no puede preguntar al servidor qué archivos existen sin llenar la consola de errores 404, así que lee esta lista.)
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { EXPRESIONES } from '../src/motor/Expresiones.js';

const carpeta = new URL('../assets/retratos/inspector/', import.meta.url);
const lista = new URL('disponibles.json', carpeta);
const archivos = EXPRESIONES.map(e => `${e}.png`).filter(nombre => readdirSync(carpeta).includes(nombre));
const otros = readdirSync(carpeta).filter(n => n.toLowerCase().endsWith('.png') && !archivos.includes(n));
const datos = JSON.parse(readFileSync(lista, 'utf8'));
writeFileSync(lista, JSON.stringify({ ...datos, archivos }, null, 2) + '\n');
console.log(`Retratos anotados: ${archivos.join(', ') || 'ninguno (se usa el dibujado por código)'}`);
if (otros.length) console.warn(`OJO, no coinciden con ninguna expresión y no se usan: ${otros.join(', ')}`);
