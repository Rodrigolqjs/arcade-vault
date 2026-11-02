"use client";
import Link from "next/link";
import { useState, useTransition } from "react";
import { saveScore } from "@/app/juegos/[id]/jugar/actions";
interface GameOverModalProps {
  gameId: string;
  saveable: boolean; // false for simulated games: nothing is saved
  score: number;
  name: string;
  onNameChange: (name: string) => void;
  onRestart: () => void;
}
type SaveState =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved"; rank: number }
  | { kind: "error" };
// Same rule as the scores table check and saveScore.
const NAME_RE = /^[A-Z0-9_ ]{1,10}$/;
export default function GameOverModal({
  gameId,
  saveable,
  score,
  name,
  onNameChange,
  onRestart,
}: GameOverModalProps) {
  const [save, setSave] = useState<SaveState>({ kind: "idle" });
  const [, startTransition] = useTransition();
  const initials = name.trim();
  const valid = NAME_RE.test(initials);
  const saving = save.kind === "saving";
  const onSave = () => {
    if (!valid || saving) return;
    setSave({ kind: "saving" });
    startTransition(async () => {
      try {
        const result = await saveScore({ gameId, name: initials, score });
        setSave(
          result.ok ? { kind: "saved", rank: result.rank } : { kind: "error" },
        );
      } catch {
        setSave({ kind: "error" });
      }
    });
  };
  return (
    <div className="modal-bd">
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="game-over-title"
      >
        <h2 id="game-over-title">FIN DEL JUEGO</h2>
        <div className="final-label">PUNTUACIÓN FINAL</div>
        <div className="final">{score.toLocaleString("es-ES")}</div>
        {!saveable ? (
          <p className="save-note">PARTIDA DE DEMOSTRACIÓN · NO SE GUARDA</p>
        ) : save.kind === "saved" ? (
          <div className="save-done" role="status">
            <div className="toast-saved">▸ PUNTUACIÓN GUARDADA_</div>
            <p className="save-rank">
              PUESTO #{String(save.rank).padStart(2, "0")}
            </p>
            <Link href={`/salon?juego=${gameId}`} className="save-link">
              VER SALÓN DE LA FAMA
            </Link>
          </div>
        ) : (
          <>
            <div className="input-row">
              <input
                value={name}
                onChange={(e) =>
                  onNameChange(e.target.value.toUpperCase().slice(0, 10))
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") onSave();
                }}
                placeholder="TUS INICIALES"
                aria-label="Tus iniciales"
                aria-describedby="initials-hint"
                aria-invalid={initials !== "" && !valid}
                disabled={saving}
              />
              <button
                className="btn yellow"
                onClick={onSave}
                disabled={!valid || saving}
              >
                {saving ? "GUARDANDO…" : "GUARDAR PUNTUACIÓN"}
              </button>
            </div>
            <p
              id="initials-hint"
              className={
                "save-hint" + (initials !== "" && !valid ? " invalid" : "")
              }
            >
              1–10 caracteres: A–Z, 0–9, _ y espacio
            </p>
            {save.kind === "error" && (
              <p className="save-error" role="alert">
                NO SE PUDO GUARDAR. INTÉNTALO DE NUEVO.
              </p>
            )}
          </>
        )}
        <div className="actions">
          <button className="btn" onClick={onRestart}>
            JUGAR DE NUEVO
          </button>
          <Link href="/biblioteca" className="btn magenta">
            VOLVER AL VAULT
          </Link>
        </div>
      </div>
    </div>
  );
}
