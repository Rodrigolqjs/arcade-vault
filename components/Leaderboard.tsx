import EmptyScores from "@/components/EmptyScores";
import type { ScoreRow } from "@/lib/data/scores";
const PODIUM = ["top1", "top2", "top3"];
export default function Leaderboard({
  rows,
  gameId,
  playable,
}: {
  rows: ScoreRow[];
  gameId: string;
  playable: boolean;
}) {
  return (
    <div className="leaderboard">
      <h3>MEJORES PUNTUACIONES</h3>
      {rows.length === 0 ? (
        <EmptyScores gameId={gameId} playable={playable} />
      ) : (
        rows.map((r, i) => (
          <div
            key={r.id}
            className={"lb-row" + (PODIUM[i] ? " " + PODIUM[i] : "")}
          >
            <div className="rk">#{String(r.rank).padStart(2, "0")}</div>
            <div className="pl">
              {r.name}
              <div className="text-[10px] tracking-[0.1em] text-ink-faint">
                {r.date}
              </div>
            </div>
            <div className="sc">{r.score.toLocaleString("es-ES")}</div>
          </div>
        ))
      )}
    </div>
  );
}
