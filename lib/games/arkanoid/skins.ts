import { COLORS, GLOW } from "@/lib/games/arkanoid/constants";
import type { BlockColor } from "@/lib/games/arkanoid/levels";
import type { SkinId } from "@/lib/games/skins";
// Visual-only palette: nothing here is read by update(), collideAABB() or scoring.
// Block colors are row decoration: every block breaks in one hit for the same points.
export interface ArkanoidPalette {
  paddle: string;
  ball: string;
  blocks: Record<BlockColor, string>;
  bg: string; // canvas background, luminance ≤ 0.02
  dim: string; // overlay while dying and on game over
  tubeFill: number; // alpha of the block's tinted fill under its outline
  bevel: string | null; // thin lit edge on top of each block; null = flat
  paddleCore: string | null; // pale line along the paddle; null = flat
  glow: { paddle: number; ball: number }; // blocks never glow (60 of them)
  edges: "round" | "hard"; // capsule paddle and round ball, or square; hitboxes unchanged
}
// What the engine painted before skins existed.
const CLASICO: ArkanoidPalette = {
  ...COLORS,
  bg: "#000",
  dim: "rgba(0, 0, 0, 0.55)",
  tubeFill: 0.24,
  bevel: "rgba(255, 255, 255, 0.35)",
  paddleCore: "rgba(255, 255, 255, 0.55)",
  glow: GLOW,
  edges: "round",
};
// Max saturation on pure black, brighter tubes and strong halos on paddle and ball.
// Each block color has its own luminance step (≥ 0.05 apart).
const NEON: ArkanoidPalette = {
  paddle: "#00ffff",
  ball: "#ffffff",
  blocks: {
    red: "#ff3030",
    yellow: "#ffff00",
    cyan: "#00e5ff",
    magenta: "#ff38f0",
    hotpink: "#ff70dc",
    green: "#2bff6a",
    gray: "#c4b8ff",
  },
  bg: "#000000",
  dim: "rgba(0, 0, 0, 0.55)",
  tubeFill: 0.32,
  bevel: "rgba(255, 255, 255, 0.45)",
  paddleCore: "rgba(255, 255, 255, 0.7)",
  glow: { paddle: 22, ball: 18 },
  edges: "round",
};
// Short 8-bit palette: four tones (cream, ochre, teal, brick) on a plum-tinted
// near-black, no glow, square paddle and ball. No two adjacent rows of any
// level share a tone.
const RETRO: ArkanoidPalette = {
  paddle: "#f0b030",
  ball: "#fff1d0",
  blocks: {
    red: "#ec6a40",
    yellow: "#f0b030",
    cyan: "#38b8a6",
    magenta: "#ec6a40",
    hotpink: "#fff1d0",
    green: "#38b8a6",
    gray: "#f0b030",
  },
  bg: "#0e0812",
  dim: "rgba(14, 8, 18, 0.6)",
  tubeFill: 0.3,
  bevel: null,
  paddleCore: null,
  glow: { paddle: 0, ball: 0 },
  edges: "hard",
};
export const SKINS: Record<SkinId, ArkanoidPalette> = {
  clasico: CLASICO,
  neon: NEON,
  retro: RETRO,
};
