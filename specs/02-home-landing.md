# SPEC 02 — Home (landing page) de Arcade Vault

> **Estado:** Aprovada
> **Depende de:** SPEC 01
> **Fecha:** 2026-10-21
> **Objetivo:** Portar a Next 16 la landing de `reference/resources/templates/home.jsx` como nueva portada en `/`, moviendo la Biblioteca a `/biblioteca`.

## Por qué existe esta spec

La plantilla de referencia se amplió con una pantalla de inicio (`home.jsx`) y el `nav.jsx` añade el enlace "Inicio". Sus estilos están en `reference/resources/templates/styles.css` (bloques `HOME PAGE`, `ACTIVITY` y `PRICING`), pero todavía no en `app/globals.css`. En la SPEC 01 la Biblioteca ocupa `/`; para que la landing sea la portada, como en la plantilla, la Biblioteca pasa a `/biblioteca` y los enlaces de vuelta se actualizan.

## Alcance

**Dentro:**

- Nueva ruta `/` con la landing completa de `home.jsx`, en este orden:
  - **Hero:** siluetas pixel flotantes (8 SVG), "▸ INSERTA UNA MONEDA_" con cursor parpadeante, título en tres líneas "EL ARCADE / CLÁSICO ESTÁ / DE VUELTA", subtítulo, botones "▶ EXPLORAR JUEGOS" (→ `/biblioteca`) y "✦ CREAR CUENTA" (→ `/login`) e indicador "DESLIZA ▼".
  - **// 01 ¿POR QUÉ ARCADE VAULT?:** 4 tarjetas de características con iconos pixel (GAMEPAD, FREE, TROPHY, ROCKET).
  - **// 02 JUEGOS DISPONIBLES AHORA:** los 6 primeros juegos de `GAMES` como mini-tarjetas (→ `/juegos/[id]`) y botón "VER TODOS LOS JUEGOS →" (→ `/biblioteca`).
  - **Stats:** "12+ JUEGOS", "MILES DE PARTIDAS", "GLOBAL RANKING", literales.
  - **// 03 ACTIVIDAD EN VIVO:** "ÚLTIMAS PUNTUACIONES" (7 filas) y "TOP JUGADORES · HOY" (5 filas) con enlace "VER SALÓN →" (→ `/salon`). Datos literales de la plantilla.
  - **// 04 PRECIOS:** tarjeta "JUGADOR VAULT $0 / SIEMPRE" con lista, botón "EMPEZAR GRATIS →" (→ `/login`), sello "FREE PLAY" y 3 preguntas frecuentes.
  - **CTA final:** "¿LISTO PARA JUGAR?" con botón "INSERTAR MONEDA →" (→ `/biblioteca`).
- Animación `.reveal`: las secciones aparecen al entrar en pantalla (IntersectionObserver). Con `prefers-reduced-motion: reduce` se muestran directamente, sin transición.
- Mover la Biblioteca de `/` a `/biblioteca`, sin cambios en su contenido.
- Nav: nuevo enlace "Inicio" (activo en `/`) antes de "Biblioteca", en la barra y en el panel móvil. "Biblioteca" pasa a estar activo en `/biblioteca` y `/juegos/*`. El logo lleva a `/`.
- Actualizar a `/biblioteca` los enlaces de vuelta que hoy apuntan a `/`, como en la plantilla: "VOLVER AL VAULT" del Detalle y del modal de fin de juego, "VOLVER A LA BIBLIOTECA" del Salón, y la navegación tras el login y "JUGAR COMO INVITADO". La 404 sigue llevando a `/`.
- Copiar a `app/globals.css` solo los estilos de la home: bloques `HOME PAGE` (líneas 930–1070), `ACTIVITY` (1621–1671) y `PRICING` (1672–1744) de `reference/resources/templates/styles.css`.

**Fuera de alcance (para futuras specs):**

- Página "Acerca de" (`about.jsx`), su enlace en el Nav y sus estilos (`ABOUT PAGE`).
- Estilos `GAMEPAD` y `Theme variants` de la plantilla.
- Datos reales en "Actividad en vivo" y stats. Siguen siendo texto fijo.
- Preseleccionar la pestaña "CREAR CUENTA" al llegar a `/login` desde la home.
- Autenticación, persistencia de puntuaciones y créditos funcionales (ya excluidos en la SPEC 01).

## Modelo de datos

Esta spec no introduce estructuras nuevas en `lib/`. La sección de juegos usa `GAMES.slice(0, 6)` de `lib/games.ts`. Las características, stats, actividad, top jugadores, precios y FAQ son constantes locales dentro de `components/home/`, copiadas literalmente de `home.jsx`. Se acepta que "12+ JUEGOS" no coincide con los 8 juegos de `GAMES`.

## Estructura de archivos

```
app/
  page.tsx                       # reemplazado: Home (Server Component)
  biblioteca/page.tsx            # nuevo: contenido que antes estaba en app/page.tsx
  globals.css                    # modificado: estilos HOME PAGE, ACTIVITY y PRICING
  juegos/[id]/page.tsx           # modificado: "VOLVER AL VAULT" → /biblioteca
components/
  Nav.tsx                        # modificado: enlace "Inicio" y estados activos
  AuthForm.tsx                   # modificado: router.push("/biblioteca")
  HallOfFame.tsx                 # modificado: enlace → /biblioteca
  GameOverModal.tsx              # modificado: enlace → /biblioteca
  home/
    Reveal.tsx                   # client: IntersectionObserver que añade .in a los .reveal
    FloatingSilhouettes.tsx      # server: 8 SVG decorativos
    FeatureIcon.tsx              # server: iconos pixel GAMEPAD/FREE/TROPHY/ROCKET
    MiniCard.tsx                 # server: <Link> a /juegos/[id] con portada y categoría
```

Las secciones de la home se escriben directamente en `app/page.tsx`; solo se extraen a `components/home/` las piezas reutilizadas o largas de la plantilla.

## Plan de implementación

Antes de escribir UI se invoca el skill `/frontend-design`, como exige `CLAUDE.md`. El objetivo es fidelidad a la plantilla, no un rediseño.

1. Mover `app/page.tsx` a `app/biblioteca/page.tsx` y crear un `app/page.tsx` provisional con un enlace a `/biblioteca`. Actualizar el Nav: enlace "Inicio" (`/`), "Biblioteca" activo en `/biblioteca` y `/juegos/*`, en barra y panel móvil. Verificación: `/biblioteca` muestra las 8 tarjetas y el Nav marca "Biblioteca".
2. Cambiar a `/biblioteca` los enlaces de vuelta en `app/juegos/[id]/page.tsx`, `components/AuthForm.tsx` (dos `router.push`), `components/HallOfFame.tsx` y `components/GameOverModal.tsx`. La 404 no cambia. Verificación: `grep -rn 'href="/"\|push("/")' app components` solo devuelve el logo del Nav, el enlace "Inicio" y `app/not-found.tsx`.
3. Copiar a `app/globals.css` los bloques `HOME PAGE`, `ACTIVITY` y `PRICING` de la plantilla, y añadir la regla de `prefers-reduced-motion` que muestra `.reveal` sin transición. Verificación: `npm run build` pasa.
4. Crear `components/home/FloatingSilhouettes.tsx`, `FeatureIcon.tsx` y `MiniCard.tsx`, y construir en `app/page.tsx` el hero y las secciones 01 y 02 con `next/link` para todos los botones. Verificación: los botones del hero y las mini-tarjetas navegan a su destino.
5. Añadir a `app/page.tsx` las secciones de stats, 03 (actividad) y 04 (precios) y el CTA final, con los datos literales. Los números se formatean con `toLocaleString("es-ES")`. Verificación: visual en el navegador.
6. Crear `components/home/Reveal.tsx` (client) que, al montarse, observa los `.reveal` y les añade `.in`, y montarlo en `app/page.tsx`. Verificación: las secciones aparecen al hacer scroll; con reduced-motion emulado aparecen sin transición.
7. Verificación final con Playwright: comparar `/` con la home de `reference/resources/templates/arcade-vault-standalone.html` a 1440 px y 375 px, y comprobar que no hay scroll horizontal a 375 px. Ejecutar `npm run lint`, `npx tsc --noEmit` y `npm run build`.

## Criterios de aceptación

- [ ] `npm run build`, `npm run lint` y `npx tsc --noEmit` terminan sin errores.
- [ ] `/` muestra la landing con hero, secciones 01–04, stats y CTA final, en ese orden.
- [ ] `/biblioteca` muestra la Biblioteca con 8 tarjetas, buscador y chips, igual que antes en `/`.
- [ ] "▶ EXPLORAR JUEGOS", "VER TODOS LOS JUEGOS →" e "INSERTAR MONEDA →" navegan a `/biblioteca`.
- [ ] "✦ CREAR CUENTA" y "EMPEZAR GRATIS →" navegan a `/login`.
- [ ] "VER SALÓN →" navega a `/salon`.
- [ ] La sección 02 muestra exactamente 6 mini-tarjetas (los 6 primeros juegos de `GAMES`) y cada una navega a `/juegos/<id>`.
- [ ] "ÚLTIMAS PUNTUACIONES" tiene 7 filas y "TOP JUGADORES · HOY" tiene 5, con los nombres y cifras de la plantilla.
- [ ] El Nav muestra "Inicio" antes de "Biblioteca", en la barra y en el panel móvil. "Inicio" está activo solo en `/`; "Biblioteca" en `/biblioteca` y `/juegos/*`; "Salón de la Fama" en `/salon`.
- [ ] El logo del Nav navega a `/`.
- [ ] "VOLVER AL VAULT" (Detalle y modal), "VOLVER A LA BIBLIOTECA" (Salón), enviar el login y "JUGAR COMO INVITADO" navegan a `/biblioteca`.
- [ ] El botón de la 404 navega a `/`.
- [ ] Las secciones con `.reveal` empiezan ocultas y aparecen al entrar en pantalla.
- [ ] Con `prefers-reduced-motion: reduce`, todas las secciones son visibles sin hacer scroll ni transición.
- [ ] A 1440 px, la captura de `/` coincide visualmente con la home de la plantilla.
- [ ] Con un ancho de 375 px, `/` no tiene scroll horizontal.
- [ ] `app/globals.css` no contiene selectores de la página About (`.about`, `.contact-*`, `.highlight`, `.terminal-success`).
- [ ] La consola del navegador no muestra errores ni avisos de hidratación en `/`.

## Decisiones

- **Sí:** Home en `/` y Biblioteca en `/biblioteca`. Es la estructura de la plantilla, donde la landing es la portada.
- **No:** Home en `/inicio` con la Biblioteca en `/`. Evita mover archivos, pero la landing no sería la entrada del sitio.
- **Sí:** solo el enlace "Inicio" en el Nav. "Acerca de" es otra pantalla con formulario y va en su propia spec.
- **No:** añadir "Acerca de" sin página. Dejaría un enlace a la 404.
- **Sí:** copiar a `globals.css` solo los bloques de CSS de la home. Mismo enfoque que la SPEC 01 y sin estilos sin usar.
- **No:** CSS Module para la home. Rompe la convención actual de clases globales portadas de la plantilla.
- **Sí:** datos de stats, actividad y top jugadores literales y estáticos. Fidelidad a la plantilla mientras no haya backend.
- **No:** generarlos con `PLAYERS`/`seededScores`. Cambiaría nombres y cifras respecto a la plantilla sin aportar datos reales.
- **Sí:** los enlaces de vuelta van a `/biblioteca` y la 404 a `/`. Así lo hace la plantilla; la 404 lleva a la portada.
- **Sí:** `app/page.tsx` como Server Component y solo `Reveal.tsx` como Client Component. El contenido se renderiza en servidor; el cliente solo activa la animación.
- **No:** toda la Home como Client Component. Más fácil de portar, pero sin motivo para hidratar contenido estático.
- **Sí:** respetar `prefers-reduced-motion` en `.reveal`. Única desviación de comportamiento respecto a la plantilla.
- **Sí:** las mini-tarjetas y los botones son `<Link>` en lugar de `div`/`button` con `onClick`. Navegación accesible y prefetch de Next.
- **Sí:** "CREAR CUENTA" enlaza a `/login` sin preseleccionar pestaña. Igual que la plantilla y sin tocar `AuthForm` más allá de sus destinos.
- **Sí:** verificación con Playwright a 1440 px y 375 px contra `arcade-vault-standalone.html`, como en la SPEC 01.
- **Sí:** esta spec cambia rutas definidas en la SPEC 01. Los criterios de la SPEC 01 que mencionan la Biblioteca en `/` pasan a aplicarse a `/biblioteca`.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| `.reveal` empieza con `opacity: 0`; si el JS falla o tarda, las secciones quedan invisibles | `Reveal.tsx` se monta en la misma página y es mínimo; con reduced-motion el CSS las muestra sin depender del JS. |
| Algún enlace a `/` pensado para la Biblioteca queda sin actualizar y lleva a la landing | El paso 2 incluye un `grep` que lista todos los enlaces restantes a `/`. |
| Conflicto de nombres entre las clases nuevas de la home y las existentes en `globals.css` (`.stat-*`, `.btn.xl`, `.pulse`, `.blink`) | Copiar los bloques tal cual de la plantilla, donde ya conviven, y comparar con Playwright Biblioteca, Detalle y Salón además de la home. |
| Desbordamiento horizontal a 375 px en hero, siluetas o rejillas | Criterio explícito a 375 px; si la plantilla también desborda, corregirlo en `globals.css` y registrarlo como decisión, como en la SPEC 01. |
| `IntersectionObserver` en el render de servidor | Solo se usa dentro de `useEffect` en `Reveal.tsx`. |

## Lo que **no** entra en esta spec

- Página "Acerca de" y su enlace en el Nav.
- Datos reales en stats y actividad.
- Pestaña "CREAR CUENTA" preseleccionada desde la home.
- Autenticación, persistencia de puntuaciones y créditos funcionales.

Cada uno de estos, si llega, va en su propia spec.
