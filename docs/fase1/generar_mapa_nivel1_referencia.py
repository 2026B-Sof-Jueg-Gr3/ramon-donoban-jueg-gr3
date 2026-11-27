"""Genera assets/mapas/nivel1.json (formato JSON de Tiled) y assets/tilesets/provisional.png (tileset de edición).
Script de una sola vez: el juego dibuja sus propias baldosas por código; el PNG solo sirve para abrir el mapa en Tiled."""
import json
import struct
import zlib
from pathlib import Path

REPO = Path('C:/Users/dopar/Music/Git/ramon-donoban-jueg-gr3')
TAM = 64
COLUMNAS, FILAS = 32, 15

# ── Suelo: salas y pasillo ────────────────────────────────────────────────────
suelo = [[False] * COLUMNAS for _ in range(FILAS)]


def sala(c0, c1, r0, r1):
    for r in range(r0, r1 + 1):
        for c in range(c0, c1 + 1):
            suelo[r][c] = True


sala(5, 12, 1, 4)      # sala norte
sala(8, 11, 5, 5)      # puerta de la sala norte
sala(1, 30, 6, 9)      # pasillo (30 baldosas de largo)
sala(21, 24, 10, 10)   # puerta de la sala sur
sala(17, 28, 11, 13)   # sala sur

# Paredes: toda baldosa que no es suelo y toca (también en diagonal) un suelo
pared = [[False] * COLUMNAS for _ in range(FILAS)]
for r in range(FILAS):
    for c in range(COLUMNAS):
        if suelo[r][c]:
            continue
        for dr in (-1, 0, 1):
            for dc in (-1, 0, 1):
                rr, cc = r + dr, c + dc
                if 0 <= rr < FILAS and 0 <= cc < COLUMNAS and suelo[rr][cc]:
                    pared[r][c] = True

# Identificadores de baldosa (gid): 1 suelo A · 2 suelo B · 3 pared con cara · 4 pared solo tapa
datos_suelo = [[(1 if (c + r) % 2 == 0 else 2) if suelo[r][c] else 0 for c in range(COLUMNAS)] for r in range(FILAS)]
datos_pared = [[(3 if (r + 1 < FILAS and suelo[r + 1][c]) else 4) if pared[r][c] else 0 for c in range(COLUMNAS)] for r in range(FILAS)]

# ── Objetos (píxeles) ─────────────────────────────────────────────────────────
_id = [0]


def propiedad(nombre, valor):
    tipo = 'bool' if isinstance(valor, bool) else 'int' if isinstance(valor, int) else 'string'
    return {'name': nombre, 'type': tipo, 'value': valor}


def objeto(nombre, tipo, x, y, w=0, h=0, **props):
    _id[0] += 1
    o = {'class': tipo, 'height': h, 'id': _id[0], 'name': nombre, 'rotation': 0, 'type': tipo,
         'visible': True, 'width': w, 'x': x, 'y': y}
    if tipo == 'inicio':
        o['point'] = True
    if props:
        o['properties'] = [propiedad(k, v) for k, v in props.items()]
    return o


objetos = [
    objeto('inicio', 'inicio', 200, 540),
    # Muebles (huella en el suelo: x, y, ancho, profundidad). `alto` es la altura de la cara frontal dibujada
    objeto('armario', 'mueble', 704, 448, 128, 48, alto=150, estilo='armario'),
    objeto('estante', 'mueble', 1280, 848, 160, 48, alto=170, estilo='estante'),
    objeto('banco', 'mueble', 1280, 570, 128, 40, alto=36, estilo='banco'),
    objeto('mesa', 'mueble', 448, 192, 160, 80, alto=56, estilo='mesa'),
    # Los muebles altos cortan la luz: mismo rectángulo que el mueble y la altura de su cara frontal
    objeto('armario-luz', 'bloqueaLuz', 704, 448, 128, 48, alturaCara=150),
    objeto('estante-luz', 'bloqueaLuz', 1280, 848, 160, 48, alturaCara=170),
    # Solo se ve cuando el cono de la linterna lo toca (justo detrás del armario, según de dónde se alumbre)
    objeto('huellas', 'revelable', 870, 470, 96, 44, icono='huellas'),
    # Al acercarse aparece el ícono de la tecla E
    objeto('brillo', 'interactuable', 688, 120, 48, 48, accion='examinar', distancia=84),
]

# ── Tileset de edición (PNG) ──────────────────────────────────────────────────
ANCHO_PNG, ALTO_PNG = TAM * 4, TAM
lienzo = [[(0, 0, 0, 0)] * ANCHO_PNG for _ in range(ALTO_PNG)]


def rect(x0, y0, w, h, color):
    for y in range(y0, y0 + h):
        for x in range(x0, x0 + w):
            lienzo[y][x] = color + (255,)


def suelo_png(x0, base, linea):
    rect(x0, 0, TAM, TAM, base)
    for k in range(4):
        rect(x0, k * 16 + 15, TAM, 1, linea)
        rect(x0 + (20 + 24 * k) % TAM, k * 16, 1, 15, linea)


def pared_cara_png(x0):
    rect(x0, 0, TAM, TAM, (104, 90, 82))
    rect(x0, 0, TAM, 14, (176, 164, 154))
    rect(x0, 14, TAM, 2, (128, 116, 106))
    for i, y in enumerate((27, 38, 49)):
        rect(x0, y, TAM, 1, (76, 64, 58))
        for xj in range(((i % 2) * 16), TAM, 32):
            rect(x0 + xj, y - 10, 1, 10, (76, 64, 58))
    rect(x0, 60, TAM, 4, (70, 58, 52))


def pared_tapa_png(x0):
    rect(x0, 0, TAM, TAM, (160, 149, 140))
    rect(x0, 0, TAM, 2, (190, 180, 171))
    rect(x0, 0, 2, TAM, (190, 180, 171))
    rect(x0, TAM - 2, TAM, 2, (120, 108, 98))
    rect(x0 + TAM - 2, 0, 2, TAM, (120, 108, 98))


suelo_png(0, (126, 98, 74), (92, 70, 52))
suelo_png(TAM, (118, 91, 68), (92, 70, 52))
pared_cara_png(TAM * 2)
pared_tapa_png(TAM * 3)


def png(ancho, alto, filas):
    crudo = b''.join(b'\x00' + b''.join(bytes(p) for p in fila) for fila in filas)

    def trozo(tag, datos):
        return struct.pack('>I', len(datos)) + tag + datos + struct.pack('>I', zlib.crc32(tag + datos) & 0xffffffff)

    return (b'\x89PNG\r\n\x1a\n' + trozo(b'IHDR', struct.pack('>IIBBBBB', ancho, alto, 8, 6, 0, 0, 0))
            + trozo(b'IDAT', zlib.compress(crudo, 9)) + trozo(b'IEND', b''))


ruta_png = REPO / 'assets' / 'tilesets' / 'provisional.png'
ruta_png.write_bytes(png(ANCHO_PNG, ALTO_PNG, lienzo))

# ── JSON de Tiled ─────────────────────────────────────────────────────────────
marcadores = {}


def capa_baldosas(identificador, nombre, filas):
    marcadores[f'@@{nombre}@@'] = '[\n' + ',\n'.join('   ' + ','.join(str(g) for g in fila) for fila in filas) + '\n  ]'
    return {'data': f'@@{nombre}@@', 'height': FILAS, 'id': identificador, 'name': nombre, 'opacity': 1,
            'type': 'tilelayer', 'visible': True, 'width': COLUMNAS, 'x': 0, 'y': 0}


mapa = {
    'compressionlevel': -1,
    'height': FILAS,
    'infinite': False,
    'layers': [
        capa_baldosas(1, 'suelo', datos_suelo),
        capa_baldosas(2, 'paredes', datos_pared),
        {'draworder': 'topdown', 'id': 3, 'name': 'objetos', 'objects': objetos, 'opacity': 1, 'type': 'objectgroup',
         'visible': True, 'x': 0, 'y': 0},
    ],
    'nextlayerid': 4,
    'nextobjectid': _id[0] + 1,
    'orientation': 'orthogonal',
    'renderorder': 'right-down',
    'tiledversion': '1.10.2',
    'tileheight': TAM,
    'tilesets': [{'columns': 4, 'firstgid': 1, 'image': '../tilesets/provisional.png', 'imageheight': ALTO_PNG,
                  'imagewidth': ANCHO_PNG, 'margin': 0, 'name': 'provisional', 'spacing': 0, 'tilecount': 4,
                  'tileheight': TAM, 'tilewidth': TAM}],
    'tilewidth': TAM,
    'type': 'map',
    'version': '1.10',
    'width': COLUMNAS,
}
texto = json.dumps(mapa, indent=1, ensure_ascii=False)
for marcador, bloque in marcadores.items():
    texto = texto.replace(f'"{marcador}"', bloque)
json.loads(texto)  # sigue siendo JSON válido
ruta_json = REPO / 'assets' / 'mapas' / 'nivel1.json'
ruta_json.write_text(texto + '\n', encoding='utf-8', newline='\n')

print(f'mapa {COLUMNAS}x{FILAS} baldosas = {COLUMNAS * TAM}x{FILAS * TAM} px')
print('suelo:', sum(map(sum, suelo)), '· paredes:', sum(map(sum, pared)), '· objetos:', len(objetos))
print('escrito:', ruta_json.name, ruta_json.stat().st_size, 'bytes ·', ruta_png.name, ruta_png.stat().st_size, 'bytes')
for r in range(FILAS):
    print(''.join('.' if suelo[r][c] else '#' if pared[r][c] else ' ' for c in range(COLUMNAS)))
