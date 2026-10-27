"use client";

import Link from "next/link";
import { useState } from "react";

interface GameOverModalProps {
  score: number;
  name: string;
  onNameChange: (name: string) => void;
  onRestart: () => void;
}

export default function GameOverModal({
  score,
  name,
  onNameChange,
  onRestart,
}: GameOverModalProps) {
  // Visual-only: saving just flips to the toast. Score persistence belongs to a later spec.
  const [saved, setSaved] = useState(false);

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
        {!saved ? (
          <div className="input-row">
            <input
              value={name}
              onChange={(e) =>
                onNameChange(e.target.value.toUpperCase().slice(0, 10))
              }
              placeholder="TUS INICIALES"
              aria-label="Tus iniciales"
            />
            <button className="btn yellow" onClick={() => setSaved(true)}>
              GUARDAR PUNTUACIÓN
            </button>
          </div>
        ) : (
          <div className="toast-saved">▸ PUNTUACIÓN GUARDADA_</div>
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
