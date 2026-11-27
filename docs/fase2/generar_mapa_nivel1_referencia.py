"""Fase 2: genera assets/mapas/nivel1.json (formato JSON de Tiled) y assets/tilesets/provisional.png para EL PASILLO OSCURO.
Script de una sola vez: el juego dibuja sus propias baldosas por código; el PNG solo sirve para abrir el mapa en Tiled.
Las coordenadas de los objetos están en píxeles (baldosa = 64)."""
import json
import struct
import zlib
from pathlib import Path

REPO = Path('C:/Users/dopar/Music/Git/ramon-donoban-jueg-gr3')
TAM = 64
COLUMNAS, FILAS = 36, 13

# ── Suelo: un pasillo largo (34 × 5 baldosas) y un rincón en el sur ──────────
suelo = [[False] * COLUMNAS for _ in range(FILAS)]


def sala(c0, c1, r0, r1):
    for r in range(r0, r1 + 1):
        for c in range(c0, c1 + 1):
            suelo[r][c] = True


sala(1, 34, 4, 8)      # el pasillo
sala(6, 7, 9, 9)       # el rincón donde están las pilas

# ── Paredes: toda baldosa que no es suelo y toca (también en diagonal) un suelo, más una fila extra sobre el muro norte
# (el muro norte tiene dos baldosas de alto: ahí van las ventanas y las cortinas) ──
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
for c in range(COLUMNAS):
    pared[2][c] = True


def es_suelo(r, c):
    return 0 <= r < FILAS and 0 <= c < COLUMNAS and suelo[r][c]


def es_pared(r, c):
    return 0 <= r < FILAS and 0 <= c < COLUMNAS and pared[r][c]


def baldosa_de_pared(r, c):
    """3 = muro con tapa y ladrillo · 5 = solo ladrillo (la parte baja de un muro alto) · 4 = solo tapa"""
    if es_suelo(r + 1, c):
        return 5 if es_pared(r - 1, c) else 3
    if es_pared(r + 1, c) and es_suelo(r + 2, c):
        return 3                                   # parte alta de un muro de dos baldosas
    return 4


datos_suelo = [[(1 if (c + r) % 2 == 0 else 2) if suelo[r][c] else 0 for c in range(COLUMNAS)] for r in range(FILAS)]
datos_pared = [[baldosa_de_pared(r, c) if pared[r][c] else 0 for c in range(COLUMNAS)] for r in range(FILAS)]

# ── Objetos ───────────────────────────────────────────────────────────────────
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


VENTANAS_X = [512, 1024, 1536, 1984]       # centros; la última es la ventana rota, detrás de la pila de cajas

objetos = [objeto('inicio', 'inicio', 170, 440)]

# Muebles (huella en el suelo: x, y, ancho, profundidad). `alto` es la altura de la cara frontal dibujada
objetos += [
    objeto('pila-de-cajas', 'mueble', 1920, 384, 128, 64, alto=80, estilo='cajas'),
    objeto('armario', 'mueble', 800, 512, 128, 64, alto=150, estilo='armario'),
    objeto('consola', 'mueble', 1152, 272, 192, 48, alto=44, estilo='consola'),
    objeto('banco', 'mueble', 1600, 536, 128, 40, alto=36, estilo='banco'),
]
# Los muebles altos cortan la luz: mismo rectángulo que el mueble y la altura de su cara frontal
objetos += [
    objeto('pila-luz', 'bloqueaLuz', 1920, 384, 128, 64, alturaCara=80),
    objeto('armario-luz', 'bloqueaLuz', 800, 512, 128, 64, alturaCara=150),
]

# Ventanas y cortinas del muro norte (la última ventana está rota)
for i, cx in enumerate(VENTANAS_X, start=1):
    rota = i == len(VENTANAS_X)
    objetos.append(objeto(f'ventana-{i}', 'ventana', cx - 32, 162, 64, 76, rota=rota))
    fuerza = 1.8 if rota else 1.0
    objetos.append(objeto(f'cortina-{i}-izq', 'cortina', cx - 62, 150, 30, 108, lado='izq', fuerza=fuerza, rota=False))
    objetos.append(objeto(f'cortina-{i}-der', 'cortina', cx + 32, 150, 30, 108, lado='der', fuerza=fuerza, rota=rota))

# Origen de la corriente: el alféizar de la ventana rota (hacia ahí derivan el polvo y las cortinas)
objetos.append(objeto('corriente', 'fenomeno', 1952, 236, 64, 20, efecto='corriente'))

# Marcas que solo se ven con la linterna (ref = id de la narrativa)
objetos += [
    objeto('polvo', 'revelable', 700, 440, 96, 44, ref='n1-marca-polvo', dibujo='polvo'),
    objeto('arrastre', 'revelable', 1690, 276, 190, 60, ref='n1-marca-arrastre', dibujo='arrastre',
           accion='examinar'),
]

# Lo que se puede usar con E. Todo se usa desde cerca (40 px desde los pies, ver src/motor/Alcance.js), de frente (±60°) y
# con luz. Propiedades de alcance: distancia (la baja, nunca pasa de 40) · sobre (se usa desde el mueble) ·
# mira "x,y" (el punto al que hay que mirar) · luz "x,y,ancho,alto" (la zona que tiene que tocar la luz).
objetos += [
    # La pila se examina desde el frente (la cara que se ve); la luz tiene que tocar el suelo justo delante de ella
    objeto('examinar-pila', 'interactuable', 1920, 384, 128, 64, ref='pila-de-cajas', accion='examinar',
           luz='1936,449,96,8'),
    # Mirar detrás: una franja pequeña justo debajo de la ventana 4 (±16 px de margen), pegada a la pared. Hay que estar
    # DENTRO (distancia 0), mirando hacia la ventana y con la luz sobre ella (el suelo al pie de su muro)
    objeto('mirar-detras', 'interactuable', 1936, 256, 96, 40, ref='pila-de-cajas', accion='mirar-detras',
           lado='ventana', distancia=0, mira='1984,200', luz='1952,257,64,8'),
]
# Las cortinas son el muro con sus cortinas (enPared: no está sobre el suelo); se usan desde el suelo pegado al muro
for i, cx in enumerate(VENTANAS_X[:3], start=1):
    objetos.append(objeto(f'cortinas-{i}', 'interactuable', cx - 64, 150, 128, 108, ref='cortinas', accion='examinar',
                          enPared=True, luz=f'{cx - 64},257,128,8'))
objetos += [
    objeto('huella-bota', 'interactuable', 300, 500, 48, 40, ref='n1-pista-huella', accion='recoger', dibujo='huella-bota'),
    # El recorte está sobre la consola: se recoge de pie frente a ella (desde su borde frontal), con la luz sobre el recorte
    objeto('recorte', 'interactuable', 1228, 238, 48, 30, ref='n1-pista-periodico', accion='recoger', dibujo='recorte',
           sobre='consola'),
    objeto('pilas', 'interactuable', 424, 596, 48, 36, ref='bateria', accion='recoger', dibujo='pilas'),
]

# ── Tileset de edición (PNG): 5 baldosas ──────────────────────────────────────
ANCHO_PNG, ALTO_PNG = TAM * 5, TAM
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


def ladrillos(x0, desde):
    rect(x0, desde, TAM, TAM - desde, (104, 90, 82))
    for i, y in enumerate((27, 38, 49)):
        if y < desde + 2:
            continue
        rect(x0, y, TAM, 1, (76, 64, 58))
        for xj in range(((i % 2) * 16), TAM, 32):
            rect(x0 + xj, max(desde, y - 10), 1, y - max(desde, y - 10), (76, 64, 58))


def pared_cara_png(x0):
    ladrillos(x0, 16)
    rect(x0, 0, TAM, 14, (176, 164, 154))
    rect(x0, 14, TAM, 2, (128, 116, 106))
    rect(x0, 60, TAM, 4, (70, 58, 52))


def pared_ladrillo_png(x0):
    rect(x0, 0, TAM, TAM, (104, 90, 82))
    for i, y in enumerate((11, 22, 33, 44, 55)):
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
pared_ladrillo_png(TAM * 4)


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
    'tilesets': [{'columns': 5, 'firstgid': 1, 'image': '../tilesets/provisional.png', 'imageheight': ALTO_PNG,
                  'imagewidth': ANCHO_PNG, 'margin': 0, 'name': 'provisional', 'spacing': 0, 'tilecount': 5,
                  'tileheight': TAM, 'tilewidth': TAM}],
    'tilewidth': TAM,
    'type': 'map',
    'version': '1.10',
    'width': COLUMNAS,
}
texto = json.dumps(mapa, indent=1, ensure_ascii=False)
for marcador, bloque in marcadores.items():
    texto = texto.replace(f'"{marcador}"', bloque)
json.loads(texto)
ruta_json = REPO / 'assets' / 'mapas' / 'nivel1.json'
ruta_json.write_text(texto + '\n', encoding='utf-8', newline='\n')

print(f'mapa {COLUMNAS}x{FILAS} baldosas = {COLUMNAS * TAM}x{FILAS * TAM} px')
print('suelo:', sum(map(sum, suelo)), '| paredes:', sum(map(sum, pared)), '| objetos:', len(objetos))
for r in range(FILAS):
    print(''.join('.' if suelo[r][c] else {3: 'C', 4: 't', 5: 'L'}.get(datos_pared[r][c], ' ') for c in range(COLUMNAS)))
