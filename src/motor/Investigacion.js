// Reglas de una habitación: qué sale a la luz cuando el jugador hace algo. Sin Phaser y sin texto propio:
// las reglas (assets/investigaciones/nivelN.json) solo apuntan a líneas de la narrativa (assets/narrativa/nivelN.json).
//
// Recibe SUCESOS (entró, iluminó X, examinó Y, miró detrás de Y por un lado, recogió Z, rodó W, tiró de V, o "oyó cerca" de
// un objeto un golpe del fenómeno de la habitación) y devuelve ACONTECIMIENTOS
// listos para el Narrador: con identidad única, clase (importante, secundaria o ambiental) y el texto de la narrativa.
//
// Cada suceso deja un HECHO ("ilumino:n1-marca-arrastre"). Una regla sale una sola vez, en el momento en que ocurre
// el último de los hechos que pide, sea cual sea el orden. Así ninguna línea se repite y el orden es libre.

// "oyo-cerca:<objeto>" no es una acción del jugador: lo pone la escena cuando suena un golpe del fenómeno y el inspector
// está cerca de ese objeto. Las demás son acciones con E (examinar, mirar detrás, recoger, rodar, tirar).
// Sucesos del mundo, no acciones con E: "oyo-cerca" (un golpe del fenómeno con el inspector cerca), "vio-cerca" (un juguete se
// mueve con el inspector cerca), "piso" (el inspector camina sobre una zona) y "resolvio" (la deducción quedó resuelta).
const TIPOS_DE_SUCESO = ['entro', 'ilumino', 'examino', 'miro-detras', 'miro-debajo', 'recogio', 'rodo', 'tiro', 'corto', 'ordeno', 'cerro', 'apago', 'abrio',
    'oyo-cerca', 'vio-cerca', 'piso', 'resolvio', 'capturo'];
const ACCION_DE_SUCESO = {
    examino: 'examinar', 'miro-detras': 'mirar-detras', 'miro-debajo': 'mirar-debajo', recogio: 'recoger', rodo: 'rodar', tiro: 'tirar',
    corto: 'cortar', ordeno: 'ordenar', cerro: 'cerrar', apago: 'apagar', abrio: 'abrir'
};
const DEL_MUNDO = ['oyo-cerca', 'vio-cerca', 'piso'];            // llevan objeto, pero no son una acción con E
const SIN_OBJETO = ['entro', 'resolvio', 'capturo'];      // "capturo": la sombra del nivel 5 quedó atrapada
const CLASES = ['importante', 'secundaria', 'ambiental'];
// La causa antes que la consecuencia: cuando un mismo suceso produce una nota o una marca y además una revelación,
// primero sale lo que se puede ver (la tarjeta, el comentario) y la revelación después. La escena la presenta con
// un pequeño retraso para que la causa alcance a verse (src/presentacion/Narracion.js).
const ORDEN_DE_CLASE = { ambiental: 0, secundaria: 1, importante: 2 };

// "tipo", "tipo:objeto" o "tipo:objeto:lado"
export const hecho = (tipo, objeto, lado) => [tipo, objeto, lado].filter(p => p !== undefined && p !== null && p !== '').join(':');

function analizarHecho(texto) {
    const [tipo, objeto, lado, ...resto] = String(texto).split(':');
    return { tipo, objeto, lado, valido: TIPOS_DE_SUCESO.includes(tipo) && resto.length === 0 };
}

// Busca una línea de la narrativa por su referencia: "intro", "bateria", "comentarios:0", "revelaciones:1",
// "marcas:<id>", "pistas:<id>" o "muebles:<id>". Devuelve { categoria, texto, titulo?, etiqueta? } o null si no existe.
export function resolverTexto(narrativa, referencia) {
    const [categoria, clave, ...resto] = String(referencia).split(':');
    if (resto.length) return null;
    const hay = t => typeof t === 'string' && t.trim() !== '';
    switch (categoria) {
        case 'intro':
        case 'bateria':
            return clave === undefined && hay(narrativa[categoria]) ? { categoria, texto: narrativa[categoria] } : null;
        case 'comentarios':
        case 'revelaciones': {
            const i = Number(clave);
            const texto = Number.isInteger(i) ? narrativa[categoria]?.[i] : undefined;
            return hay(texto) ? { categoria, texto } : null;
        }
        case 'marcas': {
            const m = (narrativa.marcas || []).find(e => e.id === clave);
            return m && hay(m.texto) ? { categoria, texto: m.texto, etiqueta: m.icono } : null;
        }
        case 'muebles': {
            const m = (narrativa.muebles || []).find(e => e.id === clave);
            return m && hay(m.texto) ? { categoria, texto: m.texto, etiqueta: m.emoji } : null;
        }
        case 'pistas': {
            const p = (narrativa.pistas || []).find(e => e.id === clave);
            return p && hay(p.texto) ? { categoria, texto: p.texto, titulo: p.titulo } : null;
        }
        default:
            return null;
    }
}

// Comprueba las reglas contra la narrativa. Devuelve la lista de problemas (vacía si todo está bien).
export function validarReglas(reglas, narrativa) {
    const errores = [];
    const objetos = reglas?.objetos;
    if (!objetos || typeof objetos !== 'object') errores.push('faltan los "objetos"');
    if (!Array.isArray(reglas?.reglas)) { errores.push('faltan las "reglas"'); return errores; }
    const ids = new Set();

    const comprobarHecho = (texto, donde) => {
        const h = analizarHecho(texto);
        if (!h.valido) return errores.push(`${donde}: hecho mal formado "${texto}"`);
        if (SIN_OBJETO.includes(h.tipo)) return h.objeto === undefined ? undefined : errores.push(`${donde}: "${h.tipo}" no lleva objeto`);
        const def = objetos?.[h.objeto];
        if (!def) return errores.push(`${donde}: el objeto "${h.objeto}" no está definido`);
        if (h.tipo === 'ilumino') {
            if (def.descubre !== 'luz') errores.push(`${donde}: "${h.objeto}" no se descubre con la luz`);
            return undefined;
        }
        if (DEL_MUNDO.includes(h.tipo)) return undefined;        // basta con que el objeto esté definido
        const accion = def.acciones?.[ACCION_DE_SUCESO[h.tipo]];
        if (!accion) return errores.push(`${donde}: "${h.objeto}" no permite la acción de "${h.tipo}"`);
        if (accion.lados && !accion.lados.includes(h.lado)) return errores.push(`${donde}: el lado "${h.lado}" no es válido para "${h.objeto}"`);
        if (!accion.lados && h.lado !== undefined) return errores.push(`${donde}: "${h.objeto}" no distingue lados`);
        return undefined;
    };

    for (const [id, def] of Object.entries(objetos || {})) {
        for (const [nombre, accion] of Object.entries(def.acciones || {})) {
            for (const h of accion.requiere || []) comprobarHecho(h, `objeto "${id}", acción "${nombre}"`);
            for (const h of accion.alguno || []) comprobarHecho(h, `objeto "${id}", acción "${nombre}" (alguno)`);
        }
    }
    for (const regla of reglas.reglas) {
        const donde = `regla "${regla.id}"`;
        if (!regla.id) errores.push('hay una regla sin id');
        if (ids.has(regla.id)) errores.push(`${donde}: id repetido`);
        ids.add(regla.id);
        if (!CLASES.includes(regla.clase)) errores.push(`${donde}: clase "${regla.clase}" no válida`);
        if (!resolverTexto(narrativa, regla.texto)) errores.push(`${donde}: la narrativa no tiene "${regla.texto}"`);
        if (!Array.isArray(regla.cuando) || !regla.cuando.length) errores.push(`${donde}: "cuando" vacío`);
        else regla.cuando.forEach(h => comprobarHecho(h, donde));
    }
    const ayuda = reglas.ayuda;
    if (ayuda) {
        if (!(ayuda.espera > 0)) errores.push('ayuda: "espera" debe ser un número de segundos mayor que 0');
        for (const r of ayuda.refuerzos || []) {
            if (!r.efecto) errores.push('ayuda: un refuerzo no tiene "efecto"');
            for (const id of r.mientras?.sinContar || []) if (!ids.has(id)) errores.push(`ayuda: la regla "${id}" no existe`);
            if (r.mientras?.deduccion !== undefined && !['disponible', 'resuelta'].includes(r.mientras.deduccion)) errores.push(`ayuda: "deduccion" solo puede ser "disponible" o "resuelta", no "${r.mientras.deduccion}"`);
        }
    }
    return errores;
}

export default class Investigacion {
    constructor(reglas, narrativa) {
        const errores = validarReglas(reglas, narrativa);
        if (errores.length) throw new Error('Reglas de la habitación no válidas:\n- ' + errores.join('\n- '));
        this.reglas = reglas.reglas;
        this.objetos = reglas.objetos;
        this.narrativa = narrativa;
        this.reiniciar();
    }

    reiniciar() {
        this.hechos = new Set();       // todo lo que ha ocurrido
        this.dichas = new Set();       // reglas que ya salieron (cada una sale una sola vez)
        this.historial = [];           // { orden, regla, causa } en el orden en que salieron
    }

    // Azúcar para los sucesos
    entro() { return this.recibir({ tipo: 'entro' }); }
    ilumino(objeto) { return this.recibir({ tipo: 'ilumino', objeto }); }
    examino(objeto) { return this.recibir({ tipo: 'examino', objeto }); }
    miroDetras(objeto, lado) { return this.recibir({ tipo: 'miro-detras', objeto, lado }); }
    recogio(objeto) { return this.recibir({ tipo: 'recogio', objeto }); }
    rodo(objeto) { return this.recibir({ tipo: 'rodo', objeto }); }
    tiro(objeto) { return this.recibir({ tipo: 'tiro', objeto }); }
    oyoCerca(objeto) { return this.recibir({ tipo: 'oyo-cerca', objeto }); }
    vioCerca(objeto) { return this.recibir({ tipo: 'vio-cerca', objeto }); }
    piso(objeto) { return this.recibir({ tipo: 'piso', objeto }); }
    miroDebajo(objeto) { return this.recibir({ tipo: 'miro-debajo', objeto }); }
    corto(objeto) { return this.recibir({ tipo: 'corto', objeto }); }
    ordeno(objeto) { return this.recibir({ tipo: 'ordeno', objeto }); }
    cerro(objeto) { return this.recibir({ tipo: 'cerro', objeto }); }
    apago(objeto) { return this.recibir({ tipo: 'apago', objeto }); }
    abrio(objeto) { return this.recibir({ tipo: 'abrio', objeto }); }
    resolvio() { return this.recibir({ tipo: 'resolvio' }); }
    capturo() { return this.recibir({ tipo: 'capturo' }); }

    ocurrio(h) { return this.hechos.has(h); }
    yaSalio(idDeRegla) { return this.dichas.has(idDeRegla); }
    descubierto(objeto) { return this.hechos.has(hecho('ilumino', objeto)); }

    // ¿Se puede hacer esa acción ahora? (las reglas pueden exigir antes otros hechos: no se examinan unas marcas
    // que todavía no se descubrieron). `lado` solo cuenta para las acciones que distinguen lados.
    puedeActuar(objeto, accion, lado) {
        const definicion = this.objetos[objeto]?.acciones?.[accion];
        if (!definicion) return false;
        if (definicion.lados && !definicion.lados.includes(lado)) return false;
        if (!(definicion.requiere || []).every(h => this.hechos.has(h))) return false;
        // "alguno": basta con que haya ocurrido uno de ellos (la puerta se abre con la llave O con las ganzúas)
        return !definicion.alguno?.length || definicion.alguno.some(h => this.hechos.has(h));
    }

    // ¿Esa acción todavía puede dar algo? Una acción que ya ocurrió no produce nada (ninguna regla sale dos veces por el
    // mismo hecho), así que no tiene sentido ofrecerla otra vez (el ícono E no aparece sobre lo ya usado).
    // `lado` solo cuenta para las acciones que distinguen lados.
    // Una acción marcada "repetible" (tirar de la cuerda para ver otra vez el fantasma) se ofrece siempre que se pueda.
    hayAlgoNuevo(objeto, accion, lado) {
        if (!this.puedeActuar(objeto, accion, lado)) return false;
        if (this.objetos[objeto].acciones[accion].repetible) return true;
        const tipo = Object.keys(ACCION_DE_SUCESO).find(t => ACCION_DE_SUCESO[t] === accion);
        if (!tipo) return false;
        return !this.hechos.has(hecho(tipo, objeto, tipo === 'miro-detras' ? lado : undefined));
    }

    // Devuelve los acontecimientos nuevos que provoca el suceso (casi siempre ninguno o uno), con la causa primero:
    // ambientales y secundarias, y al final los importantes.
    recibir({ tipo, objeto, lado } = {}) {
        if (!TIPOS_DE_SUCESO.includes(tipo)) return [];
        if (tipo === 'ilumino' && this.objetos[objeto]?.descubre !== 'luz') return [];
        if (DEL_MUNDO.includes(tipo) && !this.objetos[objeto]) return [];
        if (ACCION_DE_SUCESO[tipo] && !this.puedeActuar(objeto, ACCION_DE_SUCESO[tipo], lado)) return [];
        const h = hecho(tipo, objeto, tipo === 'miro-detras' ? lado : undefined);
        if (this.hechos.has(h)) return [];                 // ya ocurrió: ninguna regla puede salir por ello otra vez
        this.hechos.add(h);

        const eventos = [];
        for (const regla of this.reglas) {
            if (this.dichas.has(regla.id)) continue;
            if (!regla.cuando.every(f => this.hechos.has(f))) continue;
            this.dichas.add(regla.id);
            eventos.push(this.construir(regla, h));
        }
        eventos.sort((a, b) => ORDEN_DE_CLASE[a.clase] - ORDEN_DE_CLASE[b.clase]);
        for (const e of eventos) this.historial.push({ orden: this.historial.length + 1, regla: e.regla, causa: h });
        return eventos;
    }

    construir(regla, causa) {
        const t = resolverTexto(this.narrativa, regla.texto);
        return {
            acontecimiento: regla.id,          // identidad: única por regla, así una línea nunca sale dos veces
            regla: regla.id,
            ref: regla.ref ?? regla.id,
            clase: regla.clase,
            categoria: t.categoria,
            texto: t.texto,
            titulo: t.titulo,
            etiqueta: t.etiqueta,
            alCompletar: 'conservar',
            despuesDelCierre: !!regla.despuesDelCierre,   // la escena lo retiene hasta que termine el cierre (la pista del compartimento)
            referencia: regla.texto,            // "pistas:n3-pista-carta": de dónde sale el texto (la escena guarda las pistas en el Registro)
            causa
        };
    }
}
