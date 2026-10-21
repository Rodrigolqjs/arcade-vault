import Link from "next/link";

export default function Home() {
  return (
    <section className="av-hero fade-in">
      <Link href="/biblioteca" className="btn lg">
        EXPLORAR JUEGOS
      </Link>
    </section>
  );
}
