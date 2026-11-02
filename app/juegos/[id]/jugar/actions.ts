"use server";
import { isPlayable } from "@/lib/games/registry";
import { createClient } from "@/lib/supabase/server";
export type SaveScoreResult =
  { ok: true; rank: number } | { ok: false; error: "invalid" | "unavailable" };
// Same rules as the scores table checks (SPEC 07).
const NAME_RE = /^[A-Z0-9_ ]{1,10}$/;
const MAX_SCORE = 10_000_000;
export async function saveScore(input: {
  gameId: string;
  name: string;
  score: number;
}): Promise<SaveScoreResult> {
  const gameId = typeof input?.gameId === "string" ? input.gameId : "";
  const name =
    typeof input?.name === "string" ? input.name.trim().toUpperCase() : "";
  const score = input?.score;
  if (
    !isPlayable(gameId) ||
    !NAME_RE.test(name) ||
    !Number.isInteger(score) ||
    score < 0 ||
    score > MAX_SCORE
  ) {
    return { ok: false, error: "invalid" };
  }
  try {
    const supabase = await createClient();
    const { data: row, error: insertError } = await supabase
      .from("scores")
      .insert({ game_id: gameId, name, score })
      .select("score, created_at")
      .single();
    if (insertError) {
      console.error("saveScore insert failed:", insertError);
      return { ok: false, error: "unavailable" };
    }
    // Rank = rows ahead of this one: higher score, or same score saved earlier.
    const { count, error: rankError } = await supabase
      .from("scores")
      .select("id", { count: "exact", head: true })
      .eq("game_id", gameId)
      .or(
        `score.gt.${row.score},and(score.eq.${row.score},created_at.lt."${row.created_at}")`,
      );
    if (rankError || count === null) {
      console.error("saveScore rank failed:", rankError);
      return { ok: false, error: "unavailable" };
    }
    return { ok: true, rank: count + 1 };
  } catch (err) {
    console.error("saveScore failed:", err);
    return { ok: false, error: "unavailable" };
  }
}
