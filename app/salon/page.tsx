import HallOfFame from "@/components/HallOfFame";
import { getGames } from "@/lib/data/games";
import { getTopScores } from "@/lib/data/scores";
import { isPlayable } from "@/lib/games/registry";
// ?juego=<id> picks the board; missing or unknown ids fall back to the first
// playable game by sort_order.
export default async function SalonPage({ searchParams }: PageProps<"/salon">) {
  const { juego } = await searchParams;
  const games = await getGames();
  const game =
    games.find((g) => g.id === juego) ??
    games.find((g) => isPlayable(g.id)) ??
    games[0];
  const rows = await getTopScores(game.id, 12);
  return (
    <HallOfFame
      games={games}
      gameId={game.id}
      rows={rows}
      playable={isPlayable(game.id)}
    />
  );
}
