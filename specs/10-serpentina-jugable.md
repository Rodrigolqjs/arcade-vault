# SPEC 10 — Serpiente jugable en SERPENTINA

> **Estado:** implementada
> **Depende de:** SPEC 05, SPEC 06, SPEC 07
> **Fecha:** 2026-11-02
> **Objetivo:** Crear un juego original de serpiente en grilla y montarlo en `/juegos/serpentina/jugar` con el HUD, la pausa, el modal de fin de juego y el leaderboard real de la plataforma.

## Por qué existe esta spec

`serpentina` es hoy un juego simulado. Su texto del catálogo ya describe el juego: "Una serpiente de luz recorre la grilla buscando núcleos magenta. Cada bocado la alarga y la hace más veloz. Un movimiento en falso y se devora a sí misma."

No hay un juego de referencia que portar. `reference/resources/started-games/05-snake-assets/` contiene solo dos archivos:

- `fruits.png` (3790×442): 22 frutas en tres estilos (plano, pixel art y realista).
- `sprites.js`: un atlas `window.SPRITE_ATLAS` que recorta la fila de pixel art. Sus nombres están desplazados respecto a las imágenes (`banana` apunta a la primera fruta, que no es una banana).

El propio archivo indica que las imágenes salen de un rip del Snake de Google, así que son arte de terceros con copyright. Por eso el motor se diseña desde cero dentro del género: grilla, serpiente que crece y acelera, y muerte al chocar. La comida son núcleos neón dibujados en canvas, como promete el texto del catálogo, y la carpeta de assets queda solo como inspiración.

El motor sigue el patrón de ROCAS y CAÍDA:

- Sin globals, con canvas lógico de 800×600.
- Listeners que se limpian en `destroy()`.
- Avisa a React de la puntuación, las vidas, el nivel y el fin de partida.

## Alcance

**Dentro:**

- Migración `supabase/migrations/*_serpentina_jugable.sql`: `accepts_scores = true` para `serpentina`. El texto `long` no cambia.
- Motor en TypeScript en `lib/games/snake/` con esta jugabilidad:
  - Grilla de 40 columnas × 30 filas con celdas de 20 px, que ocupa todo el canvas de 800×600.
  - La serpiente empieza con 4 segmentos, la cabeza en la celda (20, 15) y avanzando hacia la derecha (cuerpo en (19, 15), (18, 15) y (17, 15)).
  - Movimiento por _ticks_ fijos: en cada tick la cabeza avanza una celda en la dirección actual.
  - Intervalo de tick: `max(50, 120 − (nivel − 1) × 10)` ms.
  - Un núcleo magenta en una celda libre al azar (nunca sobre la serpiente).
  - Comer un núcleo suma `10 × nivel` (el nivel antes de comer), alarga la serpiente un segmento (la cola no avanza en ese tick) y hace aparecer un núcleo nuevo.
  - Nivel `floor(núcleos comidos / 5) + 1`, sin tope; la velocidad deja de subir al llegar a 50 ms (nivel 8).
  - Una sola vida. La partida termina si la cabeza sale de la grilla o entra en una celda del cuerpo. La celda de la cola cuenta como libre si ese tick no come, porque la cola se mueve a la vez.
  - Si no queda ninguna celda libre para el núcleo nuevo (tablero lleno), la partida también termina.
- Sin globals: todo el estado vive en la instancia creada por `createSnakeGame()`.
- El motor añade sus listeners de teclado al crearse y los elimina en `destroy()`, junto con el `requestAnimationFrame`.
- Paleta neón de la plataforma en el canvas:
  - Serpiente en `--green`, el color de `serpentina` en el catálogo, con la cabeza más clara.
  - Núcleo en `--magenta`, con un pulso suave de tamaño o brillo.
  - Rejilla tenue en `--ink-faint` y borde neón verde de la grilla.
  - Glow (`shadowBlur`) solo en la cabeza y el núcleo; el cuerpo y la rejilla, sin glow.
- El canvas no pinta puntuación, vidas, nivel, pausa, GAME OVER ni chuleta de controles.
- Canvas con resolución lógica 800×600, escalado por CSS al 100 % de `.crt-screen` y backing store × `devicePixelRatio`.
- `components/games/SnakePlayer.tsx`: HUD de la plataforma (Puntuación, Vidas con un ♥ y Nivel), CRT con el canvas, overlays y `GameOverModal` con `saveable`. `PlayerHud` no cambia.
- Fases en React: `ready` → `playing` ⇄ `paused` → `over`, como en la SPEC 05. Se arranca con Espacio o con un clic en el CRT, y esa pulsación no hace nada dentro del juego.
- Controles:
  - `←` `↑` `→` `↓` y `W` `A` `S` `D` giran.
  - Una cola de hasta 2 giros pendientes evita perder pulsaciones rápidas entre ticks.
  - Se descarta el giro de 180° y el giro a la dirección que ya lleva la serpiente (comparando con el último giro en cola).
  - Las pulsaciones con autorepeat (`event.repeat`) se ignoran.
  - `P` y `Escape` pausan.
- `preventDefault` de flechas y Espacio fuera de `over` y nunca con el foco en `input`/`textarea`.
- Fin de partida:
  - La serpiente queda congelada y parpadea en magenta durante `GAMEOVER_DELAY` = 1 s, sin aceptar input.
  - Después se llama a `onGameOver(score)`.
  - Las vidas del HUD pasan de 1 a 0 al morir.
- Registro: `serpentina` en `PLAYABLE_GAME_IDS` y su entrada en `RealGamePlayer.tsx`.

**Fuera de alcance (para futuras specs):**

- Controles táctiles (swipe).
- Sprites de `fruits.png`: no se copian a `public/` ni se dibujan.
- Obstáculos, power-ups y núcleos bonus.
- Atravesar los bordes (wrap) y varias vidas.
- Sonido y música.
- Cambiar el texto `long`, la portada o la página de detalle de `serpentina`.
- Framework de tests.

## Modelo de datos

Migración (`supabase/migrations/*_serpentina_jugable.sql`, timestamp generado por `npx supabase migration new serpentina_jugable`):

```sql
-- Serpiente jugable (SPEC 10): serpentina acepta puntuaciones.
update public.games
  set accepts_scores = true
where id = 'serpentina';
```

API pública del motor (`lib/games/snake/engine.ts`):

```ts
export interface HudState {
  score: number;
  lives: number; // 1 jugando, 0 al morir
  level: number;
}
export interface SnakeEvents {
  onHud: (hud: HudState) => void; // solo cuando cambia algún valor, no cada frame
  onGameOver: (score: number) => void; // GAMEOVER_DELAY después de chocar o llenar el tablero
}
export interface SnakeGame {
  start: () => void; // serpiente inicial, núcleo nuevo, puntuación 0, nivel 1, vidas 1; vacía la cola de giros
  pause: () => void; // detiene el rAF
  resume: () => void; // reanuda sin salto de dt (también durante dying)
  end: () => number; // detiene la partida (botón FIN) y devuelve la puntuación
  destroy: () => void; // cancela el rAF y elimina los listeners
}
export function createSnakeGame(
  canvas: HTMLCanvasElement,
  events: SnakeEvents,
): SnakeGame;
```

Estado interno (no exportado):

```ts
type EngineState = "ready" | "playing" | "dying" | "gameover";
// dying: serpiente congelada y parpadeando durante GAMEOVER_DELAY, sin input.
interface Cell {
  x: number; // columna 0–39
  y: number; // fila 0–29
}
type Dir = "up" | "down" | "left" | "right";
// snake: Cell[] con la cabeza en [0]; dir: Dir; queue: Dir[] (máx. 2); core: Cell; eaten: number; tickAccum: number (ms)
```

Fase en React (`SnakePlayer.tsx`):

```ts
type Phase = "ready" | "playing" | "paused" | "over";
```

Constantes (`lib/games/snake/constants.ts`), con los valores del diseño acordado:

```ts
export const W = 800;
export const H = 600;
export const CELL = 20;
export const COLS = 40; // W / CELL
export const ROWS = 30; // H / CELL
export const START_LENGTH = 4;
export const START_HEAD = { x: 20, y: 15 };
export const START_DIR = "right";
export const BASE_TICK = 120; // ms
export const TICK_STEP = 10; // ms menos por nivel
export const MIN_TICK = 50; // ms
export const CORES_PER_LEVEL = 5;
export const CORE_POINTS = 10; // × nivel
export const MAX_QUEUED_TURNS = 2;
export const GAMEOVER_DELAY = 1; // s
// Copia los tokens de app/globals.css; el canvas no lee variables CSS.
export const COLORS = {
  snake: "#00ff88", // --green, color de serpentina en el catálogo
  head: "#b3ffd9", // --green aclarado
  core: "#ff006e", // --magenta
  grid: "rgba(74, 79, 112, 0.25)", // --ink-faint al 25 %
  border: "#00ff88", // --green
};
```

El tono de la cabeza, el alfa de la rejilla y el pulso del núcleo se pueden afinar en el paso de aspecto con `/frontend-design`, sin cambiar qué token usa cada entidad.

## Estructura de archivos

```
app/
  globals.css                  # modificado solo si /frontend-design pide ajustes del juego
components/
  games/
    RealGamePlayer.tsx         # modificado: entrada serpentina
    SnakePlayer.tsx            # nuevo ("use client"): fases, HUD, CRT, canvas, overlays, modal
lib/
  games/
    registry.ts                # modificado: serpentina en PLAYABLE_GAME_IDS
    snake/
      constants.ts             # nuevo: dimensiones, velocidad, puntuación, colores
      entities.ts              # nuevo: createSnake, step, isOpposite, hitsWall, hitsBody, randomFreeCell, drawCell
      engine.ts                # nuevo: createSnakeGame()
  supabase/database.types.ts   # regenerado (sin cambios de tipos esperados)
supabase/migrations/
  *_serpentina_jugable.sql     # nuevo
```

`reference/resources/started-games/05-snake-assets/` no se modifica, no se importa y no se copia a `public/`.

## Plan de implementación

Antes de escribir código, leer `node_modules/next/dist/docs/01-app/02-guides/lazy-loading.md` (`ssr: false` solo funciona dentro de Client Components), como exige `AGENTS.md`. Antes del paso 6, invocar `/frontend-design` para el aspecto del canvas y el overlay de inicio, como exige `CLAUDE.md`.

1. **Migración.**
   - `npx supabase migration new serpentina_jugable` y escribir el SQL del modelo de datos.
   - Revisar el SQL con el usuario.
   - `npx supabase db push --linked` y después `npm run db:types`.

   Verificación:
   - `npx supabase migration list --linked` muestra la migración en el remoto.
   - Con la publishable key, insertar en `public.scores` para `serpentina` funciona y para un juego simulado sin `accepts_scores` sigue fallando.
   - `npx tsc --noEmit` pasa.

2. **Registro y player mínimo.**
   - Añadir `serpentina` a `PLAYABLE_GAME_IDS` en `lib/games/registry.ts`.
   - Añadir su entrada `dynamic(() => import("@/components/games/SnakePlayer"), { ssr: false })` en `components/games/RealGamePlayer.tsx`.
   - Crear un `SnakePlayer.tsx` mínimo: `PlayerHud` con puntuación 0, una vida y nivel 1, y el CRT con un `<canvas className="game-canvas">` negro.

   Verificación: `/juegos/serpentina/jugar` muestra el CRT vacío con el HUD "Puntuación · Vidas · Nivel"; `/juegos/rocas/jugar`, `/juegos/caida/jugar` y los simulados siguen igual; `npm run build` pasa.

3. **Constantes y entidades.**
   - `lib/games/snake/constants.ts` con los valores del modelo de datos.
   - `lib/games/snake/entities.ts` con funciones puras tipadas que reciben el estado como parámetro:
     - `createSnake()`: los 4 segmentos iniciales.
     - `step(cell, dir)`: celda siguiente.
     - `isOpposite(a, b)`.
     - `hitsWall(cell)`.
     - `hitsBody(snake, cell, growing)`: ignora la cola si no crece.
     - `randomFreeCell(snake)`: `null` si el tablero está lleno.
     - `drawCell(ctx, cell, color, inset)`.

   Verificación: `npx tsc --noEmit` y `npm run lint` pasan.

4. **Motor (a): bucle, input, movimiento y dibujo.** `lib/games/snake/engine.ts` con `createSnakeGame(canvas, events)`:
   - Backing store `W × dpr` por `H × dpr` y `setTransform(dpr…)`.
   - Listeners `keydown` en `window`, añadidos al crear y eliminados en `destroy()`:
     - Las flechas y WASD encolan giros solo en estado `playing`, con las reglas de la cola (máx. 2, sin 180°, sin repetir dirección, sin `event.repeat`).
     - El motor no maneja `P`, `Escape` ni Espacio.
   - Bucle `requestAnimationFrame` con `dt` limitado a 50 ms. `tickAccum` acumula `dt`; en cada tick se saca un giro de la cola y la cabeza avanza. `resume()` reinicia `lastTime`.
   - Dibujo:
     - Fondo negro, rejilla y borde.
     - Cuerpo de la serpiente; cabeza con glow.
     - Núcleo con glow y pulso.
   - `start`, `pause`, `resume`, `end` y `destroy`.
   - En este paso, chocar con la pared o con el cuerpo detiene la serpiente (estado `gameover`, sin callback) y aún no se come.

   Verificación: `npx tsc --noEmit` pasa.

5. **Motor (b): comer, crecer, niveles y fin.**
   - Al entrar en la celda del núcleo:
     - Sumar `CORE_POINTS × nivel`, crecer un segmento e incrementar `eaten`.
     - Recalcular el nivel y el intervalo de tick.
     - Poner un núcleo nuevo con `randomFreeCell`; si es `null`, la partida termina.
   - Chocar con la pared o el cuerpo, o llenar el tablero, pasa a `dying`:
     - Vidas a 0, serpiente congelada parpadeando en magenta y sin input.
     - `onGameOver(score)` tras `GAMEOVER_DELAY`.
   - `onHud` solo cuando cambia `score`, `lives` o `level` (comparar con el último enviado).

   Verificación: `npx tsc --noEmit` y `npm run lint` pasan.

6. **Conectar el motor y aspecto** (tras `/frontend-design`). En `SnakePlayer.tsx`, copiando el patrón de `TetrisPlayer.tsx`:
   - Instancia en `useEffect` y `destroy()` en el cleanup.
   - Fase `ready` con overlay `.game-start`: título `SERPENTINA` con `neon-green`, "PULSA ESPACIO_" y las teclas `←` `↑` `→` `↓` / `WASD` girar.
   - El clic en el CRT también arranca.
   - HUD alimentado por `onHud`.
   - Estilos nuevos en `app/globals.css` solo si hacen falta.

   Verificación: en `/juegos/serpentina/jugar` se juega una partida completa y el HUD refleja puntuación, vidas y nivel.

7. **Pausa.** Botón PAUSA/REANUDAR de `PlayerHud`, `P` y `Escape`, pausa automática con `visibilitychange` (`hidden`) y `blur`; overlay "EN PAUSA".

   Verificación: cambiar de pestaña deja el juego en pausa y la serpiente no ha avanzado al volver.

8. **Fin de partida y guardado.**
   - `onGameOver` y el botón FIN pasan a `over` y abren `<GameOverModal gameId={game.id} saveable …>`.
   - "JUGAR DE NUEVO" llama a `start()`.
   - `preventDefault` de flechas y Espacio solo fuera de `over` y nunca con el foco en `input`/`textarea`.
   - No hay cambios en `CLAUDE.md`: el juego no introduce nada nuevo en el patrón.

   Verificación:
   - Tras perder se escriben iniciales con espacios, GUARDAR muestra el puesto y "VER SALÓN DE LA FAMA" lleva a `/salon?juego=serpentina` con la fila.
   - `npm run lint`, `npx tsc --noEmit` y `npm run build` terminan sin errores.

## Criterios de aceptación

- [ ] `npm run build`, `npm run lint` y `npx tsc --noEmit` terminan sin errores.
- [ ] `npx supabase migration list --linked` muestra la migración `serpentina_jugable` aplicada en el remoto.
- [ ] Con la publishable key, insertar en `public.scores` para `serpentina` funciona.
- [ ] `get_advisors` de seguridad no muestra avisos nuevos.
- [ ] `/juegos/serpentina/jugar` muestra el canvas dentro del CRT con el overlay "PULSA ESPACIO_" y la serpiente no se mueve hasta arrancar.
- [ ] Espacio o clic en el CRT arrancan la partida; esa pulsación no cambia la dirección de la serpiente.
- [ ] La serpiente empieza con 4 segmentos en el centro, avanzando hacia la derecha a un tick cada 120 ms.
- [ ] Flechas y WASD giran; pulsar la dirección contraria a la actual no hace nada; dos giros rápidos dentro del mismo tick (p. ej. `↑` y `←` yendo a la derecha) se aplican en los dos ticks siguientes.
- [ ] Mantener pulsada una tecla de dirección no encola giros repetidos.
- [ ] El núcleo nunca aparece sobre la serpiente.
- [ ] Comer un núcleo en nivel 1 suma 10 puntos y alarga la serpiente un segmento; en nivel 2 suma 20.
- [ ] Tras 5 núcleos el nivel del HUD pasa a 02 y el tick baja a 110 ms; desde el nivel 8 el tick se queda en 50 ms.
- [ ] Salir de la grilla por cualquier borde termina la partida; atravesar los bordes no existe.
- [ ] Morder el propio cuerpo termina la partida; entrar en la celda que deja libre la cola en ese mismo tick no la termina.
- [ ] El HUD muestra Puntuación, Vidas (♥) y Nivel; al morir, Vidas pasa a "—".
- [ ] El canvas no pinta puntuación, vidas, nivel, pausa ni GAME OVER.
- [ ] La serpiente es verde con la cabeza más clara y con glow, el núcleo es magenta con glow y pulso, y el cuerpo no tiene glow.
- [ ] El canvas ocupa `.crt-screen`, se ve nítido con `devicePixelRatio` 2 y a 375 px de ancho no hay scroll horizontal.
- [ ] PAUSA, `P` y `Escape` pausan y reanudan; cambiar de pestaña o ventana deja la partida en pausa.
- [ ] Al chocar, la serpiente se queda quieta y parpadea en magenta, y `GameOverModal` se abre con la puntuación final aproximadamente 1 s después; pausar durante ese segundo y reanudar sigue llevando al modal.
- [ ] FIN abre `GameOverModal` con la puntuación actual y el juego se detiene.
- [ ] Guardar con iniciales muestra "PUNTUACIÓN GUARDADA · PUESTO #NN" y la fila aparece en `/juegos/serpentina` y en `/salon?juego=serpentina`.
- [ ] La tarjeta de SERPENTINA en `/biblioteca` muestra la mejor puntuación real.
- [ ] "JUGAR DE NUEVO" empieza una partida con la serpiente inicial, puntuación 0, una vida y nivel 01, y su modal vuelve a permitir guardar.
- [ ] Con el modal abierto se pueden escribir iniciales con espacios y con las letras W, A, S y D; flechas y Espacio no hacen scroll mientras se juega.
- [ ] Salir y volver a entrar no deja listeners ni bucles duplicados (también en `npm run dev` con StrictMode): la velocidad es la misma y no hay errores en la consola.
- [ ] `/juegos/rocas/jugar`, `/juegos/caida/jugar` y los juegos simulados siguen funcionando igual.
- [ ] No hay ningún import de `reference/` en `app/`, `components/` ni `lib/`, y no hay ningún archivo de `05-snake-assets` en `public/`.

## Decisiones

- **Sí:** reusar la entrada `serpentina`. Ya describe este juego y tiene portada (`cover-snake`), color verde y `sort_order` 3.
- **No:** id nuevo. Duplicaría el juego en el catálogo.
- **Sí:** mantener el texto `long` actual. Núcleos magenta, crecer, acelerar y morderse a sí misma: todo existe en el juego. Que los muros maten no lo contradice.
- **Sí:** juego original del género, diseñado desde cero. No hay `game.js` que portar.
- **Sí:** núcleos neón dibujados en canvas en lugar de los sprites de `fruits.png`. Las imágenes son un rip del Snake de Google (copyright de terceros), y el estilo neón es el de ROCAS y CAÍDA.
- **No:** copiar `fruits.png` a `public/games/serpentina/` ni corregir el atlas de `sprites.js`. Si algún día se usan sprites, necesitarán arte con licencia propia y su spec.
- **Sí:** muro = muerte. Es la regla clásica y la más fácil de leer en una grilla que llena el CRT.
- **No:** atravesar los bordes (wrap).
- **Sí:** una sola vida con `PlayerHud` sin cambios: ♥ jugando y "—" al morir. Es el cambio mínimo y coherente con la casilla Vidas.
- **No:** 3 vidas con respawn ni una casilla "Longitud" nueva en `PlayerHud`.
- **Sí:** grilla de 40×30 con celdas de 20 px, que llena el canvas lógico de 800×600 sin márgenes.
- **Sí:** tick de 120 ms que baja 10 ms por nivel hasta 50 ms; nivel cada 5 núcleos. La velocidad es el reto, como dice el texto `long`.
- **Sí:** `10 × nivel` por núcleo. Premia aguantar a alta velocidad.
- **Sí:** flechas y WASD con cola de 2 giros, sin 180° y sin autorepeat. Los giros rápidos no se pierden y no hay muertes injustas por invertir la dirección.
- **Sí:** Espacio o clic para arrancar, como ROCAS y CAÍDA. Espacio no tiene acción dentro del juego, así que la pulsación que arranca nunca actúa.
- **Sí:** `GAMEOVER_DELAY` de 1 s con la serpiente congelada parpadeando en magenta. Se ve el choque antes del modal, como en los otros juegos.
- **Sí:** llenar el tablero termina la partida. Es el único final posible sin más mecánicas, y el modal deja guardar la puntuación.
- **No:** obstáculos, power-ups ni núcleos bonus. Irán en otra spec cuando el juego base esté jugable.
- **Sí:** glow solo en la cabeza y el núcleo. Hasta 1200 segmentos con `shadowBlur` bajarían los FPS.
- **No:** cambios en `CLAUDE.md`. El juego no introduce nada nuevo en el patrón (sin assets, sin ratón y con canvas 4:3).

## Riesgos

| Riesgo                                                           | Mitigación                                                                                                |
| ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| StrictMode monta dos veces en dev: bucles o listeners duplicados | Instancia en `useEffect` y `destroy()` en el cleanup; criterio de aceptación explícito.                   |
| `preventDefault` bloquea escribir en el input del modal          | Solo fuera de `over` y nunca si el `target` es `input` o `textarea`; WASD nunca se bloquea.               |
| El motor recibe WASD mientras se escriben iniciales              | El motor solo encola giros en estado `playing`; en `over` el motor está en `gameover`.                    |
| Dos giros en el mismo tick producen un giro de 180° y una muerte | Cola de giros validada contra el último giro encolado, no contra la dirección actual; criterio explícito. |
| La cola se cuenta como colisión al perseguirla                   | `hitsBody` ignora la cola cuando ese tick no crece; criterio explícito.                                   |
| Salto de `dt` al reanudar tras una pausa larga                   | `resume()` reinicia `lastTime`; `dt` limitado a 50 ms, así que como mucho avanza un tick por frame.       |
| Se olvida `accepts_scores` y el guardado falla por RLS           | Paso 1 del plan y criterio de inserción con la publishable key.                                           |
| `db push` escribe en el único entorno, el remoto                 | Revisar el SQL con el usuario antes de aplicarlo; la migración solo cambia una fila.                      |
| `randomFreeCell` lenta o infinita con la serpiente muy larga     | Recorrer las celdas libres y elegir una al azar en lugar de reintentar; `null` si no queda ninguna.       |
| `shadowBlur` en todo baja los FPS                                | Glow solo en la cabeza y el núcleo.                                                                       |
| Se cuela un asset con copyright en el repo publicado             | No se copia nada de `05-snake-assets` a `public/`; criterio de aceptación explícito.                      |

## Lo que **no** entra en esta spec

- Controles táctiles.
- Sprites de `fruits.png` y cualquier arte de terceros.
- Obstáculos, power-ups, núcleos bonus, atravesar bordes y varias vidas.
- Sonido y música.
- Cambios en el texto, la portada o la página de detalle de `serpentina`.
- Framework de tests.

Cada uno de estos, si llega, va en su propia spec.
