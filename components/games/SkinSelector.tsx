"use client";
import type { CSSProperties } from "react";
import { SKIN_IDS, SKIN_LABELS, type SkinId } from "@/lib/games/skins";
// Real palette colors for the mini screen inside each button, so the preview
// always matches what the canvas paints.
export interface SkinPreview {
  bg: string;
  colors: string[]; // up to 3 main entities, in drawing order
  glow: boolean;
}
interface SkinSelectorProps {
  value: SkinId;
  onChange: (id: SkinId) => void;
  previews: Record<SkinId, SkinPreview>;
  disabled?: boolean; // true while a game is running
}
export default function SkinSelector({
  value,
  onChange,
  previews,
  disabled = false,
}: SkinSelectorProps) {
  return (
    <div
      className="skin-panel"
      role="group"
      aria-label="Aspecto del juego"
      aria-disabled={disabled || undefined}
    >
      <span className="skin-panel-label">Aspecto</span>
      <div className="skin-rocker">
        {SKIN_IDS.map((id) => {
          const preview = previews[id];
          return (
            <button
              key={id}
              type="button"
              className="skin-key"
              aria-pressed={value === id}
              disabled={disabled}
              onClick={(e) => {
                // Drop focus so the next Space starts the game instead of
                // pressing this button again.
                e.currentTarget.blur();
                if (id !== value) onChange(id);
              }}
            >
              <span className="skin-key-led" aria-hidden="true" />
              <span
                className="skin-key-screen"
                aria-hidden="true"
                style={{ background: preview.bg }}
              >
                {preview.colors.map((c, i) => (
                  <span
                    key={i}
                    className="skin-key-dot"
                    style={
                      {
                        "--dot": c,
                        boxShadow: preview.glow ? `0 0 5px ${c}` : "none",
                      } as CSSProperties
                    }
                  />
                ))}
              </span>
              <span className="skin-key-name">{SKIN_LABELS[id]}</span>
            </button>
          );
        })}
      </div>
      <span className="skin-panel-hint" aria-live="polite">
        {disabled ? "Pausa con P para cambiar" : ""}
      </span>
    </div>
  );
}
