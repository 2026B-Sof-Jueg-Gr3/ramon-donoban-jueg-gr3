// Datos de la narrativa de la v2: categorías, tamaños, ids y los textos aprobados que reemplazaron a los del Sokoban
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TOTAL_NIVELES } from '../src/motor/niveles.js';

const RAIZ = new URL('../', import.meta.url);
const leer = ruta => readFileSync(new URL(ruta, RAIZ), 'utf8');
const narrativa = n => JSON.parse(leer(`assets/narrativa/nivel${n}.json`));
const niveles = Array.from({ length: TOTAL_NIVELES }, (_, i) => i + 1);

const CATEGORIAS = ['bateria', 'cierre', 'comentarios', 'error', 'informe', 'intro', 'marcas', 'muebles', 'pistas', 'revelaciones'];
// Todas las habitaciones tienen su deducción aprobada, salvo la 5 (la persecución): la captura es la prueba. Con deducción, además, la
// línea "insuficiente" (las pruebas iban bien, pero les faltaba una pieza)
const CATEGORIAS_DE = n => n === 5 ? CATEGORIAS : [...CATEGORIAS, 'deduccion', 'insuficiente'].sort();
const CATEGORIAS_DEL_SOKOBAN = ['empujar', 'cajas', 'retirar'];

test('hay seis habitaciones y cada una tiene su narrativa', () => {
    assert.equal(TOTAL_NIVELES, 6);
    for (const n of niveles) assert.doesNotThrow(() => narrativa(n), `nivel${n}.json`);
});

// "momentos": las líneas agregadas en la v2 y aprobadas (la sombra del nivel 5, la conexión de la «V» del nivel 6). Solo ahí.
const CON_MOMENTOS = [5, 6];

test('cada narrativa usa exactamente las categorías de la v2 y ninguna del Sokoban', () => {
    for (const n of niveles) {
        const claves = Object.keys(narrativa(n));
        if (!CON_MOMENTOS.includes(n)) assert.ok(!claves.includes('momentos'), `nivel ${n}: no lleva "momentos"`);
        assert.deepEqual(claves.filter(c => c !== 'momentos').sort(), CATEGORIAS_DE(n), `nivel ${n}`);
        for (const vieja of CATEGORIAS_DEL_SOKOBAN) assert.ok(!claves.includes(vieja), `nivel ${n}: sigue la categoría "${vieja}"`);
    }
});

test('tamaños: 3 comentarios, 2 revelaciones y 2 pistas por habitación; ningún texto vacío', () => {
    for (const n of niveles) {
        const d = narrativa(n);
        assert.equal(d.comentarios.length, 3, `nivel ${n}: comentarios`);
        assert.equal(d.revelaciones.length, 2, `nivel ${n}: revelaciones`);
        assert.equal(d.pistas.length, 2, `nivel ${n}: pistas`);
        for (const clave of ['intro', 'cierre', 'error', 'bateria', 'informe']) assert.ok(d[clave].trim(), `nivel ${n}: ${clave}`);
        for (const t of [...d.comentarios, ...d.revelaciones]) assert.ok(t.trim(), `nivel ${n}: texto vacío`);
    }
});

test('ids de pistas, muebles y marcas: únicos y con el prefijo de su habitación', () => {
    const vistos = new Set();
    for (const n of niveles) {
        const d = narrativa(n);
        for (const [lista, tipo] of [[d.pistas, 'pista'], [d.muebles, 'mueble'], [d.marcas, 'marca']]) {
            for (const e of lista) {
                assert.match(e.id, new RegExp(`^n${n}-${tipo}-`), `nivel ${n}: ${e.id}`);
                assert.ok(!vistos.has(e.id), `id repetido: ${e.id}`);
                vistos.add(e.id);
                assert.ok(e.texto.trim(), `${e.id}: sin texto`);
            }
        }
        for (const p of d.pistas) assert.ok(p.titulo.trim(), `${p.id}: sin título`);
        for (const m of d.marcas) assert.ok(m.icono, `${m.id}: sin icono`);
    }
});

test('los 8 cambios de texto aprobados reemplazaron a los del Sokoban', () => {
    const n1 = narrativa(1), n2 = narrativa(2);
    assert.equal(n1.intro, 'Primera regla del método: todo deja rastro. Segunda regla: los fantasmas no existen. Empecemos por este pasillo.');
    assert.equal(n1.comentarios[0], 'Esta caja pesa más de lo que parece. Aquí dentro hay algo más que polvo.');
    assert.equal(n1.revelaciones[0], 'Las marcas del suelo coinciden: alguien sacó estas cajas de aquí a propósito.');
    assert.equal(n1.revelaciones[1], 'Detrás de las cajas está la ventana rota; por ahí entra el viento que mueve las cortinas.');
    assert.equal(n1.cierre, 'Listo. Las cortinas no «caminan»: es la corriente de la ventana rota. El pasillo no estaba embrujado: alguien lo desordenó para que lo pareciera.');
    assert.equal(n1.error, 'No, eso no encaja. Corregir un error también es parte del método.');
    assert.equal(n2.error, 'Mmm, no. Esa pieza no encaja.');
    assert.ok(leer('src/escenas/MenuPrincipal.js').includes('usando la razón. Recorre la mansión y encuentra cada pista.'), 'créditos');
});

test('ya no queda ninguna frase del Sokoban en la narrativa ni en los créditos', () => {
    const viejas = ['nunca se jalan', 'en su sitio', 'ahí no iba', 'no era su lugar', 'Pon cada pista', 'Sin cajas tapando', 'Pesa más de lo que parece. Aquí'];
    const todo = niveles.map(n => leer(`assets/narrativa/nivel${n}.json`)).join('\n') + leer('src/escenas/MenuPrincipal.js');
    for (const frase of viejas) assert.ok(!todo.includes(frase), `sigue apareciendo: "${frase}"`);
});

test('la deducción del nivel 1 usa palabra por palabra los textos aprobados', () => {
    const d = narrativa(1).deduccion;
    assert.deepEqual(d.pruebas, {
        'ventana-rota': 'Ventana rota',
        'cajas-movidas': 'Cajas movidas',
        'marcas-de-arrastre': 'Marcas de arrastre',
        'polvo-removido': 'Polvo removido'
    });
    assert.equal(d.preguntas.length, 2);
    const [q1, q2] = d.preguntas;
    assert.equal(q1.texto, '¿Qué mueve las cortinas?');
    assert.deepEqual(q1.opciones.map(o => o.texto), [
        'La corriente que entra por la ventana rota',
        'Alguien las mueve desde detrás',
        'Las sombras malditas de la mansión'
    ]);
    assert.equal(q2.texto, '¿Por qué parecía embrujado?');
    assert.deepEqual(q2.opciones.map(o => o.texto), [
        'Alguien desordenó el pasillo a propósito',
        'Las cajas se cayeron con el tiempo',
        'La casa rechaza a los visitantes'
    ]);
});

test('las pistas conservan su título actual (se muestran así en la libreta)', () => {
    assert.deepEqual(narrativa(1).pistas.map(p => p.titulo), ['RECORTE DE PERIÓDICO', 'HUELLA DE BOTA']);
});

test('el informe, el cierre y el error del nivel 1 no cambiaron con la deducción', () => {
    const n1 = narrativa(1);
    assert.equal(n1.informe, 'INFORME DEL INSPECTOR: El pasillo está despejado. Las «sombras» eran cortinas movidas por el viento de una ventana rota, y alguien había colocado las cajas justo para tapar la corriente y que pareciera cosa de fantasmas. Desde la cocina llegan ruidos metálicos... debo investigar.');
    assert.equal(n1.cierre, 'Listo. Las cortinas no «caminan»: es la corriente de la ventana rota. El pasillo no estaba embrujado: alguien lo desordenó para que lo pareciera.');
    assert.equal(n1.error, 'No, eso no encaja. Corregir un error también es parte del método.');
});

test('la deducción de la cocina (nivel 2) usa palabra por palabra los textos aprobados', () => {
    const d = narrativa(2).deduccion;
    assert.deepEqual(d.pruebas, {
        'cuerda-al-techo': 'Cuerda al techo',
        'fuelle-escondido': 'Fuelle escondido',
        'alacena-con-ruedas': 'Alacena con ruedas',
        'platos-para-dos': 'Platos para dos',
        'copas-limpias': 'Copas limpias',
        'sarten-con-aceite': 'Sartén con aceite'
    });
    assert.equal(d.preguntas.length, 3);
    const [q1, q3, q2] = d.preguntas;
    assert.equal(q1.texto, '¿Qué produce los golpes y apaga las velas?');
    assert.deepEqual(q1.opciones.map(o => o.texto), [
        'Un mecanismo de poleas, cuerda y fuelle',
        'El viento que baja por la chimenea',
        'Un fantasma que golpea las ollas'
    ]);
    assert.equal(q2.texto, '¿Quién lo construyó trabaja solo?');
    assert.deepEqual(q2.opciones.map(o => o.texto), ['No: hay alguien más con él', 'Sí: vive aquí escondido', 'Nadie lo construyó']);
    // La pregunta 2 (recibo + taza), aprobada en la fase 6; «¿Quién lo construyó trabaja solo?» pasó a ser la tercera
    assert.equal(q3.texto, '¿Alguien sigue manejando el fantasma?');
    assert.deepEqual(q3.opciones.map(o => o.texto), ['Sí: lo preparó a propósito y sigue viniendo', 'No: es un aparato viejo que quedó funcionando', 'No: la casa lo hace sonar sola']);
    assert.deepEqual(narrativa(2).pistas.map(p => p.titulo), ['RECIBO DE FERRETERÍA', 'TAZA DE CAFÉ']);
});

test('el resto de la narrativa del nivel 2 no cambió con la deducción', () => {
    const n2 = narrativa(2);
    assert.equal(n2.intro, 'Ruidos metálicos en la cocina. Los fantasmas no suelen necesitar sartenes.');
    assert.equal(n2.error, 'Mmm, no. Esa pieza no encaja.');
    assert.equal(n2.cierre, 'Ahí está el mecanismo completo: poleas, cuerda y fuelle. Y dos tazas en el fregadero... el fantasma de la cocina es un aparato, y quien lo construyó no trabaja solo.');
    assert.equal(n2.informe, 'INFORME DEL INSPECTOR: El «fantasma de la cocina» era un mecanismo de poleas oculto en la alacena. Alguien quiere asustar a los intrusos a propósito, y tiene un cómplice. La puerta del ala oeste está cerrada con un candado nuevo... busquemos la manera de entrar.');
    assert.deepEqual(n2.marcas, []);
});

test('las deducciones de los niveles 3, 4 y 6 usan palabra por palabra los textos aprobados; el nivel 5 no tiene', () => {
    const d3 = narrativa(3).deduccion, d4 = narrativa(4).deduccion, d6 = narrativa(6).deduccion;
    assert.deepEqual(d3.pruebas, { 'camino-sin-polvo': 'Camino sin polvo', 'huellas-recientes': 'Huellas recientes', 'llavero-vacio': 'Llavero vacío', 'puerta-tapiada': 'Puerta tapiada', 'herramientas-de-cerrajero': 'Herramientas de cerrajero', 'aceite-para-bisagras': 'Aceite para bisagras' });
    assert.equal(d3.preguntas.length, 1);
    assert.equal(d3.preguntas[0].texto, '¿Por qué hay un candado nuevo en una puerta vieja?');
    assert.deepEqual(d3.preguntas[0].opciones.map(o => o.texto), ['Alguien entra y sale a diario y no quiere visitas', 'Nadie ha cruzado esta puerta en años', 'La sellaron para encerrar algo']);
    assert.deepEqual(d4.pruebas, { 'trampilla-del-techo': 'Trampilla del techo', 'oso-con-hilo-cosido': 'Oso con hilo cosido', 'caballito-engrasado': 'Caballito engrasado', 'munecas-alineadas': 'Muñecas alineadas' });
    assert.equal(d4.preguntas[0].texto, '¿Cómo se mueven los juguetes?');
    assert.deepEqual(d4.preguntas[0].opciones.map(o => o.texto), ['Con hilos manejados desde una trampilla del techo', 'Con engranajes de cuerda que alguien engrasó', 'Cobran vida solos']);
    assert.deepEqual(d6.pruebas, { 'cuentas-que-no-cuadran': 'Cuentas que no cuadran', 'siete-rechazos': 'Siete rechazos', 'pluma-gv': 'Pluma «G. V.»', 'archivador-forzado': 'Archivador forzado', 'reloj-detenido': 'Reloj detenido' });
    assert.deepEqual(d6.preguntas.map(q => q.texto), ['¿Quién está detrás de la «maldición»?', '¿Por qué espantaba a los compradores?']);
    assert.deepEqual(d6.preguntas[0].opciones.map(o => o.texto), ['Gerhard Voss, el albacea', 'El cómplice de la ventana', 'La propia maldición de los Flieder']);
    assert.deepEqual(d6.preguntas[1].opciones.map(o => o.texto), ['Para buscar el tesoro sin que nadie se quedara con la casa', 'Para proteger la memoria del señor Flieder', 'Porque creía en la maldición']);
    assert.equal(narrativa(5).deduccion, undefined);
});

test('el cierre del nivel 4 va en cuatro páginas (aprobado) y ningún otro texto de la historia lleva el corte \f', () => {
    assert.equal(narrativa(4).cierre, 'Último hilo cortado. Los juguetes no cobraban vida: alguien los manejaba desde arriba...\fEspera.\f¡Una silueta, frente a la ventana! Alguien nos estaba observando.\fHasta ahora solo tenía rastros. Esta vez, el rastro tiene piernas.');
    const conCorte = [];
    const revisar = (valor, ruta) => {
        if (typeof valor === 'string') { if (valor.includes('\f')) conCorte.push(ruta); }
        else if (valor && typeof valor === 'object') for (const [k, v] of Object.entries(valor)) revisar(v, `${ruta}.${k}`);
    };
    for (const n of niveles) revisar(narrativa(n), `nivel${n}`);
    assert.deepEqual(conCorte, ['nivel4.cierre']);
});
