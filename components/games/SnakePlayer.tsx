"use client";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import GameOverModal from "@/components/GameOverModal";
import PlayerHud from "@/components/PlayerHud";
import SkinSelector, {
  type SkinPreview,
} from "@/components/games/SkinSelector";
import TouchControls, {
  type PadButton,
} from "@/components/games/TouchControls";
import { useTouchMode } from "@/components/games/useTouchMode";
import type { Game } from "@/lib/games";
import {
  type HudState,
  type SnakeGame,
  createSnakeGame,
} from "@/lib/games/snake/engine";
import { SKINS } from "@/lib/games/snake/skins";
import { SKIN_IDS, type SkinId, loadSkin, saveSkin } from "@/lib/games/skins";
type Phase = "ready" | "playing" | "paused" | "over";
// Mini screen per skin: head, core and body on the skin background.
const SKIN_PREVIEWS = Object.fromEntries(
  SKIN_IDS.map((id) => {
    const p = SKINS[id];
    return [
      id,
      {
        bg: p.bg,
        colors: [p.head, p.core, p.snake],
        glow: p.glow.head > 0,
      },
    ];
  }),
) as Record<SkinId, SkinPreview>;
// Touch pad: the full cross; each tap queues one turn, like a key press.
const PAD: PadButton[] = [
  { slot: "up", code: "ArrowUp", label: "▲", ariaLabel: "Girar hacia arriba" },
  {
    slot: "down",
    code: "ArrowDown",
    label: "▼",
    ariaLabel: "Girar hacia abajo",
  },
  {
    slot: "left",
    code: "ArrowLeft",
    label: "◀",
    ariaLabel: "Girar a la izquierda",
  },
  {
    slot: "right",
    code: "ArrowRight",
    label: "▶",
    ariaLabel: "Girar a la derecha",
  },
];
const START_HUD: HudState = { score: 0, lives: 1, level: 1 };
const GAME_KEYS = new Set([
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "Space",
]);
export default function SnakePlayer({ game }: { game: Game }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const crtRef = useRef<HTMLDivElement>(null);
  const touch = useTouchMode();
  const engineRef = useRef<SnakeGame | null>(null);
  const [phase, setPhase] = useState<Phase>("ready");
  const [hud, setHud] = useState(START_HUD);
  const [finalScore, setFinalScore] = useState(0);
  const [name, setName] = useState("INVITADO");
  // Safe in the initializer: RealGamePlayer loads this with ssr: false.
  const [skin, setSkinState] = useState<SkinId>(() => loadSkin(game.id));
  const initialSkin = useRef(skin);
  const changeSkin = (id: SkinId) => {
    setSkinState(id);
    saveSkin(game.id, id);
    engineRef.current?.setSkin(id);
  };
  const start = () => {
    engineRef.current?.start();
    setPhase("playing");
    // On a phone the CRT may sit below the HUD: bring it into view to play.
    if (touch) crtRef.current?.scrollIntoView({ block: "center" });
  };
  const pause = () => {
    if (phase !== "playing") return;
    engineRef.current?.pause();
    setPhase("paused");
  };
  const resume = () => {
    if (phase !== "paused") return;
    engineRef.current?.resume();
    setPhase("playing");
  };
  const togglePause = () => (phase === "paused" ? resume() : pause());
  const end = () => {
    if (phase === "over" || !engineRef.current) return;
    setFinalScore(engineRef.current.end());
    setPhase("over");
  };
  const onGameOver = useEffectEvent((score: number) => {
    setFinalScore(score);
    setPhase("over");
  });
  const onKeyDown = useEffectEvent((e: KeyboardEvent) => {
    // Keep arrows and Space from scrolling the page, but never block typing.
    // WASD is never blocked, so initials can always be typed.
    const target = e.target as HTMLElement;
    const typing = target.tagName === "INPUT" || target.tagName === "TEXTAREA";
    if (phase !== "over" && !typing && GAME_KEYS.has(e.code))
      e.preventDefault();
    if (e.code === "Space" && phase === "ready") start();
    else if (e.code === "KeyP" || e.code === "Escape") togglePause();
  });
  const onFocusLost = useEffectEvent(() => pause());
  useEffect(() => {
    // The engine is created once; later skin changes go through setSkin.
    const engine = createSnakeGame(
      canvasRef.current!,
      {
        onHud: setHud,
        onGameOver: (score) => onGameOver(score),
      },
      { skin: initialSkin.current },
    );
    engineRef.current = engine;
    window.addEventListener("keydown", onKeyDown);
    const onVisibility = () => {
      if (document.visibilityState === "hidden") onFocusLost();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onFocusLost);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onFocusLost);
      engine.destroy();
      engineRef.current = null;
    };
  }, []);
  return (
    <div className="av-player fade-in">
      <PlayerHud
        name={name}
        score={hud.score}
        lives={hud.lives}
        level={hud.level}
        paused={phase === "paused"}
        onTogglePause={togglePause}
        onEnd={end}
        exitHref={`/juegos/${game.id}`}
      />
      <div className="crt" ref={crtRef}>
        <div className="crt-screen">
          <canvas ref={canvasRef} className="game-canvas" />
          {phase === "ready" && (
            <div className="game-start" onClick={start}>
              <div className={`pixel neon-${game.color} title`}>
                {game.title}
              </div>
              <div className="pixel prompt">
                {touch ? "TOCA PARA EMPEZAR_" : "PULSA ESPACIO_"}
              </div>
              <div className="mono keys" hidden={touch}>
                <span>
                  <kbd>←</kbd>
                  <kbd>↑</kbd>
                  <kbd>→</kbd>
                  <kbd>↓</kbd>
                  <kbd>WASD</kbd>girar
                </span>
              </div>
            </div>
          )}
          {phase === "paused" && (
            <div className="crt-content z-[5] bg-black/60">
              <div>
                <div className="pixel neon-yellow text-[22px]">EN PAUSA</div>
                <div className="mono mt-2.5 text-[11px] tracking-[0.16em] text-ink-dim">
                  {touch
                    ? "TOCA REANUDAR PARA CONTINUAR"
                    : "PULSA REANUDAR PARA CONTINUAR"}
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="crt-bottom">
          <span className="led">SEÑAL OK</span>
          <span>{game.title} · CRT-83 · 60 HZ</span>
          <span>CARGA · 1MB</span>
        </div>
      </div>
      {touch && (
        <TouchControls
          buttons={PAD}
          active={phase === "playing"}
          onPress={(code) => engineRef.current?.press(code)}
          onRelease={(code) => engineRef.current?.release(code)}
        />
      )}
      <SkinSelector
        value={skin}
        onChange={changeSkin}
        previews={SKIN_PREVIEWS}
        disabled={phase === "playing"}
      />
      {phase === "over" && (
        <GameOverModal
          gameId={game.id}
          saveable
          score={finalScore}
          name={name}
          onNameChange={setName}
          onRestart={start}
        />
      )}
    </div>
  );
}
