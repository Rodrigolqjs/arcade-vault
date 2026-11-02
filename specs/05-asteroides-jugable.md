# SPEC 05 — Asteroides jugable en ROCAS

> **Estado:** Implementada
> **Depende de:** SPEC 01, SPEC 02
> **Fecha:** 2026-10-27
> **Objetivo:** Portar a TypeScript el juego de asteroides de `reference/resources/started-games/02-asteroids/` y montarlo en `/juegos/rocas/jugar`, usando el HUD, la pausa y el modal de fin de juego de la plataforma.

## Por qué existe esta spec

Hasta ahora `/juegos/[id]/jugar` monta `components/GamePlayer.tsx`, que simula una partida subiendo la puntuación con un temporizador. Este es el primer juego real de la plataforma. El original es un único `game.js` (canvas 800×600, sin dependencias) con globals, listeners en `window` que nunca se eliminan y su propio HUD y pantalla de GAME OVER pintados en el canvas. Para vivir dentro de una app de React hay que encapsularlo: un motor sin React que se crea y se destruye con el componente y que avisa a React de la puntuación, las vidas, el nivel y el fin de partida.

El catálogo ya tiene la entrada `rocas` ("Pulveriza asteroides en gravedad cero"), así que el juego ocupa ese hueco. Los otros 7 juegos siguen con el reproductor simulado. Esta spec también deja el mecanismo (registro de juegos jugables) que usarán Tetris y Arkanoid (`reference/resources/started-games/03-tetris`, `04-arkanoid`).

## Alcance

**Dentro:**

- Motor en TypeScript en `lib/games/asteroids/`, portado de `game.js` con la misma jugabilidad:
  - Nave con rotación, propulsión, inercia (`DRAG 0.987`) y disparo con cooldown de 0,2 s.
  - Espacio toroidal (`wrap`) en un área lógica de 800×600.
  - Asteroides de tamaño 3/2/1 que se parten; 20/50/100 puntos.
  - Power-up de triple disparo (15 % de probabilidad, garantizado a la 5ª destrucción, uno por nivel, dura 5 s, desaparece a los 12 s).
  - 3 vidas, 2 s de espera tras morir, 3 s de invencibilidad con parpadeo al reaparecer.
  - Nivel N+1 con `3 + N` asteroides grandes al limpiar la pantalla, fuera de un radio de 130 px del centro.
  - Partículas de explosión.
- Sin globals: todo el estado vive dentro de la instancia creada por `createAsteroidsGame()`. Las entidades dibujan con `draw(ctx)` en lugar de un `ctx` global.
- El motor añade sus listeners de teclado al crearse y los elimina en `destroy()`, junto con el `requestAnimationFrame`.
- Paleta neón de la plataforma en el canvas: nave cian, asteroides amarillos, balas color `--ink`, power-up e indicador 3x magenta, con glow (`shadowBlur`).
- El canvas deja de pintar `SCORE`, `NIVEL`, las vidas y el overlay `GAME OVER`. Solo conserva el indicador `3x  N.Ns` mientras dura el power-up.
- Canvas con resolución lógica 800×600, escalado por CSS al 100 % de `.crt-screen` (ya es 4:3) y con el backing store multiplicado por `devicePixelRatio`.
- `components/games/AsteroidsPlayer.tsx`: HUD de la plataforma (Jugador, Puntuación, Vidas, Nivel), CRT con el canvas, overlays y `GameOverModal`.
- Fases de la partida en React: `ready` → `playing` ⇄ `paused` → `over`.
  - `ready`: overlay "PULSA ESPACIO" sobre el canvas. Espacio o clic en el CRT arranca.
  - `paused`: overlay "EN PAUSA" (mismo estilo que el simulado). Se entra con el botón PAUSA, con `P` o `Escape`, y automáticamente al perder el foco (`visibilitychange` a `hidden` o `blur` de la ventana). Se sale con REANUDAR, `P` o `Escape`.
  - `over`: al perder la 3ª vida o al pulsar FIN se abre `GameOverModal` con la puntuación final. "JUGAR DE NUEVO" empieza otra partida directamente en `playing`.
- Flechas y Espacio no hacen scroll de la página mientras la partida está en `ready`, `playing` o `paused`. Nunca se bloquean cuando el foco está en un `input` (el de iniciales del modal).
- Registro de juegos jugables: `lib/games/registry.ts` con los ids que tienen juego real. `/juegos/[id]/jugar` monta el juego real si el id está registrado y `GamePlayer` si no.
- Extraer el HUD de `GamePlayer.tsx` a `components/PlayerHud.tsx` para que el simulado y Asteroides compartan el mismo marcado.
- `lib/games.ts`: el texto `long` de `rocas` deja de mencionar OVNIs y menciona el power-up 3x.
- `CLAUDE.md`: describir `lib/games/`, el registro y cómo se añade un juego real.

**Fuera de alcance (para futuras specs):**

- Controles táctiles o botones en pantalla para móvil.
- Persistencia de puntuaciones (Supabase), Salón de la Fama con datos reales y mejor puntuación real en el detalle. `GameOverModal` sigue con el guardado simulado.
- OVNIs, sonido, música y cualquier mecánica que no esté en `game.js`.
- Tetris, Arkanoid y el resto de juegos del catálogo.
- Cambiar la portada, `best`, `plays`, etiquetas o la página de detalle de `rocas`.
- Tabla de controles en la página de detalle.
- Framework de tests.

## Modelo de datos

API pública del motor (`lib/games/asteroids/engine.ts`):

```ts
export interface HudState {
  score: number;
  lives: number;
  level: number;
}
export interface AsteroidsEvents {
  onHud: (hud: HudState) => void; // solo cuando cambia algún valor, no cada frame
  onGameOver: (score: number) => void; // 1 s después de perder la última vida
}
export interface AsteroidsGame {
  start: () => void; // partida nueva: vidas 3, nivel 1, puntuación 0, limpia teclas pendientes
  pause: () => void; // detiene el rAF
  resume: () => void; // reanuda sin salto de dt
  end: () => number; // detiene la partida (botón FIN) y devuelve la puntuación
  destroy: () => void; // cancela el rAF y elimina los listeners
}
export function createAsteroidsGame(
  canvas: HTMLCanvasElement,
  events: AsteroidsEvents,
): AsteroidsGame;
```

Estado interno de la instancia (no exportado), igual que el original más la fase de espera:

```ts
type EngineState = "ready" | "playing" | "dead" | "gameover";
```

Fase en React (`AsteroidsPlayer.tsx`):

```ts
type Phase = "ready" | "playing" | "paused" | "over";
```

Constantes (`lib/games/asteroids/constants.ts`), con los valores de `game.js`:

```ts
export const W = 800;
export const H = 600;
export const RADII = [0, 16, 30, 50];
export const SPEEDS = [0, 85, 55, 32];
export const POINTS = [0, 100, 50, 20];
export const POWERUP_DROP_CHANCE = 0.15;
export const POWERUP_DURATION = 5;
export const POWERUP_TTL = 12;
export const TRIPLE_SPREAD = 0.18;
export const GAMEOVER_DELAY = 1;
export const COLORS = {
  ship: "#00f5ff", // --cyan
  asteroid: "#f5ff00", // --yellow
  bullet: "#e6e9ff", // --ink
  powerUp: "#ff006e", // --magenta
  thrust: "#ff006e", // --magenta
  particle: "#f5ff00", // --yellow, con alfa decreciente
};
```

Registro (`lib/games/registry.ts`), módulo plano usable desde Server Components:

```ts
export const PLAYABLE_GAME_IDS = ["rocas"] as const;
export type PlayableGameId = (typeof PLAYABLE_GAME_IDS)[number];
export function isPlayable(id: string): id is PlayableGameId;
```

Nuevo texto de `rocas.long`:

> Tu nave triangular flota en vacío absoluto. Dispara y rota para dividir rocas en fragmentos cada vez más pequeños. Atrapa el núcleo 3x para disparar en abanico durante unos segundos.

## Estructura de archivos

```
app/
  juegos/[id]/jugar/
    page.tsx                   # modificado: isPlayable(id) ? <RealGamePlayer> : <GamePlayer>
  globals.css                  # modificado: estilos del canvas y del overlay "PULSA ESPACIO"
components/
  PlayerHud.tsx                # nuevo: HUD extraído de GamePlayer (stats + acciones)
  GamePlayer.tsx               # modificado: usa PlayerHud, sin cambio visual
  games/
    RealGamePlayer.tsx         # nuevo ("use client"): mapa id → dynamic(import, { ssr: false })
    AsteroidsPlayer.tsx        # nuevo ("use client"): fases, HUD, CRT, canvas, overlays, modal
lib/
  games.ts                     # modificado: rocas.long
  games/
    registry.ts                # nuevo: PLAYABLE_GAME_IDS, isPlayable()
    asteroids/
      constants.ts             # nuevo: dimensiones, tablas por tamaño, power-up, COLORS
      entities.ts              # nuevo: Bullet, Asteroid, PowerUp, Ship, Particle
      engine.ts                # nuevo: createAsteroidsGame()
CLAUDE.md                      # modificado: lib/games/ y registro
```

`reference/resources/started-games/02-asteroids/` no se modifica ni se importa: es solo la fuente del port.

## Plan de implementación

Antes de escribir código, leer `node_modules/next/dist/docs/01-app/02-guides/lazy-loading.md` (`ssr: false` solo funciona dentro de Client Components), como exige `AGENTS.md`. Antes del paso 5 invocar `/frontend-design` para el aspecto del canvas y del overlay de inicio, como exige `CLAUDE.md`.

1. Extraer el HUD de `GamePlayer.tsx` a `components/PlayerHud.tsx` (props: nombre, puntuación, vidas, nivel, `paused`, `onTogglePause`, `onEnd`, `exitHref`). Verificación: `/juegos/caida/jugar` se ve y funciona igual que antes; `npx tsc --noEmit` y `npm run lint` pasan.
2. Crear `lib/games/registry.ts`, `components/games/RealGamePlayer.tsx` y un `AsteroidsPlayer.tsx` mínimo (HUD con valores iniciales + CRT con un `<canvas>` negro). Cambiar `app/juegos/[id]/jugar/page.tsx` para despachar con `isPlayable`. Cambiar `rocas.long` en `lib/games.ts`. Verificación: `/juegos/rocas/jugar` muestra el CRT vacío; `/juegos/caida/jugar` sigue con el simulado; `npm run build` pasa.
3. Portar `constants.ts` y `entities.ts`: clases tipadas con `update(dt)` y `draw(ctx)`, paleta `COLORS` y glow. `Ship.update` recibe el estado de teclas en lugar de leer un global. Verificación: `npx tsc --noEmit` y `npm run lint` pasan.
4. Crear `engine.ts`: estado de la instancia, input (`keys`/`justPressed` con listeners propios), `spawnAsteroids`, `nextLevel`, `killShip`, colisiones, bucle con `dt` limitado a 50 ms, ajuste a `devicePixelRatio`, indicador 3x en canvas, `onHud` solo con cambios y `onGameOver` tras `GAMEOVER_DELAY`. Implementar `start`, `pause`, `resume`, `end` y `destroy`. Verificación: `npx tsc --noEmit` pasa.
5. Conectar el motor en `AsteroidsPlayer.tsx`: crear la instancia en `useEffect` y destruirla en el cleanup; fase `ready` con overlay "PULSA ESPACIO" (Espacio o clic arrancan); HUD alimentado por `onHud`. Estilos nuevos en `app/globals.css`. Verificación: en `/juegos/rocas/jugar` se juega una partida completa y el HUD de React refleja puntuación, vidas y nivel.
6. Pausa: botón PAUSA/REANUDAR, teclas `P` y `Escape`, pausa automática con `visibilitychange` y `blur`, overlay "EN PAUSA". Verificación: cambiar de pestaña durante la partida y volver deja el juego en pausa, sin que la nave se haya movido.
7. Fin de partida: `onGameOver` y el botón FIN pasan a `over` y abren `GameOverModal`; "JUGAR DE NUEVO" llama a `start()` y vuelve a `playing`. `preventDefault` de flechas y Espacio solo en fases `ready`/`playing`/`paused` y nunca con el foco en un `input`. Verificación: tras perder, se escriben iniciales con espacios en el modal y la página no hace scroll al jugar.
8. Actualizar `CLAUDE.md`: el proyecto ya no es el scaffold; describir `lib/games/` (motores sin React), `lib/games/registry.ts`, `components/games/` y los pasos para registrar un juego real. Verificación final: `npm run lint`, `npx tsc --noEmit` y `npm run build` sin errores.

## Criterios de aceptación

- [x] `npm run build`, `npm run lint` y `npx tsc --noEmit` terminan sin errores.
- [x] `/juegos/rocas/jugar` muestra el canvas dentro del CRT con el overlay "PULSA ESPACIO" y los asteroides no se mueven hasta arrancar.
- [x] Espacio o clic en el CRT arrancan la partida, y esa pulsación de Espacio no dispara una bala.
- [x] `←`/`→` rotan, `↑` propulsa y Espacio dispara, como en el original.
- [x] Destruir un asteroide grande, mediano y pequeño suma 20, 50 y 100 puntos, y el HUD de React lo muestra.
- [x] Un asteroide grande se parte en dos medianos y un mediano en dos pequeños; los pequeños no se parten.
- [x] Al limpiar la pantalla el nivel del HUD sube en 1 y aparecen `3 + nivel` asteroides grandes.
- [x] Al chocar se pierde una vida en el HUD, la nave reaparece a los 2 s en el centro y parpadea 3 s sin poder morir.
- [x] Recoger el power-up muestra `3x` en el canvas y cada disparo lanza 3 balas durante 5 s.
- [x] El canvas no pinta `SCORE`, `NIVEL`, iconos de vidas ni `GAME OVER`.
- [x] Nave cian, asteroides amarillos y power-up magenta, con glow.
- [x] El canvas ocupa todo `.crt-screen`, se ve nítido en pantallas con `devicePixelRatio` 2 y a 375 px de ancho no hay scroll horizontal.
- [x] PAUSA, `P` y `Escape` pausan y reanudan; en pausa se ve "EN PAUSA" y nada se mueve.
- [x] Cambiar de pestaña o de ventana durante la partida la deja en pausa; al volver sigue en pausa hasta reanudar.
- [x] Perder la 3ª vida abre `GameOverModal` con la puntuación final aproximadamente 1 s después de la explosión.
- [x] FIN abre `GameOverModal` con la puntuación actual y el juego se detiene.
- [x] "JUGAR DE NUEVO" empieza una partida con 3 vidas, nivel 01 y puntuación 0.
- [x] Con el modal abierto se pueden escribir iniciales con espacios en el input.
- [x] Flechas y Espacio no hacen scroll de la página mientras se juega.
- [x] Salir con SALIR y volver a entrar no deja listeners ni bucles duplicados: la velocidad del juego es la misma y no hay errores en la consola (también en `npm run dev`, con el doble montaje de StrictMode).
- [x] Los otros 7 juegos (`/juegos/caida/jugar`, etc.) siguen con el reproductor simulado y se ven igual que antes.
- [x] El texto de `/juegos/rocas` ya no menciona OVNIs y menciona el power-up 3x.
- [x] No hay ningún import de `reference/` en `app/`, `components/` ni `lib/`.
- [x] `CLAUDE.md` describe `lib/games/`, el registro y cómo añadir un juego real.

## Decisiones

- **Sí:** reusar la entrada `rocas` del catálogo. Ya describe este juego y tiene portada, color y enlaces.
- **No:** nueva entrada `asteroides` ni renombrar `rocas`. Duplicaría el juego o rompería `/juegos/rocas`.
- **Sí:** port a TypeScript con un motor sin React (`createAsteroidsGame`) y callbacks. Permite limpiar listeners y rAF al desmontar y alimentar el HUD y el modal de la plataforma.
- **No:** cargar `game.js` intacto con `<Script>` o un iframe. Globals, listeners sin limpiar y sin comunicación con React.
- **Sí:** HUD de React y `GameOverModal`; el canvas solo conserva el indicador 3x. Mismo aspecto que el resto de la plataforma; el 3x es efímero y pertenece al campo de juego.
- **Sí:** `onHud` solo cuando cambia un valor. Evita 60 renders por segundo.
- **Sí:** paleta neón con glow, afinada con `/frontend-design`. El blanco vectorial original desentona con el CRT.
- **Sí:** colores como literales en `COLORS` que copian los tokens de `app/globals.css`. El canvas no lee variables CSS; leerlas con `getComputedStyle` no aporta nada mientras no haya temas.
- **Sí:** pantalla "PULSA ESPACIO" antes de empezar. No se pierden vidas mientras la página carga.
- **Sí:** lógica fija en 800×600 escalada por CSS y ajustada a `devicePixelRatio`. Física idéntica en cualquier pantalla.
- **No:** canvas de tamaño fijo. Se desborda en móvil.
- **Sí:** pausa con botón, `P`/`Escape` y automática al perder el foco. Al volver de otra pestaña el jugador no encuentra la nave destruida.
- **Sí:** `GAMEOVER_DELAY` de 1 s antes del modal. Se ve la explosión final en lugar de cortarla.
- **Sí:** registro `lib/games/registry.ts` como módulo plano + `RealGamePlayer.tsx` cliente con `dynamic(..., { ssr: false })`. `ssr: false` no se permite en Server Components; así la página servidor decide con `isPlayable` y el bundle del juego solo se carga para `rocas`. Tetris y Arkanoid se añaden con una línea en cada archivo.
- **No:** `if (id === "rocas")` en la página. Cada juego nuevo añadiría otra rama.
- **Sí:** extraer `PlayerHud.tsx`. El simulado y el real comparten el marcado sin copiarlo.
- **Sí:** solo teclado. Los controles táctiles van en otra spec.
- **No:** persistir la puntuación. `GameOverModal` sigue simulado; la tabla en Supabase va en su propia spec.
- **Sí:** quitar los OVNIs del texto de `rocas`. El juego no los tiene.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| StrictMode monta, desmonta y vuelve a montar en `npm run dev`: dos bucles o listeners duplicados | Instancia creada en `useEffect` y `destroy()` en el cleanup; criterio de aceptación explícito. |
| `preventDefault` de Espacio bloquea escribir en el input del modal | Solo en fases `ready`/`playing`/`paused` y nunca si el `target` es un `input` o `textarea`. |
| La pulsación de Espacio que arranca la partida dispara también una bala | `start()` limpia `justPressed`. |
| Salto de `dt` al reanudar tras una pausa larga | `resume()` reinicia `lastTime`; además `dt` sigue limitado a 50 ms. |
| `lib/games.ts` y la carpeta `lib/games/` conviven; `@/lib/games` podría resolverse mal | TypeScript y el bundler resuelven primero el archivo `games.ts`; los imports nuevos usan rutas completas (`@/lib/games/registry`). Verificado por `npm run build`. |
| `shadowBlur` en cada entidad baja los FPS en equipos lentos | Glow solo en nave, asteroides y power-up; balas y partículas sin `shadowBlur`. |
| El port cambia sin querer la jugabilidad | Constantes copiadas literalmente de `game.js`; criterios de aceptación con los valores del original. |

## Lo que **no** entra en esta spec

- Controles táctiles.
- Persistencia de puntuaciones, Salón de la Fama real y mejor puntuación real.
- OVNIs, sonido y mecánicas nuevas.
- Tetris, Arkanoid y el resto de juegos.
- Cambios en la portada o en la página de detalle de `rocas`, salvo su texto.
- Framework de tests.

Cada uno de estos, si llega, va en su propia spec.
