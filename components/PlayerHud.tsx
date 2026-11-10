import Link from "next/link";
import type { PointerEvent } from "react";
// Browsers only fire `click` for the primary touch. While another finger holds
// a touch pad key, a tap on PAUSA or FIN is a non-primary touch with no click,
// so it acts on its pointerup instead (SPEC 11). It never double-fires: a
// non-primary touch produces no click.
const secondFinger =
  (action: () => void) => (e: PointerEvent<HTMLButtonElement>) => {
    if (e.pointerType === "touch" && !e.isPrimary) action();
  };
interface PlayerHudProps {
  name: string;
  score: number;
  lives: number;
  /** Juegos sin vidas: si está definida, la casilla "Vidas" pasa a "Líneas" con este valor. */
  lines?: number;
  level: number;
  /** Juegos con reloj: si está definida, se añade la casilla "Tiempo" tras "Nivel"; con 5 s o menos parpadea en magenta. */
  time?: number;
  paused: boolean;
  onTogglePause: () => void;
  onEnd: () => void;
  exitHref: string;
}
export default function PlayerHud({
  name,
  score,
  lives,
  lines,
  level,
  time,
  paused,
  onTogglePause,
  onEnd,
  exitHref,
}: PlayerHudProps) {
  return (
    <div className="player-hud">
      <div className="flex flex-wrap gap-6">
        <div className="hud-stat">
          <div className="l">Jugador</div>
          <div className="v text-ink">{name}</div>
        </div>
        <div className="hud-stat">
          <div className="l">Puntuación</div>
          <div className="v">{score.toLocaleString("es-ES")}</div>
        </div>
        {lines !== undefined ? (
          <div className="hud-stat lines">
            <div className="l">Líneas</div>
            <div className="v">{lines.toLocaleString("es-ES")}</div>
          </div>
        ) : (
          <div className="hud-stat lives">
            <div className="l">Vidas</div>
            <div className="v">{"♥ ".repeat(lives).trim() || "—"}</div>
          </div>
        )}
        <div className="hud-stat level">
          <div className="l">Nivel</div>
          <div className="v">{String(level).padStart(2, "0")}</div>
        </div>
        {time !== undefined && (
          <div className={`hud-stat time${time <= 5 ? " low" : ""}`}>
            <div className="l">Tiempo</div>
            <div className="v">{String(time).padStart(2, "0")}</div>
          </div>
        )}
      </div>
      <div className="hud-actions">
        <button
          className="btn yellow"
          onClick={onTogglePause}
          onPointerUp={secondFinger(onTogglePause)}
        >
          {paused ? "REANUDAR" : "PAUSA"}
        </button>
        <button
          className="btn magenta"
          onClick={onEnd}
          onPointerUp={secondFinger(onEnd)}
        >
          FIN
        </button>
        <Link href={exitHref} className="btn ghost">
          SALIR
        </Link>
      </div>
    </div>
  );
}
