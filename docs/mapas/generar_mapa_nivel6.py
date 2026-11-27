"""Nivel 6: LA VERDAD REVELADA (reconstrucción y deducción final). El despacho del viejo Flieder: el gran reloj detenido con el suelo hueco a su lado,
los archivos movidos (con marcas frescas en el suelo que solo se ven con luz), el archivador forzado, los libros de contabilidad, la pluma «G. V.»,
las cartas de compradores y las pilas. Bajo el reloj hay un compartimento que se abre al cerrar el caso (objeto "fenomeno" con efecto "compartimento")."""
from tiled_comun import Mapa

m = Mapa(23, 12)
m.sala(1, 20, 4, 9)          # la sala: x 64–1344, y 256–640

m.objeto('inicio', 'inicio', 170, 560)

# Muebles (huella: x, y, ancho, profundidad; alto = cara dibujada)
m.mueble('reloj', 640, 256, 96, 48, 150, 'reloj', corta_luz=True)
m.mueble('archivos', 300, 256, 128, 40, 90, 'archivos')
m.mueble('archivador', 900, 256, 96, 40, 100, 'archivador', corta_luz=True)
m.mueble('escritorio', 860, 430, 192, 72, 50, 'escritorio')

# El suelo hueco junto al reloj: caminar sobre él es un suceso (sale una onda visible y un poco de polvo)
m.objeto('hueco', 'piso', 620, 312, 170, 100, ref='hueco')
# El compartimento bajo el reloj (se abre al cerrar el caso)
m.objeto('compartimento', 'fenomeno', 668, 312, 40, 28, efecto='compartimento')
m.objeto('pendulo', 'fenomeno', 664, 190, 48, 70, efecto='reloj')

# Las marcas frescas de los archivos movidos: solo se ven con la luz
m.objeto('marcas', 'revelable', 270, 330, 220, 70, ref='n6-marcas', dibujo='marcas-frescas')

# Lo que se usa con E (cerca, de frente y con luz)
m.objeto('reloj-usable', 'interactuable', 640, 256, 96, 48, ref='n6-mueble-reloj', accion='examinar', sobre='reloj', luz='640,305,96,8')
m.objeto('archivos-examinar', 'interactuable', 300, 256, 128, 40, ref='archivos', accion='examinar', sobre='archivos', luz='300,297,128,8')
m.objeto('archivos-ordenar', 'interactuable', 300, 256, 128, 40, ref='archivos', accion='ordenar', sobre='archivos', luz='300,297,128,8')
m.objeto('archivador-usable', 'interactuable', 900, 256, 96, 40, ref='n6-mueble-archivador', accion='examinar', sobre='archivador', luz='900,297,96,8')
m.objeto('libros', 'interactuable', 840, 540, 52, 40, ref='n6-mueble-libros', accion='examinar', dibujo='cuentas')
m.objeto('pluma', 'interactuable', 1000, 540, 52, 36, ref='n6-mueble-pluma', accion='examinar', dibujo='pluma')
m.objeto('cartas', 'interactuable', 1230, 430, 56, 40, ref='n6-pista-compradores', accion='recoger', dibujo='cartas')
m.objeto('pilas', 'interactuable', 1236, 560, 48, 36, ref='bateria', accion='recoger', dibujo='pilas')

m.guardar('assets/mapas/nivel6.json')
