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

test('la caja lleva el nombre «SILAS VANE» y pide al decorado el retrato de ese texto', () => {
    const { dialogo, llamadas } = montar();
    dialogo.abrir('Una línea importante.', {});
    assert.equal(NOMBRE, 'SILAS VANE');
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

test('el título propio de una página (los planos) se ve dentro de la caja; el del inspector solo en su nombre', () => {
    const { dialogo } = montar();
    dialogo.abrir('Texto.', { titulo: '📜 PLANOS DE LA MANSIÓN' });
    assert.ok(textos(dialogo).includes('📜 PLANOS DE LA MANSIÓN'));
    assert.equal(textos(dialogo).filter(t => t === NOMBRE).length, 1);
    dialogo.abrir('Otro texto.', {});
    assert.equal(textos(dialogo).filter(t => t.includes(NOMBRE)).length, 1);
});

// ── Textos en tramos (\f): cada tramo en sus páginas y un aviso al empezar a verse cada uno ──

const { CORTE } = await import('../src/ui/DialogoPrincipal.js');
const { default: Juguetes } = await import('../src/presentacion/habitaciones/Juguetes.js');

function conTramos() {
    const escena = crearEscena({ ancho: 1280, alto: 720 });
    const avisos = [];
    const dialogo = new DialogoPrincipal(escena, () => { }, { alMostrarTramo: (i, texto) => avisos.push([i, texto, dialogo.pagina]) });
    const zona = disposicionDeNovela(1280, 720).zona, velo = { x: 0, y: 0, ancho: 1280, alto: 720 };
    dialogo.reposicionar(zona, velo);
    const redibujar = () => dialogo.reposicionar(zona, velo);
    return { escena, dialogo, avisos, redibujar };
}
const LARGO_DE_TRAMO = Array.from({ length: 220 }, (_, i) => `pista${i}`).join(' ');        // más de una página
const unaLinea = paginas => paginas.join('\n').replace(/\n/g, ' ');

test('ninguna página mezcla dos tramos y la marca no aparece en ninguna', () => {
    const { escena, dialogo } = conTramos();
    const tramos = ['Primero.', 'Segundo.', 'Tercero.'];
    dialogo.abrir(tramos.join(CORTE), {});
    assert.equal(CORTE, '\f');
    assert.deepEqual(dialogo.paginas, tramos);
    assert.deepEqual(dialogo.tramoDePagina, [0, 1, 2]);
    for (const [i, tramo] of tramos.entries()) {
        for (let n = 0; n < 40 && dialogo.escritura; n++) { escena.cuadro(LECTURA.escrituraDialogoPorLetraMs); assert.ok(!dialogo.cuerpo.text.includes(CORTE)); }
        assert.equal(dialogo.cuerpo.text, tramo, `página ${i + 1}`);
        if (i < 2) dialogo.alTocar();
    }
});

test('un tramo largo ocupa varias páginas sin perder texto', () => {
    const { dialogo } = conTramos();
    const texto = ['Antes.', LARGO_DE_TRAMO, 'Después.'].join(CORTE);
    dialogo.abrir(texto, {});
    const delTramo = n => dialogo.paginas.filter((_, i) => dialogo.tramoDePagina[i] === n);
    assert.ok(delTramo(1).length >= 2, `${delTramo(1).length} páginas`);
    assert.equal(unaLinea(delTramo(1)), LARGO_DE_TRAMO);
    assert.equal(unaLinea(dialogo.paginas), texto.replaceAll(CORTE, ' '));
    assert.ok(dialogo.paginas.every(p => !p.includes(CORTE)));
});

test('alMostrarTramo: una vez por tramo y en orden, al empezar su primera página, aunque un tramo ocupe varias o la caja se redibuje', () => {
    const { escena, dialogo, avisos, redibujar } = conTramos();
    const texto = ['Antes.', LARGO_DE_TRAMO, 'Después.'].join(CORTE);
    for (const apertura of [1, 2]) {              // al volver a abrirlo, vuelve a avisar
        avisos.length = 0;
        dialogo.abrir(texto, { alCerrar: () => dialogo.cerrar() });
        assert.deepEqual(avisos.map(a => a[0]), [0], 'al abrir, antes de escribir nada');
        redibujar();
        for (let guardia = 0; dialogo.abierto && guardia < 40; guardia++) {
            escena.cuadros(2, LECTURA.escrituraDialogoPorLetraMs);
            redibujar();                            // se muestra completa sin escribir
            redibujar();
            dialogo.alTocar();
        }
        assert.deepEqual(avisos.map(a => a[0]), [0, 1, 2], `apertura ${apertura}`);
        assert.ok(avisos.every(a => a[1] === texto), 'llega el texto completo');
        for (const [tramo, , pagina] of avisos) assert.equal(pagina, dialogo.tramoDePagina.indexOf(tramo), 'en su primera página');
    }
});

test('la silueta del nivel 4 cruza al aparecer la segunda página, una sola vez, y el informe espera a que termine', () => {
    const escena = crearEscena();
    const silueta = { x: 0, alpha: 1, setPosition(x) { silueta.x = x; return silueta; }, setAlpha(a) { silueta.alpha = a; return silueta; } };
    const preparar = () => {
        const j = new Juguetes(escena);
        Object.assign(j, { silueta, ventana: { x: 1000, y: 100, ancho: 60, alto: 80 } });
        j.alIniciarCierre();
        return j;
    };
    const j = preparar();
    assert.deepEqual([silueta.x, silueta.alpha], [970, 0], 'oculta en su punto de partida');
    escena.cuadros(300);
    assert.equal(silueta.x, 970, 'no cruza sola');
    j.alMostrarTramoDelCierre(0);
    escena.cuadros(300);
    assert.equal(silueta.x, 970);
    let informe = 0;
    j.alMostrarTramoDelCierre(1);
    j.alMostrarTramoDelCierre(1);
    escena.cuadros(20);
    j.alTerminarCierre(() => informe++);
    assert.equal(informe, 0, 'todavía está cruzando');
    escena.cuadros(200);                          // 3,2 s
    assert.deepEqual([informe, silueta.x, silueta.alpha], [1, 1090, 0]);
    silueta.x = 970;
    j.alMostrarTramoDelCierre(1);
    escena.cuadros(300);
    assert.equal(silueta.x, 970, 'no vuelve a cruzar');
    j.alTerminarCierre(() => informe++);
    assert.equal(informe, 2, 'si ya terminó, sigue enseguida');
    const sinCruce = preparar();
    sinCruce.alTerminarCierre(() => informe++);
    assert.equal(informe, 3, 'si nunca empezó, también');
});
