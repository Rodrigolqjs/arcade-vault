---
name: project-skins-system
description: Decisiones del sistema común de skins (implementado con rocas el 2026-11-06) y criterios extra usados al auditar
metadata:
  type: project
---

Decisiones de 2026-11-06, implementadas con rocas. Archivos reales: `lib/games/skins.ts`, `components/games/SkinSelector.tsx`, estilos `.skin-selector`/`.skin-option` en `app/globals.css`:

- `SkinId` común en `lib/games/skins.ts`; paleta por motor en `lib/games/<motor>/skins.ts`, `SKINS: Record<SkinId, …>`, `clasico` derivado de `COLORS`/`GLOW` (sin hex duplicados).
- `glow` por entidad (objeto), no número único. Clave extra `edges: "round" | "hard"` para retro (lineJoin miter, balas cuadradas).
- Selector "ASPECTO" con CLÁSICO/NEÓN/RETRO debajo del `.crt`; deshabilitado en `playing`, habilitado en `ready` y pausa; `blur()` tras clic; `setSkin` repinta si el bucle está parado.
- `localStorage` `av-skin:<game-id>` con try/catch.
- Categoría propia "efecto transitorio" (llamas, partículas con alfa): ≥ 3:1 en centro. Está en Preguntas abiertas.
- Retro de rocas: fósforo ámbar de 3 tonos + fondo `#0f0a02`. Para otros juegos, considerar variar (verde, etc.) para dar identidad, o unificar si el usuario lo pide.

**Why:** elecciones mías; el usuario aún no ha opinado sobre ellas (siguen en Preguntas abiertas).
**How to apply:** en el próximo juego, reutiliza la infraestructura ya implementada y comprueba si el usuario cambió alguna decisión en el código o en `reference/game-with-themes.md`; si es así, regístralo como preferencia. Ver [[feedback-implement-directly]].

Hallazgo transversal: `.crt-screen::before` (viñeta) no tiene `z-index` y queda bajo el canvas opaco, así que la medida "esquina" es conservadora en todos los juegos.
- 2026-11-09 · Rediseño del selector con /frontend-design: panel de hardware bajo el gabinete del CRT (`.skin-panel`, `.skin-rocker`, `.skin-key`), tecla hundida + LED verde en la activa, y una mini pantalla por skin con sus colores reales. `SkinSelector` exige la prop `previews: Record<SkinId, SkinPreview>` (`{ bg, colors: [hasta 3 entidades principales], glow }`), construida en el player desde `SKINS` del motor (nunca hex en CSS). Las formas de los puntos son: 1.º triángulo, 2.º círculo, 3.º cuadrado. Pista deshabilitada: "Pausa con P para cambiar".
- 2026-11-09 · caida, serpentina y bloque-buster implementados en una sola ejecución ("todos los que faltan"). Cada juego tiene su propio retro: rocas ámbar, caida fósforo verde (4 tonos × patrón de hueco), serpentina fósforo blanco frío (núcleo en rombo), bloque-buster paleta corta de 4 tonos crema/ocre/verde azulado/ladrillo. Neón: todas las entidades a distinta luminancia (≥ 0.05) para no depender del tono.
- Patrón repetido en los 3: constantes visuales que estaban como literales en el motor (GLOW, TRAIL_FADE, fondo, bisel, oscurecido) se mueven a `constants.ts`/paleta para que `clasico` las derive. El muro de serpentina se mide como entidad (es letal).
- Hallazgo transversal en clásico: el magenta `#ff006e` falla la esquina (1.45) en los cuatro juegos; el usuario solo aprobó corregirlo en rocas (`#ff4d94`). Las otras propuestas siguen en Preguntas abiertas.
- Con un `next dev` en el puerto 3000 no se lanza `npm run build` (regla de la definición del agente desde 2026-11-09). 2026-11-10: el agente que me lanzó para ranaria indicó que Next 16 separa el dev en `.next/dev` (lo confirma `version-16.md`), así que el build se ejecutó con el dev vivo y este siguió respondiendo 200. Si el usuario no objeta, el build convive con el dev.
- 2026-11-10 · ranaria: sin fondo único (bandas = fondo), cada entidad se mide contra su banda y la rana también contra el relleno del tronco. Retro propio: 4 tonos lima/salmón/hueso/lavanda en noche violeta, bordes duros.
