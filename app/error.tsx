"use client";
// Error boundary for every page under the root layout. Server-side reads
// (lib/data/) already log the detail; nothing technical is shown here.
export default function ErrorPage({ retry }: { retry: () => void }) {
  return (
    <section className="av-hero offline fade-in" role="alert">
      <h1 className="flicker">VAULT FUERA DE LÍNEA</h1>
      <div className="sub">
        SIN SEÑAL DE LA BASE DE DATOS <span className="blink">_</span>
      </div>
      <p className="mx-auto mt-6 max-w-md text-ink-dim">
        No se pudieron cargar los juegos de esta pantalla. Espera unos segundos
        y vuelve a intentarlo.
      </p>
      <button type="button" className="btn magenta lg mt-8" onClick={retry}>
        REINTENTAR
      </button>
    </section>
  );
}
