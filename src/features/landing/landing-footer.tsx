import { Link } from "react-router";
import { Logo } from "@/components/shared/logo";
import { APP_NAME } from "@/lib/constants/app";

const CURRENT_YEAR = new Date().getFullYear();

const COLUMNS: { title: string; links: { label: string; to: string }[] }[] = [
  {
    title: "Producto",
    links: [
      { label: "Qué hace", to: "/#caracteristicas" },
      { label: "Tu panel", to: "/#tu-panel" },
      { label: "Cómo empezar", to: "/#como-funciona" },
      { label: "Página de reservas demo", to: "/book/jhordan" },
    ],
  },
  {
    title: "Cuenta",
    links: [
      { label: "Iniciar sesión", to: "/login" },
      { label: "Crear cuenta", to: "/register" },
    ],
  },
  { title: "Legal", links: [{ label: "Privacidad", to: "/privacidad" }] },
];

/** Pie de la portada, oscuro (el casi negro de la marca). */
export function LandingFooter() {
  return (
    <footer className="bg-shell text-shell-foreground">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))]">
        <div className="max-w-xs">
          <Logo tone="inverse" />
          <p className="mt-4 text-sm leading-relaxed text-shell-foreground/70">
            Agenda y reservas online para profesionales: tus clientes eligen su hora y tú solo atiendes.
          </p>
        </div>
        {COLUMNS.map((column) => (
          <nav key={column.title} aria-label={column.title}>
            <p className="text-sm font-semibold text-white">{column.title}</p>
            <ul className="mt-4 space-y-3 text-sm">
              {column.links.map((link) => (
                <li key={link.label}>
                  {/* Las secciones de la portada son anclas de esta misma página. */}
                  {link.to.startsWith("/#") ? (
                    <a href={link.to.slice(1)} className="text-shell-foreground/70 transition-colors hover:text-white">
                      {link.label}
                    </a>
                  ) : (
                    <Link to={link.to} className="text-shell-foreground/70 transition-colors hover:text-white">
                      {link.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-white/10">
        <p className="mx-auto max-w-6xl px-4 py-6 text-sm text-shell-foreground/60 sm:px-6">
          © {CURRENT_YEAR} {APP_NAME}
        </p>
      </div>
    </footer>
  );
}
