"""Nivel 3: LA PUERTA CON CANDADO (rastreo y acceso). Un pasillo del ala oeste con polvo por todas partes.
Lo que hay: el camino limpio que alguien recorre a diario (solo se ve con la linterna), una zona de polvo intacto para compararlo, las cajas que
bloqueaban el paso, la caja junto a la puerta (con huellas debajo), las tablas que crujen, la puerta con el candado nuevo, la puerta tapiada, el
llavero, la caja de herramientas, el barril y, detrás de un ladrillo suelto (el rincón del sur), la carta, la llave y las pilas."""
from tiled_comun import Mapa

m = Mapa(24, 12)
m.sala(1, 22, 4, 8)         # el pasillo: x 64–1472, y 256–576
m.sala(19, 21, 9, 9)        # el rincón del ladrillo suelto: x 1216–1408, y 576–640

m.objeto('inicio', 'inicio', 150, 540)

# Muebles (huella: x, y, ancho, profundidad; alto = cara dibujada)
m.mueble('cajas', 560, 256, 128, 64, 96, 'cajas', corta_luz=True)
m.mueble('banco', 960, 256, 128, 48, 56, 'banco')
m.mueble('barril', 1130, 256, 64, 64, 60, 'barril')
m.mueble('caja-puerta', 1230, 288, 96, 64, 64, 'cajas')

# Lo que se descubre con la luz (suelo): el polvo intacto, el camino limpio y las tablas que crujen
m.objeto('intacto', 'revelable', 300, 440, 240, 90, ref='n3-intacto', dibujo='polvo-intacto')
m.objeto('camino', 'revelable', 860, 392, 600, 56, ref='n3-camino', dibujo='camino-limpio', accion='examinar')
m.objeto('tablas-vista', 'revelable', 880, 470, 200, 90, ref='n3-tablas', dibujo='tablas')
m.objeto('tablas', 'piso', 880, 470, 200, 90, ref='tablas')

# El candado brilla bajo la luz
m.objeto('candado', 'fenomeno', 1380, 214, 24, 24, efecto='candado')

# Lo que se usa con E (cerca, de frente y con luz). sobre = se usa desde ese mueble · mira = punto al que hay que mirar · luz = lo que tiene que tocar la luz
m.objeto('examinar-cajas', 'interactuable', 560, 256, 128, 64, ref='cajas', accion='examinar', sobre='cajas', luz='560,321,128,8')
m.objeto('mirar-debajo-caja', 'interactuable', 1230, 288, 96, 64, ref='caja-puerta', accion='mirar-debajo', sobre='caja-puerta', luz='1230,353,96,8')
m.objeto('tapiada', 'interactuable', 300, 150, 96, 108, ref='n3-mueble-puerta', accion='examinar', dibujo='tapiada', enPared=True, luz='300,257,96,8')
m.objeto('llavero', 'interactuable', 800, 188, 64, 70, ref='n3-mueble-llavero', accion='examinar', dibujo='llavero', enPared=True, luz='800,257,64,8')
m.objeto('herramientas', 'interactuable', 990, 214, 64, 40, ref='n3-mueble-herramientas', accion='examinar', dibujo='herramientas', sobre='banco', mira='1022,234', luz='960,305,128,8')
m.objeto('barril-usable', 'interactuable', 1130, 256, 64, 64, ref='n3-mueble-barril', accion='examinar', sobre='barril', luz='1130,321,64,8')
m.objeto('puerta-candado', 'interactuable', 1344, 150, 96, 108, ref='puerta-candado', accion='abrir', dibujo='puerta-candado', enPared=True, luz='1344,257,96,8')

# La carta, la llave y las pilas, detrás del ladrillo suelto
m.objeto('carta', 'interactuable', 1230, 590, 40, 30, ref='n3-pista-carta', accion='recoger', dibujo='carta')
m.objeto('llave', 'interactuable', 1290, 590, 40, 30, ref='n3-pista-llave', accion='recoger', dibujo='llave')
m.objeto('pilas', 'interactuable', 1340, 594, 48, 36, ref='bateria', accion='recoger', dibujo='pilas')

m.guardar('assets/mapas/nivel3.json')
