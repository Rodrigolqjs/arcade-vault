# Memoria de game-planner
## Preferencias del usuario
- (sin registrar todavía; el usuario aún no ha dado feedback sobre sugerencias)
## Estado del catálogo (última revisión: 2026-11-06)
- Jugables: rocas (SHOOTER), caida (PUZZLE), serpentina (ARCADE), bloque-buster (ARCADE). Specs 05, 08, 10, 09.
- Simulados sin motor: gloton (ARCADE), invasores (SHOOTER), ranaria (ARCADE), duelo-pixel (VERSUS).
- Referencias en started-games: todas portadas (02-asteroids, 03-tetris, 04-arkanoid, 05-snake-assets). Lo siguiente requiere motor nuevo.
- Categoría VERSUS sin ningún jugable.
## Decisiones clave
- 2026-11-06: primera ronda. Recomendada ranaria (31/35); alternativas invasores 30, gloton 29, duelo-pixel 27 → ver suggestions.md
- 2026-11-06: consolidadas 20 ideas originales de una ronda paralela (Habilidad, Acción, Puzzle, Estrategia/experimental), todas pendientes. Ranaria sigue recomendada por decisión del coordinador aunque orbita y lluvia-neon suman 34 → reevaluar en la próxima ronda.
- Ids renombrados por choque: anillo (antes orbita, shooter de anillo) y onda (antes pulso, onda expansiva). `orbita` = timing de un botón, `pulso` = ritmo.
## Notas técnicas transversales
- Las 20 ideas de la ronda paralela son ids nuevos: cada una necesita migración que la inserte en public.games.
- `cat` solo admite ARCADE/PUZZLE/SHOOTER/VERSUS; una categoría nueva exige migrar el check y tocar `Category`/`CATS` en lib/games.ts.
- derrape, canasta y cifra necesitan en PlayerHud un contador "Tiempo" en lugar de "Vidas" (hoy solo existe la alternativa "Líneas").
## Índice
- suggestions.md: registro completo de sugerencias
