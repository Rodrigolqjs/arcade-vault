import {
  COLORS,
  CORE_PULSE_GLOW,
  GLOW,
  TRAIL_FADE,
} from "@/lib/games/snake/constants";
import type { SkinId } from "@/lib/games/skins";
// Visual-only palette: nothing here is read by tick(), collisions or scoring.
export interface SnakePalette {
  snake: string;
  head: string;
  core: string; // also the death blink
  grid: string; // intersection dots
  border: string; // the lethal wall, measured as an entity
  bg: string; // canvas background, luminance ≤ 0.02
  trailFade: number; // tail alpha = 1 − trailFade; 0 = solid body
  glow: {
    head: number;
    core: number; // base shadowBlur of the core
    pulse: number; // extra blur at the peak of the pulse (core + pulse ≤ 24)
  };
  coreShape: "round" | "diamond"; // drawn inside the same cell; hitbox is the cell
}
// What the engine painted before skins existed.
const CLASICO: SnakePalette = {
  ...COLORS,
  bg: "#000",
  trailFade: TRAIL_FADE,
  glow: { head: GLOW, core: GLOW, pulse: CORE_PULSE_GLOW },
  coreShape: "round",
};
// Acid lime trail with a long halo on the head and a hot pink core.
const NEON: SnakePalette = {
  snake: "#39ff14",
  head: "#eaffc8",
  core: "#ff2fd0",
  grid: "#2a3a5a",
  border: "#00e5ff",
  bg: "#000000",
  trailFade: 0.35,
  glow: { head: 18, core: 16, pulse: 6 },
  coreShape: "round",
};
// Cold white phosphor: three tones on a blue-tinted near-black, no glow,
// solid body and a diamond core (shape, not only tone, sets it apart).
const RETRO: SnakePalette = {
  snake: "#a8c0ec",
  head: "#e8f0ff",
  core: "#e8f0ff",
  grid: "#1c2a44",
  border: "#6f8fcc",
  bg: "#060a12",
  trailFade: 0,
  glow: { head: 0, core: 0, pulse: 0 },
  coreShape: "diamond",
};
export const SKINS: Record<SkinId, SnakePalette> = {
  clasico: CLASICO,
  neon: NEON,
  retro: RETRO,
};
