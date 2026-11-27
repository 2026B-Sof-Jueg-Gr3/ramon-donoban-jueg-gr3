// Comprobaciones comunes a TODAS las habitaciones (se repiten por nivel): reglas y deducción válidas, cada línea de la narrativa usada una vez,
// el oráculo (exactamente UNA respuesta por pregunta), el mapa (todo alcanzable, nada tapado, todo usable desde cerca, de frente y con luz),
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
            for (const q of reglas.deduccion.preguntas) assert.equal(q.validas.length, 1, `${q.id}: una sola respuesta`);
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
        test(`nivel ${n}: el oráculo: con la conclusión correcta, cada pregunta tiene EXACTAMENTE 1 respuesta que acierta`, () => {
            const inv = hacerTodo(nuevaInv(), mapa, reglas);
            // Lo del Registro de otros niveles también cuenta como encontrado (nivel 6)
            const registro = Object.fromEntries(Object.entries(reglas.deduccion.pruebas).filter(([, p]) => p.registro).map(([id]) => [id, { nivel: 0 }]));
            const libreta = new Libreta(reglas.deduccion, narrativa, inv, { nivel: n, registro: () => registro });
            const ids = libreta.idsEncontrados();
            assert.ok(ids.length >= 2);
            const subconjuntos = [...ids.map(i => [i]), ...ids.flatMap((a, i) => ids.slice(i + 1).map(b => [a, b]))];
            for (const q of reglas.deduccion.preguntas) {
                const pertinentes = new Set(q.validas.flat());
                const aciertan = [];
                for (const opcion of narrativa.deduccion.preguntas.find(t => t.id === q.id).opciones) {
                    for (const pruebas of subconjuntos) {
                        const { estado } = new Deduccion(reglas.deduccion, libreta).responder(q.id, opcion.id, pruebas);
                        const debe = opcion.id === q.correcta && q.validas.some(c => c.every(p => pruebas.includes(p))) && pruebas.every(p => pertinentes.has(p));
                        assert.equal(estado === 'correcta' || estado === 'resuelto', debe, `${q.id} / ${opcion.id} / ${pruebas}`);
                        if (debe) aciertan.push(pruebas.slice().sort().join(' + '));
                    }
                }
                assert.deepEqual(aciertan, [q.validas[0].slice().sort().join(' + ')], `${q.id}: una sola respuesta`);
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
