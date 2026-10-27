import Link from "next/link";
export default function NotFound() {
  return (
    <section className="av-hero fade-in">
      <h1 className="flicker">GAME OVER</h1>
      <div className="sub">ERROR 404 · PANTALLA NO ENCONTRADA</div>
      <p className="mx-auto mt-6 max-w-md text-ink-dim">
        Esta dirección no lleva a ningún juego. Vuelve a la biblioteca y elige
        otro.
      </p>
      <Link href="/" className="btn lg mt-8">
        VOLVER A LA BIBLIOTECA
      </Link>
    </section>
  );
}
