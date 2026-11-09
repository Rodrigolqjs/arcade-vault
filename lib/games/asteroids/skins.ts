import { COLORS, GLOW } from "@/lib/games/asteroids/constants";
import type { SkinId } from "@/lib/games/skins";
// Visual-only palette: nothing here is read by update() or collisions.
export interface AsteroidsPalette {
  ship: string;
  asteroid: string;
  bullet: string;
  powerUp: string; // also the "3x" label and the "3x N.Ns" counter
  thrust: string;
  particle: string;
  bg: string; // canvas background, luminance ≤ 0.02
  glow: {
    ship: number; // also the thrust flame
    asteroid: number;
    powerUp: number;
    bullet: number;
  };
  edges: "round" | "hard"; // lineJoin and bullet shape; hitboxes unchanged
}
// What the engine painted before skins existed, except the lighter power-up magenta.
const CLASICO: AsteroidsPalette = {
  ...COLORS,
  bg: "#000",
  glow: { ship: GLOW, asteroid: GLOW, powerUp: GLOW, bullet: 0 },
  edges: "round",
};
// Max saturation, strong halos on ship and power-up, pure black.
const NEON: AsteroidsPalette = {
  ship: "#00ffff",
  asteroid: "#ff2fd0",
  bullet: "#ffffff",
  powerUp: "#39ff14",
  thrust: "#ff7a00",
  particle: "#ff2fd0",
  bg: "#000000",
  glow: { ship: 18, asteroid: 12, powerUp: 20, bullet: 8 },
  edges: "round",
};
// Amber phosphor: three tones on an amber-tinted near-black, no glow.
const RETRO: AsteroidsPalette = {
  ship: "#ffb000",
  asteroid: "#cc8400",
  bullet: "#ffd480",
  powerUp: "#ffd480",
  thrust: "#cc8400",
  particle: "#cc8400",
  bg: "#0f0a02",
  glow: { ship: 0, asteroid: 0, powerUp: 0, bullet: 0 },
  edges: "hard",
};
export const SKINS: Record<SkinId, AsteroidsPalette> = {
  clasico: CLASICO,
  neon: NEON,
  retro: RETRO,
};
