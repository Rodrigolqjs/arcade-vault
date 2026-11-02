import { notFound } from "next/navigation";
import GamePlayer from "@/components/GamePlayer";
import RealGamePlayer from "@/components/games/RealGamePlayer";
import { GAMES, getGame } from "@/lib/games";
import { isPlayable } from "@/lib/games/registry";
export function generateStaticParams() {
  return GAMES.map((g) => ({ id: g.id }));
}
export default async function GamePlayerPage({
  params,
}: PageProps<"/juegos/[id]/jugar">) {
  const { id } = await params;
  const game = getGame(id);
  if (!game) notFound();
  return isPlayable(id) ? (
    <RealGamePlayer id={id} game={game} />
  ) : (
    <GamePlayer game={game} />
  );
}
