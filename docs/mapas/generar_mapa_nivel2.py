"""Fase 5a: genera assets/mapas/nivel2.json (formato JSON de Tiled) para EL FANTASMA DE LA COCINA.
Usa el mismo tileset provisional del pasillo (assets/tilesets/provisional.png); el juego dibuja sus baldosas por código.
Las coordenadas de los objetos están en píxeles (baldosa = 64). El muro norte llega hasta y = 256; el suelo empieza ahí."""
import json
from pathlib import Path

REPO = Path('C:/Users/dopar/Music/Git/ramon-donoban-jueg-gr3')
TAM = 64
COLUMNAS, FILAS = 24, 12

# ── Suelo: la cocina (22 × 6 baldosas) y un rincón al sureste para las pilas ──
suelo = [[False] * COLUMNAS for _ in range(FILAS)]


def sala(c0, c1, r0, r1):
    for r in range(r0, r1 + 1):
        for c in range(c0, c1 + 1):
            suelo[r][c] = True


sala(1, 22, 4, 9)      # la cocina: x 64–1472, y 256–640
sala(20, 21, 10, 10)   # el rincón de las pilas: x 1280–1408, y 640–704

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
        return 3
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


objetos = [objeto('inicio', 'inicio', 150, 540)]

# Muebles (huella en el suelo: x, y, ancho, profundidad). `alto` es la altura de la cara frontal dibujada.
# Contra el muro norte, de oeste a este: la vitrina, la alacena con ruedas, la chimenea, el fregadero y la cocina.
# La mesa de las velas está en medio, delante del fuelle escondido.
objetos += [
    objeto('vitrina', 'mueble', 80, 256, 96, 40, alto=110, estilo='vitrina'),
    objeto('alacena', 'mueble', 200, 256, 128, 64, alto=150, estilo='alacena'),
    objeto('chimenea', 'mueble', 560, 256, 160, 48, alto=100, estilo='chimenea'),
    objeto('mesa', 'mueble', 880, 336, 160, 56, alto=40, estilo='mesa'),
    objeto('fregadero', 'mueble', 1100, 256, 160, 48, alto=56, estilo='fregadero'),
    objeto('estufa', 'mueble', 1290, 256, 128, 56, alto=64, estilo='estufa'),
]
# Los muebles altos cortan la luz
objetos += [
    objeto('vitrina-luz', 'bloqueaLuz', 80, 256, 96, 40, alturaCara=110),
    objeto('alacena-luz', 'bloqueaLuz', 200, 256, 128, 64, alturaCara=150),
    objeto('chimenea-luz', 'bloqueaLuz', 560, 256, 160, 48, alturaCara=100),
]

# El golpe sale de la alacena (la onda visual parte de ahí)
objetos.append(objeto('golpe', 'fenomeno', 200, 256, 128, 64, efecto='golpe'))

# Las velas de la mesa (x, y = la base de la vela) y las ollas colgadas sobre la cocina
for i, x in enumerate((905, 935, 960), start=1):
    objetos.append(objeto(f'vela-{i}', 'vela', x, 332, 8, 22))
for i, x in enumerate((1300, 1345, 1390), start=1):
    objetos.append(objeto(f'olla-{i}', 'olla', x, 152, 34, 40))

# La cuerda: sube por el muro desde detrás de la alacena (x = 256), corre por lo alto del muro (el "techo") y baja al fuelle
objetos.append({
    'class': 'cuerda', 'height': 0, 'id': (_id.__setitem__(0, _id[0] + 1) or _id[0]), 'name': 'cuerda-recorrido', 'rotation': 0,
    'type': 'cuerda', 'visible': True, 'width': 0, 'x': 256, 'y': 256,
    'polyline': [{'x': 0, 'y': 0}, {'x': 0, 'y': -110}, {'x': 724, 'y': -110}, {'x': 724, 'y': -70}]
})

# Lo que se descubre con la luz: la mancha de aceite junto a la alacena (sin texto propio)
objetos.append(objeto('mancha', 'revelable', 340, 345, 150, 52, ref='n2-mancha-aceite', dibujo='aceite', accion='examinar'))

# Lo que se puede usar con E. Todo se usa desde cerca (40 px desde los pies), de frente (±60°) y con luz (src/motor/Alcance.js).
# sobre = se usa desde ese mueble · mira "x,y" = el punto al que hay que mirar · luz "x,y,ancho,alto" = lo que tiene que tocar la luz ·
# enPared = el objeto está sobre el muro, no sobre el suelo.
objetos += [
    # La alacena: examinarla y rodarla (dos acciones, una misma zona). La luz tiene que tocar el suelo delante de ella.
    objeto('examinar-alacena', 'interactuable', 200, 256, 128, 64, ref='alacena', accion='examinar', sobre='alacena', luz='216,321,96,8'),
    objeto('rodar-alacena', 'interactuable', 200, 256, 128, 64, ref='alacena', accion='rodar', sobre='alacena', luz='216,321,96,8'),
    # La cuerda, ya a la vista: se tira de ella pegado al muro, justo donde estaba la alacena
    objeto('tirar-cuerda', 'interactuable', 224, 146, 64, 112, ref='cuerda', accion='tirar', enPared=True, luz='224,257,64,8'),
    # El fuelle escondido en el muro, encima de la mesa de las velas (la zona llega al pie del muro, como las cortinas del pasillo)
    objeto('fuelle', 'interactuable', 940, 176, 80, 82, ref='fuelle', accion='examinar', dibujo='fuelle', enPared=True, luz='940,257,80,8'),
    # Los muebles con su texto
    objeto('copas', 'interactuable', 80, 256, 96, 40, ref='n2-mueble-copas', accion='examinar', sobre='vitrina', luz='96,297,64,8'),
    objeto('platos', 'interactuable', 1120, 208, 56, 30, ref='n2-mueble-platos', accion='examinar', dibujo='platos', sobre='fregadero',
           mira='1148,223', luz='1100,262,160,30'),
    objeto('sarten', 'interactuable', 1310, 206, 70, 30, ref='n2-mueble-sarten', accion='examinar', dibujo='sarten', sobre='estufa',
           mira='1345,221', luz='1290,262,128,40'),
    # Las pistas y las pilas
    objeto('taza', 'interactuable', 1210, 212, 36, 26, ref='n2-pista-taza', accion='recoger', dibujo='taza', sobre='fregadero',
           mira='1228,225', luz='1100,262,160,30'),
    objeto('recibo', 'interactuable', 980, 305, 48, 30, ref='n2-pista-recibo', accion='recoger', dibujo='recibo', sobre='mesa',
           mira='1004,320'),
    objeto('pilas', 'interactuable', 1300, 664, 48, 36, ref='bateria', accion='recoger', dibujo='pilas'),
]

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
    'tilesets': [{'columns': 5, 'firstgid': 1, 'image': '../tilesets/provisional.png', 'imageheight': TAM,
                  'imagewidth': TAM * 5, 'margin': 0, 'name': 'provisional', 'spacing': 0, 'tilecount': 5,
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
ruta_json = REPO / 'assets' / 'mapas' / 'nivel2.json'
ruta_json.write_text(texto + '\n', encoding='utf-8', newline='\n')

print(f'mapa {COLUMNAS}x{FILAS} baldosas = {COLUMNAS * TAM}x{FILAS * TAM} px')
print('suelo:', sum(map(sum, suelo)), '| paredes:', sum(map(sum, pared)), '| objetos:', len(objetos))
for r in range(FILAS):
    print(''.join('.' if suelo[r][c] else {3: 'C', 4: 't', 5: 'L'}.get(datos_pared[r][c], ' ') for c in range(COLUMNAS)))
