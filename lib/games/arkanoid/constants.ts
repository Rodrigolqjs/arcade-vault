// Values ported from reference/resources/started-games/04-arkanoid/game.js
// and assets/spritesheet.js.
export const W = 800;
export const H = 600;
export const PADDLE_SPEED = 400; // px/s
export const PADDLE_W = 81;
export const PADDLE_H = 14;
export const PADDLE_Y = 560;
export const PADDLE_CATCH = 8; // px below the paddle where the ball still bounces
export const BALL_SIZE = 16;
export const BASE_BALL_VX = 200; // px/s
export const BASE_BALL_VY = -300; // px/s
export const BLOCK_COLS = 10;
export const BLOCK_ROWS = 6;
export const BLOCK_W = 64;
export const BLOCK_H = 24;
export const BLOCKS_ORIGIN_X = 80; // (W − BLOCK_COLS × BLOCK_W) / 2
export const BLOCKS_ORIGIN_Y = 80;
export const BLOCK_POINTS = 10;
export const START_LIVES = 3;
export const EXPLOSION_DURATION = 150; // ms
export const EXPLOSION_SCALE = 1.4; // final size of the explosion
export const GAMEOVER_DELAY = 1; // s
// Copies of the tokens in app/globals.css; the canvas can't read CSS variables.
export const COLORS = {
  paddle: "#00f5ff", // --cyan, bloque-buster's catalog color
  ball: "#e6e9ff", // --ink
  blocks: {
    red: "#ff3b3b", // neon red (the same as CAÍDA's Z)
    yellow: "#f5ff00", // --yellow
    cyan: "#00f5ff", // --cyan
    magenta: "#ff006e", // --magenta
    hotpink: "#ff5cd6", // neon pink
    green: "#00ff88", // --green
    gray: "#8a8fb5", // --ink-dim
  },
};
