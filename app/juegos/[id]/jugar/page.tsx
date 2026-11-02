import { notFound } from "next/navigation";
import GamePlayer from "@/components/GamePlayer";
import RealGamePlayer from "@/components/games/RealGamePlayer";
import { getGame } from "@/lib/data/games";
import { isPlayable } from "@/lib/games/registry";
export default async function GamePlayerPage({
  params,
}: PageProps<"/juegos/[id]/jugar">) {
  const { id } = await params;
  const game = await getGame(id);
  if (!game) notFound();
  return isPlayable(id) ? (
    <RealGamePlayer id={id} game={game} />
  ) : (
    <GamePlayer game={game} />
  );
}
