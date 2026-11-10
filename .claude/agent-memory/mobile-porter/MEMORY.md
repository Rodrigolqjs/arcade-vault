# mobile-porter — índice

- `findings.md`: no se creó; el harness bloqueó escribirlo el 2026-11-10. Los hallazgos por juego o ruta están en `reference/mobile-audit.md` (Detalle y Preguntas abiertas).

## Preferencias del usuario

- 2026-11-10: implementar los arreglos móviles directamente en código, sin specs ni commits (excepción al flujo spec-driven, como las skins).
- 2026-11-10: sin PWA; "app móvil" = la web en el navegador del móvil.
- 2026-11-10: alcance = juegos jugables (criterios de `specs/11-controles-tactiles.md`) + todas las páginas; el escritorio no debe cambiar.
- 2026-11-10: si hay un `next dev` del usuario, se reutiliza y no se para; el build queda pendiente.

## Umbrales acordados

- Mando ≥ 56×56 y ≥ 8 px entre botones; controles ≥ 44 px (inline ≥ 24); inputs ≥ 16 px; texto ≥ 14 px en táctil.

## Decisiones clave

- 2026-11-10: la nav debe seguir en 66 px de alto en táctil (fórmula del CRT en horizontal). Áreas táctiles = padding + margen negativo.
- 2026-11-10: la cruz del d-pad se trata como una pieza (brazos juntos en diagonal); el hueco de 8 px queda como pregunta abierta.
- 2026-11-10: modal y tira del CRT, arreglados solo bajo `(pointer: coarse)`, para no cambiar el escritorio.

## Notas de método

- Playwright MCP solo carga archivos de script desde el repo o `.playwright-mcp/` (git-ignored). Borra los `.js` al terminar, porque `npm run lint` los escanea.
- Los `PointerEvent` sintéticos no sirven con `setPointerCapture`. Usa CDP `Input.dispatchTouchEvent`; para levantar solo un dedo, manda `touchEnd` con ese punto.
- Abre páginas propias con `ctx.newPage()`: el usuario puede estar usando la pestaña principal.
