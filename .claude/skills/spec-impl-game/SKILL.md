---
name: spec-impl-game
description: /spec-impl para specs que hacen jugable un juego de Arcade Vault. Sigue exactamente el mismo flujo que /spec-impl (spec aprobada, rama spec-NN-slug, paso a paso con pausas, sin commits) y, cuando termina el último paso, lanza el agente skin-designer y, cuando este acaba, el agente mobile-porter para ese juego, uno detrás de otro y nunca en paralelo.
disable-model-invocation: true
argument-hint: <NN-spec-name>
allowed-tools: Read, Glob, Grep, Edit, Write, AskUserQuestion, Agent, Bash(git status:*), Bash(git branch:*), Bash(git checkout:*), Bash(git log:*), Bash(git diff:*), Bash(git stash:*), Bash(cat:*), Bash(ls:*), Bash(npm run:*), Bash(npx tsc:*), Bash(npx eslint:*), Bash(npx prettier:*), Bash(npx supabase:*), Bash(pgrep:*), Bash(lsof:*)
---

# /spec-impl-game — /spec-impl + skins + móvil

## Contexto de la sesión

Estado del repositorio:
!`git status --short`

Rama actual:
!`git branch --show-current`

Specs disponibles:
!`ls specs/ 2>/dev/null || echo "The specs/ folder does not exist"`

Configuración de ramas:
!`cat specs/.spec-config.yml 2>/dev/null || echo "AutoCreateBranch: true (default, no config file)"`

Juegos jugables hoy:
!`cat lib/games/registry.ts`

---

## Qué es este comando

Es `/spec-impl` especializado en specs de juegos jugables (las que escribe `/add-game` o `game-jam`, con el patrón de `specs/08-caida-jugable.md`, `09-bloque-buster-jugable.md` y `10-serpentina-jugable.md`). Tiene tres tramos, en este orden estricto:

1. **Implementar la spec** con las fases 1–4 de `/spec-impl`, sin cambiar ni una regla.
2. **Skins**: lanzar el agente `skin-designer` para el juego y esperar a que termine.
3. **Móvil**: lanzar el agente `mobile-porter` para el mismo juego y esperar a que termine.

Los dos agentes van **uno detrás de otro, nunca en paralelo**: ambos editan el player del juego (y `mobile-porter` también `app/globals.css`), y `skin-designer` corre `npm run build`, que no puede convivir con el `next dev` que arranca `mobile-porter`.

El argumento recibido es: `$ARGUMENTS`

Úsalo como argumento de la Fase 1 de `/spec-impl` (el texto de abajo dice `$ARGUMENTS`, pero se refiere a este valor). El "Session context" que menciona `/spec-impl` es el bloque "Contexto de la sesión" de arriba.

---

## Tramo 1 — Fases 1–4 de `/spec-impl`

Este es el `SKILL.md` original de `/spec-impl`, cargado tal cual. Sigue sus fases 1, 2, 3 y 4 **exactamente** como dicen (localizar la spec, validar que está aprobada, comprobar el working tree, crear o retomar la rama `spec-NN-slug`, mostrar el resumen, pedir confirmación antes del Paso 1, parar tras cada paso, no improvisar ante ambigüedades y **no commitear nunca**). Responde al usuario en español.

<spec-impl>
!`cat ~/.claude/skills/spec-impl/SKILL.md`
</spec-impl>

### Añadido a la Fase 1: ¿es una spec de juego?

En cuanto localices la spec y antes de validar su estado, deduce el **`<game-id>`** que hace jugable: el id que el plan añade a `PLAYABLE_GAME_IDS` en `lib/games/registry.ts`, al mapa de `components/games/RealGamePlayer.tsx` y a la migración que pone `accepts_scores = true`.

- Si la spec no hace jugable ningún juego, para y di: "Esta spec no hace jugable ningún juego; usa `/spec-impl <spec>`". No continúes.
- Si encuentras más de un id candidato, pregunta cuál es antes de seguir.
- Si lo encuentras, muéstralo junto al resumen de la Fase 3: `Juego: <game-id>`.

### Cambio en el cierre de la Fase 4

Cuando el usuario confirme el diff del **último** paso del plan, no muestres todavía el mensaje final de `/spec-impl`: pasa al Tramo 2.

---

## Tramo 2 — `skin-designer`

1. Comprueba que el tramo 1 terminó de verdad: `<game-id>` está en `PLAYABLE_GAME_IDS` (`lib/games/registry.ts`) y su player existe en `components/games/`. Si no, para y explica qué falta.
2. Avisa: `🎨 Implementación terminada. Lanzo skin-designer para <game-id>.`
3. Lanza el agente con la herramienta `Agent`, `subagent_type: "skin-designer"`, y un prompt como este:

   ```
   Skins para <game-id>. Es el juego que acaba de hacerse jugable con la spec specs/<NN-slug>.md,
   implementada en la rama spec-<NN-slug> (sin commitear). Trabaja solo este juego, sigue tu flujo
   habitual (clasico/neon/retro, contraste medido, SkinSelector, tsc/lint/build, fila en
   reference/game-with-themes.md) y no hagas commits. Al terminar, informa de las paletas, los
   archivos que tocaste y el resultado de tsc, lint y build.
   ```

4. **Espera la notificación de que el agente terminó.** No lances `mobile-porter` en el mismo mensaje ni antes de tener su informe.
5. Resume su informe al usuario: skins creadas, contraste, archivos tocados y la fila de `reference/game-with-themes.md`.
6. Si el agente falló o dejó `tsc`, `lint` o `build` en rojo, para y pregunta al usuario cómo seguir. No lances `mobile-porter` sobre un árbol roto.

---

## Tramo 3 — `mobile-porter`

1. Comprueba que no queda un `next dev` vivo de pasos anteriores (`pgrep -fl "next dev"`). Si hay uno que arrancaste tú, páralo; si no es tuyo, díselo al usuario (`mobile-porter` puede reutilizarlo).
2. Avisa: `📱 Skins listas. Lanzo mobile-porter para <game-id>.`
3. Lanza el agente con `Agent`, `subagent_type: "mobile-porter"`, y un prompt como este:

   ```
   <game-id>. Es el juego que acaba de hacerse jugable con la spec specs/<NN-slug>.md (rama
   spec-<NN-slug>, sin commitear) y al que skin-designer acaba de añadir skins. Revísalo con tu
   flujo habitual (criterios de specs/11-controles-tactiles.md, viewports de móvil, tablet y
   escritorio, fila en reference/mobile-audit.md), arregla lo que falle sin tocar jugabilidad ni
   skins y no hagas commits. Al terminar, informa de lo medido, los arreglos y los archivos tocados.
   ```

4. **Espera la notificación de que el agente terminó** y resume su informe: viewports revisados, arreglos, archivos tocados y la fila de `reference/mobile-audit.md`.

---

## Cierre

Muestra:

```
✅ Spec implementada, con skins y adaptada a móvil.

Spec:   specs/NN-slug.md
Rama:   spec-NN-slug
Juego:  <game-id>

Archivos que tocaron los agentes (revísalos en el diff):
  - skin-designer: …
  - mobile-porter: …

Siguiente paso: verifica uno por uno los criterios de aceptación de la spec.
Si pasan todos, cambia su estado a "implementada", haz el commit final y
mergea la rama a main con un PR.
```

No commitees ni abras el PR por tu cuenta: eso lo decide el usuario.
