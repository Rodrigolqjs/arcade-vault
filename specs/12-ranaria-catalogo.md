# SPEC ranaria/01 — Ajuste del catálogo de RANARIA: texto y portada

> **Estado:** APROVADA
> **Depende de:** SPEC 06, SPEC 07
> **Fecha:** 2026-11-06
> **Objetivo:** Ajustar la entrada `ranaria`, que ya existe en `public.games`, para que su texto describa el diseño original de la game jam (tramos sin fin, reloj de 30 s y troncos que se hunden) y rediseñar su portada `cover-rana` con carriles, río, rana y nenúfares, sin insertar ninguna fila nueva.

## Por qué existe esta spec

El juego de la game jam "cruce de carriles sin fin" ocupa la entrada `ranaria`, que **ya existe** en el catálogo: la sembró la SPEC 06 en `supabase/migrations/20261102164944_games.sql` (línea 31) con estos valores:

| Columna          | Valor actual                                                                                                                              |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `id`             | `ranaria`                                                                                                                                 |
| `title`          | `RANARIA`                                                                                                                                 |
| `short`          | `Cruza la autopista de pixeles.`                                                                                                          |
| `long`           | `Salta entre carriles de coches a toda velocidad y troncos a la deriva en el río. Llega a los nenúfares antes de que se acabe el tiempo.` |
| `cat`            | `ARCADE`                                                                                                                                  |
| `cover`          | `cover-rana`                                                                                                                              |
| `color`          | `green`                                                                                                                                   |
| `sort_order`     | `7`                                                                                                                                       |
| `accepts_scores` | `false` (default de la SPEC 07)                                                                                                           |

Por eso esta spec **no** inserta el id: un `insert` fallaría por la clave primaria y por el `unique` de `sort_order`, y un id nuevo duplicaría el juego en `/biblioteca`. Lo que sí hace falta ajustar son dos cosas:

- **El texto.** El `long` actual describe un cruce de una sola pantalla con meta fija. El diseño de la SPEC `ranaria/02` es otro: cada nenúfar abre un tramo nuevo generado al azar, más rápido y con menos nenúfares, el reloj vuelve a 30 s en cada tramo y hay troncos que avisan parpadeando antes de hundirse. Esa última mecánica es la propia del juego y hoy no aparece en el catálogo. Además, `short` escribe "pixeles" sin tilde.
- **La portada.** `.cover-rana` (`app/globals.css`, líneas 858–873) es un fondo azul con franjas cian horizontales y un círculo verde en el centro. No se leen ni la carretera ni el río, y el círculo verde con brillo se confunde con `.cover-snake`, que también es verde. La portada nueva conserva el nombre de clase (la fila de la base de datos no cambia en `cover`) y dibuja la escena del juego solo con CSS.

`accepts_scores` sigue en `false`: el juego sigue siendo simulado hasta la SPEC `ranaria/02`.

## Alcance

**Dentro:**

- Migración `supabase/migrations/*_ranaria_catalogo.sql` (timestamp generado por `npx supabase migration new ranaria_catalogo`) con un `update` de `short` y `long` para `ranaria`. No cambia `id`, `title`, `cat`, `cover`, `color`, `sort_order` ni `accepts_scores`.
- Texto nuevo:
  - `short`: `Cruza la autopista de píxeles sin fin.`
  - `long`: `Salta carril a carril entre tráfico neón y troncos a la deriva hasta tocar un nenúfar. Cada nenúfar abre un tramo nuevo, más rápido y con menos nenúfares, y el reloj vuelve a 30 segundos. Ojo con los troncos que parpadean: están a punto de hundirse.`
- Rediseño de `.cover-rana`, `.cover-rana::before` y `.cover-rana::after` en `app/globals.css`, solo con gradientes y pseudo-elementos, diseñado con `/frontend-design`:
  - Fondo en bandas horizontales de arriba abajo, como el tablero del juego: franja de meta (0–16 %) en agua oscura `#001f2a`; río (16–50 %) en `#002633` con ondas cian al 14 %; arcén (50–60 %) en `--bg-3` (`#15151f`); carretera (60–92 %) en `--bg-2` (`#0f0f18`) con una línea discontinua de `--ink` al 35 % en el 76 %; orilla de salida (92–100 %) en `--bg-3`.
  - `::before`: un coche `--magenta` (14 % × 7 %) en el carril alto de la carretera, un camión `--yellow` (24 % × 7 %) en el carril bajo y dos troncos de cian translúcido (`rgba(0, 245, 255, 0.35)`, 30 % y 26 % de ancho) en el río, con `drop-shadow` magenta suave.
  - `::after`: la rana como un círculo `--green` de 13 px de radio sobre el arcén (50 % 55 %) y dos nenúfares como anillos `--green` en la franja de meta (30 % 8 % y 72 % 8 %), con `drop-shadow` verde de 8 px.
- Verificación del juego simulado en `/biblioteca`, en el filtro ARCADE, en `/juegos/ranaria` (con `EmptyScores`) y en `/juegos/ranaria/jugar` (con el `GamePlayer` simulado).

**Fuera de alcance (para futuras specs):**

- Insertar `ranaria` en `public.games`: ya existe desde la SPEC 06.
- Cambiar `title`, `cat`, `color`, `sort_order` o el nombre de clase `cover-rana`.
- `accepts_scores = true`, motor, player y registro (SPEC `ranaria/02`).
- Animar la portada (por ejemplo, un tronco que parpadea): las portadas de la plataforma son estáticas.
- Portadas como imágenes o en Supabase Storage.
- Framework de tests.

## Modelo de datos

Migración (`supabase/migrations/*_ranaria_catalogo.sql`, timestamp generado por `npx supabase migration new ranaria_catalogo`):

```sql
-- RANARIA (game jam "cruce de carriles sin fin", SPEC ranaria/01): texto del diseño original.
-- La fila ya existe desde la SPEC 06; accepts_scores sigue en false hasta ranaria/02.
update public.games
  set short = 'Cruza la autopista de píxeles sin fin.',
      long  = 'Salta carril a carril entre tráfico neón y troncos a la deriva hasta tocar un nenúfar. Cada nenúfar abre un tramo nuevo, más rápido y con menos nenúfares, y el reloj vuelve a 30 segundos. Ojo con los troncos que parpadean: están a punto de hundirse.'
where id = 'ranaria';
```

Ningún texto lleva comillas simples, así que no hay nada que escapar como `''`. Cada promesa del `long` existe en la SPEC `ranaria/02`: carriles de vehículos y de troncos, nenúfares como meta, tramos nuevos más rápidos (multiplicador de velocidad) y con menos nenúfares (de 4 a 2), reloj de 30 s por tramo y troncos que parpadean 1 s antes de hundirse.

Las columnas y los `check` de `public.games` no cambian; `lib/supabase/database.types.ts` se regenera sin diferencias.

Portada (`app/globals.css`, sustituye las reglas actuales de `.cover-rana` y `.cover-rana::after`). Punto de partida que `/frontend-design` puede afinar en tonos y posiciones, sin cambiar qué token usa cada elemento:

```css
.cover-rana {
  background:
    repeating-linear-gradient(
        90deg,
        rgba(230, 233, 255, 0.35) 0 18px,
        transparent 18px 36px
      )
      0 76% / 100% 2px no-repeat,
    repeating-linear-gradient(
        180deg,
        rgba(0, 245, 255, 0.14) 0 2px,
        transparent 2px 18px
      )
      0 32% / 100% 34% no-repeat,
    linear-gradient(
      180deg,
      #001f2a 0 16%,
      #002633 16% 50%,
      #15151f 50% 60%,
      #0f0f18 60% 92%,
      #15151f 92%
    );
}
.cover-rana::before {
  content: "";
  position: absolute;
  inset: 0;
  background:
    linear-gradient(var(--magenta), var(--magenta)) 14% 66% / 14% 7% no-repeat,
    linear-gradient(var(--yellow), var(--yellow)) 78% 84% / 24% 7% no-repeat,
    linear-gradient(rgba(0, 245, 255, 0.35), rgba(0, 245, 255, 0.35)) 70% 22% /
      30% 8% no-repeat,
    linear-gradient(rgba(0, 245, 255, 0.35), rgba(0, 245, 255, 0.35)) 18% 38% /
      26% 8% no-repeat;
  filter: drop-shadow(0 0 6px rgba(255, 0, 110, 0.45));
}
.cover-rana::after {
  content: "";
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 50% 55%, var(--green) 0 13px, transparent 14px),
    radial-gradient(
      circle at 30% 8%,
      transparent 0 7px,
      var(--green) 8px 10px,
      transparent 11px
    ),
    radial-gradient(
      circle at 72% 8%,
      transparent 0 7px,
      var(--green) 8px 10px,
      transparent 11px
    );
  filter: drop-shadow(0 0 8px rgba(0, 255, 136, 0.6));
}
```

El hook de formato quita las líneas en blanco de los `.css`, así que el bloque ya va sin ellas.

## Estructura de archivos

```
app/
  globals.css                  # modificado: .cover-rana, .cover-rana::before y .cover-rana::after
lib/
  supabase/database.types.ts   # regenerado (sin cambios de tipos esperados)
supabase/migrations/
  *_ranaria_catalogo.sql       # nuevo: update de short y long
```

`supabase/migrations/20261102164944_games.sql` no se modifica: las migraciones aplicadas no se reescriben. `reference/` no se toca.

## Plan de implementación

Esta spec no usa `next/dynamic`, así que no hace falta leer `node_modules/next/dist/docs/01-app/02-guides/lazy-loading.md` (se lee en la SPEC `ranaria/02`). Antes del paso 2, invocar `/frontend-design` para la portada, como exigen `AGENTS.md` y `CLAUDE.md`.

1. **Migración del texto.**
   - `npx supabase migration new ranaria_catalogo` y escribir el SQL del modelo de datos.
   - Revisar el SQL con el usuario.
   - `npx supabase db push --linked` y después `npm run db:types`.

   Verificación:
   - `npx supabase migration list --linked` muestra `ranaria_catalogo` en el remoto.
   - `/juegos/ranaria` muestra el `long` nuevo y la tarjeta de `/biblioteca` el `short` "Cruza la autopista de píxeles sin fin.".
   - `git diff lib/supabase/database.types.ts` está vacío y `npx tsc --noEmit` pasa.

2. **Portada: bandas de fondo** (tras `/frontend-design`).
   - Sustituir `.cover-rana` por el fondo en cinco bandas (meta, río con ondas, arcén, carretera con línea discontinua y orilla).
   - Quitar la regla antigua `.cover-rana::after` (franjas cian y círculo verde).

   Verificación: en `/biblioteca` la tarjeta de RANARIA muestra de arriba abajo agua oscura, río con ondas, arcén gris, carretera con una línea discontinua y orilla; `npm run lint` pasa.

3. **Portada: vehículos, troncos, rana y nenúfares.**
   - `.cover-rana::before` con el coche magenta, el camión amarillo y los dos troncos cian.
   - `.cover-rana::after` con la rana verde sobre el arcén y los dos anillos de nenúfar en la franja de meta.

   Verificación:
   - En `/biblioteca` y en la portada grande de `/juegos/ranaria` se distinguen el coche, el camión, los dos troncos, la rana y los dos nenúfares, y la tarjeta no se confunde con la de SERPENTINA.
   - El filtro ARCADE de `/biblioteca` muestra BLOQUE BUSTER, SERPENTINA, GLOTÓN y RANARIA, y RANARIA desaparece con el filtro PUZZLE.
   - `/juegos/ranaria` muestra `EmptyScores` (sin puntuaciones) y `/juegos/ranaria/jugar` sigue mostrando el `GamePlayer` simulado.
   - A 375 px de ancho no hay scroll horizontal.
   - `npm run build`, `npm run lint` y `npx tsc --noEmit` pasan.

## Criterios de aceptación

- [ ] `npm run build`, `npm run lint` y `npx tsc --noEmit` terminan sin errores.
- [ ] `npx supabase migration list --linked` muestra la migración `ranaria_catalogo` aplicada en el remoto.
- [ ] `select id, title, short, cat, cover, color, sort_order, accepts_scores from public.games where id = 'ranaria'` devuelve una sola fila con `RANARIA`, `Cruza la autopista de píxeles sin fin.`, `ARCADE`, `cover-rana`, `green`, `7` y `false`.
- [ ] `public.games` sigue teniendo 8 filas y ningún `sort_order` repetido.
- [ ] Con la publishable key, insertar en `public.scores` una fila para `ranaria` **falla** por RLS (aún no acepta puntuaciones).
- [ ] `get_advisors` de seguridad no muestra avisos nuevos.
- [ ] `/juegos/ranaria` muestra el `long` nuevo, de 3 frases, y `EmptyScores`.
- [ ] La tarjeta de RANARIA en `/biblioteca` muestra el `short` nuevo, aparece con el filtro TODOS y ARCADE y no aparece con PUZZLE, SHOOTER ni VERSUS.
- [ ] La portada muestra 5 bandas horizontales (meta, río, arcén, carretera, orilla), 1 coche magenta, 1 camión amarillo, 2 troncos cian, 1 rana verde y 2 nenúfares verdes, solo con CSS y sin imágenes.
- [ ] `/juegos/ranaria/jugar` sigue mostrando el `GamePlayer` simulado.
- [ ] Las portadas de los otros 7 juegos no cambian.
- [ ] A 375 px de ancho, `/biblioteca` y `/juegos/ranaria` no tienen scroll horizontal.

## Decisiones

- **Sí:** reusar la entrada `ranaria`. Ya existe con título, categoría ARCADE, color verde, portada y `sort_order` 7, y su idea (cruzar carriles hasta los nenúfares) es la del tema.
- **No:** insertar el id ni crear uno nuevo. El `insert` fallaría por la clave primaria y un id nuevo duplicaría el juego.
- **Sí:** reescribir `long`. El actual no menciona los tramos sin fin ni los troncos que se hunden, que son lo que hace propio al juego.
- **Sí:** que el `long` solo prometa lo que implementa la SPEC `ranaria/02`. Los carriles reversibles de la SPEC `ranaria/03` no se anuncian hasta que existan.
- **Sí:** corregir "pixeles" a "píxeles" y añadir "sin fin" al `short`. Es el gancho del tema en una línea.
- **No:** cambiar `title`, `cat`, `color` ni `sort_order`. Están bien y cambiarlos movería el juego en la biblioteca sin motivo.
- **Sí:** rediseñar la portada con el mismo nombre de clase `cover-rana`. La columna `cover` no cambia y el arte nuevo se lee como el juego.
- **No:** una clase `cover-ranaria` nueva. Obligaría a tocar también la columna `cover` sin ganar nada.
- **Sí:** el texto en una migración nueva. `public.games` solo cambia con migraciones y las ya aplicadas no se reescriben.
- **Sí:** `accepts_scores` sigue en `false`. Sin motor no hay puntuaciones legítimas que guardar.
- **No:** animar la portada. Ninguna portada de la plataforma está animada.

## Riesgos

| Riesgo                                                         | Mitigación                                                                                             |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `db push` escribe en el único entorno, el remoto               | Revisar el SQL con el usuario antes de aplicarlo; el `update` solo toca la fila `ranaria`.             |
| El `update` sin `where` cambia los 8 juegos                    | El SQL lleva `where id = 'ranaria'`; criterio de las 8 filas con su texto.                             |
| El `long` promete mecánicas que el motor no tiene              | Cada promesa está enlazada a una regla con números en `ranaria/02`; la 03 no se anuncia.               |
| El juego simulado describe un juego que aún no se puede jugar  | Es el estado de todos los simulados; la SPEC `ranaria/02` lo hace jugable con el mismo texto.          |
| La portada nueva se confunde con `.cover-snake`, también verde | Composición en bandas con vehículos magenta y amarillo; el verde solo en la rana y los nenúfares.      |
| Muchas capas de gradiente se ven mal en la tarjeta pequeña     | Tamaños en % y radios fijos pequeños; verificación en `/biblioteca` y en el detalle, también a 375 px. |
| Un `drop-shadow` en `::before` también tiñe los troncos        | El `drop-shadow` magenta es suave (6 px, 45 %); `/frontend-design` puede separarlo si se ve sucio.     |

## Lo que **no** entra en esta spec

- Insertar `ranaria` o crear un id nuevo.
- Cambios de `title`, `cat`, `color`, `sort_order` o del nombre de la clase de portada.
- `accepts_scores = true`, motor, player y registro.
- Portadas animadas o en imagen.
- Framework de tests.

Cada uno de estos, si llega, va en su propia spec.
