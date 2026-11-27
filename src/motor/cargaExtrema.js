// El contenido de la "carga extrema" (modo de prueba de la maquetación, ?carga=extrema en la dirección): con él se llenan
// las pantallas hasta donde puede llegar el juego, para comprobar con el revisor (F6) que nada se encima ni se sale de su
// recuadro. Sin Phaser. Todo sale de textos reales de la narrativa (los más largos de los seis niveles); no se inventa
// ninguna línea de historia.
// vecesPregunta, vecesConclusion, vecesInforme: el texto más largo de los seis niveles se repite estas veces para llevarlo al límite
export const CARGA = Object.freeze({ pruebas: 25, pistas: 10, repeticionesDeTarjeta: 3, repeticionesDeCaja: 8, vecesPregunta: 3, vecesConclusion: 3, vecesInforme: 4 });

const masLargo = lista => lista.reduce((a, b) => ((b ?? '').length > a.length ? b : a), '');

// narrativas: las de los seis niveles (assets/narrativa/nivelN.json)
export function contenidoExtremo(narrativas) {
    const preguntas = [], opciones = [], informes = [], nombres = [], titulos = [], textosDePista = [], todos = [];
    for (const n of narrativas) {
        informes.push(n.informe);
        todos.push(n.intro, n.cierre, n.informe, n.error, ...(n.comentarios || []), ...(n.revelaciones || []));
        for (const q of n.deduccion?.preguntas || []) { preguntas.push(q.texto); for (const o of q.opciones) opciones.push(o.texto); }
        nombres.push(...Object.values(n.deduccion?.pruebas || {}));
        for (const p of n.pistas || []) { titulos.push(p.titulo); textosDePista.push(p.texto); todos.push(p.texto); }
        for (const m of n.muebles || []) todos.push(m.texto);
        for (const m of n.marcas || []) todos.push(m.texto);
    }
    return {
        pregunta: textoRepetido(masLargo(preguntas), CARGA.vecesPregunta), conclusion: textoRepetido(masLargo(opciones), CARGA.vecesConclusion),
        informe: textoRepetido(masLargo(informes), CARGA.vecesInforme),
        // los textos más largos tal cual (sin repetir), para comparar con la carga
        preguntaReal: masLargo(preguntas), conclusionReal: masLargo(opciones), informeReal: masLargo(informes),
        nombreDePrueba: masLargo(nombres), tituloDePista: masLargo(titulos), textoDePista: masLargo(textosDePista),
        textoLargo: masLargo(todos.filter(Boolean))
    };
}

// Lo que mostraría la libreta con 25 pruebas y 10 pistas de textos largos. Los textos de las pistas se repiten para llegar a
// "largos" de verdad.
export function hallazgosExtremos(contenido, { pruebas = CARGA.pruebas, pistas = CARGA.pistas } = {}) {
    const lista = [];
    for (let i = 0; i < pruebas; i++) lista.push({ id: `carga-prueba-${i}`, tipo: 'prueba', nombre: `${i + 1}. ${contenido.nombreDePrueba}`, texto: null, nivel: (i % 6) + 1 });
    for (let i = 0; i < pistas; i++) {
        lista.push({
            id: `carga-pista-${i}`, tipo: 'pista', nombre: `${contenido.tituloDePista} ${i + 1}`, nivel: (i % 6) + 1,
            texto: Array.from({ length: 3 }, () => contenido.textoDePista).join(' ')
        });
    }
    return lista;
}

export function textoRepetido(texto, veces) {
    return Array.from({ length: veces }, () => texto).join(' ');
}
