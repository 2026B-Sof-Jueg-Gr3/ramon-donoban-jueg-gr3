// La caja grande de novela visual: la placa del nombre, el retrato que acompaña, el indicador de continuar y que no se encima con nada.
// La máquina de escribir y sus temporizadores por identidad no cambiaron: sus pruebas siguen en temporizadores.test.mjs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearEscena } from './escenaSimulada.mjs';
import { disposicionDeNovela, ladoDelRetrato, RETRATO } from '../src/motor/Novela.js';
import { rectangulosSeSolapan } from './ayudasDeNovela.mjs';
import { LECTURA } from '../src/ui/tiemposDeLectura.js';

const { default: DialogoPrincipal, NOMBRE } = await import('../src/ui/DialogoPrincipal.js');

function montar() {
    const escena = crearEscena({ ancho: 1280, alto: 720 });
    const llamadas = [];
    const decorado = { mostrar: texto => llamadas.push(['mostrar', texto]), ocultar: () => llamadas.push(['ocultar']) };
    const dialogo = new DialogoPrincipal(escena, () => { }, { decorado });
    dialogo.reposicionar(disposicionDeNovela(1280, 720).zona, { x: 0, y: 0, ancho: 1280, alto: 720 });
    return { escena, dialogo, llamadas };
}
const textos = dialogo => dialogo.panel.list.filter(o => typeof o.text === 'string').map(o => o.text);

test('el retrato mide exactamente 360 × 480 y ni él ni la caja se salen de la pantalla ni se enciman, a cualquier lado', () => {
    assert.deepEqual([RETRATO.ancho, RETRATO.alto], [360, 480]);
    for (const lado of ['izquierda', 'derecha']) {
        const { retrato, zona } = disposicionDeNovela(1280, 720, lado);
        for (const r of [retrato, zona]) assert.ok(r.x >= 0 && r.y >= 0 && r.x + r.ancho <= 1280 && r.y + r.alto <= 720, `${lado}: ${JSON.stringify(r)}`);
        assert.equal(rectangulosSeSolapan(retrato, zona), false, lado);
        assert.ok(zona.ancho >= 880, 'la caja es grande');
        assert.equal(retrato.y + retrato.alto, 720, 'el cuerpo llega al borde de abajo');
        // el panel de las tarjetas (330 × 354 arriba, al lado contrario) tampoco se encima
        const panel = { x: lado === 'izquierda' ? 1280 - 24 - 330 : 24, y: 24, ancho: 330, alto: 330 };
        assert.equal(rectangulosSeSolapan(retrato, panel), false, `${lado}: retrato y tarjetas`);
        assert.equal(rectangulosSeSolapan(zona, panel), false, `${lado}: caja y tarjetas`);
    }
    assert.equal(ladoDelRetrato('izquierda', true), 'derecha', 'si las tarjetas están a la izquierda, el retrato va a la derecha');
    assert.equal(ladoDelRetrato('izquierda', false), 'izquierda');
    assert.equal(ladoDelRetrato('derecha', true), 'izquierda');
});

test('la caja lleva la placa «INSPECTOR LÓGICA» y pide al decorado el retrato de ese texto', () => {
    const { dialogo, llamadas } = montar();
    dialogo.abrir('Una línea importante.', {});
    assert.equal(NOMBRE, 'INSPECTOR LÓGICA');
    assert.ok(textos(dialogo).includes(NOMBRE));
    assert.deepEqual(llamadas, [['mostrar', 'Una línea importante.']]);
    dialogo.cerrar();
    assert.deepEqual(llamadas.at(-1), ['ocultar']);
});

test('la máquina de escribir con el ritmo de siempre; la flecha de continuar solo cuando está escrito', () => {
    const { escena, dialogo } = montar();
    const texto = 'Una línea para escribir letra a letra.';
    dialogo.abrir(texto, {});
    assert.equal(dialogo.cuerpo.text, '');
    assert.equal(dialogo.flecha.visible, false);
    escena.cuadro(LECTURA.escrituraDialogoPorLetraMs);
    assert.equal(dialogo.cuerpo.text.length, 1);
    for (let i = 0; i < texto.length + 5; i++) escena.cuadro(LECTURA.escrituraDialogoPorLetraMs);
    assert.equal(dialogo.cuerpo.text.replace(/\n/g, ' '), texto);
    assert.equal(dialogo.flecha.visible, true);
    assert.match(dialogo.pista.text, /para continuar/);
});

test('el título propio de una página (los planos) se ve dentro de la caja; el del inspector solo en la placa', () => {
    const { dialogo } = montar();
    dialogo.abrir('Texto.', { titulo: '📜 PLANOS DE LA MANSIÓN' });
    assert.ok(textos(dialogo).includes('📜 PLANOS DE LA MANSIÓN'));
    assert.equal(textos(dialogo).filter(t => t === NOMBRE).length, 1);
    dialogo.abrir('Otro texto.', {});
    assert.equal(textos(dialogo).filter(t => t.includes('INSPECTOR')).length, 1);
});
