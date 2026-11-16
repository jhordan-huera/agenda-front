import type { SVGProps } from "react";
import { socialLinksOf } from "@/lib/constants/loyalty";
import { cn } from "@/lib/utils";
import type { SocialLinks as SocialLinksValue } from "@/types";

/* Los íconos de las redes, en el trazo de los demás (lucide ya no trae los de las marcas). Siempre de un solo color. */
const iconProps = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
} satisfies SVGProps<SVGSVGElement>;

const NETWORK_ICONS = {
  facebook: (
    <svg {...iconProps}>
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  ),
  instagram: (
    <svg {...iconProps}>
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  ),
  tiktok: (
    <svg {...iconProps}>
      <path d="M16 3a4.5 4.5 0 0 0 4.5 4.5" />
      <path d="M16 3v11.5a4.5 4.5 0 1 1-4.5-4.5" />
    </svg>
  ),
} as const;

/**
 * «Síguenos en nuestras redes» (spec 052): sólo las redes que el negocio puso, en la tarjeta del paciente y en la
 * página de reservas. Sin ninguna, no se muestra nada.
 */
export function SocialLinks({
  links,
  businessName,
  className,
  title = "Síguenos en nuestras redes",
}: {
  links: SocialLinksValue | null | undefined;
  businessName: string;
  className?: string;
  /** null: sin título (sólo los íconos). */
  title?: string | null;
}) {
  const networks = socialLinksOf(links);
  if (networks.length === 0) return null;
  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      {title && <p className="text-sm text-muted-foreground">{title}</p>}
      <ul className="flex flex-wrap justify-center gap-3">
        {networks.map((network) => (
          <li key={network.key}>
            <a
              href={network.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${network.label} de ${businessName}`}
              className="flex size-11 items-center justify-center rounded-full border bg-card text-foreground transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              {NETWORK_ICONS[network.key]}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
