# UMBRAFORGE

Metroidvania 2D de exploración, combate y reconstrucción en un mundo mecánico fracturado. Recupera señales, repara a tu compañero y abre rutas ocultas a través de seis capítulos.

El juego usa JavaScript/Phaser para el cliente, Java para validar la campaña y Python para auditar recursos y presupuestos. El núcleo procedural está preparado para migrar tareas pesadas a C++/WebAssembly cuando el proyecto disponga de Emscripten.

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
