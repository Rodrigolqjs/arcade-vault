// Ported from reference/resources/started-games/04-arkanoid/levels.js with the
// same generation, so every level keeps its pattern and colors.
import { BLOCK_COLS, BLOCK_ROWS } from "./constants";
export type BlockColor =
  "red" | "yellow" | "cyan" | "magenta" | "hotpink" | "green" | "gray";
export interface LevelBlock {
  col: number; // 0–9
  row: number; // 0–5
  color: BlockColor;
}
export interface Level {
  speed: number; // multiplier of BASE_BALL_VX/VY
  blocks: LevelBlock[];
}
const ROW_COLORS_1: BlockColor[] = [
  "red",
  "yellow",
  "cyan",
  "magenta",
  "hotpink",
  "green",
];
const ROW_COLORS_2: BlockColor[] = [
  "gray",
  "cyan",
  "hotpink",
  "yellow",
  "magenta",
  "green",
];
const ROW_COLORS_4: BlockColor[] = [
  "cyan",
  "magenta",
  "green",
  "yellow",
  "hotpink",
  "red",
];
// Visits every cell and keeps the ones `pick` returns a color for.
function grid(
  pick: (col: number, row: number) => BlockColor | null,
): LevelBlock[] {
  const blocks: LevelBlock[] = [];
  for (let row = 0; row < BLOCK_ROWS; row++)
    for (let col = 0; col < BLOCK_COLS; col++) {
      const color = pick(col, row);
      if (color) blocks.push({ col, row, color });
    }
  return blocks;
}
// 1: full grid, one color per row.
const l1 = grid((_, row) => ROW_COLORS_1[row]);
// 2: pyramid.
const PY_START = [4, 3, 2, 1, 0, 0];
const PY_END = [5, 6, 7, 8, 9, 9];
const l2 = grid((col, row) =>
  col >= PY_START[row] && col <= PY_END[row] ? ROW_COLORS_2[row] : null,
);
// 3: checkerboard, yellow on top and magenta below.
const l3 = grid((col, row) =>
  (col + row) % 2 === 0 ? (row < 3 ? "yellow" : "magenta") : null,
);
// 4: rows with gaps.
const GAPS_4 = [
  [2, 5, 8],
  [0, 4, 7, 9],
  [1, 3, 6],
  [2, 5, 8, 9],
  [0, 4, 7],
  [1, 3, 6, 9],
];
const l4 = grid((col, row) =>
  GAPS_4[row].includes(col) ? null : ROW_COLORS_4[row],
);
// 5: cyan frame with a hot pink cross.
const l5 = grid((col, row) => {
  const isFrame = col === 0 || col === 9 || row === 0 || row === 5;
  const isCross = col === 4 || row === 2;
  if (!isFrame && !isCross) return null;
  return isCross && !isFrame ? "hotpink" : "cyan";
});
export const LEVELS: Level[] = [
  { speed: 1.0, blocks: l1 },
  { speed: 1.1, blocks: l2 },
  { speed: 1.21, blocks: l3 },
  { speed: 1.33, blocks: l4 },
  { speed: 1.46, blocks: l5 },
];
