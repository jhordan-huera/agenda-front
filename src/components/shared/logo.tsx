import { Link } from "react-router";
import { APP_NAME } from "@/lib/constants/app";
import { cn } from "@/lib/utils";
import { BrandMark } from "./brand-mark";

interface LogoProps {
  href?: string;
  className?: string;
}

// "Agenda360" → "Agenda" en negrita y "360" más ligero, junto al símbolo.
const [, WORD = APP_NAME, NUMBER = ""] = /^(\D+)(\d*)$/.exec(APP_NAME) ?? [];

/** Logotipo: el símbolo (calendario con el día reservado) y el nombre en azul. */
export function Logo({ href = "/", className }: LogoProps) {
  return (
    <Link
      to={href}
      aria-label={APP_NAME}
      className={cn("inline-flex items-center gap-2 rounded-md text-xl tracking-[-0.02em] text-ink", className)}
    >
      <BrandMark />
      <span>
        <span className="font-extrabold">{WORD}</span>
        {NUMBER && <span className="font-medium">{NUMBER}</span>}
      </span>
    </Link>
  );
}
