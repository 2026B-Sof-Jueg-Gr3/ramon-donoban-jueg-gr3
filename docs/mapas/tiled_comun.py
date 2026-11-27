"""Generador común de los mapas de las habitaciones (formato JSON de Tiled), con el mismo tileset provisional del pasillo
(assets/tilesets/provisional.png, que el juego dibuja por código). Las coordenadas de los objetos están en píxeles (baldosa = 64).
El muro norte de cada sala llega hasta y = 64 * (primera fila de suelo); el suelo empieza ahí.

Uso:
    m = Mapa(columnas, filas)
    m.sala(c0, c1, r0, r1)                       # suelo (columnas y filas de baldosas, ambos extremos incluidos)
    m.objeto('nombre', 'mueble', x, y, w, h, alto=110, estilo='armario')
    m.guardar('assets/mapas/nivelN.json')
Tipos de objeto que entiende el juego: inicio, mueble, bloqueaLuz, revelable, interactuable, ventana, fenomeno, piso, vela, olla, cuerda, hilo…
"""
import json
from pathlib import Path

REPO = Path('C:/Users/dopar/Music/Git/ramon-donoban-jueg-gr3')
TAM = 64


def propiedad(nombre, valor):
    tipo = 'bool' if isinstance(valor, bool) else 'int' if isinstance(valor, int) else 'string'
    return {'name': nombre, 'type': tipo, 'value': valor}


class Mapa:
    def __init__(self, columnas, filas):
        self.columnas, self.filas = columnas, filas
        self.suelo = [[False] * columnas for _ in range(filas)]
        self.objetos = []
        self._id = 0

    def sala(self, c0, c1, r0, r1):
        for r in range(r0, r1 + 1):
            for c in range(c0, c1 + 1):
                self.suelo[r][c] = True

    def objeto(self, nombre, tipo, x, y, w=0, h=0, polilinea=None, **props):
        self._id += 1
        o = {'class': tipo, 'height': h, 'id': self._id, 'name': nombre, 'rotation': 0, 'type': tipo, 'visible': True, 'width': w, 'x': x, 'y': y}
        if tipo == 'inicio':
            o['point'] = True
        if polilinea:
            o['polyline'] = [{'x': px, 'y': py} for px, py in polilinea]
        if props:
            o['properties'] = [propiedad(k, v) for k, v in props.items()]
        self.objetos.append(o)
        return o

    # Un mueble alto corta la luz: lleva su bloque "-luz" con la altura de su cara
    def mueble(self, nombre, x, y, w, h, alto, estilo, corta_luz=False, **extra):
        self.objeto(nombre, 'mueble', x, y, w, h, alto=alto, estilo=estilo, **extra)
        if corta_luz:
            self.objeto(f'{nombre}-luz', 'bloqueaLuz', x, y, w, h, alturaCara=alto)

    def _paredes(self):
        f, c = self.filas, self.columnas
        pared = [[False] * c for _ in range(f)]
        for r in range(f):
            for k in range(c):
                if self.suelo[r][k]:
                    continue
                for dr in (-1, 0, 1):
                    for dc in (-1, 0, 1):
                        rr, cc = r + dr, k + dc
                        if 0 <= rr < f and 0 <= cc < c and self.suelo[rr][cc]:
                            pared[r][k] = True
        for k in range(c):
            pared[min(r for r in range(f) if any(self.suelo[r])) - 2][k] = True
        return pared

    def guardar(self, ruta):
        f, c = self.filas, self.columnas
        suelo, pared = self.suelo, self._paredes()
        es_suelo = lambda r, k: 0 <= r < f and 0 <= k < c and suelo[r][k]
        es_pared = lambda r, k: 0 <= r < f and 0 <= k < c and pared[r][k]

        def baldosa(r, k):
            if es_suelo(r + 1, k):
                return 5 if es_pared(r - 1, k) else 3
            if es_pared(r + 1, k) and es_suelo(r + 2, k):
                return 3
            return 4

        datos_suelo = [[(1 if (k + r) % 2 == 0 else 2) if suelo[r][k] else 0 for k in range(c)] for r in range(f)]
        datos_pared = [[baldosa(r, k) if pared[r][k] else 0 for k in range(c)] for r in range(f)]
        marcadores = {}

        def capa(identificador, nombre, filas_):
            marcadores[f'@@{nombre}@@'] = '[\n' + ',\n'.join('   ' + ','.join(str(g) for g in fila) for fila in filas_) + '\n  ]'
            return {'data': f'@@{nombre}@@', 'height': f, 'id': identificador, 'name': nombre, 'opacity': 1, 'type': 'tilelayer', 'visible': True, 'width': c, 'x': 0, 'y': 0}

        mapa = {
            'compressionlevel': -1, 'height': f, 'infinite': False,
            'layers': [capa(1, 'suelo', datos_suelo), capa(2, 'paredes', datos_pared),
                       {'draworder': 'topdown', 'id': 3, 'name': 'objetos', 'objects': self.objetos, 'opacity': 1, 'type': 'objectgroup', 'visible': True, 'x': 0, 'y': 0}],
            'nextlayerid': 4, 'nextobjectid': self._id + 1, 'orientation': 'orthogonal', 'renderorder': 'right-down', 'tiledversion': '1.10.2',
            'tileheight': TAM,
            'tilesets': [{'columns': 5, 'firstgid': 1, 'image': '../tilesets/provisional.png', 'imageheight': TAM, 'imagewidth': TAM * 5, 'margin': 0,
                          'spacing': 0, 'name': 'provisional', 'tilecount': 5, 'tileheight': TAM, 'tilewidth': TAM}],
            'tilewidth': TAM, 'type': 'map', 'version': '1.10', 'width': c
        }
        texto = json.dumps(mapa, indent=1, ensure_ascii=False)
        for marcador, bloque in marcadores.items():
            texto = texto.replace(f'"{marcador}"', bloque)
        json.loads(texto)
        destino = REPO / ruta
        destino.write_text(texto + '\n', encoding='utf-8', newline='\n')
        print(f'{ruta}: {c}x{f} baldosas = {c * TAM}x{f * TAM} px | objetos: {len(self.objetos)}')
        for r in range(f):
            print(''.join('.' if suelo[r][k] else {3: 'C', 4: 't', 5: 'L'}.get(datos_pared[r][k], ' ') for k in range(c)))
