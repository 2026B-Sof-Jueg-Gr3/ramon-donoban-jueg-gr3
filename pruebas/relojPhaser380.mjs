// Transcripción del reloj de Phaser 3.80.1 (Phaser.Time.Clock y Phaser.Time.TimerEvent), tomada del código de
// phaser.min.js 3.80.1 que carga el juego. Se usa para reproducir en Node la secuencia real de los temporizadores:
// cuadros lentos, recuperación con varias ejecuciones seguidas y cancelaciones desde la propia función.
// Solo se transcribe lo que usan los componentes del juego: addEvent, delayedCall, remove, paused y getRemaining.

export class TimerEvent {
    constructor(config) {
        this.delay = config.delay ?? 0;
        this.repeat = config.repeat ?? 0;
        this.loop = config.loop ?? false;
        this.callback = config.callback;
        this.callbackScope = config.callbackScope ?? this;
        this.args = config.args ?? [];
        this.timeScale = config.timeScale ?? 1;
        this.startAt = config.startAt ?? 0;
        this.paused = config.paused ?? false;
        this.elapsed = this.startAt;
        this.hasDispatched = false;
        this.repeatCount = this.repeat === -1 || this.loop ? 999999999999 : this.repeat;
        if (this.delay === 0 && (this.repeat > 0 || this.loop)) throw new Error('TimerEvent infinite loop created via zero delay');
    }

    // Phaser 3.80.1: function(t){void 0===t&&(t=!1),this.elapsed=this.delay,this.hasDispatched=!t,this.repeatCount=0}
    remove(dispatchCallback = false) {
        this.elapsed = this.delay;
        this.hasDispatched = !dispatchCallback;
        this.repeatCount = 0;
    }

    getRemaining() {
        return this.delay - this.elapsed;
    }

    destroy() {
        this.callback = undefined;
    }
}

export class Clock {
    constructor() {
        this.now = 0;
        this.timeScale = 1;
        this.paused = false;
        this._active = [];
        this._pendingInsertion = [];
        this._pendingRemoval = [];
    }

    addEvent(config) {
        const evento = new TimerEvent(config);
        this._pendingInsertion.push(evento);
        return evento;
    }

    delayedCall(delay, callback, args, callbackScope) {
        return this.addEvent({ delay, callback, args, callbackScope });
    }

    preUpdate() {
        if (this._pendingRemoval.length === 0 && this._pendingInsertion.length === 0) return;
        for (const s of this._pendingRemoval) {
            const n = this._active.indexOf(s);
            if (n > -1) this._active.splice(n, 1);
            s.destroy();
        }
        for (const s of this._pendingInsertion) this._active.push(s);
        this._pendingRemoval.length = 0;
        this._pendingInsertion.length = 0;
    }

    // Transcripción literal de Clock.update de Phaser 3.80.1. La recuperación de un cuadro lento ejecuta la función
    // varias veces seguidas y después pone hasDispatched = false aunque la función haya cancelado su temporizador.
    update(time, delta) {
        this.now = time;
        if (this.paused) return;
        delta *= this.timeScale;
        for (let i = 0; i < this._active.length; i++) {
            const s = this._active[i];
            if (!s.paused && (s.elapsed += delta * s.timeScale, s.elapsed >= s.delay)) {
                let n = s.elapsed - s.delay;
                s.elapsed = s.delay;
                if (!s.hasDispatched && s.callback) {
                    s.hasDispatched = true;
                    s.callback.apply(s.callbackScope, s.args);
                }
                if (s.repeatCount > 0) {
                    s.repeatCount--;
                    if (n >= s.delay) {
                        while (n >= s.delay && s.repeatCount > 0) {
                            if (s.callback) s.callback.apply(s.callbackScope, s.args);
                            n -= s.delay;
                            s.repeatCount--;
                        }
                    }
                    s.elapsed = n;
                    s.hasDispatched = false;
                } else if (s.hasDispatched) {
                    this._pendingRemoval.push(s);
                }
            }
        }
    }

    activos() {
        return [...this._active, ...this._pendingInsertion].filter(e => !this._pendingRemoval.includes(e));
    }
}
