# Plantilla: spec de juego jugable

Forma que debe tener la spec que escribe `/add-game`. Mismo estilo que `specs/05-asteroides-jugable.md`. Sustituir todos los `<…>`; borrar las líneas que no apliquen (p. ej. assets si no hay). Los bloques sin marcadores son fijos: el patrón de la plataforma.

---

```markdown
# SPEC NN — <Título del juego> jugable en <ID EN MAYÚSCULAS>

> **Estado:** Borrador
> **Depende de:** SPEC 05, SPEC 06, SPEC 07
> **Fecha:** <fecha de la sesión>
> **Objetivo:** <Portar a TypeScript el juego de `reference/resources/started-games/<carpeta>/` | Crear un juego original de <género>> y montarlo en `/juegos/<id>/jugar` con el HUD, la pausa, el modal de fin de juego y el leaderboard real de la plataforma.

## Por qué existe esta spec

<Qué es el original (archivos, tamaño del canvas, dependencias) o qué juego nuevo se diseña. Por qué ocupa la entrada `<id>` del catálogo. Qué hay que cambiar para que viva en React: globals, listeners, HUD y GAME OVER pintados en canvas, assets…>

## Alcance

**Dentro:**

- Migración `supabase/migrations/<timestamp>_<id>_jugable.sql`: `accepts_scores = true` para `<id>`<, nuevo `long`><| insert de la fila nueva>.
- Motor en TypeScript en `lib/games/<juego>/` <portado de `game.js`> con la misma jugabilidad:
  - <mecánica 1 con sus valores>
  - <puntuación: qué da puntos y cuántos>
  - <vidas / niveles / velocidad>
  - <condición de fin de partida>
- Sin globals: todo el estado vive en la instancia creada por `create<Juego>Game()`.
- El motor añade sus listeners al crearse y los elimina en `destroy()`, junto con el `requestAnimationFrame`.
- Paleta neón de la plataforma en el canvas: <entidad → color>, con glow en <entidades principales>.
- El canvas no pinta <lo que pintaba el original: SCORE, NIVEL, vidas, GAME OVER, pausa…>. <Solo conserva: indicadores efímeros, si los hay.>
- Canvas con resolución lógica <W>×<H>, escalado por CSS al 100 % de `.crt-screen` y backing store × `devicePixelRatio`.
- `components/games/<Juego>Player.tsx`: HUD de la plataforma (<qué muestran Puntuación, Vidas y Nivel en este juego>), CRT con el canvas, overlays y `GameOverModal` con `saveable`.
- Fases en React: `ready` → `playing` ⇄ `paused` → `over`, como en la SPEC 05. Arranque con <tecla> o clic en el CRT.
- Controles: <tecla → acción>. `P` y `Escape` pausan.
- Registro: `<id>` en `PLAYABLE_GAME_IDS` y su entrada en `RealGamePlayer.tsx`.
- <Assets en `public/games/<id>/`.>

**Fuera de alcance (para futuras specs):**

- Controles táctiles.
- <Lo descartado del original: selector de niveles, sonido, pausa propia…>
- <Mecánicas nuevas que no estén en el original.>
- Framework de tests.

## Modelo de datos

Migración (`supabase/migrations/<timestamp>_<id>_jugable.sql`):

\`\`\`sql
<SQL concreto>
\`\`\`

API pública del motor (`lib/games/<juego>/engine.ts`):

\`\`\`ts
export interface HudState {
score: number;
lives: number;
level: number;
}
export interface <Juego>Events {
onHud: (hud: HudState) => void; // solo cuando cambia algún valor, no cada frame
onGameOver: (score: number) => void; // GAMEOVER_DELAY después de <condición>
}
export interface <Juego>Game {
start: () => void; // partida nueva con valores iniciales, limpia teclas pendientes
pause: () => void; // detiene el rAF
resume: () => void; // reanuda sin salto de dt
end: () => number; // detiene la partida (botón FIN) y devuelve la puntuación
destroy: () => void; // cancela el rAF y elimina los listeners
}
export function create<Juego>Game(
canvas: HTMLCanvasElement,
events: <Juego>Events,
): <Juego>Game;
\`\`\`

Estado interno (no exportado):

\`\`\`ts
type EngineState = "ready" | "playing" | <estados propios> | "gameover";
\`\`\`

Constantes (`lib/games/<juego>/constants.ts`), con los valores de <`game.js` | el diseño acordado>:

\`\`\`ts
export const W = <W>;
export const H = <H>;
<constantes literales>
export const GAMEOVER_DELAY = <s>;
export const COLORS = {
<entidad>: "<hex>", // --<token de app/globals.css>
};
\`\`\`

<Nuevo texto de `<id>.long`, si cambia.>

## Estructura de archivos

\`\`\`
app/
globals.css # modificado: estilos del juego<, cover-<id>>
components/
games/
RealGamePlayer.tsx # modificado: entrada <id>
<Juego>Player.tsx # nuevo ("use client"): fases, HUD, CRT, canvas, overlays, modal
lib/
games/
registry.ts # modificado: <id> en PLAYABLE_GAME_IDS
<juego>/
constants.ts # nuevo
entities.ts # nuevo
engine.ts # nuevo: create<Juego>Game()
<levels.ts> # nuevo, si hay niveles
lib/supabase/database.types.ts # regenerado
<public/games/<id>/…> # nuevo, si hay assets
supabase/migrations/
<timestamp>_<id>_jugable.sql # nuevo
\`\`\`

<`reference/resources/started-games/<carpeta>/` no se modifica ni se importa: es solo la fuente del port.>

## Plan de implementación

<Lectura previa de docs y `/frontend-design`, como en checklist.md.>

<Los pasos de checklist.md, adaptados y numerados, cada uno con su "Verificación:". Cada paso commiteable solo y de 30–50 líneas como máximo; el último no es "probar todo" ni cambia el estado de la spec.>

## Criterios de aceptación

<Criterios estándar de checklist.md + los propios del juego con valores concretos.>

## Decisiones

- **Sí:** ocupar la entrada `<id>` del catálogo. <razón>
- **Sí:** motor sin React con callbacks y player con el patrón de `AsteroidsPlayer`. Limpia listeners y rAF al desmontar y reutiliza HUD, pausa y modal.
- **No:** cargar el original intacto con `<Script>` o un iframe. Globals, listeners sin limpiar y sin comunicación con React.
- **Sí:** HUD de React y `GameOverModal`; el canvas no pinta marcadores. Mismo aspecto que el resto de la plataforma.
- **Sí:** `accepts_scores = true` en una migración. RLS no puede leer `PLAYABLE_GAME_IDS`.
- <Decisiones propias: controles, qué se descarta, paleta, assets, significado del HUD…>

## Riesgos

<Tabla de riesgos estándar de checklist.md + los propios del juego.>

## Lo que **no** entra en esta spec

- <Resumen de "Fuera de alcance".>

Cada uno de estos, si llega, va en su propia spec.
```

## Reglas globales (de la plantilla de `/spec`)

- Una idea por frase.
- Nombres concretos: rutas, teclas y valores exactos.
- Sin TODOs ni marcadores `<…>`: una decisión pendiente se toma o se registra con su razón.
- Sin código ejecutable largo: solo fragmentos cortos de estructuras (API del motor, constantes, SQL).
- Markdown estándar que se vea bien en GitHub.
- Las secciones se llaman como en las specs del repo (`Alcance`, `Plan de implementación`, `Criterios de aceptación`…), que es lo que busca `/spec-impl`.

Nota: en la spec real los bloques de código usan tres comillas invertidas normales; aquí van escapadas solo para poder anidarlos dentro de la plantilla.
