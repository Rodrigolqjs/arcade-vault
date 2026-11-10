import { COLORS, GLOW } from "@/lib/games/ranaria/constants";
import type { SkinId } from "@/lib/games/skins";
// Visual-only palette: nothing here is read by update(), collisions or scoring.
// The board has no separate background: the five bands cover the whole canvas,
// so each band (luminance ≤ 0.02) is the background of what moves over it.
export interface RanariaPalette {
  frog: string;
  frogEyes: string;
  frogPupil: string;
  lily: string;
  car: string; // 1 cell
  van: string; // 2 cells
  truck: string; // 3 cells
  log: string; // fill
  logEdge: string;
  logWarn: string; // edge while blinking before sinking
  logWarnFill: string;
  logUnder: string; // outline of a sunk log
  dead: string; // blinking dead frog
  goal: string;
  river: string;
  bank: string;
  road: string;
  laneLine: string; // dashes; the kerb is the same color at half alpha
  windscreen: string;
  glow: { frog: number; lily: number; vehicle: number };
  edges: "round" | "hard"; // hard: square corners, square lily and eyes
}
// What the engine painted before skins existed.
const CLASICO: RanariaPalette = {
  ...COLORS,
  frogPupil: COLORS.road,
  glow: { ...GLOW, vehicle: 0 },
  edges: "round",
};
// Electric swamp: lime frog with a long halo, hot traffic on pure black and
// amber logs on ink-blue water.
const NEON: RanariaPalette = {
  frog: "#39ff14",
  frogEyes: "#ffffff",
  frogPupil: "#000000",
  lily: "#39ff14",
  car: "#ff2fd0",
  van: "#00e5ff",
  truck: "#ffff00",
  log: "rgba(255, 162, 0, 0.18)",
  logEdge: "#ffa200",
  logWarn: "#ff6ae6",
  logWarnFill: "rgba(255, 106, 230, 0.22)",
  logUnder: "rgba(120, 130, 200, 0.4)",
  dead: "#ff6ae6",
  goal: "#000a14",
  river: "#00142a",
  bank: "#0a0a14",
  road: "#000000",
  laneLine: "rgba(0, 229, 255, 0.3)",
  windscreen: "rgba(0, 0, 0, 0.6)",
  glow: { frog: 20, lily: 16, vehicle: 8 },
  edges: "round",
};
// Short 8-bit night palette: lime, salmon, bone and lavender over
// violet-tinted bands, no glow and square corners.
const RETRO: RanariaPalette = {
  frog: "#c8f060",
  frogEyes: "#f0e8d0",
  frogPupil: "#0e0c16",
  lily: "#c8f060",
  car: "#ff8a80",
  van: "#f0e8d0",
  truck: "#9484e8",
  log: "rgba(148, 132, 232, 0.25)",
  logEdge: "#9484e8",
  logWarn: "#ff8a80",
  logWarnFill: "rgba(255, 138, 128, 0.25)",
  logUnder: "rgba(148, 132, 232, 0.35)",
  dead: "#ff8a80",
  goal: "#0c0e18",
  river: "#0a0c20",
  bank: "#16121e",
  road: "#0e0c16",
  laneLine: "rgba(240, 232, 208, 0.3)",
  windscreen: "rgba(14, 12, 22, 0.6)",
  glow: { frog: 0, lily: 0, vehicle: 0 },
  edges: "hard",
};
export const SKINS: Record<SkinId, RanariaPalette> = {
  clasico: CLASICO,
  neon: NEON,
  retro: RETRO,
};
