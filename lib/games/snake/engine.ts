import {
  BASE_TICK,
  CELL,
  COLS,
  CORE_POINTS,
  CORES_PER_LEVEL,
  GAMEOVER_DELAY,
  H,
  MAX_QUEUED_TURNS,
  MIN_TICK,
  ROWS,
  START_DIR,
  TICK_STEP,
  W,
} from "@/lib/games/snake/constants";
import {
  type Cell,
  type Dir,
  createSnake,
  drawCell,
  hitsBody,
  hitsWall,
  isOpposite,
  randomFreeCell,
  step,
} from "@/lib/games/snake/entities";
import { SKINS, type SnakePalette } from "@/lib/games/snake/skins";
import { DEFAULT_SKIN, type SkinId } from "@/lib/games/skins";
export interface HudState {
  score: number;
  lives: number; // 1 while playing, 0 once dead
  level: number;
}
export interface SnakeEvents {
  onHud: (hud: HudState) => void; // only when a value changes, not every frame
  onGameOver: (score: number) => void; // GAMEOVER_DELAY after a crash or a full board
}
export interface SnakeOptions {
  skin?: SkinId; // DEFAULT_SKIN when omitted
}
export interface SnakeGame {
  start: () => void;
  pause: () => void;
  resume: () => void;
  end: () => number;
  destroy: () => void;
  setSkin: (id: SkinId) => void; // swaps the palette; repaints if the loop is stopped
}
// dying: snake frozen and blinking for GAMEOVER_DELAY, no input.
type EngineState = "ready" | "playing" | "dying" | "gameover";
const BODY_INSET = 3; // px each side, so the trail reads as a tube
const KEY_DIRS: Record<string, Dir> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  KeyW: "up",
  KeyS: "down",
  KeyA: "left",
  KeyD: "right",
};
export function createSnakeGame(
  canvas: HTMLCanvasElement,
  events: SnakeEvents,
  options: SnakeOptions = {},
): SnakeGame {
  const ctx = canvas.getContext("2d")!;
  // Logical 800×600; the backing store scales with the screen density.
  const dpr = window.devicePixelRatio || 1;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  // ── State ──
  let snake: Cell[] = createSnake(); // head first
  // Visual only: tick(), collisions and scoring never read the palette.
  let palette: SnakePalette = SKINS[options.skin ?? DEFAULT_SKIN];
  let dir: Dir = START_DIR;
  let queue: Dir[] = [];
  let core: Cell | null = null;
  let score = 0;
  let lives = 1;
  let level = 1;
  let eaten = 0;
  let tickInterval = BASE_TICK;
  let tickAccum = 0;
  let time = 0; // ms of play, drives the core's pulse
  let dyingTimer = 0; // ms left in the dying state
  let state: EngineState = "ready";
  let lastHud = "";
  let raf: number | null = null;
  let lastTime: number | null = null;
  const emitHud = () => {
    const key = `${score}|${lives}|${level}`;
    if (key === lastHud) return;
    lastHud = key;
    events.onHud({ score, lives, level });
  };
  // ── Input ──
  // Turns are queued (max 2) and validated against the last queued turn, so two
  // quick presses inside one tick can't reverse the snake. P, Escape and Space
  // belong to the player component.
  const onKeyDown = (e: KeyboardEvent) => {
    if (state !== "playing" || raf === null || e.repeat) return;
    const next = KEY_DIRS[e.code];
    if (!next || queue.length >= MAX_QUEUED_TURNS) return;
    const last = queue[queue.length - 1] ?? dir;
    if (next === last || isOpposite(next, last)) return;
    queue.push(next);
  };
  window.addEventListener("keydown", onKeyDown);
  // ── Update ──
  // Crash or full board: freeze the snake and blink it for GAMEOVER_DELAY.
  function die() {
    state = "dying";
    lives = 0;
    queue = [];
    dyingTimer = GAMEOVER_DELAY * 1000;
  }
  function eat() {
    // Scored with the level before eating.
    score += CORE_POINTS * level;
    eaten++;
    level = Math.floor(eaten / CORES_PER_LEVEL) + 1;
    tickInterval = Math.max(MIN_TICK, BASE_TICK - (level - 1) * TICK_STEP);
    core = randomFreeCell(snake);
    if (!core) die();
  }
  function tick() {
    dir = queue.shift() ?? dir;
    const head = step(snake[0], dir);
    const growing = core !== null && head.x === core.x && head.y === core.y;
    if (hitsWall(head) || hitsBody(snake, head, growing)) {
      die();
      return;
    }
    snake.unshift(head);
    // Growing: the tail stays put this tick.
    if (growing) eat();
    else snake.pop();
  }
  function update(dt: number) {
    time += dt;
    if (state === "dying") {
      dyingTimer -= dt;
      if (dyingTimer <= 0) {
        stopLoop();
        state = "gameover";
        events.onGameOver(score);
      }
      return;
    }
    if (state !== "playing") return;
    tickAccum += dt;
    // dt ≤ 50 ms < MIN_TICK, so at most one tick per frame.
    if (tickAccum >= tickInterval) {
      tickAccum -= tickInterval;
      tick();
    }
  }
  // ── Draw ──
  function drawGrid() {
    // Dots at the intersections: a node matrix the snake travels, not graph paper.
    ctx.fillStyle = palette.grid;
    for (let c = 1; c < COLS; c++)
      for (let r = 1; r < ROWS; r++)
        ctx.fillRect(c * CELL - 1, r * CELL - 1, 2, 2);
    // Neon edge without shadowBlur: a wide faint stroke under a thin bright one.
    ctx.strokeStyle = palette.border;
    ctx.globalAlpha = 0.25;
    ctx.lineWidth = 6;
    ctx.strokeRect(0, 0, W, H);
    ctx.globalAlpha = 1;
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, W - 2, H - 2);
  }
  function drawCore() {
    if (!core) return;
    // Soft pulse: radius breathes between ~6 and ~8 px.
    const pulse = 0.5 + 0.5 * Math.sin(time / 180);
    const r = CELL / 2 - 3 + pulse * 2;
    const cx = core.x * CELL + CELL / 2;
    const cy = core.y * CELL + CELL / 2;
    ctx.fillStyle = palette.core;
    ctx.shadowColor = palette.core;
    ctx.shadowBlur = palette.glow.core + pulse * palette.glow.pulse;
    ctx.beginPath();
    if (palette.coreShape === "diamond") {
      // Hard-edged rhombus with the same breathing size.
      ctx.moveTo(cx, cy - r);
      ctx.lineTo(cx + r, cy);
      ctx.lineTo(cx, cy + r);
      ctx.lineTo(cx - r, cy);
      ctx.closePath();
    } else ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }
  function drawSnake() {
    // While dying the whole snake blinks magenta every 100 ms.
    const blink = state === "dying" && Math.floor(time / 100) % 2 === 0;
    const body = blink ? palette.core : palette.snake;
    // A continuous light trail: each segment is drawn once, plus a bridge over
    // the gap to the segment ahead, fading from the head to the tail. No glow.
    ctx.fillStyle = body;
    const last = snake.length - 1;
    const inner = CELL - BODY_INSET * 2;
    for (let i = last; i > 0; i--) {
      const a = snake[i];
      const b = snake[i - 1];
      ctx.globalAlpha = 1 - palette.trailFade * (i / last);
      ctx.fillRect(
        a.x * CELL + BODY_INSET,
        a.y * CELL + BODY_INSET,
        inner,
        inner,
      );
      if (a.y === b.y)
        ctx.fillRect(
          Math.max(a.x, b.x) * CELL - BODY_INSET,
          a.y * CELL + BODY_INSET,
          BODY_INSET * 2,
          inner,
        );
      else
        ctx.fillRect(
          a.x * CELL + BODY_INSET,
          Math.max(a.y, b.y) * CELL - BODY_INSET,
          inner,
          BODY_INSET * 2,
        );
    }
    ctx.globalAlpha = 1;
    ctx.shadowColor = body;
    ctx.shadowBlur = palette.glow.head;
    drawCell(ctx, snake[0], blink ? palette.core : palette.head, 1);
    ctx.shadowBlur = 0;
  }
  function draw() {
    ctx.fillStyle = palette.bg;
    ctx.fillRect(0, 0, W, H);
    drawGrid();
    drawCore();
    // Empty grid behind the "PULSA ESPACIO" overlay; the snake appears on start.
    if (state !== "ready") drawSnake();
  }
  // ── Loop ──
  function loop(ts: number) {
    // dt in ms, capped at 50 to avoid a jump after a stall.
    const dt = lastTime === null ? 0 : Math.min(ts - lastTime, 50);
    lastTime = ts;
    raf = requestAnimationFrame(loop);
    update(dt);
    draw();
    emitHud();
  }
  function startLoop() {
    if (raf !== null) return;
    lastTime = null;
    raf = requestAnimationFrame(loop);
  }
  function stopLoop() {
    if (raf !== null) cancelAnimationFrame(raf);
    raf = null;
  }
  // First frame: the empty grid.
  draw();
  return {
    start() {
      stopLoop();
      snake = createSnake();
      dir = START_DIR;
      queue = [];
      core = randomFreeCell(snake);
      score = 0;
      lives = 1;
      level = 1;
      eaten = 0;
      tickInterval = BASE_TICK;
      tickAccum = 0;
      time = 0;
      state = "playing";
      emitHud();
      startLoop();
    },
    pause() {
      stopLoop();
    },
    resume() {
      // Also resumes a pause during dying, so onGameOver still fires.
      if (state !== "playing" && state !== "dying") return;
      startLoop();
    },
    end() {
      stopLoop();
      state = "gameover";
      return score;
    },
    setSkin(id) {
      palette = SKINS[id];
      // Frozen frame (ready, paused, game over): show the new skin right away.
      if (raf === null) draw();
    },
    destroy() {
      stopLoop();
      window.removeEventListener("keydown", onKeyDown);
    },
  };
}
