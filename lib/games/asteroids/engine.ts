import {
  GAMEOVER_DELAY,
  H,
  POINTS,
  POWERUP_DROP_CHANCE,
  POWERUP_DURATION,
  W,
} from "@/lib/games/asteroids/constants";
import {
  Asteroid,
  Bullet,
  type Keys,
  Particle,
  PowerUp,
  Ship,
  dist,
  rand,
} from "@/lib/games/asteroids/entities";
import { type AsteroidsPalette, SKINS } from "@/lib/games/asteroids/skins";
import { DEFAULT_SKIN, type SkinId } from "@/lib/games/skins";
export interface HudState {
  score: number;
  lives: number;
  level: number;
}
export interface AsteroidsEvents {
  onHud: (hud: HudState) => void; // only when a value changes, not every frame
  onGameOver: (score: number) => void; // GAMEOVER_DELAY after losing the last life
}
export interface AsteroidsOptions {
  skin?: SkinId; // DEFAULT_SKIN when omitted
}
export interface AsteroidsGame {
  start: () => void;
  pause: () => void;
  resume: () => void;
  end: () => number;
  destroy: () => void;
  setSkin: (id: SkinId) => void; // swaps the palette; repaints if the loop is stopped
}
type EngineState = "ready" | "playing" | "dead" | "gameover";
export function createAsteroidsGame(
  canvas: HTMLCanvasElement,
  events: AsteroidsEvents,
  options: AsteroidsOptions = {},
): AsteroidsGame {
  const ctx = canvas.getContext("2d")!;
  // Logical 800×600; the backing store scales with the screen density.
  const dpr = window.devicePixelRatio || 1;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  // ── Input ──
  const keys: Keys = {};
  const justPressed: Keys = {};
  const onKeyDown = (e: KeyboardEvent) => {
    if (!keys[e.code]) justPressed[e.code] = true;
    keys[e.code] = true;
  };
  const onKeyUp = (e: KeyboardEvent) => {
    keys[e.code] = false;
  };
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  const pressed = (code: string) => {
    const val = justPressed[code];
    justPressed[code] = false;
    return val;
  };
  const clearKeys = () => {
    for (const k in keys) keys[k] = false;
    for (const k in justPressed) justPressed[k] = false;
  };
  // ── State ──
  let ship = new Ship();
  let bullets: Bullet[] = [];
  let asteroids: Asteroid[] = [];
  let particles: Particle[] = [];
  let powerUps: PowerUp[] = [];
  let score = 0;
  let lives = 3;
  let level = 1;
  let state: EngineState = "ready";
  let deadTimer = 0;
  let gameOverTimer = 0;
  let powerUpSpawned = false;
  let killsSinceSpawn = 0;
  let finished = false; // onGameOver fired or end() called
  let lastHud = "";
  let raf: number | null = null;
  let lastTime: number | null = null;
  // Visual only: update() and collisions never read the palette.
  let palette: AsteroidsPalette = SKINS[options.skin ?? DEFAULT_SKIN];
  const emitHud = () => {
    const key = `${score}|${lives}|${level}`;
    if (key === lastHud) return;
    lastHud = key;
    events.onHud({ score, lives, level });
  };
  function spawnAsteroids(count: number) {
    const SAFE_DIST = 130;
    for (let i = 0; i < count; i++) {
      let x, y;
      do {
        x = rand(0, W);
        y = rand(0, H);
      } while (Math.hypot(x - W / 2, y - H / 2) < SAFE_DIST);
      asteroids.push(new Asteroid(x, y, 3));
    }
  }
  function initGame() {
    ship = new Ship();
    bullets = [];
    asteroids = [];
    particles = [];
    powerUps = [];
    powerUpSpawned = false;
    killsSinceSpawn = 0;
    score = 0;
    lives = 3;
    level = 1;
    spawnAsteroids(4);
  }
  function nextLevel() {
    level++;
    bullets = [];
    particles = [];
    powerUps = [];
    powerUpSpawned = false;
    killsSinceSpawn = 0;
    ship.reset();
    spawnAsteroids(3 + level);
  }
  function explode(x: number, y: number, count = 8) {
    for (let i = 0; i < count; i++) particles.push(new Particle(x, y));
  }
  function killShip() {
    explode(ship.x, ship.y, 14);
    ship.dead = true;
    lives--;
    if (lives <= 0) {
      state = "gameover";
      gameOverTimer = GAMEOVER_DELAY;
    } else {
      state = "dead";
      deadTimer = 2;
    }
  }
  // ── Update ──
  function updateParticles(dt: number) {
    particles.forEach((p) => p.update(dt));
    particles = particles.filter((p) => !p.dead);
  }
  function update(dt: number) {
    if (state === "gameover") {
      updateParticles(dt);
      gameOverTimer -= dt;
      if (gameOverTimer <= 0) {
        stopLoop();
        finished = true;
        events.onGameOver(score);
      }
      return;
    }
    if (state === "dead") {
      deadTimer -= dt;
      updateParticles(dt);
      asteroids.forEach((a) => a.update(dt));
      if (deadTimer <= 0) {
        state = "playing";
        ship.reset();
      }
      return;
    }
    if (pressed("Space")) bullets.push(...ship.tryShoot());
    ship.update(dt, keys);
    bullets.forEach((b) => b.update(dt));
    asteroids.forEach((a) => a.update(dt));
    powerUps.forEach((p) => p.update(dt));
    updateParticles(dt);
    bullets = bullets.filter((b) => !b.dead);
    powerUps = powerUps.filter((p) => !p.dead);
    for (const p of powerUps) {
      if (!p.dead && dist(ship, p) < ship.radius + p.radius) {
        p.dead = true;
        ship.tripleShot = POWERUP_DURATION;
      }
    }
    // Bullet vs asteroid.
    const newAsteroids: Asteroid[] = [];
    for (const b of bullets) {
      for (const a of asteroids) {
        if (!a.dead && !b.dead && dist(b, a) < a.radius) {
          b.dead = true;
          a.dead = true;
          score += POINTS[a.size];
          explode(a.x, a.y, a.size * 5);
          newAsteroids.push(...a.split());
          if (!powerUpSpawned) {
            killsSinceSpawn++;
            const guaranteed = killsSinceSpawn >= 5;
            if (guaranteed || Math.random() < POWERUP_DROP_CHANCE) {
              powerUps.push(new PowerUp(a.x, a.y));
              powerUpSpawned = true;
            }
          }
        }
      }
    }
    asteroids = asteroids.filter((a) => !a.dead).concat(newAsteroids);
    bullets = bullets.filter((b) => !b.dead);
    // Ship vs asteroid; 0.82 fudge factor for feel.
    if (ship.invincible <= 0) {
      for (const a of asteroids) {
        if (dist(ship, a) < ship.radius + a.radius * 0.82) {
          killShip();
          break;
        }
      }
    }
    if (asteroids.length === 0) nextLevel();
  }
  // ── Draw ──
  function draw() {
    ctx.fillStyle = palette.bg;
    ctx.fillRect(0, 0, W, H);
    particles.forEach((p) => p.draw(ctx, palette));
    asteroids.forEach((a) => a.draw(ctx, palette));
    powerUps.forEach((p) => p.draw(ctx, palette));
    bullets.forEach((b) => b.draw(ctx, palette));
    ship.draw(ctx, palette);
    // Score, lives and level live in the platform HUD; only 3x stays here.
    if (ship.tripleShot > 0) {
      ctx.fillStyle = palette.powerUp;
      ctx.font = "15px monospace";
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      ctx.fillText(`3x  ${ship.tripleShot.toFixed(1)}s`, 14, 26);
    }
  }
  // ── Loop ──
  function loop(ts: number) {
    // dt capped at 50 ms to avoid a spiral of death.
    const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, 0.05);
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
  // Static field behind the "PULSA ESPACIO" overlay.
  initGame();
  draw();
  return {
    start() {
      stopLoop();
      initGame();
      clearKeys();
      finished = false;
      state = "playing";
      emitHud();
      startLoop();
    },
    pause() {
      stopLoop();
    },
    resume() {
      if (state === "ready" || finished) return;
      clearKeys();
      startLoop();
    },
    end() {
      stopLoop();
      state = "gameover";
      finished = true;
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
    },
  };
}
