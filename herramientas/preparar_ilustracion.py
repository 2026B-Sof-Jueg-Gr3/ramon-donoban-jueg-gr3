"""Prepara una ilustración de escena (un personaje de cuerpo entero o medio cuerpo) para el juego.

    python herramientas/preparar_ilustracion.py "ruta/a/la/imagen.png" nombre [alto]

Si la imagen trae el fondo de cuadritos "pegado" (un PNG sin transparencia real, con el tablero gris y blanco dibujado), se lo quita:
se rellena desde los bordes todo lo que sea gris muy claro o blanco y sin color. Lo que queda encerrado por el dibujo (una camisa
gris, por ejemplo) no se toca porque no está conectado con el borde. Recorta lo vacío, escala al alto pedido (600 por defecto) y
guarda assets/ilustraciones/<nombre>.png. Después se anota en assets/ilustraciones/lista.json con qué línea sale."""
import os
import sys
from collections import deque
from PIL import Image, ImageFilter

origen, nombre = sys.argv[1], sys.argv[2]
alto = int(sys.argv[3]) if len(sys.argv) > 3 else 600
im = Image.open(origen).convert('RGBA')
w, h = im.size
px = im.load()


def es_fondo(p):
    r, g, b, a = p
    return a < 16 or (min(r, g, b) >= 195 and max(r, g, b) - min(r, g, b) <= 10)


ya_transparente = sum(1 for x in range(w) for y in (0, h - 1) if px[x, y][3] < 16) > w // 2
if not ya_transparente:
    fondo = bytearray(w * h)
    cola = deque()
    for x in range(w):
        cola.extend([(x, 0), (x, h - 1)])
    for y in range(h):
        cola.extend([(0, y), (w - 1, y)])
    while cola:
        x, y = cola.popleft()
        i = y * w + x
        if fondo[i] or not es_fondo(px[x, y]):
            continue
        fondo[i] = 1
        if x > 0: cola.append((x - 1, y))
        if x < w - 1: cola.append((x + 1, y))
        if y > 0: cola.append((x, y - 1))
        if y < h - 1: cola.append((x, y + 1))
    # Huecos encerrados por el dibujo (entre mechones de pelo, entre el brazo y el abrigo) que también son tablero: se reconocen
    # porque mezclan casillas blancas y grises en buena cantidad. El blanco de los ojos o un brillo no tiene casillas grises.
    for y0 in range(h):
        for x0 in range(w):
            if fondo[y0 * w + x0] or not es_fondo(px[x0, y0]):
                continue
            componente, pila = [], [(x0, y0)]
            fondo[y0 * w + x0] = 2
            while pila:
                x, y = pila.pop()
                componente.append((x, y))
                for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
                    if 0 <= nx < w and 0 <= ny < h and not fondo[ny * w + nx] and es_fondo(px[nx, ny]):
                        fondo[ny * w + nx] = 2
                        pila.append((nx, ny))
            blancas = sum(1 for x, y in componente if min(px[x, y][:3]) >= 245)
            grises = sum(1 for x, y in componente if 205 <= px[x, y][0] <= 222)
            n = len(componente)
            es_tablero = n >= 150 and blancas >= 0.15 * n and grises >= 0.15 * n
            for x, y in componente:
                fondo[y * w + x] = 1 if es_tablero else 3
    mascara = Image.frombytes('L', (w, h), bytes(0 if f == 1 else 255 for f in fondo))
    # Un borde de un píxel suavizado, para que el contorno no quede dentado sobre el fondo oscuro del juego
    mascara = mascara.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.8))
    im.putalpha(mascara)

caja = im.getchannel('A').point(lambda a: 255 if a > 16 else 0).getbbox()
im = im.crop(caja)
escala = alto / im.height
im = im.resize((round(im.width * escala), alto), Image.LANCZOS)
destino = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets', 'ilustraciones')
os.makedirs(destino, exist_ok=True)
im.save(os.path.join(destino, f'{nombre}.png'))
print(f'{nombre}.png  {im.width}x{im.height}  (fondo quitado: {"no, ya era transparente" if ya_transparente else "sí"})')
