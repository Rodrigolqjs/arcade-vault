# Adaptación móvil

> Registro de mobile-porter: qué juegos y páginas se ven y se usan bien en el navegador del móvil. Viewports: s 360×740 · p 390×844 · l 844×390 · tp 820×1180 · tl 1180×820 · d 1440×900.
> Última actualización: 2026-11-10 · ranaria (más arreglos comunes de nav, tira del CRT y GameOverModal)

## Juegos

| Juego           | press/release | Mando                 | Textos táctiles | Vertical (s/p/tp) | Horizontal (l/tl) | Escritorio | Estado      | Actualizado |
| --------------- | ------------- | --------------------- | --------------- | ----------------- | ----------------- | ---------- | ----------- | ----------- |
| `rocas`         |               |                       |                 |                   |                   |            | sin revisar |             |
| `caida`         |               |                       |                 |                   |                   |            | sin revisar |             |
| `serpentina`    |               |                       |                 |                   |                   |            | sin revisar |             |
| `bloque-buster` |               |                       |                 |                   |                   |            | sin revisar |             |
| `ranaria`       | ✅ cumple     | ✅ cruz ▲▼◀▶, sin a/b | ✅ cumple       | ✅ ✅ ✅          | ✅ ✅             | ✅ igual   | implementada | 2026-11-10  |

## Páginas

| Ruta                            | s   | p   | l   | tp  | tl  | d   | Estado      | Archivos | Actualizado |
| ------------------------------- | --- | --- | --- | --- | --- | --- | ----------- | -------- | ----------- |
| `/`                             |     |     |     |     |     |     | sin revisar |          |             |
| `/biblioteca`                   |     |     |     |     |     |     | sin revisar |          |             |
| `/juegos/[id]`                  |     |     |     |     |     |     | sin revisar |          |             |
| `/juegos/[id]/jugar` (simulado) |     |     |     |     |     |     | sin revisar |          |             |
| `/salon`                        |     |     |     |     |     |     | sin revisar |          |             |
| `/acerca`                       |     |     |     |     |     |     | sin revisar |          |             |
| `/login`                        |     |     |     |     |     |     | sin revisar |          |             |

## Detalle

### ranaria

- Medidas antes:
  - Motor y player correctos por código: `press(code)` → `keyDown(code, false)`, el mismo camino que `keydown`, con las mismas guardas (`playing`, loop en marcha, sin respawn y sin autorepeat). `release` no hace nada porque el salto no tiene lógica de keyup. `PAD` = ▲▼◀▶ con `ArrowUp/Down/Left/Right`, sin `repeat`, `active={phase === "playing"}`, "TOCA PARA EMPEZAR_", `.keys` oculto y "TOCA REANUDAR PARA CONTINUAR".
  - Mando: 56×56 en s/p y 60×60 en l/tp/tl. `aria-label` en español y foco visible amarillo. Pad vacío en d.
  - Encaje con la partida empezada (CRT, mando; todo dentro de 0..W × 0..H): s CRT 16–329 × 222–519 y mando hasta y=715 de 740. p hasta 771 de 844. l CRT 72–384 de 390 y cruz 138–318. tp CRT hasta 855, mando hasta 1065 de 1180. tl CRT 109–777 de 820. `overflow` −15 (sin scroll horizontal) en los seis viewports.
  - HUD con 5 casillas a 360 px: dos filas (Jugador · Puntuación / Vidas · Nivel · Tiempo), borde derecho en 262 de 360, sin desbordar. Botones del HUD de 44 px en táctil.
  - `touch-action: none` y `user-select: none` en `.crt` y `.touch-pad`, y `-webkit-touch-callout: none` en el CSS. Chromium no expone esa propiedad, así que no se pudo leer computada.
  - Nada pegado (CDP `Input.dispatchTouchEvent`): con un dedo en ▲, un segundo dedo sobre PAUSA pausa la partida (`pointerup` no principal), el mando suelta el botón (`data-pressed` 0) y se desactiva, y al reanudar no hay saltos solos (la puntuación sigue en 20).
  - Fallos comunes, no propios de ranaria:
    - `sticking`: `aside.av-mobile-panel` +295/+305 px en los seis viewports (panel cerrado fuera de pantalla, enlaces enfocables).
    - `small`: `a.logo` 199×28 (173×36 en tl) y la hamburguesa 50×41 en s/p/l/tp.
    - Tira `.crt-bottom` partida en 2–3 líneas en s/p/l. Con eso el CRT en l llegaba a y=384 de 390.
    - `GameOverModal`: input de 14 px (zoom de iOS al enfocar). En l el modal mide 418 px de alto para un viewport de 390, y 234 con el teclado: la parte de arriba (top −92) quedaba cortada sin scroll. JUGAR DE NUEVO y VOLVER AL VAULT medían 41 px de alto.
- Arreglos (todos en `app/globals.css`, ninguno toca ranaria ni jugabilidad):
  - `@media (pointer: coarse)` nuevo tras el corte de 960 px: `.av-nav .logo` con `padding-block: 8px; margin-block: -8px` y `.av-nav .hamburger` con `min-width/min-height: 44px; margin-block: -1.5px`. El área táctil crece y la barra sigue en 66 px, que es lo que asume la fórmula del CRT en horizontal.
  - `.av-mobile-panel` (global, invisible en d porque ya estaba fuera de pantalla): cerrado lleva `visibility: hidden`, con la transición de `visibility` retrasada 220 ms tras el deslizamiento; abierto, `visible`.
  - Bloque `(pointer: coarse)` existente del CRT: `.crt-bottom` en una línea (`nowrap`), con el título (`span:nth-child(2)`) en elipsis.
  - `@media (pointer: coarse)` nuevo junto al modal: `.modal-bd { overflow-y: auto; overscroll-behavior: contain }`, `.modal { margin: auto }`, input a 16 px y `.modal .actions .btn { min-height: 44px }`.
- Medidas después:
  - `sticking` vacío y `small` vacío en s/p/l/tp/tl. En d, `small` es igual que antes (informativo).
  - CRT: s 234–507, p 274–569, l 78–378 de 390, tp 249–855 y tl 109–777. Todo el mando dentro en los cinco viewports táctiles. Tira del CRT de 12 px (una línea).
  - Modal en táctil: input de 16 px, botones de 56/44/44 px. En l y l60 empieza en top 20 y se puede desplazar hasta el final (bottom 370 de 390 y 214 de 234).
  - d: nav, HUD, CRT (187,193,1239,1020) y modal (input de 14 px, botones de 41 px, `overflow` visible) idénticos a antes.
- Notas:
  - `span.skin-panel-hint` mide 12 px de texto mientras se juega. Es del panel de skins (`.skin-*`, de skin-designer) y no se tocó.
  - En l, con la partida empezada, el HUD queda por encima de la navegación (−73..60). Para pausar hay que hacer scroll tocando fuera del CRT y del mando, igual que en los otros juegos (diseño de la spec 11).
  - Las capturas de antes y después están en `.playwright-mcp/mp/` (git-ignored).

## Preguntas abiertas

- ranaria · La cruz del mando junta sus brazos en diagonal (▲ y ◀ se tocan en una esquina, 0 px), mientras que la regla dice ≥ 8 px entre botones. Lo dejé así porque es la pieza única de la spec 11, que ya comparte serpentina, y porque meter 8 px de hueco en `.touch-dpad.is-cross` haría que caida (cruz + A/B) no cupiera a 360 px. En ranaria, un toque en la esquina que salte hacia el lado equivocado puede costar una vida. Si se nota en un móvil real, la alternativa es un hueco de 4–8 px solo en la cruz y solo a partir de 421 px.
- ranaria · `.skin-panel-hint` de 12 px en táctil (criterio de texto ≥ 14 px). Es del panel de skins: lo decide skin-designer o el usuario.
- común · Los arreglos del modal y de la tira del CRT solo se aplican con `(pointer: coarse)`, para no cambiar el escritorio. En una ventana de escritorio muy baja el modal sigue sin scroll.
