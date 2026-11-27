"""Nivel 4: EL CUARTO DE LOS JUGUETES (experimentación). El cuarto de los niños con hilos casi invisibles que unen los juguetes con la trampilla
del techo (solo brillan con la linterna), la caja de juguetes con un hilo enganchado, el caballito, las muñecas alineadas mirando a la puerta, el oso,
la bobina, la página del diario, el tren con las pilas y la ventana exterior por donde cruza la silueta."""
from tiled_comun import Mapa

m = Mapa(23, 12)
m.sala(1, 20, 4, 9)          # el cuarto: x 64–1344, y 256–640

m.objeto('inicio', 'inicio', 150, 600)

# Muebles (huella: x, y, ancho, profundidad; alto = cara dibujada)
m.mueble('caja-juguetes', 200, 256, 128, 64, 70, 'juguetero')
m.mueble('oso', 800, 256, 96, 56, 70, 'oso')
m.mueble('caballito', 940, 420, 96, 64, 80, 'caballito')
m.mueble('munecas', 420, 500, 192, 48, 50, 'munecas')
m.mueble('tren', 1100, 500, 96, 40, 36, 'tren')

# La ventana exterior, en el muro norte (la silueta cruza frente a ella al final)
m.objeto('ventana', 'ventana', 1120, 162, 64, 76, rota=False)

# Los hilos: casi invisibles, solo se ven cuando la linterna los toca. Cada uno sale de un juguete y sube hasta la trampilla del techo.
m.objeto('hilo-caja', 'revelable', 338, 292, 80, 18, ref='n4-hilo-caja', dibujo='hilo')
m.objeto('hilo-caballito', 'revelable', 850, 450, 80, 18, ref='hilo-caballito', dibujo='hilo', accion='tirar')
m.objeto('hilo-munecas', 'revelable', 330, 520, 80, 18, ref='hilo-munecas', dibujo='hilo', accion='cortar')
m.objeto('hilo-oso', 'revelable', 712, 285, 80, 18, ref='hilo-oso', dibujo='hilo', accion='cortar')

# Lo que se usa con E (cerca, de frente y con luz)
m.objeto('trampilla', 'interactuable', 640, 150, 96, 108, ref='trampilla', accion='examinar', dibujo='trampilla', enPared=True, luz='640,257,96,8')
m.objeto('examinar-caja', 'interactuable', 200, 256, 128, 64, ref='caja-juguetes', accion='examinar', sobre='caja-juguetes', luz='200,321,128,8')
m.objeto('examinar-oso', 'interactuable', 800, 256, 96, 56, ref='n4-mueble-oso', accion='examinar', sobre='oso', luz='800,313,96,8')
m.objeto('examinar-caballito', 'interactuable', 940, 420, 96, 64, ref='n4-mueble-caballito', accion='examinar', sobre='caballito', luz='940,485,96,8')
m.objeto('examinar-munecas', 'interactuable', 420, 500, 192, 48, ref='n4-mueble-munecas', accion='examinar', sobre='munecas', luz='420,549,192,8')
m.objeto('pilas', 'interactuable', 1124, 466, 48, 36, ref='bateria', accion='recoger', dibujo='pilas', sobre='tren', mira='1148,484', luz='1100,541,96,8')
m.objeto('bobina', 'interactuable', 300, 580, 44, 44, ref='n4-pista-hilo', accion='recoger', dibujo='bobina')
m.objeto('diario', 'interactuable', 1250, 570, 52, 38, ref='n4-pista-diario', accion='recoger', dibujo='diario')

m.guardar('assets/mapas/nivel4.json')
