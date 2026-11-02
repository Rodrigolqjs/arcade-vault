import Library from "@/components/Library";
import { getGames } from "@/lib/data/games";
import { getAllGameStats } from "@/lib/data/scores";
export default async function BibliotecaPage() {
  const [games, stats] = await Promise.all([getGames(), getAllGameStats()]);
  return <Library games={games} stats={stats} />;
}
