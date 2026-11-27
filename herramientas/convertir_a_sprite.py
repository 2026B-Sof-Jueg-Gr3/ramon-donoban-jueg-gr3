"""Convierte el JPG ampliado del inspector (fondo blanco) en el PNG de 36x58 con fondo transparente que usa el juego.
Toma el color del centro de cada celda de la rejilla original (36x58) para evitar los artefactos del JPG."""
import sys
from PIL import Image

origen, destino, ancho, alto = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4])
im = Image.open(origen).convert('RGB')
W, H = im.size
cw, ch = W / ancho, H / alto
salida = Image.new('RGBA', (ancho, alto), (0, 0, 0, 0))
for y in range(alto):
    for x in range(ancho):
        # mediana de un parche 5x5 en el centro de la celda
        cx, cy = int((x + 0.5) * cw), int((y + 0.5) * ch)
        px = sorted(im.getpixel((min(W - 1, max(0, cx + dx)), min(H - 1, max(0, cy + dy))))
                    for dx in range(-2, 3) for dy in range(-2, 3))
        r, g, b = px[len(px) // 2]
        if min(r, g, b) > 185 and max(r, g, b) - min(r, g, b) < 25:      # fondo blanco -> transparente
            continue
        salida.putpixel((x, y), (r, g, b, 255))
salida.save(destino)
for k in (4, 8):
    salida.resize((ancho * k, alto * k), Image.NEAREST).save(destino.replace('.png', f'_x{k}.png'))
print('ok', salida.size)
