// Comprobaciones comunes a TODAS las habitaciones (se repiten por nivel): reglas y deducción válidas, cada línea de la narrativa usada una vez,
// el oráculo (cada selección de pruebas contra la tabla aprobada de respuestas), el mapa (todo alcanzable, nada tapado, todo usable desde cerca, de frente y con luz),
// la ayuda y que las reglas no copian texto. Lo propio de cada nivel está en nivelN.test.mjs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import Investigacion, { validarReglas } from '../src/motor/Investigacion.js';
import Libreta from '../src/motor/Libreta.js';
import Deduccion, { validarDeduccion } from '../src/motor/Deduccion.js';
import { caminableDeSuelo } from '../src/motor/Mapa.js';
import { ALCANCE_DE_ACCION } from '../src/motor/Alcance.js';
import {
    leerJson, cargarMapa, posicionesAlcanzables, accionables, intento, hacia, centroDe, solapan,
    zonaDeAccion, distanciaARectangulo, segmentosDeLuz, RAIZ
} from './ayudasDeMapa.mjs';

const NIVELES = [1, 2, 3, 4, 5, 6].filter(n => existsSync(new URL(`assets/investigaciones/nivel${n}.json`, RAIZ)));
const METODO = { examinar: 'examino', 'mirar-detras': 'miroDetras', recoger: 'recogio', rodar: 'rodo', tirar: 'tiro', 'mirar-debajo': 'miroDebajo', cortar: 'corto', ordenar: 'ordeno', cerrar: 'cerro', apagar: 'apago', abrir: 'abrio' };
// Cuánto tarda la ayuda sin texto en cada habitación: 45 s, menos en la persecución (los papeles se queman a los 60 s)
const ESPERA_DE_LA_AYUDA = { 5: 15 };
// Lo que solo es alcanzable más tarde (se comprueba en su prueba propia): { nivel: [refs] }
const MAS_TARDE = { 2: ['cuerda'] };

// LAS RESPUESTAS APROBADAS (DISENO_V2.md, sección 5, «Deducción por hechos»), escritas a mano y sin mirar "necesita" ni "aportan":
//   minimas:     las selecciones más chicas que demuestran la conclusión (cualquier selección que contenga una, sin pruebas ajenas, vale)
//   pertinentes: las pruebas que tienen que ver con la pregunta (las demás son ajenas: error aunque haya una mínima)
// Una selección de pertinentes que no contiene ninguna mínima es INSUFICIENTE: «Voy bien, pero me falta una pieza».
const RESPUESTAS_APROBADAS = {
    1: {
        cortinas: { minimas: [['ventana-rota']], pertinentes: ['ventana-rota'] },
        embrujado: { minimas: [['cajas-movidas'], ['marcas-de-arrastre']], pertinentes: ['cajas-movidas', 'marcas-de-arrastre', 'n1-pista-huella', 'polvo-removido'] }
    },
    2: {
        mecanismo: {
            minimas: [['cuerda-al-techo', 'fuelle-escondido'], ['n2-pista-recibo', 'cuerda-al-techo'], ['n2-pista-recibo', 'fuelle-escondido']],
            pertinentes: ['cuerda-al-techo', 'fuelle-escondido', 'n2-pista-recibo']
        },
        responsable: { minimas: [['n2-pista-taza'], ['sarten-con-aceite']], pertinentes: ['n2-pista-taza', 'sarten-con-aceite', 'n2-pista-recibo', 'copas-limpias'] },
        companero: { minimas: [['platos-para-dos']], pertinentes: ['platos-para-dos', 'copas-limpias'] }
    },
    3: {
        candado: {
            minimas: ['camino-sin-polvo', 'huellas-recientes', 'n3-pista-llave', 'aceite-para-bisagras'].flatMap(uso => ['n3-pista-carta', 'puerta-tapiada'].map(visitas => [uso, visitas])),
            pertinentes: ['camino-sin-polvo', 'huellas-recientes', 'n3-pista-llave', 'aceite-para-bisagras', 'n3-pista-carta', 'puerta-tapiada', 'llavero-vacio', 'herramientas-de-cerrajero']
        }
    },
    4: {
        juguetes: { minimas: [['n4-pista-hilo'], ['oso-con-hilo-cosido', 'trampilla-del-techo']], pertinentes: ['n4-pista-hilo', 'oso-con-hilo-cosido', 'trampilla-del-techo'] }
    },
    6: {
        detras: {
            // Las CARTAS DE COMPRADORES (la pista) dicen lo mismo que «Siete rechazos»: valen igual
            minimas: [['siete-rechazos', 'n1-pista-periodico'], ['n6-pista-compradores', 'n1-pista-periodico'], ['n2-pista-recibo', 'pluma-gv', 'n1-pista-periodico'], ['n5-pista-abrigo', 'pluma-gv', 'n1-pista-periodico']],
            pertinentes: ['siete-rechazos', 'n6-pista-compradores', 'n2-pista-recibo', 'n5-pista-abrigo', 'pluma-gv', 'n1-pista-periodico', 'cuentas-que-no-cuadran']
        },
        espantaba: {
            minimas: [['n4-pista-diario', 'n3-pista-carta'], ['n4-pista-diario', 'siete-rechazos'], ['n4-pista-diario', 'n6-pista-compradores']],
            pertinentes: ['n4-pista-diario', 'n3-pista-carta', 'siete-rechazos', 'n6-pista-compradores', 'n5-pista-planos', 'reloj-detenido', 'archivador-forzado']
        }
    }
};

// Todas las selecciones de 1 a `max` pruebas distintas
function subconjuntos(ids, max) {
    const todas = [];
    const armar = (desde, actual) => {
        if (actual.length) todas.push(actual);
        if (actual.length === max) return;
        for (let i = desde; i < ids.length; i++) armar(i + 1, [...actual, ids[i]]);
    };
    armar(0, []);
    return todas;
}

// Lo que tiene que responder la deducción, según la tabla: el orden de las comprobaciones es el de src/motor/Deduccion.js
function clasificar(aprobada, correcta, conclusion, pruebas, unica) {
    if (conclusion !== correcta) return { estado: 'error', motivo: 'conclusion' };
    if (!pruebas.every(p => aprobada.pertinentes.includes(p))) return { estado: 'error', motivo: 'ajena' };
    if (!aprobada.minimas.some(m => m.every(p => pruebas.includes(p)))) return { estado: 'error', motivo: 'insuficiente' };
    return { estado: unica ? 'resuelto' : 'correcta' };      // con una sola pregunta, acertarla resuelve el caso
}

export function datos(n) {
    return { narrativa: leerJson(`assets/narrativa/nivel${n}.json`), reglas: leerJson(`assets/investigaciones/nivel${n}.json`), mapa: cargarMapa(n) };
}

// Hace todo lo que se puede hacer en la habitación (menos lo que pide haber resuelto la deducción), hasta que no cambie nada
export function hacerTodo(inv, mapa, reglas) {
    for (let vuelta = 0; vuelta < 12; vuelta++) {
        inv.entro();
        if (JSON.stringify(reglas.objetos).includes('"capturo"')) inv.capturo();      // nivel 5: se puede recoger lo del abrigo una vez atrapada la sombra
        for (const r of reglas.reglas) {
            for (const f of r.cuando) {
                const [tipo, objeto] = f.split(':');
                if (['piso', 'vio-cerca', 'oyo-cerca'].includes(tipo)) inv.recibir({ tipo, objeto });
            }
        }
        for (const o of [...mapa.revelables, ...mapa.interactuables]) {
            const { ref, accion, lado } = o.props;
            if (inv.objetos[ref]?.descubre === 'luz') inv.ilumino(ref);
            if (accion && METODO[accion]) inv[METODO[accion]](ref, lado);
        }
    }
    return inv;
}

for (const n of NIVELES) {
    const { narrativa, reglas, mapa } = datos(n);
    const nuevaInv = () => new Investigacion(reglas, narrativa);

    test(`nivel ${n}: las reglas y la deducción son válidas, sin excepciones y sin copiar texto de la historia`, () => {
        assert.deepEqual(validarReglas(reglas, narrativa), []);
        if (reglas.deduccion) {
            assert.deepEqual(validarDeduccion(reglas, narrativa), []);
        }
        const contenido = JSON.stringify({ ...reglas, comentario: undefined });
        const lineas = [narrativa.intro, narrativa.cierre, narrativa.error, narrativa.bateria, narrativa.informe, ...narrativa.comentarios, ...narrativa.revelaciones,
            ...narrativa.muebles.map(m => m.texto), ...narrativa.pistas.flatMap(p => [p.titulo, p.texto]),
            ...Object.values(narrativa.deduccion?.pruebas || {}), ...(narrativa.deduccion?.preguntas || []).flatMap(q => [q.texto, ...q.opciones.map(o => o.texto)])];
        for (const linea of lineas) assert.ok(!contenido.includes(linea), `las reglas copian "${linea.slice(0, 40)}…"`);
    });

    test(`nivel ${n}: cada línea de la narrativa (menos cierre, error e informe) se usa exactamente una vez`, () => {
        const usadas = reglas.reglas.map(r => r.texto).sort();
        const esperadas = ['intro', 'bateria', ...narrativa.comentarios.map((_, i) => `comentarios:${i}`), ...narrativa.revelaciones.map((_, i) => `revelaciones:${i}`),
            ...narrativa.muebles.map(m => `muebles:${m.id}`), ...narrativa.pistas.map(p => `pistas:${p.id}`), ...(narrativa.marcas || []).map(m => `marcas:${m.id}`),
            ...Object.keys(narrativa.momentos || {}).map(id => `momentos:${id}`)].sort();
        assert.deepEqual(usadas, esperadas);
    });

    if (reglas.deduccion) {
        test(`nivel ${n}: el oráculo: cada selección posible de pruebas da lo que dice la tabla aprobada (correcta, insuficiente o ajena)`, () => {
            const inv = hacerTodo(nuevaInv(), mapa, reglas);
            // Lo del Registro de otros niveles también cuenta como encontrado (nivel 6)
            const registro = Object.fromEntries(Object.entries(reglas.deduccion.pruebas).filter(([, p]) => p.registro).map(([id]) => [id, { nivel: 0 }]));
            const libreta = new Libreta(reglas.deduccion, narrativa, inv, { nivel: n, registro: () => registro });
            const ids = libreta.idsEncontrados();
            const max = reglas.deduccion.maximoDePruebas ?? 2;
            assert.deepEqual(Object.keys(RESPUESTAS_APROBADAS[n]).sort(), reglas.deduccion.preguntas.map(q => q.id).sort(), 'la tabla tiene todas las preguntas');
            for (const q of reglas.deduccion.preguntas) {
                const aprobada = RESPUESTAS_APROBADAS[n][q.id];
                for (const p of aprobada.pertinentes) assert.ok(ids.includes(p), `${q.id}: la prueba "${p}" se puede encontrar`);
                for (const opcion of narrativa.deduccion.preguntas.find(t => t.id === q.id).opciones) {
                    for (const pruebas of subconjuntos(ids, max)) {
                        const r = new Deduccion(reglas.deduccion, libreta).responder(q.id, opcion.id, pruebas);
                        const esperado = clasificar(aprobada, q.correcta, opcion.id, pruebas, reglas.deduccion.preguntas.length === 1);
                        assert.deepEqual(r, esperado, `${q.id} / ${opcion.id} / ${pruebas.join(' + ')}`);
                    }
                }
            }
        });
    }

    test(`nivel ${n}: el mapa apunta a las reglas y las reglas al mapa`, () => {
        const usables = accionables(mapa);
        const refs = new Set(usables.map(o => o.props.ref));
        for (const r of refs) assert.ok(reglas.objetos[r], `"${r}" está en las reglas`);
        for (const [ref, def] of Object.entries(reglas.objetos)) {
            for (const accion of Object.keys(def.acciones || {})) {
                assert.ok(usables.some(o => o.props.ref === ref && o.props.accion === accion), `${ref}/${accion} existe en el mapa`);
            }
        }
        for (const o of mapa.revelables) if (reglas.objetos[o.props.ref]?.descubre) assert.equal(reglas.objetos[o.props.ref].descubre, 'luz');
        for (const z of mapa.objetos.filter(o => o.tipo === 'piso')) assert.ok(reglas.objetos[z.props.ref], `el piso "${z.props.ref}" está en las reglas`);
    });

    test(`nivel ${n}: todo está sobre suelo caminable (o sobre un mueble o el muro) y dentro del mapa; nada queda tapado`, () => {
        const caminable = caminableDeSuelo(mapa);
        const sobreSuelo = r => {
            for (let fila = Math.floor(r.y / mapa.tam); fila <= Math.floor((r.y + r.alto - 1) / mapa.tam); fila++) {
                for (let col = Math.floor(r.x / mapa.tam); col <= Math.floor((r.x + r.ancho - 1) / mapa.tam); col++) if (!caminable[fila]?.[col]) return false;
            }
            return true;
        };
        for (const o of [...mapa.revelables, ...mapa.interactuables, ...mapa.objetos.filter(x => x.tipo === 'piso')]) {
            if (o.props.sobre || o.props.enPared) continue;
            assert.ok(sobreSuelo(o), `${o.nombre} está sobre suelo`);
        }
        for (const m of mapa.muebles) assert.ok(m.x >= 0 && m.x + m.ancho <= mapa.ancho && m.y >= 0 && m.y + m.alto <= mapa.alto, m.nombre);
        const dibujo = m => ({ x: m.x, y: m.y - m.props.alto, ancho: m.ancho, alto: m.alto + m.props.alto });
        for (const m of mapa.muebles) {
            for (const r of mapa.revelables) assert.ok(!solapan(r, dibujo(m)), `${r.nombre} queda tapado por ${m.nombre}`);
            for (const i of mapa.interactuables) {
                if (!solapan(i, dibujo(m))) continue;
                assert.ok(i.props.sobre === m.nombre || !i.props.dibujo, `${i.nombre} queda tapado por el dibujo de ${m.nombre}`);
            }
        }
    });

    test(`nivel ${n}: todo se puede usar desde alguna posición cerca, de frente y con la luz real`, () => {
        const posiciones = posicionesAlcanzables(mapa);
        const segmentos = segmentosDeLuz(mapa);
        assert.ok(posiciones.length > 50);
        for (const m of mapa.muebles) assert.ok(posiciones.some(([x, y]) => distanciaARectangulo({ x, y }, m) <= 84), `se llega junto a ${m.nombre}`);
        for (const o of accionables(mapa)) {
            if ((MAS_TARDE[n] || []).includes(o.props.ref)) continue;
            const zona = zonaDeAccion(o, mapa.muebles);
            assert.ok(zona.distancia <= ALCANCE_DE_ACCION);
            const candidatos = posiciones.filter(([x, y]) => distanciaARectangulo({ x, y }, zona.huella) <= zona.distancia);
            assert.ok(candidatos.length > 0, `${o.nombre}: hay sitio donde pararse`);
            const sirve = candidatos.some(([x, y]) => intento(mapa, { x, y }, hacia({ x, y }, zona.mira ?? centroDe(zona.luz)), zona, segmentos).posible);
            assert.ok(sirve, `${o.nombre}: se puede usar de frente y con luz`);
        }
        for (const z of mapa.objetos.filter(o => o.tipo === 'piso')) assert.ok(posiciones.some(([x, y]) => x >= z.x && x <= z.x + z.ancho && y >= z.y && y <= z.y + z.alto), `se puede pisar ${z.nombre}`);
    });

    test(`nivel ${n}: la ayuda empieza a los ${ESPERA_DE_LA_AYUDA[n] ?? 45} s, sus reglas existen y cada refuerzo se apaga con su línea`, () => {
        assert.equal(reglas.ayuda.espera, ESPERA_DE_LA_AYUDA[n] ?? 45);
        const ids = new Set(reglas.reglas.map(r => r.id));
        for (const r of reglas.ayuda.refuerzos) for (const id of r.mientras?.sinContar || []) assert.ok(ids.has(id), id);
    });

    test(`nivel ${n}: en cualquier orden, cada línea sale una sola vez (con todo hecho no queda ninguna por salir)`, () => {
        const inv = hacerTodo(nuevaInv(), mapa, reglas);
        const finales = reglas.final?.objeto ? [] : [];
        // "momentos" con acerto, en-registro o ilumino:sombra: se prueban en nivel5.test.mjs y nivel6.test.mjs
        const pendientes = reglas.reglas.filter(r => !inv.yaSalio(r.id) && !r.cuando.some(f => f === 'resolvio' || f === 'capturo' || /^(acerto|en-registro):/.test(f) || f === 'ilumino:sombra'));
        assert.deepEqual(pendientes.map(r => r.id), finales, 'todas las reglas salen');
        assert.equal(new Set(inv.historial.map(h => h.regla)).size, inv.historial.length, 'ninguna sale dos veces');
    });
}
