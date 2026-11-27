// Ayudas para VERIFICAR el juego en el navegador caminando (no cambian nada del juego): window.__v
//   __v.ir(x, y)            camina de verdad hasta ese punto del mundo (pies) pulsando W A S D sintéticos; no teletransporta
//   __v.ruta([[x, y], …])   varios puntos seguidos
//   __v.apuntar(x, y)       dirige la linterna a un punto del mundo (la posición del puntero, como si se moviera el ratón)
//   __v.tocar(codigo, ms)   pulsa una tecla un rato (87 W · 65 A · 83 S · 68 D)
//   __v.perseguir(f)        camina hacia un punto que cambia (f() → {x, y}) apuntando la linterna a él (la persecución del nivel 5)
//   __v.estado()            dónde está el inspector y qué puede usar
// Las acciones (E), la libreta, la deducción, la pausa y los menús se prueban con las teclas y el ratón reales.
const esperar = ms => new Promise(r => setTimeout(r, ms));
const TECLAS = { w: 87, a: 65, s: 83, d: 68 };

export default class AyudasDeVerificacion {
    constructor(juego) { this.juego = juego; this.pulsadas = {}; }

    escena() { return this.juego.scene.getScene('Habitacion'); }
    teclado(tipo, codigo) { window.dispatchEvent(new KeyboardEvent(tipo, { keyCode: codigo, which: codigo, bubbles: true })); }

    soltarTodo() {
        for (const k of Object.keys(TECLAS)) if (this.pulsadas[k]) { this.teclado('keyup', TECLAS[k]); this.pulsadas[k] = false; }
    }

    mover(dx, dy, tol) {
        const quiere = { a: dx < -tol, d: dx > tol, w: dy < -tol, s: dy > tol };
        if (Math.abs(dx) > Math.abs(dy)) quiere.w = quiere.s = false; else quiere.a = quiere.d = false;
        for (const k of Object.keys(TECLAS)) {
            if (!!quiere[k] !== !!this.pulsadas[k]) { this.teclado(quiere[k] ? 'keydown' : 'keyup', TECLAS[k]); this.pulsadas[k] = !!quiere[k]; }
        }
    }

    // leer: si sale un texto importante por el camino, se lee y se cierra (como con E) y se sigue caminando
    async ir(tx, ty, { tol = 6, max = 40000, leer = true } = {}) {
        const e = this.escena(), t0 = performance.now();
        while (performance.now() - t0 < max) {
            if (e.narracion.bloqueando) {
                this.soltarTodo();
                if (!leer) { await esperar(100); continue; }
                e.narracion.avanzar();
                await esperar(450);
                continue;
            }
            const p = e.inspector.pies, dx = tx - p.x, dy = ty - p.y;
            if (Math.abs(dx) < tol && Math.abs(dy) < tol) break;
            this.mover(dx, dy, tol);
            await esperar(25);
        }
        this.soltarTodo();
        await esperar(150);
        return e.inspector.pies;
    }

    async ruta(puntos, opciones) {
        let p;
        for (const [x, y] of puntos) p = await this.ir(x, y, opciones);
        return p;
    }

    // La linterna apunta al punto (x, y) del mundo: se mueve el puntero lejos y luego hasta allí (hace falta un movimiento para que cuente)
    async apuntar(x, y) {
        const e = this.escena(), cam = e.cameras.main, p = e.input.activePointer;
        p.x = x - cam.scrollX + 300; p.y = y - cam.scrollY + 200;
        await esperar(60);
        p.x = x - cam.scrollX; p.y = y - cam.scrollY;
        await esperar(120);
    }

    async tocar(codigo, ms) {
        this.teclado('keydown', codigo);
        await esperar(ms);
        this.teclado('keyup', codigo);
        await esperar(150);
    }

    // Persigue un objetivo que se mueve: camina hacia él y mantiene la linterna sobre él, hasta que `hecho()` sea verdadero
    async perseguir(objetivo, hecho, { max = 60000, distancia = 90 } = {}) {
        const e = this.escena(), t0 = performance.now();
        const p = e.input.activePointer, cam = e.cameras.main;
        let alterna = 1;
        while (performance.now() - t0 < max && !hecho()) {
            const o = objetivo(), pies = e.inspector.pies;
            const dx = o.x - pies.x, dy = o.y - pies.y;
            if (Math.hypot(dx, dy) > distancia) this.mover(dx, dy, 8); else this.soltarTodo();
            // un vaivén diminuto del puntero para que cuente como movimiento
            alterna = -alterna;
            p.x = o.x - cam.scrollX + alterna * 3; p.y = o.y - cam.scrollY;
            await esperar(30);
        }
        this.soltarTodo();
        return performance.now() - t0;
    }

    // Cierra los textos importantes que haya (como E), con la pausa de leer
    async leer(max = 6) {
        const e = this.escena();
        for (let i = 0; i < max && e.narracion.bloqueando; i++) { e.narracion.avanzar(); await esperar(450); }
        return !e.narracion.bloqueando;
    }

    // Va a (x, y), apunta la linterna a (mx, my), comprueba que E ofrece lo esperado y pulsa E (la tecla, por la vía del teclado)
    async usar(x, y, mx, my, esperado) {
        await this.ir(x, y);
        await this.apuntar(mx, my);
        await esperar(250);
        const candidato = this.estado().candidato;
        if (esperado && candidato !== esperado) return { falla: `candidato ${candidato} != ${esperado}`, estado: this.estado() };
        await this.tocar(69, 70);
        await esperar(600);
        await this.leer();
        return { ok: candidato };
    }

    hechos() { return [...this.escena().investigacion.hechos]; }

    async nivel(n) {
        this.juego.scene.getScenes(true)[0].scene.start('Habitacion', { numeroDeNivel: n });
        await esperar(1200);
        await this.leer();
        return this.estado();
    }

    estado() {
        const e = this.escena();
        return {
            pies: e.inspector.pies, modo: e.inspector.modoDeApuntado, direccion: e.inspector.direccionDeLuz,
            candidato: e.candidato ? `${e.candidato.objeto.props.accion}:${e.candidato.objeto.props.ref}` : null,
            fase: e.fase, bloqueando: e.narracion.bloqueando, cuaderno: e.cuaderno.modo
        };
    }

    instalar() {
        window.__v = {
            ir: (...a) => this.ir(...a), ruta: (...a) => this.ruta(...a), apuntar: (...a) => this.apuntar(...a), tocar: (...a) => this.tocar(...a),
            perseguir: (...a) => this.perseguir(...a), estado: () => this.estado(), esp: esperar, escena: () => this.escena(),
            leer: (...a) => this.leer(...a), usar: (...a) => this.usar(...a), hechos: () => this.hechos(), nivel: (...a) => this.nivel(...a)
        };
    }
}
