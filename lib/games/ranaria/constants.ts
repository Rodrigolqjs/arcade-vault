export const W = 800;
export const H = 600;
export const CELL = 50;
export const COLS = 16; // W / CELL
export const ROWS = 12; // H / CELL
// Filas del tablero, de arriba abajo
export const ROW_GOAL = 0;
export const RIVER_ROWS = [1, 2, 3, 4];
export const ROW_MEDIAN = 5;
export const ROAD_ROWS = [6, 7, 8, 9, 10];
export const ROW_START = 11;
export const START_COL = 7;
export const START_LIVES = 3;
// Bucle de los carriles: los objetos viven en x ∈ [−LOOP_MARGIN, W + LOOP_MARGIN)
export const LOOP_MARGIN = 200; // px, el objeto más largo
export const LANE_LOOP = 1200; // px, W + 2 × LOOP_MARGIN
// Carretera
export const ROAD_SPEED_MIN = 60; // px/s
export const ROAD_SPEED_MAX = 140; // px/s
export const VEHICLE_LENGTHS = [1, 1, 2, 3]; // celdas; el coche, el doble de probable
export const ROAD_GAP_MIN = 3; // celdas
export const ROAD_GAP_MAX = 6; // celdas
export const VEHICLE_INSET = 4; // px por lado en la caja de choque
// Río
export const RIVER_SPEED_MIN = 40; // px/s
export const RIVER_SPEED_MAX = 100; // px/s
export const LOG_LENGTHS = [2, 3, 4]; // celdas
export const RIVER_GAP_MIN = 2; // celdas
export const RIVER_GAP_MAX = 4; // celdas
// Troncos que se hunden
export const MAX_SINKING_LANES = 4; // min(4, tramo) carriles
export const SINK_FLOAT = 3; // s a flote
export const SINK_WARN = 1; // s a flote parpadeando
export const SINK_UNDER = 1.5; // s hundido
export const SINK_CYCLE = 5.5; // SINK_FLOAT + SINK_WARN + SINK_UNDER
export const SINK_BLINK = 0.125; // s por medio parpadeo del aviso
// Nenúfares
export const LILIES_BASE = 5; // max(LILIES_MIN, LILIES_BASE − tramo)
export const LILIES_MIN = 2;
export const LILY_COL_MIN = 1;
export const LILY_COL_MAX = 14;
export const LILY_MIN_SPACING = 3; // columnas
export const LILY_CATCH = 30; // px entre el centro de la rana y el del nenúfar
export const LILY_RADIUS = 18; // px, dibujo
// Rana
export const FROG_INSET = 10; // px por lado en la caja de choque
export const FROG_SIZE = 36; // px, dibujo
export const HOP_ANIM = 0.09; // s de la animación de salto (solo visual)
// Dificultad por tramo
export const SPEED_STEP = 0.12; // multiplicador = min(MAX_SPEED_MULT, 1 + SPEED_STEP × (tramo − 1))
export const MAX_SPEED_MULT = 2.2;
export const STRETCH_TIME = 30; // s de reloj por tramo y por vida
// Puntuación (× tramo)
export const ROW_POINTS = 10; // por fila nueva del tramo
export const LILY_POINTS = 100; // por nenúfar
export const TIME_BONUS = 10; // por segundo entero restante
// Tiempos de muerte
export const DEATH_DELAY = 0.8; // s de respawn con vidas restantes
export const GAMEOVER_DELAY = 1; // s
export const DEATH_BLINK = 0.1; // s por medio parpadeo de la rana muerta
// Carriles reversibles (SPEC ranaria/03)
export const REVERSE_FROM_TRAMO = 3; // min(MAX_REVERSIBLE, tramo − (REVERSE_FROM_TRAMO − 1))
export const MAX_REVERSIBLE = 3; // carriles por tramo
export const REVERSE_MIN = 6; // s entre inversiones
export const REVERSE_MAX = 9; // s entre inversiones
export const REVERSE_WARN = 1; // s de aviso antes de la rampa
export const REVERSE_RAMP = 0.6; // s de v a −v, lineal
export const REVERSE_BLINK = 0.125; // s por medio parpadeo del aviso
export const REVERSE_MARK_W = 16; // px, flecha doble permanente
export const REVERSE_MARK_H = 10; // px
export const REVERSE_MARK_MARGIN = 12; // px desde cada borde del canvas
// Copia los tokens de app/globals.css; el canvas no lee variables CSS.
export const COLORS = {
  frog: "#00ff88", // --green, color de ranaria en el catálogo
  frogEyes: "#e6e9ff", // --ink
  lily: "#00ff88", // --green
  car: "#ff006e", // --magenta
  van: "#00f5ff", // --cyan
  truck: "#f5ff00", // --yellow
  log: "rgba(0, 245, 255, 0.35)", // --cyan al 35 %
  logEdge: "#00f5ff", // --cyan
  logWarn: "#ff006e", // --magenta
  logWarnFill: "rgba(255, 0, 110, 0.25)", // --magenta al 25 %, relleno del aviso
  logUnder: "rgba(74, 79, 112, 0.4)", // --ink-faint al 40 %
  dead: "#ff006e", // --magenta
  goal: "#001f2a",
  river: "#002633",
  bank: "#15151f", // --bg-3, arcén y orilla
  road: "#0f0f18", // --bg-2
  laneLine: "rgba(230, 233, 255, 0.35)", // --ink al 35 %
  windscreen: "rgba(10, 10, 24, 0.55)", // parabrisas, marca la dirección
  reverseWarn: "#f5ff00", // --yellow, chevrones del aviso
  reverseMark: "rgba(74, 79, 112, 0.6)", // --ink-faint al 60 %, flecha doble permanente
};
// shadowBlur de las entidades con halo (el resto, 0).
export const GLOW = { frog: 14, lily: 12 };
