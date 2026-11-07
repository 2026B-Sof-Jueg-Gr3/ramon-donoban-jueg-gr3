// Regresión de los temporizadores de escritura (PanelInvestigacion y DialogoPrincipal) con el reloj de Phaser 3.80.1.
// Defecto: si un cuadro lento coincide con el final de una escritura, Phaser recupera el tiempo ejecutando varias veces
// la función del temporizador repetitivo; la función lo cancela, pero el reloj lo deja activo otra vez y la función
// vuelve a ejecutarse una vez más en el cuadro siguiente, con su estado ya limpiado.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Clock } from './relojPhaser380.mjs';
import { crearEscena } from './escenaSimulada.mjs';
import { LECTURA } from '../src/ui/tiemposDeLectura.js';

const { default: PanelInvestigacion } = await import('../src/ui/PanelInvestigacion.js');
const { default: DialogoPrincipal } = await import('../src/ui/DialogoPrincipal.js');

const L = LECTURA.escrituraPorLetraMs;            // 16 ms por letra en la libreta
const D = LECTURA.escrituraDialogoPorLetraMs;     // 22 ms por letra en la presentación importante

// ── El reloj transcrito reproduce el comportamiento de Phaser 3.80.1 ──────────

test('Phaser 3.80.1: un temporizador repetitivo cancelado desde su función durante la recuperación vuelve a ejecutarse', () => {
    const reloj = new Clock();
    let llamadas = 0;
    const t = reloj.addEvent({ delay: 16, loop: true, callback: () => { llamadas++; if (llamadas === 3) t.remove(); } });
    reloj.preUpdate(); reloj.update(16, 16);      // 1.ª ejecución
    reloj.preUpdate(); reloj.update(66, 50);      // cuadro lento: 2.ª y 3.ª (se cancela en la 3.ª)
    assert.equal(llamadas, 3);
    reloj.preUpdate(); reloj.update(82, 16);      // el reloj lo había vuelto a activar
    assert.equal(llamadas, 4, 'la función se ejecuta una vez más después de cancelarse: así falla el juego');
    reloj.preUpdate(); reloj.update(98, 16);
    assert.equal(llamadas, 4, 'después sí queda retirado');
});

test('Phaser 3.80.1: sin cuadro lento, cancelar desde la función no provoca otra ejecución', () => {
    const reloj = new Clock();
    let llamadas = 0;
    const t = reloj.addEvent({ delay: 16, loop: true, callback: () => { llamadas++; if (llamadas === 3) t.remove(); } });
    for (let i = 1; i <= 6; i++) { reloj.preUpdate(); reloj.update(i * 16, 16); }
    assert.equal(llamadas, 3);
});

// ── PanelInvestigacion ───────────────────────────────────────────────────────

function panelDePrueba() {
    const escena = crearEscena();
    const panel = new PanelInvestigacion(escena);
    panel.reposicionar({ x: 0, y: 0, ancho: 300, alto: 200 });
    return { escena, panel };
}

const TEXTO = 'abcdefghij';                     // 10 letras, una línea
const mostrarNota = (panel, texto = TEXTO, extra = {}) => {
    const registro = { leida: 0, terminada: 0 };
    const tarjeta = panel.mostrarSecundaria({ texto, titulo: 'NOTA' }, {
        lecturaMs: 3000, alLeida: () => registro.leida++, alTerminar: () => registro.terminada++, ...extra
    });
    return { tarjeta, registro };
};
const escribirHasta = (escena, tarjeta, letras) => { for (let i = 0; i < 1000 && tarjeta.escritas < letras; i++) escena.cuadro(L); };

test('panel: escritura normal a una letra cada 16 ms, lectura completa y cierre una sola vez', () => {
    const { escena, panel } = panelDePrueba();
    const { tarjeta, registro } = mostrarNota(panel);
    // Como en Phaser, el temporizador entra al reloj en el primer cuadro y ese mismo cuadro ya escribe una letra
    for (let letra = 1; letra <= 9; letra++) { escena.cuadro(L); assert.equal(tarjeta.escritas, letra, 'una letra por cuadro de 16 ms'); }
    escena.cuadro(L);
    assert.deepEqual([tarjeta.escritas, tarjeta.cuerpo.text, tarjeta.fase], [10, TEXTO, 'leyendo']);
    assert.equal(tarjeta.escritura, null);
    escena.cuadros(Math.ceil(3000 / L) - 1);                   // 187 cuadros: 2992 ms de lectura
    assert.equal(tarjeta.fase, 'leyendo', 'todavía dentro de sus 3 s de lectura');
    assert.equal(registro.leida, 0);
    escena.cuadro(L);                                          // 3008 ms: termina la lectura
    assert.equal(registro.leida, 1);
    assert.equal(tarjeta.fase, 'saliendo');
    escena.cuadros(14);                                        // animación de salida (220 ms)
    assert.deepEqual([tarjeta.fase, registro.terminada, panel.tarjetas.length], ['terminada', 1, 0]);
});

test('panel: cuadro lento justo al final de la escritura (escenario original) no lanza error ni escribe de más', () => {
    const { escena, panel } = panelDePrueba();
    const { tarjeta, registro } = mostrarNota(panel);
    escena.cuadro(L);
    escribirHasta(escena, tarjeta, TEXTO.length - 2);
    assert.equal(tarjeta.escritas, 8);
    escena.cuadro(50);                                         // recuperación: escribe las dos últimas y se cancela
    assert.deepEqual([tarjeta.escritas, tarjeta.fase], [10, 'leyendo']);
    const restante = tarjeta.temporizador.getRemaining();
    assert.doesNotThrow(() => escena.cuadros(5, L), 'el cuadro siguiente es donde fallaba');
    assert.equal(tarjeta.escritas, 10, 'la ejecución obsoleta no suma letras');
    assert.equal(tarjeta.cuerpo.text, TEXTO);
    assert.equal(registro.leida, 0);
    assert.ok(tarjeta.temporizador.getRemaining() < restante, 'la lectura sigue su curso normal');
});

test('panel: reejecución accidental del temporizador cancelado no tiene efecto', () => {
    const { escena, panel } = panelDePrueba();
    const { tarjeta } = mostrarNota(panel);
    escena.cuadro(L);
    const funcionVieja = tarjeta.escritura.callback;            // Phaser la borra del temporizador al retirarlo
    escribirHasta(escena, tarjeta, TEXTO.length);
    const lectura = tarjeta.temporizador;
    assert.doesNotThrow(() => funcionVieja());
    assert.deepEqual([tarjeta.escritas, tarjeta.temporizador, tarjeta.fase], [10, lectura, 'leyendo'], 'no crea otra lectura');
});

test('panel: cancelar (retirar) durante la escritura detiene todo y limpia las referencias', () => {
    const { escena, panel } = panelDePrueba();
    const { tarjeta, registro } = mostrarNota(panel);
    escena.cuadro(L);
    escribirHasta(escena, tarjeta, 4);
    const funcionVieja = tarjeta.escritura.callback;
    panel.retirarTodo();
    assert.deepEqual([tarjeta.escritura, tarjeta.temporizador, tarjeta.vista.destruido], [null, null, true]);
    assert.doesNotThrow(() => { escena.cuadros(20, L); funcionVieja(); });
    assert.equal(tarjeta.escritas, 4);
    assert.equal(tarjeta.cuerpo.escriturasTrasDestruir, 0, 'no toca el texto destruido');
    assert.deepEqual([registro.leida, registro.terminada], [0, 0]);
});

test('panel: eliminar solo una tarjeta durante su escritura no afecta a las demás', () => {
    const { escena, panel } = panelDePrueba();
    const a = mostrarNota(panel, 'nota a eliminar');
    const b = mostrarNota(panel, 'texto ambiental que sigue', { lecturaMs: 2000 });
    escena.cuadro(L);
    escribirHasta(escena, a.tarjeta, 3);
    panel.retirar(t => t === a.tarjeta);
    assert.equal(panel.tarjetas.length, 1);
    escribirHasta(escena, b.tarjeta, b.tarjeta.envuelto.length);
    assert.equal(b.tarjeta.fase, 'leyendo');
    assert.equal(a.tarjeta.cuerpo.escriturasTrasDestruir, 0);
});

test('panel: una escritura nueva tras cancelar la anterior no es alterada por el temporizador viejo', () => {
    const { escena, panel } = panelDePrueba();
    const vieja = mostrarNota(panel, 'texto viejo de la nota');
    escena.cuadro(L);
    escribirHasta(escena, vieja.tarjeta, 5);
    const funcionVieja = vieja.tarjeta.escritura.callback;
    panel.retirarTodo();
    const nueva = mostrarNota(panel, TEXTO);
    escribirHasta(escena, nueva.tarjeta, 3);
    funcionVieja();
    assert.equal(nueva.tarjeta.escritas, 3);
    assert.equal(nueva.tarjeta.cuerpo.text, 'abc');
    escribirHasta(escena, nueva.tarjeta, 10);
    assert.deepEqual([nueva.tarjeta.cuerpo.text, nueva.tarjeta.fase], [TEXTO, 'leyendo']);
});

test('panel: destruir el componente justo después del cuadro lento (escritura recién cancelada) no lanza error', () => {
    const { escena, panel } = panelDePrueba();
    const { tarjeta } = mostrarNota(panel);
    escena.cuadro(L);
    escribirHasta(escena, tarjeta, TEXTO.length - 2);
    escena.cuadro(50);
    panel.retirarTodo();
    assert.doesNotThrow(() => escena.cuadros(10, L));
    assert.equal(tarjeta.cuerpo.escriturasTrasDestruir, 0);
});

test('panel: la pausa sigue conservando la letra exacta y la lectura restante', () => {
    const { escena, panel } = panelDePrueba();
    const { tarjeta } = mostrarNota(panel);
    escena.cuadro(L);
    escribirHasta(escena, tarjeta, 6);
    panel.pausar();
    escena.cuadros(100, L);
    assert.equal(tarjeta.escritas, 6);
    panel.reanudar();
    escribirHasta(escena, tarjeta, 10);
    escena.cuadro(L);
    const restante = tarjeta.temporizador.getRemaining();
    panel.pausar();
    escena.cuadros(100, L);
    assert.equal(tarjeta.temporizador.getRemaining(), restante);
});

// ── DialogoPrincipal ─────────────────────────────────────────────────────────

function dialogoDePrueba() {
    const escena = crearEscena();
    const dialogo = new DialogoPrincipal(escena, () => { });
    dialogo.reposicionar({ x: 0, y: 574, ancho: 800, alto: 226 }, { x: 0, y: 64, ancho: 800, alto: 510 });
    return { escena, dialogo };
}

// Con 680 px de ancho caben 81 letras por línea y 6 líneas por página: este texto ocupa 2 páginas
const PALABRA = 'evidencia';
const LARGO = Array.from({ length: 70 }, (_, i) => `${PALABRA}${i}`).join(' ');
const escribirPagina = (escena, dialogo) => { for (let i = 0; i < 2000 && dialogo.escritura; i++) escena.cuadro(D); };

test('diálogo: páginas escritas a una letra cada 22 ms; completar, seguir y cerrar en orden', () => {
    const { escena, dialogo } = dialogoDePrueba();
    let cerrado = 0;
    dialogo.abrir(LARGO, { alCerrar: () => cerrado++ });
    assert.equal(dialogo.paginas.length, 2);
    escena.cuadros(10, D);                                    // el primer cuadro ya escribe la primera letra
    assert.equal(dialogo.cuerpo.text, dialogo.paginas[0].slice(0, 10), 'una letra por cada 22 ms');
    escribirPagina(escena, dialogo);
    assert.equal(dialogo.cuerpo.text, dialogo.paginas[0]);
    assert.match(dialogo.pista.text, /sigue/);
    dialogo.alTocar();                                        // página 2
    assert.equal(dialogo.pagina, 1);
    escena.cuadro(D);
    escribirPagina(escena, dialogo);
    assert.equal(dialogo.cuerpo.text, dialogo.paginas[1]);
    assert.match(dialogo.pista.text, /para continuar/);
    assert.equal(cerrado, 0);
    dialogo.alTocar();
    assert.equal(cerrado, 1, 'cerrar la última página avisa una sola vez');
    dialogo.alTocar();
    assert.equal(cerrado, 1);
    assert.equal((dialogo.paginas[0] + '\n' + dialogo.paginas[1]).replace(/\n/g, ' '), LARGO, 'no se pierde texto entre páginas');
});

test('diálogo: completar con un toque cancela la escritura; su temporizador ya no cambia nada', () => {
    const { escena, dialogo } = dialogoDePrueba();
    dialogo.abrir('Texto breve del acontecimiento importante.', {});
    escena.cuadros(6, D);
    const funcionVieja = dialogo.escritura.callback;
    dialogo.alTocar();
    assert.equal(dialogo.escritura, null);
    assert.equal(dialogo.cuerpo.text, 'Texto breve del acontecimiento importante.');
    escena.cuadros(10, D);
    funcionVieja();
    assert.equal(dialogo.cuerpo.text, 'Texto breve del acontecimiento importante.');
});

test('diálogo: cierre de la última página inmediatamente después de un cuadro lento (escenario original)', () => {
    const { escena, dialogo } = dialogoDePrueba();
    const texto = 'Texto importante de prueba para el cuadro lento.';
    dialogo.abrir(texto, { alCerrar: () => dialogo.cerrar() });
    escena.cuadro(D);
    for (let i = 0; i < 500 && dialogo.cuerpo.text.length < texto.length - 2; i++) escena.cuadro(D);
    const cuerpo = dialogo.cuerpo;
    escena.cuadro(50);                                        // recuperación: termina de escribir y se cancela
    assert.equal(cuerpo.text, texto);
    dialogo.alTocar();                                        // el jugador cierra en ese mismo instante
    assert.equal(dialogo.abierto, false);
    assert.doesNotThrow(() => escena.cuadros(5, D), 'el cuadro siguiente es donde fallaba (línea 119)');
    assert.equal(cuerpo.escriturasTrasDestruir, 0, 'no escribe en el texto ya destruido');
});

test('diálogo: tras un cuadro lento, la ejecución obsoleta no escribe en la página nueva ni cancela su escritura', () => {
    const { escena, dialogo } = dialogoDePrueba();
    dialogo.abrir(LARGO, {});
    escena.cuadro(D);
    const pagina1 = dialogo.paginas[0];
    for (let i = 0; i < 2000 && dialogo.cuerpo.text.length < pagina1.length - 2; i++) escena.cuadro(D);
    escena.cuadro(50);                                        // fin de la página 1 durante la recuperación
    assert.equal(dialogo.cuerpo.text, pagina1);
    dialogo.alTocar();                                        // pasa a la página 2 en ese instante
    assert.ok(dialogo.escritura, 'la página 2 empieza a escribirse');
    escena.cuadros(3, D);
    assert.equal(dialogo.cuerpo.text, dialogo.paginas[1].slice(0, dialogo.cuerpo.text.length), 'el cuerpo muestra solo la página 2');
    assert.ok(dialogo.cuerpo.text.length < dialogo.paginas[1].length, 'y sigue escribiéndose letra a letra');
    assert.ok(dialogo.escritura, 'su temporizador no fue cancelado por el viejo');
});

test('diálogo: una página nueva tras cerrar la anterior se escribe normalmente aunque el temporizador viejo se ejecute', () => {
    const { escena, dialogo } = dialogoDePrueba();
    dialogo.abrir('Primer acontecimiento.', {});
    escena.cuadros(4, D);
    const funcionVieja = dialogo.escritura.callback;
    dialogo.cerrar();
    dialogo.abrir('Segundo acontecimiento.', {});
    escena.cuadros(5, D);
    funcionVieja();
    assert.equal(dialogo.cuerpo.text, 'Segundo acontecimiento.'.slice(0, dialogo.cuerpo.text.length));
    escribirPagina(escena, dialogo);
    assert.equal(dialogo.cuerpo.text, 'Segundo acontecimiento.');
});

test('diálogo: destruirlo (cerrar) durante la escritura detiene todo sin tocar textos destruidos', () => {
    const { escena, dialogo } = dialogoDePrueba();
    dialogo.abrir('Un acontecimiento que se cierra a mitad de escritura.', {});
    escena.cuadros(7, D);
    const cuerpo = dialogo.cuerpo, funcionVieja = dialogo.escritura.callback;
    dialogo.cerrar();
    assert.deepEqual([dialogo.escritura, dialogo.abierto, dialogo.pista], [null, false, null]);
    assert.doesNotThrow(() => { escena.cuadros(20, D); funcionVieja(); });
    assert.equal(cuerpo.escriturasTrasDestruir, 0);
});
