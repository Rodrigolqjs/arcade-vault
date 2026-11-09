---
name: feedback-implement-directly
description: El usuario decidió que skin-designer implementa las skins directamente en el código, sin escribir specs (excepción al flujo spec-driven)
metadata:
  type: feedback
---

Implementar las skins directamente en el código (paletas, motor, selector, persistencia) y verificar con tsc/lint/build; no escribir specs. Sin commits ni ramas.

**Why:** decisión del usuario (2026-11-06): las skins son puramente visuales, no tocan jugabilidad, puntuación ni base de datos, así que no justifican el ciclo spec → aprobación → /spec-impl. La definición `.claude/agents/skin-designer.md` se reescribió con esta regla.

**How to apply:** en cada juego, reutilizar `lib/games/skins.ts` y `components/games/SkinSelector.tsx` (ya existen desde rocas), crear `lib/games/<motor>/skins.ts` con `clasico` derivado de `COLORS`, pasar `palette` a los `draw()`, añadir `options.skin` + `setSkin` al motor y montar `SkinSelector` debajo del `.crt`. Ver [[project-skins-system]].
