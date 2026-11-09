# Paletas por juego

Script WCAG de skin-designer: centro / scanline (×0.82) / esquina (×0.35), contra el fondo de la skin.

## rocas (motor asteroids) — implementada 2026-11-06 en `lib/games/asteroids/skins.ts`

### clasico — implementada (derivada de COLORS + GLOW)
bg `#000`; glow ship 10, asteroid 10, powerUp 10, bullet 0; edges round
- ship `#00f5ff` 15.50 / 10.28 / 2.48
- asteroid `#f5ff00` 19.19 / 12.60 / 2.82
- bullet `#e6e9ff` 17.46 / 11.54 / 2.70
- powerUp `#ff4d94` 6.74 / 4.70 / 1.63 (también texto "3x"). Antes `#ff006e` (5.48 / 3.86 / 1.45, fallaba esquina y texto); el usuario aprobó el cambio el 2026-11-09
- thrust `#ff006e` ×0.85 = `#d9005e` 4.11 / 3.00 / 1.33 (efecto)
- particle `#f5ff00` (efecto)

### neon — implementada
bg `#000000`; glow ship 18, asteroid 12, powerUp 20, bullet 8; edges round
- ship `#00ffff` 16.75 / 11.04 / 2.57
- asteroid `#ff2fd0` 6.57 / 4.59 / 1.60
- bullet `#ffffff` 21.00 / 13.75 / 3.00
- powerUp `#39ff14` 15.49 / 10.25 / 2.46
- thrust `#ff7a00` ×0.85 = `#d96800` 5.93 / 4.19 / 1.56
- particle `#ff2fd0` 6.57 / 4.59 / 1.60
- Descartado: asteroide violeta `#d900ff` (esquina 1.45).

### retro — implementada (fósforo ámbar, 3 tonos, edges hard)
bg `#0f0a02` (lum 0.0032); glow 0; edges hard
- ship `#ffb000` 10.77 / 7.23 / 1.99
- asteroid `#cc8400` 6.45 / 4.50 / 1.56
- bullet `#ffd480` 14.07 / 9.36 / 2.29
- powerUp `#ffd480` 14.07 / 9.36 / 2.29 (mismo tono que bala; distinción por forma)
- thrust `#cc8400` ×0.85 sobre bg = `#b07200` 4.93 / 3.52 / 1.42 (efecto)
- particle `#cc8400` 6.45 / 4.50 / 1.56

## caida (motor tetris) — implementada 2026-11-09 en `lib/games/tetris/skins.ts`

Claves: `pieces[1–8]`, `marks[1–8]` ("none" | "core" = hueco 12×12 en bg), grid, well, wellFill, label, bg, highlight, dim, glow (pieza activa).

### clasico — implementada (PIECE_COLORS + COLORS + GLOW 12), con hallazgos
- I `#00f5ff` 15.50/10.28/2.48 · O `#f5ff00` 19.19/12.60/2.82 · T `#ff006e` 5.48/3.86/**1.45** · S `#00ff88` 15.66/10.35/2.47 · Z `#ff3b3b` 5.94/4.18/1.54 · J `#3d7bff` 5.48/3.92/1.52 · L `#ff9f1c` 10.23/6.92/1.99 · tuerca `#e6e9ff` 17.46/11.54/2.70
- Pares de luminancia < 0.05: I-S 0.008, T-Z 0.023, T-J 0.000, Z-J 0.023
- grid 1.24 · well `#ff006e` 5.48 (decor > 3) · label `#8a8fb5` scanline 4.67

### neon — implementada (bg `#000000`, glow 20, bisel 0.18)
- I `#00e5ff` 13.65/9.11/2.29 · O `#ffff00` 19.56/12.83/2.85 · T `#ff6ae6` 8.46/5.81/1.81 · S `#2bff6a` 15.61/10.33/2.48 · Z `#ff3030` 5.72/4.03/1.51 · J `#5f90ff` 6.92/4.84/1.67 · L `#ffa200` 10.42/7.07/2.01 · tuerca `#ffffff` 21/13.75/3.00 — ningún par < 0.05
- grid `#241a48` 1.32 · well `#7a00c8` 2.66 · wellFill `#100620` 1.07 · label `#9a8cff` scan 5.26

### retro — implementada (fósforo verde, 4 tonos × 2 patrones, bg `#04100a` lum 0.0042, glow 0, sin bisel)
- `#c8ffd6` 17.28/11.37/2.58 (I, Z+core) · `#5cff8a` 14.88/9.83/2.34 (O, J+core) · `#2ad65e` 10.04/6.74/1.89 (T, L+core) · `#22ad4c` 6.60/4.60/1.57 (S, tuerca+core)
- grid `#0f3a1e` 1.52 · well `#196232` 2.62 · label `#7ee89c` scan 8.54 · dim `rgba(4, 16, 10, 0.6)`
- Descartado: tono oscuro `#1a9e44` (esquina 1.45), well `#1f7a3c` (3.61 > 3).

## serpentina (motor snake) — implementada 2026-11-09 en `lib/games/snake/skins.ts`

Claves: snake, head, core (también parpadeo al morir), grid (puntos), border (muro letal, medido como entidad), bg, trailFade, glow {head, core, pulse}, coreShape. El motor no usa sprites (el atlas de frutas solo está en reference/).

### clasico — implementada (COLORS + GLOW 12 + CORE_PULSE_GLOW 6 + TRAIL_FADE 0.65), con hallazgos
- cuerpo `#00ff88` 15.66/10.35/2.47 · cola ×0.35 `#005930` **2.47/1.98/1.20** · cabeza `#b3ffd9` 18.22/12.00/2.74 · núcleo `#ff006e` 5.48/3.86/**1.45** · muro `#00ff88` 15.66 · puntos 0.25 **1.14**

### neon — implementada (bg `#000000`)
- cuerpo `#39ff14` 15.49/10.25/2.46 · cola (trailFade 0.35) `#25a60d` 6.54/4.58/1.62 · cabeza `#eaffc8` 19.64/12.90/2.88 glow 18 · núcleo `#ff2fd0` 6.57/4.59/1.60 glow 16+6 · muro `#00e5ff` 13.65/9.11/2.29 · puntos `#2a3a5a` 1.85
- Descartado: trailFade 0.5 (cola esquina 1.39).

### retro — implementada (fósforo blanco frío, 3 tonos, bg `#060a12` lum 0.0030, glow 0, cuerpo sólido, núcleo rombo)
- cabeza/núcleo `#e8f0ff` 17.30/11.41/2.61 · cuerpo `#a8c0ec` 10.77/7.25/1.99 · muro `#6f8fcc` 6.11/4.29/1.54 · puntos `#1c2a44` 1.38

## bloque-buster (motor arkanoid) — implementada 2026-11-09 en `lib/games/arkanoid/skins.ts`

Claves: paddle, ball, blocks{red,yellow,cyan,magenta,hotpink,green,gray}, bg, dim, tubeFill, bevel, paddleCore, glow {paddle, ball}, edges. Bloques sin tipos (1 golpe, 10 pts): criterio 4 informativo. Sin sprites.

### clasico — implementada (COLORS + GLOW {16, 14}), con hallazgos
- pala `#00f5ff` 15.50 · bola `#e6e9ff` 17.46 · red `#ff3b3b` 5.94/4.18/1.54 · yellow 19.19 · cyan 15.50 · magenta `#ff006e` 5.48/3.86/**1.45** · hotpink `#ff5cd6` 7.75/5.34/1.73 · green 15.66 · gray `#8a8fb5` 6.68/4.67/1.65
- Pares < 0.05: red-magenta 0.023, red-gray 0.037, cyan-green 0.008

### neon — implementada (bg `#000000`, tubeFill 0.32, bisel 0.45, glow pala 22 / bola 18)
- pala `#00ffff` 16.75/11.04/2.57 · bola `#ffffff` 21 · red `#ff3030` 5.72/4.03/1.51 · yellow `#ffff00` 19.56 · cyan `#00e5ff` 13.65 · magenta `#ff38f0` 7.08/4.91/1.65 · hotpink `#ff70dc` 8.60/5.90/1.82 · green `#2bff6a` 15.61 · gray `#c4b8ff` 11.65/7.86/2.13 — ningún par < 0.05

### retro — implementada (8 bits, 4 tonos, bg `#0e0812` lum 0.0031, glow 0, edges hard, sin bisel)
- crema `#fff1d0` 17.65/11.65/2.63 (bola, hotpink) · ocre `#f0b030` 10.32/6.96/1.95 (pala, yellow, gray) · verde azulado `#38b8a6` 8.07/5.55/1.72 (cyan, green) · ladrillo `#ec6a40` 6.31/4.43/1.55 (red, magenta) — ningún par < 0.05; ninguna fila adyacente de los 5 niveles comparte tono
- Descartado: teal `#3cc8b4` (0.042 con ocre).
