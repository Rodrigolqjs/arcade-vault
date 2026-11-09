import { COLORS, GLOW, PIECE_COLORS } from "@/lib/games/tetris/constants";
import type { SkinId } from "@/lib/games/skins";
// Visual-only palette: nothing here is read by update(), collide() or scoring.
// "core" punches a square hole in the block (bg color), so pieces that share
// a tone still differ by pattern, not only by hue.
export type BlockMark = "none" | "core";
export interface TetrisPalette {
  pieces: readonly (string | null)[]; // indexed by piece type 1–8, like PIECE_COLORS
  marks: readonly BlockMark[]; // same index; "none" everywhere in clasico
  grid: string;
  well: string;
  wellFill: string;
  label: string; // SIGUIENTE
  bg: string; // canvas background, luminance ≤ 0.02
  highlight: string | null; // 4 px top bevel; null = flat blocks
  dim: string; // overlay while dying and on game over
  glow: number; // shadowBlur on the active piece only
}
const NO_MARKS: readonly BlockMark[] = Array<BlockMark>(9).fill("none");
// What the engine painted before skins existed.
const CLASICO: TetrisPalette = {
  ...COLORS,
  pieces: PIECE_COLORS,
  marks: NO_MARKS,
  bg: "#000",
  highlight: "rgba(255,255,255,0.12)",
  dim: "rgba(0, 0, 0, 0.55)",
  glow: GLOW,
};
// Max saturation on pure black; every piece has its own luminance step
// (≥ 0.05 apart), so they stay apart without relying on hue.
const NEON: TetrisPalette = {
  pieces: [
    null,
    "#00e5ff", // I
    "#ffff00", // O
    "#ff6ae6", // T
    "#2bff6a", // S
    "#ff3030", // Z
    "#5f90ff", // J
    "#ffa200", // L
    "#ffffff", // tuerca
  ],
  marks: NO_MARKS,
  grid: "#241a48",
  well: "#7a00c8",
  wellFill: "#100620",
  label: "#9a8cff",
  bg: "#000000",
  highlight: "rgba(255,255,255,0.18)",
  dim: "rgba(0, 0, 0, 0.55)",
  glow: 20,
};
// Green phosphor: four tones × two patterns on a green-tinted near-black, no glow.
const RETRO: TetrisPalette = {
  pieces: [
    null,
    "#c8ffd6", // I
    "#5cff8a", // O
    "#2ad65e", // T
    "#22ad4c", // S
    "#c8ffd6", // Z
    "#5cff8a", // J
    "#2ad65e", // L
    "#22ad4c", // tuerca
  ],
  marks: [
    "none",
    "none",
    "none",
    "none",
    "none",
    "core",
    "core",
    "core",
    "core",
  ],
  grid: "#0f3a1e",
  well: "#196232",
  wellFill: "#04100a",
  label: "#7ee89c",
  bg: "#04100a",
  highlight: null,
  dim: "rgba(4, 16, 10, 0.6)",
  glow: 0,
};
export const SKINS: Record<SkinId, TetrisPalette> = {
  clasico: CLASICO,
  neon: NEON,
  retro: RETRO,
};
