import {
  BASE_DROP_INTERVAL,
  BLOCK,
  BOARD_X,
  BOARD_Y,
  COLS,
  DROP_STEP,
  GAMEOVER_DELAY,
  GHOST_ALPHA,
  H,
  HARD_DROP_POINTS,
  KICKS,
  LINES_PER_LEVEL,
  LINE_SCORES,
  MIN_DROP_INTERVAL,
  NEXT_X,
  NEXT_Y,
  ROWS,
  SOFT_DROP_POINTS,
  W,
} from "@/lib/games/tetris/constants";
import {
  type Board,
  type Piece,
  clearFullRows,
  collide,
  createBoard,
  drawBlock,
  randomPiece,
  rotateCW,
} from "@/lib/games/tetris/entities";
import { SKINS, type TetrisPalette } from "@/lib/games/tetris/skins";
import { DEFAULT_SKIN, type SkinId } from "@/lib/games/skins";
export interface HudState {
  score: number;
  lines: number;
  level: number;
}
export interface TetrisEvents {
  onHud: (hud: HudState) => void; // only when a value changes, not every frame
  onGameOver: (score: number) => void; // GAMEOVER_DELAY after the new piece collides on spawn
}
export interface TetrisOptions {
  skin?: SkinId; // DEFAULT_SKIN when omitted
}
export interface TetrisGame {
  start: () => void;
  pause: () => void;
  resume: () => void;
  end: () => number;
  destroy: () => void;
  setSkin: (id: SkinId) => void; // swaps the palette; repaints if the loop is stopped
}
// dying: board frozen and dimmed for GAMEOVER_DELAY, no input.
type EngineState = "ready" | "playing" | "dying" | "gameover";
// Literal family name, as in app/globals.css (--pixel).
const LABEL_FONT = '10px "Press Start 2P", monospace';
export function createTetrisGame(
  canvas: HTMLCanvasElement,
  events: TetrisEvents,
  options: TetrisOptions = {},
): TetrisGame {
  const ctx = canvas.getContext("2d")!;
  // Logical 800×600; the backing store scales with the screen density.
  const dpr = window.devicePixelRatio || 1;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  // ── State ──
  let board: Board = createBoard();
  let current: Piece | null = null;
  let next: Piece | null = null;
  let score = 0;
  let lines = 0;
  let level = 1;
  let dropInterval = BASE_DROP_INTERVAL;
  let dropAccum = 0;
  let dyingTimer = 0; // ms left in the dying state
  let state: EngineState = "ready";
  let lastHud = "";
  let raf: number | null = null;
  let lastTime: number | null = null;
  let spaceHeld = false;
  let spaceLocked = false; // the Space press that started the game
  // Visual only: update(), collide() and scoring never read the palette.
  let palette: TetrisPalette = SKINS[options.skin ?? DEFAULT_SKIN];
  const emitHud = () => {
    const key = `${score}|${lines}|${level}`;
    if (key === lastHud) return;
    lastHud = key;
    events.onHud({ score, lines, level });
  };
  // ── Pieces ──
  function spawn() {
    current = next ?? randomPiece();
    next = randomPiece();
    // Game over when the new piece collides on spawn: freeze and dim the board.
    if (collide(board, current.shape, current.x, current.y)) {
      current = null;
      state = "dying";
      dyingTimer = GAMEOVER_DELAY * 1000;
    }
  }
  function merge(piece: Piece) {
    for (let r = 0; r < piece.shape.length; r++)
      for (let c = 0; c < piece.shape[r].length; c++)
        if (piece.shape[r][c])
          board[piece.y + r][piece.x + c] = piece.shape[r][c];
  }
  function lockPiece() {
    if (!current) return;
    merge(current);
    const cleared = clearFullRows(board);
    if (cleared) {
      // Scored with the level before the clear.
      score += LINE_SCORES[cleared] * level;
      lines += cleared;
      level = Math.floor(lines / LINES_PER_LEVEL) + 1;
      dropInterval = Math.max(
        MIN_DROP_INTERVAL,
        BASE_DROP_INTERVAL - (level - 1) * DROP_STEP,
      );
    }
    spawn();
  }
  function ghostY(piece: Piece) {
    let gy = piece.y;
    while (!collide(board, piece.shape, piece.x, gy + 1)) gy++;
    return gy;
  }
  function move(dx: number) {
    if (current && !collide(board, current.shape, current.x + dx, current.y))
      current.x += dx;
  }
  function tryRotate() {
    if (!current) return;
    const rotated = rotateCW(current.shape);
    for (const kick of KICKS) {
      if (!collide(board, rotated, current.x + kick, current.y)) {
        current.shape = rotated;
        current.x += kick;
        return;
      }
    }
  }
  function softDrop() {
    if (!current) return;
    if (!collide(board, current.shape, current.x, current.y + 1)) {
      current.y++;
      score += SOFT_DROP_POINTS;
    } else lockPiece();
  }
  function hardDrop() {
    if (!current) return;
    const gy = ghostY(current);
    score += (gy - current.y) * HARD_DROP_POINTS;
    current.y = gy;
    lockPiece();
  }
  // ── Input ──
  // Actions run on keydown (with the system's autorepeat), only while playing.
  // P and Escape belong to the player component.
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.code === "Space") spaceHeld = true;
    if (state !== "playing" || raf === null) return;
    switch (e.code) {
      case "ArrowLeft":
        move(-1);
        break;
      case "ArrowRight":
        move(1);
        break;
      case "ArrowDown":
        softDrop();
        break;
      case "ArrowUp":
      case "KeyX":
        tryRotate();
        break;
      case "Space":
        if (!spaceLocked) hardDrop();
        break;
    }
  };
  const onKeyUp = (e: KeyboardEvent) => {
    if (e.code !== "Space") return;
    spaceHeld = false;
    spaceLocked = false;
  };
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  // ── Update ──
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
    if (state !== "playing" || !current) return;
    dropAccum += dt;
    if (dropAccum >= dropInterval) {
      dropAccum = 0;
      if (!collide(board, current.shape, current.x, current.y + 1)) current.y++;
      else lockPiece();
    }
  }
  // ── Draw ──
  function drawWell() {
    const w = COLS * BLOCK;
    const h = ROWS * BLOCK;
    // Faint tint so the well reads as a lit tube, not a box on black.
    ctx.fillStyle = palette.wellFill;
    ctx.fillRect(BOARD_X, BOARD_Y, w, h);
    ctx.strokeStyle = palette.grid;
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    for (let c = 1; c < COLS; c++) {
      ctx.moveTo(BOARD_X + c * BLOCK, BOARD_Y);
      ctx.lineTo(BOARD_X + c * BLOCK, BOARD_Y + h);
    }
    for (let r = 1; r < ROWS; r++) {
      ctx.moveTo(BOARD_X, BOARD_Y + r * BLOCK);
      ctx.lineTo(BOARD_X + w, BOARD_Y + r * BLOCK);
    }
    ctx.stroke();
    // Neon edge without shadowBlur: a wide faint stroke under a thin bright one.
    ctx.strokeStyle = palette.well;
    ctx.globalAlpha = 0.25;
    ctx.lineWidth = 4;
    ctx.strokeRect(BOARD_X - 2, BOARD_Y - 2, w + 4, h + 4);
    ctx.globalAlpha = 1;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(BOARD_X - 2, BOARD_Y - 2, w + 4, h + 4);
  }
  function drawPiece(piece: Piece, y: number, alpha: number) {
    for (let r = 0; r < piece.shape.length; r++)
      for (let c = 0; c < piece.shape[r].length; c++)
        drawBlock(
          ctx,
          palette,
          BOARD_X + (piece.x + c) * BLOCK,
          BOARD_Y + (y + r) * BLOCK,
          piece.shape[r][c],
          alpha,
        );
  }
  function drawNext() {
    ctx.fillStyle = palette.label;
    ctx.font = LABEL_FONT;
    ctx.textAlign = "left";
    ctx.textBaseline = "bottom";
    ctx.fillText("SIGUIENTE", NEXT_X, NEXT_Y - 12);
    // Corner brackets instead of a closed box, so it doesn't compete with the well.
    const box = 4 * BLOCK;
    const arm = 12;
    ctx.strokeStyle = palette.well;
    ctx.globalAlpha = 0.6;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (const [cx, cy, sx, sy] of [
      [NEXT_X, NEXT_Y, 1, 1],
      [NEXT_X + box, NEXT_Y, -1, 1],
      [NEXT_X, NEXT_Y + box, 1, -1],
      [NEXT_X + box, NEXT_Y + box, -1, -1],
    ]) {
      ctx.moveTo(cx + sx * arm, cy);
      ctx.lineTo(cx, cy);
      ctx.lineTo(cx, cy + sy * arm);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
    if (!next) return;
    const shape = next.shape;
    const offX = NEXT_X + (box - shape[0].length * BLOCK) / 2;
    const offY = NEXT_Y + (box - shape.length * BLOCK) / 2;
    for (let r = 0; r < shape.length; r++)
      for (let c = 0; c < shape[r].length; c++)
        drawBlock(
          ctx,
          palette,
          offX + c * BLOCK,
          offY + r * BLOCK,
          shape[r][c],
        );
  }
  function draw() {
    ctx.fillStyle = palette.bg;
    ctx.fillRect(0, 0, W, H);
    drawWell();
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++)
        drawBlock(
          ctx,
          palette,
          BOARD_X + c * BLOCK,
          BOARD_Y + r * BLOCK,
          board[r][c],
        );
    if (current) {
      drawPiece(current, ghostY(current), GHOST_ALPHA);
      // Glow only on the active piece.
      ctx.shadowColor = palette.pieces[current.type] ?? "transparent";
      ctx.shadowBlur = palette.glow;
      drawPiece(current, current.y, 1);
      ctx.shadowBlur = 0;
    }
    drawNext();
    if (state === "dying" || state === "gameover") {
      ctx.fillStyle = palette.dim;
      ctx.fillRect(0, 0, W, H);
    }
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
  // Empty well behind the "PULSA ESPACIO" overlay; redrawn once the pixel font loads.
  let destroyed = false;
  draw();
  document.fonts?.ready.then(() => {
    if (!destroyed && raf === null) draw();
  });
  return {
    start() {
      stopLoop();
      board = createBoard();
      score = 0;
      lines = 0;
      level = 1;
      dropInterval = BASE_DROP_INTERVAL;
      dropAccum = 0;
      next = null;
      spawn();
      // Ignore the Space press that started the game until it is released.
      spaceLocked = spaceHeld;
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
      destroyed = true;
      stopLoop();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    },
  };
}
