---
name: add-game
description: Designs a spec to make a game playable in Arcade Vault with real scores and leaderboard, either by porting a game from reference/resources/started-games/ or by designing a new original engine for a catalog id. Same flow as /spec (asks clarifying questions, saves a Draft spec in specs/), specialized with the pattern of SPEC 05, 06 and 07. The resulting spec is implemented with /spec-impl.
disable-model-invocation: true
argument-hint: "<carpeta de reference/resources/started-games o id del catálogo>"
allowed-tools: Read, Glob, Grep, Write, AskUserQuestion, Bash(ls:*), Bash(cat:*), Bash(date:*)
---

# /add-game — Diseñador de specs de juegos jugables

## Contexto de la sesión

Fecha de hoy (úsala en la cabecera de la spec, nunca la inventes):
!`date +%F`

Specs existentes:
!`ls specs/ 2>/dev/null || echo "The specs/ folder does not exist yet"`

Configuración de ramas de /spec-impl:
!`cat specs/.spec-config.yml 2>/dev/null || echo "specs/.spec-config.yml does not exist yet"`

Juegos de referencia disponibles:
!`ls reference/resources/started-games/`

Juegos que ya tienen motor real:
!`cat lib/games/registry.ts`

Migraciones:
!`ls supabase/migrations/`

---

Este skill es `/spec` especializado en una sola clase de feature: hacer jugable un juego en Arcade Vault, con motor canvas, player, registro, `accepts_scores` y leaderboard real. **Aquí no se escribe código.** Tu trabajo es analizar el juego, preguntar lo que no esté claro y escribir una spec en `specs/` que `/spec-impl` pueda implementar paso a paso.

Archivos de apoyo en este directorio:

- `spec-template.md`: el esqueleto de la spec. Sigue la plantilla de `/spec` (`~/.claude/skills/spec/template.md`) con el estilo de `specs/05-asteroides-jugable.md`.
- `checklist.md`: la receta técnica de integración, con los pasos del plan, los criterios de aceptación y los riesgos que se repiten en todos los juegos.

## Flujo del comando

- Sigue las cuatro fases en orden. **Nunca te saltes la Fase 3:** las preguntas son lo importante. Si el usuario quiere ir más rápido, recuérdale que una spec mala se paga después en código. La Fase 4 tiene un camino rápido cuando la Fase 3 está realmente completa.
- Responde en el idioma del prompt inicial. En este proyecto, español.

### Fase 1 — Entender el contexto

1. Lee `CLAUDE.md` y `AGENTS.md`.
2. Lee `spec-template.md`, `checklist.md` y la plantilla de `/spec` en `~/.claude/skills/spec/template.md` (reglas globales del documento).
3. Lee `specs/05-asteroides-jugable.md`, `specs/06-catalogo-juegos-supabase.md` y `specs/07-leaderboard-puntuaciones.md`. Lee también las dos specs más recientes si son otras. Copia su idioma, su cabecera y las palabras exactas de estados y secciones.
4. Lee el patrón implementado: `lib/games/asteroids/engine.ts`, `components/games/AsteroidsPlayer.tsx`, `components/games/RealGamePlayer.tsx`, `lib/games/registry.ts`, `components/PlayerHud.tsx` y `components/GameOverModal.tsx`. Si ya hay más juegos reales, léelos también: el más reciente es la mejor referencia.
5. Lee las migraciones de `supabase/migrations/` para saber qué ids hay en `public.games`, su `sort_order` y cuáles ya tienen `accepts_scores = true`.

Si `$ARGUMENTS` viene vacío, pregunta en una frase qué juego: una carpeta de `reference/resources/started-games/` o un id del catálogo sin motor. Si el id ya está en `PLAYABLE_GAME_IDS`, avisa y para.

### Fase 2 — Analizar el origen

**Port desde `reference/resources/started-games/<carpeta>/`:**

- Lee completos `game.js` y el resto de `.js`, `index.html`, `style.css`, `README.md` y `CLAUDE.md`. Lista `assets/` y `specs/` si existen.
- Extrae el tamaño lógico del canvas, las constantes (literales), las entidades, los estados internos, el input (teclado, ratón), la puntuación, las vidas, los niveles, la condición de fin y los assets.
- Señala lo que choca con la plataforma: HUD, pausa, overlays o GAME OVER pintados por el juego (se eliminan, los pone React), globals, listeners sin limpiar, selectores de nivel, sonido, DOM fuera del canvas y sprites.
- La carpeta de referencia nunca se importa ni se modifica: es solo la fuente del port.

**Juego nuevo (sin carpeta de referencia):**

- Diseña un juego original dentro de un género (por ejemplo, "serpiente en grilla"). No recrees un juego comercial concreto con sus niveles, personajes o nombres.
- Propón mecánicas, puntuación, vidas o niveles, condición de fin, tamaño lógico y controles. El usuario los cierra en la Fase 3.

Resume el análisis al usuario en pocas líneas antes de preguntar.

### Fase 3 — Aclarar con preguntas

Esta es la fase más importante. Detecta ambigüedades y pregunta; no supongas.

Pregunta en bloques de 3 a 5 con `AskUserQuestion`, con 2–4 opciones y tu recomendación primero y marcada. Espera la respuesta después de cada bloque.

**Preguntas que siempre hay que cerrar:**

1. **Id del catálogo.** Qué entrada de `public.games` ocupa. Propón la que ya describe el juego (p. ej. Tetris → `caida`, Arkanoid → `bloque-buster`). Si es un id nuevo: `title`, `short`, `long`, `cat`, `cover`, `color` y `sort_order` (único).
2. **Texto `long`.** Si el texto actual promete mecánicas que el juego no tiene, propón uno nuevo, como hizo la SPEC 05 con los OVNIs.
3. **HUD.** `PlayerHud` muestra puntuación, vidas y nivel. Qué significa cada uno en este juego. Si hay que cambiar `PlayerHud`, entra en el alcance y se dice.
4. **Controles.** Teclas (y ratón si el original lo usa), qué tecla arranca desde `ready` y cuáles se bloquean con `preventDefault`. `P` y `Escape` quedan reservadas para la pausa.
5. **Qué se descarta del original.** Selector de niveles, sonido, pausa propia, pantallas propias. Lo descartado va a "Fuera de alcance".
6. **Aspecto.** Paleta neón de `app/globals.css` en lugar de los colores del original; con sprites, si se conservan o se dibujan formas.
7. **Assets.** Imágenes en `public/games/<id>/`; niveles como datos en `lib/games/<juego>/`.
8. **Fin de partida.** Qué dispara `onGameOver` y con qué retardo.

Si aparece algo que abre la caja de Pandora (multijugador, controles táctiles, sonido, varios modos), di que merece su propia spec y pregunta si se deja fuera.

**Cuándo dejar de preguntar.** Cuando puedas responder sin suponer nada:

1. ¿Qué archivos aparecen o cambian?
2. ¿Cuál es el primer paso ejecutable y cuál el último?
3. ¿Cómo se verifica que el juego está terminado?

Si no puedes responder alguna, sigue preguntando.

### Fase 4 — Escribir la spec

**Si ya tienes toda la información** (respondes las tres preguntas de arriba sin suponer nada), **no vayas sección a sección.** Escribe la spec completa y guárdala. No pidas confirmación por secciones ni enseñes un borrador antes: el usuario revisa el archivo guardado.

**Solo si falta información** (el usuario cortó la Fase 3, una respuesta fue vaga o una sección no se puede escribir sin inventar), desarrolla las secciones una a una. Muestra cada una y pregunta: "¿Esta sección queda así o quieres ajustarla?". Pasa a la siguiente solo cuando el usuario confirme.

En ambos casos, el contenido sigue `spec-template.md`: cabecera, por qué existe, alcance, modelo de datos, estructura de archivos, plan de implementación, criterios de aceptación, decisiones, riesgos y lo que no entra. Copia los pasos, criterios y riesgos de `checklist.md` adaptados al juego: archivos reales, teclas, constantes y SQL concreto.

**Reglas del plan, para que `/spec-impl` pueda ejecutarlo:**

- Pasos numerados bajo `## Plan de implementación`, cada uno con su `Verificación:`.
- Cada paso deja el sistema funcionando y se puede commitear solo. `/spec-impl` para después de cada paso para revisar el diff.
- Si un paso pasa de 30–50 líneas de código, divídelo (el motor suele necesitar dos pasos: bucle y entidades, y colisiones y puntuación).
- El último paso no es "probar todo": eso son los criterios de aceptación.
- El plan no incluye cambiar el estado de la spec: eso lo hace el humano tras verificar los criterios.

**Errores comunes que evitar:** criterios no verificables ("que funcione bien"), pasos que no están en el alcance, nombres de archivos que el usuario no confirmó, marcadores `<…>` o TODOs sin resolver y saltarse la sección de decisiones.

### Fase 5 — Guardar la spec

1. Número: el más alto de `specs/` más uno, con dos dígitos.
2. Slug: `<id>-jugable` (p. ej. `specs/08-caida-jugable.md`).
3. Fecha: la del contexto de la sesión. **Nunca escribas una fecha que no hayas leído de ahí.**
4. Escribe el archivo directamente. **No pidas permiso ni preguntes si el nombre te vale**; di la ruta en la confirmación. Pregunta solo si el archivo ya existe.
5. Estado: `Borrador`, la palabra que usan las specs del repo. **Nunca lo marques como aprobado**: lo hace el usuario tras releerla.
6. Dependencias: `SPEC 05, SPEC 06, SPEC 07`. Comprueba que esos archivos existen en `specs/`; si alguno falta, dilo en vez de dejar una referencia colgando.
7. **Crea `specs/.spec-config.yml` solo si no existe**, con el contenido por defecto de `/spec`. Si existe, no lo toques.

   ```yaml
   # spec workflow configuration
   #
   # AutoCreateBranch — controls whether /spec-impl creates the git branch automatically.
   #   true  (default) → /spec-impl creates and switches to spec-NN-slug without asking
   #   false           → /spec-impl asks for [y/N] confirmation before creating the branch
   AutoCreateBranch: true
   ```

8. Confirma al usuario:
   - Ruta del archivo creado.
   - Recordatorio: la spec está en `Borrador`; cámbiala a `Aprobado` cuando la hayas releído.
   - Si acabas de crear `specs/.spec-config.yml`, que existe y que `AutoCreateBranch` es `true` por defecto.
   - Siguiente paso: tras revisarla y aprobarla, `/spec-impl-game NN-<id>-jugable` (o `/spec-impl`, sin los agentes), que trabajará en la rama `spec-NN-<id>-jugable` y al terminar lanzará `skin-designer` y después `mobile-porter` para el juego.
   - **Para aquí.** No propongas implementar la spec ni hagas nada más.

## Reglas duras

- **Nunca escribas código** ni migraciones. Solo el `.md` de la spec y, si falta, `specs/.spec-config.yml`.
- **Nunca apliques nada a Supabase.** La migración se describe en la spec y la aplica `/spec-impl`.
- **Nunca propongas implementar la spec** después de guardarla.
- **Nunca supongas decisiones** que el usuario no confirmó. Si falta información, pregunta en la Fase 3.
- **No repitas en la Fase 4 lo que ya se respondió** en la Fase 3.
- **Si el usuario quiere saltarse la Fase 3**, recuérdale: "Las preguntas de ahora ahorran horas después. ¿Seguro que quieres saltártelas?". Si insiste, respétalo y regístralo en "Decisiones" ("Definición rápida sin aclaraciones detalladas").
- **La spec nunca importa nada de `reference/`.**
- **Un juego por spec.** Si el juego es demasiado grande (no cabe en una frase o necesita cambios en la plataforma además del juego), propón dividirlo en varias specs.

## Tono al preguntar

Directo y concreto. No te disculpes por preguntar. Nada de "si no te importa…". Preguntas concretas, no abiertas: ❌ "¿Cómo imaginas los controles?" → ✅ "¿Mover la pala con ← → o también con el ratón? Recomendación: ambas, como el original".

## Argumentos

`$ARGUMENTS` es el juego, no el nombre del archivo:

- Una carpeta de `reference/resources/started-games/` (`03-tetris`, o solo `tetris`): port.
- Un id del catálogo sin motor (`serpentina`): juego nuevo para esa entrada.
- Una descripción libre ("un juego de serpiente"): juego nuevo; el id se decide en la Fase 3.

Si se invoca sin argumentos, empieza preguntando cuál.
