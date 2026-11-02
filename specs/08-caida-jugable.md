# SPEC 08 — Tetris jugable en CAÍDA

> **Estado:** implementada
> **Depende de:** SPEC 05, SPEC 06, SPEC 07
> **Fecha:** 2026-11-02
> **Objetivo:** Portar a TypeScript el juego de `reference/resources/started-games/03-tetris/` y montarlo en `/juegos/caida/jugar` con el HUD, la pausa, el modal de fin de juego y el leaderboard real de la plataforma.

## Por qué existe esta spec

`caida` es hoy un juego simulado. El original es un `game.js` de 332 líneas, sin dependencias y con todo en globals. Usa un canvas de 300×600 (10×20 celdas de 30 px), un segundo canvas de 120×120 para la pieza siguiente y un panel DOM con SCORE, LINES, LEVEL y los controles. Tiene un overlay propio de PAUSA y GAME OVER, un botón Reiniciar, un toggle de tema claro/oscuro guardado en `localStorage` y un listener de `keydown` en `document` que nunca se elimina.

La entrada `caida` del catálogo ("Encaja las piezas antes de que el techo te aplaste") ya describe este juego, y su texto `long` es fiel a las mecánicas. Para que viva en React hay que encapsularlo en un motor sin globals. Ese motor se crea y se destruye con el componente y avisa a React de la puntuación, las líneas, el nivel y el fin de partida.

El tablero es vertical (1:2) y la pantalla CRT es 4:3. El canvas usa una resolución lógica de 800×600, como Asteroides, con el pozo centrado y la pieza siguiente dibujada a su derecha. El Tetris no tiene vidas, así que `PlayerHud` aprende a mostrar "Líneas" en lugar de "Vidas".

## Alcance

**Dentro:**

- Migración `supabase/migrations/*_caida_jugable.sql`: `accepts_scores = true` para `caida`. El texto `long` no cambia.
- Motor en TypeScript en `lib/games/tetris/`, portado de `game.js` con la misma jugabilidad:
  - Tablero de 10 columnas × 20 filas.
  - 8 piezas con sorteo uniforme: I, O, T, S, Z, J, L y la "tuerca" (anillo 3×3 con hueco central).
  - Aparición en `x = floor(10 / 2) − floor(ancho / 2)`, `y = 0`.
  - Rotación horaria con _wall kicks_ `[0, −1, 1, −2, 2]`.
  - Caída automática cada `dropInterval` ms; la pieza se fija en cuanto no puede bajar, sin retardo de bloqueo.
  - Pieza fantasma con alfa 0,2.
  - Puntuación: líneas `[0, 100, 300, 500, 800] × nivel` (el nivel anterior a limpiar), _soft drop_ +1 por fila y _hard drop_ +2 por celda.
  - Nivel `floor(líneas / 10) + 1`; `dropInterval = max(100, 1000 − (nivel − 1) × 90)` ms.
  - Fin de partida cuando la pieza nueva colisiona al aparecer.
- Sin globals: todo el estado vive en la instancia creada por `createTetrisGame()`.
- El motor añade sus listeners de teclado al crearse y los elimina en `destroy()`, junto con el `requestAnimationFrame`.
- Paleta neón de la plataforma en el canvas:
  - I cian, O amarillo, T magenta y S verde, con los tokens de `app/globals.css`.
  - Z rojo neón, J azul neón, L naranja neón y tuerca color `--ink`, fijados en `COLORS`.
  - Glow (`shadowBlur`) solo en la pieza activa; bloques fijados, fantasma y rejilla sin glow.
- El canvas dibuja la rejilla tenue del pozo, su borde neón, los bloques, la pieza fantasma, la pieza activa y el panel SIGUIENTE a la derecha del pozo. No pinta puntuación, líneas, nivel, pausa, GAME OVER ni chuleta de controles.
- Canvas con resolución lógica 800×600, escalado por CSS al 100 % de `.crt-screen` y backing store × `devicePixelRatio`. El pozo de 300×600 ocupa `x = 250…550`.
- `components/PlayerHud.tsx`: prop opcional `lines?: number`. Si llega, la casilla "Vidas" se sustituye por "Líneas" con ese número. Asteroides y el simulado no la pasan y se ven igual.
- `components/games/TetrisPlayer.tsx`: HUD de la plataforma (Puntuación, Líneas, Nivel), CRT con el canvas, overlays y `GameOverModal` con `saveable`.
- Fases en React: `ready` → `playing` ⇄ `paused` → `over`, como en la SPEC 05. Arranque con Espacio o clic en el CRT, sin que esa pulsación haga _hard drop_.
- Controles: `←`/`→` mueven, `↓` _soft drop_, `↑` o `X` rotan, Espacio _hard drop_. `P` y `Escape` pausan. La repetición al mantener una tecla es el autorepeat del sistema (`keydown`), como en el original.
- `preventDefault` de flechas y Espacio fuera de `over` y nunca con el foco en `input`/`textarea`.
- Fin de partida: el tablero queda congelado y atenuado `GAMEOVER_DELAY` = 1 s sin aceptar input; después `onGameOver(score)`.
- Registro: `caida` en `PLAYABLE_GAME_IDS` y su entrada en `RealGamePlayer.tsx`.

**Fuera de alcance (para futuras specs):**

- Controles táctiles.
- Toggle de tema claro/oscuro y su clave `tetris-theme` en `localStorage`.
- Pausa y overlay PAUSA/GAME OVER propios del motor.
- Botón Reiniciar y panel DOM (SCORE, LINES, LEVEL, NEXT, controles).
- Rotación antihoraria, _hold_, bolsa de 7, retardo de bloqueo, DAS/ARR propios y cualquier mecánica que no esté en `game.js`.
- Animación de líneas o de fin de partida.
- Sonido y música.
- Cambiar el texto `long`, la portada o la página de detalle de `caida`.
- Framework de tests.

## Modelo de datos

Migración (`supabase/migrations/*_caida_jugable.sql`, timestamp generado por `npx supabase migration new caida_jugable`):

```sql
-- Tetris jugable (SPEC 08): caida acepta puntuaciones.
update public.games
  set accepts_scores = true
where id = 'caida';
```

API pública del motor (`lib/games/tetris/engine.ts`):

```ts
export interface HudState {
  score: number;
  lines: number;
  level: number;
}
export interface TetrisEvents {
  onHud: (hud: HudState) => void; // solo cuando cambia algún valor, no cada frame
  onGameOver: (score: number) => void; // GAMEOVER_DELAY después de que la pieza nueva colisione al aparecer
}
export interface TetrisGame {
  start: () => void; // tablero vacío, puntuación 0, líneas 0, nivel 1, dropInterval 1000; ignora la pulsación que arranca
  pause: () => void; // detiene el rAF
  resume: () => void; // reanuda sin salto de dt
  end: () => number; // detiene la partida (botón FIN) y devuelve la puntuación
  destroy: () => void; // cancela el rAF y elimina los listeners
}
export function createTetrisGame(
  canvas: HTMLCanvasElement,
  events: TetrisEvents,
): TetrisGame;
```

Estado interno (no exportado):

```ts
type EngineState = "ready" | "playing" | "dying" | "gameover";
// dying: tablero congelado y atenuado durante GAMEOVER_DELAY, sin input.
type Board = number[][]; // ROWS × COLS; 0 = vacío, 1–8 = índice de color
interface Piece {
  type: number; // 1–8
  shape: number[][];
  x: number;
  y: number;
}
```

Fase en React (`TetrisPlayer.tsx`):

```ts
type Phase = "ready" | "playing" | "paused" | "over";
```

Constantes (`lib/games/tetris/constants.ts`), con los valores de `game.js`:

```ts
export const W = 800;
export const H = 600;
export const COLS = 10;
export const ROWS = 20;
export const BLOCK = 30;
export const BOARD_X = 250; // (W − COLS × BLOCK) / 2
export const BOARD_Y = 0;
export const NEXT_X = 590; // panel SIGUIENTE, caja de 4 × BLOCK
export const NEXT_Y = 60;
export const PIECES = [
  null,
  [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ], // I
  [
    [2, 2],
    [2, 2],
  ], // O
  [
    [0, 3, 0],
    [3, 3, 3],
    [0, 0, 0],
  ], // T
  [
    [0, 4, 4],
    [4, 4, 0],
    [0, 0, 0],
  ], // S
  [
    [5, 5, 0],
    [0, 5, 5],
    [0, 0, 0],
  ], // Z
  [
    [6, 0, 0],
    [6, 6, 6],
    [0, 0, 0],
  ], // J
  [
    [0, 0, 7],
    [7, 7, 7],
    [0, 0, 0],
  ], // L
  [
    [8, 8, 8],
    [8, 0, 8],
    [8, 8, 8],
  ], // tuerca
];
export const KICKS = [0, -1, 1, -2, 2];
export const LINE_SCORES = [0, 100, 300, 500, 800];
export const SOFT_DROP_POINTS = 1; // por fila
export const HARD_DROP_POINTS = 2; // por celda
export const BASE_DROP_INTERVAL = 1000; // ms
export const MIN_DROP_INTERVAL = 100; // ms
export const DROP_STEP = 90; // ms menos por nivel
export const LINES_PER_LEVEL = 10;
export const GHOST_ALPHA = 0.2;
export const GAMEOVER_DELAY = 1; // s
// Copia los tokens de app/globals.css; el canvas no lee variables CSS.
export const PIECE_COLORS = [
  null,
  "#00f5ff", // I — --cyan
  "#f5ff00", // O — --yellow
  "#ff006e", // T — --magenta
  "#00ff88", // S — --green
  "#ff3b3b", // Z — rojo neón
  "#3d7bff", // J — azul neón
  "#ff9f1c", // L — naranja neón
  "#e6e9ff", // tuerca — --ink
];
export const COLORS = {
  grid: "rgba(74, 79, 112, 0.35)", // --ink-faint al 35 %
  well: "#ff006e", // --magenta, color de caida en el catálogo
  label: "#8a8fb5", // --ink-dim, rótulo SIGUIENTE
};
```

Los tres tonos derivados (`#ff3b3b`, `#3d7bff`, `#ff9f1c`) y los valores de `COLORS` se pueden afinar en el paso de aspecto con `/frontend-design`, sin cambiar qué pieza usa cada token.

`PlayerHud` (`components/PlayerHud.tsx`), prop nueva:

```ts
lines?: number; // si está definida, la casilla "Vidas" pasa a "Líneas" con este valor
```

## Estructura de archivos

```
app/
  globals.css                  # modificado: estilos de la casilla Líneas y ajustes del juego si /frontend-design los pide
components/
  PlayerHud.tsx                # modificado: prop opcional lines
  games/
    RealGamePlayer.tsx         # modificado: entrada caida
    TetrisPlayer.tsx           # nuevo ("use client"): fases, HUD, CRT, canvas, overlays, modal
lib/
  games/
    registry.ts                # modificado: caida en PLAYABLE_GAME_IDS
    tetris/
      constants.ts             # nuevo: dimensiones, PIECES, puntuación, velocidad, colores
      entities.ts              # nuevo: createBoard, randomPiece, rotateCW, collide, clearFullRows, drawBlock
      engine.ts                # nuevo: createTetrisGame()
  supabase/database.types.ts   # regenerado (sin cambios de tipos esperados)
supabase/migrations/
  *_caida_jugable.sql          # nuevo
CLAUDE.md                      # modificado: prop lines de PlayerHud
```

`reference/resources/started-games/03-tetris/` no se modifica ni se importa: es solo la fuente del port.

## Plan de implementación

Antes de escribir código, leer `node_modules/next/dist/docs/01-app/02-guides/lazy-loading.md` (`ssr: false` solo funciona dentro de Client Components), como exige `AGENTS.md`. Antes del paso 7 invocar `/frontend-design` para el aspecto del canvas, la casilla Líneas y el overlay de inicio, como exige `CLAUDE.md`.

1. **Migración.** `npx supabase migration new caida_jugable` y escribir el SQL del modelo de datos. Revisar el SQL con el usuario → `npx supabase db push --linked` → `npm run db:types`.
   Verificación: `npx supabase migration list --linked` la muestra en remoto; con la publishable key, insertar en `public.scores` para `caida` funciona y para `serpentina` sigue fallando; `npx tsc --noEmit` pasa.

2. **Casilla Líneas en `PlayerHud`.** Añadir la prop opcional `lines?: number`. Con `lines` definida, la tercera casilla muestra la etiqueta "Líneas" y el número; sin ella, "Vidas" con corazones como hasta ahora.
   Verificación: `/juegos/rocas/jugar` y `/juegos/bloque-buster/jugar` se ven igual que antes; `npx tsc --noEmit` y `npm run lint` pasan.

3. **Registro y player mínimo.** Añadir `caida` a `PLAYABLE_GAME_IDS` en `lib/games/registry.ts`, su entrada `dynamic(() => import("@/components/games/TetrisPlayer"), { ssr: false })` en `components/games/RealGamePlayer.tsx` y un `TetrisPlayer.tsx` mínimo: `PlayerHud` con puntuación 0, `lines` 0 y nivel 1, y el CRT con un `<canvas className="game-canvas">` negro.
   Verificación: `/juegos/caida/jugar` muestra el CRT vacío con el HUD "Puntuación · Líneas · Nivel"; `/juegos/rocas/jugar` y los simulados siguen igual; `npm run build` pasa.

4. **Constantes y entidades.** `lib/games/tetris/constants.ts` con los valores del modelo de datos. `lib/games/tetris/entities.ts` con funciones puras tipadas que reciben el tablero como parámetro: `createBoard()`, `randomPiece()` (copia la forma), `rotateCW(shape)`, `collide(board, shape, x, y)`, `clearFullRows(board)` (devuelve cuántas filas quitó) y `drawBlock(ctx, px, py, colorIndex, alpha)` con el brillo superior de 4 px de `rgba(255,255,255,0.12)` del original.
   Verificación: `npx tsc --noEmit` y `npm run lint` pasan.

5. **Motor (a): bucle, input y dibujo.** `lib/games/tetris/engine.ts` con `createTetrisGame(canvas, events)`:
   - Backing store `W × dpr` por `H × dpr` y `setTransform(dpr…)`.
   - Listeners `keydown`/`keyup` en `window`, añadidos al crear y eliminados en `destroy()`. Las acciones se aplican en el `keydown` y solo en estado `playing`. El motor no maneja `P` ni `Escape`.
   - Tras `start()`, Espacio se ignora hasta su primer `keyup` (la pulsación que arranca no hace _hard drop_, ni con autorepeat).
   - Bucle con `dt` limitado a 50 ms; `dropAccum` se pone a 0 al llegar a `dropInterval`, como el original. `resume()` reinicia `lastTime`.
   - Dibujo: fondo negro, rejilla, borde del pozo, bloques fijados, fantasma, pieza activa con glow y panel SIGUIENTE (rótulo y pieza centrada en una caja de 4 × `BLOCK`).
   - `start`, `pause`, `resume`, `end` y `destroy`. En este paso la pieza que no puede bajar se fija y aparece la siguiente, sin limpiar líneas ni puntuar.
     Verificación: `npx tsc --noEmit` pasa.

6. **Motor (b): líneas, puntuación, niveles y fin.** Limpiar líneas al fijar; sumar `LINE_SCORES[n] × nivel`, _soft drop_ +1 por fila y _hard drop_ +2 por celda; recalcular nivel y `dropInterval`. Si la pieza nueva colisiona al aparecer, pasar a `dying` (tablero congelado y atenuado, sin input) y llamar a `onGameOver(score)` tras `GAMEOVER_DELAY`. `onHud` solo cuando cambia `score`, `lines` o `level` (comparar con el último enviado).
   Verificación: `npx tsc --noEmit` y `npm run lint` pasan.

7. **Conectar el motor y aspecto** (tras `/frontend-design`). En `TetrisPlayer.tsx`, copiando el patrón de `AsteroidsPlayer.tsx`: instancia en `useEffect` y `destroy()` en el cleanup. Fase `ready` con overlay `.game-start`: título `CAÍDA`, "PULSA ESPACIO_" y las teclas `←` `→` mover, `↑` `X` rotar, `↓` bajar, `Espacio` caída. El clic en el CRT también arranca. HUD alimentado por `onHud` (`lines` a `PlayerHud`). Estilos nuevos en `app/globals.css`.
   Verificación: en `/juegos/caida/jugar` se juega una partida completa y el HUD refleja puntuación, líneas y nivel.

8. **Pausa.** Botón PAUSA/REANUDAR de `PlayerHud`, `P` y `Escape`, pausa automática con `visibilitychange` (`hidden`) y `blur`; overlay "EN PAUSA".
   Verificación: cambiar de pestaña deja el juego en pausa y la pieza no ha bajado al volver.

9. **Fin de partida y guardado.** `onGameOver` y el botón FIN pasan a `over` y abren `<GameOverModal gameId={game.id} saveable …>`; "JUGAR DE NUEVO" llama a `start()`. `preventDefault` de flechas y Espacio solo fuera de `over` y nunca con el foco en `input`/`textarea`.
   Verificación: tras perder se escriben iniciales con espacios, GUARDAR muestra el puesto y "VER SALÓN DE LA FAMA" lleva a `/salon?juego=caida` con la fila.

10. **Docs y cierre.** `CLAUDE.md`: mencionar la prop `lines` de `PlayerHud` para juegos sin vidas.
    Verificación: `npm run lint`, `npx tsc --noEmit` y `npm run build` sin errores.

## Criterios de aceptación

- [ ] `npm run build`, `npm run lint` y `npx tsc --noEmit` terminan sin errores.
- [ ] `npx supabase migration list --linked` muestra la migración `caida_jugable` aplicada en el remoto.
- [ ] Con la publishable key, insertar en `public.scores` para `caida` funciona.
- [ ] `get_advisors` de seguridad no muestra avisos nuevos.
- [ ] `/juegos/caida/jugar` muestra el canvas dentro del CRT con el overlay "PULSA ESPACIO_" y ninguna pieza cae hasta arrancar.
- [ ] Espacio o clic en el CRT arrancan la partida; esa pulsación de Espacio no hace _hard drop_, aunque se mantenga pulsada.
- [ ] `←`/`→` mueven una columna, `↑` y `X` rotan en sentido horario, `↓` baja una fila y Espacio deja caer la pieza hasta la fantasma.
- [ ] Una pieza pegada a la pared rota si alguno de los desplazamientos `0, −1, +1, −2, +2` deja sitio.
- [ ] Aparecen las 8 piezas, incluida la tuerca (anillo 3×3 con hueco).
- [ ] La pieza fantasma se ve en la posición de aterrizaje, semitransparente.
- [ ] El panel SIGUIENTE a la derecha del pozo muestra la pieza que aparece después.
- [ ] Limpiar 1, 2, 3 y 4 líneas en nivel 1 suma 100, 300, 500 y 800 puntos; en nivel 2 suma el doble.
- [ ] Cada fila de _soft drop_ suma 1 punto y cada celda de _hard drop_ suma 2.
- [ ] Al llegar a 10 líneas el nivel del HUD pasa a 02 y la caída se acelera a 910 ms; con 100 líneas o más la caída es de 100 ms.
- [ ] El HUD muestra Puntuación, Líneas y Nivel; no aparece la casilla Vidas.
- [ ] `/juegos/rocas/jugar` y los juegos simulados siguen mostrando la casilla Vidas con corazones.
- [ ] El canvas no pinta puntuación, líneas, nivel, pausa ni GAME OVER.
- [ ] Piezas I cian, O amarillo, T magenta, S verde, Z roja, J azul, L naranja y tuerca color ink; la pieza activa tiene glow y los bloques fijados no.
- [ ] El canvas ocupa `.crt-screen`, el pozo está centrado, se ve nítido con `devicePixelRatio` 2 y a 375 px de ancho no hay scroll horizontal.
- [ ] PAUSA, `P` y `Escape` pausan y reanudan; cambiar de pestaña o ventana deja la partida en pausa.
- [ ] Cuando la pieza nueva no cabe, el tablero se queda quieto y atenuado y `GameOverModal` se abre con la puntuación final aproximadamente 1 s después.
- [ ] FIN abre `GameOverModal` con la puntuación actual y el juego se detiene.
- [ ] Guardar con iniciales muestra "PUNTUACIÓN GUARDADA · PUESTO #NN" y la fila aparece en `/juegos/caida` y en `/salon?juego=caida`.
- [ ] La tarjeta de CAÍDA en `/biblioteca` muestra la mejor puntuación real.
- [ ] "JUGAR DE NUEVO" empieza una partida con tablero vacío, puntuación 0, 0 líneas y nivel 01, y su modal vuelve a permitir guardar.
- [ ] Con el modal abierto se pueden escribir iniciales con espacios; flechas y Espacio no hacen scroll mientras se juega.
- [ ] Salir y volver a entrar no deja listeners ni bucles duplicados (también en `npm run dev` con StrictMode): la velocidad de caída es la misma y no hay errores en la consola.
- [ ] No hay ningún import de `reference/` en `app/`, `components/` ni `lib/`.
- [ ] `CLAUDE.md` describe la prop `lines` de `PlayerHud`.

## Decisiones

- **Sí:** reusar la entrada `caida`. Ya describe este juego y tiene portada (`cover-tetro`), color y enlaces.
- **No:** id nuevo. Duplicaría el juego en el catálogo.
- **Sí:** mantener el texto `long` actual. Es fiel: rotación, líneas y velocidad cada 10 líneas. La migración solo cambia `accepts_scores`.
- **Sí:** conservar la tuerca y el sorteo uniforme de 8 piezas. Port fiel y da identidad propia al juego.
- **No:** bolsa de 7 ni quitar la tuerca. Cambiaría la jugabilidad del original.
- **Sí:** prop opcional `lines` en `PlayerHud`. El Tetris no tiene vidas; es el cambio mínimo y los demás juegos no se tocan.
- **No:** prop genérica `stat?: {label, value}`. Más abstracta de lo que hace falta hoy.
- **No:** dejar "Vidas" con "—" o una vida fija. Mostraría un dato que no existe en el juego.
- **Sí:** canvas lógico 800×600 con el pozo centrado y el panel SIGUIENTE dibujado en el canvas. Encaja en el `.crt-screen` 4:3 sin tocarlo, y la pieza siguiente es parte del campo de juego.
- **No:** canvas 300×600 con letterbox ni CRT vertical. Más CSS y la pieza siguiente quedaría fuera del canvas.
- **Sí:** rejilla y borde del pozo, sin chuleta de controles en el canvas. Los controles ya salen en el overlay de inicio.
- **Sí:** I/O/T/S con los cuatro tokens neón y Z/J/L/tuerca con tonos derivados en `COLORS`. Ocho piezas necesitan ocho colores distinguibles.
- **No:** colores pastel del original. Desentonan con el CRT.
- **Sí:** glow solo en la pieza activa. 200 bloques con `shadowBlur` bajarían los FPS.
- **Sí:** controles del original y Espacio para arrancar, como en ROCAS. El motor ignora Espacio hasta su primer `keyup` tras `start()`.
- **No:** Enter para arrancar ni rotación antihoraria. Romperían la coherencia con ROCAS o añadirían mecánicas que no están en `game.js`.
- **Sí:** acciones en `keydown` con el autorepeat del sistema. Es el comportamiento del original.
- **Sí:** `GAMEOVER_DELAY` de 1 s con el tablero congelado y atenuado. Se ve la jugada final antes del modal, como en ROCAS.
- **No:** barrido animado de fin de partida. Mecánica y código nuevos.
- **Sí:** descartar el toggle de tema, la pausa y el overlay propios, el botón Reiniciar y el panel DOM. La plataforma pone HUD, pausa y modal.
- **Sí:** colores como literales en `COLORS`. El canvas no lee variables CSS; el original lo hacía con `getComputedStyle` para el tema, que se descarta.

## Riesgos

| Riesgo                                                              | Mitigación                                                                                                          |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| StrictMode monta dos veces en dev: bucles o listeners duplicados    | Instancia en `useEffect` y `destroy()` en el cleanup; criterio de aceptación explícito.                             |
| `preventDefault` bloquea escribir en el input del modal             | Solo fuera de `over` y nunca si el `target` es `input` o `textarea`.                                                |
| El Espacio que arranca hace _hard drop_, también por autorepeat     | El motor ignora Espacio tras `start()` hasta su primer `keyup`; criterio de aceptación explícito.                   |
| Salto de `dt` al reanudar tras una pausa larga                      | `resume()` reinicia `lastTime`; `dt` limitado a 50 ms.                                                              |
| Se olvida `accepts_scores` y el guardado falla por RLS              | Paso 1 del plan y criterio de inserción con la publishable key.                                                     |
| `db push` escribe en el único entorno, el remoto                    | Revisar el SQL con el usuario antes de aplicarlo; la migración solo cambia una fila.                                |
| El port cambia sin querer la jugabilidad                            | Constantes copiadas literalmente de `game.js`; criterios con los valores del original.                              |
| `shadowBlur` en todo baja los FPS                                   | Glow solo en la pieza activa.                                                                                       |
| El cambio en `PlayerHud` altera Asteroides o el simulado            | `lines` es opcional; criterio que comprueba que `rocas` y los simulados siguen mostrando Vidas.                     |
| Una partida muy larga supera el máximo de 10.000.000 de `saveScore` | No es alcanzable en la práctica (800 × nivel por tetris); si pasa, el modal muestra el error de guardado existente. |

## Lo que **no** entra en esta spec

- Controles táctiles.
- Toggle de tema, pausa y overlay propios, botón Reiniciar y panel DOM del original.
- Rotación antihoraria, _hold_, bolsa de 7, retardo de bloqueo y DAS/ARR propios.
- Animaciones de líneas o de fin de partida, sonido y música.
- Cambios en el texto, la portada o la página de detalle de `caida`.
- Framework de tests.

Cada uno de estos, si llega, va en su propia spec.
