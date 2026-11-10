"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { signOut } from "@/app/login/actions";
import type { CurrentPlayer } from "@/lib/data/auth";
// Signed-in player (SPEC 15): username in cyan, or a link to choose one.
function PlayerName({
  player,
  onClick,
}: {
  player: CurrentPlayer;
  onClick?: () => void;
}) {
  if (player.username === null) {
    return (
      <Link
        href="/login/usuario"
        className="player-name pending"
        onClick={onClick}
      >
        ELIGE USUARIO
      </Link>
    );
  }
  return (
    <span className="player-name neon-cyan" title={player.username}>
      {player.username}
    </span>
  );
}
export default function Nav({ player }: { player: CurrentPlayer | null }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isHome = pathname === "/";
  const isLibrary =
    pathname === "/biblioteca" || pathname.startsWith("/juegos/");
  const isHall = pathname === "/salon";
  const isAbout = pathname === "/acerca";
  const isAuth = pathname === "/login";
  const close = () => setOpen(false);
  return (
    <>
      <nav className="av-nav">
        <Link href="/" className="logo" onClick={close}>
          <div className="logo-mark" />
          <div className="logo-text neon-cyan">
            ARCADE <span className="neon-magenta">VAULT</span>
          </div>
        </Link>
        <div className="links">
          <Link href="/" className={isHome ? "active" : ""}>
            Inicio
          </Link>
          <Link href="/biblioteca" className={isLibrary ? "active" : ""}>
            Biblioteca
          </Link>
          <Link href="/salon" className={isHall ? "active" : ""}>
            Salón de la Fama
          </Link>
          <Link href="/acerca" className={isAbout ? "active" : ""}>
            Acerca de
          </Link>
        </div>
        <div className="spacer" />
        <div className="coin-counter">
          <span className="coin" />
          <span>CRÉDITOS · 03</span>
        </div>
        {player ? (
          <div className="nav-player">
            <PlayerName player={player} />
            <form action={signOut}>
              <button type="submit" className="btn ghost">
                SALIR
              </button>
            </form>
          </div>
        ) : (
          <Link href="/login" className="btn auth-btn">
            Iniciar Sesión
          </Link>
        )}
        <button
          className="btn ghost hamburger"
          onClick={() => setOpen(true)}
          aria-label="Menú"
        >
          ≡
        </button>
      </nav>
      <div
        className={"av-mobile-backdrop" + (open ? " open" : "")}
        onClick={close}
      />
      <aside className={"av-mobile-panel" + (open ? " open" : "")}>
        <div className="pixel neon-cyan mb-4 text-[11px]">MENÚ</div>
        <Link href="/" className={isHome ? "active" : ""} onClick={close}>
          Inicio
        </Link>
        <Link
          href="/biblioteca"
          className={isLibrary ? "active" : ""}
          onClick={close}
        >
          Biblioteca
        </Link>
        <Link href="/salon" className={isHall ? "active" : ""} onClick={close}>
          Salón de la Fama
        </Link>
        <Link
          href="/acerca"
          className={isAbout ? "active" : ""}
          onClick={close}
        >
          Acerca de
        </Link>
        {player ? (
          <div className="panel-player">
            <PlayerName player={player} onClick={close} />
            <form action={signOut}>
              <button type="submit" className="btn ghost w-full">
                SALIR
              </button>
            </form>
          </div>
        ) : (
          <Link
            href="/login"
            className={isAuth ? "active" : ""}
            onClick={close}
          >
            Iniciar Sesión
          </Link>
        )}
        <div className="flex-1" />
        <div className="pixel text-[9px] tracking-[0.16em] text-ink-faint">
          CRÉDITOS · 03
        </div>
      </aside>
    </>
  );
}
