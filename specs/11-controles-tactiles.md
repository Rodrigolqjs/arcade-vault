# SPEC 11 — Controles táctiles para jugar en móvil

> **Estado:** implementada
> **Depende de:** SPEC 05, SPEC 08, SPEC 09, SPEC 10
> **Fecha:** 2026-11-10
> **Objetivo:** Que ROCAS, CAÍDA, SERPENTINA y BLOQUE BUSTER se puedan jugar de principio a fin en un móvil o tablet táctil, con un mando virtual en pantalla, en vertical y en horizontal.

## Por qué existe esta spec

Hoy los cuatro juegos reales solo se controlan con teclado. La única excepción es BLOQUE BUSTER, que también mueve la pala con el ratón sobre el canvas. En una pantalla táctil lo único que funciona es "tocar el CRT para empezar". Una vez arrancada la partida no hay forma de girar, mover ni disparar, así que la plataforma no se puede usar desde un móvil.

La solución es un **mando virtual común** (una cruceta y los botones A y B) que se muestra solo con un puntero táctil. Cada juego enciende únicamente los botones que usa. Los motores no se reescriben: exponen `press(code)` / `release(code)`, que reutilizan su lógica de teclado con los mismos `KeyboardEvent.code` que ya entienden. El teclado sigue funcionando igual en todos los dispositivos.

## Alcance

**Dentro:**

- **Detección táctil:** hook `useTouchMode()`. Devuelve `true` si `matchMedia("(pointer: coarse)")` coincide o tras el primer `touchstart` en la página, y escucha los cambios de la media query. Con ratón y teclado en escritorio devuelve `false` y nada cambia.
- **Mando virtual común**, en el componente `components/games/TouchControls.tsx`:
  - Cruceta a la izquierda (posiciones `up`, `down`, `left`, `right`) y botones de acción a la derecha (`a`, `b`).
  - Cada juego pasa su lista de botones. Las posiciones que no usa no se pintan.
  - Usa Pointer Events (`pointerdown`, `pointerup`, `pointercancel`, `lostpointercapture`) con `setPointerCapture`, de modo que varios dedos pueden mantener botones a la vez (girar, propulsar y disparar en ROCAS).
  - Un botón mantenido sigue activo aunque el dedo se salga de él, hasta que se levanta.
  - Botones con `repeat: true`: al mantenerlos, llaman a `press` otra vez tras `REPEAT_DELAY` = 170 ms y después cada `REPEAT_INTERVAL` = 50 ms, imitando el autorepeat del teclado. Sin `repeat`, un toque es una sola llamada.
  - Al soltar cualquier botón se llama a `release(code)`.
  - Al cambiar la fase a algo distinto de `playing`, o al desmontar, el mando suelta todos los botones mantenidos y para los temporizadores de repetición.
  - Tamaño mínimo de cada botón: 56×56 px. Separación mínima entre botones: 8 px.
  - Accesible: `<button type="button">` con `aria-label` en español ("Girar a la izquierda", "Disparar"…), estado visual de pulsado y foco visible. El mando completo es un `role="group"` con `aria-label="Mando táctil"`.
- **Botones por juego** (`code` = el mismo `KeyboardEvent.code` que ya usa el motor):

  | Juego         | up                  | down                 | left                 | right                 | a               | b             |
  | ------------- | ------------------- | -------------------- | -------------------- | --------------------- | --------------- | ------------- |
  | ROCAS         | `ArrowUp` propulsar | —                    | `ArrowLeft` girar    | `ArrowRight` girar    | `Space` DISPARO | —             |
  | CAÍDA         | —                   | `ArrowDown` (repeat) | `ArrowLeft` (repeat) | `ArrowRight` (repeat) | `ArrowUp` ROTAR | `Space` CAÍDA |
  | SERPENTINA    | `ArrowUp`           | `ArrowDown`          | `ArrowLeft`          | `ArrowRight`          | —               | —             |
  | BLOQUE BUSTER | —                   | —                    | `ArrowLeft`          | `ArrowRight`          | —               | —             |

  En ROCAS y BLOQUE BUSTER mantener un botón equivale a mantener la tecla. En SERPENTINA cada toque encola un giro, igual que una pulsación sin autorepeat.

- **Motores:** `AsteroidsGame`, `TetrisGame`, `SnakeGame` y `ArkanoidGame` añaden `press(code: string): void` y `release(code: string): void`. Las dos llaman a la misma función interna que `keydown` / `keyup`, con las mismas guardas (solo actúan en `playing` con el loop en marcha, y la cola de 2 giros de SERPENTINA se respeta). Un `code` que el motor no conoce se ignora.
- **Players** (`AsteroidsPlayer`, `TetrisPlayer`, `SnakePlayer`, `ArkanoidPlayer`):
  - Montan `TouchControls` solo cuando `useTouchMode()` es `true`, con sus botones y `active={phase === "playing"}`.
  - En modo táctil, el overlay de inicio dice "TOCA PARA EMPEZAR" en lugar de "PULSA ESPACIO" y oculta la chuleta de teclas (`.keys`). La pausa dice "TOCA REANUDAR PARA CONTINUAR".
  - Al empezar una partida en modo táctil, el CRT se desplaza a la vista con `scrollIntoView({ block: "center" })`.
- **Layout móvil** (solo bajo `(pointer: coarse)`, en `app/globals.css`):
  - **Vertical:** el CRT ocupa todo el ancho disponible, con el mando debajo (cruceta a la izquierda, A y B a la derecha) y el selector de skins debajo del mando.
  - **Horizontal** (`(orientation: landscape) and (pointer: coarse)`): cruceta a la izquierda del CRT, A y B a su derecha. El ancho del CRT se limita a `min(100%, (100svh − 12px − 66px − 86px) × 4/3 + 48px)` para que quepa entero en alto debajo de la navegación fija (66 px), contando su marco vertical (86 px) y lateral (48 px). Con `scroll-margin-top: 66px`, `scrollIntoView` lo centra debajo de la navegación.
  - `touch-action: none`, `user-select: none` y `-webkit-touch-callout: none` en `.crt` y en el mando. Así no hay scroll, zoom por doble toque, selección ni menú contextual al jugar. El resto de la página hace scroll con normalidad.
  - Los botones de `PlayerHud` (PAUSA / REANUDAR, FIN, SALIR) miden al menos 44 px de alto en táctil. PAUSA / REANUDAR y FIN también actúan en el `pointerup` de un toque no principal (`pointerType === "touch"` y `!isPrimary`): con otro dedo sobre el mando, el navegador no genera `click` para ese toque.
  - El corte de la navegación a menú hamburguesa (`.av-nav`) sube de 840 a 960 px. Con 840 px, en un móvil en horizontal (844 px de ancho) la barra de escritorio desbordaba hasta 919 px y el navegador reducía toda la página. Es el único cambio en la navegación.
- La pausa automática al ocultar la pestaña o bloquear el móvil ya existe (`visibilitychange` y `blur` en los cuatro players) y se mantiene.

**Fuera de alcance (para futuras specs):**

- Controles por gestos (deslizar en SERPENTINA y CAÍDA, arrastrar la pala en BLOQUE BUSTER).
- Vibración al pulsar (`navigator.vibrate`).
- Pantalla completa (Fullscreen API) y bloqueo de orientación.
- Botón de pausa o START dentro del mando: la pausa sigue en el HUD.
- Mandos físicos (Gamepad API).
- Controles táctiles para los juegos simulados (`components/GamePlayer.tsx`).
- Rediseño de la navegación o de otras páginas para móvil.
- Cambios de jugabilidad, tamaños, velocidades o puntuación: un jugador táctil compite en el mismo leaderboard.

## Modelo de datos

No hay datos persistentes ni migraciones. Solo tipos y constantes nuevos:

```ts
// components/games/TouchControls.tsx
export type PadSlot = "up" | "down" | "left" | "right" | "a" | "b";
export interface PadButton {
  slot: PadSlot;
  code: string; // KeyboardEvent.code the engine already understands
  label: string; // visible text: arrow glyph or action ("DISPARO", "ROTAR", "CAÍDA")
  ariaLabel: string; // Spanish, e.g. "Girar a la izquierda"
  repeat?: boolean; // autorepeat while held (170 ms delay, then every 50 ms)
}
export interface TouchControlsProps {
  buttons: PadButton[];
  active: boolean; // false outside "playing": presses are ignored and held buttons released
  onPress: (code: string) => void;
  onRelease: (code: string) => void;
}
export const REPEAT_DELAY = 170;
export const REPEAT_INTERVAL = 50;
```

```ts
// Added to AsteroidsGame, TetrisGame, SnakeGame and ArkanoidGame
press: (code: string) => void; // same path as keydown for that code
release: (code: string) => void; // same path as keyup; no-op if the engine has no keyup logic
```

```ts
// components/games/useTouchMode.ts
export function useTouchMode(): boolean; // (pointer: coarse) or a touchstart was seen
```

Cada player define sus botones como una constante de módulo, por ejemplo:

```ts
const PAD: PadButton[] = [
  {
    slot: "left",
    code: "ArrowLeft",
    label: "◀",
    ariaLabel: "Girar a la izquierda",
  },
  {
    slot: "right",
    code: "ArrowRight",
    label: "▶",
    ariaLabel: "Girar a la derecha",
  },
  { slot: "up", code: "ArrowUp", label: "▲", ariaLabel: "Propulsar" },
  { slot: "a", code: "Space", label: "DISPARO", ariaLabel: "Disparar" },
];
```

## Estructura de archivos

```
components/games/
  TouchControls.tsx        # nuevo: mando virtual común
  useTouchMode.ts          # nuevo: detección de puntero táctil
  AsteroidsPlayer.tsx      # monta el mando, textos táctiles
  TetrisPlayer.tsx         # ídem
  SnakePlayer.tsx          # ídem
  ArkanoidPlayer.tsx       # ídem
components/PlayerHud.tsx   # sin cambios de lógica (solo clases si hiciera falta)
lib/games/asteroids/engine.ts  # press / release
lib/games/tetris/engine.ts     # press / release
lib/games/snake/engine.ts      # press / release
lib/games/arkanoid/engine.ts   # press / release
app/globals.css            # estilos del mando y layout táctil vertical/horizontal
CLAUDE.md                  # una línea: el patrón press/release y TouchControls para juegos nuevos
```

## Plan de implementación

Antes de escribir código, leer en `node_modules/next/dist/docs/` lo relativo a Client Components y hooks del lado del cliente, como exige `AGENTS.md`. Antes del paso 2, invocar `/frontend-design` para el aspecto del mando y el layout táctil, como exige `CLAUDE.md`.

1. **`press` / `release` en los cuatro motores.**
   - En cada motor, extraer el cuerpo de `onKeyDown` / `onKeyUp` a funciones internas que reciben un `code` (y `repeat` donde importe) y hacer que los listeners de teclado las llamen.
   - Exponer `press(code)` y `release(code)` en la interfaz pública.
   - En CAÍDA, `release("Space")` limpia `spaceHeld` y `spaceLocked` igual que el `keyup`.
   - En SERPENTINA, `press` pasa por la misma validación de la cola de giros, sin 180°.

   Verificación: con el teclado, los cuatro juegos se juegan exactamente igual que antes. Desde la consola del navegador, con una referencia temporal al motor, `press("ArrowLeft")` gira o mueve y `release("ArrowLeft")` lo detiene. `npx tsc --noEmit` y `npm run lint` pasan.

2. **`useTouchMode` y `TouchControls`.**
   - Crear el hook y el componente según el modelo de datos, con sus estilos en `app/globals.css` (cruceta, A y B, estado pulsado, foco visible).
   - Montarlo en `SnakePlayer` como juego piloto, con su cruceta.

   Verificación: en Chrome DevTools, con la emulación de dispositivo (iPhone 12, táctil), `/juegos/serpentina/jugar` muestra la cruceta y la serpiente gira con ella; dos toques rápidos dentro de un tick encolan dos giros. En escritorio sin emulación no aparece el mando.

3. **Textos táctiles, scroll y protección de gestos.**
   - "TOCA PARA EMPEZAR", ocultar `.keys` y "TOCA REANUDAR PARA CONTINUAR" en modo táctil, en los cuatro players.
   - `scrollIntoView` al empezar.
   - `touch-action: none`, `user-select: none` y `-webkit-touch-callout: none` en `.crt` y en el mando.
   - Botones del HUD con al menos 44 px de alto en táctil.

   Verificación: en emulación táctil, el doble toque sobre el CRT o el mando no hace zoom, mantener pulsado no abre menú ni selecciona texto, y la página sigue haciendo scroll al tocar fuera del CRT.

4. **Mando en ROCAS, CAÍDA y BLOQUE BUSTER.**
   - Montar `TouchControls` con los botones de la tabla del alcance en los tres players.

   Verificación, en emulación táctil:
   - ROCAS: mantener ◀ y ▲ a la vez gira y propulsa, y pulsar DISPARO al mismo tiempo dispara.
   - CAÍDA: mantener ▶ desplaza la pieza con repetición; ROTAR rota una vez por toque; CAÍDA baja la pieza de golpe.
   - BLOQUE BUSTER: mantener ◀ mueve la pala hasta soltar.
   - En los tres, al pausar desde el HUD con un botón mantenido, la acción se detiene, y al reanudar no queda nada "pegado".

5. **Layout vertical y horizontal.**
   - Vertical: CRT a todo el ancho, mando debajo y selector de skins debajo del mando.
   - Horizontal: cruceta a la izquierda y A y B a la derecha del CRT, con el ancho del CRT limitado por el alto.

   Verificación: en emulación de iPhone 12 (390×844 y 844×390) y de iPad (820×1180 y 1180×820), en los cuatro juegos, el CRT se ve entero sin scroll horizontal y todos los botones del mando quedan a la vista y son pulsables.

6. **Documentación y cierre.**
   - Añadir a `CLAUDE.md`, en la sección de juegos, que cada motor expone `press` / `release` y cada player monta `TouchControls` con sus botones, y que un juego nuevo debe hacer lo mismo.
   - Con el `next dev` detenido, `npm run build`.

   Verificación: `npx tsc --noEmit`, `npm run lint` y `npm run build` pasan. Una partida completa en un móvil real (o en emulación si no hay ninguno), hasta el modal de fin de juego, guarda la puntuación con las iniciales escritas con el teclado del sistema.

## Criterios de aceptación

- [ ] En escritorio con ratón y teclado no aparece el mando y los cuatro juegos se juegan igual que antes de esta spec.
- [ ] Con `(pointer: coarse)`, o tras el primer `touchstart`, los cuatro juegos muestran su mando con exactamente los botones de la tabla del alcance.
- [ ] Cada botón llama a `press(code)` al tocarlo y a `release(code)` al soltarlo o en `pointercancel`; el `code` coincide con la tecla equivalente.
- [ ] En ROCAS, girar, propulsar y disparar funcionan a la vez con tres dedos.
- [ ] En CAÍDA, mantener ◀, ▶ o ▼ repite la acción tras 170 ms y después cada 50 ms; ROTAR y CAÍDA actúan una sola vez por toque.
- [ ] En SERPENTINA, la cruceta respeta la cola de 2 giros y nunca invierte la dirección 180°.
- [ ] En BLOQUE BUSTER, la pala se mueve mientras se mantiene ◀ o ▶ y se detiene al soltar.
- [ ] Fuera de `playing` los botones no actúan, y al pausar o terminar no queda ningún botón mantenido.
- [ ] En táctil, el inicio dice "TOCA PARA EMPEZAR" y no muestra la chuleta de teclas; un toque en el CRT empieza la partida y la desplaza a la vista.
- [ ] Doble toque o mantener pulsado sobre el CRT o el mando no hace zoom, scroll, selección ni menú contextual.
- [ ] En 390×844, 844×390, 820×1180 y 1180×820 el CRT y todo el mando se ven enteros sin scroll horizontal.
- [ ] Cada botón del mando mide al menos 56×56 px; los del HUD, al menos 44 px de alto en táctil.
- [ ] Los botones del mando tienen `aria-label` en español y foco visible.
- [ ] Tamaños, velocidades, colisiones y puntuación de los cuatro juegos no cambian.
- [ ] `npx tsc --noEmit`, `npm run lint` y `npm run build` pasan.

## Decisiones

- **Sí:** mando virtual en los cuatro juegos (cruceta + A/B). Es uniforme, se aprende una vez y sirve para todo el catálogo jugable. Decidido por el usuario.
- **No:** gestos (deslizar, arrastrar). Encajarían mejor en SERPENTINA y BLOQUE BUSTER, pero quedan para otra spec si el mando no convence.
- **Sí:** `press(code)` / `release(code)` en los motores, reutilizando los `KeyboardEvent.code` y la misma lógica que el teclado. Es un cambio pequeño y explícito, y el comportamiento táctil y el de teclado no pueden divergir.
- **No:** eventos de teclado sintéticos en `window`. Funcionan sin tocar los motores, pero dependen de detalles como `e.repeat`, `preventDefault` y el orden de los listeners.
- **No:** un tipo `GameAction` abstracto. Es más limpio a largo plazo, pero obliga a reescribir el input de los cuatro motores.
- **Sí:** mantener = tecla mantenida, y autorepeat de 170/50 ms solo en ◀ ▶ ▼ de CAÍDA. Es lo que hace el teclado.
- **Sí:** detección por `(pointer: coarse)` más el primer `touchstart`. Un portátil con ratón no ve el mando, una tablet sí, y un portátil táctil lo ve en cuanto se toca la pantalla.
- **No:** detección por ancho de pantalla. Falla con tablets con teclado y con ventanas estrechas de escritorio.
- **Sí:** vertical y horizontal, sin bloquear la orientación. En vertical el mando va debajo; en horizontal, a los lados, con el CRT limitado por el alto.
- **Sí:** pausa, fin y salir siguen en `PlayerHud`, solo con más tamaño táctil. No se duplican controles.
- **Sí:** `touch-action: none` solo en el CRT y el mando, no en toda la página. Se puede seguir haciendo scroll para ver el leaderboard o el selector de skins.
- **No:** vibración ni pantalla completa en esta spec. Son extras: iOS no soporta ninguno de los dos.
- **Sí:** PAUSA / REANUDAR y FIN de `PlayerHud` responden al `pointerup` de un segundo dedo (decidido al revisar los criterios). El navegador solo genera `click` para el toque principal, así que, con un dedo manteniendo ◀, pausar desde el HUD no hacía nada y la partida seguía. No se ejecuta dos veces: un toque no principal nunca genera `click`.
- **No:** un botón de pausa en el mando. Seguía fuera de alcance y arreglar el HUD basta.
- **Sí:** subir el corte de `.av-nav` de 840 a 960 px (decidido durante el paso 5). Era la única causa del scroll horizontal a 844×390; cambiar una línea es menos que una spec de navegación móvil.
- **Sí:** el ancho del CRT en horizontal descuenta su marco y la navegación fija: `(100svh − 12px − 66px − 86px) × 4/3 + 48px`, más `scroll-margin-top: 66px` (decidido durante el paso 5). La fórmula original, `(100svh − 24px) × 4/3`, dejaba el CRT 14 px más alto que la pantalla a 390 px de alto y con la parte de arriba tapada por la navegación.
- **Sí:** SERPENTINA es el juego piloto del paso 2. Es el más simple (4 botones sin repetición ni mantenidos), y así el componente se valida antes de llevarlo a los otros tres.

## Riesgos

| Riesgo                                                                                                               | Mitigación                                                                                                                                  |
| -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Un dedo que se sale del botón o un `pointercancel` del sistema (notificación, gesto de iOS) deja una tecla "pegada". | `setPointerCapture`, `release` en `pointerup`, `pointercancel` y `lostpointercapture`, y liberar todo al salir de `playing` o al desmontar. |
| iOS Safari hace zoom por doble toque o muestra la lupa o el menú al mantener pulsado.                                | `touch-action: none`, `user-select: none` y `-webkit-touch-callout: none` en el CRT y el mando; probar en un iPhone real si es posible.     |
| En horizontal en un móvil bajo (≈ 390 px de alto), la cabecera y el HUD empujan el CRT fuera de la pantalla.         | Ancho del CRT limitado por `100svh` y `scrollIntoView` al empezar, para que el CRT quede centrado en la vista.                              |
| La repetición de CAÍDA con temporizadores de JS se desincroniza del bucle del motor o sigue corriendo tras pausar.   | Temporizadores dentro de `TouchControls`, cancelados en `release`, al cambiar `active` y al desmontar.                                      |
| `matchMedia("(pointer: coarse)")` da falsos negativos en algunos híbridos o navegadores antiguos.                    | El primer `touchstart` también activa el modo táctil.                                                                                       |
| El modal de fin de juego queda tapado por el teclado del sistema al escribir las iniciales.                          | Comprobarlo en el paso 6; si pasa, se ajusta en esta spec solo el scroll del input, sin rediseñar el modal.                                 |

## Lo que **no** entra en esta spec

- Gestos, vibración, pantalla completa, bloqueo de orientación y Gamepad API.
- Botón de pausa dentro del mando.
- Mando para los juegos simulados.
- Cambios de jugabilidad o puntuación, y un leaderboard separado para táctil.
- Rediseño de la navegación, la biblioteca u otras páginas para móvil.
- Cambios en el sistema de skins.
