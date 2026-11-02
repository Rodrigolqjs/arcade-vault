# SPEC 07 — Leaderboard con puntuaciones reales

> **Estado:** Borrador
> **Depende de:** SPEC 05, SPEC 06
> **Fecha:** 2026-11-02
> **Objetivo:** Guardar en Supabase las puntuaciones de los juegos reales desde el modal "FIN DEL JUEGO" y mostrarlas en el leaderboard del detalle y en el Salón de la Fama.

## Por qué existe esta spec

Hoy `GameOverModal` solo cambia a un toast al pulsar GUARDAR, y el leaderboard del detalle y el Salón de la Fama pintan puntuaciones falsas de `seededScores`. Con el catálogo ya en `public.games` (SPEC 06), esta spec añade la tabla `public.scores` y conecta las tres piezas. No hay autenticación: se guarda de forma anónima con iniciales, como sugiere el modal actual. Cuando llegue la spec de auth, se añadirá `user_id`.

Solo los juegos reales guardan puntuaciones. Hoy eso es `rocas`; los 7 simulados muestran leaderboards vacíos hasta que tengan motor.

## Alcance

**Dentro:**

- Migración `supabase/migrations/<timestamp>_scores.sql`:
  - Columna `public.games.accepts_scores` (`false` por defecto, `true` para `rocas`).
  - Tabla `public.scores` con checks de iniciales y puntuación.
  - RLS: lectura pública; inserción para `anon` y `authenticated` solo en juegos con `accepts_scores`, y solo de las columnas `game_id`, `name` y `score`. Sin `update` ni `delete`.
  - Vista `public.game_stats` (`security_invoker`) con `best` y `plays` por juego.
- Regenerar `lib/supabase/database.types.ts` con `npm run db:types`.
- Capa de datos `lib/data/scores.ts` (servidor): `getTopScores(gameId, limit)`, `getAllGameStats()` y `getGameStats(gameId)`.
- Server Action `saveScore` en `app/juegos/[id]/jugar/actions.ts`: valida y normaliza, inserta y devuelve el puesto.
- `GameOverModal`:
  - Props nuevas `gameId` y `saveable`. `AsteroidsPlayer` pasa `saveable` = `true`; `GamePlayer` pasa `false`.
  - Con `saveable` = `false`: no hay input ni botón; muestra "PARTIDA DE DEMOSTRACIÓN · NO SE GUARDA".
  - Iniciales: se normalizan a mayúsculas y sin espacios a los extremos. Vacías o con caracteres fuera de `A-Z`, `0-9`, `_` y espacio, GUARDAR se deshabilita y aparece un mensaje.
  - Guardando: botón deshabilitado con el texto "GUARDANDO…".
  - Guardado: "PUNTUACIÓN GUARDADA · PUESTO #NN" y un enlace "VER SALÓN DE LA FAMA" a `/salon?juego=<id>`. No se puede guardar dos veces la misma partida.
  - Error: mensaje "NO SE PUDO GUARDAR. INTÉNTALO DE NUEVO." y GUARDAR vuelve a estar disponible, conservando las iniciales.
- Leaderboard del detalle (`/juegos/[id]`): top 10 real. Sin filas, estado vacío "SÉ EL PRIMERO" con enlace a jugar si el juego es jugable.
- Estadísticas reales: "Mejor global" = `best` ("—" sin puntuaciones); la etiqueta "Partidas" pasa a "Puntuaciones" y muestra `plays`. `GameCard` muestra `best` o "—".
- Salón de la Fama (`/salon`): Server Component que lee `?juego=<id>`. Las pestañas son `Link` a `?juego=<id>`. Sin parámetro o con un id inexistente se muestra el primer juego jugable por `sort_order`. Podio y tabla con el top 12 real. Con menos de 3 filas, los puestos vacíos del podio muestran "—". Sin filas, el mismo estado vacío "SÉ EL PRIMERO".
- Ranking: todas las partidas, ordenadas por `score` descendente y, a igualdad, por `created_at` ascendente. Unas mismas iniciales pueden aparecer varias veces.
- Fechas en formato `dd/mm/aaaa` con `es-ES` y zona horaria UTC.
- Se eliminan `lib/scores.ts` (`seededScores`, `PLAYERS`) y todas sus referencias.
- `CLAUDE.md`: `public.scores`, `accepts_scores`, `game_stats`, `lib/data/scores.ts` y el paso nuevo al añadir un juego real (poner `accepts_scores = true` en una migración).

**Fuera de alcance (para futuras specs):**

- Autenticación, `user_id` en las puntuaciones y perfil de jugador.
- Guardar puntuaciones de los juegos simulados.
- Datos falsos de seed en `public.scores`.
- Ranking de mejor puntuación por jugador, filtros por periodo (hoy, semana) o paginación.
- Anti-trampas más allá de los checks: rate limit por IP, firma o validación de la partida en servidor.
- Moderación o borrado de puntuaciones desde la app.
- Actualización en tiempo real (Supabase Realtime) del leaderboard.
- Contador real de partidas jugadas (no guardadas).

## Modelo de datos

`supabase/migrations/<timestamp>_scores.sql`:

```sql
alter table public.games
  add column accepts_scores boolean not null default false;
update public.games set accepts_scores = true where id = 'rocas';

create table public.scores (
  id         bigint generated always as identity primary key,
  game_id    text not null references public.games (id) on delete cascade,
  name       text not null check (name ~ '^[A-Z0-9_ ]{1,10}$' and name = btrim(name)),
  score      integer not null check (score between 0 and 10000000),
  created_at timestamptz not null default now()
);

create index scores_ranking_idx on public.scores (game_id, score desc, created_at asc);

alter table public.scores enable row level security;

create policy "scores: lectura pública"
  on public.scores for select
  to anon, authenticated
  using (true);

create policy "scores: inserción en juegos que aceptan puntuaciones"
  on public.scores for insert
  to anon, authenticated
  with check (
    exists (select 1 from public.games g where g.id = game_id and g.accepts_scores)
  );

grant select on public.scores to anon, authenticated;
grant insert (game_id, name, score) on public.scores to anon, authenticated;

create view public.game_stats
  with (security_invoker = true) as
  select g.id as game_id,
         max(s.score) as best,          -- null si no hay puntuaciones
         count(s.id)::integer as plays
  from public.games g
  left join public.scores s on s.game_id = g.id
  group by g.id;

grant select on public.game_stats to anon, authenticated;
```

Capa de datos `lib/data/scores.ts`:

```ts
export interface ScoreRow {
  id: number; // clave de React: las iniciales se repiten
  rank: number; // 1-based, según el orden del ranking
  name: string;
  score: number;
  date: string; // "dd/mm/aaaa", UTC
}
export interface GameStats {
  best: number | null;
  plays: number;
}
export async function getTopScores(
  gameId: string,
  limit: number,
): Promise<ScoreRow[]>;
export async function getAllGameStats(): Promise<Record<string, GameStats>>; // para GameCard
export async function getGameStats(gameId: string): Promise<GameStats>;
```

- Igual que `lib/data/games.ts`: si Supabase devuelve `error`, `console.error` y se lanza un `Error` genérico que captura `app/error.tsx`.

Server Action (`app/juegos/[id]/jugar/actions.ts`, `"use server"`):

```ts
export type SaveScoreResult =
  { ok: true; rank: number } | { ok: false; error: "invalid" | "unavailable" };
export async function saveScore(input: {
  gameId: string;
  name: string;
  score: number;
}): Promise<SaveScoreResult>;
```

- `invalid`: `gameId` no está en `PLAYABLE_GAME_IDS`, `score` no es un entero entre 0 y 10.000.000 o `name` normalizado no cumple `^[A-Z0-9_ ]{1,10}$`.
- `unavailable`: el `insert` o la consulta del puesto devuelven `error`. El detalle va a `console.error` y nunca al cliente.
- El puesto se calcula tras insertar: filas del mismo juego con `score` mayor, más las de igual `score` y `created_at` anterior, más 1.

Fases del guardado en `GameOverModal`:

```ts
type SaveState =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved"; rank: number }
  | { kind: "error" };
```

## Estructura de archivos

```
app/
  juegos/[id]/page.tsx         # modificado: getTopScores(id, 10), getGameStats(id), etiqueta "Puntuaciones"
  juegos/[id]/jugar/actions.ts # nuevo: saveScore()
  biblioteca/page.tsx          # modificado: pasa stats a Library
  page.tsx                     # modificado: pasa stats a las tarjetas si muestran best
  salon/page.tsx               # modificado: lee searchParams.juego, getTopScores(id, 12)
  globals.css                  # modificado: estado vacío, mensajes del modal
components/
  GameOverModal.tsx            # modificado: gameId, saveable, SaveState, validación
  GamePlayer.tsx               # modificado: saveable={false}
  games/AsteroidsPlayer.tsx    # modificado: gameId, saveable={true}
  Leaderboard.tsx              # modificado: tipo de lib/data/scores, key por id, estado vacío
  HallOfFame.tsx               # modificado: Server Component, pestañas con Link, podio con huecos
  Library.tsx                  # modificado: recibe stats
  GameCard.tsx                 # modificado: best o "—"
  EmptyScores.tsx              # nuevo: "SÉ EL PRIMERO" (+ enlace a jugar si es jugable)
lib/
  scores.ts                    # eliminado
  data/scores.ts               # nuevo: getTopScores, getAllGameStats, getGameStats
  supabase/database.types.ts   # regenerado
supabase/migrations/
  <timestamp>_scores.sql       # nuevo
CLAUDE.md                      # modificado
```

## Plan de implementación

Antes de escribir código, leer `node_modules/next/dist/docs/01-app/01-getting-started/07-mutating-data.md` (Server Actions) y la referencia de `searchParams` en `page.md`, como exige `AGENTS.md`. Antes del paso 5 invocar `/frontend-design` para los estados del modal, el estado vacío y el podio con huecos, como exige `CLAUDE.md`.

1. Crear la migración con `npx supabase migration new scores` y escribir el SQL del modelo de datos. Revisar el SQL con el usuario y aplicarlo con `npx supabase db push --linked`. Ejecutar `npm run db:types`. Verificación: `migration list` la muestra en remoto; con la publishable key, insertar en `rocas` funciona e insertar en `caida`, con `name = 'ñ'` o con `score = -1` falla; `npx tsc --noEmit` pasa.
2. Crear `lib/data/scores.ts`. Verificación: `npx tsc --noEmit` pasa.
3. Detalle `/juegos/[id]`: `Leaderboard` con `getTopScores(id, 10)` y key por `id`; `EmptyScores` sin filas; "Mejor global" y "Puntuaciones" desde `getGameStats`. Verificación: `/juegos/rocas` muestra la fila insertada en el paso 1; `/juegos/caida` muestra "SÉ EL PRIMERO" sin enlace a jugar.
4. Biblioteca y home: `getAllGameStats()` y `GameCard` con `best` o "—". Verificación: la tarjeta de ROCAS muestra la mejor puntuación real; las demás, "—".
5. Crear `saveScore` y conectar `GameOverModal` (props `gameId`/`saveable`, validación de iniciales, `SaveState`, enlace al Salón). `AsteroidsPlayer` y `GamePlayer` pasan las props nuevas. Verificación: tras una partida en `/juegos/rocas/jugar` se guarda con iniciales y aparece el puesto; en `/juegos/caida/jugar` el modal dice "PARTIDA DE DEMOSTRACIÓN · NO SE GUARDA".
6. Salón de la Fama: `app/salon/page.tsx` lee `?juego=`, `HallOfFame` pasa a Server Component con pestañas `Link`, podio con huecos "—" y estado vacío. Verificación: `/salon` muestra ROCAS; `/salon?juego=caida` muestra el estado vacío; `/salon?juego=xyz` muestra ROCAS.
7. Eliminar `lib/scores.ts` y sus referencias. Actualizar `CLAUDE.md`. Verificación final: `grep -r "seededScores\|lib/scores" app components lib` no encuentra nada; `npm run lint`, `npx tsc --noEmit` y `npm run build` sin errores.

## Criterios de aceptación

- [ ] `npm run build`, `npm run lint` y `npx tsc --noEmit` terminan sin errores.
- [ ] `npx supabase migration list --linked` muestra la migración `scores` aplicada en el remoto.
- [ ] `get_advisors` de seguridad no muestra avisos sobre `public.scores` ni `public.game_stats`.
- [ ] Con la publishable key, insertar directamente en `public.scores` funciona para `rocas` y falla para `caida`.
- [ ] Insertar con `name` en minúsculas, con `Ñ`, vacío, de 11 caracteres o con espacios a los extremos falla.
- [ ] Insertar con `score` negativo o mayor que 10.000.000 falla.
- [ ] Con la publishable key, `update` y `delete` sobre `public.scores` no modifican ninguna fila, y no se puede fijar `created_at` al insertar.
- [ ] Tras perder en `/juegos/rocas/jugar`, escribir iniciales y pulsar GUARDAR muestra "GUARDANDO…" y después "PUNTUACIÓN GUARDADA · PUESTO #NN" con el puesto correcto.
- [ ] Tras guardar, el modal ya no permite guardar de nuevo esa partida; "JUGAR DE NUEVO" empieza una partida cuyo modal vuelve a permitir guardar.
- [ ] Con iniciales vacías o con `Ñ`, tildes o símbolos, GUARDAR está deshabilitado y se ve el mensaje de caracteres permitidos.
- [ ] Si el guardado falla (Supabase inaccesible), el modal muestra "NO SE PUDO GUARDAR. INTÉNTALO DE NUEVO.", conserva las iniciales y GUARDAR vuelve a estar habilitado.
- [ ] Llamar a `saveScore` con `gameId: "caida"`, `score: 1.5` o `score: 20000000` devuelve `{ ok: false, error: "invalid" }` sin insertar.
- [ ] En `/juegos/caida/jugar` el modal muestra "PARTIDA DE DEMOSTRACIÓN · NO SE GUARDA" y no tiene input ni botón GUARDAR.
- [ ] "VER SALÓN DE LA FAMA" lleva a `/salon?juego=rocas` y la puntuación recién guardada aparece en su puesto.
- [ ] `/juegos/rocas` muestra como máximo 10 filas reales ordenadas por puntuación descendente y, a igualdad, por fecha ascendente.
- [ ] "Mejor global" muestra la mejor puntuación real y "Puntuaciones" el número de filas de ese juego; sin filas, "—" y "0".
- [ ] Unas mismas iniciales con dos puntuaciones aparecen en dos filas del leaderboard sin warnings de `key` en la consola.
- [ ] `/juegos/caida` y `/salon?juego=caida` muestran "SÉ EL PRIMERO"; `/juegos/rocas` sin puntuaciones lo muestra con enlace a `/juegos/rocas/jugar`.
- [ ] `/salon` sin parámetro y `/salon?juego=xyz` muestran ROCAS.
- [ ] Las pestañas del Salón cambian la URL a `?juego=<id>` y la URL es compartible.
- [ ] Con 1 o 2 puntuaciones, el podio muestra "—" en los puestos vacíos sin errores.
- [ ] Las tarjetas de la biblioteca muestran la mejor puntuación real de ROCAS y "—" en el resto.
- [ ] `lib/scores.ts` no existe y no hay referencias a `seededScores` ni `PLAYERS`.
- [ ] `CLAUDE.md` describe `public.scores`, `accepts_scores`, `game_stats` y el paso de `accepts_scores` al añadir un juego real.

## Decisiones

- **Sí:** guardado anónimo con iniciales. No hay auth todavía y el modal ya pide iniciales; `user_id` llega con la spec de auth.
- **No:** esperar a auth para guardar. El leaderboard quedaría vacío sin forma de llenarlo.
- **Sí:** Server Action + RLS. La acción valida, normaliza y calcula el puesto; RLS y los checks protegen aunque alguien llame a la API directamente con la publishable key.
- **No:** insert directo desde el navegador. Solo RLS protege y la lógica de validación queda en el cliente.
- **Sí:** columna `accepts_scores` en `games`. RLS no puede leer `PLAYABLE_GAME_IDS`; sin ella, la API permitiría puntuaciones en juegos simulados. La Server Action comprueba además `isPlayable`.
- **Sí:** `grant insert` solo de `game_id`, `name` y `score`. Nadie puede fijar `created_at` ni `id` y adelantarse en los empates.
- **Sí:** solo los juegos reales guardan. Una puntuación del reproductor simulado no es de nadie.
- **Sí:** tope de 10.000.000 en tabla y acción. Frena valores absurdos sin infraestructura extra.
- **No:** rate limit por IP o firma de partida. La puntuación sigue llegando del cliente; se acepta para un proyecto pequeño y va en otra spec si hace falta.
- **Sí:** leaderboards vacíos, sin seed falso, con estado "SÉ EL PRIMERO". Mezclar datos inventados con reales los haría indistinguibles.
- **Sí:** `best` y `plays` calculados en la vista `game_stats` con `security_invoker`. Una fuente de verdad y RLS aplicado como el usuario que consulta.
- **No:** columnas `best`/`plays` estáticas en `games`. Se desincronizarían de las puntuaciones.
- **Sí:** etiqueta "Puntuaciones" en lugar de "Partidas". Se cuentan puntuaciones guardadas, no partidas jugadas.
- **Sí:** ranking de todas las partidas, empate por fecha ascendente. Es el comportamiento arcade clásico y no necesita agregación.
- **No:** mejor puntuación por jugador. Sin cuentas, las iniciales no identifican a una persona.
- **Sí:** puesto y enlace al Salón tras guardar. Cierra el ciclo jugar → guardar → ver tu nombre.
- **Sí:** iniciales `A-Z`, `0-9`, `_` y espacio, 1–10 caracteres, mismo check en tabla y cliente. Coincide con la fuente pixel y con el `maxLength` actual.
- **No:** `Ñ` y tildes. La fuente pixel puede no tener esos glifos.
- **No:** "ANÓNIMO" por defecto con iniciales vacías. Llenaría el ranking de filas indistinguibles.
- **Sí:** Salón con `?juego=` y pestañas `Link`. URL compartible y destino directo del enlace del modal.
- **No:** fetch desde el cliente al cambiar de pestaña. Duplica la capa de datos en el navegador.
- **Sí:** renderizado dinámico, sin `revalidatePath`. Es la decisión de la SPEC 06; la puntuación guardada se ve en la siguiente navegación.
- **Sí:** fechas en UTC. Formato determinista en servidor.

## Riesgos

| Riesgo                                                                                | Mitigación                                                                                                      |
| ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| La puntuación la envía el cliente y puede falsearse                                   | Checks y tope en la tabla; anti-trampas real fuera de alcance y registrado en decisiones.                       |
| `db push` escribe en el único entorno, el remoto                                      | El paso 1 revisa el SQL con el usuario. La migración solo añade una columna con default, una tabla y una vista. |
| Una vista sin `security_invoker` ignora RLS y el advisor la marca                     | `with (security_invoker = true)`; criterio de aceptación con `get_advisors`.                                    |
| `insert … returning` falla si `anon` no puede leer la fila                            | La política de `select` es pública; la acción solo pide `created_at` y `score` de vuelta.                       |
| Puesto incorrecto si otra puntuación igual entra en el mismo instante                 | El empate se rompe por `created_at`; a esta escala un desajuste de un puesto es aceptable.                      |
| Doble envío al pulsar GUARDAR dos veces                                               | El botón se deshabilita en `saving` y el estado `saved` oculta el formulario.                                   |
| Al añadir Tetris o Arkanoid se olvida `accepts_scores`                                | El paso queda documentado en `CLAUDE.md` junto a `PLAYABLE_GAME_IDS`.                                           |
| Convertir `HallOfFame` a Server Component rompe animaciones o estilos de las pestañas | Mismas clases (`chip`, `active`); las pestañas pasan de `button` a `Link` con el mismo marcado.                 |

## Lo que **no** entra en esta spec

- Auth y `user_id`.
- Puntuaciones de juegos simulados.
- Datos falsos de seed.
- Mejor por jugador, filtros por periodo y paginación.
- Rate limit y validación de partidas en servidor.
- Moderación de puntuaciones.
- Realtime.
- Contador de partidas jugadas.

Cada uno de estos, si llega, va en su propia spec.
