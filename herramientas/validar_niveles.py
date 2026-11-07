"""Validador de niveles de Inspector Lógica.

Uso (desde la raíz del proyecto):
    python herramientas/validar_niveles.py             valida todos los niveles
    python herramientas/validar_niveles.py 1 3         solo los niveles indicados
    python herramientas/validar_niveles.py --rapido    omite la complejidad espacial

Lee assets/niveles/nivelN.txt (capas físicas), assets/niveles/nivelN.entidades.json (entidades fuera de la
matriz) y assets/narrativa/nivelN.json (textos enlazados por ID), imprime un informe y guarda
los récords con sus soluciones de referencia en assets/niveles/soluciones.json.

Notación de las soluciones: u d l r = caminar, U D L R = empujar (arriba, abajo, izquierda, derecha).
Termina con código 1 si algún nivel tiene un problema que impide aprobarlo.
"""
import heapq
import json
import sys
from collections import deque
from itertools import permutations
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
CARPETA_NIVELES = RAIZ / 'assets' / 'niveles'
CARPETA_NARRATIVA = RAIZ / 'assets' / 'narrativa'
# Códigos del formato numérico anterior: solo los usa Mapa.desde_matriz (herramientas de análisis sueltas)
SUELO, PARED, CAJA, LLEGADA, INICIO, PISTA, BATERIA, MUEBLE, MARCA = 0, 1, 2, 3, 5, 6, 7, 8, 9
CAPAS = ('terreno', 'obstaculos', 'sokoban')
SIMBOLOS = {'terreno': set('# .'), 'obstaculos': set(' m'), 'sokoban': set(' @ABCDEFGHIJKLMNOPQRSTUVWXYZ')}
RADIO_LINTERNA = 2  # igual que en src/modelo/Escenario.js
DIRS = [(-1, 0, 'u'), (1, 0, 'd'), (0, -1, 'l'), (0, 1, 'r')]
DELTA = {letra: (df, dc) for df, dc, letra in DIRS}


# ── Lectura del mapa ───────────────────────────────────────────────────────

class Mapa:
    """Tablero físico y posiciones de las entidades. ids: {categoría: {id: posición}} (cajas, muebles, pistas,
    baterias, marcas)."""

    def __init__(self, filas, columnas, paredes, metas, cajas, inicios, muebles=(), pistas=(), baterias=(), marcas=(), ids=None):
        self.filas, self.columnas = filas, columnas
        todas = {(f, c) for f in range(filas) for c in range(columnas)}
        self.paredes = frozenset(paredes)
        self.muebles = sorted(muebles)
        self.suelo = frozenset(todas - self.paredes - set(self.muebles))
        self.cajas = frozenset(cajas)
        self.metas = frozenset(metas)
        self.inicios = list(inicios)
        self.inicio = self.inicios[0] if self.inicios else None
        self.pistas, self.baterias, self.marcas = list(pistas), list(baterias), list(marcas)
        self.ids = ids or {}
        borde = lambda p: p[0] in (0, self.filas - 1) or p[1] in (0, self.columnas - 1)
        self.suelo_en_borde = sorted(p for p in self.suelo if borde(p))
        self.paredes_interiores = sorted(
            p for p in self.paredes if not borde(p)
            and any((p[0] + df, p[1] + dc) in self.suelo for df, dc, _ in DIRS))
        self.vivas = casillas_vivas(self.suelo, self.metas)

    @classmethod
    def desde_matriz(cls, matriz):
        """Mapa a partir de una matriz con los códigos numéricos del formato anterior."""
        celdas = {(f, c): v for f, fila in enumerate(matriz) for c, v in enumerate(fila)}
        de = lambda codigo: [p for p, v in celdas.items() if v == codigo]
        return cls(len(matriz), len(matriz[0]), de(PARED), de(LLEGADA), de(CAJA), de(INICIO),
                   de(MUEBLE), de(PISTA), de(BATERIA), de(MARCA))

    def sin(self, celda):
        """Copia del mapa con esa celda convertida en suelo (sin pared ni mueble)."""
        return Mapa(self.filas, self.columnas, self.paredes - {celda}, self.metas, self.cajas, self.inicios,
                    [m for m in self.muebles if m != celda], self.pistas, self.baterias, self.marcas, self.ids)


def leer_capas(texto):
    """Misma lectura que src/modelo/FormatoNivel.js. Devuelve (filas, columnas, capas)."""
    capas, actual = {}, None
    for linea in texto.splitlines():
        if linea.startswith(';'):
            continue
        seccion = linea.strip()
        if seccion.startswith('[') and seccion.endswith(']'):
            nombre = seccion[1:-1]
            if nombre not in CAPAS:
                raise ValueError(f'capa desconocida [{nombre}]')
            if nombre in capas:
                raise ValueError(f'la capa [{nombre}] está repetida')
            actual = capas[nombre] = []
            continue
        if actual is None:
            if linea.strip():
                raise ValueError('hay texto antes de la primera capa')
            continue
        actual.append(linea.rstrip())
    if 'terreno' not in capas:
        raise ValueError('falta la capa [terreno]')
    for nombre in CAPAS:
        filas_capa = capas.setdefault(nombre, [])
        while filas_capa and not filas_capa[-1]:
            filas_capa.pop()
    filas, columnas = len(capas['terreno']), max(len(l) for l in capas['terreno'])
    for nombre in CAPAS:
        if len(capas[nombre]) > filas:
            raise ValueError(f'la capa [{nombre}] tiene más filas que el terreno')
        for f, linea in enumerate(capas[nombre]):
            if len(linea) > columnas:
                raise ValueError(f'la capa [{nombre}] es más ancha que el terreno en la fila {f}')
            for c, simbolo in enumerate(linea):
                if simbolo not in SIMBOLOS[nombre]:
                    raise ValueError(f'símbolo "{simbolo}" no válido en [{nombre}], fila {f}, columna {c}')
    return filas, columnas, capas


def leer_nivel(ruta):
    """Lee las capas y el archivo de entidades. Devuelve (mapa, bloqueos de formato).
    Los errores de estructura que impiden armar el mapa lanzan ValueError."""
    filas, columnas, capas = leer_capas(ruta.read_text(encoding='utf-8'))
    en = lambda capa, f, c: capas[capa][f][c] if f < len(capas[capa]) and c < len(capas[capa][f]) else ' '
    ruta_entidades = ruta.with_name(f'{ruta.stem}.entidades.json')
    entidades = json.loads(ruta_entidades.read_text(encoding='utf-8'))
    bloqueos = []
    paredes, metas, cajas, inicios, mueble_m = [], [], {}, [], []
    for f in range(filas):
        for c in range(columnas):
            t, o, s = en('terreno', f, c), en('obstaculos', f, c), en('sokoban', f, c)
            if t == '#':
                paredes.append((f, c))
            elif t == '.':
                metas.append((f, c))
            if o == 'm':
                mueble_m.append((f, c))
                if t != ' ':
                    bloqueos.append(f'formato: el mueble de la fila {f}, columna {c} no está sobre suelo')
            if s != ' ' and (t == '#' or o == 'm'):
                bloqueos.append(f'formato: "{s}" está sobre una pared o un mueble (fila {f}, columna {c})')
            if s == '@':
                inicios.append((f, c))
            elif s != ' ':
                if s in cajas:
                    bloqueos.append(f'formato: la caja {s} está repetida')
                cajas[s] = (f, c)

    ids = {'cajas': dict(cajas), 'muebles': {}, 'pistas': {}, 'baterias': {}, 'marcas': {}}
    ocupadas, vistos = {}, set()
    pos_cajas = set(cajas.values())
    grupos = (('obstaculos', {'mueble': 'muebles'}, None),
              ('objetos', {'pista': 'pistas', 'bateria': 'baterias'}, ('recoger', 'pisar')),
              ('evidencias', {'marca': 'marcas'}, ('descubre', 'visibilidad')))
    for grupo, tipos, condicion in grupos:
        for e in entidades.get(grupo, []):
            ident, tipo, pos = e.get('id'), e.get('tipo'), tuple(e.get('en', ()))
            if not ident or tipo not in tipos or len(pos) != 2:
                bloqueos.append(f'entidades: una entrada de "{grupo}" no tiene id, un tipo válido ({", ".join(tipos)}) o posición "en"')
                continue
            if ident in vistos:
                bloqueos.append(f'entidades: el id "{ident}" está repetido')
            vistos.add(ident)
            if condicion and e.get(condicion[0]) != condicion[1]:
                bloqueos.append(f'entidades: {ident} debe tener "{condicion[0]}": "{condicion[1]}"')
            if not (0 <= pos[0] < filas and 0 <= pos[1] < columnas):
                bloqueos.append(f'entidades: {ident} está fuera del mapa')
                continue
            if pos in ocupadas:
                bloqueos.append(f'entidades: {ident} y {ocupadas[pos]} están en la misma casilla')
            ocupadas[pos] = ident
            ids[tipos[tipo]][ident] = pos
            if grupo == 'obstaculos':
                if pos not in mueble_m:
                    bloqueos.append(f'entidades: el mueble {ident} apunta a una casilla sin "m"')
            elif pos in paredes or pos in mueble_m:
                bloqueos.append(f'entidades: {ident} está sobre una pared o un mueble')
            elif grupo == 'objetos' and (pos in pos_cajas or pos in inicios):
                bloqueos.append(f'entidades: el objeto {ident} empieza debajo de una caja o en el inicio')
    for pos in mueble_m:
        if pos not in ids['muebles'].values():
            bloqueos.append(f'entidades: el mueble de la fila {pos[0]}, columna {pos[1]} no tiene ID')
    mapa = Mapa(filas, columnas, paredes, metas, cajas.values(), inicios, mueble_m,
                ids['pistas'].values(), ids['baterias'].values(), ids['marcas'].values(), ids)
    return mapa, bloqueos


# ── Búsquedas ──────────────────────────────────────────────────────────────

def casillas_vivas(suelo, metas):
    """Casillas desde las que una caja todavía puede llegar a algún destino."""
    vivas = set(metas)
    cola = deque(metas)
    while cola:
        b = cola.popleft()
        for df, dc, _ in DIRS:
            p, pp = (b[0] + df, b[1] + dc), (b[0] + 2 * df, b[1] + 2 * dc)
            if p in suelo and pp in suelo and p not in vivas:
                vivas.add(p)
                cola.append(p)
    return vivas


def caminar(suelo, desde, cajas):
    """Distancias y caminos del inspector sin mover cajas."""
    previo = {desde: None}
    cola = deque([desde])
    while cola:
        p = cola.popleft()
        for df, dc, letra in DIRS:
            n = (p[0] + df, p[1] + dc)
            if n in suelo and n not in cajas and n not in previo:
                previo[n] = (p, letra)
                cola.append(n)
    return previo


def camino(previo, hasta):
    letras = []
    while previo[hasta]:
        hasta, letra = previo[hasta]
        letras.append(letra)
    return ''.join(reversed(letras))


def resolver(mapa, criterio):
    """Solución óptima. criterio 'pasos' -> (pasos, empujones); 'empujones' -> (empujones, pasos)."""
    inicio = (mapa.inicio, mapa.cajas)
    mejor = {inicio: (0, 0)}
    origen = {inicio: None}
    cola = [((0, 0), 0, inicio)]
    contador = 0
    while cola:
        costo, _, estado = heapq.heappop(cola)
        if mejor[estado] != costo:
            continue
        jugador, cajas = estado
        if cajas == mapa.metas:
            return reconstruir(mapa, origen, estado)
        previo = caminar(mapa.suelo, jugador, cajas)
        for b in cajas:
            for df, dc, letra in DIRS:
                pie, destino = (b[0] - df, b[1] - dc), (b[0] + df, b[1] + dc)
                if pie not in previo or destino not in mapa.vivas or destino in cajas:
                    continue
                pasos_extra = len(camino(previo, pie)) + 1
                nuevo = (b, frozenset((cajas - {b}) | {destino}))
                nc = (costo[0] + pasos_extra, costo[1] + 1) if criterio == 'pasos' else (costo[0] + 1, costo[1] + pasos_extra)
                if nuevo not in mejor or nc < mejor[nuevo]:
                    mejor[nuevo] = nc
                    origen[nuevo] = (estado, pie, letra.upper())
                    contador += 1
                    heapq.heappush(cola, (nc, contador, nuevo))
    return None


def reconstruir(mapa, origen, estado):
    tramos = []
    while origen[estado]:
        anterior, pie, empuje = origen[estado]
        tramos.append(camino(caminar(mapa.suelo, anterior[0], anterior[1]), pie) + empuje)
        estado = anterior
    solucion = ''.join(reversed(tramos))
    return {'pasos': len(solucion), 'empujones': sum(ch.isupper() for ch in solucion), 'solucion': solucion}


def simular(mapa, solucion):
    """Reproduce una solución y confirma que es legal y termina el nivel."""
    jugador, cajas = mapa.inicio, set(mapa.cajas)
    for letra in solucion:
        df, dc = DELTA[letra.lower()]
        sig = (jugador[0] + df, jugador[1] + dc)
        if sig not in mapa.suelo:
            return False
        if sig in cajas:
            destino = (sig[0] + df, sig[1] + dc)
            if not letra.isupper() or destino not in mapa.suelo or destino in cajas:
                return False
            cajas.remove(sig)
            cajas.add(destino)
        elif letra.isupper():
            return False
        jugador = sig
    return cajas == set(mapa.metas)


def grafo_de_empujes(mapa):
    """Todos los estados alcanzables (inspector normalizado a su zona) y cuáles tienen solución."""
    def normalizar(jugador, cajas):
        zona = caminar(mapa.suelo, jugador, cajas)
        return min(zona), zona

    inicio = (normalizar(mapa.inicio, mapa.cajas)[0], mapa.cajas)
    sucesores = {}
    cola = deque([inicio])
    sucesores[inicio] = None
    while cola:
        estado = cola.popleft()
        jugador, cajas = estado
        zona = caminar(mapa.suelo, jugador, cajas)
        lista = []
        for b in cajas:
            for df, dc, _ in DIRS:
                pie, destino = (b[0] - df, b[1] - dc), (b[0] + df, b[1] + dc)
                if pie in zona and destino in mapa.suelo and destino not in cajas:
                    nuevas = frozenset((cajas - {b}) | {destino})
                    nuevo = (normalizar(b, nuevas)[0], nuevas)
                    lista.append(nuevo)
                    if nuevo not in sucesores:
                        sucesores[nuevo] = None
                        cola.append(nuevo)
        sucesores[estado] = lista

    predecesores = {e: [] for e in sucesores}
    for e, lista in sucesores.items():
        for n in lista:
            predecesores[n].append(e)
    con_solucion = {e for e in sucesores if e[1] == mapa.metas}
    cola = deque(con_solucion)
    while cola:
        e = cola.popleft()
        for p in predecesores[e]:
            if p not in con_solucion:
                con_solucion.add(p)
                cola.append(p)
    return inicio, sucesores, con_solucion


def dependencia_de_orden(mapa, inicio, sucesores, con_solucion):
    """Para cada destino: de cuántas formas puede ser el primero en llenarse y cuántas siguen teniendo solución."""
    primeros = {m: set() for m in mapa.metas}
    vistos = {inicio}
    cola = deque([inicio])
    while cola:
        estado = cola.popleft()
        for nuevo in sucesores[estado]:
            ocupadas = nuevo[1] & mapa.metas
            if len(ocupadas) == 1:
                primeros[next(iter(ocupadas))].add(nuevo)
            elif not ocupadas and nuevo not in vistos:
                vistos.add(nuevo)
                cola.append(nuevo)
    return {m: (len(estados), sum(e in con_solucion for e in estados)) for m, estados in primeros.items()}


def minimo_recogiendo(mapa, objetos):
    """Pasos mínimos para completar el nivel habiendo recogido esos objetos (caminar no tiene límite)."""
    indice = {p: i for i, p in enumerate(dict.fromkeys(objetos))}
    requeridos = (1 << len(indice)) - 1

    inicio = (mapa.inicio, mapa.cajas, 0)
    vistos = {inicio}
    cola = deque([(inicio, 0)])
    while cola:
        (jugador, cajas, mascara), pasos = cola.popleft()
        if cajas == mapa.metas and mascara & requeridos == requeridos:
            return pasos
        for df, dc, _ in DIRS:
            sig = (jugador[0] + df, jugador[1] + dc)
            if sig not in mapa.suelo:
                continue
            nuevas = cajas
            if sig in cajas:
                destino = (sig[0] + df, sig[1] + dc)
                if destino not in mapa.vivas or destino in cajas:
                    continue
                nuevas = frozenset((cajas - {sig}) | {destino})
            nm = mascara | (1 << indice[sig]) if sig in indice else mascara
            estado = (sig, nuevas, nm)
            if estado not in vistos:
                vistos.add(estado)
                cola.append((estado, pasos + 1))
    return None


# ── Linterna y narrativa ───────────────────────────────────────────────────

def linea_de_vision(mapa, f0, c0, f1, c1):
    """Misma Bresenham que Escenario.hayLineaDeVision: paredes y muebles intermedios tapan la vista."""
    dx, dy = abs(c1 - c0), -abs(f1 - f0)
    sx, sy = (1 if c0 < c1 else -1), (1 if f0 < f1 else -1)
    error, f, c = dx + dy, f0, c0
    while (f, c) != (f1, c1):
        e2 = 2 * error
        if e2 >= dy:
            error += dy
            c += sx
        if e2 <= dx:
            error += dx
            f += sy
        if (f, c) != (f1, c1) and (f, c) not in mapa.suelo:
            return False
    return True


def marcas_reveladas(mapa, solucion):
    """Marcas que la linterna revela al seguir una solución (desde la casilla inicial y tras cada paso)."""
    jugador, cajas, reveladas = mapa.inicio, set(mapa.cajas), set()

    def mirar():
        for m in mapa.marcas:
            if m not in reveladas and m not in cajas \
                    and (m[0] - jugador[0]) ** 2 + (m[1] - jugador[1]) ** 2 <= RADIO_LINTERNA ** 2 \
                    and linea_de_vision(mapa, jugador[0], jugador[1], m[0], m[1]):
                reveladas.add(m)

    mirar()
    for letra in solucion:
        df, dc = DELTA[letra.lower()]
        sig = (jugador[0] + df, jugador[1] + dc)
        if sig in cajas:
            cajas.remove(sig)
            cajas.add((sig[0] + df, sig[1] + dc))
        jugador = sig
        mirar()
    return reveladas


CANALES = {'ambiental': {'secundaria'}, 'libreta': {'principal', 'secundaria'}, 'dialogo': {'principal'}}


def validar_narrativa(numero, mapa, ids_vistos, bloqueos, revisar):
    ruta = CARPETA_NARRATIVA / f'nivel{numero}.json'
    try:
        textos = json.loads(ruta.read_text(encoding='utf-8'))
    except (OSError, ValueError) as error:
        bloqueos.append(f'no se pudo leer {ruta.relative_to(RAIZ)}: {error}')
        return None

    for clave in ('intro', 'cierre', 'informe', 'retirar', 'bateria'):
        if not textos.get(clave):
            bloqueos.append(f'narrativa: falta el texto "{clave}"')
    if len(textos.get('cajas', [])) != len(mapa.cajas) - 1:
        bloqueos.append(f'narrativa: "cajas" debe tener {len(mapa.cajas) - 1} frases (la última caja usa "cierre")')

    # Los textos se enlazan con las entidades por ID; la posición solo está en el archivo de entidades
    for clave in ('pistas', 'muebles', 'marcas'):
        entidades = mapa.ids.get(clave, {})
        con_texto = set()
        for e in textos.get(clave, []):
            if not e.get('id') or not e.get('texto'):
                bloqueos.append(f'narrativa: una entrada de "{clave}" no tiene id o texto')
                continue
            if 'en' in e:
                bloqueos.append(f'narrativa: {e["id"]} tiene "en"; la posición va en el archivo de entidades')
            if e['id'] in ids_vistos:
                bloqueos.append(f'narrativa: el id "{e["id"]}" está repetido')
            ids_vistos.add(e['id'])
            con_texto.add(e['id'])
            if e['id'] not in entidades:
                bloqueos.append(f'narrativa: "{e["id"]}" no corresponde a ninguna entidad de "{clave}" del nivel')
            if e.get('borrador'):
                revisar.append(f'texto en borrador: {e["id"]}')
            canal, importancia = e.get('canal', 'ambiental' if clave == 'marcas' else 'libreta'), e.get('importancia', 'secundaria')
            if clave == 'marcas' and importancia not in CANALES.get(canal, set()):
                bloqueos.append(f'narrativa: {e["id"]} usa canal "{canal}" con importancia "{importancia}", combinación no válida')
        for ident in sorted(set(entidades) - con_texto):
            bloqueos.append(f'la entidad {ident} no tiene texto en "{clave}"')
    return textos


# ── Informe ────────────────────────────────────────────────────────────────

def validar(numero, mapa, rapido, ids_vistos):
    bloqueos, revisar, lineas = [], [], []
    ok = lambda cond: '✓' if cond else '✗'

    lineas.append(f"Tamaño {mapa.filas}×{mapa.columnas} · cajas {len(mapa.cajas)} · destinos {len(mapa.metas)} · "
                  f"pistas {len(mapa.pistas)} · baterías {len(mapa.baterias)} · muebles {len(mapa.muebles)}")

    if len(mapa.cajas) != len(mapa.metas):
        bloqueos.append(f'hay {len(mapa.cajas)} cajas y {len(mapa.metas)} destinos')
    if mapa.suelo_en_borde:
        bloqueos.append(f'el mapa no está cerrado: suelo en el borde {mapa.suelo_en_borde}')
    if len(mapa.inicios) != 1:
        bloqueos.append(f'debe haber exactamente un inicio (@); hay {len(mapa.inicios)}')
        return bloqueos, revisar, lineas, None

    # 1. Solubilidad · 2. Mínimo de pasos · 3. Mínimo de empujones
    rp, re = resolver(mapa, 'pasos'), resolver(mapa, 'empujones')
    lineas.append(f"{ok(rp)} 1. Solubilidad")
    if not rp:
        bloqueos.append('el nivel no tiene solución')
        return bloqueos, revisar, lineas, None
    for r in (rp, re):
        if not simular(mapa, r['solucion']):
            bloqueos.append('una solución de referencia no se reproduce correctamente')
    lineas.append(f"  2. Récord de pasos:     {rp['pasos']} pasos / {rp['empujones']} empujones")
    lineas.append(f"  3. Récord de empujones: {re['empujones']} empujones / {re['pasos']} pasos"
                  f"{'  (otra solución distinta)' if (rp['pasos'], rp['empujones']) != (re['pasos'], re['empujones']) else '  (misma solución)'}")

    # 4. Desvío obligatorio
    directo = min(sum(abs(b[0] - m[0]) + abs(b[1] - m[1]) for b, m in zip(sorted(mapa.cajas), p))
                  for p in permutations(sorted(mapa.metas)))
    desvio = re['empujones'] - directo
    lineas.append(f"  4. Desvío obligatorio: {desvio} empujones (directo serían {directo})")
    if desvio == 0:
        revisar.append('desvío obligatorio 0: cada caja puede ir en línea recta a su destino')

    # 5. Dependencia del orden · 6. Deadlocks
    inicio, sucesores, con_solucion = grafo_de_empujes(mapa)
    orden = dependencia_de_orden(mapa, inicio, sucesores, con_solucion)
    bloqueantes = [m for m, (total, buenos) in orden.items() if buenos == 0]
    lineas.append(f"  5. Dependencia del orden: {'sí' if bloqueantes else 'no'}")
    for m in sorted(orden):
        total, buenos = orden[m]
        estado = 'no puede llenarse primero' if total == 0 else ('llenarlo primero bloquea el nivel' if buenos == 0 else
                 f'puede ir primero ({buenos} de {total} formas siguen teniendo solución)')
        lineas.append(f"       destino fila {m[0]}, columna {m[1]}: {estado}")
    sin_salida = len(sucesores) - len(con_solucion)
    trampas = sum(1 for e in con_solucion for n in sucesores[e] if n not in con_solucion)
    muertas = len(mapa.suelo - mapa.vivas)
    lineas.append(f"  6. Deadlocks: {sin_salida} de {len(sucesores)} estados alcanzables no tienen salida · "
                  f"{trampas} empujones irreversibles posibles · {muertas} de {len(mapa.suelo)} casillas muertas")
    if mapa.cajas - mapa.vivas:
        bloqueos.append(f'cajas que empiezan en casilla muerta: {sorted(mapa.cajas - mapa.vivas)}')

    # 7. Accesibilidad (caminar no consume nada: no hay presupuesto de pasos)
    zona = caminar(mapa.suelo, mapa.inicio, frozenset())
    inalcanzables = [p for p in mapa.pistas + mapa.baterias if p not in zona]
    if inalcanzables:
        bloqueos.append(f'objetos inalcanzables: {inalcanzables}')
    recoger = minimo_recogiendo(mapa, mapa.pistas + mapa.baterias)
    lineas.append(f"{ok(not inalcanzables and recoger)} 7. Accesibilidad: objetos alcanzables · "
                  f"mínimo para completar recogiendo todo: {f'{recoger} pasos' if recoger else 'NO'}")
    if not recoger:
        bloqueos.append('no se puede completar el nivel recogiendo todas las pistas y baterías')

    # 8. Posición inicial
    inicio_ok = len(mapa.inicios) == 1 and len(zona) > 1
    lineas.append(f"{ok(inicio_ok)} 8. Posición inicial: fila {mapa.inicio[0]}, columna {mapa.inicio[1]} · "
                  f"{len(zona) - 1} casillas alcanzables a pie")

    # 9. Complejidad espacial
    if rapido:
        lineas.append('  9. Complejidad espacial: omitida (--rapido)')
    else:
        lineas.append('  9. Complejidad espacial (se retira cada elemento y se recalculan los récords):')
        for tipo, celdas in (('muebles', mapa.muebles), ('paredes interiores', mapa.paredes_interiores)):
            sin_efecto = []
            for celda in celdas:
                otro = mapa.sin(celda)
                p2, e2 = resolver(otro, 'pasos'), resolver(otro, 'empujones')
                if (p2['pasos'], e2['empujones']) == (rp['pasos'], re['empujones']):
                    sin_efecto.append(celda)
                else:
                    lineas.append(f"       {tipo[:-1] if tipo == 'muebles' else 'pared interior'} en fila {celda[0]}, "
                                  f"columna {celda[1]}: sin él, {p2['pasos']} pasos / {e2['empujones']} empujones")
            if sin_efecto:
                revisar.append(f"{len(sin_efecto)} de {len(celdas)} {tipo} no cambian ningún récord (fila, columna): "
                               + ' '.join(f'({f},{c})' for f, c in sin_efecto))

    # 10. Narrativa y linterna
    textos = validar_narrativa(numero, mapa, ids_vistos, bloqueos, revisar)
    if textos is not None:
        por_id = {e.get('id'): e for e in textos.get('marcas', [])}
        marcas = {pos: por_id.get(ident, {'id': ident}) for ident, pos in mapa.ids.get('marcas', {}).items()}
        en_pasos, en_empujones = marcas_reveladas(mapa, rp['solucion']), marcas_reveladas(mapa, re['solucion'])
        lineas.append(f"  10. Narrativa enlazada al mapa · {len(mapa.marcas)} marcas · reveladas siguiendo el récord "
                      f"de pasos: {len(en_pasos)} · siguiendo el de empujones: {len(en_empujones)}")
        for celda in sorted(mapa.marcas):
            e = marcas.get(celda, {})
            if celda in en_pasos and celda in en_empujones:
                donde = 'se revela siguiendo ambos récords'
            elif celda in en_pasos | en_empujones:
                donde = 'se revela siguiendo solo un récord'
            else:
                donde = 'fuera de las rutas de los récords (exploración opcional)'
            lineas.append(f"       {e.get('id', '?')} en fila {celda[0]}, columna {celda[1]}: {donde}")
            if e.get('importancia') == 'principal' and not (celda in en_pasos and celda in en_empujones):
                revisar.append(f"la marca principal {e.get('id')} no se revela siguiendo ambos récords")

    datos = {'recordPasos': rp, 'recordEmpujones': re, 'recogerTodo': recoger}
    return bloqueos, revisar, lineas, datos


def main():
    sys.stdout.reconfigure(encoding='utf-8')
    rapido = '--rapido' in sys.argv
    pedidos = [int(a) for a in sys.argv[1:] if a.isdigit()]
    disponibles = sorted(int(p.stem[5:]) for p in CARPETA_NIVELES.glob('nivel*.txt'))
    print(f'Cajas: la letra de la capa [sokoban] es su ID')
    ruta_soluciones = CARPETA_NIVELES / 'soluciones.json'
    soluciones = json.loads(ruta_soluciones.read_text(encoding='utf-8')) if ruta_soluciones.exists() else {}

    hay_bloqueos = False
    ids_vistos = set()
    for n in pedidos or disponibles:
        print(f'\n══ Nivel {n} ══')
        try:
            mapa, de_formato = leer_nivel(CARPETA_NIVELES / f'nivel{n}.txt')
        except (OSError, ValueError) as error:
            print(f'  ✗ No se pudo leer: {error}')
            hay_bloqueos = True
            continue
        bloqueos, revisar, lineas, datos = validar(n, mapa, rapido, ids_vistos)
        bloqueos = de_formato + bloqueos
        lineas.insert(1, '  Cajas: ' + ' · '.join(f'{ident} ({f},{c})' for ident, (f, c) in sorted(mapa.ids['cajas'].items())))
        print('\n'.join('  ' + l for l in lineas))
        for b in bloqueos:
            print(f'  ✗ BLOQUEA: {b}')
        for r in revisar:
            print(f'  ⚠ REVISAR: {r}')
        print(f"  → {'RECHAZADO' if bloqueos else 'APROBADO'}")
        hay_bloqueos |= bool(bloqueos)
        if datos and not bloqueos:
            soluciones[str(n)] = datos

    ruta_soluciones.write_text(json.dumps(dict(sorted(soluciones.items(), key=lambda kv: int(kv[0]))),
                                          ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'\nSoluciones guardadas en {ruta_soluciones.relative_to(RAIZ)}')
    sys.exit(1 if hay_bloqueos else 0)


if __name__ == '__main__':
    main()
