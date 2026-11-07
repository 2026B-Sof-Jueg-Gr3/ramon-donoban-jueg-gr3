// Etapa 2: formato por capas, entidades fuera de la matriz, IDs persistentes, sucesos y consultas espaciales
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { leerCapas } from '../src/modelo/FormatoNivel.js';
import Direccion from '../src/modelo/Direccion.js';
import { TOTAL_NIVELES } from '../src/modelo/Nivel.js';
import { cargarNivel, entidadesDeNivel, nivelDePrueba, jugar, posiciones, soluciones } from './utilidades.mjs';

// ── Formato ─────────────────────────────────────────────────────────────────

test('formato: capas, comentarios, filas finales omitidas y errores claros', () => {
    const capas = leerCapas('; comentario\n[terreno]\n####\n#. #\n####\n[sokoban]\n\n @\n');
    assert.deepEqual([capas.filas, capas.columnas], [3, 4]);
    assert.equal(capas.en('terreno', 1, 1), '.');
    assert.equal(capas.en('sokoban', 1, 1), '@');
    assert.equal(capas.en('sokoban', 1, 2), ' ', 'los espacios finales omitidos cuentan como vacío');
    assert.equal(capas.en('obstaculos', 1, 1), ' ', 'una capa ausente está vacía');
    assert.throws(() => leerCapas('[sokoban]\n@\n'), /falta la capa \[terreno\]/);
    assert.throws(() => leerCapas('[terreno]\n###\n[muebles]\n'), /capa desconocida/);
    assert.throws(() => leerCapas('[terreno]\n#x#\n'), /símbolo "x" no válido/);
    assert.throws(() => leerCapas('[terreno]\n###\n[sokoban]\n\n\n@\n'), /más filas que el terreno/);
    assert.throws(() => nivelDePrueba({ terreno: ['####', '#  #', '####'], sokoban: ['', ' AA'] }), /no está|repetida|inicio/);
    assert.throws(() => nivelDePrueba({ terreno: ['####', '#  #', '####'], sokoban: ['', ' A'] }), /falta el inicio/);
    assert.throws(() => nivelDePrueba({ terreno: ['####', '#  #', '####'], obstaculos: ['', ' m'], sokoban: ['', '  @'] }),
        /no tiene ID/, 'un mueble sin entrada en el archivo de entidades');
});

test('los 6 niveles cargan con sus entidades fuera de la matriz', () => {
    const esperado = {   // inventario verificado antes de migrar (código y lista de la narrativa)
        1: { cajas: 'ABC', muebles: 0, pistas: 2, baterias: 1, marcas: ['n1-marca-arrastre', 'n1-marca-polvo'] },
        2: { cajas: 'ABC', muebles: 3, pistas: 2, baterias: 1, marcas: [] },
        3: { cajas: 'ABC', muebles: 4, pistas: 2, baterias: 1, marcas: [] },
        4: { cajas: 'ABC', muebles: 3, pistas: 2, baterias: 1, marcas: [] },
        5: { cajas: 'ABC', muebles: 3, pistas: 2, baterias: 1, marcas: [] },
        6: { cajas: 'ABC', muebles: 4, pistas: 2, baterias: 1, marcas: [] }
    };
    for (let n = 1; n <= TOTAL_NIVELES; n++) {
        const e = cargarNivel(n).getEscenario();
        const entidades = entidadesDeNivel(n);
        assert.equal(e.getCajas().map(c => c.id).join(''), esperado[n].cajas, `nivel ${n}: cajas`);
        assert.equal(e.getMuebles().length, esperado[n].muebles, `nivel ${n}: muebles`);
        assert.deepEqual(e.getMuebles().map(m => m.id).sort(), entidades.obstaculos.map(o => o.id).sort(), `nivel ${n}: IDs de muebles`);
        assert.equal(e.contarObjetos('pista'), esperado[n].pistas, `nivel ${n}: pistas`);
        assert.equal(e.contarObjetos('bateria'), esperado[n].baterias, `nivel ${n}: baterías`);
        assert.deepEqual(e.getMarcas().map(m => m.id), esperado[n].marcas, `nivel ${n}: marcas`);
        for (const o of [...e.getObjetos(), ...e.getMarcas()]) {
            assert.ok(e.getBloque(o.fila, o.columna).esTangible, `nivel ${n}: ${o.id} está sobre suelo`);
        }
    }
});

test('las dos marcas del nivel 1 conservan su ID y su posición', () => {
    const marcas = cargarNivel(1).getEscenario().getMarcas().map(m => [m.id, m.fila, m.columna]);
    assert.deepEqual(marcas, [['n1-marca-arrastre', 3, 7], ['n1-marca-polvo', 4, 1]]);
    assert.ok(cargarNivel(1).getEscenario().getMarcas().every(m => !('revelada' in m)), 'el descubrimiento no es un dato físico');
});

// ── IDs persistentes ────────────────────────────────────────────────────────

test('cada caja conserva su ID al moverse, al deshacer y al reiniciar', () => {
    const nivel = cargarNivel(1);
    const inicial = posiciones(nivel);
    jugar(nivel, 'lluRR');
    assert.deepEqual(nivel.getEscenario().getCaja('A') && [nivel.getEscenario().getCaja('A').fila, nivel.getEscenario().getCaja('A').columna], [2, 5]);
    nivel.deshacer(); nivel.deshacer();
    assert.deepEqual(posiciones(nivel).cajas, inicial.cajas);
    jugar(nivel, 'RR');
    nivel.reiniciar();
    assert.deepEqual(posiciones(nivel), inicial);
    assert.deepEqual([nivel.getMovimientos(), nivel.getEmpujones()], [0, 0]);
    jugar(nivel, soluciones[1].recordPasos.solucion);
    assert.equal(nivel.estaCompletado(), true, 'tras reiniciar el nivel sigue siendo el mismo');
});

// ── Sucesos ─────────────────────────────────────────────────────────────────

test('sucesos de caminar, empujar, colocar, recoger, deshacer, reiniciar y completar', () => {
    const nivel = cargarNivel(1);
    const recibidos = [];
    const dejarDeEscuchar = nivel.suscribir(lista => recibidos.push(...lista.map(s => s.tipo)));
    const tipos = r => r.sucesos.map(s => s.tipo);

    assert.deepEqual(tipos(nivel.mover(Direccion.IZQUIERDA)), ['paso']);
    nivel.mover(Direccion.IZQUIERDA);
    nivel.mover(Direccion.ARRIBA);
    const empuje = nivel.mover(Direccion.DERECHA);
    assert.deepEqual(tipos(empuje), ['paso', 'empujon', 'casillaLiberada', 'casillaCubierta']);
    assert.deepEqual(empuje.sucesos[1], { tipo: 'empujon', caja: 'A', desde: { fila: 2, columna: 3 }, hasta: { fila: 2, columna: 4 } });
    const coloca = nivel.mover(Direccion.DERECHA);
    assert.deepEqual(tipos(coloca), ['paso', 'empujon', 'casillaLiberada', 'casillaCubierta', 'cajaColocada']);
    assert.equal(coloca.sucesos.at(-1).caja, 'A');
    assert.ok(Object.isFrozen(coloca.sucesos) && Object.isFrozen(coloca.sucesos[0]), 'los sucesos son de solo lectura');

    const deshace = nivel.deshacer();
    assert.deepEqual(tipos(deshace), ['deshacer', 'casillaLiberada', 'casillaCubierta', 'cajaRetirada']);
    assert.equal(deshace.sucesos[0].caja, 'A');

    const conPista = cargarNivel(1);
    jugar(conPista, 'rrdd');           // (5,6): pista n1-pista-huella
    const recoge = conPista.deshacer() && conPista.mover(Direccion.ABAJO);
    assert.deepEqual(recoge.sucesos.at(-1), { tipo: 'objetoRecogido', objeto: 'n1-pista-huella', clase: 'pista', en: { fila: 5, columna: 6 } });

    assert.deepEqual(tipos(nivel.reiniciar()), ['reinicio']);
    const sol = soluciones[1].recordPasos.solucion;
    jugar(nivel, sol.slice(0, -1));
    const ultimo = nivel.mover({ u: Direccion.ARRIBA, d: Direccion.ABAJO, l: Direccion.IZQUIERDA, r: Direccion.DERECHA }[sol.at(-1).toLowerCase()]);
    assert.deepEqual(ultimo.sucesos.at(-1), { tipo: 'completado', pasos: 16, empujones: 6 });

    dejarDeEscuchar();
    const antes = recibidos.length;
    nivel.reiniciar();
    assert.equal(recibidos.length, antes, 'después de dejar de escuchar no llegan sucesos');
    assert.ok(recibidos.includes('reinicio') && recibidos.includes('cajaRetirada'));
});

test('un choque no emite sucesos ni cuenta', () => {
    const nivel = cargarNivel(1);
    let llamados = 0;
    nivel.suscribir(() => llamados++);
    jugar(nivel, 'lll');
    assert.equal(nivel.mover(Direccion.IZQUIERDA), null);
    assert.equal(llamados, 3);
});

// ── Consultas espaciales ────────────────────────────────────────────────────

test('consultas: transitable, ocupante, entidades en una casilla, camino y estado de solo lectura', () => {
    const nivel = cargarNivel(2);
    assert.equal(nivel.esTransitable(0, 0), false, 'pared');
    assert.equal(nivel.esTransitable(3, 4), false, 'mueble');
    assert.equal(nivel.esTransitable(1, 1), true);
    assert.equal(nivel.esTransitable(-1, 3), false, 'fuera del mapa');
    assert.equal(nivel.ocupante(6, 5), 'inspector');
    assert.equal(nivel.ocupante(2, 5), 'caja');
    assert.equal(nivel.ocupante(1, 1), null);
    assert.deepEqual(nivel.entidadesEn(3, 4), { obstaculo: 'n2-mueble-copas', caja: null, objetos: [], evidencias: [] });
    assert.deepEqual(nivel.entidadesEn(1, 1).objetos, [{ id: 'n2-pista-recibo', tipo: 'pista', recogido: false }]);

    const ruta = nivel.camino({ fila: 6, columna: 5 }, { fila: 1, columna: 1 });
    assert.deepEqual(ruta[0], { fila: 6, columna: 5 });
    assert.deepEqual(ruta.at(-1), { fila: 1, columna: 1 });
    for (let i = 1; i < ruta.length; i++) {
        const a = ruta[i - 1], b = ruta[i];
        assert.equal(Math.abs(a.fila - b.fila) + Math.abs(a.columna - b.columna), 1, 'pasos contiguos');
        assert.ok(nivel.esTransitable(b.fila, b.columna) && nivel.ocupante(b.fila, b.columna) !== 'caja', 'no atraviesa nada');
    }
    assert.equal(nivel.camino({ fila: 6, columna: 5 }, { fila: 3, columna: 4 }), null, 'no se llega a un mueble');
    assert.equal(nivel.camino({ fila: 6, columna: 5 }, { fila: 2, columna: 5 }), null, 'una caja bloquea');
    assert.ok(nivel.camino({ fila: 6, columna: 5 }, { fila: 2, columna: 5 }, { atravesarCajas: true }));

    const estado = nivel.estado();
    assert.ok(Object.isFrozen(estado) && Object.isFrozen(estado.cajas) && Object.isFrozen(estado.cajas[0]));
    assert.deepEqual(estado.cajas.map(c => c.id), ['A', 'B', 'C']);
    assert.throws(() => { 'use strict'; estado.cajas[0].fila = 99; });
    assert.equal(nivel.getEscenario().getCaja('A').fila, 2, 'el estado es una copia: modificarlo no toca el tablero');
});
