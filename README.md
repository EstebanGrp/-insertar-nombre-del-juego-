# UMBRAFORGE

Metroidvania 2D de exploración, combate y reconstrucción en un mundo mecánico fracturado. Recupera señales, repara a tu compañero y abre rutas ocultas a través de seis capítulos.

El juego usa JavaScript con Phaser para la jugabilidad 2D y Three.js para la profundidad ambiental 3D, Java para validar la campaña y Python para auditar recursos y presupuestos. El núcleo procedural está preparado para migrar tareas pesadas a C++/WebAssembly cuando el proyecto disponga de Emscripten. En calidad baja la capa de profundidad reduce su frecuencia de dibujo automáticamente.

El menú carga primero y difiere el motor hasta iniciar una partida. La capa Three.js se descarga de forma independiente sólo en calidad media/alta; el perfil automático reduce partículas, distancia de actualización y resolución 3D cuando detecta carga sostenida.

## Ejecutar

```bash
npm install
npm run dev
```

Producción: `npm run build` y después `npm run play`.

El servidor local comprime texto y aplica caché inmutable a los recursos versionados. Para iniciarlo sin abrir el navegador automáticamente en Windows, usa `$env:UMBRAFORGE_NO_OPEN=1; npm run play`.

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
