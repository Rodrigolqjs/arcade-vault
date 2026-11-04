// Original grid snake designed in SPEC 10 (no reference game.js to port).
export const W = 800;
export const H = 600;
export const CELL = 20;
export const COLS = 40; // W / CELL
export const ROWS = 30; // H / CELL
export const START_LENGTH = 4;
export const START_HEAD = { x: 20, y: 15 } as const;
export const START_DIR = "right" as const;
export const BASE_TICK = 120; // ms
export const TICK_STEP = 10; // ms less per level
export const MIN_TICK = 50; // ms
export const CORES_PER_LEVEL = 5;
export const CORE_POINTS = 10; // × level
export const MAX_QUEUED_TURNS = 2;
export const GAMEOVER_DELAY = 1; // s
// Copies of the app/globals.css tokens; the canvas can't read CSS variables.
export const COLORS = {
  snake: "#00ff88", // --green, serpentina's catalog color
  head: "#b3ffd9", // --green, lightened
  core: "#ff006e", // --magenta
  grid: "rgba(74, 79, 112, 0.25)", // --ink-faint at 25 %
  border: "#00ff88", // --green
};
