"use client";
import { useSyncExternalStore } from "react";
// Touch mode: a coarse pointer (phones, tablets) or, on hybrids that report a
// fine pointer, the first touch on the page. Once a touch is seen it sticks
// for the visit.
const QUERY = "(pointer: coarse)";
let touched = false;
function subscribe(onChange: () => void) {
  const mq = window.matchMedia(QUERY);
  const onTouch = () => {
    touched = true;
    onChange();
  };
  mq.addEventListener("change", onChange);
  window.addEventListener("touchstart", onTouch, { once: true, passive: true });
  return () => {
    mq.removeEventListener("change", onChange);
    window.removeEventListener("touchstart", onTouch);
  };
}
const getSnapshot = () => touched || window.matchMedia(QUERY).matches;
const getServerSnapshot = () => false;
export function useTouchMode(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
