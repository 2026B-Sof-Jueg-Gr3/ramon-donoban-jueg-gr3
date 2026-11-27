// La música de fondo de todo el juego: cada parte tiene su canción (assets/musica/lista.json). Al cambiar de parte, la canción anterior se
// apaga y RECIÉN ENTONCES empieza la nueva: nunca suenan dos a la vez. Si dos pantallas seguidas usan la misma, sigue sonando sin cortarse.
// Suena con elementos <audio> del navegador, que la van leyendo mientras suena: no hay que descargar toda la música al empezar.
// El navegador no deja sonar nada hasta el primer clic o tecla: entonces empieza. M la silencia o la vuelve a encender (se recuerda).
// Qué parte suena en cada pantalla lo decide src/motor/ListaDeMusica.js (sin Phaser, con pruebas).
import { pistasValidas, parteDeLaEscena, VOLUMEN, FUNDIDO_MS, CLAVE_DE_SILENCIO } from '../motor/ListaDeMusica.js';

const CARPETA = 'assets/musica/';
const APAGADO_MS = 450;       // lo que tarda en apagarse la canción anterior antes de que empiece la nueva
let pistas = {};
let parteActual = null;
let actual = null;            // el audio de la parte actual
let silenciada = false;
let pendiente = null;         // el audio actual, si el navegador todavía no lo dejó sonar
const creados = new Set();    // todos los audios vivos: al empezar una canción se detienen los demás

function leerSilencio() {
    try { return localStorage.getItem(CLAVE_DE_SILENCIO) === '1'; } catch { return false; }
}

function guardarSilencio(si) {
    try { localStorage.setItem(CLAVE_DE_SILENCIO, si ? '1' : '0'); } catch { /* sin almacenamiento: solo dura esta visita */ }
}

// Lleva el volumen de un audio hasta "hasta" en "ms"; al terminar llama a alTerminar. Usa un temporizador y no requestAnimationFrame:
// así también termina si la pestaña queda en segundo plano (requestAnimationFrame se detiene y la canción vieja seguiría sonando)
function fundir(audio, hasta, ms, alTerminar) {
    clearInterval(audio._fundido);
    const desde = audio.volume, inicio = performance.now();
    audio._fundido = setInterval(() => {
        const t = Math.min(1, (performance.now() - inicio) / ms);
        audio.volume = Math.max(0, Math.min(1, desde + (hasta - desde) * t));
        if (t >= 1) {
            clearInterval(audio._fundido);
            alTerminar?.();
        }
    }, 30);
}

// Detiene un audio del todo y lo olvida
function detener(audio) {
    clearInterval(audio._fundido);
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
    creados.delete(audio);
    if (pendiente === audio) pendiente = null;
}

function intentarTocar(audio) {
    audio.play().then(() => { if (pendiente === audio) pendiente = null; })
        .catch(() => { if (audio === actual) pendiente = audio; });      // solo se reintenta la canción de la parte actual
}

// Empieza la canción de una parte, después de detener cualquier otra que quede (nunca suenan dos)
function empezar(parte) {
    if (parte !== parteActual) return;            // mientras se apagaba la anterior, el jugador ya pasó a otra parte
    for (const otro of [...creados]) detener(otro);
    const archivo = pistas[parte];
    if (!archivo) return;
    const audio = new Audio(CARPETA + archivo);
    creados.add(audio);
    audio.loop = true;
    audio.volume = 0;
    audio.muted = silenciada;
    actual = audio;
    intentarTocar(audio);
    fundir(audio, VOLUMEN, FUNDIDO_MS);
}

// Pone la música de una parte del juego (si no es la que ya suena)
export function ponerMusica(parte) {
    if (parte === parteActual) return;
    parteActual = parte;
    const viejo = actual;
    actual = null;
    if (viejo && !viejo.paused && viejo.volume > 0.01) fundir(viejo, 0, APAGADO_MS, () => { detener(viejo); empezar(parte); });
    else {
        if (viejo) detener(viejo);
        empezar(parte);
    }
}

// Para revisar desde la consola qué está sonando
export function estadoDeLaMusica() {
    const sonandoAhora = [...creados].filter(a => !a.paused).map(a => decodeURIComponent((a.getAttribute('src') || '').split('/').pop()));
    return { parte: parteActual, archivo: pistas[parteActual] ?? null, sonando: !!actual && !actual.paused, volumen: actual?.volume ?? 0, silenciada, esperandoUnClic: !!pendiente, sonandoAhora };
}

// Se llama una vez, al terminar de cargar (escena Carga): lee la lista y sigue a las escenas para poner la música de cada una
export function iniciarMusica(juego, lista) {
    pistas = pistasValidas(lista);
    if (!Object.keys(pistas).length) return;
    silenciada = leerSilencio();
    for (const escena of juego.scene.scenes) {
        escena.events.on('create', () => ponerMusica(parteDeLaEscena({
            escena: escena.scene.key, nivel: escena.numeroDeNivel ?? null, creditos: !!escena.alAbrirCreditos
        })));
    }
    juego.events.on('musica-final', () => ponerMusica('final'));
    // El primer clic o tecla deja sonar la canción actual, si el navegador la había bloqueado
    const desbloquear = () => { if (pendiente && pendiente === actual) intentarTocar(pendiente); };
    window.addEventListener('pointerdown', desbloquear);
    window.addEventListener('keydown', desbloquear);
    window.addEventListener('keydown', ev => {
        if (ev.repeat || (ev.key !== 'm' && ev.key !== 'M')) return;
        silenciada = !silenciada;
        guardarSilencio(silenciada);
        if (actual) actual.muted = silenciada;
    });
}
