// Shared skin system: ids, Spanish labels and per-game persistence.
// A skin only changes colors, glow and stroke style; never sizes, speeds,
// hitboxes or scoring, so leaderboards stay comparable across skins.
export const SKIN_IDS = ["clasico", "neon", "retro"] as const;
export type SkinId = (typeof SKIN_IDS)[number];
export const DEFAULT_SKIN: SkinId = "clasico";
export const SKIN_LABELS: Record<SkinId, string> = {
  clasico: "CLÁSICO",
  neon: "NEÓN",
  retro: "RETRO",
};
export const isSkinId = (v: unknown): v is SkinId =>
  typeof v === "string" && (SKIN_IDS as readonly string[]).includes(v);
const storageKey = (gameId: string) => `av-skin:${gameId}`;
export function loadSkin(gameId: string): SkinId {
  try {
    const v = window.localStorage.getItem(storageKey(gameId));
    return isSkinId(v) ? v : DEFAULT_SKIN;
  } catch {
    // localStorage blocked or unavailable.
    return DEFAULT_SKIN;
  }
}
export function saveSkin(gameId: string, skin: SkinId): void {
  try {
    window.localStorage.setItem(storageKey(gameId), skin);
  } catch {
    // Blocked: the skin only lasts for this visit.
  }
}
