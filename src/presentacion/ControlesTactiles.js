// Los controles táctiles, al estilo de un emulador (PPSSPP): un joystick a la izquierda y botones de contorno fino a la derecha,
// dibujados en HTML encima del juego. No cambian el juego: cada control "aprieta" la misma tecla que usaría el teclado (el joystick,
// las flechas; E; Tab para la libreta; Esc para la pausa; M para la música), así que todo lo demás funciona igual que en la
// computadora. La linterna sigue apuntando hacia donde camina el inspector (src/motor/Apuntado.js): los toques no la mueven.
//
// Solo aparecen en pantallas táctiles (o tras el primer toque), y el joystick y los botones de juego solo dentro de una habitación.
// En vertical se pide girar el teléfono.
import { flechasDelJoystick, limitarAlAro, cambiosDeFlechas } from '../motor/Joystick.js';

const CODIGO = { izquierda: 37, arriba: 38, derecha: 39, abajo: 40, E: 69, TAB: 9, ESC: 27, M: 77 };
const NOMBRE = { izquierda: 'ArrowLeft', arriba: 'ArrowUp', derecha: 'ArrowRight', abajo: 'ArrowDown', E: 'e', TAB: 'Tab', ESC: 'Escape', M: 'm' };

// Una pulsación de teclado como la del teclado de verdad (Phaser mira keyCode; la música, key)
function tecla(tipo, cual) {
    const ev = new KeyboardEvent(tipo, { key: NOMBRE[cual], bubbles: true, cancelable: true });
    Object.defineProperty(ev, 'keyCode', { get: () => CODIGO[cual] });
    Object.defineProperty(ev, 'which', { get: () => CODIGO[cual] });
    window.dispatchEvent(ev);
}

// Que el dedo siga siendo de ese control aunque salga de él (si el navegador no puede, no pasa nada: se sigue igual)
function capturar(elemento, id) {
    try { elemento.setPointerCapture(id); } catch { /* sin captura */ }
}

const ESTILO = `
.tactil { position: fixed; inset: 0; z-index: 10; pointer-events: none; display: none; font-family: Arial, Helvetica, sans-serif;
    -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; touch-action: none; }
.tactil.activo { display: block; }
.tactil.fuera-de-habitacion .solo-habitacion { display: none; }
/* Mientras se lee un texto no se camina ni se abre la libreta: solo queda E (o tocar la pantalla) para seguir, y no tapa la caja */
.tactil.leyendo .tt-aro, .tactil.leyendo .tt-libreta, .tactil.con-cuaderno .tt-aro { display: none; }
.tactil.leyendo .tt-e { opacity: 0.55; }
.tt-aro, .tt-boton { position: absolute; pointer-events: auto; touch-action: none; -webkit-tap-highlight-color: transparent; }
.tt-aro { left: calc(5vmin + env(safe-area-inset-left)); bottom: 6vmin; width: 34vmin; height: 34vmin; border-radius: 50%;
    border: 2px solid rgba(225, 225, 225, 0.5); background: rgba(0, 0, 0, 0.14); }
.tt-pomo { position: absolute; left: 50%; top: 50%; width: 18vmin; height: 18vmin; margin: -9vmin 0 0 -9vmin; border-radius: 50%;
    border: 2px solid rgba(230, 230, 230, 0.75);
    background: radial-gradient(circle, rgba(230, 230, 230, 0.4) 0.8px, transparent 1.4px) 0 0 / 5px 5px, rgba(30, 30, 30, 0.5);
    box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.35); }
.tt-boton { display: flex; align-items: center; justify-content: center; color: rgba(235, 235, 235, 0.88);
    border: 2px solid rgba(225, 225, 225, 0.6); background: rgba(0, 0, 0, 0.16); }
.tt-boton.apretado { background: rgba(255, 255, 255, 0.24); border-color: rgba(255, 255, 255, 0.9); }
.tt-redondo { border-radius: 50%; }
.tt-e { right: calc(6vmin + env(safe-area-inset-right)); bottom: 9vmin; width: 19vmin; height: 19vmin; font-size: 8vmin; }
.tt-libreta { right: calc(28vmin + env(safe-area-inset-right)); bottom: 21vmin; width: 14vmin; height: 14vmin; }
.tt-libreta svg { width: 7vmin; height: 7vmin; }
.tt-rect { top: 3vmin; height: 7.5vmin; min-width: 17vmin; padding: 0 2.4vmin; font-size: 3.2vmin; letter-spacing: 0.08em; }
/* En las esquinas de arriba, como los gatillos L y R: así no tapan los títulos de la libreta ni de la pausa, que van al centro */
.tt-musica { left: calc(3vmin + env(safe-area-inset-left)); border-radius: 3px 14px 3px 3px; }
.tt-pausa { right: calc(3vmin + env(safe-area-inset-right)); border-radius: 14px 3px 3px 3px; }
.tt-girar { position: fixed; inset: 0; z-index: 11; display: none; flex-direction: column; align-items: center; justify-content: center;
    gap: 18px; background: #04060b; color: #f4efe4; font-family: Georgia, serif; font-size: 20px; text-align: center; padding: 24px; }
.tt-girar svg { width: 72px; height: 72px; animation: tt-girar 2.2s ease-in-out infinite; }
@keyframes tt-girar { 0%, 30% { transform: rotate(0); } 60%, 100% { transform: rotate(-90deg); } }
@media (orientation: portrait) { .tactil.activo + .tt-girar { display: flex; } }
`;

const ICONO_LIBRETA = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><path d="M5 3.5h11.5a2 2 0 0 1 2 2V20.5H7a2 2 0 0 1-2-2z"/><path d="M5 18.5a2 2 0 0 1 2-2h11.5"/><path d="M9 7.5h6M9 10.5h6"/></svg>';
const ICONO_TELEFONO = '<svg viewBox="0 0 24 24" fill="none" stroke="#ffd060" stroke-width="1.5"><rect x="7" y="2.5" width="10" height="19" rx="2"/><path d="M11 18.5h2"/></svg>';

export default class ControlesTactiles {
    constructor(juego) {
        this.juego = juego;
        this.flechas = { izquierda: false, derecha: false, arriba: false, abajo: false };
        this.dedo = null;               // el pointerId que maneja el joystick
    }

    instalar() {
        const estilo = document.createElement('style');
        estilo.textContent = ESTILO;
        document.head.appendChild(estilo);

        const raiz = document.createElement('div');
        raiz.className = 'tactil fuera-de-habitacion';
        raiz.innerHTML = `
            <div class="tt-aro solo-habitacion" aria-label="Joystick"><div class="tt-pomo"></div></div>
            <div class="tt-boton tt-redondo tt-e solo-habitacion" data-tecla="E" aria-label="Usar o continuar">E</div>
            <div class="tt-boton tt-redondo tt-libreta solo-habitacion" data-tecla="TAB" aria-label="Libreta">${ICONO_LIBRETA}</div>
            <div class="tt-boton tt-rect tt-musica" data-tecla="M" aria-label="Música">MÚSICA</div>
            <div class="tt-boton tt-rect tt-pausa solo-habitacion" data-tecla="ESC" aria-label="Pausa">PAUSA</div>`;
        const girar = document.createElement('div');
        girar.className = 'tt-girar';
        girar.innerHTML = `${ICONO_TELEFONO}<div>Gira el teléfono para jugar</div>`;
        document.body.append(raiz, girar);
        this.raiz = raiz;
        this.aro = raiz.querySelector('.tt-aro');
        this.pomo = raiz.querySelector('.tt-pomo');

        this.instalarJoystick();
        for (const boton of raiz.querySelectorAll('[data-tecla]')) this.instalarBoton(boton);

        // Aparecen en pantallas táctiles desde el principio, o en cuanto alguien toca la pantalla
        if (matchMedia('(pointer: coarse)').matches) this.activar();
        window.addEventListener('pointerdown', ev => { if (ev.pointerType === 'touch') this.activar(); }, { passive: true });
        window.addEventListener('touchstart', () => this.activar(), { passive: true, once: true });

        // El joystick y los botones de juego solo dentro de una habitación, y no mientras se lee un texto o está abierta la libreta
        const vigilar = () => {
            const enHabitacion = this.juego.scene.isActive('Habitacion');
            const habitacion = enHabitacion ? this.juego.scene.getScene('Habitacion') : null;
            const leyendo = !!habitacion?.narracion?.bloqueando, conCuaderno = !!habitacion?.cuaderno?.abierta;
            raiz.classList.toggle('fuera-de-habitacion', !enHabitacion);
            raiz.classList.toggle('leyendo', leyendo);
            raiz.classList.toggle('con-cuaderno', conCuaderno);
            if ((!enHabitacion || leyendo || conCuaderno) && this.dedo !== null) this.soltarJoystick();
            requestAnimationFrame(vigilar);
        };
        requestAnimationFrame(vigilar);
    }

    activar() {
        if (this.activo) return;
        this.activo = true;
        this.raiz.classList.add('activo');
        // Pantalla completa y apaisado, si el navegador lo permite (en iPhone no: ahí se queda la barra del navegador)
        const pantallaCompleta = () => {
            window.removeEventListener('pointerup', pantallaCompleta);
            const el = document.documentElement;
            if (document.fullscreenElement || !el.requestFullscreen) return;
            el.requestFullscreen({ navigationUI: 'hide' }).then(() => screen.orientation?.lock?.('landscape')).catch(() => { });
        };
        window.addEventListener('pointerup', pantallaCompleta);
    }

    instalarJoystick() {
        const mover = ev => {
            const r = this.aro.getBoundingClientRect();
            const radio = r.width / 2;
            const dx = ev.clientX - (r.left + radio), dy = ev.clientY - (r.top + radio);
            const p = limitarAlAro(dx, dy, radio * 0.6);
            this.pomo.style.transform = `translate(${p.x}px, ${p.y}px)`;
            this.ponerFlechas(flechasDelJoystick(dx, dy, radio * 0.6));
        };
        this.aro.addEventListener('pointerdown', ev => {
            ev.preventDefault();
            if (this.dedo !== null) return;
            this.dedo = ev.pointerId;
            capturar(this.aro, ev.pointerId);
            mover(ev);
        });
        this.aro.addEventListener('pointermove', ev => { if (ev.pointerId === this.dedo) mover(ev); });
        const soltar = ev => { if (ev.pointerId === this.dedo) this.soltarJoystick(); };
        this.aro.addEventListener('pointerup', soltar);
        this.aro.addEventListener('pointercancel', soltar);
        this.aro.addEventListener('lostpointercapture', soltar);
    }

    soltarJoystick() {
        this.dedo = null;
        this.pomo.style.transform = '';
        this.ponerFlechas({ izquierda: false, derecha: false, arriba: false, abajo: false });
    }

    ponerFlechas(ahora) {
        const { soltar, apretar } = cambiosDeFlechas(this.flechas, ahora);
        for (const f of soltar) tecla('keyup', f);
        for (const f of apretar) tecla('keydown', f);
        this.flechas = ahora;
    }

    // Un botón aprieta su tecla al tocarlo y la suelta al levantar el dedo
    instalarBoton(boton) {
        const cual = boton.dataset.tecla;
        let dedo = null;
        boton.addEventListener('pointerdown', ev => {
            ev.preventDefault();
            if (dedo !== null) return;
            dedo = ev.pointerId;
            capturar(boton, ev.pointerId);
            boton.classList.add('apretado');
            tecla('keydown', cual);
        });
        const soltar = ev => {
            if (ev.pointerId !== dedo) return;
            dedo = null;
            boton.classList.remove('apretado');
            tecla('keyup', cual);
        };
        boton.addEventListener('pointerup', soltar);
        boton.addEventListener('pointercancel', soltar);
        boton.addEventListener('lostpointercapture', soltar);
    }
}
