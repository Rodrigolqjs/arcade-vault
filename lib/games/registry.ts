// Catalog ids that have a real game; the rest use the simulated GamePlayer.
export const PLAYABLE_GAME_IDS = ["rocas"] as const;
export type PlayableGameId = (typeof PLAYABLE_GAME_IDS)[number];
export function isPlayable(id: string): id is PlayableGameId {
  return (PLAYABLE_GAME_IDS as readonly string[]).includes(id);
}
