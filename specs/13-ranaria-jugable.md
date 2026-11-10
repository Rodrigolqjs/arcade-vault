# SPEC ranaria/02 — Cruce de carriles sin fin jugable en RANARIA

> **Estado:** APROVADA
> **Depende de:** SPEC 05, SPEC 06, SPEC 07, SPEC ranaria/01
> **Fecha:** 2026-11-06
> **Objetivo:** Crear un juego original de cruce de carriles por tramos sin fin (carretera, río con troncos que se hunden y nenúfares como meta, con reloj de 30 s por tramo) y montarlo en `/juegos/ranaria/jugar` con el HUD, la pausa, el modal de fin de juego y el leaderboard real de la plataforma.

## Por qué existe esta spec

`ranaria` es hoy un juego simulado. Tras la SPEC `ranaria/01`, su texto del catálogo ya describe este juego: "Salta carril a carril entre tráfico neón y troncos a la deriva hasta tocar un nenúfar. Cada nenúfar abre un tramo nuevo, más rápido y con menos nenúfares, y el reloj vuelve a 30 segundos. Ojo con los troncos que parpadean: están a punto de hundirse."

Es la única mecánica de timing y esquiva que falta en el catálogo: ROCAS es un shooter, CAÍDA un puzzle, SERPENTINA y BLOQUE BUSTER se juegan con reflejos sobre un objeto propio, no leyendo el ritmo de varios carriles a la vez.

No hay un juego de referencia que portar: `reference/resources/started-games/` no tiene ninguna carpeta de este género. El motor se diseña desde cero dentro del género "cruzar carriles" con una identidad propia que no copia ningún juego comercial concreto:

- No hay una pantalla fija con una fila de casillas de meta que rellenar. Basta con tocar **un** nenúfar, y cada nenúfar genera un tramo nuevo al azar: el juego no acaba nunca por completarlo.
- Cada tramo es más rápido y tiene menos nenúfares (de 4 a 2).
- La mecánica propia son los troncos que avisan parpadeando 1 s antes de hundirse.
- No hay tortugas, cocodrilos, moscas, nutrias ni ningún personaje, nivel o sonido de un juego comercial. Todo se dibuja con formas neón.

El motor sigue el patrón de ROCAS, CAÍDA, SERPENTINA y BLOQUE BUSTER:

- Sin globals, con canvas lógico de 800×600.
- Listeners que se limpian en `destroy()`.
- Avisa a React de la puntuación, las vidas, el nivel, el tiempo y el fin de partida.

## Alcance

**Dentro:**

- Migración `supabase/migrations/*_ranaria_jugable.sql`: `accepts_scores = true` para `ranaria`. El texto `long` no cambia (lo fijó la SPEC `ranaria/01`).
- Motor en TypeScript en `lib/games/ranaria/` con esta jugabilidad:
  - **Tablero:** rejilla de 16 columnas × 12 filas con celdas de 50 px, que ocupa todo el canvas de 800×600. De arriba abajo:
    - Fila 0: meta, agua oscura con los nenúfares.
    - Filas 1–4: río, 4 carriles de troncos.
    - Fila 5: arcén, zona segura.
    - Filas 6–10: carretera, 5 carriles de vehículos.
    - Fila 11: orilla de salida, zona segura.
  - **Rana:** empieza en la columna 7 de la fila 11 (`x = 350`). Cada pulsación de `←` `↑` `→` `↓` o `W` `A` `S` `D` la hace saltar una celda (50 px) en esa dirección, al instante. Un salto como máximo por frame (si llegan dos en el mismo frame, vale el último).
    - No puede bajar de la fila 11 ni salir por los lados al saltar: `x` se limita a `0…750`.
    - Al saltar a una fila que no es del río, `x` se ajusta a la columna más cercana (`round(x / 50) × 50`).
    - Las pulsaciones con autorepeat (`event.repeat`) se ignoran: mantener una tecla no encadena saltos.
    - Caja de choque: de `x + 10` a `x + 40` en horizontal, dentro de su fila. Su centro es `x + 25`.
  - **Carriles:** cada carril tiene una velocidad con signo (px/s) y una lista de objetos (vehículos o troncos) de 1 a 4 celdas de largo, que se mueven en bucle sobre un recorrido de 1200 px (de `x = −200` a `x = 1000`), así que entran y salen por los bordes sin saltos visibles.
    - Los carriles contiguos de un mismo tipo alternan el sentido; el sentido del primero es al azar.
    - **Carretera:** cada carril tiene una velocidad base al azar entre 60 y 140 px/s. Vehículos de 1 celda (coche, el doble de probable), 2 celdas (furgoneta) o 3 celdas (camión), separados por huecos de 3 a 6 celdas.
    - **Río:** cada carril tiene una velocidad base al azar entre 40 y 100 px/s. Troncos de 2, 3 o 4 celdas separados por huecos de 2 a 4 celdas.
    - Velocidad real = base × multiplicador del tramo, redondeada a px/s entero.
  - **Muertes** (la rana pierde una vida):
    - Su caja de choque se solapa con un vehículo de su carril (caja del vehículo recortada 4 px por cada lado).
    - Está en una fila del río y su centro no está sobre un tronco a flote.
    - Un tronco la arrastra hasta que su centro sale del canvas (`< 0` o `> 800`).
    - Salta a la fila 0 y su centro no está a 30 px o menos del centro de un nenúfar (cae al agua).
    - El reloj del tramo llega a 0.
  - **Troncos sobre el río:** mientras la rana está en una fila del río, el tronco la arrastra a la velocidad de su carril.
  - **Troncos que se hunden:** en cada tramo, `min(4, tramo)` carriles del río, elegidos al azar, son carriles de hundimiento (1 en el tramo 1 y los 4 desde el tramo 4).
    - Cada tronco de esos carriles repite un ciclo de 5,5 s: 3 s a flote, 1 s a flote parpadeando (aviso; aún aguanta a la rana) y 1,5 s hundido (no aguanta; si la rana está encima, se ahoga).
    - Los troncos de un carril tienen las fases repartidas a partes iguales (`i × 5,5 s / n`, más un desfase al azar común al carril), así que en un carril nunca hay más de 2 troncos hundidos a la vez.
  - **Nenúfares:** `max(2, 5 − tramo)` nenúfares en la fila 0 (4 en el tramo 1, 3 en el tramo 2 y 2 desde el tramo 3), en columnas al azar entre la 1 y la 14, separados al menos 3 columnas. Basta con tocar uno para completar el tramo.
  - **Tramos:** al tocar un nenúfar se genera al instante el tramo siguiente (carriles, troncos que se hunden y nenúfares nuevos al azar), la rana vuelve a la columna 7 de la fila 11 y el reloj vuelve a 30 s.
    - Multiplicador de velocidad del tramo: `min(2.2, 1 + 0.12 × (tramo − 1))` (×1 en el tramo 1, ×1,12 en el 2, ×1,48 en el 5 y ×2,2 desde el 11).
    - Sin tope de tramos.
  - **Reloj:** 30 s por tramo. Baja solo mientras se juega (no en pausa ni durante el respawn). Vuelve a 30 s al empezar cada tramo y tras perder una vida.
  - **Puntuación** (sin techo):
    - `10 × tramo` por cada fila alcanzada por primera vez en el tramo actual (filas 10 a 1). La fila más alta alcanzada se guarda por tramo y no se reinicia al perder una vida, así que bajar y volver a subir, o morir y repetir, no da puntos.
    - `100 × tramo` al tocar un nenúfar.
    - Bonus de tiempo al tocar un nenúfar: `10 × tramo × segundos enteros restantes` (`floor(reloj)`).
    - Ejemplo: cruzar el tramo 1 con 18,4 s en el reloj suma 100 + 100 + 180 = 380 puntos.
  - **Vidas:** 3. Al perder una con vidas restantes, la rana parpadea en magenta donde murió durante `DEATH_DELAY` = 0,8 s (el tráfico y el río siguen moviéndose, el reloj no baja y no hay input) y después reaparece en la columna 7 de la fila 11 con el reloj a 30 s.
  - **Fin de partida:** al perder la tercera vida, el campo se congela y la rana parpadea en magenta durante `GAMEOVER_DELAY` = 1 s, sin aceptar input. Después se llama a `onGameOver(score)`.
- Sin globals: todo el estado vive en la instancia creada por `createRanariaGame()`.
- El motor añade su listener de teclado al crearse y lo elimina en `destroy()`, junto con el `requestAnimationFrame`.
- Paleta neón de la plataforma en el canvas, igual que la portada de la SPEC `ranaria/01`:
  - Rana en `--green`, el color de `ranaria` en el catálogo, con ojos en `--ink`.
  - Nenúfares como anillos `--green`.
  - Coches en `--magenta`, furgonetas en `--cyan` y camiones en `--yellow`.
  - Troncos en cian translúcido con borde `--cyan`; durante el aviso alternan cada 125 ms entre su color normal y un borde `--magenta` con relleno al 25 %; hundidos, solo un contorno en `--ink-faint` donde van a reaparecer.
  - Bandas de fondo: meta `#001f2a`, río `#002633`, arcén y orilla `--bg-3`, carretera `--bg-2` con líneas discontinuas de `--ink` al 35 % entre carriles.
  - Glow (`shadowBlur`) solo en la rana y los nenúfares. Vehículos, troncos y fondo sin glow.
- El canvas no pinta puntuación, vidas, nivel, tiempo, pausa, GAME OVER ni chuleta de controles.
- Canvas con resolución lógica 800×600, escalado por CSS al 100 % de `.crt-screen` y backing store × `devicePixelRatio`.
- `components/PlayerHud.tsx`: prop opcional `time?: number`. Si llega, se añade una casilla "Tiempo" después de "Nivel" con los segundos restantes en dos cifras; con 5 s o menos se pone en magenta y parpadea. Los demás juegos no la pasan y se ven igual.
- `components/games/RanariaPlayer.tsx`: HUD de la plataforma (Puntuación, Vidas con 3 ♥, Nivel = tramo y Tiempo), CRT con el canvas, overlays y `GameOverModal` con `saveable`.
- Fases en React: `ready` → `playing` ⇄ `paused` → `over`, como en la SPEC 05.
  - En `ready` el canvas muestra el tramo 1 con la rana en la salida, todo quieto.
  - Se arranca con Espacio o con un clic en el CRT, y esa pulsación no hace saltar a la rana.
- Controles: `←` `↑` `→` `↓` y `W` `A` `S` `D` saltan. `P` y `Escape` pausan.
- `preventDefault` de flechas y Espacio fuera de `over` y nunca con el foco en `input`/`textarea`.
- Registro: `ranaria` en `PLAYABLE_GAME_IDS` y su entrada en `RealGamePlayer.tsx`.

**Fuera de alcance (para futuras specs):**

- Carriles que invierten el sentido a mitad de tramo (SPEC `ranaria/03`).
- Controles táctiles (swipe o botones en pantalla).
- Vidas extra, objetos para recoger, enemigos en el río u otros tipos de carril.
- Tramos con semilla fija o reto diario.
- Scroll continuo de un tramo al siguiente.
- Sonido y música.
- Cambiar el texto `long`, la portada o la página de detalle de `ranaria`.
- Framework de tests.

## Modelo de datos

Migración (`supabase/migrations/*_ranaria_jugable.sql`, timestamp generado por `npx supabase migration new ranaria_jugable`):

```sql
-- Cruce de carriles jugable (SPEC ranaria/02): ranaria acepta puntuaciones.
update public.games
  set accepts_scores = true
where id = 'ranaria';
```

API pública del motor (`lib/games/ranaria/engine.ts`):

```ts
export interface HudState {
  score: number;
  lives: number; // 3 al empezar, 0 al perder la última
  level: number; // tramo actual, desde 1
  time: number; // segundos enteros restantes del reloj (ceil), 30…0
}
export interface RanariaEvents {
  onHud: (hud: HudState) => void; // solo cuando cambia algún valor, no cada frame
  onGameOver: (score: number) => void; // GAMEOVER_DELAY después de perder la última vida
}
export interface RanariaGame {
  start: () => void; // puntuación 0, 3 vidas, tramo 1, reloj 30 s, rana en la salida; reutiliza el tramo 1 que se ve en ready y genera uno nuevo al reiniciar
  pause: () => void; // detiene el rAF
  resume: () => void; // reanuda sin salto de dt (también durante el respawn y dying)
  end: () => number; // detiene la partida (botón FIN) y devuelve la puntuación
  destroy: () => void; // cancela el rAF y elimina los listeners
}
export function createRanariaGame(
  canvas: HTMLCanvasElement,
  events: RanariaEvents,
): RanariaGame;
```

Estado interno (no exportado):

```ts
type EngineState = "ready" | "playing" | "dying" | "gameover";
// dying: campo congelado y rana parpadeando durante GAMEOVER_DELAY, sin input.
type LaneKind = "road" | "river";
type LogState = "float" | "warn" | "under";
type Hop = "up" | "down" | "left" | "right";
interface Mover {
  x: number; // borde izquierdo en px, en el bucle −200…1000
  len: number; // largo en celdas (1–4)
  phase: number; // s dentro del ciclo de hundido; solo cuenta en carriles sinking
}
interface Lane {
  row: number; // 1–4 río, 6–10 carretera
  kind: LaneKind;
  speed: number; // px/s con signo (+ hacia la derecha)
  sinking: boolean; // sus troncos se hunden (solo río)
  movers: Mover[];
}
interface Frog {
  x: number; // borde izquierdo en px, 0–750 al saltar
  row: number; // 0–11
  hopAnim: number; // s restantes de la animación de salto
}
// lanes: Lane[]; lilies: number[] (columnas); frog: Frog; tramo: number; score: number; lives: number
// clock: number (s); bestRow: number (fila más alta del tramo, empieza en 11); pendingHop: Hop | null
// respawnTimer: number (s); dyingTimer: number (s); deathX: number; deathRow: number
```

Fase en React (`RanariaPlayer.tsx`):

```ts
type Phase = "ready" | "playing" | "paused" | "over";
```

Prop nueva de `PlayerHud` (`components/PlayerHud.tsx`):

```ts
time?: number; // si está definida, se añade la casilla "Tiempo" tras "Nivel"; ≤ 5 en magenta parpadeando
```

Constantes (`lib/games/ranaria/constants.ts`), con los valores del diseño:

```ts
export const W = 800;
export const H = 600;
export const CELL = 50;
export const COLS = 16; // W / CELL
export const ROWS = 12; // H / CELL
// Filas del tablero, de arriba abajo
export const ROW_GOAL = 0;
export const RIVER_ROWS = [1, 2, 3, 4];
export const ROW_MEDIAN = 5;
export const ROAD_ROWS = [6, 7, 8, 9, 10];
export const ROW_START = 11;
export const START_COL = 7;
export const START_LIVES = 3;
// Bucle de los carriles: los objetos viven en x ∈ [−LOOP_MARGIN, W + LOOP_MARGIN)
export const LOOP_MARGIN = 200; // px, el objeto más largo
export const LANE_LOOP = 1200; // px, W + 2 × LOOP_MARGIN
// Carretera
export const ROAD_SPEED_MIN = 60; // px/s
export const ROAD_SPEED_MAX = 140; // px/s
export const VEHICLE_LENGTHS = [1, 1, 2, 3]; // celdas; el coche, el doble de probable
export const ROAD_GAP_MIN = 3; // celdas
export const ROAD_GAP_MAX = 6; // celdas
export const VEHICLE_INSET = 4; // px por lado en la caja de choque
// Río
export const RIVER_SPEED_MIN = 40; // px/s
export const RIVER_SPEED_MAX = 100; // px/s
export const LOG_LENGTHS = [2, 3, 4]; // celdas
export const RIVER_GAP_MIN = 2; // celdas
export const RIVER_GAP_MAX = 4; // celdas
// Troncos que se hunden
export const MAX_SINKING_LANES = 4; // min(4, tramo) carriles
export const SINK_FLOAT = 3; // s a flote
export const SINK_WARN = 1; // s a flote parpadeando
export const SINK_UNDER = 1.5; // s hundido
export const SINK_CYCLE = 5.5; // SINK_FLOAT + SINK_WARN + SINK_UNDER
export const SINK_BLINK = 0.125; // s por medio parpadeo del aviso
// Nenúfares
export const LILIES_BASE = 5; // max(LILIES_MIN, LILIES_BASE − tramo)
export const LILIES_MIN = 2;
export const LILY_COL_MIN = 1;
export const LILY_COL_MAX = 14;
export const LILY_MIN_SPACING = 3; // columnas
export const LILY_CATCH = 30; // px entre el centro de la rana y el del nenúfar
export const LILY_RADIUS = 18; // px, dibujo
// Rana
export const FROG_INSET = 10; // px por lado en la caja de choque
export const FROG_SIZE = 36; // px, dibujo
export const HOP_ANIM = 0.09; // s de la animación de salto (solo visual)
// Dificultad por tramo
export const SPEED_STEP = 0.12; // multiplicador = min(MAX_SPEED_MULT, 1 + SPEED_STEP × (tramo − 1))
export const MAX_SPEED_MULT = 2.2;
export const STRETCH_TIME = 30; // s de reloj por tramo y por vida
// Puntuación (× tramo)
export const ROW_POINTS = 10; // por fila nueva del tramo
export const LILY_POINTS = 100; // por nenúfar
export const TIME_BONUS = 10; // por segundo entero restante
// Tiempos de muerte
export const DEATH_DELAY = 0.8; // s de respawn con vidas restantes
export const GAMEOVER_DELAY = 1; // s
export const DEATH_BLINK = 0.1; // s por medio parpadeo de la rana muerta
// Copia los tokens de app/globals.css; el canvas no lee variables CSS.
export const COLORS = {
  frog: "#00ff88", // --green, color de ranaria en el catálogo
  frogEyes: "#e6e9ff", // --ink
  lily: "#00ff88", // --green
  car: "#ff006e", // --magenta
  van: "#00f5ff", // --cyan
  truck: "#f5ff00", // --yellow
  log: "rgba(0, 245, 255, 0.35)", // --cyan al 35 %
  logEdge: "#00f5ff", // --cyan
  logWarn: "#ff006e", // --magenta
  logUnder: "rgba(74, 79, 112, 0.4)", // --ink-faint al 40 %
  dead: "#ff006e", // --magenta
  goal: "#001f2a",
  river: "#002633",
  bank: "#15151f", // --bg-3, arcén y orilla
  road: "#0f0f18", // --bg-2
  laneLine: "rgba(230, 233, 255, 0.35)", // --ink al 35 %
};
```

Los tonos de relleno de los vehículos, el radio de las esquinas y el alfa de las bandas se pueden afinar en el paso de aspecto con `/frontend-design`, sin cambiar qué token usa cada entidad.

## Estructura de archivos

```
app/
  globals.css                  # modificado: .hud-stat.time y .hud-stat.time.low
components/
  PlayerHud.tsx                # modificado: prop opcional time
  games/
    RealGamePlayer.tsx         # modificado: entrada ranaria
    RanariaPlayer.tsx          # nuevo ("use client"): fases, HUD, CRT, canvas, overlays, modal
lib/
  games/
    registry.ts                # modificado: ranaria en PLAYABLE_GAME_IDS
    ranaria/
      constants.ts             # nuevo: tablero, carriles, hundido, nenúfares, puntuación, colores
      entities.ts              # nuevo: generateStretch, speedMult, lilyCount, moveLane, logState, hitsVehicle, logUnder, catchesLily, draw*
      engine.ts                # nuevo: createRanariaGame()
  supabase/database.types.ts   # regenerado (sin cambios de tipos esperados)
supabase/migrations/
  *_ranaria_jugable.sql        # nuevo
CLAUDE.md                      # modificado: prop time de PlayerHud
```

`reference/` no se modifica ni se importa: no hay assets de este juego y no se copia nada a `public/`.

## Plan de implementación

Antes de escribir código, leer `node_modules/next/dist/docs/01-app/02-guides/lazy-loading.md` (`ssr: false` solo funciona dentro de Client Components), como exige `AGENTS.md`. Antes del paso 10, invocar `/frontend-design` para el aspecto del canvas, la casilla Tiempo y el overlay de inicio, como exige `CLAUDE.md`.

1. **Migración.**
   - `npx supabase migration new ranaria_jugable` y escribir el SQL del modelo de datos.
   - Revisar el SQL con el usuario.
   - `npx supabase db push --linked` y después `npm run db:types`.

   Verificación:
   - `npx supabase migration list --linked` muestra la migración en el remoto.
   - Con la publishable key, insertar en `public.scores` para `ranaria` funciona y para un juego simulado sin `accepts_scores` sigue fallando.
   - `npx tsc --noEmit` pasa.

2. **Casilla Tiempo en `PlayerHud`.**
   - Añadir la prop opcional `time?: number`. Con `time` definida, después de "Nivel" aparece `<div className="hud-stat time">` con la etiqueta "Tiempo" y `String(time).padStart(2, "0")`; con `time <= 5` lleva además la clase `low`.
   - En `app/globals.css`: `.hud-stat.time .v` en `--green` con su `text-shadow`, y `.hud-stat.time.low .v` en `--magenta` con `animation: blink 1s steps(1) infinite` (la `@keyframes blink` ya existe), sin animación con `prefers-reduced-motion: reduce`.

   Verificación: `/juegos/rocas/jugar`, `/juegos/caida/jugar`, `/juegos/serpentina/jugar`, `/juegos/bloque-buster/jugar` y los simulados muestran el mismo HUD que antes, sin casilla Tiempo; `npx tsc --noEmit` pasa.

3. **Registro y player mínimo.**
   - Añadir `ranaria` a `PLAYABLE_GAME_IDS` en `lib/games/registry.ts`.
   - Añadir su entrada `dynamic(() => import("@/components/games/RanariaPlayer"), { ssr: false })` en `components/games/RealGamePlayer.tsx`.
   - Crear un `RanariaPlayer.tsx` mínimo: `PlayerHud` con puntuación 0, 3 vidas, nivel 1 y `time` 30, y el CRT con un `<canvas className="game-canvas">` negro.

   Verificación: `/juegos/ranaria/jugar` muestra el CRT vacío con el HUD "Puntuación · Vidas · Nivel · Tiempo"; los otros cuatro juegos reales y los simulados siguen igual; `npm run build` pasa.

4. **Constantes y generación de tramos.**
   - `lib/games/ranaria/constants.ts` con los valores del modelo de datos.
   - En `lib/games/ranaria/entities.ts`, funciones puras tipadas:
     - `speedMult(tramo)` y `lilyCount(tramo)`.
     - `fillLane(row, kind, tramo, dir)`: elige la velocidad base, y desde un cursor en 0 coloca objetos de largo al azar mientras `cursor + len + gapMin ≤ 24` celdas, avanzando `len + gap` al azar; después desplaza todo el carril un valor al azar del bucle.
     - `pickLilies(count)`: columnas al azar en 1–14 separadas al menos 3.
     - `generateStretch(tramo)`: los 9 carriles con sentidos alternos, los `min(4, tramo)` carriles de hundimiento al azar con las fases `i × SINK_CYCLE / n` más un desfase común, y los nenúfares.

   Verificación: `npx tsc --noEmit` y `npm run lint` pasan.

5. **Entidades: movimiento, colisiones y dibujo.** En `entities.ts`, funciones puras que reciben el estado como parámetro:
   - `moveLane(lane, dt)`: mueve los objetos y los devuelve al bucle `−200…1000`.
   - `logState(mover, lane, t)`: `float`, `warn` o `under` según `(t + phase) mod 5,5` (siempre `float` si el carril no se hunde).
   - `hitsVehicle(lane, frogX)`, `logUnder(lane, frogX, t)` (el tronco a flote bajo el centro de la rana, o `null`) y `catchesLily(lilies, frogX)`.
   - `drawBands(ctx)`, `drawLane(ctx, lane, t)`, `drawLilies(ctx, lilies, t)` y `drawFrog(ctx, frog, color)`.

   Verificación: `npx tsc --noEmit` y `npm run lint` pasan.

6. **Motor (a): bucle, input, saltos y dibujo.** `lib/games/ranaria/engine.ts` con `createRanariaGame(canvas, events)`:
   - Backing store `W × dpr` por `H × dpr` y `setTransform(dpr…)`.
   - Listener `keydown` en `window`, añadido al crear y eliminado en `destroy()`:
     - Las flechas y WASD guardan `pendingHop` solo en estado `playing` y fuera del respawn, sin `event.repeat`.
     - El motor no maneja `P`, `Escape` ni Espacio.
   - Bucle `requestAnimationFrame` con `dt` limitado a 50 ms; `resume()` reinicia `lastTime`.
   - En cada frame: mover los 9 carriles, aplicar `pendingHop` (límites `0…750` y filas `0…11`, ajuste a columna fuera del río) y arrastrar a la rana si está en el río.
   - Dibujo: bandas, líneas de carril, nenúfares con glow, troncos, vehículos y rana con glow.
   - Al crear se genera y se dibuja el tramo 1 quieto. `start`, `pause`, `resume`, `end` y `destroy`.
   - En este paso la rana no muere y la fila 0 no hace nada.

   Verificación: `npx tsc --noEmit` pasa.

7. **Motor (b): muertes, vidas y reloj.**
   - Comprobar en cada frame, tras moverse: vehículo, agua, tronco hundido y arrastre fuera del canvas; el reloj baja `dt` y en 0 también mata.
   - Con vidas restantes: `lives − 1`, `respawnTimer = 0,8 s` con la rana parpadeando en magenta en el punto de muerte, sin input y con el reloj quieto; después, rana en la salida y reloj a 30 s.
   - Con la última vida: `lives = 0`, estado `dying`, campo congelado y `onGameOver(score)` tras `GAMEOVER_DELAY`.
   - `onHud` solo cuando cambia `score`, `lives`, `level` o `time` (`ceil(clock)`), comparando con el último enviado.

   Verificación: `npx tsc --noEmit` y `npm run lint` pasan.

8. **Motor (c): troncos que se hunden.**
   - Llevar el tiempo `t` del tramo y aplicar `logState` al dibujo: aviso con parpadeo cada 125 ms y tronco hundido como contorno tenue.
   - Un tronco `under` no aguanta a la rana: si está encima, se ahoga.

   Verificación: `npx tsc --noEmit` y `npm run lint` pasan.

9. **Motor (d): puntuación, nenúfares y tramos.**
   - Fila nueva del tramo (`row < bestRow`): sumar `ROW_POINTS × tramo` y actualizar `bestRow`.
   - Saltar a la fila 0: con `catchesLily`, sumar `LILY_POINTS × tramo + TIME_BONUS × tramo × floor(clock)`, incrementar el tramo, `generateStretch`, rana en la salida, `bestRow = 11` y reloj a 30 s; sin nenúfar, la rana muere.

   Verificación: `npx tsc --noEmit` y `npm run lint` pasan.

10. **Conectar el motor y aspecto** (tras `/frontend-design`). En `RanariaPlayer.tsx`, copiando el patrón de `SnakePlayer.tsx`:
    - Instancia en `useEffect` y `destroy()` en el cleanup.
    - Fase `ready` con overlay `.game-start`: título `RANARIA` con `neon-green`, "PULSA ESPACIO_" y las teclas `←` `↑` `→` `↓` / `WASD` saltar.
    - El clic en el CRT también arranca.
    - HUD alimentado por `onHud`, con `time={hud.time}`.
    - Estilos nuevos en `app/globals.css` solo si hacen falta.

    Verificación: en `/juegos/ranaria/jugar` se cruza al menos un tramo y el HUD refleja puntuación, vidas, nivel y tiempo.

11. **Pausa.** Botón PAUSA/REANUDAR de `PlayerHud`, `P` y `Escape`, pausa automática con `visibilitychange` (`hidden`) y `blur`; overlay "EN PAUSA".

    Verificación: cambiar de pestaña deja el juego en pausa; al volver, los carriles, la rana y el reloj están donde estaban.

12. **Fin de partida, guardado y docs.**
    - `onGameOver` y el botón FIN pasan a `over` y abren `<GameOverModal gameId={game.id} saveable …>`.
    - "JUGAR DE NUEVO" llama a `start()`.
    - `preventDefault` de flechas y Espacio solo fuera de `over` y nunca con el foco en `input`/`textarea`.
    - `CLAUDE.md`: añadir `ranaria` a la lista de juegos jugables y la prop opcional `time` de `PlayerHud`, que añade la casilla "Tiempo" (la usa RANARIA).

    Verificación:
    - Tras perder se escriben iniciales con espacios, GUARDAR muestra el puesto y "VER SALÓN DE LA FAMA" lleva a `/salon?juego=ranaria` con la fila.
    - `npm run lint`, `npx tsc --noEmit` y `npm run build` terminan sin errores.

## Criterios de aceptación

- [ ] `npm run build`, `npm run lint` y `npx tsc --noEmit` terminan sin errores.
- [ ] `npx supabase migration list --linked` muestra la migración `ranaria_jugable` aplicada en el remoto.
- [ ] Con la publishable key, insertar en `public.scores` para `ranaria` funciona.
- [ ] `get_advisors` de seguridad no muestra avisos nuevos.
- [ ] `/juegos/ranaria/jugar` muestra el canvas dentro del CRT con el overlay "PULSA ESPACIO_"; detrás se ve el tramo 1 quieto y nada se mueve hasta arrancar.
- [ ] Espacio o clic en el CRT arrancan la partida; esa pulsación no hace saltar a la rana.
- [ ] La rana empieza en la columna 7 de la fila 11 con el HUD en 0 puntos, ♥ ♥ ♥, nivel 01 y tiempo 30.
- [ ] Cada pulsación de flecha o WASD mueve la rana exactamente 50 px; mantener la tecla pulsada da un solo salto.
- [ ] La rana no puede bajar de la fila 11 ni salir por los lados al saltar.
- [ ] El tramo 1 tiene 5 carriles de vehículos, 4 de troncos, un arcén y 4 nenúfares; el tramo 2, 3 nenúfares; el tramo 3 y siguientes, 2.
- [ ] Los carriles contiguos del mismo tipo se mueven en sentidos opuestos y los objetos entran y salen por los bordes sin saltos visibles.
- [ ] Tocar un vehículo, caer al agua, quedarse sobre un tronco hundido, salir arrastrada del canvas, saltar a la fila 0 fuera de un nenúfar o llegar a 0 s quitan una vida.
- [ ] Sobre un tronco, la rana avanza con él a la velocidad del carril.
- [ ] En el tramo 1 hay exactamente 1 carril de troncos que se hunden, y en el tramo 4 y siguientes los 4.
- [ ] Un tronco que se hunde parpadea durante 1 s antes de hundirse, sigue aguantando a la rana mientras parpadea, pasa 1,5 s hundido y reaparece en su sitio; nunca hay más de 2 troncos hundidos a la vez en un carril.
- [ ] Cada fila nueva del tramo suma `10 × tramo`; volver a pisar una fila ya alcanzada en el mismo tramo, aunque sea tras perder una vida, no suma nada.
- [ ] Tocar un nenúfar en el tramo 1 con 18,4 s en el reloj deja la partida en 380 puntos si se cruzó sin retroceder ni morir.
- [ ] Al tocar un nenúfar, el nivel del HUD sube 1, el tramo se genera de nuevo, la rana vuelve a la salida y el tiempo vuelve a 30.
- [ ] En el tramo 2 los carriles van a ×1,12 de su velocidad base, y desde el tramo 11 a ×2,2.
- [ ] El reloj baja 1 por segundo jugando; con 5 o menos, la casilla Tiempo se pone en magenta y parpadea.
- [ ] Al perder una vida con vidas restantes, la rana parpadea en magenta 0,8 s mientras los carriles siguen moviéndose, y después reaparece en la salida con el tiempo a 30.
- [ ] El HUD muestra Puntuación, Vidas (♥), Nivel y Tiempo; al perder la tercera vida, Vidas pasa a "—".
- [ ] Los demás juegos reales y los simulados no muestran la casilla Tiempo.
- [ ] El canvas no pinta puntuación, vidas, nivel, tiempo, pausa ni GAME OVER.
- [ ] La rana es verde con ojos claros y glow; los nenúfares son anillos verdes con glow; coches magenta, furgonetas cian y camiones amarillos sin glow; troncos cian translúcidos sin glow.
- [ ] El canvas ocupa `.crt-screen`, se ve nítido con `devicePixelRatio` 2 y a 375 px de ancho no hay scroll horizontal.
- [ ] PAUSA, `P` y `Escape` pausan y reanudan; cambiar de pestaña o ventana deja la partida en pausa y el reloj no baja mientras está en pausa.
- [ ] Al perder la última vida, el campo se congela, la rana parpadea en magenta y `GameOverModal` se abre con la puntuación final aproximadamente 1 s después; pausar durante ese segundo y reanudar sigue llevando al modal.
- [ ] FIN abre `GameOverModal` con la puntuación actual y el juego se detiene.
- [ ] Guardar con iniciales muestra "PUNTUACIÓN GUARDADA · PUESTO #NN" y la fila aparece en `/juegos/ranaria` y en `/salon?juego=ranaria`.
- [ ] La tarjeta de RANARIA en `/biblioteca` muestra la mejor puntuación real.
- [ ] "JUGAR DE NUEVO" empieza una partida con un tramo 1 nuevo, puntuación 0, 3 vidas, nivel 01 y tiempo 30, y su modal vuelve a permitir guardar.
- [ ] Con el modal abierto se pueden escribir iniciales con espacios y con las letras W, A, S y D; flechas y Espacio no hacen scroll mientras se juega.
- [ ] Salir y volver a entrar no deja listeners ni bucles duplicados (también en `npm run dev` con StrictMode): la velocidad es la misma, un salto mueve 50 px y no hay errores en la consola.
- [ ] `/juegos/rocas/jugar`, `/juegos/caida/jugar`, `/juegos/serpentina/jugar`, `/juegos/bloque-buster/jugar` y los juegos simulados siguen funcionando igual.
- [ ] No hay ningún import de `reference/` en `app/`, `components/` ni `lib/`.

## Decisiones

- **Sí:** reusar la entrada `ranaria` con el texto de la SPEC `ranaria/01`. Cada promesa del `long` tiene aquí una regla con números.
- **No:** cambiar el texto `long` en esta migración. Ya lo fijó la SPEC `ranaria/01`.
- **Sí:** juego original del género, diseñado desde cero. No hay carpeta de referencia que portar.
- **Sí:** tocar un solo nenúfar completa el tramo. Evita la fila fija de casillas que rellenar de los juegos comerciales del género y mantiene el ritmo de "tramos sin fin".
- **No:** una pantalla con scroll continuo. Un tramo por pantalla cabe en una spec de motor y se lee en 10 segundos; el scroll queda fuera de alcance.
- **Sí:** rejilla de 16 × 12 con celdas de 50 px. Llena el canvas de 800×600 sin márgenes y deja 9 carriles, un arcén y dos zonas seguras.
- **Sí:** salto instantáneo de una celda por pulsación, sin autorepeat. El timing es el reto y mantener una tecla no debe cruzar la carretera sola.
- **Sí:** `x` continua sobre el río y ajustada a columna fuera de él. Los troncos arrastran con suavidad y en tierra la rana vuelve a la rejilla, que se lee mejor.
- **Sí:** saltar nunca saca a la rana del canvas; solo el arrastre de un tronco la mata por el borde. Morir por pulsar de más contra el borde se siente injusto.
- **Sí:** 3 vidas con `PlayerHud` mostrando corazones. Es el patrón de ROCAS y BLOQUE BUSTER y deja aprender los troncos que se hunden sin perder la partida a la primera.
- **Sí:** casilla "Tiempo" nueva en `PlayerHud` (prop opcional `time`). El reloj de 30 s es parte del tema y el canvas no pinta HUD; es el mismo tipo de cambio que la prop `lines` de la SPEC 08.
- **No:** una barra de tiempo dibujada en el canvas. Rompería la regla de que el canvas no pinta HUD.
- **Sí:** el reloj vuelve a 30 s también tras perder una vida. Sin eso, una muerte con 2 s en el reloj encadenaría otra muerte injusta.
- **Sí:** puntos solo por fila nueva del tramo, guardando la fila más alta aunque se pierda una vida. Impide farmear subiendo y bajando o muriendo a propósito.
- **Sí:** `100 × tramo` por nenúfar y `10 × tramo × segundos restantes` de bonus. Premia cruzar rápido y aguantar tramos altos, sin techo.
- **Sí:** multiplicador `1 + 0,12 × (tramo − 1)` con tope ×2,2 y nenúfares de 4 a 2. La dificultad sube rápido al principio y se estabiliza en un nivel exigente pero jugable.
- **Sí:** troncos que se hunden en `min(4, tramo)` carriles con aviso de 1 s. Es la mecánica propia del juego; aparece ya en el tramo 1 para que se aprenda pronto.
- **Sí:** fases repartidas a partes iguales dentro del carril. Garantiza que nunca se hunden todos los troncos de un carril a la vez.
- **Sí:** el tramo 1 que se ve en `ready` es el que se juega; "JUGAR DE NUEVO" genera otro. Evita que el campo cambie al pulsar Espacio.
- **Sí:** Espacio o clic para arrancar, como en los otros juegos. Espacio no tiene acción en el juego, así que la pulsación que arranca nunca hace saltar a la rana.
- **Sí:** glow solo en la rana y los nenúfares. Hasta ~40 vehículos y troncos con `shadowBlur` bajarían los FPS.
- **No:** tortugas, cocodrilos, moscas ni ningún elemento de un juego comercial concreto. El juego tiene identidad propia.
- **No:** semilla fija para los tramos. El azar sin semilla basta para el juego base; el reto diario queda fuera de alcance.
- **Sí:** actualizar `CLAUDE.md` con la prop `time`. Es un cambio del patrón compartido, como la prop `lines`.

## Riesgos

| Riesgo                                                              | Mitigación                                                                                                                  |
| ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| StrictMode monta dos veces en dev: bucles o listeners duplicados    | Instancia en `useEffect` y `destroy()` en el cleanup; criterio de aceptación explícito.                                     |
| `preventDefault` bloquea escribir en el input del modal             | Solo fuera de `over` y nunca si el `target` es `input` o `textarea`; WASD nunca se bloquea.                                 |
| El motor recibe WASD mientras se escriben iniciales                 | El motor solo guarda saltos en estado `playing`; en `over` el motor está en `gameover`.                                     |
| La pulsación que arranca la partida hace saltar a la rana           | Espacio no es una tecla de salto y `start()` vacía `pendingHop`.                                                            |
| Salto de `dt` al reanudar tras una pausa larga                      | `resume()` reinicia `lastTime`; `dt` limitado a 50 ms.                                                                      |
| Se olvida `accepts_scores` y el guardado falla por RLS              | Paso 1 del plan y criterio de inserción con la publishable key.                                                             |
| `db push` escribe en el único entorno, el remoto                    | Revisar el SQL con el usuario antes de aplicarlo; la migración solo cambia una fila.                                        |
| Un tramo generado al azar es imposible de cruzar                    | Huecos mínimos de 3 celdas en la carretera, troncos de 2–4 celdas con huecos de 2–4 en el río y fases repartidas al hundir. |
| Todos los troncos de un carril hundidos a la vez                    | Fases `i × 5,5 s / n` sin desfase individual; criterio de "nunca más de 2 hundidos".                                        |
| Farmear puntos subiendo y bajando o muriendo a propósito            | `bestRow` por tramo que no se reinicia al morir; criterio explícito.                                                        |
| La casilla Tiempo cambia el HUD de los otros juegos                 | Prop opcional; sin `time` no se renderiza; criterio con los otros cuatro juegos reales.                                     |
| `onHud` en cada frame por el reloj                                  | Se envía `ceil(clock)` y solo cuando cambia: como mucho una vez por segundo más los cambios de puntos y vidas.              |
| La puntuación supera el máximo de 10.000.000 que acepta `saveScore` | Harían falta unos 200 tramos seguidos (unos 500 × tramo por tramo); no se añade un tope en el motor.                                                     |
| `shadowBlur` en todo baja los FPS                                   | Glow solo en la rana y los nenúfares.                                                                                       |
| El diseño acaba pareciéndose a un juego comercial concreto          | Un nenúfar basta, tramos al azar sin fin, troncos que se hunden propios y sin personajes ni elementos de terceros.          |

## Lo que **no** entra en esta spec

- Carriles que invierten el sentido (SPEC `ranaria/03`).
- Controles táctiles.
- Vidas extra, objetos, enemigos en el río y otros tipos de carril.
- Tramos con semilla o reto diario, y scroll continuo.
- Sonido y música.
- Cambios en el texto, la portada o la página de detalle de `ranaria`.
- Framework de tests.

Cada uno de estos, si llega, va en su propia spec.
