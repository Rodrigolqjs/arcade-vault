import {
  CELL,
  COLORS,
  FROG_INSET,
  FROG_SIZE,
  HOP_ANIM,
  LANE_LOOP,
  LILIES_BASE,
  LILIES_MIN,
  LILY_CATCH,
  LILY_COL_MAX,
  LILY_COL_MIN,
  LILY_MIN_SPACING,
  LILY_RADIUS,
  LOG_LENGTHS,
  LOOP_MARGIN,
  MAX_SINKING_LANES,
  MAX_SPEED_MULT,
  RIVER_GAP_MAX,
  RIVER_GAP_MIN,
  RIVER_ROWS,
  RIVER_SPEED_MAX,
  RIVER_SPEED_MIN,
  ROAD_GAP_MAX,
  ROAD_GAP_MIN,
  ROAD_ROWS,
  ROAD_SPEED_MAX,
  ROAD_SPEED_MIN,
  ROW_GOAL,
  ROW_MEDIAN,
  ROW_START,
  START_COL,
  SINK_BLINK,
  SINK_CYCLE,
  SINK_FLOAT,
  SINK_WARN,
  SPEED_STEP,
  VEHICLE_INSET,
  VEHICLE_LENGTHS,
  W,
} from "@/lib/games/ranaria/constants";
export type LaneKind = "road" | "river";
export type LogState = "float" | "warn" | "under";
export type Hop = "up" | "down" | "left" | "right";
export interface Mover {
  x: number; // borde izquierdo en px, en el bucle −200…1000
  len: number; // largo en celdas (1–4)
  phase: number; // s dentro del ciclo de hundido; solo cuenta en carriles sinking
}
export interface Lane {
  row: number; // 1–4 río, 6–10 carretera
  kind: LaneKind;
  speed: number; // px/s con signo (+ hacia la derecha)
  sinking: boolean; // sus troncos se hunden (solo río)
  movers: Mover[];
}
export interface Frog {
  x: number; // borde izquierdo en px, 0–750 al saltar
  row: number; // 0–11
  hopAnim: number; // s restantes de la animación de salto
}
export interface Stretch {
  lanes: Lane[];
  lilies: number[]; // columnas
}
const LOOP_CELLS = LANE_LOOP / CELL; // 24
// ── Azar ──
const randInt = (min: number, max: number) =>
  min + Math.floor(Math.random() * (max - min + 1));
const pick = <T>(list: readonly T[]) =>
  list[Math.floor(Math.random() * list.length)];
// Devuelve x al bucle [−LOOP_MARGIN, W + LOOP_MARGIN).
const wrap = (x: number) =>
  ((((x + LOOP_MARGIN) % LANE_LOOP) + LANE_LOOP) % LANE_LOOP) - LOOP_MARGIN;
// ── Dificultad ──
export const speedMult = (tramo: number) =>
  Math.min(MAX_SPEED_MULT, 1 + SPEED_STEP * (tramo - 1));
export const lilyCount = (tramo: number) =>
  Math.max(LILIES_MIN, LILIES_BASE - tramo);
export const isRiver = (row: number) => RIVER_ROWS.includes(row);
export const isRoad = (row: number) => ROAD_ROWS.includes(row);
// ── Generación ──
export function fillLane(
  row: number,
  kind: LaneKind,
  tramo: number,
  dir: 1 | -1,
): Lane {
  const road = kind === "road";
  const base = road
    ? randInt(ROAD_SPEED_MIN, ROAD_SPEED_MAX)
    : randInt(RIVER_SPEED_MIN, RIVER_SPEED_MAX);
  const lengths = road ? VEHICLE_LENGTHS : LOG_LENGTHS;
  const gapMin = road ? ROAD_GAP_MIN : RIVER_GAP_MIN;
  const gapMax = road ? ROAD_GAP_MAX : RIVER_GAP_MAX;
  const movers: Mover[] = [];
  let cursor = 0;
  let len = pick(lengths);
  // The loop is 24 cells; the seam keeps at least gapMin cells of gap too.
  while (cursor + len + gapMin <= LOOP_CELLS) {
    movers.push({ x: cursor * CELL, len, phase: 0 });
    cursor += len + randInt(gapMin, gapMax);
    len = pick(lengths);
  }
  // Shift the whole lane so stretches don't all start lined up at x = 0.
  const offset = Math.random() * LANE_LOOP;
  for (const m of movers) m.x = wrap(m.x + offset);
  return {
    row,
    kind,
    speed: dir * Math.round(base * speedMult(tramo)),
    sinking: false,
    movers,
  };
}
export function pickLilies(count: number): number[] {
  // Rejection sampling: with 14 columns and a spacing of 3, 4 lilies always fit.
  for (;;) {
    const cols: number[] = [];
    for (let tries = 0; tries < 50 && cols.length < count; tries++) {
      const c = randInt(LILY_COL_MIN, LILY_COL_MAX);
      if (cols.every((o) => Math.abs(o - c) >= LILY_MIN_SPACING)) cols.push(c);
    }
    if (cols.length === count) return cols.sort((a, b) => a - b);
  }
}
export function generateStretch(tramo: number): Stretch {
  const lanes: Lane[] = [];
  // Contiguous lanes of one kind alternate; the first direction is random.
  let dir: 1 | -1 = Math.random() < 0.5 ? 1 : -1;
  for (const row of RIVER_ROWS) {
    lanes.push(fillLane(row, "river", tramo, dir));
    dir = dir === 1 ? -1 : 1;
  }
  dir = Math.random() < 0.5 ? 1 : -1;
  for (const row of ROAD_ROWS) {
    lanes.push(fillLane(row, "road", tramo, dir));
    dir = dir === 1 ? -1 : 1;
  }
  // min(4, tramo) river lanes sink; phases are spread evenly inside each lane
  // plus one random offset shared by the lane.
  const river = lanes.filter((l) => l.kind === "river");
  for (let i = river.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [river[i], river[j]] = [river[j], river[i]];
  }
  for (const lane of river.slice(0, Math.min(MAX_SINKING_LANES, tramo))) {
    lane.sinking = true;
    const offset = Math.random() * SINK_CYCLE;
    const n = lane.movers.length;
    lane.movers.forEach((m, i) => {
      m.phase = (i * SINK_CYCLE) / n + offset;
    });
  }
  return { lanes, lilies: pickLilies(lilyCount(tramo)) };
}
// ── Movimiento y colisiones ──
export function moveLane(lane: Lane, dt: number) {
  for (const m of lane.movers) m.x = wrap(m.x + lane.speed * dt);
}
export function logState(mover: Mover, lane: Lane, t: number): LogState {
  if (!lane.sinking) return "float";
  const p = (t + mover.phase) % SINK_CYCLE;
  if (p < SINK_FLOAT) return "float";
  if (p < SINK_FLOAT + SINK_WARN) return "warn";
  return "under";
}
export function hitsVehicle(lane: Lane, frogX: number) {
  const left = frogX + FROG_INSET;
  const right = frogX + CELL - FROG_INSET;
  return lane.movers.some(
    (m) =>
      left < m.x + m.len * CELL - VEHICLE_INSET && right > m.x + VEHICLE_INSET,
  );
}
// The floating log under the frog's centre, or null (water or a sunk log).
export function logUnder(lane: Lane, frogX: number, t: number): Mover | null {
  const c = frogX + CELL / 2;
  return (
    lane.movers.find(
      (m) =>
        c >= m.x && c <= m.x + m.len * CELL && logState(m, lane, t) !== "under",
    ) ?? null
  );
}
export const catchesLily = (lilies: number[], frogX: number) =>
  lilies.some(
    (col) => Math.abs(frogX + CELL / 2 - (col * CELL + CELL / 2)) <= LILY_CATCH,
  );
// ── Dibujo ──
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}
export function drawBands(ctx: CanvasRenderingContext2D) {
  const band = (row: number, rows: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(0, row * CELL, W, rows * CELL);
  };
  band(ROW_GOAL, 1, COLORS.goal);
  band(RIVER_ROWS[0], RIVER_ROWS.length, COLORS.river);
  band(ROW_MEDIAN, 1, COLORS.bank);
  band(ROAD_ROWS[0], ROAD_ROWS.length, COLORS.road);
  band(ROW_START, 1, COLORS.bank);
  // Dashed lines between road lanes.
  ctx.strokeStyle = COLORS.laneLine;
  ctx.lineWidth = 2;
  ctx.setLineDash([18, 18]);
  ctx.beginPath();
  for (let i = 1; i < ROAD_ROWS.length; i++) {
    const y = (ROAD_ROWS[0] + i) * CELL;
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
  }
  ctx.stroke();
  ctx.setLineDash([]);
  // Solid kerb where the road meets the median and the start bank.
  ctx.globalAlpha = 0.5;
  ctx.beginPath();
  ctx.moveTo(0, ROAD_ROWS[0] * CELL);
  ctx.lineTo(W, ROAD_ROWS[0] * CELL);
  ctx.moveTo(0, ROW_START * CELL);
  ctx.lineTo(W, ROW_START * CELL);
  ctx.stroke();
  ctx.globalAlpha = 1;
}
const VEHICLE_COLORS: Record<number, string> = {
  1: COLORS.car,
  2: COLORS.van,
  3: COLORS.truck,
};
function drawVehicle(
  ctx: CanvasRenderingContext2D,
  m: Mover,
  y: number,
  dir: number,
) {
  const w = m.len * CELL - 8;
  const x = m.x + 4;
  const top = y + 9;
  const h = CELL - 18;
  ctx.fillStyle = VEHICLE_COLORS[m.len] ?? COLORS.car;
  roundRect(ctx, x, top, w, h, 6);
  ctx.fill();
  // Dark windscreen on the leading side, so the direction reads at a glance.
  ctx.fillStyle = "rgba(10, 10, 24, 0.55)";
  const ws = 8;
  const wx = dir > 0 ? x + w - ws - 6 : x + 6;
  ctx.fillRect(wx, top + 5, ws, h - 10);
}
function drawLog(
  ctx: CanvasRenderingContext2D,
  m: Mover,
  y: number,
  state: LogState,
  p: number,
) {
  const x = m.x + 3;
  const w = m.len * CELL - 6;
  const top = y + 8;
  const h = CELL - 16;
  ctx.lineWidth = 2;
  if (state === "under") {
    // Only a faint outline where the log will come back up.
    ctx.strokeStyle = COLORS.logUnder;
    roundRect(ctx, x, top, w, h, 10);
    ctx.stroke();
    return;
  }
  // Warning: alternates every SINK_BLINK between normal and a magenta edge.
  const alt =
    state === "warn" && Math.floor((p - SINK_FLOAT) / SINK_BLINK) % 2 === 0;
  ctx.fillStyle = alt ? "rgba(255, 0, 110, 0.25)" : COLORS.log;
  ctx.strokeStyle = alt ? COLORS.logWarn : COLORS.logEdge;
  roundRect(ctx, x, top, w, h, 10);
  ctx.fill();
  ctx.stroke();
  // Grain: one line per cell, so long logs read longer.
  ctx.globalAlpha = 0.35;
  ctx.beginPath();
  for (let c = 1; c < m.len; c++) {
    ctx.moveTo(m.x + c * CELL, top + 6);
    ctx.lineTo(m.x + c * CELL, top + h - 6);
  }
  ctx.stroke();
  ctx.globalAlpha = 1;
}
export function drawLane(ctx: CanvasRenderingContext2D, lane: Lane, t: number) {
  const y = lane.row * CELL;
  for (const m of lane.movers) {
    if (m.x >= W || m.x + m.len * CELL <= 0) continue;
    if (lane.kind === "road") drawVehicle(ctx, m, y, lane.speed);
    else
      drawLog(
        ctx,
        m,
        y,
        logState(m, lane, t),
        lane.sinking ? (t + m.phase) % SINK_CYCLE : 0,
      );
  }
}
export function drawLilies(ctx: CanvasRenderingContext2D, lilies: number[]) {
  ctx.strokeStyle = COLORS.lily;
  ctx.lineWidth = 4;
  ctx.shadowColor = COLORS.lily;
  ctx.shadowBlur = 12;
  for (const col of lilies) {
    ctx.beginPath();
    ctx.arc(col * CELL + CELL / 2, CELL / 2, LILY_RADIUS, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.shadowBlur = 0;
}
export function drawFrog(
  ctx: CanvasRenderingContext2D,
  frog: Frog,
  color: string,
  eyes: boolean,
) {
  // A quick squash-and-stretch while hopping (visual only).
  const s = 1 + 0.18 * (frog.hopAnim / HOP_ANIM);
  const size = FROG_SIZE * s;
  const cx = frog.x + CELL / 2;
  const cy = frog.row * CELL + CELL / 2;
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 14;
  roundRect(ctx, cx - size / 2, cy - size / 2, size, size, size * 0.42);
  ctx.fill();
  ctx.shadowBlur = 0;
  if (!eyes) return;
  ctx.fillStyle = COLORS.frogEyes;
  for (const dx of [-8, 8]) {
    ctx.beginPath();
    ctx.arc(cx + dx * s, cy - 8 * s, 4.5 * s, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = COLORS.road;
  for (const dx of [-8, 8]) {
    ctx.beginPath();
    ctx.arc(cx + dx * s, cy - 9 * s, 2 * s, 0, Math.PI * 2);
    ctx.fill();
  }
}
export const startFrog = (): Frog => ({
  x: START_COL * CELL,
  row: ROW_START,
  hopAnim: 0,
});
export const frogInCanvas = (frog: Frog) => {
  const c = frog.x + CELL / 2;
  return c >= 0 && c <= W;
};
