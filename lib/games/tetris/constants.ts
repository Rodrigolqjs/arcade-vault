// Values ported from reference/resources/started-games/03-tetris/game.js.
export const W = 800;
export const H = 600;
export const COLS = 10;
export const ROWS = 20;
export const BLOCK = 30;
export const BOARD_X = 250; // (W − COLS × BLOCK) / 2
export const BOARD_Y = 0;
export const NEXT_X = 590; // SIGUIENTE panel, a 4 × BLOCK box
export const NEXT_Y = 60;
// Indexed by piece type 1–8; each cell holds its piece's color index.
export const PIECES: readonly (readonly (readonly number[])[] | null)[] = [
  null,
  [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ], // I
  [
    [2, 2],
    [2, 2],
  ], // O
  [
    [0, 3, 0],
    [3, 3, 3],
    [0, 0, 0],
  ], // T
  [
    [0, 4, 4],
    [4, 4, 0],
    [0, 0, 0],
  ], // S
  [
    [5, 5, 0],
    [0, 5, 5],
    [0, 0, 0],
  ], // Z
  [
    [6, 0, 0],
    [6, 6, 6],
    [0, 0, 0],
  ], // J
  [
    [0, 0, 7],
    [7, 7, 7],
    [0, 0, 0],
  ], // L
  [
    [8, 8, 8],
    [8, 0, 8],
    [8, 8, 8],
  ], // tuerca
];
export const KICKS = [0, -1, 1, -2, 2];
export const LINE_SCORES = [0, 100, 300, 500, 800];
export const SOFT_DROP_POINTS = 1; // per row
export const HARD_DROP_POINTS = 2; // per cell
export const BASE_DROP_INTERVAL = 1000; // ms
export const MIN_DROP_INTERVAL = 100; // ms
export const DROP_STEP = 90; // ms less per level
export const LINES_PER_LEVEL = 10;
export const GHOST_ALPHA = 0.2;
export const GLOW = 12; // shadowBlur on the active piece
export const GAMEOVER_DELAY = 1; // s
// Mirrors the tokens in app/globals.css; canvas can't read CSS variables.
export const PIECE_COLORS: readonly (string | null)[] = [
  null,
  "#00f5ff", // I — --cyan
  "#f5ff00", // O — --yellow
  "#ff006e", // T — --magenta
  "#00ff88", // S — --green
  "#ff3b3b", // Z — neon red
  "#3d7bff", // J — neon blue
  "#ff9f1c", // L — neon orange
  "#e6e9ff", // tuerca — --ink
];
export const COLORS = {
  grid: "rgba(74, 79, 112, 0.35)", // --ink-faint at 35 %
  well: "#ff006e", // --magenta, caida's catalog color
  wellFill: "rgba(255, 0, 110, 0.035)", // --magenta, barely tinting the well
  label: "#8a8fb5", // --ink-dim, SIGUIENTE label
};
