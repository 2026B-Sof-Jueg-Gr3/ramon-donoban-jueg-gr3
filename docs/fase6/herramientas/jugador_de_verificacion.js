// Jugador de verificación (solo para probar en el navegador, NO es parte del juego): camina de verdad (WASD sintéticos, sin teletransporte) hasta cada cosa usable,
// la alumbra, pulsa E y, si la habitación tiene deducción, la resuelve con las teclas del cuaderno (con un error a propósito). Se carga con:
//   eval(await (await fetch("docs/fase6/herramientas/jugador_de_verificacion.js")).text()); window.__auto.nivel();   // y se consulta window.__alog / window.__afin
window.__auto = (() => {
    const v = window.__v, esp = v.esp;
    const sc = () => v.escena();
    const log = (...a) => { (window.__alog = window.__alog || []).push(a.join(' ')); };
    const K = { s: 83, w: 87, e: 69, tab: 9, esc: 27 };
    const pulsar = async (k, ms = 60) => { await v.tocar(K[k], ms); await esp(60); };

    // BFS sobre una rejilla de 16 px por donde cabe el cuerpo (30 x 20) sin chocar con paredes ni muebles
    function camino(desde, hasta) {
        const e = sc(), P = 16;
        const rs = e.obstaculos.getChildren().map(z => ({ x: z.body.x, y: z.body.y, w: z.body.width, h: z.body.height }));
        const libre = (px, py) => {
            if (px < 16 || py < 22 || px > e.mapa.ancho - 16 || py > e.mapa.alto - 2) return false;
            for (const r of rs) if (px + 16 > r.x && px - 16 < r.x + r.w && py > r.y && py - 22 < r.y + r.h) return false;
            return true;
        };
        const c = p => [Math.round(p.x / P), Math.round(p.y / P)];
        const [sx, sy] = c(desde), [tx, ty] = c(hasta);
        const clave = (x, y) => x + ',' + y;
        const previo = new Map([[clave(sx, sy), null]]);
        const cola = [[sx, sy]];
        for (let i = 0; i < cola.length; i++) {
            const [x, y] = cola[i];
            if (Math.abs(x - tx) <= 1 && Math.abs(y - ty) <= 1) {
                const ruta = []; let k = clave(x, y);
                while (k) { const [a, b] = k.split(',').map(Number); ruta.unshift({ x: a * P, y: b * P }); k = previo.get(k); }
                return ruta;
            }
            for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                const nx = x + dx, ny = y + dy, k = clave(nx, ny);
                if (previo.has(k) || !libre(nx * P, ny * P)) continue;
                previo.set(k, clave(x, y)); cola.push([nx, ny]);
            }
        }
        return null;
    }

    async function caminar(destino) {
        const e = sc();
        const ruta = camino(e.inspector.pies, destino);
        if (!ruta) return false;
        // Compacta en tramos rectos
        const pts = []; let ultimo = null;
        for (let i = 0; i < ruta.length; i++) {
            const a = ruta[i], b = ruta[i + 1], p = ruta[i - 1];
            if (!p || !b || (b.x - a.x) !== (a.x - p.x) || (b.y - a.y) !== (a.y - p.y)) pts.push(a);
        }
        for (const p of pts) await v.ir(p.x, p.y, { tol: 7, max: 12000 });
        await v.ir(destino.x, destino.y, { tol: 6, max: 6000 });
        const f = sc().inspector.pies;
        return Math.hypot(f.x - destino.x, f.y - destino.y) < 22;
    }

    // El aviso de "ya se puede resolver" se abre solo en mitad de la investigación: se cierra con Esc ("seguir investigando"), como haría un jugador
    window.__avisos = window.__avisos || [];
    clearInterval(window.__vigiaAviso);
    window.__vigiaAviso = setInterval(() => { try { const e = sc(); if (e?.cuaderno?.modo === 'aviso') { window.__avisos.push(e.numeroDeNivel); pulsar('esc'); } } catch (x) { } }, 1500);

    const centro = r => ({ x: r.x + r.ancho / 2, y: r.y + r.alto / 2 });

    // Usa lo usable `u`: prueba lados (sur, este, oeste, norte) a 26 px de su huella
    async function usar(u) {
        const z = u.zona, h = z.huella, { ref, accion } = u.objeto.props;
        const mira = z.mira ?? centro(z.luz);
        // Una zona con distancia 0 (mirar detrás de la pila, entre ella y el muro) se usa estando DENTRO de su huella
        const lados = z.distancia === 0 ? [[h.x + h.ancho / 2, h.y + h.alto / 2], [h.x + h.ancho / 2, h.y + h.alto - 6]] : [[h.x + h.ancho / 2, h.y + h.alto + 26], [h.x + h.ancho + 26, h.y + h.alto / 2], [h.x - 26, h.y + h.alto / 2], [h.x + h.ancho / 2, h.y - 26]];
        for (const [x, y] of lados) {
            if (!await caminar({ x, y })) continue;
            await v.apuntar(mira.x, mira.y); await esp(450);
            if (v.estado().candidato !== `${accion}:${ref}`) { await v.apuntar(centro(h).x, centro(h).y); await esp(350); }
            if (v.estado().candidato !== `${accion}:${ref}`) continue;
            await v.tocar(69, 70); await esp(900); await v.leer(8); await esp(300);
            return true;
        }
        return false;
    }

    // Descubrir con la luz las marcas que lo piden: se acerca por el sur y apunta
    async function alumbrar(r) {
        const o = r.objeto, c = { x: o.x + o.ancho / 2, y: o.y + o.alto / 2 };
        for (const dy of [110, 80, 150, -110]) {
            if (!await caminar({ x: c.x, y: c.y + dy })) continue;
            for (let i = 0; i < 3 && !r.descubierta; i++) { await v.apuntar(c.x, c.y); await esp(500); }
            if (r.descubierta) { await v.leer(8); return true; }
        }
        return false;
    }

    // El fenómeno que hay que presenciar de cerca (el golpe de la alacena, un juguete que se mueve): se acerca y espera
    async function presenciar() {
        const e = sc();
        const faltan = (e.reglas.reglas || []).flatMap(r => r.cuando).filter(f => /^(oyo|vio)-cerca:/.test(f) && !e.investigacion.hechos.has(f));
        for (const f of [...new Set(faltan)]) {
            const objeto = f.split(':')[1];
            const m = e.mapa.muebles.find(x => x.nombre === objeto) ?? e.mapa.muebles.find(x => x.nombre === 'caballito');
            if (!m || !await caminar({ x: m.x + m.ancho / 2, y: m.y + m.alto + 40 })) { log('PRESENCIAR-FALLA', f); continue; }
            for (let i = 0; i < 40 && !e.investigacion.hechos.has(f); i++) await esp(500);
            await v.leer(8);
            log(e.investigacion.hechos.has(f) ? 'presenciado' : 'NO-PRESENCIADO', f);
        }
    }

    async function investigar() {
        const hechas = new Set(), falladas = new Set(), pisadas = new Set();
        let reintento = false;
        for (let vuelta = 0; vuelta < 60; vuelta++) {
            const e = sc();
            if (e.narracion.bloqueando) await v.leer(8);
            // 1. lo que hay que alumbrar para que exista
            const r = e.revelables.find(x => !x.descubierta && !falladas.has('l:' + x.ref) && e.investigacion.objetos[x.ref]?.descubre === 'luz');
            if (r) { const ok = await alumbrar(r); log(ok ? 'luz' : 'LUZ-FALLA', r.ref); if (!ok) falladas.add('l:' + r.ref); continue; }
            // 1b. las zonas del suelo que cuentan algo al pisarlas
            const z = e.pisos.find(x => !pisadas.has(x.props.ref) && !e.investigacion.hechos.has('piso:' + x.props.ref));
            if (z) {
                pisadas.add(z.props.ref);
                for (const [fx, fy] of [[0.5, 0.5], [0.2, 0.8], [0.8, 0.8], [0.5, 0.9]]) { if (e.investigacion.hechos.has('piso:' + z.props.ref)) break; await caminar({ x: z.x + z.ancho * fx, y: z.y + z.alto * fy }); }
                await v.leer(8);
                log(e.investigacion.hechos.has('piso:' + z.props.ref) ? 'pisado' : 'PISO-FALLA', z.props.ref);
                continue;
            }
            // 2. lo usable que todavía da algo (el más cercano primero)
            const p = e.inspector.pies;
            const pendientes = e.usables.filter(u => !u.recogido && e.investigacion.hayAlgoNuevo(u.objeto.props.ref, u.objeto.props.accion, u.objeto.props.lado) && !hechas.has(u.objeto.id + u.objeto.props.accion) && !falladas.has(u.objeto.id));
            if (!pendientes.length) {
                if (falladas.size && !reintento) { reintento = true; falladas.clear(); log('reintento'); continue; }
                break;
            }
            pendientes.sort((a, b) => Math.hypot(a.zona.huella.x - p.x, a.zona.huella.y - p.y) - Math.hypot(b.zona.huella.x - p.x, b.zona.huella.y - p.y));
            const u = pendientes[0], clave = u.objeto.props.ref + ':' + u.objeto.props.accion;
            const ok = await usar(u);
            log(ok ? 'hecho' : 'FALLA', clave);
            if (ok) hechas.add(u.objeto.id + u.objeto.props.accion); else falladas.add(u.objeto.id);
            if (!sc().sys.isActive() || sc().saliendo) return;          // la puerta final lleva al informe
        }
    }

    // La deducción con las teclas: opcionalmente primero una respuesta equivocada (prueba ajena)
    async function deducir({ conError = true } = {}) {
        const e = sc();
        const irAlFoco = async idx => { for (let i = 0; i < 40 && e.cuaderno.pantalla.foco !== idx; i++) { await pulsar(e.cuaderno.pantalla.foco < idx ? 's' : 'w'); } };
        await pulsar('tab'); await esp(500);
        let guardia = 0;
        while (!e.deduccion.completa && guardia++ < 6) {
            if (e.cuaderno.modo !== 'conclusion') {
                if (!e.cuaderno.abierta) { await pulsar('tab'); await esp(500); }
                const botones = e.cuaderno.pantalla.items; const res = botones.findIndex(i => i.nombre === 'Resolver el caso');
                if (res < 0) { log('SIN-RESOLVER'); return false; }
                await irAlFoco(res); await pulsar('e'); await esp(400);
            }
            const q = e.deduccion.preguntaActual();
            if (conError && !window.__yaError) {
                window.__yaError = true;
                // una prueba ajena: la primera encontrada que no es pertinente
                const pertinentes = new Set(q.validas.flat());
                const ajena = e.libreta.idsEncontrados().find(id => !pertinentes.has(id));
                await irAlFoco(e.cuaderno.opcionesVistas.indexOf(q.correcta)); await pulsar('e'); await esp(350);
                const fila = e.cuaderno.pantalla.items.findIndex(i => i.id === ajena); await irAlFoco(fila); await pulsar('e');
                const p2 = e.cuaderno.pantalla.items.findIndex(i => i.nombre === 'Presentar pruebas'); await irAlFoco(p2); await pulsar('e'); await esp(900);
                log('ERROR-A-PROPOSITO', q.id, 'con', ajena, '→ texto de error:', e.narracion.bloqueando);
                await v.leer(8); await esp(600);
                continue;
            }
            await irAlFoco(e.cuaderno.opcionesVistas.indexOf(q.correcta)); await pulsar('e'); await esp(350);
            for (const id2 of q.validas[0]) { const fila = e.cuaderno.pantalla.items.findIndex(i => i.id === id2); await irAlFoco(fila); await pulsar('e'); }
            const p3 = e.cuaderno.pantalla.items.findIndex(i => i.nombre === 'Presentar pruebas'); await irAlFoco(p3); await pulsar('e'); await esp(900);
            log('RESPONDIO', q.id, e.deduccion.resuelta(q.id) ? 'correcta' : 'MAL');
        }
        await v.leer(10);
        return e.deduccion.completa;
    }

    async function nivel({ conError = true, resolver = true, fenomeno = true } = {}) {
        window.__afin = false; window.__alog = []; window.__yaError = false;
        try {
            await v.leer(8);
            await investigar();
            if (fenomeno) { await presenciar(); await investigar(); }
            const e = sc();
            if (resolver && e.deduccion.preguntas.length) {
                log('deduccion disponible:', e.deduccion.disponible());
                if (e.deduccion.disponible()) { log('deduccion completa:', await deducir({ conError })); }
                await v.leer(10);
                await esp(800);
                if (sc().sys.isActive() && !sc().saliendo && sc().fase === 'final') { await investigar(); }
            }
        } catch (err) { log('EXCEPCION', err.message); }
        window.__afin = true;
    }
    return { nivel, investigar, presenciar, deducir, caminar, usar, alumbrar, camino, pulsar };
})();
'instalado'
