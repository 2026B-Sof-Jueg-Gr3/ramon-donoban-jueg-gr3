// Ayudas compartidas por las pruebas
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import Nivel from '../src/modelo/Nivel.js';
import Direccion from '../src/modelo/Direccion.js';

const RAIZ = new URL('../', import.meta.url);
export const leerArchivo = ruta => readFileSync(new URL(ruta, RAIZ), 'utf8');
export const soluciones = JSON.parse(leerArchivo('assets/niveles/soluciones.json'));
export const LETRA = { u: Direccion.ARRIBA, d: Direccion.ABAJO, l: Direccion.IZQUIERDA, r: Direccion.DERECHA };

export const textoDeNivel = n => leerArchivo(`assets/niveles/nivel${n}.txt`);
export const entidadesDeNivel = n => JSON.parse(leerArchivo(`assets/niveles/nivel${n}.entidades.json`));
export const cargarNivel = n => new Nivel(n, textoDeNivel(n), entidadesDeNivel(n));

// Nivel de prueba a partir de capas escritas como listas de filas
export function nivelDePrueba({ terreno, sokoban = [], obstaculos = [] }, entidades = {}) {
    const texto = `[terreno]\n${terreno.join('\n')}\n[obstaculos]\n${obstaculos.join('\n')}\n[sokoban]\n${sokoban.join('\n')}\n`;
    return new Nivel(1, texto, entidades);
}

// Ejecuta una secuencia udlr/UDLR y comprueba que cada letra sea un paso válido del tipo indicado
export function jugar(nivel, secuencia) {
    for (const [i, letra] of [...secuencia].entries()) {
        const resultado = nivel.mover(LETRA[letra.toLowerCase()]);
        assert.ok(resultado, `el movimiento ${i} ('${letra}') fue rechazado`);
        const empuja = letra === letra.toUpperCase();
        assert.equal(!!resultado.caja, empuja, `el movimiento ${i} ('${letra}') ${empuja ? 'debía' : 'no debía'} empujar una caja`);
    }
}

export const posiciones = nivel => ({
    personaje: [nivel.getPersonaje().fila, nivel.getPersonaje().columna],
    cajas: nivel.getEscenario().getCajas().map(c => [c.id, c.fila, c.columna])
});
