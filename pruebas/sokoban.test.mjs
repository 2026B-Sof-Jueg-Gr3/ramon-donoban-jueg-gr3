// Pruebas del modelo de Sokoban (sin Phaser). Ejecutar desde la raíz:  node --test "pruebas/*.test.mjs"
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TOTAL_NIVELES } from '../src/modelo/Nivel.js';
import Direccion from '../src/modelo/Direccion.js';
import { soluciones, cargarNivel, nivelDePrueba, jugar, posiciones } from './utilidades.mjs';

for (let n = 1; n <= TOTAL_NIVELES; n++) {
    for (const criterio of ['recordPasos', 'recordEmpujones']) {
        test(`nivel ${n}: la solución de ${criterio} completa el nivel con los contadores exactos`, () => {
            const { solucion, pasos, empujones } = soluciones[n][criterio];
            const nivel = cargarNivel(n);
            jugar(nivel, solucion.slice(0, -1));
            assert.equal(nivel.estaCompletado(), false, 'no debe completarse antes del último movimiento');
            jugar(nivel, solucion.slice(-1));
            assert.equal(nivel.estaCompletado(), true);
            assert.equal(nivel.getMovimientos(), pasos);
            assert.equal(nivel.getEmpujones(), empujones);
        });
    }

    test(`nivel ${n}: deshacer toda la solución devuelve exactamente el estado inicial`, () => {
        const nivel = cargarNivel(n);
        const inicial = posiciones(nivel);
        const { solucion } = soluciones[n].recordPasos;
        jugar(nivel, solucion);
        for (let i = 0; i < solucion.length; i++) assert.ok(nivel.deshacer());
        assert.equal(nivel.deshacer(), null, 'sin historial, deshacer no hace nada');
        assert.deepEqual(posiciones(nivel), inicial);
        assert.equal(nivel.getMovimientos(), 0);
        assert.equal(nivel.getEmpujones(), 0);
        assert.equal(nivel.estaCompletado(), false);
    });
}

test('reglas: no se atraviesan paredes ni muebles, ni se empujan dos cajas o una caja contra la pared', () => {
    // Nivel 1:  inicio (3,4); cajas en (2,3), (4,3) y (5,3); pared en el borde
    const nivel = cargarNivel(1);
    jugar(nivel, 'lll');                                  // (3,1)
    assert.equal(nivel.mover(Direccion.IZQUIERDA), null, 'pared');
    assert.equal(nivel.getMovimientos(), 3, 'un choque no cuenta como paso');
    const fila = nivelDePrueba({ terreno: ['#####', '#   .', '#####'], sokoban: ['', ' @AB'] });
    assert.equal(fila.mover(Direccion.DERECHA), null, 'dos cajas seguidas no se empujan');
    const contraPared = nivelDePrueba({ terreno: ['####', '#  #', '####'], sokoban: ['', ' @A'] });
    assert.equal(contraPared.mover(Direccion.DERECHA), null, 'una caja contra la pared no se mueve');
    const mueble = nivelDePrueba({ terreno: ['#####', '#   #', '#####'], obstaculos: ['', '  m'], sokoban: ['', ' @'] },
        { obstaculos: [{ id: 'm1', tipo: 'mueble', en: [1, 2] }] });
    assert.equal(mueble.mover(Direccion.DERECHA), null, 'un mueble bloquea el paso');
    assert.equal(mueble.muebleDelante(Direccion.DERECHA).id, 'm1');
    const cajaContraMueble = nivelDePrueba({ terreno: ['######', '#    #', '######'], obstaculos: ['', '    m'], sokoban: ['', ' @A'] },
        { obstaculos: [{ id: 'm1', tipo: 'mueble', en: [1, 4] }] });
    assert.ok(cajaContraMueble.mover(Direccion.DERECHA), 'la caja avanza hasta el mueble');
    assert.equal(cajaContraMueble.mover(Direccion.DERECHA), null, 'una caja contra un mueble no se mueve');
});

test('sin energía: 500 pasos de caminata no impiden moverse ni completar el nivel', () => {
    const nivel = cargarNivel(1);
    jugar(nivel, 'rl'.repeat(250));
    const { solucion, pasos, empujones } = soluciones[1].recordPasos;
    jugar(nivel, solucion);
    assert.equal(nivel.estaCompletado(), true);
    assert.equal(nivel.getMovimientos(), 500 + pasos);
    assert.equal(nivel.getEmpujones(), empujones);
});

test('deshacer un empujón resta un paso y un empujón; deshacer una caminata solo resta un paso', () => {
    const nivel = cargarNivel(1);
    jugar(nivel, 'lluRR');                     // 5 pasos, 2 empujones
    assert.deepEqual([nivel.getMovimientos(), nivel.getEmpujones()], [5, 2]);
    nivel.deshacer();
    assert.deepEqual([nivel.getMovimientos(), nivel.getEmpujones()], [4, 1]);
    nivel.deshacer(); nivel.deshacer();
    assert.deepEqual([nivel.getMovimientos(), nivel.getEmpujones()], [2, 0]);
});

test('una caja sobre su destino puede volver a salir (retirada)', () => {
    const nivel = nivelDePrueba({ terreno: ['######', '#  . #', '######'], sokoban: ['', ' @A'] });
    assert.equal(nivel.mover(Direccion.DERECHA).colocada, true);
    const salida = nivel.mover(Direccion.DERECHA);
    assert.equal(salida.retirada, true);
    assert.equal(nivel.estaCompletado(), false);
});

test('una caja que empieza sobre su destino cuenta como colocada', () => {
    const nivel = nivelDePrueba({ terreno: ['#####', '#  .#', '#  .#', '#####'], sokoban: ['', '   A', ' @B'] });
    assert.equal(nivel.getEscenario().puntosDeLlegadaFinalizados(), 1);
    assert.equal(nivel.mover(Direccion.DERECHA).colocada, true);
    assert.equal(nivel.estaCompletado(), true);
});
