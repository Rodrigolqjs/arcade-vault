# RANARIA — Game jam: "cruce de carriles sin fin"

Fecha: 2026-11-06

## Concepto

Una rana de neón cruza carril a carril una carretera con tráfico y un río con troncos a la deriva hasta tocar uno de los nenúfares del otro lado. Cada nenúfar abre al instante un tramo nuevo generado al azar, más rápido y con menos nenúfares, y el reloj vuelve a 30 s. La mecánica propia son los troncos que parpadean 1 s antes de hundirse: hay que leer a la vez el ritmo del tráfico, el del río y el de los troncos.

## Cómo interpreta el tema

- **Cruce de carriles:** el bucle entero es esperar el hueco y saltar una celda en el momento justo; es la única mecánica de timing y esquiva del catálogo.
- **Sin fin:** no hay pantalla final ni casillas que rellenar. Basta con tocar un nenúfar y el juego genera otro tramo, con un multiplicador de velocidad `min(2.2, 1 + 0.12 × (tramo − 1))`, de 4 a 2 nenúfares y más carriles de troncos que se hunden (`min(4, tramo)`).
- **Puntuación sin techo:** solo puntúa avanzar a filas nuevas, tocar el nenúfar y llegar con tiempo de sobra, todo multiplicado por el tramo.

El diseño es original dentro del género. No copia el tablero, los personajes ni las metas de ningún juego comercial: no hay tortugas, cocodrilos ni moscas, y no se usa nada de `reference/resources/started-games/` (no hay carpeta de este género).

## Ficha

| Campo        | Valor                                                                                                                                                                  |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| id           | `ranaria` (ya existe en `public.games` desde la SPEC 06)                                                                                                               |
| Título       | `RANARIA`                                                                                                                                                              |
| Categoría    | `ARCADE`                                                                                                                                                               |
| Color        | `green`                                                                                                                                                                |
| `sort_order` | `7` (el que ya tiene; no cambia)                                                                                                                                       |
| Portada      | `cover-rana`, rediseñada en la 01                                                                                                                                      |
| Motor        | `lib/games/ranaria/` con `createRanariaGame`, player `components/games/RanariaPlayer.tsx`                                                                              |
| Tablero      | Canvas lógico 800×600, rejilla 16 × 12 de 50 px: meta, 4 carriles de río, arcén, 5 de carretera y orilla                                                               |
| Controles    | `←` `↑` `→` `↓` / `W` `A` `S` `D` saltan una celda (sin autorepeat); `P` y `Escape` pausan; Espacio o clic en el CRT arrancan                                          |
| HUD          | Puntuación; Vidas (3 ♥); Nivel = tramo; Tiempo (casilla nueva de `PlayerHud` con la prop opcional `time`, 30 → 0, magenta con 5 s o menos)                             |
| Puntuación   | `10 × tramo` por fila nueva del tramo (filas 10 a 1) + `100 × tramo` por nenúfar + `10 × tramo × segundos enteros restantes`. Ejemplo: tramo 1 limpio con 18,4 s → 380 |
| Fin          | Perder la tercera vida (vehículo, agua, tronco hundido, arrastre fuera del canvas, fallar el nenúfar o reloj a 0); campo congelado `GAMEOVER_DELAY` = 1 s              |

## Specs

| Archivo                                                                          | Objetivo                                                                                                                 | Depende de                              | Estado       |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | --------------------------------------- | ------------ |
| [`12-ranaria-catalogo.md`](../../12-ranaria-catalogo.md)                         | Actualizar `short` y `long` de `ranaria` con una migración y rediseñar `.cover-rana` con carriles, río, rana y nenúfares | SPEC 06, SPEC 07                        | Implementada |
| [`13-ranaria-jugable.md`](../../13-ranaria-jugable.md)                           | Motor, player, casilla Tiempo de `PlayerHud`, registro y `accepts_scores = true`                                         | SPEC 05, SPEC 06, SPEC 07, `ranaria/01` | Implementada |
| [`14-ranaria-carriles-reversibles.md`](../../14-ranaria-carriles-reversibles.md) | Desde el tramo 3, hasta 3 carriles que invierten el sentido cada 6–9 s con aviso de 1 s; sin migración                   | `ranaria/02`                            | Implementada |

## Cómo seguir

1. Revisa las tres specs, en orden.
2. Cambia a mano el estado de cada una de `Borrador` a aprobado.
3. Muévelas a `specs/` con el siguiente número libre (`ls specs/`; hoy la última es la 10):
   - `specs/11-ranaria-catalogo.md`
   - `specs/12-ranaria-jugable.md`
   - `specs/13-ranaria-carriles-reversibles.md`
4. Actualiza las referencias: `SPEC ranaria/01` → `SPEC 11`, `SPEC ranaria/02` → `SPEC 12` y `SPEC ranaria/03` → `SPEC 13`, también en las cabeceras `# SPEC ranaria/0N — …` y en los comentarios del SQL.
5. Implementa en orden: `/spec-impl 11-ranaria-catalogo`, `/spec-impl 12-ranaria-jugable` y `/spec-impl 13-ranaria-carriles-reversibles`.

## Preguntas abiertas

1. **Casilla Tiempo en `PlayerHud`.** Elegí una prop opcional `time` que añade una cuarta casilla tras "Nivel", para no pintar HUD en el canvas. Alternativa: una barra de tiempo fina dibujada en la fila de la orilla del canvas, que se ve sin apartar la vista del juego pero rompe la regla de "el canvas no pinta HUD".
2. **El reloj vuelve a 30 s también al perder una vida.** Lo elegí para que una muerte con poco tiempo no encadene otra. Alternativa: que el reloj solo se reinicie al empezar un tramo, como dice literalmente el `long`, y que perder una vida no lo recupere (más tenso, pero más castigador).
3. **Un solo nenúfar completa el tramo.** Lo elegí para que el juego sea "sin fin" y no se parezca a la fila de casillas de los juegos comerciales del género. Alternativa: exigir tocar 2 de los nenúfares por tramo, con partidas más largas por tramo.
4. **Dificultad máxima en el tramo 11** (×2,2 de velocidad, 2 nenúfares, 4 carriles de hundimiento y, con la 03, 3 carriles reversibles). Alternativa: subir el tope a ×2,5 en el tramo 13 si en las pruebas el tramo 11 resulta cómodo.
5. **La 03 no se anuncia en el catálogo ni separa el leaderboard.** Las puntuaciones guardadas antes de la 03 se conservan aunque los tramos 3+ fueran algo más fáciles. Alternativa: añadir a la 03 una migración que actualice el `long` con una frase sobre los carriles que cambian de sentido.
