# UMBRAFORGE

Metroidvania 2D de exploración, combate y reconstrucción en un mundo mecánico fracturado. Recupera señales, repara a tu compañero y abre rutas ocultas a través de seis capítulos.

El juego usa JavaScript con Phaser para la jugabilidad 2D y Three.js para la profundidad ambiental 3D, Java para validar la campaña y Python para auditar recursos y presupuestos. El núcleo procedural está preparado para migrar tareas pesadas a C++/WebAssembly cuando el proyecto disponga de Emscripten. En calidad baja la capa de profundidad reduce su frecuencia de dibujo automáticamente.

## Ejecutar

```bash
npm install
npm run dev
```

Producción: `npm run build` y después `npm run play`.

Validación completa multilenguaje: `npm run verify`.

## Controles

- `A/D` o flechas: mover
- `Espacio/W/↑`: saltar y doble salto
- `Shift`: dash
- `J/F/K` o clic: atacar
- `E`: interactuar
- `Q`: extraer un bloque de eco
- `R`: colocar un bloque de eco
- `Esc`: pausa
