import {
  BLOCK_POINTS,
  GAMEOVER_DELAY,
  H,
  PADDLE_CATCH,
  START_LIVES,
  W,
} from "@/lib/games/arkanoid/constants";
import {
  Ball,
  Block,
  Explosion,
  type Keys,
  Paddle,
  collideAABB,
} from "@/lib/games/arkanoid/entities";
import { LEVELS } from "@/lib/games/arkanoid/levels";
import { type ArkanoidPalette, SKINS } from "@/lib/games/arkanoid/skins";
import { DEFAULT_SKIN, type SkinId } from "@/lib/games/skins";
export interface HudState {
  score: number;
  lives: number;
  level: number;
}
export interface ArkanoidEvents {
  onHud: (hud: HudState) => void; // only when a value changes, not every frame
  onGameOver: (score: number) => void; // GAMEOVER_DELAY after the last life or clearing level 5
}
export interface ArkanoidOptions {
  skin?: SkinId; // DEFAULT_SKIN when omitted
}
export interface ArkanoidGame {
  start: () => void; // score 0, 3 lives, level 1, centered paddle, ball launched; clears held keys
  pause: () => void; // stops the rAF
  resume: () => void; // resumes without a dt jump
  end: () => number; // stops the game (FIN button) and returns the score
  destroy: () => void; // cancels the rAF and removes the listeners
  setSkin: (id: SkinId) => void; // swaps the palette; repaints if the loop is stopped
}
// dying: board frozen and dimmed for GAMEOVER_DELAY, no input. Entered after
// losing the last life or clearing level 5.
type EngineState = "ready" | "playing" | "dying" | "gameover";
export function createArkanoidGame(
  canvas: HTMLCanvasElement,
  events: ArkanoidEvents,
  options: ArkanoidOptions = {},
): ArkanoidGame {
  const ctx = canvas.getContext("2d")!;
  // Logical 800×600; the backing store scales with the screen density.
  const dpr = window.devicePixelRatio || 1;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  // ── State ──
  const paddle = new Paddle();
  const ball = new Ball();
  const keys: Keys = { ArrowLeft: false, ArrowRight: false };
  let blocks: Block[] = [];
  let explosions: Explosion[] = [];
  let score = 0;
  let lives = START_LIVES;
  let level = 1;
  let state: EngineState = "ready";
  let dyingTimer = 0; // s left in the dying state
  let lastHud = "";
  let raf: number | null = null;
  let lastTime: number | null = null;
  // Visual only: update(), collisions and scoring never read the palette.
  let palette: ArkanoidPalette = SKINS[options.skin ?? DEFAULT_SKIN];
  const emitHud = () => {
    const key = `${score}|${lives}|${level}`;
    if (key === lastHud) return;
    lastHud = key;
    events.onHud({ score, lives, level });
  };
  // Blocks and explosions of level n; the paddle stays where it is.
  function loadLevel(n: number) {
    level = n;
    blocks = LEVELS[n - 1].blocks.map((b) => new Block(b));
    explosions = [];
    ball.launch(paddle, LEVELS[n - 1].speed);
  }
  const active = () => state === "playing" && raf !== null;
  // ── Input ──
  // Arrows and the mouse only act while playing with the loop running. P,
  // Escape and Space belong to the player component.
  const onKeyDown = (e: KeyboardEvent) => {
    if (!active()) return;
    if (e.code === "ArrowLeft" || e.code === "ArrowRight") keys[e.code] = true;
  };
  // Releasing always clears, so a key let go during a pause can't stay held.
  const onKeyUp = (e: KeyboardEvent) => {
    if (e.code === "ArrowLeft" || e.code === "ArrowRight") keys[e.code] = false;
  };
  const onMouseMove = (e: MouseEvent) => {
    if (!active()) return;
    const rect = canvas.getBoundingClientRect();
    paddle.moveTo((e.clientX - rect.left) * (W / rect.width));
  };
  const clearKeys = () => {
    keys.ArrowLeft = false;
    keys.ArrowRight = false;
  };
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  canvas.addEventListener("mousemove", onMouseMove);
  // ── Update ──
  // Bounces only while falling with its bottom edge between the paddle's top
  // and PADDLE_CATCH px below it. vx is kept, as in the original.
  function bouncePaddle() {
    if (
      ball.vy > 0 &&
      ball.x + ball.w > paddle.x &&
      ball.x < paddle.x + paddle.w &&
      ball.y + ball.h >= paddle.y &&
      ball.y + ball.h <= paddle.y + paddle.h + PADDLE_CATCH
    ) {
      ball.y = paddle.y - ball.h;
      ball.vy = -Math.abs(ball.vy);
    }
  }
  // Last life lost or level 5 cleared: freeze and dim the board for GAMEOVER_DELAY.
  function die() {
    state = "dying";
    clearKeys();
    dyingTimer = GAMEOVER_DELAY;
  }
  // At most one block per frame, as in the original.
  function hitBlocks() {
    for (const block of blocks) {
      if (!block.alive || !collideAABB(ball, block)) continue;
      block.alive = false;
      explosions.push(new Explosion(block));
      score += BLOCK_POINTS;
      ball.vy = -ball.vy;
      if (blocks.every((b) => !b.alive)) {
        if (level < LEVELS.length) loadLevel(level + 1);
        else die();
      }
      return;
    }
  }
  function update(dt: number) {
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
    paddle.update(dt, keys);
    ball.update(dt);
    bouncePaddle();
    hitBlocks();
    if (state !== "playing") return; // level 5 cleared this frame
    for (const exp of explosions) exp.update(dt);
    explosions = explosions.filter((exp) => !exp.dead);
    // Lost ball: one life less, relaunched at once from the paddle's center.
    if (ball.y > H) {
      lives--;
      if (lives <= 0) {
        lives = 0;
        die();
      } else ball.launch(paddle, LEVELS[level - 1].speed);
    }
  }
  // ── Draw ──
  function draw() {
    ctx.fillStyle = palette.bg;
    ctx.fillRect(0, 0, W, H);
    for (const block of blocks) if (block.alive) block.draw(ctx, palette);
    for (const exp of explosions) exp.draw(ctx, palette);
    paddle.draw(ctx, palette);
    ball.draw(ctx, palette);
    if (state === "dying" || state === "gameover") {
      ctx.fillStyle = palette.dim;
      ctx.fillRect(0, 0, W, H);
    }
  }
  // ── Loop ──
  function loop(ts: number) {
    // dt in seconds, capped at 50 ms to avoid a jump after a stall.
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
  // Ready: level 1 with the paddle centered and the ball on top, all still.
  loadLevel(1);
  draw();
  return {
    start() {
      stopLoop();
      clearKeys();
      score = 0;
      lives = START_LIVES;
      paddle.center();
      loadLevel(1);
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
      window.removeEventListener("keyup", onKeyUp);
      canvas.removeEventListener("mousemove", onMouseMove);
    },
  };
}
