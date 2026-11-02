"use client";
import { useEffect, useState } from "react";
import GameOverModal from "@/components/GameOverModal";
import PlayerHud from "@/components/PlayerHud";
import type { Game } from "@/lib/games";
// Simulated run: no real game exists yet, so the score climbs on a timer.
const TICK_MS = 220;
const START = { score: 0, level: 1 };
export default function GamePlayer({ game }: { game: Game }) {
  const [run, setRun] = useState(START);
  const [lives, setLives] = useState(3);
  const [paused, setPaused] = useState(false);
  const [over, setOver] = useState(false);
  const [name, setName] = useState("INVITADO");
  // Unmounting the modal also resets its "saved" state.
  const restart = () => {
    setRun(START);
    setLives(3);
    setPaused(false);
    setOver(false);
  };
  useEffect(() => {
    if (over || paused) return;
    const t = setInterval(() => {
      setRun((prev) => {
        const score = prev.score + Math.floor(10 + Math.random() * 90);
        const level = score % 2500 < 100 ? prev.level + 1 : prev.level;
        return { score, level };
      });
    }, TICK_MS);
    return () => clearInterval(t);
  }, [over, paused]);
  return (
    <div className="av-player fade-in">
      <PlayerHud
        name={name}
        score={run.score}
        lives={lives}
        level={run.level}
        paused={paused}
        onTogglePause={() => setPaused((p) => !p)}
        onEnd={() => setOver(true)}
        exitHref={`/juegos/${game.id}`}
      />
      <div className="crt">
        <div className="crt-screen">
          <div className="game-arena">
            <div className="grid-floor" />
            <div className="enemy e1" />
            <div className="enemy e2" />
            <div className="enemy e3" />
            <div className="player-ship" />
          </div>
          {paused && (
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
      {over && (
        <GameOverModal
          gameId={game.id}
          saveable={false}
          score={run.score}
          name={name}
          onNameChange={setName}
          onRestart={restart}
        />
      )}
    </div>
  );
}
