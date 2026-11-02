# Receta: hacer jugable un juego en Arcade Vault

Extraída de las SPEC 05, 06 y 07 y del código de `rocas` (Asteroides). La spec de cada juego copia estos pasos en su plan de implementación, con nombres y valores concretos.

Reglas de `/spec` y `/spec-impl` que el plan debe cumplir: cada paso deja el sistema funcionando y se puede commitear solo; si pasa de 30–50 líneas de código se divide (el paso 4 casi siempre se parte en dos); `/spec-impl` para después de cada paso para revisar el diff, sin commits automáticos; el plan no cambia el estado de la spec. `<id>` es el id del catálogo (`caida`); `<juego>` es el nombre de carpeta del motor (`tetris`); `<Juego>` el mismo en PascalCase (`Tetris`).

## Antes de escribir código

- Leer `node_modules/next/dist/docs/01-app/02-guides/lazy-loading.md` (`ssr: false` solo funciona en Client Components), como exige `AGENTS.md`.
- Invocar `/frontend-design` antes del paso del aspecto del canvas y del overlay de inicio, como exige `CLAUDE.md`.

## Pasos del plan

1. **Migración.** `npx supabase migration new <id>_jugable`:

   ```sql
   -- <Juego> jugable (SPEC NN): acepta puntuaciones.
   update public.games
     set accepts_scores = true
     -- , long = '<texto nuevo, comillas simples escapadas como ''>'
   where id = '<id>';
   ```

   Si el id es nuevo, un `insert into public.games (id, title, short, long, cat, cover, color, sort_order, accepts_scores)` con `sort_order` único, `cat` en `ARCADE|PUZZLE|SHOOTER|VERSUS`, `color` en `cyan|magenta|yellow|green` e id `^[a-z0-9-]+$`; la clase `cover-*` debe existir en `app/globals.css` (o crearse en el paso de aspecto).
   Revisar el SQL con el usuario → `npx supabase db push --linked` → `npm run db:types`.
   Verificación: `npx supabase migration list --linked` la muestra en remoto; con la publishable key, un insert en `public.scores` para `<id>` funciona.

2. **Registro y player mínimo.** Añadir `<id>` a `PLAYABLE_GAME_IDS` en `lib/games/registry.ts`, su entrada `dynamic(() => import("@/components/games/<Juego>Player"), { ssr: false })` en `components/games/RealGamePlayer.tsx` y un `<Juego>Player.tsx` mínimo (HUD con valores iniciales + CRT con `<canvas>` negro).
   Verificación: `/juegos/<id>/jugar` muestra el CRT vacío; los demás juegos siguen igual; `npm run build` pasa.

3. **Constantes y entidades.** `lib/games/<juego>/constants.ts` (tamaño lógico `W`/`H`, constantes copiadas literalmente del original, `COLORS` con los tokens de `app/globals.css`, `GAMEOVER_DELAY`) y `entities.ts` (clases tipadas con `update(dt)` y `draw(ctx)`; el input entra como parámetro, no como global). Datos de niveles, si los hay, en `levels.ts`.
   Verificación: `npx tsc --noEmit` y `npm run lint` pasan.

4. **Motor.** `lib/games/<juego>/engine.ts` con `create<Juego>Game(canvas, events)`. Normalmente en dos pasos: (a) bucle, input, dibujo y `start/pause/resume/end/destroy`; (b) colisiones, puntuación, niveles y fin de partida.
   - Todo el estado dentro de la instancia; sin globals.
   - Listeners de teclado (y ratón si aplica) añadidos al crear y eliminados en `destroy()`, junto con el `requestAnimationFrame`.
   - `keys`/`justPressed`; `start()` los limpia para que la tecla que arranca no actúe en el juego.
   - Bucle con `dt` limitado a 50 ms; `resume()` reinicia `lastTime`.
   - Canvas con resolución lógica fija, escalado por CSS al 100 % de `.crt-screen` y backing store × `devicePixelRatio`. Si el tamaño lógico no es 4:3, la spec dice cómo encaja (letterbox o ajustar `.crt-screen`).
   - El canvas no pinta puntuación, vidas, nivel, pausa ni GAME OVER; solo indicadores efímeros del campo de juego.
   - `onHud` solo cuando cambia algún valor (comparar con el último enviado); `onGameOver(score)` tras `GAMEOVER_DELAY`.
   - Glow (`shadowBlur`) solo en las entidades principales.
   - Assets cargados con `new Image()` desde `/games/<id>/…` (`public/games/<id>/`); el motor no arranca a dibujar sprites hasta que cargan.
     Verificación: `npx tsc --noEmit` pasa.

5. **Conectar el motor y aspecto** (tras `/frontend-design`). En `<Juego>Player.tsx`, copiando el patrón de `AsteroidsPlayer.tsx`: instancia en `useEffect` y `destroy()` en el cleanup; fase `ready` con overlay `.game-start` (título, "PULSA ESPACIO_" o la tecla elegida, teclas del juego con `<kbd>`); clic en el CRT también arranca; HUD alimentado por `onHud`. Estilos nuevos en `app/globals.css`.
   Verificación: se juega una partida completa y el HUD refleja los valores.

6. **Pausa.** Botón PAUSA/REANUDAR de `PlayerHud`, `P` y `Escape`, pausa automática con `visibilitychange` (`hidden`) y `blur`; overlay "EN PAUSA".
   Verificación: cambiar de pestaña deja el juego en pausa sin que nada se haya movido.

7. **Fin de partida y guardado.** `onGameOver` y el botón FIN pasan a `over` y abren `<GameOverModal gameId={game.id} saveable …>`; "JUGAR DE NUEVO" llama a `start()`. `preventDefault` de las teclas del juego solo fuera de `over` y nunca con el foco en `input`/`textarea`.
   Verificación: tras perder se escriben iniciales con espacios, GUARDAR muestra el puesto y "VER SALÓN DE LA FAMA" lleva a `/salon?juego=<id>` con la fila.

8. **Docs y cierre.** `CLAUDE.md` solo si el juego introduce algo nuevo en el patrón (assets en `public/games/`, ratón, tamaño no 4:3).
   Verificación: `npm run lint`, `npx tsc --noEmit` y `npm run build` sin errores.

## Criterios de aceptación estándar

Copiar a la spec y añadir los propios del juego (puntuaciones exactas, controles, niveles, power-ups…):

- [ ] `npm run build`, `npm run lint` y `npx tsc --noEmit` terminan sin errores.
- [ ] `npx supabase migration list --linked` muestra la migración `<id>_jugable` aplicada en el remoto.
- [ ] Con la publishable key, insertar en `public.scores` para `<id>` funciona.
- [ ] `get_advisors` de seguridad no muestra avisos nuevos.
- [ ] `/juegos/<id>/jugar` muestra el canvas dentro del CRT con el overlay de inicio y nada se mueve hasta arrancar.
- [ ] La tecla o el clic que arrancan la partida no ejecutan una acción del juego.
- [ ] El canvas no pinta puntuación, vidas, nivel, pausa ni GAME OVER; el HUD de React los muestra.
- [ ] El canvas ocupa `.crt-screen`, se ve nítido con `devicePixelRatio` 2 y a 375 px de ancho no hay scroll horizontal.
- [ ] PAUSA, `P` y `Escape` pausan y reanudan; cambiar de pestaña o ventana deja la partida en pausa.
- [ ] Al terminar la partida se abre `GameOverModal` con la puntuación final; FIN hace lo mismo y detiene el juego.
- [ ] Guardar con iniciales muestra "PUNTUACIÓN GUARDADA · PUESTO #NN" y la fila aparece en `/juegos/<id>` y en `/salon?juego=<id>`.
- [ ] La tarjeta del juego en `/biblioteca` muestra la mejor puntuación real.
- [ ] "JUGAR DE NUEVO" empieza una partida con los valores iniciales y su modal vuelve a permitir guardar.
- [ ] Con el modal abierto se pueden escribir iniciales con espacios; las teclas del juego no hacen scroll mientras se juega.
- [ ] Salir y volver a entrar no deja listeners ni bucles duplicados (también en `npm run dev` con StrictMode) y no hay errores en la consola.
- [ ] Los juegos que ya eran reales y los simulados siguen funcionando igual.
- [ ] No hay ningún import de `reference/` en `app/`, `components/` ni `lib/`.

## Riesgos estándar

| Riesgo                                                           | Mitigación                                                                              |
| ---------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| StrictMode monta dos veces en dev: bucles o listeners duplicados | Instancia en `useEffect` y `destroy()` en el cleanup; criterio de aceptación explícito. |
| `preventDefault` bloquea escribir en el input del modal          | Solo fuera de `over` y nunca si el `target` es `input` o `textarea`.                    |
| La pulsación que arranca la partida actúa también en el juego    | `start()` limpia `justPressed`.                                                         |
| Salto de `dt` al reanudar tras una pausa larga                   | `resume()` reinicia `lastTime`; `dt` limitado a 50 ms.                                  |
| Se olvida `accepts_scores` y el guardado falla por RLS           | Paso 1 del plan y criterio de inserción con la publishable key.                         |
| `db push` escribe en el único entorno, el remoto                 | Revisar el SQL con el usuario antes de aplicarlo; la migración solo cambia una fila.    |
| El port cambia sin querer la jugabilidad                         | Constantes copiadas literalmente; criterios con los valores del original.               |
| `shadowBlur` en todo baja los FPS                                | Glow solo en las entidades principales.                                                 |
