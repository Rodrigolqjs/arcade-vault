# SPEC 01 — MVP visual de Arcade Vault

> **Estado:** Aprovada
> **Depende de:** ninguna
> **Fecha:** 2026-10-20
> **Objetivo:** Portar a Next 16 las cinco pantallas de `reference/resources/templates/` (Biblioteca, Detalle, Reproductor, Auth y Salón de la Fama) como interfaz navegable con datos mock, sin juegos reales.

## Por qué existe esta spec

La plantilla de referencia es un prototipo React 18 que corre con Babel en el navegador y un router por hash en una sola página. Esta spec la traduce a la arquitectura del proyecto: rutas reales del App Router, Server Components por defecto y Client Components solo donde hay interacción. El tema visual ya está portado en `app/globals.css` (commit `8f3d036`), así que esta spec solo construye pantallas y componentes encima de esas clases.

## Alcance

**Dentro:**

- Navbar fijo con logo, enlaces "Biblioteca" y "Salón de la Fama", contador "CRÉDITOS · 03" estático, botón "Iniciar Sesión" y panel lateral móvil (hamburguesa).
- Footer "© 2026 ARCADE VAULT · HECHO CON PIXELES Y NEÓN · v2.6.0".
- Pantalla **Biblioteca** (`/`): hero, buscador por nombre, chips de categoría, grilla de tarjetas con efecto tilt y estado "NO HAY RESULTADOS".
- Pantalla **Detalle** (`/juegos/[id]`): portada, tags, descripción, franja de stats, botones "JUGAR AHORA" y "VOLVER AL VAULT", y leaderboard de 10 filas.
- Pantalla **Reproductor** (`/juegos/[id]/jugar`): HUD (jugador, puntuación, vidas, nivel), pantalla CRT con arena animada en CSS, puntuación simulada que sube sola, PAUSA/REANUDAR con overlay "EN PAUSA", botón FIN que abre el modal "FIN DEL JUEGO", y botón SALIR.
- Modal "FIN DEL JUEGO": puntuación final, input de iniciales (mayúsculas, máx. 10), botón "GUARDAR PUNTUACIÓN" que solo muestra el toast "▸ PUNTUACIÓN GUARDADA_", y botones "JUGAR DE NUEVO" y "VOLVER AL VAULT".
- Pantalla **Auth** (`/login`): pestañas "INICIAR SESIÓN" / "CREAR CUENTA" (la segunda añade el campo correo), botón "JUGAR COMO INVITADO", botones sociales Google/GitHub sin acción.
- Pantalla **Salón de la Fama** (`/salon`): pestañas por juego, podio top 3 y tabla de 12 filas con animación de entrada.
- Página 404 temática (`app/not-found.tsx`) para rutas inexistentes y para `/juegos/<id-inexistente>`.
- Datos mock tipados en TypeScript: `GAMES`, `CATS`, `PLAYERS` y `seededScores`.

**Fuera de alcance (para futuras specs):**

- Cualquier juego jugable. El Reproductor es una demo visual simulada.
- Autenticación real y sesión. No se guarda usuario en ningún sitio; el Nav siempre muestra "Iniciar Sesión".
- Fila "TU MEJOR MARCA" del Salón de la Fama (depende de que exista sesión).
- Persistencia de puntuaciones (ni localStorage `av_scores` ni backend).
- Login social real con Google/GitHub.
- Sistema de créditos/monedas funcional.
- Filtros reflejados en la URL (`searchParams`).
- Panel de "tweaks" (`.tw-section`) presente en el CSS de la plantilla.
- Framework de tests.

## Modelo de datos

No hay persistencia. Los datos son constantes en memoria portadas de `reference/resources/templates/data.jsx`.

```ts
// lib/games.ts
export type Category = "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";
export type GameColor = "cyan" | "magenta" | "yellow" | "green";

export interface Game {
  id: string;          // slug usado en la URL: "bloque-buster"
  title: string;       // "BLOQUE BUSTER"
  short: string;       // descripción de tarjeta
  long: string;        // descripción de detalle
  cat: Category;
  cover: string;       // clase CSS de portada: "cover-bricks"
  color: GameColor;    // color del botón JUGAR
  best: number;        // mejor puntuación global
  plays: string;       // "12.4K"
}

export const GAMES: Game[];                              // los 8 juegos de la plantilla
export const CATS: readonly ["TODOS", ...Category[]];   // filtros de la Biblioteca
export function getGame(id: string): Game | undefined;
```

```ts
// lib/scores.ts
export interface ScoreRow {
  rank: number;
  name: string;
  score: number;
  date: string;        // "DD/MM/2026"
}

export const PLAYERS: string[];                          // los 18 alias de la plantilla
export function seededScores(seed: number, count?: number): ScoreRow[];
```

Convenciones:

- `seededScores` es determinista (mismo `seed`, mismo resultado), así que puede ejecutarse en servidor sin desajustes de hidratación.
- Semillas iguales a la plantilla: Detalle usa `id.length * 17 + 3` con 10 filas; Salón usa `id.length * 23 + 7` con 12 filas.
- Los números se formatean con `toLocaleString("es-ES")`.

## Estructura de archivos

```
app/
  layout.tsx                     # modificado: añade <Nav/>, <main className="av-main"> y <Footer/>
  page.tsx                       # reemplazado: Biblioteca
  not-found.tsx                  # nuevo: 404 temática
  login/page.tsx                 # nuevo: Auth
  salon/page.tsx                 # nuevo: Salón de la Fama
  juegos/[id]/page.tsx           # nuevo: Detalle
  juegos/[id]/jugar/page.tsx     # nuevo: Reproductor
components/
  Nav.tsx                        # client: usePathname para el enlace activo + panel móvil
  Footer.tsx                     # server
  Library.tsx                    # client: búsqueda + chips + grilla filtrada
  GameCard.tsx                   # client: efecto tilt con el ratón
  Leaderboard.tsx                # server: lista de ScoreRow del Detalle
  GamePlayer.tsx                 # client: HUD, simulación, pausa, CRT
  GameOverModal.tsx              # client: modal de fin de juego
  AuthForm.tsx                   # client: pestañas y formulario
  HallOfFame.tsx                 # client: pestañas por juego, podio y tabla
lib/
  games.ts
  scores.ts
```

## Plan de implementación

Antes de escribir UI se invoca el skill `/frontend-design`, como exige `CLAUDE.md`. El objetivo es fidelidad a la plantilla, no un rediseño.

1. Crear `lib/games.ts` y `lib/scores.ts` con los tipos y datos del modelo. Verificación: `npx tsc --noEmit` pasa.
2. Crear `components/Footer.tsx` y `components/Nav.tsx` (enlaces con `next/link`, activo por `usePathname`: "Biblioteca" activo en `/` y `/juegos/*`; panel móvil con backdrop). Montarlos en `app/layout.tsx` alrededor de `<main className="av-main">`. Verificación: `npm run dev` muestra nav y footer en `/`.
3. Crear `components/GameCard.tsx` y `components/Library.tsx`, y reemplazar `app/page.tsx` por la Biblioteca. Las tarjetas y su botón JUGAR enlazan a `/juegos/[id]`. Verificación: buscar "zzz" muestra "NO HAY RESULTADOS"; el chip PUZZLE deja solo "CAÍDA".
4. Crear `app/not-found.tsx` temático con botón de vuelta a `/`. Verificación: `/no-existe` lo muestra.
5. Crear `components/Leaderboard.tsx` y `app/juegos/[id]/page.tsx`: `await params`, `getGame(id)`, `notFound()` si no existe, y `generateStaticParams` desde `GAMES`. Verificación: `/juegos/caida` muestra el detalle; `/juegos/xyz` muestra la 404.
6. Crear `components/GamePlayer.tsx` con HUD, arena CSS, simulación de puntuación (intervalo de 220 ms, se detiene en pausa o fin), subida de nivel y botones PAUSA/FIN/SALIR. Crear `app/juegos/[id]/jugar/page.tsx` con la misma validación de `params` y `notFound()`. El nombre del jugador por defecto es "INVITADO". Verificación: la puntuación sube; PAUSA la congela y muestra el overlay.
7. Crear `components/GameOverModal.tsx` y conectarlo a FIN. "JUGAR DE NUEVO" reinicia puntuación, vidas, nivel y estado guardado. "GUARDAR PUNTUACIÓN" solo cambia a toast. Verificación manual en el navegador.
8. Crear `components/AuthForm.tsx` y `app/login/page.tsx`. El submit hace `preventDefault` y navega a `/` con `useRouter`; "JUGAR COMO INVITADO" también va a `/`; Google/GitHub no hacen nada. Verificación: la pestaña "CREAR CUENTA" añade el campo correo.
9. Crear `components/HallOfFame.tsx` y `app/salon/page.tsx` con pestañas por juego, podio y tabla, sin fila de usuario. Verificación: cambiar de pestaña cambia podio y tabla.
10. Borrar del `app/page.tsx` original cualquier resto del scaffold y eliminar de `public/` los SVG de `create-next-app` que ya no se usen (`next.svg`, `vercel.svg`, `file.svg`, `globe.svg`, `window.svg`). Verificación: `npm run lint`, `npx tsc --noEmit` y `npm run build` pasan.

## Criterios de aceptación

- [ ] `npm run build`, `npm run lint` y `npx tsc --noEmit` terminan sin errores.
- [ ] Existen y renderizan las rutas `/`, `/juegos/[id]`, `/juegos/[id]/jugar`, `/login` y `/salon`.
- [ ] La Biblioteca muestra 8 tarjetas al cargar.
- [ ] Escribir "ser" en el buscador deja solo "SERPENTINA".
- [ ] El chip "SHOOTER" deja exactamente "INVASORES" y "ROCAS".
- [ ] Una búsqueda sin coincidencias muestra "NO HAY RESULTADOS".
- [ ] Hacer clic en una tarjeta navega a `/juegos/<id>` de ese juego.
- [ ] `/juegos/no-existe` y `/juegos/no-existe/jugar` muestran la página 404 temática.
- [ ] El Detalle muestra un leaderboard de 10 filas con las 3 primeras en oro, plata y bronce.
- [ ] "JUGAR AHORA" navega a `/juegos/<id>/jugar`.
- [ ] En el Reproductor la puntuación aumenta sola; PAUSA la detiene y muestra "EN PAUSA"; REANUDAR la reanuda.
- [ ] FIN abre el modal "FIN DEL JUEGO" con la puntuación final.
- [ ] El input de iniciales convierte a mayúsculas y no admite más de 10 caracteres.
- [ ] "GUARDAR PUNTUACIÓN" muestra "▸ PUNTUACIÓN GUARDADA_" y no escribe nada en `localStorage`.
- [ ] "JUGAR DE NUEVO" cierra el modal y pone la puntuación en 0, las vidas en 3 y el nivel en 01.
- [ ] En `/login`, la pestaña "CREAR CUENTA" muestra el campo "Correo electrónico" y "INICIAR SESIÓN" lo oculta.
- [ ] Enviar el formulario de login navega a `/` y el Nav sigue mostrando "Iniciar Sesión".
- [ ] En `/salon`, cambiar de pestaña de juego cambia el podio y la tabla de 12 filas.
- [ ] El enlace activo del Nav es "Biblioteca" en `/` y `/juegos/*`, y "Salón de la Fama" en `/salon`.
- [ ] Con un ancho de 375 px, los enlaces del Nav se ocultan, aparece la hamburguesa y abre el panel lateral.
- [ ] La consola del navegador no muestra errores ni avisos de hidratación en ninguna ruta.

## Decisiones

- **Sí:** rutas reales del App Router (`/`, `/juegos/[id]`, `/juegos/[id]/jugar`, `/login`, `/salon`). URLs compartibles e idiomáticas en Next 16.
- **No:** replicar el router por hash de la plantilla. Va contra el framework y rompe el botón atrás.
- **Sí:** Reproductor con demo simulada (puntuación aleatoria, pausa, modal). Permite ver y validar todos los estados visuales sin un juego real.
- **No:** placeholder "Próximamente". Dejaría sin construir el HUD y el modal, que sí son parte de la plantilla.
- **Sí:** auth solo visual, sin sesión. La auth real necesita decisiones propias (proveedor, backend) y va en otra spec.
- **No:** sesión mock en localStorage `av_user`. Sería código desechable que habría que deshacer con la auth real.
- **Sí:** "GUARDAR PUNTUACIÓN" solo muestra feedback. La persistencia de puntuaciones va en otra spec.
- **Sí:** reutilizar las clases de `app/globals.css` y convertir los `style={{}}` inline de la plantilla a utilidades Tailwind. Mínimo riesgo de diferencias visuales.
- **No:** reescribir el tema completo en Tailwind. Mucho trabajo y riesgo sin beneficio para el MVP.
- **Sí:** `lib/` y `components/` en la raíz, accesibles con el alias `@/`.
- **Sí:** filtros de Biblioteca y pestaña del Salón como estado local (`useState`). Simple; reflejarlos en la URL puede ir en otra spec.
- **Sí:** `notFound()` y `app/not-found.tsx` temático para juegos inexistentes.
- **Sí:** Server Components por defecto; `"use client"` solo en Nav, Library, GameCard, GamePlayer, GameOverModal, AuthForm y HallOfFame.
- **Sí:** `generateStaticParams` en `/juegos/[id]` y `/juegos/[id]/jugar`. Los 8 juegos son fijos, así que las páginas se prerenderizan.
- **Sí:** se ignora la ruta `references/templates/` mencionada en la petición; la ruta real es `reference/resources/templates/`.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| `params` síncrono (patrón de Next 15 o anterior) rompe el build en Next 16 | Siempre `await params`; consultar `node_modules/next/dist/docs/` antes de escribir las páginas. |
| Desajuste de hidratación por `Math.random` en la simulación | La simulación solo corre dentro de `useEffect` en el cliente; el render inicial siempre muestra 0. |
| Diferencias visuales respecto a la plantilla al convertir estilos inline | Comparar cada pantalla lado a lado con `reference/resources/templates/Arcade Vault.html` abierto en el navegador. |
| Efecto tilt que escribe `style.transform` choca con el `:hover` de `.card` | Mantener el mismo enfoque de la plantilla (ref + reset en `mouseleave`), que ya resuelve ese caso. |

## Lo que **no** entra en esta spec

- Juegos jugables.
- Autenticación, sesión y fila "TU MEJOR MARCA".
- Persistencia de puntuaciones.
- Login social real.
- Créditos funcionales.
- Filtros en la URL.

Cada uno de estos, si llega, va en su propia spec.
