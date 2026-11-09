import {
  BALL_SIZE,
  BASE_BALL_VX,
  BASE_BALL_VY,
  BLOCK_H,
  BLOCK_W,
  BLOCKS_ORIGIN_X,
  BLOCKS_ORIGIN_Y,
  EXPLOSION_DURATION,
  EXPLOSION_SCALE,
  PADDLE_H,
  PADDLE_SPEED,
  PADDLE_W,
  PADDLE_Y,
  W,
} from "@/lib/games/arkanoid/constants";
import type { BlockColor, LevelBlock } from "@/lib/games/arkanoid/levels";
import type { ArkanoidPalette } from "@/lib/games/arkanoid/skins";
export type Keys = { ArrowLeft: boolean; ArrowRight: boolean };
interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}
const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));
// A neon tube without shadowBlur: a faint tinted fill, a crisp outline in the
// full color and a thin lit edge on top. Blocks and explosions share it.
function drawTube(
  ctx: CanvasRenderingContext2D,
  palette: ArkanoidPalette,
  color: string,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const alpha = ctx.globalAlpha;
  ctx.fillStyle = color;
  ctx.globalAlpha = alpha * palette.tubeFill;
  ctx.fillRect(x, y, w, h);
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x + 0.75, y + 0.75, w - 1.5, h - 1.5);
  if (!palette.bevel) return;
  ctx.fillStyle = palette.bevel;
  ctx.fillRect(x + 3, y + 3, w - 6, 1);
}
export class Paddle implements Rect {
  x = (W - PADDLE_W) / 2;
  y = PADDLE_Y;
  w = PADDLE_W;
  h = PADDLE_H;
  center() {
    this.x = (W - this.w) / 2;
  }
  // Mouse input: centers the paddle on a logical x coordinate.
  moveTo(centerX: number) {
    this.x = clamp(centerX - this.w / 2, 0, W - this.w);
  }
  update(dt: number, keys: Keys) {
    if (keys.ArrowLeft) this.x = Math.max(0, this.x - PADDLE_SPEED * dt);
    if (keys.ArrowRight)
      this.x = Math.min(W - this.w, this.x + PADDLE_SPEED * dt);
  }
  // A lit capsule: glow around it and a paler core line, like a neon tube.
  draw(ctx: CanvasRenderingContext2D, palette: ArkanoidPalette) {
    const r = this.h / 2;
    ctx.save();
    ctx.fillStyle = palette.paddle;
    ctx.shadowColor = palette.paddle;
    ctx.shadowBlur = palette.glow.paddle;
    ctx.beginPath();
    if (palette.edges === "hard") ctx.rect(this.x, this.y, this.w, this.h);
    else ctx.roundRect(this.x, this.y, this.w, this.h, r);
    ctx.fill();
    ctx.shadowBlur = 0;
    if (palette.paddleCore) {
      ctx.fillStyle = palette.paddleCore;
      ctx.fillRect(this.x + r, this.y + r - 1, this.w - this.h, 2);
    }
    ctx.restore();
  }
}
export class Ball implements Rect {
  x = 0;
  y = 0;
  w = BALL_SIZE;
  h = BALL_SIZE;
  vx = BASE_BALL_VX;
  vy = BASE_BALL_VY;
  // Places the ball on top of the paddle's center and sends it up at the level speed.
  launch(paddle: Paddle, speed: number) {
    this.x = paddle.x + (paddle.w - this.w) / 2;
    this.y = paddle.y - this.h;
    this.vx = BASE_BALL_VX * speed;
    this.vy = BASE_BALL_VY * speed;
  }
  // Moves and bounces off the left, right and top walls; the bottom is open.
  update(dt: number) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (this.x <= 0) {
      this.x = 0;
      this.vx = Math.abs(this.vx);
    }
    if (this.x + this.w >= W) {
      this.x = W - this.w;
      this.vx = -Math.abs(this.vx);
    }
    if (this.y <= 0) {
      this.y = 0;
      this.vy = Math.abs(this.vy);
    }
  }
  draw(ctx: CanvasRenderingContext2D, palette: ArkanoidPalette) {
    const r = this.w / 2;
    ctx.save();
    ctx.fillStyle = palette.ball;
    ctx.shadowColor = palette.ball;
    ctx.shadowBlur = palette.glow.ball;
    ctx.beginPath();
    // Square ball in hard edges: same BALL_SIZE box the AABB collision already uses.
    if (palette.edges === "hard") ctx.rect(this.x, this.y, this.w, this.h);
    else ctx.arc(this.x + r, this.y + r, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
export class Block implements Rect {
  x: number;
  y: number;
  w = BLOCK_W;
  h = BLOCK_H;
  color: BlockColor;
  alive = true;
  constructor({ col, row, color }: LevelBlock) {
    this.x = BLOCKS_ORIGIN_X + col * BLOCK_W;
    this.y = BLOCKS_ORIGIN_Y + row * BLOCK_H;
    this.color = color;
  }
  // No glow: 60 blocks with shadowBlur would cost frames.
  draw(ctx: CanvasRenderingContext2D, palette: ArkanoidPalette) {
    drawTube(
      ctx,
      palette,
      palette.blocks[this.color],
      this.x + 2,
      this.y + 2,
      this.w - 4,
      this.h - 4,
    );
  }
}
export class Explosion {
  x: number;
  y: number;
  w: number;
  h: number;
  color: BlockColor;
  elapsed = 0; // ms
  dead = false;
  constructor(block: Block) {
    this.x = block.x;
    this.y = block.y;
    this.w = block.w;
    this.h = block.h;
    this.color = block.color;
  }
  update(dt: number) {
    this.elapsed += dt * 1000;
    if (this.elapsed >= EXPLOSION_DURATION) this.dead = true;
  }
  // Grows from ×1 to ×EXPLOSION_SCALE around its center while fading out, linearly.
  draw(ctx: CanvasRenderingContext2D, palette: ArkanoidPalette) {
    const t = Math.min(1, this.elapsed / EXPLOSION_DURATION);
    const scale = 1 + (EXPLOSION_SCALE - 1) * t;
    const w = this.w * scale;
    const h = this.h * scale;
    ctx.save();
    ctx.globalAlpha = 1 - t;
    drawTube(
      ctx,
      palette,
      palette.blocks[this.color],
      this.x + (this.w - w) / 2 + 2,
      this.y + (this.h - h) / 2 + 2,
      w - 4,
      h - 4,
    );
    ctx.restore();
  }
}
export function collideAABB(ball: Ball, block: Block) {
  return (
    ball.x < block.x + block.w &&
    ball.x + ball.w > block.x &&
    ball.y < block.y + block.h &&
    ball.y + ball.h > block.y
  );
}
