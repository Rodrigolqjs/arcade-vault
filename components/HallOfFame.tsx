import Link from "next/link";
import EmptyScores from "@/components/EmptyScores";
import type { ScoreRow } from "@/lib/data/scores";
import type { Game } from "@/lib/games";
const PODIUM = ["top1", "top2", "top3"];
const fmt = (n: number) => n.toLocaleString("es-ES");
// A podium place with no score yet shows "—".
function PodiumSlot({
  row,
  place,
  tier,
}: {
  row: ScoreRow | undefined;
  place: number;
  tier: "gold" | "silver" | "bronze";
}) {
  const gold = tier === "gold";
  return (
    <div className={"podium-slot " + tier}>
      {gold && (
        <div className="pixel text-[9px] tracking-[0.18em] text-gold">
          CAMPEÓN
        </div>
      )}
      <div className={"rank-num" + (gold ? " mt-1 text-[36px]" : "")}>
        {String(place).padStart(2, "0")}
      </div>
      <div className="name">{row?.name ?? "—"}</div>
      <div className={"score" + (gold ? " text-[20px]" : "")}>
        {row ? fmt(row.score) : "—"}
      </div>
      <div className="date">{row?.date ?? "—"}</div>
    </div>
  );
}
export default function HallOfFame({
  games,
  gameId,
  rows,
  playable,
}: {
  games: Game[];
  gameId: string;
  rows: ScoreRow[];
  playable: boolean;
}) {
  const [first, second, third] = rows;
  return (
    <div className="av-hall fade-in">
      <div className="hall-head">
        <h1>SALÓN DE LA FAMA</h1>
        <p className="pixel text-[10px]">
          LOS NOMBRES QUE NUNCA SE BORRAN DE LA PANTALLA
        </p>
      </div>
      <nav className="hall-tabs" aria-label="Juegos">
        {games.map((g) => (
          <Link
            key={g.id}
            href={`/salon?juego=${g.id}`}
            className={"chip" + (gameId === g.id ? " active" : "")}
            aria-current={gameId === g.id ? "page" : undefined}
            scroll={false}
          >
            {g.title}
          </Link>
        ))}
      </nav>
      {rows.length === 0 ? (
        <div className="hall-empty">
          <EmptyScores gameId={gameId} playable={playable} />
        </div>
      ) : (
        <>
          <div className="podium">
            <PodiumSlot row={second} place={2} tier="silver" />
            <PodiumSlot row={first} place={1} tier="gold" />
            <PodiumSlot row={third} place={3} tier="bronze" />
          </div>
          <div className="hall-table">
            <div className="th">
              <div>RANGO</div>
              <div>JUGADOR</div>
              <div>PUNTUACIÓN</div>
              <div>FECHA</div>
            </div>
            {rows.map((r, i) => (
              <div
                key={r.id}
                className={"tr" + (PODIUM[i] ? " " + PODIUM[i] : "")}
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className="rk">#{String(r.rank).padStart(2, "0")}</div>
                <div className="pl">{r.name}</div>
                <div className="sc">{fmt(r.score)}</div>
                <div className="dt">{r.date}</div>
              </div>
            ))}
          </div>
        </>
      )}
      <div className="mt-8 text-center">
        <Link href="/biblioteca" className="btn lg">
          VOLVER A LA BIBLIOTECA
        </Link>
      </div>
    </div>
  );
}
