// El modo de prueba de carga de la interfaz: con ?carga=extrema en la dirección, la libreta, la deducción, el informe, el
// panel de tarjetas y la caja de importantes se llenan con el contenido más grande que puede tener el juego (25 pruebas,
// 10 pistas con textos largos y la pregunta, la conclusión y el informe más largos de los seis niveles). Con él se pasa F6
// por cada pantalla (src/presentacion/Revisor.js). En una habitación: F7 lanza las tarjetas extremas y F8 la caja extrema.
import { TOTAL_NIVELES } from '../motor/niveles.js';
import { contenidoExtremo, hallazgosExtremos, textoRepetido, CARGA } from '../motor/cargaExtrema.js';

export function cargaExtrema() {
    try {
        return new URLSearchParams(window.location.search).get('carga') === 'extrema';
    } catch {
        return false;
    }
}

function narrativasDelJuego(escena) {
    return Array.from({ length: TOTAL_NIVELES }, (_, i) => escena.cache.json.get('narrativa' + (i + 1)));
}

export function contenidoDelJuego(escena) {
    return contenidoExtremo(narrativasDelJuego(escena));
}

export function informeExtremo(escena) {
    return contenidoDelJuego(escena).informe;
}

// Cambia lo que ve el cuaderno de una habitación: 25 pruebas y 10 pistas, las preguntas y las conclusiones más largas, y la
// deducción disponible con todo resuelto en la libreta. No toca las reglas: solo lo que se muestra.
export function aplicarALaHabitacion(escena) {
    const c = contenidoDelJuego(escena);
    const libreta = Object.create(escena.libreta);
    const hallazgos = hallazgosExtremos(c);
    libreta.hallazgos = () => hallazgos;
    libreta.idsEncontrados = () => hallazgos.map(h => h.id);

    escena.libreta = libreta;
    if (!escena.narrativa.deduccion) return;         // la persecución del nivel 5 no tiene deducción: solo cambia la libreta

    const narrativa = structuredClone(escena.narrativa);
    for (const q of narrativa.deduccion.preguntas) {
        q.texto = c.pregunta;
        for (const o of q.opciones) o.texto = c.conclusion;
    }

    const deduccion = Object.create(escena.deduccion);
    deduccion.disponible = () => true;
    deduccion.logradas = () => escena.deduccion.preguntas.map(pregunta => ({ pregunta, conclusion: narrativa.deduccion.preguntas.find(t => t.id === pregunta.id).opciones[0].id }));
    escena.narrativa = narrativa;
    escena.deduccion = deduccion;
}

let numero = 0;

// F7: la nota de la libreta y tarjetas ambientales con textos largos
export function lanzarTarjetas(escena) {
    const c = contenidoDelJuego(escena);
    const texto = textoRepetido(c.textoLargo, CARGA.repeticionesDeTarjeta);
    const n = ++numero;
    const narrador = escena.narracion.narrador;
    narrador.contar({ acontecimiento: `carga:nota#${n}`, ref: 'carga-nota', clase: 'secundaria', texto, alCompletar: 'descartar' });
    for (let i = 1; i <= 3; i++) {
        narrador.contar({ acontecimiento: `carga:rastro#${n}.${i}`, ref: `carga-rastro-${i}`, clase: 'ambiental', texto: textoRepetido(c.textoLargo, i), titulo: 'RASTRO', etiqueta: '✦' });
    }
}

// F8: un texto importante larguísimo (la caja lo reparte en páginas)
export function lanzarCaja(escena) {
    const c = contenidoDelJuego(escena);
    const n = ++numero;
    escena.narracion.narrador.contar({
        acontecimiento: `carga:importante#${n}`, ref: 'carga-importante', clase: 'importante',
        texto: textoRepetido(c.textoLargo, CARGA.repeticionesDeCaja), alCompletar: 'descartar'
    });
}
