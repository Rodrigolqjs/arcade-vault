"use client";
import {
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from "react";
export type PadSlot = "up" | "down" | "left" | "right" | "a" | "b";
export interface PadButton {
  slot: PadSlot;
  code: string; // KeyboardEvent.code the engine already understands
  label: string; // visible text: arrow glyph or action ("DISPARO", "ROTAR", "CAÍDA")
  ariaLabel: string; // Spanish, e.g. "Girar a la izquierda"
  repeat?: boolean; // autorepeat while held (170 ms delay, then every 50 ms)
}
export interface TouchControlsProps {
  buttons: PadButton[];
  active: boolean; // false outside "playing": presses are ignored and held buttons released
  onPress: (code: string) => void;
  onRelease: (code: string) => void;
}
export const REPEAT_DELAY = 170;
export const REPEAT_INTERVAL = 50;
const DPAD_SLOTS: PadSlot[] = ["up", "left", "right", "down"];
const ACTION_SLOTS: PadSlot[] = ["b", "a"];
interface Held {
  timeout?: ReturnType<typeof setTimeout>;
  interval?: ReturnType<typeof setInterval>;
}
export default function TouchControls({
  buttons,
  active,
  onPress,
  onRelease,
}: TouchControlsProps) {
  // Held buttons by code; each one owns its repeat timers.
  const held = useRef(new Map<string, Held>());
  const [pressed, setPressed] = useState<ReadonlySet<string>>(new Set());
  const syncPressed = () => setPressed(new Set(held.current.keys()));
  const down = (button: PadButton) => {
    if (held.current.has(button.code)) return; // a second finger on the same key
    const h: Held = {};
    held.current.set(button.code, h);
    onPress(button.code);
    if (button.repeat) {
      h.timeout = setTimeout(() => {
        h.interval = setInterval(() => onPress(button.code), REPEAT_INTERVAL);
      }, REPEAT_DELAY);
    }
    syncPressed();
  };
  const up = (code: string) => {
    const h = held.current.get(code);
    if (!h) return;
    clearTimeout(h.timeout);
    clearInterval(h.interval);
    held.current.delete(code);
    onRelease(code);
    syncPressed();
  };
  // Leaving "playing" (pause, game over) or unmounting lets go of everything,
  // so no key stays stuck in the engine.
  const releaseAll = useEffectEvent(() => {
    for (const code of [...held.current.keys()]) up(code);
  });
  useEffect(() => {
    if (!active) releaseAll();
  }, [active]);
  useEffect(() => () => releaseAll(), []);
  const bySlot = new Map(buttons.map((b) => [b.slot, b]));
  const renderKey = (slot: PadSlot, kind: "dpad" | "action") => {
    const button = bySlot.get(slot);
    if (!button) return null;
    const onDown = (e: ReactPointerEvent<HTMLButtonElement>) => {
      if (!active) return;
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      down(button);
    };
    const onUp = () => up(button.code);
    return (
      <button
        key={slot}
        type="button"
        className={`touch-key touch-key-${kind} touch-key-${slot}`}
        aria-label={button.ariaLabel}
        data-pressed={pressed.has(button.code) || undefined}
        onPointerDown={onDown}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onLostPointerCapture={onUp}
        onContextMenu={(e) => e.preventDefault()}
      >
        {kind === "action" ? (
          <>
            <span className="touch-key-cap" aria-hidden="true" />
            <span className="touch-key-name">{button.label}</span>
          </>
        ) : (
          <span className="touch-key-glyph" aria-hidden="true">
            {button.label}
          </span>
        )}
      </button>
    );
  };
  const hasVertical = bySlot.has("up") || bySlot.has("down");
  return (
    <div
      className="touch-pad"
      role="group"
      aria-label="Mando táctil"
      data-active={active || undefined}
    >
      <div className={`touch-dpad${hasVertical ? " is-cross" : ""}`}>
        {DPAD_SLOTS.map((slot) => renderKey(slot, "dpad"))}
        {hasVertical && <span className="touch-dpad-hub" aria-hidden="true" />}
      </div>
      <div className="touch-actions">
        {ACTION_SLOTS.map((slot) => renderKey(slot, "action"))}
      </div>
    </div>
  );
}
