import Link from "next/link";
// Empty leaderboard: an unclaimed #01 slot waiting for initials.
export default function EmptyScores({
  gameId,
  playable,
}: {
  gameId: string;
  playable: boolean;
}) {
  return (
    <div className="empty-scores">
      <div className="lb-row top1 ghost" aria-hidden="true">
        <div className="rk">#01</div>
        <div className="pl">
          _ _ _<span className="blink">▌</span>
        </div>
        <div className="sc">———</div>
      </div>
      <p className="empty-title">SÉ EL PRIMERO</p>
      <p className="empty-sub">
        {playable
          ? "Nadie ha guardado una puntuación todavía. Termina una partida y escribe tus iniciales para ocupar el #01."
          : "Este juego todavía es una demostración y no guarda puntuaciones."}
      </p>
      {playable && (
        <Link href={`/juegos/${gameId}/jugar`} className="btn yellow">
          ▶ JUGAR AHORA
        </Link>
      )}
    </div>
  );
}
