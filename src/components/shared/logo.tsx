import { Link } from "react-router";
import { APP_NAME } from "@/lib/constants/app";
import { cn } from "@/lib/utils";
import { BrandMark } from "./brand-mark";

interface LogoProps {
  href?: string;
  className?: string;
  /** "inverse": el nombre claro, sobre un fondo `shell` (oscuro en los dos modos, como el pie de la portada). */
  tone?: "default" | "inverse";
}

// "Agenda360" → "Agenda" en negrita y "360" más ligero, junto al símbolo.
const [, WORD = APP_NAME, NUMBER = ""] = /^(\D+)(\d*)$/.exec(APP_NAME) ?? [];

/** Logotipo: el símbolo (calendario con el día reservado) y el nombre en azul (o claro, sobre `shell`). */
export function Logo({ href = "/", className, tone = "default" }: LogoProps) {
  return (
    <Link
      to={href}
      aria-label={APP_NAME}
      className={cn("inline-flex items-center gap-2 rounded-md text-xl tracking-[-0.02em]", tone === "inverse" ? "text-shell-foreground" : "text-ink", className)}
    >
      <BrandMark />
      <Wordmark />
    </Link>
  );
}

/** El mismo logotipo sin enlace (p. ej. en la pantalla de carga). */
export function LogoMark({ className, markClassName }: { className?: string; markClassName?: string }) {
  return (
    <span aria-label={APP_NAME} className={cn("inline-flex items-center gap-2 text-xl tracking-[-0.02em] text-ink", className)}>
      <BrandMark className={markClassName} />
      <Wordmark />
    </span>
  );
}

function Wordmark() {
  return (
    <span>
      <span className="font-extrabold">{WORD}</span>
      {NUMBER && <span className="font-medium">{NUMBER}</span>}
    </span>
  );
}
