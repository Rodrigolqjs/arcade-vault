# SPEC 09 — Arkanoid jugable en BLOQUE BUSTER

> **Estado:** implementada
> **Depende de:** SPEC 05, SPEC 06, SPEC 07
> **Fecha:** 2026-11-02
> **Objetivo:** Portar a TypeScript el juego de `reference/resources/started-games/04-arkanoid/` y montarlo en `/juegos/bloque-buster/jugar` con el HUD, la pausa, el modal de fin de juego y el leaderboard real de la plataforma.

## Por qué existe esta spec

`bloque-buster` es hoy un juego simulado. El original son tres scripts sin dependencias y con todo en globals:

- `game.js` (268 líneas): estado, bucle, físicas y dibujo.
- `levels.js`: 5 niveles como datos.
- `assets/spritesheet.js`: carga `spritesheet-breakout.png` y expone `drawSprite`/`drawFrame`.

Usa un canvas de 800×600, el mismo 4:3 que `.crt-screen`. Pinta en el canvas su HUD (Score, Nivel y vidas), los overlays GAME OVER y "¡Completaste el juego!" y una pausa propia con un selector de nivel clicable. Reproduce dos sonidos y registra listeners de teclado en `document` y de ratón en el canvas que nunca se eliminan. Su `dt` no tiene límite.

La entrada `bloque-buster` del catálogo ("Rebota la pelota y destruye muros de neón") ya describe este juego, y su texto `long` es fiel: paleta, pelota y niveles con patrones distintos. Para que viva en React hay que encapsularlo en un motor sin globals. Ese motor se crea y se destruye con el componente y avisa a React de la puntuación, las vidas, el nivel y el fin de partida. El HUD del original encaja tal cual en `PlayerHud`.

Los sprites se sustituyen por formas neón dibujadas, como en ROCAS y CAÍDA. Así no hacen falta assets ni esperar a que carguen.

## Alcance

**Dentro:**

- Migración `supabase/migrations/*_bloque_buster_jugable.sql`: `accepts_scores = true` para `bloque-buster`. El texto `long` no cambia.
- Motor en TypeScript en `lib/games/arkanoid/`, portado de `game.js` y `levels.js` con la misma jugabilidad:
  - Pala de 81×14 en `y = 560` que se mueve a 400 px/s con `←`/`→` o sigue al ratón sobre el canvas, limitada a `0…W − 81`.
  - Pelota de 16×16 con velocidad `(200, −300) × velocidad del nivel` px/s.
  - Rebota en las paredes izquierda, derecha y superior. Por abajo se pierde.
  - Rebote en la pala solo si la pelota baja y su borde inferior está entre `y = 560` y `y = 560 + 14 + 8`: se coloca encima de la pala y `vy` se invierte. `vx` no cambia, igual que en el original.
  - Bloques de 64×24 en una rejilla de 10×6 con origen en (80, 80). Con un choque AABB, el bloque se rompe, suma 10 puntos e invierte `vy`. Como mucho se rompe un bloque por frame.
  - Explosión de 150 ms al romper un bloque.
  - 5 niveles con los patrones y velocidades de `levels.js`:
    1. Parrilla de 60 bloques, ×1.
    2. Pirámide de 40, ×1.1.
    3. Ajedrez de 30, ×1.21.
    4. Filas con huecos, 39 bloques, ×1.33.
    5. Marco y cruz, 39 bloques, ×1.46.
  - Al limpiar un nivel se carga el siguiente: bloques nuevos, explosiones vacías y la pelota sale desde encima de la pala con la velocidad del nivel nuevo. La pala no se mueve.
  - 3 vidas. Al perder una, la pelota se relanza al instante hacia arriba desde el centro de la pala, en la posición que tenga en ese momento.
  - Fin de partida al perder la última vida o al limpiar el nivel 5: tablero congelado y atenuado `GAMEOVER_DELAY` = 1 s sin aceptar input y después `onGameOver(score)`.
- Sin globals: todo el estado vive en la instancia creada por `createArkanoidGame()`.
- El motor añade sus listeners al crearse (`keydown`/`keyup` en `window`, `mousemove` en el canvas) y los elimina en `destroy()`, junto con el `requestAnimationFrame`.
- Paleta neón de la plataforma en el canvas, con los colores fijados en `COLORS`:
  - Pala `--cyan` (el color de `bloque-buster` en el catálogo) y pelota `--ink`.
  - Bloques según el color de `levels.js`: `cyan`, `magenta`, `yellow` y `green` con sus tokens de `app/globals.css`, `hotpink` en rosa neón, `red` en rojo neón y `gray` en `--ink-dim`.
  - Glow (`shadowBlur`) solo en la pala y la pelota. Bloques y explosiones sin glow.
- La explosión se dibuja en neón: el bloque crece de ×1 a ×1,4 alrededor de su centro mientras su alfa baja de 1 a 0, de forma lineal durante 150 ms y en el color del bloque.
- El canvas solo dibuja bloques, explosiones, pala y pelota sobre fondo negro. No pinta puntuación, vidas, nivel, pausa, GAME OVER ni victoria.
- Canvas con resolución lógica 800×600, escalado por CSS al 100 % de `.crt-screen` y backing store × `devicePixelRatio`. El ratón se convierte a coordenadas lógicas con `W / rect.width`.
- `components/games/ArkanoidPlayer.tsx`: HUD de la plataforma (Puntuación con 10 por bloque, Vidas con 3 corazones y Nivel del 01 al 05), CRT con el canvas, overlays y `GameOverModal` con `saveable`. `PlayerHud` no cambia.
- Fases en React: `ready` → `playing` ⇄ `paused` → `over`, como en la SPEC 05.
  - En `ready` el canvas muestra el nivel 1, la pala centrada y la pelota encima, todo quieto.
  - Se arranca con Espacio o con clic en el CRT, y la pelota sale en ese momento.
- Controles: `←`/`→` y ratón mueven la pala. `P` y `Escape` pausan.
- `preventDefault` de `←`, `→` y Espacio fuera de `over` y nunca con el foco en `input`/`textarea`.
- Registro: `bloque-buster` en `PLAYABLE_GAME_IDS` y su entrada en `RealGamePlayer.tsx`.

**Fuera de alcance (para futuras specs):**

- Controles táctiles.
- Sonidos de rebote y de rotura, y música.
- Selector de nivel de la pausa (botones 1–5).
- HUD, pausa y overlays GAME OVER y "¡Completaste el juego!" del original.
- Spritesheet y assets en `public/`.
- Ángulo de rebote según el punto de impacto en la pala, saque con la pelota pegada a la pala, recolocar la pala al cambiar de nivel y cualquier mecánica que no esté en `game.js`.
- Bucle de niveles tras el 5 o un modal de victoria propio.
- Cambiar el texto `long`, la portada o la página de detalle de `bloque-buster`.
- Framework de tests.

## Modelo de datos

Migración (`supabase/migrations/*_bloque_buster_jugable.sql`, timestamp generado por `npx supabase migration new bloque_buster_jugable`):

```sql
-- Arkanoid jugable (SPEC 09): bloque-buster acepta puntuaciones.
update public.games
  set accepts_scores = true
where id = 'bloque-buster';
```

API pública del motor (`lib/games/arkanoid/engine.ts`):

```ts
export interface HudState {
  score: number;
  lives: number;
  level: number;
}
export interface ArkanoidEvents {
  onHud: (hud: HudState) => void; // solo cuando cambia algún valor, no cada frame
  onGameOver: (score: number) => void; // GAMEOVER_DELAY después de perder la última vida o limpiar el nivel 5
}
export interface ArkanoidGame {
  start: () => void; // puntuación 0, 3 vidas, nivel 1, pala centrada, pelota lanzada; limpia teclas pendientes
  pause: () => void; // detiene el rAF
  resume: () => void; // reanuda sin salto de dt
  end: () => number; // detiene la partida (botón FIN) y devuelve la puntuación
  destroy: () => void; // cancela el rAF y elimina los listeners
}
export function createArkanoidGame(
  canvas: HTMLCanvasElement,
  events: ArkanoidEvents,
): ArkanoidGame;
```

Estado interno (no exportado):

```ts
type EngineState = "ready" | "playing" | "dying" | "gameover";
// dying: tablero congelado y atenuado durante GAMEOVER_DELAY, sin input. Se entra al perder la última vida o al limpiar el nivel 5.
```

Niveles (`lib/games/arkanoid/levels.ts`), portados de `levels.js` con la misma generación:

```ts
export type BlockColor =
  "red" | "yellow" | "cyan" | "magenta" | "hotpink" | "green" | "gray";
export interface LevelBlock {
  col: number; // 0–9
  row: number; // 0–5
  color: BlockColor;
}
export interface Level {
  speed: number; // multiplicador de BASE_BALL_VX/VY
  blocks: LevelBlock[];
}
export const LEVELS: Level[]; // 5 niveles: speed 1.00, 1.10, 1.21, 1.33, 1.46
```

Constantes (`lib/games/arkanoid/constants.ts`), con los valores de `game.js` y `spritesheet.js`:

```ts
export const W = 800;
export const H = 600;
export const PADDLE_SPEED = 400; // px/s
export const PADDLE_W = 81;
export const PADDLE_H = 14;
export const PADDLE_Y = 560;
export const PADDLE_CATCH = 8; // px bajo la pala en los que todavía rebota
export const BALL_SIZE = 16;
export const BASE_BALL_VX = 200; // px/s
export const BASE_BALL_VY = -300; // px/s
export const BLOCK_COLS = 10;
export const BLOCK_ROWS = 6;
export const BLOCK_W = 64;
export const BLOCK_H = 24;
export const BLOCKS_ORIGIN_X = 80; // (W − BLOCK_COLS × BLOCK_W) / 2
export const BLOCKS_ORIGIN_Y = 80;
export const BLOCK_POINTS = 10;
export const START_LIVES = 3;
export const EXPLOSION_DURATION = 150; // ms
export const EXPLOSION_SCALE = 1.4; // tamaño final de la explosión
export const GAMEOVER_DELAY = 1; // s
// Copia los tokens de app/globals.css; el canvas no lee variables CSS.
export const COLORS = {
  paddle: "#00f5ff", // --cyan, color de bloque-buster en el catálogo
  ball: "#e6e9ff", // --ink
  blocks: {
    red: "#ff3b3b", // rojo neón (el mismo que la Z de CAÍDA)
    yellow: "#f5ff00", // --yellow
    cyan: "#00f5ff", // --cyan
    magenta: "#ff006e", // --magenta
    hotpink: "#ff5cd6", // rosa neón
    green: "#00ff88", // --green
    gray: "#8a8fb5", // --ink-dim
  },
};
```

Los dos tonos derivados (`#ff3b3b`, `#ff5cd6`) se pueden afinar en el paso de aspecto con `/frontend-design`, sin cambiar qué color de `levels.js` usa cada token.

## Estructura de archivos

```
app/
  globals.css                  # modificado solo si /frontend-design pide estilos del juego
components/
  games/
    RealGamePlayer.tsx         # modificado: entrada bloque-buster
    ArkanoidPlayer.tsx         # nuevo ("use client"): fases, HUD, CRT, canvas, overlays, modal
lib/
  games/
    registry.ts                # modificado: bloque-buster en PLAYABLE_GAME_IDS
    arkanoid/
      constants.ts             # nuevo: dimensiones, física, puntuación, colores
      levels.ts                # nuevo: LEVELS (5 niveles)
      entities.ts              # nuevo: Paddle, Ball, Block, Explosion
      engine.ts                # nuevo: createArkanoidGame()
  supabase/database.types.ts   # regenerado (sin cambios de tipos esperados)
supabase/migrations/
  *_bloque_buster_jugable.sql  # nuevo
CLAUDE.md                      # modificado: input de ratón en el patrón de motores
```

`reference/resources/started-games/04-arkanoid/` no se modifica ni se importa: es solo la fuente del port.

## Plan de implementación

Antes de escribir código, leer `node_modules/next/dist/docs/01-app/02-guides/lazy-loading.md` (`ssr: false` solo funciona dentro de Client Components), como exige `AGENTS.md`. Antes del paso 7 invocar `/frontend-design` para el aspecto del canvas y el overlay de inicio, como exige `CLAUDE.md`.

1. **Migración.** `npx supabase migration new bloque_buster_jugable` y escribir el SQL del modelo de datos. Revisar el SQL con el usuario → `npx supabase db push --linked` → `npm run db:types`.
   Verificación: `npx supabase migration list --linked` la muestra en remoto; insertar en `public.scores` para `bloque-buster` como `anon` funciona y para un juego simulado (`gloton`) sigue fallando; `npx tsc --noEmit` pasa.

2. **Registro y player mínimo.** Añadir `bloque-buster` a `PLAYABLE_GAME_IDS` en `lib/games/registry.ts`, su entrada `dynamic(() => import("@/components/games/ArkanoidPlayer"), { ssr: false })` en `components/games/RealGamePlayer.tsx` y un `ArkanoidPlayer.tsx` mínimo: `PlayerHud` con puntuación 0, 3 vidas y nivel 1, y el CRT con un `<canvas className="game-canvas">` negro.
   Verificación: `/juegos/bloque-buster/jugar` muestra el CRT vacío con el HUD "Puntuación · Vidas · Nivel"; `/juegos/rocas/jugar`, `/juegos/caida/jugar` y los simulados siguen igual; `npm run build` pasa.

3. **Constantes y niveles.** `lib/games/arkanoid/constants.ts` con los valores del modelo de datos y `lib/games/arkanoid/levels.ts` con `LEVELS` tipado, generado como en `levels.js` (mismos colores por fila, pirámide `pyStart`/`pyEnd`, ajedrez, huecos `gaps4` y marco con cruz).
   Verificación: `npx tsc --noEmit` y `npm run lint` pasan; `LEVELS.map(l => l.blocks.length)` da `[60, 40, 30, 39, 39]`.

4. **Entidades.** `lib/games/arkanoid/entities.ts` con clases tipadas que tienen `update(dt)` y `draw(ctx)`. El input entra como parámetro, no como global.
   - `Paddle`: posición y movimiento con teclas.
   - `Ball`: posición, velocidad y rebote en paredes.
   - `Block`: posición, color y `alive`.
   - `Explosion`: `elapsed`, `dead` y el dibujo con escala y alfa.
   - Función `collideAABB(ball, block)`.
     Verificación: `npx tsc --noEmit` y `npm run lint` pasan.

5. **Motor (a): bucle, input y dibujo.** `lib/games/arkanoid/engine.ts` con `createArkanoidGame(canvas, events)`:
   - Backing store `W × dpr` por `H × dpr` y `setTransform(dpr…)`.
   - Listeners `keydown`/`keyup` en `window` (`keys` para `ArrowLeft`/`ArrowRight`) y `mousemove` en el canvas (pala centrada en el puntero, coordenadas lógicas). Se añaden al crear y se eliminan en `destroy()`. Solo actúan en estado `playing` y con el bucle activo. El motor no maneja `P` ni `Escape`.
   - Bucle con `dt` limitado a 50 ms. `resume()` reinicia `lastTime`.
   - Dibujo: fondo negro, bloques vivos, explosiones, pala con glow y pelota con glow.
   - En `ready`, nivel 1 dibujado con la pala centrada y la pelota encima, sin bucle.
   - `start`, `pause`, `resume`, `end` y `destroy`. En este paso la pelota rebota en paredes y pala y, si cae, se relanza desde la pala sin restar vidas. Todavía no hay choques con bloques.
     Verificación: `npx tsc --noEmit` pasa.

6. **Motor (b): bloques, puntuación, niveles y fin.**
   - Choques AABB con bloques: un bloque por frame, `vy` invertida, +10 y una explosión de 150 ms.
   - Al limpiar el nivel `n < 5`, se carga el nivel `n + 1` con su velocidad y la pala sin mover.
   - Al caer la pelota se resta una vida y la pelota se relanza.
   - Con 0 vidas o el nivel 5 limpio, se pasa a `dying` (tablero congelado y atenuado, sin input) y `onGameOver(score)` llega tras `GAMEOVER_DELAY`. `resume()` también reanuda `dying`, para que una pausa automática en ese segundo no deje la partida atascada.
   - `onHud` solo cuando cambia `score`, `lives` o `level` (se compara con el último enviado).
     Verificación: `npx tsc --noEmit` y `npm run lint` pasan.

7. **Conectar el motor y aspecto** (tras `/frontend-design`). En `ArkanoidPlayer.tsx`, copiando el patrón de `TetrisPlayer.tsx`:
   - Instancia en `useEffect` y `destroy()` en el cleanup.
   - Fase `ready` con overlay `.game-start`: título `BLOQUE BUSTER`, "PULSA ESPACIO_" y las teclas `←` `→` mover y ratón mover. El clic en el CRT también arranca.
   - HUD alimentado por `onHud`.
   - Estilos nuevos en `app/globals.css` solo si el diseño los pide.
     Verificación: en `/juegos/bloque-buster/jugar` se juega una partida completa con teclado y con ratón, y el HUD refleja puntuación, vidas y nivel.

8. **Pausa.** Botón PAUSA/REANUDAR de `PlayerHud`, `P` y `Escape`, pausa automática con `visibilitychange` (`hidden`) y `blur`; overlay "EN PAUSA".
   Verificación: cambiar de pestaña deja el juego en pausa y la pelota no se ha movido al volver; mover el ratón en pausa no mueve la pala.

9. **Fin de partida y guardado.** `onGameOver` y el botón FIN pasan a `over` y abren `<GameOverModal gameId={game.id} saveable …>`; "JUGAR DE NUEVO" llama a `start()`. `preventDefault` de `←`, `→` y Espacio solo fuera de `over` y nunca con el foco en `input`/`textarea`.
   Verificación: tras perder se escriben iniciales con espacios, GUARDAR muestra el puesto y "VER SALÓN DE LA FAMA" lleva a `/salon?juego=bloque-buster` con la fila.

10. **Docs y cierre.** `CLAUDE.md`: en el patrón de motores, mencionar que un motor puede escuchar `mousemove` en su canvas (convertido a coordenadas lógicas) y que lo elimina en `destroy()`.
    Verificación: `npm run lint`, `npx tsc --noEmit` y `npm run build` sin errores.

## Criterios de aceptación

- [ ] `npm run build`, `npm run lint` y `npx tsc --noEmit` terminan sin errores.
- [ ] `npx supabase migration list --linked` muestra la migración `bloque_buster_jugable` aplicada en el remoto.
- [ ] Insertar en `public.scores` para `bloque-buster` como `anon` funciona.
- [ ] `get_advisors` de seguridad no muestra avisos nuevos.
- [ ] `/juegos/bloque-buster/jugar` muestra el canvas dentro del CRT con el overlay "PULSA ESPACIO_", el nivel 1, la pala centrada y la pelota encima, y nada se mueve hasta arrancar.
- [ ] Espacio o clic en el CRT arrancan la partida y la pelota sale hacia arriba; ni la pulsación ni el clic mueven la pala.
- [ ] `←`/`→` mueven la pala a 400 px/s y el ratón sobre el canvas la centra en el puntero; la pala no sale de `0…800 − 81`.
- [ ] La pelota rebota en las paredes izquierda, derecha y superior, y se pierde por abajo.
- [ ] La pelota rebota en la pala solo cuando baja; tras el rebote `vx` conserva su valor y `vy` cambia de signo.
- [ ] Cada bloque roto suma 10 puntos, invierte `vy` y deja una explosión de unos 150 ms en su color; nunca se rompen dos bloques en el mismo frame.
- [ ] Los 5 niveles tienen 60, 40, 30, 39 y 39 bloques con los patrones de `levels.js` (parrilla, pirámide, ajedrez, filas con huecos y marco con cruz).
- [ ] Al limpiar un nivel aparece el siguiente, el HUD pasa al nivel siguiente, la pala sigue donde estaba y la velocidad de la pelota es `(200, 300) × 1.1 / 1.21 / 1.33 / 1.46` en valor absoluto.
- [ ] Al caer la pelota se pierde un corazón y la pelota se relanza al instante hacia arriba desde el centro de la pala.
- [ ] Al perder la tercera vida, el tablero se queda quieto y atenuado y `GameOverModal` se abre con la puntuación final aproximadamente 1 s después.
- [ ] Al limpiar el nivel 5, el tablero se queda quieto y atenuado y `GameOverModal` se abre con la puntuación final (2080 si no se perdió ningún bloque) aproximadamente 1 s después.
- [ ] El HUD muestra Puntuación, Vidas con corazones y Nivel del 01 al 05.
- [ ] El canvas no pinta puntuación, vidas, nivel, pausa, GAME OVER ni victoria.
- [ ] Pala cian y pelota color ink con glow; bloques con su color neón de `COLORS.blocks` y sin glow.
- [ ] El canvas ocupa `.crt-screen`, se ve nítido con `devicePixelRatio` 2 y a 375 px de ancho no hay scroll horizontal.
- [ ] PAUSA, `P` y `Escape` pausan y reanudan; cambiar de pestaña o ventana deja la partida en pausa; en pausa, ni el teclado ni el ratón mueven la pala.
- [ ] FIN abre `GameOverModal` con la puntuación actual y el juego se detiene.
- [ ] Guardar con iniciales muestra "PUNTUACIÓN GUARDADA · PUESTO #NN" y la fila aparece en `/juegos/bloque-buster` y en `/salon?juego=bloque-buster`.
- [ ] La tarjeta de BLOQUE BUSTER en `/biblioteca` muestra la mejor puntuación real.
- [ ] "JUGAR DE NUEVO" empieza una partida con puntuación 0, 3 vidas, nivel 01 y la pala centrada, y su modal vuelve a permitir guardar.
- [ ] Con el modal abierto se pueden escribir iniciales con espacios; flechas y Espacio no hacen scroll mientras se juega.
- [ ] Salir y volver a entrar no deja listeners ni bucles duplicados (también en `npm run dev` con StrictMode): la velocidad de la pelota es la misma y no hay errores en la consola.
- [ ] `/juegos/rocas/jugar`, `/juegos/caida/jugar` y los juegos simulados siguen funcionando igual.
- [ ] No hay ningún import de `reference/` en `app/`, `components/` ni `lib/`.
- [ ] `CLAUDE.md` describe el input de ratón en el patrón de motores.

## Decisiones

- **Sí:** reusar la entrada `bloque-buster`. Ya describe este juego y tiene portada (`cover-bricks`), color y enlaces.
- **No:** id nuevo. Duplicaría el juego en el catálogo.
- **Sí:** mantener el texto `long` actual. Es fiel: paleta, pelota y niveles con patrones distintos. La migración solo cambia `accepts_scores`.
- **Sí:** HUD directo (Puntuación, Vidas y Nivel 01–05) sin tocar `PlayerHud`. El original tiene exactamente esos tres datos.
- **No:** mostrar el nivel como "01/05". Obligaría a cambiar `PlayerHud` por un dato que no hace falta.
- **Sí:** `←`/`→` y ratón, como el original, con arranque por Espacio o clic, como en ROCAS y CAÍDA.
- **No:** solo teclado o solo ratón. Lo primero pierde un control del original y lo segundo no es accesible.
- **Sí:** formas neón dibujadas en lugar del spritesheet. Coherentes con el CRT, ROCAS y CAÍDA, sin assets ni espera de carga.
- **No:** copiar el PNG a `public/games/bloque-buster/`. Más código (carga, `drawSprite`) y un aspecto que desentona.
- **Sí:** conservar la explosión de 150 ms, redibujada en neón. Es feedback de juego del original, no HUD.
- **Sí:** limpiar el nivel 5 termina la partida igual que perder: 1 s congelado y el mismo `GameOverModal`. Fiel al original sin cambiar la plataforma.
- **No:** bucle de niveles ni modal de victoria propio. El primero es una mecánica nueva y el segundo cambia `GameOverModal`.
- **Sí:** descartar los sonidos, el selector de nivel y el HUD, la pausa y los overlays del original. La plataforma pone HUD, pausa y modal; el sonido merece su propia spec; y con puntuaciones guardadas, saltar de nivel sería trampa.
- **Sí:** física fiel. La pala solo invierte `vy`, la pelota se relanza al instante tras perder una vida y la pala no se recoloca al cambiar de nivel.
- **No:** ángulo según el punto de impacto, saque con la pelota pegada a la pala ni pala centrada en cada nivel. Mejorarían la jugabilidad, pero son mecánicas que no están en `game.js`.
- **Sí:** pala de 81 px, el valor de `game.js`. El `CLAUDE.md` del original dice 162, pero el código usa 81.
- **Sí:** colores de `levels.js` mapeados a tokens neón (`hotpink` y `red` derivados, `gray` a `--ink-dim`). Conserva el diseño de los niveles 3 y 5.
- **No:** colorear por fila. Perdería los patrones de color de los niveles.
- **Sí:** glow solo en pala y pelota. 60 bloques con `shadowBlur` bajarían los FPS.
- **Sí:** `dt` limitado a 50 ms, aunque el original no lo limita. Evita saltos tras una pausa y que la pelota atraviese bloques: a la velocidad máxima (438 px/s en vertical) recorre como mucho 22 px por frame, menos que la altura de un bloque.

## Riesgos

| Riesgo                                                              | Mitigación                                                                                                                 |
| ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| StrictMode monta dos veces en dev: bucles o listeners duplicados    | Instancia en `useEffect` y `destroy()` en el cleanup, también el `mousemove` del canvas; criterio de aceptación explícito. |
| `preventDefault` bloquea escribir en el input del modal             | Solo fuera de `over` y nunca si el `target` es `input` o `textarea`.                                                       |
| La pulsación o el clic que arrancan la partida mueven la pala       | `start()` limpia `keys`; en `ready` el overlay tapa el canvas y el `mousemove` no llega al motor.                          |
| El ratón mueve la pala durante la pausa                             | El `mousemove` solo actúa en `playing` con el bucle activo; además el overlay "EN PAUSA" tapa el canvas.                   |
| Salto de `dt` al reanudar tras una pausa larga                      | `resume()` reinicia `lastTime`; `dt` limitado a 50 ms.                                                                     |
| La pelota atraviesa un bloque a alta velocidad                      | Con `dt` ≤ 50 ms la pelota avanza como mucho 22 px por frame, menos que los 24 px de alto de un bloque.                    |
| Una pausa automática durante `dying` deja la partida atascada       | `resume()` también reanuda `dying`, para que `onGameOver` llegue igualmente.                                               |
| Con `vx` constante la pelota entra en trayectorias repetitivas      | Aceptado: es la física del original. Cambiarla es otra spec.                                                               |
| Se olvida `accepts_scores` y el guardado falla por RLS              | Paso 1 del plan y criterio de inserción como `anon`.                                                                       |
| `db push` escribe en el único entorno, el remoto                    | Revisar el SQL con el usuario antes de aplicarlo; la migración solo cambia una fila.                                       |
| El port cambia sin querer la jugabilidad                            | Constantes y niveles copiados literalmente de `game.js` y `levels.js`; criterios con los valores del original.             |
| `shadowBlur` en todo baja los FPS                                   | Glow solo en pala y pelota.                                                                                                |
| La prueba de guardado deja filas permanentes en el leaderboard real | Borrar las filas de prueba de `public.scores` al terminar la verificación, como en las SPEC 07 y 08.                       |

## Lo que **no** entra en esta spec

- Controles táctiles.
- Sonidos y música.
- Selector de nivel, HUD, pausa y overlays propios del original.
- Spritesheet y assets en `public/`.
- Ángulo de rebote, saque, pala centrada por nivel, bucle de niveles, modal de victoria y cualquier mecánica nueva.
- Cambios en el texto, la portada o la página de detalle de `bloque-buster`.
- Framework de tests.

Cada uno de estos, si llega, va en su propia spec.
