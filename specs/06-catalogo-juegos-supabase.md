# SPEC 06 — Catálogo de juegos en Supabase

> **Estado:** aprovada
> **Depende de:** SPEC 04, SPEC 05
> **Fecha:** 2026-11-02
> **Objetivo:** Mover el catálogo de juegos de `lib/games.ts` a una tabla `public.games` en Supabase y hacer que todas las páginas lo lean de la base de datos por petición.

## Por qué existe esta spec

"Leaderboard y tabla de juegos" se divide en dos specs. Las puntuaciones necesitan una clave foránea a un juego, así que primero el catálogo tiene que vivir en la base de datos. Esta spec solo cambia de dónde salen los juegos; la tabla de puntuaciones, el guardado del modal y el Salón de la Fama real van en la SPEC 07.

Hoy `GAMES` es un array en código que importan la home, la biblioteca, el detalle, el reproductor y el Salón de la Fama. Los campos `best` y `plays` son números inventados. Como en la SPEC 07 pasarán a calcularse desde las puntuaciones, esta spec los elimina del catálogo y la UI muestra "—" mientras tanto.

## Alcance

**Dentro:**

- Migración `supabase/migrations/<timestamp>_games.sql`: tabla `public.games`, RLS de solo lectura para `anon` y `authenticated`, y seed con los 8 juegos actuales en el mismo orden.
- Tipos generados: script npm `db:types` y archivo versionado `lib/supabase/database.types.ts`. `lib/supabase/server.ts` y `lib/supabase/client.ts` pasan a `createServerClient<Database>` / `createBrowserClient<Database>`.
- Capa de datos `lib/data/games.ts` (solo servidor) con `getGames()` y `getGame(id)`.
- `lib/games.ts` conserva solo tipos y constantes de UI: `Category`, `GameColor`, `Game` (sin `best` ni `plays`), `CATS`. Se eliminan `GAMES` y `getGame`.
- Páginas que pasan a leer de la BD, con renderizado dinámico por petición:
  - `app/page.tsx` (home): los 6 primeros juegos por `sort_order`.
  - `app/biblioteca/page.tsx`: pasa `games` como prop a `components/Library.tsx`, que sigue filtrando en cliente.
  - `app/juegos/[id]/page.tsx` y `app/juegos/[id]/jugar/page.tsx`: `getGame(id)`; si no existe, `notFound()`.
  - `app/salon/page.tsx`: pasa `games` como prop a `components/HallOfFame.tsx`, que sigue con `seededScores` hasta la SPEC 07.
- Se eliminan los `generateStaticParams` de `/juegos/[id]` y `/juegos/[id]/jugar`.
- "Mejor global" y "Partidas" en el detalle, y la mejor puntuación de `GameCard`, muestran "—".
- `app/error.tsx`: error boundary con la pantalla "VAULT FUERA DE LÍNEA" y un botón REINTENTAR. El detalle del error solo se registra en el servidor.
- `CLAUDE.md`: el catálogo vive en Supabase; `lib/data/`, `npm run db:types` y `database.types.ts`.

**Fuera de alcance (para futuras specs):**

- Tabla `public.scores`, guardado desde `GameOverModal`, leaderboard y Salón de la Fama con datos reales, `best`/`plays` calculados (SPEC 07).
- Panel de administración o edición del catálogo desde la app.
- Portadas como imágenes en Supabase Storage (siguen siendo clases CSS `cover-*`).
- Mover `PLAYABLE_GAME_IDS` a la base de datos: la jugabilidad depende de que exista un motor en código.
- Caché, ISR o `revalidatePath`.
- Copia de respaldo del catálogo en código.

## Modelo de datos

`supabase/migrations/<timestamp>_games.sql`:

```sql
create table public.games (
  id         text primary key check (id ~ '^[a-z0-9-]+$'),
  title      text not null,
  short      text not null,
  long       text not null,
  cat        text not null check (cat in ('ARCADE', 'PUZZLE', 'SHOOTER', 'VERSUS')),
  cover      text not null,
  color      text not null check (color in ('cyan', 'magenta', 'yellow', 'green')),
  sort_order integer not null unique,
  created_at timestamptz not null default now()
);

alter table public.games enable row level security;

create policy "games: lectura pública"
  on public.games for select
  to anon, authenticated
  using (true);

grant select on public.games to anon, authenticated;

insert into public.games (id, title, short, long, cat, cover, color, sort_order) values
  ('bloque-buster', 'BLOQUE BUSTER', '…', '…', 'ARCADE', 'cover-bricks', 'cyan', 1),
  -- … los 8 juegos de lib/games.ts, textos copiados literalmente, sort_order 1..8
  ('duelo-pixel', 'DUELO PIXEL', '…', '…', 'VERSUS', 'cover-duelo', 'cyan', 8);
```

- Sin políticas de `insert`, `update` ni `delete`: el catálogo solo cambia con migraciones.
- `best` y `plays` no se copian a la tabla.

Tipos en `lib/games.ts`:

```ts
export type Category = "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";
export type GameColor = "cyan" | "magenta" | "yellow" | "green";
export interface Game {
  id: string;
  title: string;
  short: string;
  long: string;
  cat: Category;
  cover: string;
  color: GameColor;
}
export const CATS = [/* igual que hoy */];
```

Capa de datos `lib/data/games.ts`:

```ts
export async function getGames(): Promise<Game[]>; // order by sort_order
export async function getGame(id: string): Promise<Game | null>; // null si no existe
```

- Ambas usan `createClient()` de `lib/supabase/server.ts`.
- Si Supabase devuelve `error`, registran el detalle con `console.error` y lanzan un `Error` genérico, que captura `app/error.tsx`.
- Convierten la fila (`cat` y `color` llegan como `string`) a `Game` y descartan `sort_order` y `created_at`.

Script en `package.json`:

```json
"db:types": "supabase gen types typescript --linked --schema public > lib/supabase/database.types.ts"
```

## Estructura de archivos

```
app/
  error.tsx                    # nuevo ("use client"): VAULT FUERA DE LÍNEA + REINTENTAR
  page.tsx                     # modificado: await getGames()
  biblioteca/page.tsx          # modificado: <Library games={…} />
  juegos/[id]/page.tsx         # modificado: getGame de lib/data, sin generateStaticParams, best/plays "—"
  juegos/[id]/jugar/page.tsx   # modificado: getGame de lib/data, sin generateStaticParams
  salon/page.tsx               # modificado: <HallOfFame games={…} />
components/
  Library.tsx                  # modificado: recibe games por props
  HallOfFame.tsx               # modificado: recibe games por props
  GameCard.tsx                 # modificado: mejor puntuación "—"
lib/
  games.ts                     # modificado: solo tipos y CATS
  data/
    games.ts                   # nuevo: getGames(), getGame()
  supabase/
    database.types.ts          # nuevo (generado)
    server.ts                  # modificado: <Database>
    client.ts                  # modificado: <Database>
supabase/migrations/
  <timestamp>_games.sql        # nuevo: tabla, RLS y seed
package.json                   # modificado: script db:types
CLAUDE.md                      # modificado
```

## Plan de implementación

Antes de escribir código, leer `node_modules/next/dist/docs/01-app/01-getting-started/06-fetching-data.md` y `10-error-handling.md`, como exige `AGENTS.md`. Antes del paso 6 invocar `/frontend-design` para la pantalla de error, como exige `CLAUDE.md`.

1. Crear la migración con `npx supabase migration new games` y escribir el SQL del modelo de datos con los textos de `lib/games.ts` copiados literalmente. Revisar el SQL con el usuario y aplicarlo con `npx supabase db push --linked`. Verificación: `npx supabase migration list --linked` la muestra en remoto y `select count(*) from public.games` devuelve 8.
2. Añadir el script `db:types`, generar `lib/supabase/database.types.ts` y tipar los dos clientes con `<Database>`. Verificación: `npx tsc --noEmit` y `npm run build` pasan.
3. Crear `lib/data/games.ts` con `getGames()` y `getGame()`. Verificación: `npx tsc --noEmit` pasa.
4. Migrar `/juegos/[id]` y `/juegos/[id]/jugar` a `getGame()` de `lib/data/games.ts`, quitar sus `generateStaticParams` y mostrar "—" en "Mejor global" y "Partidas". Verificación: `/juegos/rocas` y `/juegos/rocas/jugar` funcionan; `/juegos/no-existe` da 404.
5. Migrar la home, la biblioteca y el Salón a `getGames()`, con `games` por props en `Library` y `HallOfFame`. `GameCard` muestra "—". Quitar `GAMES`, `getGame`, `best` y `plays` de `lib/games.ts`. Verificación: `/`, `/biblioteca` (búsqueda y filtros) y `/salon` se ven como antes salvo los "—"; `grep -r "GAMES" app components` no encuentra el array.
6. Crear `app/error.tsx` con "VAULT FUERA DE LÍNEA" y REINTENTAR (`unstable_retry` o `reset` según la doc de la versión instalada). Verificación: con `NEXT_PUBLIC_SUPABASE_URL` apuntando a un host inválido en `.env.local`, `/biblioteca` muestra la pantalla de error sin detalles técnicos; al restaurar la variable, REINTENTAR carga la biblioteca.
7. Actualizar `CLAUDE.md`: el catálogo vive en `public.games`, `lib/data/` es la capa de lectura de servidor, `npm run db:types` regenera tipos tras cada migración. Verificación final: `npm run lint`, `npx tsc --noEmit` y `npm run build` sin errores.

## Criterios de aceptación

- [ ] `npm run build`, `npm run lint` y `npx tsc --noEmit` terminan sin errores.
- [ ] `npx supabase migration list --linked` muestra la migración `games` aplicada en el remoto.
- [ ] `public.games` tiene 8 filas con los mismos `id`, `title`, `short`, `long`, `cat`, `cover` y `color` que tenía `lib/games.ts`.
- [ ] RLS está activado en `public.games`; con la publishable key, `select` funciona e `insert`, `update` y `delete` fallan.
- [ ] `get_advisors` de seguridad no muestra avisos sobre `public.games`.
- [ ] `lib/supabase/database.types.ts` existe, está versionado y `npm run db:types` lo regenera sin cambios.
- [ ] `lib/games.ts` no exporta `GAMES` ni `getGame`, y `Game` no tiene `best` ni `plays`.
- [ ] La home muestra los 6 primeros juegos en el mismo orden que antes.
- [ ] `/biblioteca` muestra los 8 juegos y la búsqueda y los filtros por categoría funcionan igual que antes.
- [ ] `/juegos/rocas/jugar` monta el Asteroides real y `/juegos/caida/jugar` el simulado.
- [ ] `/juegos/no-existe` y `/juegos/no-existe/jugar` responden 404.
- [ ] En `/juegos/[id]`, "Mejor global" y "Partidas" muestran "—"; las tarjetas de la biblioteca muestran "—" como mejor puntuación.
- [ ] Ninguna página de juegos aparece como estática (`○`) en la salida de `npm run build`.
- [ ] Con Supabase inaccesible, `/biblioteca` muestra "VAULT FUERA DE LÍNEA" y REINTENTAR, sin mensaje ni stack del error en la página.
- [ ] `/salon` sigue mostrando las pestañas de los 8 juegos con puntuaciones simuladas.
- [ ] `CLAUDE.md` describe `public.games`, `lib/data/` y `npm run db:types`.

## Decisiones

- **Sí:** dividir en dos specs (06 catálogo, 07 puntuaciones). Juntas tocaban BD, todas las páginas del catálogo y el guardado del modal.
- **Sí:** tabla `public.games` como única fuente del catálogo, con seed en la migración. Las puntuaciones necesitan una FK real.
- **No:** tabla solo con `id` y `title` y la UI leyendo de `lib/games.ts`. Dos catálogos que divergen.
- **No:** copia de respaldo en código si Supabase falla. Misma razón; en su lugar, `app/error.tsx` con reintento.
- **Sí:** quitar `best` y `plays` del catálogo y mostrar "—". En la SPEC 07 se calculan desde `scores`; copiar los números inventados a la BD sería guardar datos falsos.
- **Sí:** `sort_order` explícito. Conserva el orden actual de home y biblioteca sin depender del orden de inserción.
- **Sí:** checks de `cat` y `color` en lugar de enums de Postgres. Añadir un valor es un `alter table` sencillo.
- **Sí:** renderizado dinámico por petición, sin `generateStaticParams`. Tráfico bajo y sin lógica de invalidación; el leaderboard de la SPEC 07 será siempre actual.
- **No:** estático con `revalidatePath`. Más piezas sin beneficio a esta escala.
- **Sí:** `lib/data/games.ts` como capa de lectura. Las páginas no construyen consultas y la conversión fila → `Game` está en un sitio.
- **Sí:** `Library` y `HallOfFame` siguen siendo Client Components y reciben `games` por props. La búsqueda, los filtros y las pestañas no cambian.
- **Sí:** tipos generados con `npm run db:types` y versionados. La primera tabla es el momento en que aportan.
- **Sí:** `PLAYABLE_GAME_IDS` sigue en código. Que un juego sea jugable depende de que exista su motor.
- **Sí:** catálogo de solo lectura para `anon` y `authenticated`. Solo cambia con migraciones, como dice `CLAUDE.md`.

## Riesgos

| Riesgo                                                                          | Mitigación                                                                                                   |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `db push` escribe en el único entorno, el remoto                                | El paso 1 revisa el SQL con el usuario antes de aplicarlo. La migración solo crea una tabla nueva.           |
| `supabase gen types --linked` necesita sesión del CLI                           | El usuario ya hizo `login` y `link` en la SPEC 04; si caducó, lo repite con `! npx supabase login`.          |
| Errores al copiar los textos largos al SQL (comillas simples, tildes)           | Criterio de aceptación compara las 8 filas con `lib/games.ts`; las comillas se escapan como `''`.            |
| Cada página hace una consulta a Supabase y es más lenta que el array en memoria | Una sola consulta por página; aceptable a esta escala. Caché fuera de alcance.                               |
| `cat` y `color` llegan como `string` en los tipos generados                     | `lib/data/games.ts` los convierte a `Category` y `GameColor`; los checks de la tabla garantizan los valores. |
| La API del error boundary cambió en Next 16 (`unstable_retry` / `reset`)        | Leer `10-error-handling.md` antes del paso 6 y usar la de la versión instalada.                              |

## Lo que **no** entra en esta spec

- Tabla de puntuaciones, guardado de puntuaciones, leaderboard y Salón reales (SPEC 07).
- Edición del catálogo desde la app.
- Portadas en Supabase Storage.
- Jugabilidad en la BD.
- Caché o ISR.

Cada uno de estos, si llega, va en su propia spec.
