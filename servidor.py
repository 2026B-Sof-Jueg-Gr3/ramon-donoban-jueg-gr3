"""Servidor local para probar el juego: python servidor.py  ->  http://localhost:8787

A diferencia de `python -m http.server`, le indica al navegador que no guarde los archivos
en caché, así cada recarga usa la versión actual de los .js y de los niveles.
"""
import http.server
import os

PUERTO = 8787


class SinCache(http.server.SimpleHTTPRequestHandler):
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map, '.js': 'text/javascript'}

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()


if __name__ == '__main__':
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    print(f'Juego disponible en http://localhost:{PUERTO}')
    http.server.ThreadingHTTPServer(('', PUERTO), SinCache).serve_forever()
