"use client";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import GameOverModal from "@/components/GameOverModal";
import PlayerHud from "@/components/PlayerHud";
import type { Game } from "@/lib/games";
import {
  type HudState,
  type TetrisGame,
  createTetrisGame,
} from "@/lib/games/tetris/engine";
type Phase = "ready" | "playing" | "paused" | "over";
const START_HUD: HudState = { score: 0, lines: 0, level: 1 };
const GAME_KEYS = new Set([
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "Space",
]);
export default function TetrisPlayer({ game }: { game: Game }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<TetrisGame | null>(null);
  const [phase, setPhase] = useState<Phase>("ready");
  const [hud, setHud] = useState(START_HUD);
  const [finalScore, setFinalScore] = useState(0);
  const [name, setName] = useState("INVITADO");
  const start = () => {
    engineRef.current?.start();
    setPhase("playing");
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
    const target = e.target as HTMLElement;
    const typing = target.tagName === "INPUT" || target.tagName === "TEXTAREA";
    if (phase !== "over" && !typing && GAME_KEYS.has(e.code))
      e.preventDefault();
    if (e.code === "Space" && phase === "ready") start();
    else if (e.code === "KeyP" || e.code === "Escape") togglePause();
  });
  const onFocusLost = useEffectEvent(() => pause());
  useEffect(() => {
    const engine = createTetrisGame(canvasRef.current!, {
      onHud: setHud,
      onGameOver: (score) => onGameOver(score),
    });
    engineRef.current = engine;
    // Added after the engine's own listener, so the engine sees this Space as held.
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
        lives={0}
        lines={hud.lines}
        level={hud.level}
        paused={phase === "paused"}
        onTogglePause={togglePause}
        onEnd={end}
        exitHref={`/juegos/${game.id}`}
      />
      <div className="crt">
        <div className="crt-screen">
          <canvas ref={canvasRef} className="game-canvas" />
          {phase === "ready" && (
            <div className="game-start" onClick={start}>
              <div className={`pixel neon-${game.color} title`}>
                {game.title}
              </div>
              <div className="pixel prompt">PULSA ESPACIO_</div>
              <div className="mono keys">
                <span>
                  <kbd>←</kbd>
                  <kbd>→</kbd>mover
                </span>
                <span>
                  <kbd>↑</kbd>
                  <kbd>X</kbd>rotar
                </span>
                <span>
                  <kbd>↓</kbd>bajar
                </span>
                <span>
                  <kbd>Espacio</kbd>caída
                </span>
              </div>
            </div>
          )}
          {phase === "paused" && (
            <div className="crt-content z-[5] bg-black/60">
              <div>
                <div className="pixel neon-yellow text-[22px]">EN PAUSA</div>
                <div className="mono mt-2.5 text-[11px] tracking-[0.16em] text-ink-dim">
                  PULSA REANUDAR PARA CONTINUAR
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
