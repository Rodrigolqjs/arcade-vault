"use client";
import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import type { Game } from "@/lib/games";
import type { PlayableGameId } from "@/lib/games/registry";
// ssr: false is only allowed in Client Components, so the lazy map lives here.
const PLAYERS: Record<PlayableGameId, ComponentType<{ game: Game }>> = {
  rocas: dynamic(() => import("@/components/games/AsteroidsPlayer"), {
    ssr: false,
  }),
  caida: dynamic(() => import("@/components/games/TetrisPlayer"), {
    ssr: false,
  }),
  serpentina: dynamic(() => import("@/components/games/SnakePlayer"), {
    ssr: false,
  }),
};
export default function RealGamePlayer({
  id,
  game,
}: {
  id: PlayableGameId;
  game: Game;
}) {
  const Player = PLAYERS[id];
  return <Player game={game} />;
}
