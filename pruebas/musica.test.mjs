// La música de fondo: qué canción suena en cada pantalla, y que la lista apunte a archivos que existen.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { pistasValidas, parteDeLaEscena, PARTES } from '../src/motor/ListaDeMusica.js';

const RAIZ = new URL('../', import.meta.url);
const lista = JSON.parse(readFileSync(new URL('assets/musica/lista.json', RAIZ), 'utf8'));

test('el inicio (menú, preámbulo, habitaciones, pantalla provisional) usa la música del inicio', () => {
    for (const escena of ['MenuPrincipal', 'Interludio', 'MenuNiveles', 'EnConstruccion']) assert.equal(parteDeLaEscena({ escena }), 'inicio', escena);
});

test('cada habitación y su informe usan la música de esa habitación', () => {
    for (let n = 1; n <= 6; n++) assert.equal(parteDeLaEscena({ escena: 'Habitacion', nivel: n }), `nivel${n}`);
    for (let n = 1; n <= 5; n++) assert.equal(parteDeLaEscena({ escena: 'Informe', nivel: n }), `nivel${n}`);
});

test('el final: desde el cierre de la última habitación, su informe y los créditos del final', () => {
    assert.equal(parteDeLaEscena({ escena: 'Habitacion', nivel: 6, final: true }), 'final');
    assert.equal(parteDeLaEscena({ escena: 'Informe', nivel: 6 }), 'final');
    assert.equal(parteDeLaEscena({ escena: 'MenuPrincipal', creditos: true }), 'final');
    assert.equal(parteDeLaEscena({ escena: 'MenuPrincipal' }), 'inicio');
});

test('pistasValidas: solo partes conocidas con un archivo de audio, sin rutas', () => {
    assert.deepEqual(pistasValidas({ pistas: { inicio: 'a.ogg', nivel1: '../b.ogg', nivel2: 'c.txt', otra: 'd.ogg', final: 'e.MP3' } }), { inicio: 'a.ogg', final: 'e.MP3' });
    assert.deepEqual(pistasValidas(null), {});
    assert.deepEqual(pistasValidas({ pistas: ['a.ogg'] }), {});
});

test('cada canción de assets/musica/lista.json existe en la carpeta', () => {
    const validas = pistasValidas(lista);
    for (const [parte, archivo] of Object.entries(lista.pistas ?? {})) {
        assert.ok(PARTES.includes(parte), `parte desconocida: ${parte}`);
        assert.equal(validas[parte], archivo, `${parte}: nombre de archivo no válido`);
        assert.ok(existsSync(new URL(`assets/musica/${archivo}`, RAIZ)), `${parte}: falta assets/musica/${archivo}`);
    }
});
