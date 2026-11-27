# Retrato del inspector (arte final)

Hoy el retrato se dibuja por código (`src/presentacion/Retrato.js`). Es **provisional**.

## Cómo poner el arte final
1. Un PNG por expresión, con estos nombres exactos, en esta carpeta:
   `neutral.png`, `pensativo.png`, `sonrisa_ironica.png`, `sorprendido.png`, `serio.png`, `satisfecho.png`
2. Anotarlos: `node herramientas/listar_retratos.mjs` (escribe `disponibles.json`).
3. Listo: no se toca código. Las expresiones que falten siguen saliendo dibujadas.

La lista hace falta porque una página no puede saber qué archivos hay en el servidor sin pedirlos, y pedir uno que no existe deja un error en la
consola. Las pruebas (`pruebas/expresiones.test.mjs`) fallan si hay un PNG sin anotar.

## Tamaño y composición
- **360 × 480 px** exactos, PNG con fondo transparente.
- Medio cuerpo. El borde de abajo de la imagen es el borde de abajo de la pantalla: el cuerpo debe llegar hasta él (no dejar margen).
- La caja de texto va **al lado**, no encima: se puede usar todo el recuadro. La imagen puede mostrarse a la izquierda (normal) o a la derecha
  (si ahí están las tarjetas), sin voltearse.
- Se ve sobre la habitación oscurecida: conviene un borde o una luz de contorno que lo separe del fondo.

## Capas del arte provisional (como referencia para el final)
De abajo arriba. En coordenadas de la imagen de 360 × 480:

| Capa | Qué es | Zona aproximada (x, y) | ¿Cambia con la expresión? |
|---|---|---|---|
| cuerpo | gabardina, solapas, camisa, corbata, botones | 18–342, 292–480 | no |
| cabeza | cuello, orejas, cara, patillas, nariz | 98–262, 100–318 | no |
| ojos y cejas | ojos, párpados, cejas | 128–232, 143–192 | **sí** |
| boca | bigote y boca | 150–210, 236–278 | **sí** |
| sombrero | copa, cinta y ala | 66–294, 46–144 | no |

El arte final puede entregarse ya compuesto (un PNG por expresión).

## Las seis expresiones
`neutral`, `pensativo`, `sonrisa_ironica`, `sorprendido`, `serio`, `satisfecho`. Qué línea usa cada una está en `assets/presentacion/expresiones.json`.
