"use client";
import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import type { CatalogGame } from "@/lib/games";
import type { PlayableGameId } from "@/lib/games/registry";
// ssr: false is only allowed in Client Components, so the lazy map lives here.
const PLAYERS: Record<PlayableGameId, ComponentType<{ game: CatalogGame }>> = {
  rocas: dynamic(() => import("@/components/games/AsteroidsPlayer"), {
    ssr: false,
  }),
};
export default function RealGamePlayer({
  id,
  game,
}: {
  id: PlayableGameId;
  game: CatalogGame;
}) {
  const Player = PLAYERS[id];
  return <Player game={game} />;
}
