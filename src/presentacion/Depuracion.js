// Ayudas de depuración: contador de FPS (F3) y cuerpos de la física (F4). Ocultas por defecto.
export default class Depuracion {
    constructor(escena, profundidad) {
        this.escena = escena;
        this.profundidad = profundidad;
        this.verFps = false;
        this.verCuerpos = false;
        this.texto = escena.add.text(10, 8, '', {
            fontFamily: 'monospace', fontSize: '13px', color: '#9fe39f', backgroundColor: '#000000b0', padding: { x: 6, y: 4 }, resolution: 2
        }).setScrollFactor(0).setDepth(profundidad).setVisible(false);
        this.cuadros = 0;
        this.tiempo = 0;
        this.peor = 0;
        this.fps = 0;
        this.cuadroMs = 0;
    }

    alternarFps() {
        this.verFps = !this.verFps;
        this.texto.setVisible(this.verFps);
    }

    alternarCuerpos() {
        const mundo = this.escena.physics.world;
        this.verCuerpos = !this.verCuerpos;
        if (this.verCuerpos) {
            if (!mundo.debugGraphic) mundo.createDebugGraphic();
            mundo.debugGraphic.setDepth(this.profundidad - 1);
            mundo.drawDebug = true;
        } else {
            mundo.drawDebug = false;
            mundo.debugGraphic?.clear();
        }
    }

    // delta: milisegundos del cuadro sin suavizar · estado: datos extra para mostrar
    actualizar(delta, estado) {
        this.cuadros++;
        this.tiempo += delta;
        this.peor = Math.max(this.peor, delta);
        if (this.tiempo < 500) return;
        this.fps = (this.cuadros * 1000) / this.tiempo;
        this.cuadroMs = this.tiempo / this.cuadros;
        if (this.verFps) {
            this.texto.setText([
                `FPS ${this.fps.toFixed(1)}  ·  cuadro ${this.cuadroMs.toFixed(1)} ms (peor ${this.peor.toFixed(1)})`,
                `luz ${estado.luz.ms.toFixed(2)} ms  ·  ${estado.luz.vertices} vértices  ·  ${estado.luz.triangulos} triángulos`,
                `apuntado: ${estado.apuntado}  ·  cuerpos ${this.verCuerpos ? 'sí' : 'no'}`,
                ...(estado.extra || []),
                'F3 FPS  ·  F4 cuerpos'
            ]);
        }
        this.cuadros = 0;
        this.tiempo = 0;
        this.peor = 0;
    }
}
