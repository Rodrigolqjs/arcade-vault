# Juegos con skins

> Registro de skin-designer: qué juegos jugables tienen ya sus tres skins (`clasico`, `neon`, `retro`). Se trabaja un juego por vez.
> Última actualización: 2026-11-10 · ranaria

## Infraestructura común

- [x] Sistema de skins (`SkinId`, selector, persistencia) — implementada: `lib/games/skins.ts` (`SKIN_IDS`, `SkinId`, `SKIN_LABELS`, `loadSkin`/`saveSkin` sobre `av-skin:<game-id>` con try/catch), `components/games/SkinSelector.tsx` (ASPECTO · CLÁSICO / NEÓN / RETRO, `aria-pressed`, `blur()` tras el clic, deshabilitado en `playing`) y estilos `.skin-selector` / `.skin-option` en `app/globals.css`. Probado con rocas.

## Juegos

| Juego         | Motor     | clasico | neon | retro | Estado       | Archivos                                                                                       | Actualizado |
| ------------- | --------- | ------- | ---- | ----- | ------------ | ---------------------------------------------------------------------------------------------- | ----------- |
| rocas         | asteroids | ✅      | ✅   | ✅    | implementada | `lib/games/asteroids/skins.ts`, `entities.ts`, `engine.ts`, `components/games/AsteroidsPlayer.tsx` | 2026-11-06  |
| caida         | tetris    | ⚠️      | ✅   | ✅    | implementada | `lib/games/tetris/skins.ts`, `constants.ts`, `entities.ts`, `engine.ts`, `components/games/TetrisPlayer.tsx` | 2026-11-09  |
| serpentina    | snake     | ⚠️      | ✅   | ✅    | implementada | `lib/games/snake/skins.ts`, `constants.ts`, `engine.ts`, `components/games/SnakePlayer.tsx` | 2026-11-09  |
| bloque-buster | arkanoid  | ⚠️      | ✅   | ✅    | implementada | `lib/games/arkanoid/skins.ts`, `constants.ts`, `entities.ts`, `engine.ts`, `components/games/ArkanoidPlayer.tsx` | 2026-11-09  |
| ranaria       | ranaria   | ✅      | ✅   | ✅    | implementada | `lib/games/ranaria/skins.ts`, `constants.ts`, `entities.ts`, `engine.ts`, `components/games/RanariaPlayer.tsx` | 2026-11-10  |

## Detalle por juego

_Se completa la sección de cada juego cuando skin-designer lo trabaja._

### rocas

- Paletas: neon = nave `#00ffff` (glow 18), asteroide `#ff2fd0` (12), bala `#ffffff` (8), power-up `#39ff14` (20), llama `#ff7a00`, partículas `#ff2fd0` sin glow, fondo `#000000`; retro = fósforo ámbar `#ffd480` (bala, power-up, texto) / `#ffb000` (nave) / `#cc8400` (asteroide, llama, partículas) sobre `#0f0a02`, `shadowBlur` 0, `edges: "hard"` (uniones en inglete y balas cuadradas de 4×4, mismo radio lógico 2). clasico se deriva de `COLORS` + `GLOW` (glow 10/10/10, balas 0, fondo `#000`).
- Hallazgos de contraste: clasico · `#ff006e` (power-up): esquina 1.45 < 1.5 → `#ff4d94` (esquina 1.63). clasico · `#ff006e` (texto "3x" y contador "3x N.Ns"): scanline 3.86 < 4.5 → `#ff4d94` (scanline 4.70). **Aplicado el 2026-11-09** con aprobación del usuario: `COLORS.powerUp = "#ff4d94"`; la llama sigue en `#ff006e`. clasico · llama `#ff006e` × 0.85: centro 4.11 (pasa como efecto ≥ 3). neon y retro pasan todos los umbrales (tablas en `.claude/agent-memory/skin-designer/palettes.md`).
- Colores que estaban fuera de `COLORS` y ya pasaron a la paleta: fondo `"#000"` de `engine.ts` (ahora `palette.bg`), `GLOW` único (ahora `palette.glow` por entidad), `lineJoin = "round"` fijo y bala siempre circular (ahora `palette.edges`). `grep` de literales hex en `engine.ts`/`entities.ts`: vacío.
- Notas: implementado el 2026-11-06 con tsc, lint y build verdes; pendiente de prueba en navegador para pasar a `con skins ✅`. La viñeta `.crt-screen::before` queda por debajo del canvas (sin `z-index`): la medida de esquina es conservadora. ROCAS no tiene elementos decorativos.

### caida

- Paletas: neon = I `#00e5ff`, O `#ffff00`, T `#ff6ae6`, S `#2bff6a`, Z `#ff3030`, J `#5f90ff`, L `#ffa200`, tuerca `#ffffff`; cada pieza con su propio escalón de luminancia (todos los pares ≥ 0.05); pozo `#7a00c8` (2.66), grilla `#241a48` (1.32), relleno `#100620`, SIGUIENTE `#9a8cff` (scanline 5.26), bisel blanco 0.18, glow 20 solo en la pieza activa, fondo `#000000`. retro = fósforo verde de 4 tonos (`#c8ffd6`, `#5cff8a`, `#2ad65e`, `#22ad4c`) × 2 patrones: I/O/T/S lisas, Z/J/L/tuerca con un hueco cuadrado central de 12×12 en color de fondo (`marks: "core"`), sin bisel ni glow, pozo `#196232` (2.62), grilla `#0f3a1e` (1.52), SIGUIENTE `#7ee89c` (8.54), fondo `#04100a` (lum 0.0042), oscurecido final `rgba(4, 16, 10, 0.6)`. clasico se deriva de `PIECE_COLORS`, `COLORS` y `GLOW` (movido de `engine.ts` a `constants.ts`).
- Hallazgos de contraste (clasico, aplicados el 2026-11-10 con aprobación del usuario: coche `#ff5ca0`, aviso `#ff8ab8` con relleno al 0.25 y relleno del tronco a 0.25): T `#ff006e` (pieza): esquina 1.45 < 1.5 → `#ff4d94`, como en rocas. Pares de luminancia < 0.05: I/S cian-verde (0.008), T/J (0.224 las dos, diferencia 0.000), T/Z y Z/J (0.023): riesgo para daltónicos una vez fijadas → subir J a `#5f90ff` y aclarar T, o añadir el patrón `core` a algunas piezas también en clásico. Pozo `#ff006e` (decorativo): centro 5.48 > 3 → bajarlo a alfa ~0.5 o dejarlo así como seña de identidad del juego.
- Colores que estaban fuera de `COLORS` y pasaron a la paleta: fondo `"#000"`, bisel `rgba(255,255,255,0.12)`, oscurecido `rgba(0, 0, 0, 0.55)` y `GLOW = 12`. `grep` de literales en `engine.ts`/`entities.ts`: vacío.
- Notas: tsc y lint verdes el 2026-11-09; build pendiente porque había un `next dev` en el puerto 3000. Preview del selector: piezas I, T y O.

### serpentina

- Paletas: neon = cuerpo `#39ff14` con estela más corta (`trailFade` 0.35, cola `#25a60d` 6.54 / 4.58 / 1.62), cabeza `#eaffc8` (glow 18), núcleo `#ff2fd0` (glow 16 + pulso 6 = 22), muro `#00e5ff`, puntos `#2a3a5a` (1.85), fondo `#000000`. retro = fósforo blanco frío de 3 tonos: cabeza y núcleo `#e8f0ff`, cuerpo sólido `#a8c0ec` (sin estela), muro `#6f8fcc` (6.11 / 4.29 / 1.54), puntos `#1c2a44` (1.38), fondo `#060a12`, sin glow, núcleo en rombo (`coreShape: "diamond"`) para que no dependa del tono. clasico se deriva de `COLORS`, `GLOW`, `CORE_PULSE_GLOW` y `TRAIL_FADE` (movidos a `constants.ts`).
- Sprites: el motor no usa el atlas de frutas de `reference/resources/started-games/05-snake-assets/` (no hay `drawImage` ni `Image`); el núcleo es un círculo dibujado. Las skins no necesitan tocar sprites. Si en el futuro se adopta el atlas, las frutas serían el único elemento que no cambia de skin, o habría que tintarlas.
- Hallazgos de contraste (clasico, aplicados el 2026-11-10 con aprobación del usuario: coche `#ff5ca0`, aviso `#ff8ab8` con relleno al 0.25 y relleno del tronco a 0.25): cola `#00ff88` a alfa 0.35 (`#005930`, cuerpo letal): 2.47 / 1.98 / 1.20 < 4.5 / 3 / 1.5 → `TRAIL_FADE` 0.35 (como neón). Núcleo `#ff006e`: esquina 1.45 < 1.5 → `#ff4d94`. Puntos de la grilla `rgba(74, 79, 112, 0.25)`: 1.14 < 1.2 → alfa 0.35.
- Notas: el muro se mide como entidad (choca y mata), no como decoración. tsc y lint verdes; build pendiente (`next dev` activo). Preview: cabeza, núcleo y cuerpo.

### bloque-buster

- Paletas: neon = pala `#00ffff` (glow 22), bola `#ffffff` (glow 18), bloques red `#ff3030`, yellow `#ffff00`, cyan `#00e5ff`, magenta `#ff38f0`, hotpink `#ff70dc`, green `#2bff6a`, gray `#c4b8ff` (todos los pares ≥ 0.05), relleno de tubo 0.32, bisel 0.45, fondo `#000000`. retro = paleta corta de 4 tonos (crema `#fff1d0`, ocre `#f0b030`, verde azulado `#38b8a6`, ladrillo `#ec6a40`) sobre `#0e0812`; red y magenta → ladrillo, yellow y gray → ocre, cyan y green → verde azulado, hotpink → crema, con lo que ninguna fila adyacente de los 5 niveles comparte tono; pala ocre y bola crema cuadradas (`edges: "hard"`), sin bisel, sin línea central ni glow. clasico se deriva de `COLORS` y `GLOW` (`{ paddle: 16, ball: 14 }`, movido a `constants.ts`).
- Sprites: el motor no dibuja el spritesheet del original; todo es geometría de canvas.
- Hallazgos de contraste (clasico, aplicados el 2026-11-10 con aprobación del usuario: coche `#ff5ca0`, aviso `#ff8ab8` con relleno al 0.25 y relleno del tronco a 0.25): bloque magenta `#ff006e`: esquina 1.45 < 1.5 → `#ff4d94`. Pares con luminancia < 0.05: red/magenta (0.023), red/gray (0.037) y cyan/green (0.008). Los bloques no tienen tipos (todos se rompen de un golpe y valen 10 puntos), así que el criterio 4 es informativo: no confunden la jugabilidad.
- Notas: la bola cuadrada de retro ocupa la misma caja `BALL_SIZE` que ya usaba la colisión AABB. tsc y lint verdes; build pendiente (`next dev` activo). Preview: pala, bola y bloque de la fila roja.

### ranaria

- Paletas: neon = "pantano eléctrico": rana y nenúfar `#39ff14` (glow 20 / 16), coche `#ff2fd0`, furgoneta `#00e5ff`, camión `#ffff00` (glow 8 en vehículos), troncos con borde ámbar `#ffa200` y relleno a 0.18, aviso de hundido y rana muerta `#ff6ae6`, bandas casi negras (carretera `#000000`, río `#00142a`, meta `#000a14`, arcenes `#0a0a14`), líneas cian a 0.3. retro = paleta corta de 4 tonos de noche (lima `#c8f060` rana/nenúfar, salmón `#ff8a80` coche/aviso/muerte, hueso `#f0e8d0` furgoneta/ojos, lavanda `#9484e8` camión/troncos) sobre bandas tintadas de violeta (`#0e0c16`, `#0a0c20`, `#0c0e18`, `#16121e`), sin glow y con `edges: "hard"`: esquinas rectas en rana, vehículos y troncos, nenúfar cuadrado del mismo radio y ojos cuadrados. clasico se deriva de `COLORS` + `GLOW` (`{ frog: 14, lily: 12 }`, movido a `constants.ts`; vehículos sin glow).
- Fondo: no hay `fillRect` de fondo; las cinco bandas cubren el canvas, así que cada entidad se mide contra la banda sobre la que se mueve (vehículos sobre carretera, troncos y aviso sobre río, nenúfar sobre meta, rana sobre la banda más clara y sobre el relleno del tronco).
- Hallazgos de contraste (clasico, aplicados el 2026-11-10 con aprobación del usuario: coche `#ff5ca0`, aviso `#ff8ab8` con relleno al 0.25 y relleno del tronco a 0.25): coche `#ff006e` sobre carretera: esquina 1.32 < 1.5 → `#ff5ca0` (1.54). Aviso de hundido `#ff006e` (borde de una plataforma que va a desaparecer) sobre río `#002633`: 4.13 / 2.91 / 1.10 < 4.5 / 3 / 1.5 → `#ff8ab8` (7.23 / 4.93 / 1.46) o un río más oscuro. Rana `#00ff88` sobre el relleno del tronco (`#006e7a`): 4.46 / 2.95 / 1.42 < 4.5 / 3 / 1.5 → bajar el relleno del tronco a alfa ~0.25. Relleno del aviso `rgba(255, 0, 110, 0.25)`: 1.11 < 1.2 (decorativo, va con el borde). Rana muerta `#ff006e` sobre río: 4.13 (pasa como efecto ≥ 3).
- Colores que estaban fuera de `COLORS` y pasaron a la paleta: parabrisas `rgba(10, 10, 24, 0.55)` y relleno del aviso `rgba(255, 0, 110, 0.25)` (ahora en `COLORS`), pupilas (`COLORS.road`, ahora `frogPupil`), `shadowBlur` 12/14 (ahora `GLOW`). `grep` de literales y de `COLORS` en `engine.ts`/`entities.ts`: vacío.
- Distinción: vehículos por largo (1/2/3 celdas) y además por luminancia en las tres skins; borde del tronco y aviso con diferencia ≥ 0.05 en las tres (neón 0.098, retro 0.124), además del parpadeo.
- Notas: tsc, lint y build verdes el 2026-11-10 (build con el `next dev` del usuario vivo: Next 16 separa `.next/dev`; el dev siguió respondiendo 200). Preview del selector: rana, coche y borde del tronco sobre la banda de carretera.

## Preguntas abiertas

- rocas · Selector deshabilitado durante `playing`, habilitado en `ready`, pausa y fin de partida (con repintado inmediato del frame congelado). Alternativa: permitir el cambio en plena partida.
- rocas · Etiqueta "ASPECTO" en la UI en lugar de "SKIN". Alternativa: "SKIN" o "TEMA".
- rocas · Retro en fósforo ámbar de 3 tonos (no verde monocromo). Alternativa: verde de 4 tonos, si el usuario quiere una variante retro común a todos los juegos.
- rocas · Llama y partículas tratadas como "efecto transitorio" (≥ 3:1 en centro) y no como entidades. Alternativa: exigirles 4.5:1, lo que obligaría a cambiar la llama de clásico.
- caida · Retro distingue 8 piezas con 4 tonos × 2 patrones (hueco central). Alternativa: 8 patrones distintos o 4 tonos sin patrón, apoyándose solo en la forma de la pieza al caer.
- caida · clasico tiene pares de piezas con casi la misma luminancia (I/S, T/J/Z) y la T falla la esquina (1.45). ¿Aplicar a clásico la J `#5f90ff` y la T `#ff4d94`, como en rocas?
- serpentina · La cola de clasico se desvanece hasta 2.47:1 aunque sigue siendo letal. ¿Subir el alfa mínimo de la cola (`TRAIL_FADE` 0.35)? ¿Y los puntos de la grilla a alfa 0.35 (hoy 1.14)?
- serpentina · Retro en fósforo blanco frío con núcleo en rombo, para dar a cada juego su propio retro (rocas ámbar, caida verde). Alternativa: un único retro común a todos.
- bloque-buster · Retro con 4 tonos repartidos entre 7 colores de bloque y bola cuadrada. Alternativa: bola redonda también en retro.
- ranaria · Retro con 4 tonos y bordes duros (nenúfar y ojos cuadrados). Alternativa: mantener el nenúfar redondo, que es la meta y se reconoce por la forma.
- ranaria · El preview usa la banda de carretera como fondo (el motor no tiene un `bg` único). Alternativa: usar el río.
