import {
  CELL,
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
  MAX_REVERSIBLE,
  MAX_SINKING_LANES,
  MAX_SPEED_MULT,
  REVERSE_BLINK,
  REVERSE_FROM_TRAMO,
  REVERSE_MARK_H,
  REVERSE_MARK_MARGIN,
  REVERSE_MARK_W,
  REVERSE_MAX,
  REVERSE_MIN,
  REVERSE_RAMP,
  REVERSE_WARN,
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
import type { RanariaPalette } from "@/lib/games/ranaria/skins";
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
  speed: number; // px/s con signo, velocidad actual (cambia durante la rampa)
  sinking: boolean; // sus troncos se hunden (solo río)
  movers: Mover[];
  // Carriles reversibles (SPEC ranaria/03)
  reversible: boolean; // se invierte durante el tramo
  cruise: number; // px/s con signo, velocidad de crucero del sentido actual
  reverseIn: number; // s hasta empezar la rampa; el aviso se ve con reverseIn ≤ REVERSE_WARN
  ramp: number; // s restantes de la rampa; 0 si no está invirtiendo
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
  const speed = dir * Math.round(base * speedMult(tramo));
  return {
    row,
    kind,
    speed,
    sinking: false,
    movers,
    reversible: false,
    cruise: speed,
    reverseIn: 0,
    ramp: 0,
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
  pickReversible(lanes, tramo);
  return { lanes, lilies: pickLilies(lilyCount(tramo)) };
}
// ── Carriles reversibles ──
const randReverse = () =>
  REVERSE_MIN + Math.random() * (REVERSE_MAX - REVERSE_MIN);
export const reversibleCount = (tramo: number) =>
  Math.max(0, Math.min(MAX_REVERSIBLE, tramo - (REVERSE_FROM_TRAMO - 1)));
// Marks min(3, tramo − 2) lanes at random, never two in contiguous rows.
export function pickReversible(lanes: Lane[], tramo: number) {
  const count = reversibleCount(tramo);
  if (count <= 0) return;
  // With 9 lanes in rows 1–4 and 6–10, 3 non-contiguous lanes always fit.
  for (;;) {
    const pool = [...lanes].sort(() => Math.random() - 0.5);
    const chosen: Lane[] = [];
    for (const lane of pool) {
      if (chosen.length === count) break;
      if (chosen.every((c) => Math.abs(c.row - lane.row) > 1))
        chosen.push(lane);
    }
    if (chosen.length < count) continue;
    for (const lane of chosen) {
      lane.reversible = true;
      lane.reverseIn = randReverse();
    }
    return;
  }
}
// Countdown, then a linear ramp from cruise to −cruise in REVERSE_RAMP.
export function updateReverse(lane: Lane, dt: number) {
  if (!lane.reversible) return;
  if (lane.ramp <= 0) {
    lane.reverseIn -= dt;
    if (lane.reverseIn > 0) return;
    // The leftover of this frame already runs on the ramp.
    lane.ramp = REVERSE_RAMP + lane.reverseIn;
    lane.reverseIn = 0;
  } else lane.ramp -= dt;
  if (lane.ramp <= 0) {
    lane.cruise = -lane.cruise;
    lane.speed = lane.cruise;
    lane.ramp = 0;
    lane.reverseIn = randReverse();
    return;
  }
  const progress = 1 - lane.ramp / REVERSE_RAMP;
  lane.speed = lane.cruise * (1 - 2 * progress);
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
  pal: RanariaPalette,
) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, pal.edges === "hard" ? 0 : r);
}
export function drawBands(ctx: CanvasRenderingContext2D, pal: RanariaPalette) {
  const band = (row: number, rows: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(0, row * CELL, W, rows * CELL);
  };
  band(ROW_GOAL, 1, pal.goal);
  band(RIVER_ROWS[0], RIVER_ROWS.length, pal.river);
  band(ROW_MEDIAN, 1, pal.bank);
  band(ROAD_ROWS[0], ROAD_ROWS.length, pal.road);
  band(ROW_START, 1, pal.bank);
  // Dashed lines between road lanes.
  ctx.strokeStyle = pal.laneLine;
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
const vehicleColor = (len: number, pal: RanariaPalette) =>
  len === 3 ? pal.truck : len === 2 ? pal.van : pal.car;
function drawVehicle(
  ctx: CanvasRenderingContext2D,
  m: Mover,
  y: number,
  dir: number,
  pal: RanariaPalette,
) {
  const w = m.len * CELL - 8;
  const x = m.x + 4;
  const top = y + 9;
  const h = CELL - 18;
  const color = vehicleColor(m.len, pal);
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = pal.glow.vehicle;
  roundRect(ctx, x, top, w, h, 6, pal);
  ctx.fill();
  ctx.shadowBlur = 0;
  // Dark windscreen on the leading side, so the direction reads at a glance.
  ctx.fillStyle = pal.windscreen;
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
  pal: RanariaPalette,
) {
  const x = m.x + 3;
  const w = m.len * CELL - 6;
  const top = y + 8;
  const h = CELL - 16;
  ctx.lineWidth = 2;
  if (state === "under") {
    // Only a faint outline where the log will come back up.
    ctx.strokeStyle = pal.logUnder;
    roundRect(ctx, x, top, w, h, 10, pal);
    ctx.stroke();
    return;
  }
  // Warning: alternates every SINK_BLINK between normal and a magenta edge.
  const alt =
    state === "warn" && Math.floor((p - SINK_FLOAT) / SINK_BLINK) % 2 === 0;
  ctx.fillStyle = alt ? pal.logWarnFill : pal.log;
  ctx.strokeStyle = alt ? pal.logWarn : pal.logEdge;
  roundRect(ctx, x, top, w, h, 10, pal);
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
export function drawLane(
  ctx: CanvasRenderingContext2D,
  lane: Lane,
  t: number,
  pal: RanariaPalette,
) {
  const y = lane.row * CELL;
  for (const m of lane.movers) {
    if (m.x >= W || m.x + m.len * CELL <= 0) continue;
    if (lane.kind === "road") drawVehicle(ctx, m, y, lane.speed, pal);
    else
      drawLog(
        ctx,
        m,
        y,
        logState(m, lane, t),
        lane.sinking ? (t + m.phase) % SINK_CYCLE : 0,
        pal,
      );
  }
}
// Reversible lane: a faint ⇄ at both ends, and for the second before a
// reversal, two blinking chevrons per end pointing to the new direction.
// Drawn under the movers and without glow.
export function drawReverse(
  ctx: CanvasRenderingContext2D,
  lane: Lane,
  t: number,
  pal: RanariaPalette,
) {
  if (!lane.reversible) return;
  const cy = lane.row * CELL + CELL / 2;
  const half = REVERSE_MARK_W / 2;
  const ends = [REVERSE_MARK_MARGIN + half, W - REVERSE_MARK_MARGIN - half];
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  // ⇄: upper arrow to the right, lower arrow to the left, 16 × 10 px.
  ctx.strokeStyle = pal.reverseMark;
  ctx.beginPath();
  for (const cx of ends) {
    const top = cy - REVERSE_MARK_H / 2 + 1;
    const bottom = cy + REVERSE_MARK_H / 2 - 1;
    ctx.moveTo(cx - half, top);
    ctx.lineTo(cx + half, top);
    ctx.moveTo(cx + half - 4, top - 3);
    ctx.lineTo(cx + half, top);
    ctx.lineTo(cx + half - 4, top + 3);
    ctx.moveTo(cx + half, bottom);
    ctx.lineTo(cx - half, bottom);
    ctx.moveTo(cx - half + 4, bottom - 3);
    ctx.lineTo(cx - half, bottom);
    ctx.lineTo(cx - half + 4, bottom + 3);
  }
  ctx.stroke();
  const warning = lane.ramp <= 0 && lane.reverseIn <= REVERSE_WARN;
  if (!warning || Math.floor(t / REVERSE_BLINK) % 2 !== 0) {
    ctx.lineCap = "butt";
    ctx.lineJoin = "miter";
    return;
  }
  // Chevrons point where the lane is about to go (the sign of −cruise).
  const dir = lane.cruise > 0 ? -1 : 1;
  ctx.strokeStyle = pal.reverseWarn;
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (const cx of ends)
    for (const off of [-5, 5]) {
      const tip = cx + off + dir * 4;
      ctx.moveTo(tip - dir * 7, cy - 9);
      ctx.lineTo(tip, cy);
      ctx.lineTo(tip - dir * 7, cy + 9);
    }
  ctx.stroke();
  ctx.lineCap = "butt";
  ctx.lineJoin = "miter";
}
export function drawLilies(
  ctx: CanvasRenderingContext2D,
  lilies: number[],
  pal: RanariaPalette,
) {
  ctx.strokeStyle = pal.lily;
  ctx.lineWidth = 4;
  ctx.shadowColor = pal.lily;
  ctx.shadowBlur = pal.glow.lily;
  for (const col of lilies) {
    const cx = col * CELL + CELL / 2;
    ctx.beginPath();
    // Hard edges: a square of the same radius; LILY_CATCH is unchanged.
    if (pal.edges === "hard")
      ctx.rect(
        cx - LILY_RADIUS,
        CELL / 2 - LILY_RADIUS,
        LILY_RADIUS * 2,
        LILY_RADIUS * 2,
      );
    else ctx.arc(cx, CELL / 2, LILY_RADIUS, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.shadowBlur = 0;
}
export function drawFrog(
  ctx: CanvasRenderingContext2D,
  frog: Frog,
  color: string,
  eyes: boolean,
  pal: RanariaPalette,
) {
  // A quick squash-and-stretch while hopping (visual only).
  const s = 1 + 0.18 * (frog.hopAnim / HOP_ANIM);
  const size = FROG_SIZE * s;
  const cx = frog.x + CELL / 2;
  const cy = frog.row * CELL + CELL / 2;
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = pal.glow.frog;
  roundRect(ctx, cx - size / 2, cy - size / 2, size, size, size * 0.42, pal);
  ctx.fill();
  ctx.shadowBlur = 0;
  if (!eyes) return;
  // Round eyes, or squares of the same radius with hard edges.
  const dot = (x: number, y: number, r: number) => {
    ctx.beginPath();
    if (pal.edges === "hard") ctx.rect(x - r, y - r, r * 2, r * 2);
    else ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  };
  ctx.fillStyle = pal.frogEyes;
  for (const dx of [-8, 8]) dot(cx + dx * s, cy - 8 * s, 4.5 * s);
  ctx.fillStyle = pal.frogPupil;
  for (const dx of [-8, 8]) dot(cx + dx * s, cy - 9 * s, 2 * s);
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
