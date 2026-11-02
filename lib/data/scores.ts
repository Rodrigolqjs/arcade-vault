// Server-side reads of leaderboards (public.scores) and per-game stats
// (public.game_stats). Same error policy as lib/data/games.ts.
import { createClient } from "@/lib/supabase/server";
export interface ScoreRow {
  id: number; // React key: initials repeat
  rank: number;
  name: string;
  score: number;
  date: string; // dd/mm/aaaa, UTC
}
export interface GameStats {
  best: number | null;
  plays: number;
}
const EMPTY_STATS: GameStats = { best: null, plays: 0 };
// UTC keeps the date identical whatever the server's time zone.
const DATE_FORMAT = new Intl.DateTimeFormat("es-ES", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "UTC",
});
export async function getTopScores(
  gameId: string,
  limit: number,
): Promise<ScoreRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("scores")
    .select("id, name, score, created_at")
    .eq("game_id", gameId)
    .order("score", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) {
    console.error("getTopScores failed:", error);
    throw new Error("Could not load the leaderboard");
  }
  return data.map((r, i) => ({
    id: r.id,
    rank: i + 1,
    name: r.name,
    score: r.score,
    date: DATE_FORMAT.format(new Date(r.created_at)),
  }));
}
export async function getAllGameStats(): Promise<Record<string, GameStats>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("game_stats")
    .select("game_id, best, plays");
  if (error) {
    console.error("getAllGameStats failed:", error);
    throw new Error("Could not load the game stats");
  }
  const stats: Record<string, GameStats> = {};
  for (const r of data) {
    if (r.game_id) stats[r.game_id] = { best: r.best, plays: r.plays ?? 0 };
  }
  return stats;
}
export async function getGameStats(gameId: string): Promise<GameStats> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("game_stats")
    .select("best, plays")
    .eq("game_id", gameId)
    .maybeSingle();
  if (error) {
    console.error("getGameStats failed:", error);
    throw new Error("Could not load the game stats");
  }
  return data ? { best: data.best, plays: data.plays ?? 0 } : EMPTY_STATS;
}
