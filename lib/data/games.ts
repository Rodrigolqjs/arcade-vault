// Server-side reads of the game catalog (public.games). Errors are logged here
// and rethrown as a generic Error, which app/error.tsx catches.
import type { Category, Game, GameColor } from "@/lib/games";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
type GameRow = Database["public"]["Tables"]["games"]["Row"];
const COLUMNS = "id, title, short, long, cat, cover, color";
// cat and color arrive as string; the table's check constraints guarantee the values.
function toGame(row: Omit<GameRow, "sort_order" | "created_at">): Game {
  return {
    id: row.id,
    title: row.title,
    short: row.short,
    long: row.long,
    cat: row.cat as Category,
    cover: row.cover,
    color: row.color as GameColor,
  };
}
export async function getGames(): Promise<Game[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("games")
    .select(COLUMNS)
    .order("sort_order");
  if (error) {
    console.error("getGames failed:", error);
    throw new Error("Could not load the game catalog");
  }
  return data.map(toGame);
}
export async function getGame(id: string): Promise<Game | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("games")
    .select(COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.error("getGame failed:", error);
    throw new Error("Could not load the game");
  }
  return data ? toGame(data) : null;
}
