"""Corta una hoja de expresiones (3 columnas x 2 filas, fondo transparente) en los seis retratos de 360x480 que usa el juego.

    python herramientas/cortar_hoja_de_retratos.py "ruta/a/la/hoja.png"

Orden de la hoja (de izquierda a derecha, de arriba abajo):
    neutral, pensativo, sonrisa_ironica / sorprendido, serio, satisfecho
Guarda los PNG en assets/retratos/inspector/. Después hay que correr: node herramientas/listar_retratos.mjs

Cada figura se escala para que el sombrero quede cerca del borde de arriba (como el retrato dibujado) y el cuerpo llegue al borde de abajo;
si la figura es más ancha que el recuadro, se recortan un poco los hombros por igual a los dos lados."""
import os
import sys
from PIL import Image

ORDEN = ['neutral', 'pensativo', 'sonrisa_ironica', 'sorprendido', 'serio', 'satisfecho']
ANCHO, ALTO = 360, 480
MARGEN_ARRIBA = 60          # espacio libre sobre el sombrero, en píxeles del retrato final

hoja = Image.open(sys.argv[1]).convert('RGBA')
columnas, filas = 3, 2
cw, ch = hoja.width // columnas, hoja.height // filas
destino = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets', 'retratos', 'inspector')

for i, nombre in enumerate(ORDEN):
    x0, y0 = (i % columnas) * cw, (i // columnas) * ch
    celda = hoja.crop((x0, y0, x0 + cw, y0 + ch))
    caja = celda.getchannel('A').point(lambda a: 255 if a > 16 else 0).getbbox()
    if not caja:
        sys.exit(f'{nombre}: la celda está vacía')
    izq, arriba, der, abajo = caja
    figura = celda.crop((0, arriba, cw, ch))                 # desde el sombrero hasta el borde de abajo de la celda
    escala = (ALTO - MARGEN_ARRIBA) / figura.height
    ancho_visible = round(ANCHO / escala)
    centro = (izq + der) // 2
    a = max(0, min(cw - ancho_visible, centro - ancho_visible // 2)) if ancho_visible <= cw else (cw - ancho_visible) // 2
    figura = figura.crop((a, 0, a + ancho_visible, figura.height))
    figura = figura.resize((ANCHO, ALTO - MARGEN_ARRIBA), Image.LANCZOS)
    retrato = Image.new('RGBA', (ANCHO, ALTO), (0, 0, 0, 0))
    retrato.paste(figura, (0, MARGEN_ARRIBA), figura)
    retrato.save(os.path.join(destino, f'{nombre}.png'))
    print(f'{nombre}.png  (figura {der - izq}x{ch - arriba} px en la hoja, escala {escala:.3f})')
