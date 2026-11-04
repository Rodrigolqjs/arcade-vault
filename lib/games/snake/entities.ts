import {
  CELL,
  COLS,
  ROWS,
  START_DIR,
  START_HEAD,
  START_LENGTH,
} from "./constants";
export interface Cell {
  x: number; // column 0–39
  y: number; // row 0–29
}
export type Dir = "up" | "down" | "left" | "right";
const DELTAS: Record<Dir, Cell> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};
/** Initial snake, head first, trailing opposite to START_DIR. */
export function createSnake(): Cell[] {
  const back = DELTAS[START_DIR];
  return Array.from({ length: START_LENGTH }, (_, i) => ({
    x: START_HEAD.x - back.x * i,
    y: START_HEAD.y - back.y * i,
  }));
}
export function step(cell: Cell, dir: Dir): Cell {
  const d = DELTAS[dir];
  return { x: cell.x + d.x, y: cell.y + d.y };
}
export function isOpposite(a: Dir, b: Dir): boolean {
  const da = DELTAS[a];
  const db = DELTAS[b];
  return da.x === -db.x && da.y === -db.y;
}
export function hitsWall(cell: Cell): boolean {
  return cell.x < 0 || cell.x >= COLS || cell.y < 0 || cell.y >= ROWS;
}
/** The tail cell counts as free unless the snake grows this tick (it moves away). */
export function hitsBody(snake: Cell[], cell: Cell, growing: boolean): boolean {
  const len = growing ? snake.length : snake.length - 1;
  for (let i = 0; i < len; i++) {
    if (snake[i].x === cell.x && snake[i].y === cell.y) return true;
  }
  return false;
}
/** Random cell not covered by the snake, or null when the board is full. */
export function randomFreeCell(snake: Cell[]): Cell | null {
  const taken = new Set(snake.map((c) => c.y * COLS + c.x));
  const free: number[] = [];
  for (let i = 0; i < COLS * ROWS; i++) if (!taken.has(i)) free.push(i);
  if (free.length === 0) return null;
  const i = free[Math.floor(Math.random() * free.length)];
  return { x: i % COLS, y: Math.floor(i / COLS) };
}
/** Fills a grid cell shrunk by `inset` px on every side. */
export function drawCell(
  ctx: CanvasRenderingContext2D,
  cell: Cell,
  color: string,
  inset = 1,
): void {
  ctx.fillStyle = color;
  ctx.fillRect(
    cell.x * CELL + inset,
    cell.y * CELL + inset,
    CELL - inset * 2,
    CELL - inset * 2,
  );
}
