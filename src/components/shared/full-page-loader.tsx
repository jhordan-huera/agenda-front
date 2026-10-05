import { LogoMark } from "./logo";

/**
 * Pantalla de carga: el logotipo en el centro y tres puntos que laten debajo. index.html muestra
 * la misma mientras llega la app, así no hay salto entre una y otra.
 */
export function FullPageLoader({ label = "Cargando…" }: { label?: string }) {
  return (
    <div className="flex min-h-screen flex-1 flex-col items-center justify-center gap-5 bg-background" role="status">
      <LogoMark className="gap-2.5 text-3xl" markClassName="size-10" />
      <span className="flex items-center gap-1.5" aria-hidden>
        <span className="loading-dot" />
        <span className="loading-dot [animation-delay:0.16s]" />
        <span className="loading-dot [animation-delay:0.32s]" />
      </span>
      <span className="sr-only">{label}</span>
    </div>
  );
}
