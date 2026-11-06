# SPEC ranaria/03 — Carriles reversibles en RANARIA

> **Estado:** Borrador
> **Depende de:** SPEC ranaria/02
> **Fecha:** 2026-11-06
> **Objetivo:** Añadir a RANARIA, desde el tramo 3, carriles que invierten su sentido cada 6–9 s tras un aviso de 1 s, para que los tramos altos exijan leer el ritmo de los carriles y no solo su velocidad.

## Por qué existe esta spec

En la SPEC `ranaria/02` la dificultad sube con la velocidad (hasta ×2,2 en el tramo 11), con menos nenúfares (2 desde el tramo 3) y con más troncos que se hunden (los 4 carriles desde el tramo 4). A partir del tramo 11 ya no cambia nada: cada carril va siempre en el mismo sentido y a la misma velocidad, así que un jugador que domina el ritmo puede cruzar tramo tras tramo con el mismo patrón. El tema es el timing; esta ampliación lo profundiza haciendo que el ritmo de algunos carriles cambie a mitad de tramo, con aviso, sin añadir ningún objeto ni pantalla nueva.

Es una sola mecánica, acotada al motor:

- Desde el tramo 3, algunos carriles son **reversibles**: se marcan con una flecha doble tenue en sus dos extremos.
- Cada 6–9 s, uno de esos carriles avisa durante 1 s con chevrones amarillos parpadeantes que apuntan al sentido nuevo y después frena y acelera en sentido contrario en 0,6 s.
- Si la rana está sobre un tronco de ese carril, el tronco la lleva con su velocidad en cada momento, también durante el cambio.

## Alcance

**Dentro:**

- Carriles reversibles por tramo: `min(3, tramo − 2)` de los 9 carriles (5 de carretera y 4 de río), elegidos al azar, nunca dos en filas contiguas.
  - Tramos 1 y 2: ninguno. Tramo 3: 1. Tramo 4: 2. Tramo 5 y siguientes: 3.
  - Las filas 4 y 6 no son contiguas (entre ellas está el arcén, fila 5).
- Ciclo de cada carril reversible, independiente de los demás:
  - Al generarse el tramo, `reverseIn` toma un valor al azar entre 6 y 9 s.
  - Cuando `reverseIn` llega a 1 s empieza el aviso: chevrones `--yellow` en los dos extremos del carril, apuntando al sentido nuevo, que parpadean cada 125 ms.
  - Cuando `reverseIn` llega a 0, la velocidad pasa de `v` a `−v` de forma lineal en `REVERSE_RAMP` = 0,6 s (pasa por 0 a los 0,3 s). El valor absoluto de la velocidad final es el mismo que el inicial.
  - Al terminar la rampa, `reverseIn` vuelve a un valor al azar entre 6 y 9 s.
- La cuenta atrás y la rampa avanzan solo mientras los carriles se mueven: no en pausa, no en `dying` y sí durante el respawn de 0,8 s (en la SPEC `ranaria/02` el tráfico sigue moviéndose en el respawn).
- Arrastre: la rana sobre un tronco se mueve con la velocidad actual del carril en cada frame, incluida la rampa. Las reglas de muerte por arrastre fuera del canvas no cambian.
- Marca permanente de carril reversible: una flecha doble `⇄` dibujada con líneas en `--ink-faint` al 60 %, de 16 × 10 px, centrada en cada extremo del carril (a 12 px de los bordes), debajo de los vehículos y los troncos.
- Los carriles de hundimiento pueden ser reversibles a la vez; el ciclo de hundido de la SPEC `ranaria/02` no cambia.
- El bucle de los carriles (`−200…1000`) ya funciona en los dos sentidos, así que los objetos entran y salen por los bordes sin saltos también tras invertir.
- Glow: los chevrones del aviso no llevan `shadowBlur`; sigue habiendo glow solo en la rana y los nenúfares.
- Sin cambios en la puntuación, el HUD, `PlayerHud`, las vidas, el reloj, los nenúfares ni el player.
- Sin migración: la tabla `public.games` y el texto `long` no cambian.

**Fuera de alcance (para futuras specs):**

- Anunciar los carriles reversibles en el texto `long` del catálogo.
- Carriles que cambian de velocidad sin invertir el sentido o que se detienen.
- Elegir la dificultad o activar y desactivar los carriles reversibles.
- Una tabla de puntuaciones separada para las partidas jugadas antes de esta spec.
- Controles táctiles, sonido y música.
- Framework de tests.

## Modelo de datos

Sin migración. `public.games` y `public.scores` no cambian.

Leaderboards existentes: las fórmulas de puntuación no cambian (`10 × tramo` por fila nueva, `100 × tramo` por nenúfar y `10 × tramo × segundos restantes`). Las partidas guardadas antes de esta spec llegaron a los tramos 3 y siguientes sin carriles reversibles, así que fueron algo más fáciles en esos tramos. Las filas ya guardadas se conservan tal cual en `public.scores` y siguen contando en `/juegos/ranaria` y en `/salon?juego=ranaria`; no se borran ni se marcan.

Cambios en el estado interno del motor (`lib/games/ranaria/entities.ts`), que amplían el `Lane` de la SPEC `ranaria/02`:

```ts
interface Lane {
  row: number; // 1–4 río, 6–10 carretera
  kind: LaneKind;
  speed: number; // px/s con signo, velocidad actual (cambia durante la rampa)
  sinking: boolean;
  movers: Mover[];
  // Carriles reversibles (SPEC ranaria/03)
  reversible: boolean; // se invierte durante el tramo
  cruise: number; // px/s con signo, velocidad de crucero del sentido actual
  reverseIn: number; // s hasta empezar la rampa; el aviso se ve con reverseIn ≤ REVERSE_WARN
  ramp: number; // s restantes de la rampa; 0 si no está invirtiendo
}
```

La API pública del motor (`HudState`, `RanariaEvents`, `RanariaGame`, `createRanariaGame`) no cambia.

Constantes nuevas en `lib/games/ranaria/constants.ts`:

```ts
// Carriles reversibles (SPEC ranaria/03)
export const REVERSE_FROM_TRAMO = 3; // min(MAX_REVERSIBLE, tramo − (REVERSE_FROM_TRAMO − 1))
export const MAX_REVERSIBLE = 3; // carriles por tramo
export const REVERSE_MIN = 6; // s entre inversiones
export const REVERSE_MAX = 9; // s entre inversiones
export const REVERSE_WARN = 1; // s de aviso antes de la rampa
export const REVERSE_RAMP = 0.6; // s de v a −v, lineal
export const REVERSE_BLINK = 0.125; // s por medio parpadeo del aviso
export const REVERSE_MARK_W = 16; // px, flecha doble permanente
export const REVERSE_MARK_H = 10; // px
export const REVERSE_MARK_MARGIN = 12; // px desde cada borde del canvas
```

Colores nuevos en `COLORS`:

```ts
reverseWarn: "#f5ff00", // --yellow, chevrones del aviso
reverseMark: "rgba(74, 79, 112, 0.6)", // --ink-faint al 60 %, flecha doble permanente
```

## Estructura de archivos

```
lib/
  games/
    ranaria/
      constants.ts             # modificado: constantes y colores de los carriles reversibles
      entities.ts              # modificado: Lane ampliado, pickReversible, updateReverse, drawReverse
      engine.ts                # modificado: llama a updateReverse antes de moveLane y dibuja marcas y avisos
```

`components/`, `app/`, `supabase/migrations/` y `lib/supabase/database.types.ts` no se modifican.

## Plan de implementación

Esta spec no usa `next/dynamic`, así que no hace falta leer `node_modules/next/dist/docs/01-app/02-guides/lazy-loading.md`. Antes del paso 3, invocar `/frontend-design` para el aspecto de la flecha doble y de los chevrones del aviso, como exigen `AGENTS.md` y `CLAUDE.md`.

1. **Constantes y carriles reversibles en la generación.**
   - Añadir las constantes y los colores del modelo de datos.
   - Ampliar `Lane` con `reversible`, `cruise`, `reverseIn` y `ramp`. `fillLane` deja `cruise = speed`, `ramp = 0` y `reversible = false`.
   - `pickReversible(lanes, tramo)`: marca `min(3, tramo − 2)` carriles al azar sin filas contiguas (ninguno si el resultado es ≤ 0) y les da `reverseIn` al azar entre 6 y 9 s. `generateStretch` la llama al final.

   Verificación: `npx tsc --noEmit` y `npm run lint` pasan; en `/juegos/ranaria/jugar` el juego sigue igual que en la SPEC `ranaria/02` (aún no se invierte nada).

2. **Inversión del sentido.**
   - `updateReverse(lane, dt)`: si es reversible y no está en rampa, resta `dt` a `reverseIn`; al llegar a 0 empieza la rampa (`ramp = 0,6`). Durante la rampa, `speed = cruise × (1 − 2 × progreso)`, con `progreso = 1 − ramp / 0,6`. Al terminar, `cruise = −cruise`, `speed = cruise`, `ramp = 0` y `reverseIn` al azar entre 6 y 9 s.
   - En `engine.ts`, llamarla para cada carril antes de `moveLane` en los mismos frames en que se mueven los carriles (no en pausa ni en `dying`).
   - El arrastre de la rana ya usa `lane.speed`, así que sigue la rampa sin cambios.

   Verificación: llegando al tramo 3, un carril invierte su sentido entre 6 y 9 s después de empezar el tramo y vuelve a invertirlo 6–9 s después de cada inversión; `npx tsc --noEmit` pasa.

3. **Marca permanente y aviso** (tras `/frontend-design`).
   - `drawReverse(ctx, lane, t)`: en cada carril reversible, la flecha doble en `reverseMark` en los dos extremos, debajo de los objetos; con `reverseIn ≤ 1` y sin rampa, dos chevrones `reverseWarn` en cada extremo apuntando al sentido de `−cruise`, visibles en los medios parpadeos pares de 125 ms.
   - En `engine.ts`, dibujarla después de las bandas y antes de troncos y vehículos.

   Verificación:
   - En el tramo 3 se ve la flecha doble en los dos extremos de 1 carril, y los chevrones amarillos parpadean 1 s antes de cada inversión.
   - En los tramos 1 y 2 no hay flechas dobles ni chevrones.
   - `npm run build`, `npm run lint` y `npx tsc --noEmit` terminan sin errores.

## Criterios de aceptación

- [ ] `npm run build`, `npm run lint` y `npx tsc --noEmit` terminan sin errores.
- [ ] No hay migración nueva y `git diff lib/supabase/database.types.ts` está vacío.
- [ ] En los tramos 1 y 2 ningún carril invierte su sentido y no se dibuja ninguna flecha doble.
- [ ] En el tramo 3 hay exactamente 1 carril reversible; en el tramo 4, 2; en el tramo 5 y siguientes, 3; nunca dos en filas contiguas.
- [ ] Cada carril reversible lleva la flecha doble tenue en sus dos extremos durante todo el tramo.
- [ ] La primera inversión de cada carril reversible empieza entre 6 y 9 s después de generarse el tramo, y entre una inversión y la siguiente pasan entre 6 y 9 s más los 0,6 s de la rampa.
- [ ] Durante el segundo anterior a cada inversión, los chevrones amarillos parpadean cada 125 ms en los dos extremos del carril y apuntan al sentido nuevo.
- [ ] La velocidad pasa de `v` a `−v` en 0,6 s, es 0 a los 0,3 s y después mantiene el mismo valor absoluto que tenía.
- [ ] Sobre un tronco de un carril que se invierte, la rana frena, se para y vuelve en sentido contrario junto con el tronco, sin saltos.
- [ ] Un tronco que se hunde en un carril reversible sigue su ciclo de 3 s a flote, 1 s parpadeando y 1,5 s hundido.
- [ ] Los objetos de un carril invertido entran y salen por los bordes sin saltos visibles.
- [ ] En pausa y durante los 1 s de `dying` ni la cuenta atrás ni la rampa avanzan; durante el respawn de 0,8 s sí.
- [ ] Los chevrones y la flecha doble no tienen glow; solo la rana y los nenúfares lo tienen.
- [ ] La puntuación sigue las fórmulas de la SPEC `ranaria/02`: cruzar el tramo 1 sin retroceder ni morir con 18,4 s en el reloj deja la partida en 380 puntos.
- [ ] El HUD, el overlay de inicio, la pausa y `GameOverModal` funcionan igual que en la SPEC `ranaria/02`.
- [ ] Las puntuaciones guardadas antes de esta spec siguen apareciendo en `/juegos/ranaria` y en `/salon?juego=ranaria`.
- [ ] Salir y volver a entrar no deja listeners ni bucles duplicados (también en `npm run dev` con StrictMode) y no hay errores en la consola.

## Decisiones

- **Sí:** carriles que invierten el sentido como ampliación. Profundiza el tema (leer el timing de los carriles) sin objetos ni pantallas nuevas.
- **Sí:** empezar en el tramo 3 y subir hasta 3 carriles. Los tramos 1 y 2 enseñan el juego base; 3 de 9 carriles mantienen el tramo legible.
- **No:** más de 3 carriles reversibles. Con medio tablero cambiando de sentido, el aviso deja de poder leerse.
- **Sí:** nunca dos reversibles en filas contiguas. La rana siempre tiene un carril vecino con ritmo fijo.
- **Sí:** aviso de 1 s con chevrones que apuntan al sentido nuevo. Es la misma duración que el aviso de los troncos que se hunden, así que el juego tiene una sola regla de aviso.
- **Sí:** rampa lineal de 0,6 s en lugar de un cambio instantáneo. La rana sobre un tronco no recibe un tirón brusco y el frenazo se lee.
- **Sí:** misma velocidad absoluta tras invertir. El multiplicador del tramo sigue siendo el que manda en la dificultad.
- **Sí:** la cuenta atrás corre también en el respawn. En la SPEC `ranaria/02` el tráfico sigue moviéndose en el respawn y pararla solo en esos carriles se vería raro.
- **No:** migración ni cambio del texto `long`. El catálogo ya describe el juego sin esta mecánica, y la SPEC `ranaria/01` decidió no anunciarla.
- **Sí:** conservar las puntuaciones ya guardadas. Las fórmulas no cambian y la diferencia de dificultad solo afecta a los tramos 3 y siguientes.
- **No:** separar el leaderboard o borrar filas. Sería una migración sobre `public.scores` para una diferencia pequeña.
- **No:** glow en los chevrones. Se mantiene la regla de glow solo en la rana y los nenúfares.

## Riesgos

| Riesgo                                                              | Mitigación                                                                                                |
| ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| La inversión mata a la rana sin que pueda reaccionar                | Aviso de 1 s con chevrones y rampa de 0,6 s; la marca permanente dice qué carriles pueden invertirse.     |
| Un vehículo invertido entra en el hueco donde espera la rana        | Es el reto de la mecánica; el aviso de 1 s da tiempo a saltar y nunca hay dos reversibles contiguos.      |
| El bucle de los objetos falla al cambiar de sentido                 | `moveLane` ya devuelve los objetos a `−200…1000` en los dos sentidos; criterio de bordes sin saltos.      |
| La cuenta atrás avanza en pausa y el carril se invierte al reanudar | `updateReverse` solo se llama en los frames en que se mueven los carriles; criterio de pausa.             |
| Las puntuaciones antiguas se comparan con partidas más difíciles    | Fórmulas sin cambios y diferencia solo desde el tramo 3; se documenta aquí y en el README de la game jam. |
| `shadowBlur` en los avisos baja los FPS                             | Chevrones y flechas sin glow.                                                                             |
| StrictMode monta dos veces en dev: bucles o listeners duplicados    | El motor no añade listeners nuevos; el criterio de la SPEC `ranaria/02` se repite aquí.                   |

## Lo que **no** entra en esta spec

- Anunciar los carriles reversibles en el catálogo.
- Carriles que cambian de velocidad o se paran sin invertir.
- Selector de dificultad o modo sin carriles reversibles.
- Leaderboard separado para partidas antiguas.
- Controles táctiles, sonido y música.
- Framework de tests.

Cada uno de estos, si llega, va en su propia spec.
