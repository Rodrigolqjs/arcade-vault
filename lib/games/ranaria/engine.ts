import {
  CELL,
  COLORS,
  DEATH_BLINK,
  DEATH_DELAY,
  GAMEOVER_DELAY,
  H,
  HOP_ANIM,
  LILY_POINTS,
  ROW_GOAL,
  ROW_POINTS,
  ROW_START,
  START_LIVES,
  STRETCH_TIME,
  TIME_BONUS,
  W,
} from "@/lib/games/ranaria/constants";
import {
  type Frog,
  type Hop,
  type Lane,
  catchesLily,
  drawBands,
  drawFrog,
  drawLane,
  drawLilies,
  frogInCanvas,
  generateStretch,
  hitsVehicle,
  isRiver,
  isRoad,
  logUnder,
  moveLane,
  startFrog,
} from "@/lib/games/ranaria/entities";
export interface HudState {
  score: number;
  lives: number; // 3 al empezar, 0 al perder la última
  level: number; // tramo actual, desde 1
  time: number; // segundos enteros restantes del reloj (ceil), 30…0
}
export interface RanariaEvents {
  onHud: (hud: HudState) => void; // solo cuando cambia algún valor, no cada frame
  onGameOver: (score: number) => void; // GAMEOVER_DELAY después de perder la última vida
}
export interface RanariaGame {
  start: () => void;
  pause: () => void;
  resume: () => void;
  end: () => number;
  destroy: () => void;
  press: (code: string) => void; // touch controls: same path as keydown for that KeyboardEvent.code
  release: (code: string) => void; // touch controls: same path as keyup
}
// dying: campo congelado y rana parpadeando durante GAMEOVER_DELAY, sin input.
type EngineState = "ready" | "playing" | "dying" | "gameover";
const KEY_HOPS: Record<string, Hop> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  KeyW: "up",
  KeyS: "down",
  KeyA: "left",
  KeyD: "right",
};
export function createRanariaGame(
  canvas: HTMLCanvasElement,
  events: RanariaEvents,
): RanariaGame {
  const ctx = canvas.getContext("2d")!;
  // Logical 800×600; the backing store scales with the screen density.
  const dpr = window.devicePixelRatio || 1;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  // ── State ──
  let stretch = generateStretch(1);
  let lanes: Lane[] = stretch.lanes;
  let lilies: number[] = stretch.lilies;
  let fresh = true; // the stretch shown in ready is the one played first
  let frog: Frog = startFrog();
  let tramo = 1;
  let score = 0;
  let lives = START_LIVES;
  let clock = STRETCH_TIME;
  let bestRow = ROW_START;
  let pendingHop: Hop | null = null;
  let respawnTimer = 0;
  let dyingTimer = 0;
  let deathX = 0;
  let deathRow = ROW_START;
  let t = 0; // s of the current stretch, drives the sinking logs
  let time = 0; // s of play, drives the blinks
  let state: EngineState = "ready";
  let lastHud = "";
  let raf: number | null = null;
  let lastTime: number | null = null;
  const hudTime = () => Math.max(0, Math.ceil(clock));
  const emitHud = () => {
    const key = `${score}|${lives}|${tramo}|${hudTime()}`;
    if (key === lastHud) return;
    lastHud = key;
    events.onHud({ score, lives, level: tramo, time: hudTime() });
  };
  // ── Input ──
  // One hop per frame (the last press wins), never from autorepeat. P, Escape
  // and Space belong to the player component.
  // Keyboard and touch controls share this, keyed by KeyboardEvent.code.
  const keyDown = (code: string, repeat: boolean) => {
    if (state !== "playing" || raf === null || respawnTimer > 0 || repeat)
      return;
    const hop = KEY_HOPS[code];
    if (hop) pendingHop = hop;
  };
  const onKeyDown = (e: KeyboardEvent) => keyDown(e.code, e.repeat);
  window.addEventListener("keydown", onKeyDown);
  // ── Update ──
  function resetFrog() {
    frog = startFrog();
    clock = STRETCH_TIME;
    pendingHop = null;
  }
  function loadStretch(next: number) {
    stretch = generateStretch(next);
    lanes = stretch.lanes;
    lilies = stretch.lilies;
    t = 0;
  }
  function die() {
    deathX = frog.x;
    deathRow = frog.row;
    lives--;
    pendingHop = null;
    if (lives > 0) {
      respawnTimer = DEATH_DELAY;
      return;
    }
    // Last life: freeze the field and blink for GAMEOVER_DELAY.
    lives = 0;
    state = "dying";
    dyingTimer = GAMEOVER_DELAY;
  }
  function completeStretch() {
    score += LILY_POINTS * tramo + TIME_BONUS * tramo * Math.floor(clock);
    tramo++;
    loadStretch(tramo);
    resetFrog();
    bestRow = ROW_START;
  }
  function applyHop(hop: Hop) {
    let { x, row } = frog;
    if (hop === "up") row = Math.max(ROW_GOAL, row - 1);
    else if (hop === "down") row = Math.min(ROW_START, row + 1);
    else if (hop === "left") x -= CELL;
    else x += CELL;
    x = Math.min(W - CELL, Math.max(0, x));
    // Off the river the frog snaps back to the grid.
    if (!isRiver(row)) x = Math.round(x / CELL) * CELL;
    if (x === frog.x && row === frog.row) return;
    frog = { x, row, hopAnim: HOP_ANIM };
    // Points only for rows 10…1 reached for the first time in this stretch.
    if (row < bestRow && row > ROW_GOAL) {
      score += ROW_POINTS * tramo;
      bestRow = row;
    }
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
    t += dt;
    for (const lane of lanes) moveLane(lane, dt);
    frog.hopAnim = Math.max(0, frog.hopAnim - dt);
    // Respawn: the traffic keeps moving, the clock and the input wait.
    if (respawnTimer > 0) {
      respawnTimer -= dt;
      if (respawnTimer <= 0) {
        respawnTimer = 0;
        resetFrog();
      }
      return;
    }
    if (pendingHop) {
      applyHop(pendingHop);
      pendingHop = null;
      if (frog.row === ROW_GOAL) {
        if (catchesLily(lilies, frog.x)) completeStretch();
        else die();
        return;
      }
    }
    const lane = lanes.find((l) => l.row === frog.row);
    if (lane && isRiver(frog.row)) frog.x += lane.speed * dt;
    clock -= dt;
    if (lane && isRoad(frog.row) && hitsVehicle(lane, frog.x)) die();
    else if (lane && isRiver(frog.row) && !frogInCanvas(frog)) die();
    else if (lane && isRiver(frog.row) && !logUnder(lane, frog.x, t)) die();
    else if (clock <= 0) {
      clock = 0;
      die();
    }
  }
  // ── Draw ──
  function draw() {
    drawBands(ctx);
    drawLilies(ctx, lilies);
    for (const lane of lanes) drawLane(ctx, lane, t);
    // Dead frog: blinks magenta where it died.
    if (respawnTimer > 0 || state === "dying" || state === "gameover") {
      if (Math.floor(time / DEATH_BLINK) % 2 === 0)
        drawFrog(
          ctx,
          { x: deathX, row: deathRow, hopAnim: 0 },
          COLORS.dead,
          false,
        );
      return;
    }
    drawFrog(ctx, frog, COLORS.frog, true);
  }
  // ── Loop ──
  function loop(ts: number) {
    // dt in s, capped at 50 ms to avoid a jump after a stall.
    const dt = lastTime === null ? 0 : Math.min(ts - lastTime, 50) / 1000;
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
  // First frame: stretch 1, still, with the frog at the start.
  draw();
  return {
    start() {
      stopLoop();
      if (!fresh) loadStretch(1);
      fresh = false;
      t = 0;
      time = 0;
      tramo = 1;
      score = 0;
      lives = START_LIVES;
      bestRow = ROW_START;
      respawnTimer = 0;
      dyingTimer = 0;
      resetFrog();
      state = "playing";
      emitHud();
      startLoop();
    },
    pause() {
      stopLoop();
    },
    resume() {
      // Also resumes a pause during respawn or dying, so onGameOver still fires.
      if (state !== "playing" && state !== "dying") return;
      startLoop();
    },
    end() {
      stopLoop();
      state = "gameover";
      return score;
    },
    press: (code) => keyDown(code, false),
    release: () => {}, // hops have no keyup logic
    destroy() {
      stopLoop();
      window.removeEventListener("keydown", onKeyDown);
    },
  };
}
