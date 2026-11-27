"""Nivel 5: LA SOMBRA EN LA VENTANA (persecución en tiempo real, sin deducción). Una sala con la chimenea encendida donde la sombra quema papeles.
Lo que hay: la salida al jardín (este), la puerta por la que se entra, atrancada (oeste), las pisadas mojadas (solo con luz), la cortina con el abrigo detrás,
las velas, el cuadro torcido, el sofá hundido y la puerta al despacho, que se abre después de la captura. Los puntos de la sombra (su ruta, sus
escondites y la salida) están en el mapa como objetos de tipo "ruta", "escondite" y "salida-sombra"."""
from tiled_comun import Mapa

m = Mapa(23, 12)
m.sala(1, 20, 4, 9)          # la sala: x 64–1344, y 256–640

m.objeto('inicio', 'inicio', 170, 560)

# Muebles (huella: x, y, ancho, profundidad; alto = cara dibujada)
m.mueble('chimenea', 576, 256, 160, 48, 100, 'chimenea', corta_luz=True)
m.mueble('velas', 300, 256, 64, 32, 40, 'velas')
m.mueble('sofa', 860, 420, 192, 72, 60, 'sofa', corta_luz=True)
m.mueble('cortina', 1040, 256, 112, 20, 130, 'cortina', corta_luz=True)

# El fuego de la chimenea y el sitio donde se huele el humo (a ≤ 120 px de la chimenea)
m.objeto('fuego', 'fenomeno', 620, 232, 70, 44, efecto='fuego')
m.objeto('cerca-chimenea', 'piso', 456, 304, 400, 120, ref='cerca-chimenea')

# Las pisadas mojadas: solo se ven con la luz
m.objeto('pisadas', 'revelable', 130, 470, 420, 60, ref='n5-pisadas', dibujo='pisadas', accion='examinar')

# Lo que se usa con E (cerca, de frente y con luz)
m.objeto('puerta-atrancada', 'interactuable', 66, 400, 40, 128, ref='puerta-atrancada', accion='examinar', dibujo='puerta-atrancada')
m.objeto('salida-jardin', 'interactuable', 1288, 400, 56, 128, ref='salida-jardin', accion='cerrar', dibujo='puerta-jardin')
m.objeto('apagar-chimenea', 'interactuable', 576, 256, 160, 48, ref='chimenea', accion='apagar', sobre='chimenea', luz='576,305,160,8')
m.objeto('velas-usable', 'interactuable', 300, 256, 64, 32, ref='n5-mueble-velas', accion='examinar', sobre='velas', luz='300,289,64,8')
m.objeto('cuadro', 'interactuable', 420, 194, 64, 64, ref='n5-mueble-cuadro', accion='examinar', dibujo='cuadro', enPared=True, luz='420,257,64,8')
m.objeto('sofa-usable', 'interactuable', 860, 420, 192, 72, ref='n5-mueble-sofa', accion='examinar', sobre='sofa', luz='860,493,192,8')
m.objeto('puerta-despacho', 'interactuable', 1230, 150, 96, 108, ref='puerta-despacho', accion='abrir', dibujo='puerta-despacho', enPared=True, luz='1230,257,96,8')

# Tras la captura: el abrigo negro (junto a la cortina) y las pilas (en su bolsillo)
m.objeto('abrigo', 'interactuable', 1168, 262, 44, 40, ref='n5-pista-abrigo', accion='recoger', dibujo='abrigo')
m.objeto('pilas', 'interactuable', 1224, 304, 48, 36, ref='bateria', accion='recoger', dibujo='pilas')

# La sombra: su ruta junto a la chimenea, sus escondites (detrás del sofá y de la cortina) y la salida al jardín
for i, (x, y) in enumerate([(700, 340), (820, 360), (760, 420), (640, 380)], start=1):
    m.objeto(f'ruta-{i}', 'ruta', x, y)
m.objeto('escondite-sofa', 'escondite', 960, 404)
m.objeto('escondite-cortina', 'escondite', 1096, 292)
m.objeto('salida-sombra', 'salida-sombra', 1316, 464)

m.guardar('assets/mapas/nivel5.json')
