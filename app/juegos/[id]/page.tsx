import Link from "next/link";
import { notFound } from "next/navigation";
import Leaderboard from "@/components/Leaderboard";
import { getGame } from "@/lib/data/games";
import { getGameStats, getTopScores } from "@/lib/data/scores";
import { isPlayable } from "@/lib/games/registry";
export default async function GameDetailPage({
  params,
}: PageProps<"/juegos/[id]">) {
  const { id } = await params;
  const game = await getGame(id);
  if (!game) notFound();
  const [scores, stats] = await Promise.all([
    getTopScores(game.id, 10),
    getGameStats(game.id),
  ]);
  const playable = isPlayable(game.id);
  return (
    <div className="av-detail fade-in">
      <div>
        <div className="detail-cover">
          <div className={"cover-bg " + game.cover} />
        </div>
        <div className="detail-info mt-5">
          <div className="detail-tags">
            <span>{game.cat}</span>
            <span>1 JUGADOR</span>
            <span>TECLADO / TÁCTIL</span>
            <span>RETRO 1985</span>
          </div>
          <h2 className="neon-cyan">{game.title}</h2>
          <p>{game.long}</p>
          <div className="stat-strip">
            <div>
              <div className="l">Puntuaciones</div>
              <div className="v">{stats.plays.toLocaleString("es-ES")}</div>
            </div>
            <div>
              <div className="l">Mejor global</div>
              <div className="v text-magenta [text-shadow:0_0_6px_rgba(255,0,110,0.5)]">
                {stats.best === null ? "—" : stats.best.toLocaleString("es-ES")}
              </div>
            </div>
            <div>
              <div className="l">Dificultad</div>
              <div className="v text-yellow [text-shadow:0_0_6px_rgba(245,255,0,0.5)]">
                ★ ★ ★ ☆ ☆
              </div>
            </div>
          </div>
          <div className="detail-actions">
            <Link href={`/juegos/${game.id}/jugar`} className="btn xl pulse">
              ▶ JUGAR AHORA
            </Link>
            <Link href="/biblioteca" className="btn ghost lg">
              VOLVER AL VAULT
            </Link>
          </div>
        </div>
      </div>
      <aside>
        <Leaderboard rows={scores} gameId={game.id} playable={playable} />
      </aside>
    </div>
  );
}
