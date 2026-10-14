# ramon-donoban-jueg-gr3

Adaptación a JavaScript con Phaser 3 del juego de escritorio [Sokoban_In_JAVA](https://github.com/DonobanR/Sokoban_In_JAVA). El proyecto no crea un juego nuevo: lleva el original de Java/Swing al navegador. Conserva sus niveles, sus recursos gráficos y su diseño orientado a objetos.

## Estructura

```
├── index.html            Página de entrada; carga Phaser desde CDN
├── assets/
│   ├── img/              Imágenes del juego original
│   └── niveles/          nivel1.txt … nivel6.txt (mismo formato que el original)
└── src/
    ├── main.js           Configura Phaser y registra las escenas (equivale a Main.java)
    ├── modelo/           Lógica del juego, sin dependencias de Phaser (paquete com.company)
    │   ├── Bloque.js     Clase abstracta; Pared, Suelo, PuntoDeLlegada y Caja la extienden
    │   ├── Escenario.js  Lee el archivo de nivel y arma la matriz de bloques
    │   ├── Personaje.js  Movimiento y empuje de cajas
    │   ├── Nivel.js      Une escenario y personaje; lleva movimientos y deshacer
    │   └── Direccion.js  Direcciones de movimiento
    ├── escenas/          Pantallas del juego (paquete Interfaces)
    │   ├── Carga.js      Precarga de recursos
    │   ├── MenuPrincipal.js
    │   ├── MenuNiveles.js
    │   ├── VentanaDeJuego.js
    │   └── utilidades.js Escalado y centrado según el tamaño de la ventana
    └── ui/
        ├── Boton.js      Botón reutilizable
        └── Progreso.js   Niveles completados (localStorage)
```

## Ejecución

Usa módulos ES, así que necesita un servidor local, por ejemplo Live Server en VS Code. Abrir `index.html` directamente no funciona.

**Controles:** flechas o WASD para mover, Z para deshacer, R para reiniciar y ESC para volver a niveles.
