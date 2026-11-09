// Values ported from reference/resources/started-games/02-asteroids/game.js.
export const W = 800;
export const H = 600;
// Indexed by asteroid size: 1 (small), 2 (medium), 3 (large).
export const RADII = [0, 16, 30, 50];
export const SPEEDS = [0, 85, 55, 32];
export const POINTS = [0, 100, 50, 20];
export const POWERUP_DROP_CHANCE = 0.15;
export const POWERUP_DURATION = 5;
export const POWERUP_TTL = 12;
export const TRIPLE_SPREAD = 0.18;
export const GAMEOVER_DELAY = 1;
// Mirrors the tokens in app/globals.css; canvas can't read CSS variables.
export const COLORS = {
  ship: "#00f5ff", // --cyan
  asteroid: "#f5ff00", // --yellow
  bullet: "#e6e9ff", // --ink
  powerUp: "#ff4d94", // lighter --magenta: legible on scanlines and in the vignette corners
  thrust: "#ff006e", // --magenta
  particle: "#f5ff00", // --yellow, with fading alpha
};
export const GLOW = 10;
