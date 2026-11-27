// La libreta del inspector: convierte lo que ya salió en Investigacion en pruebas. Sin Phaser y sin texto propio:
// los nombres cortos están en la narrativa ("deduccion.pruebas") y las pistas usan su título y su texto.
// Solo muestra lo encontrado, nunca lo que falta. Se calcula de lo que ya salió (un conjunto), así que no depende
// del orden en que se encontraron las cosas: el orden de la lista es siempre el de las reglas del nivel.
//
// assets/investigaciones/nivelN.json → "deduccion.pruebas": { id: { "sale": id de la regla de la que sale } }
// Una prueba cuyo id es el de una pista de la narrativa se muestra como pista (título y texto).
//
// El EXPEDIENTE (nivel 6, "deduccion.expediente": true): además de las pruebas del nivel, muestra todas las pistas que el Registro
// guardó en los niveles anteriores, agrupadas por habitación. Una prueba con "registro": true no sale de una regla de este nivel:
// existe si el Registro tiene esa pista (la deducción final usa el recibo, la carta y los planos de otras habitaciones).

// Cómo se escribe un nombre en la lista de pruebas de la deducción: igual que los demás. Los títulos de las pistas están en
// mayúsculas ("RECIBO DE FERRETERÍA"); en esa lista eso las delataría frente a las pruebas ("Cuerda al techo"), así que se pasan a
// minúsculas con la primera en mayúscula. Un nombre que ya viene en minúsculas no se toca.
export function nombreEnLista(nombre) {
    const t = String(nombre ?? '');
    if (t !== t.toLocaleUpperCase('es') || t === t.toLocaleLowerCase('es')) return t;
    const minusculas = t.toLocaleLowerCase('es');
    return minusculas.charAt(0).toLocaleUpperCase('es') + minusculas.slice(1);
}

const ES_EXTRA = /^(muebles|pistas|marcas):/;

export default class Libreta {
    // definicion: reglas.deduccion · narrativa: assets/narrativa/nivelN.json · investigacion: necesita yaSalio(idDeRegla)
    // opciones: { nivel, registro: () => { idDePista: { nivel } }, narrativas: { n: narrativa } } (solo hace falta con el expediente)
    constructor(definicion, narrativa, investigacion, { nivel = 0, registro = () => ({}), narrativas = {} } = {}) {
        this.definicion = definicion;
        this.narrativa = narrativa;
        this.investigacion = investigacion;
        this.pistas = narrativa.pistas || [];
        this.nivel = nivel;
        this.registro = registro;
        this.narrativas = narrativas;
    }

    // Todas las pruebas que existen en el nivel, en el orden de las reglas
    get ids() { return Object.keys(this.definicion.pruebas); }

    encontrada(id) {
        const prueba = this.definicion.pruebas[id];
        if (!prueba) return false;
        if (prueba.registro) return id in this.registro();
        return this.investigacion.yaSalio(prueba.sale);
    }

    idsEncontrados() {
        return this.hallazgos().map(h => h.id);
    }

    // Las pistas de OTROS niveles que el Registro guardó (solo en el expediente), con su nivel
    delRegistro() {
        if (!this.definicion.expediente) return [];
        const lista = [];
        for (const [id, info] of Object.entries(this.registro())) {
            if (info.nivel === this.nivel) continue;
            const pista = (this.narrativas[info.nivel]?.pistas || []).find(p => p.id === id);
            if (pista) lista.push({ id, tipo: 'pista', nombre: pista.titulo, texto: pista.texto, nivel: info.nivel });
        }
        return lista.sort((a, b) => a.nivel - b.nivel || a.id.localeCompare(b.id));
    }

    // { id, tipo: 'prueba' | 'pista', nombre, texto, nivel } de cada prueba encontrada (texto solo en las pistas)
    hallazgos() {
        const delRegistro = this.delRegistro();
        const grupo = this.definicion.expediente ? { nivel: this.nivel } : {};       // el nivel solo importa en el expediente
        const propios = this.ids.filter(id => this.encontrada(id)).map(id => {
            const pista = this.pistas.find(p => p.id === id);
            if (pista) return { id, tipo: 'pista', nombre: pista.titulo, texto: pista.texto, ...grupo };
            const otra = delRegistro.find(h => h.id === id);
            if (otra) return otra;
            return { id, tipo: 'prueba', nombre: this.narrativa.deduccion.pruebas[id], texto: null, ...grupo };
        });
        if (!this.definicion.expediente) return propios;
        const vistos = new Set(propios.map(h => h.id));
        // Las pistas de este nivel que no son prueba (las cartas de compradores…) también van al expediente
        const delNivel = this.pistas.filter(p => this.investigacion.yaSalio(`pista:${p.id}`) && !vistos.has(p.id))
            .map(p => ({ id: p.id, tipo: 'pista', nombre: p.titulo, texto: p.texto, nivel: this.nivel }));
        return [...propios, ...delNivel, ...delRegistro.filter(h => !vistos.has(h.id))];
    }

    nombreDe(id) {
        const pista = this.pistas.find(p => p.id === id);
        return pista ? pista.titulo : this.narrativa.deduccion?.pruebas?.[id] ?? this.delRegistro().find(h => h.id === id)?.nombre;
    }

    // ¿Las pistas que hay que recoger antes de poder deducir (p. ej. la carta, para el final) ya están?
    obligatoriasListas() {
        return (this.definicion.obligatorias || []).every(id => this.encontrada(id));
    }

    // Lo que cuenta el informe final (es el único lugar con contadores). "extras": lo que no hace falta para la deducción
    // (muebles, pistas y marcas que no están en la única respuesta de ninguna pregunta ni son obligatorios); el total sale de los datos.
    resumen() {
        const usadas = new Set();
        for (const q of this.definicion.preguntas || []) for (const c of q.validas) for (const p of c) usadas.add(this.definicion.pruebas[p]?.sale);
        const extras = (this.investigacion.reglas || []).filter(r => ES_EXTRA.test(r.texto) && !r.paraElFinal && !usadas.has(r.id));
        const encontradas = new Set(this.idsEncontrados());
        return {
            extras: extras.filter(r => this.investigacion.yaSalio(r.id)).length,
            totalDeExtras: extras.length,
            pistas: this.pistas.filter(p => encontradas.has(p.id)).length,
            totalDePistas: this.pistas.length,
            pilas: this.definicion.pilas ? this.investigacion.yaSalio(this.definicion.pilas) : false
        };
    }
}
