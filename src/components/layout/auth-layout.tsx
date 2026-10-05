import { CalendarCheck, Globe, Users } from "lucide-react";
import { Link, Outlet } from "react-router";
import { Logo } from "@/components/shared/logo";
import { RedirectIfAuthenticated } from "@/features/auth/redirect-if-authenticated";
import { APP_NAME } from "@/lib/constants/app";

const CURRENT_YEAR = new Date().getFullYear();

const HIGHLIGHTS = [
  { icon: CalendarCheck, text: "Agenda sin solapamientos ni dobles reservas" },
  { icon: Globe, text: "Página pública para que tus clientes reserven solos" },
  { icon: Users, text: "Historial y notas de cada cliente en un solo lugar" },
];

export function AuthLayout() {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <RedirectIfAuthenticated />
      <div className="flex flex-col px-4 py-6 sm:px-10">
        <Logo />
        <main className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-sm">
            <Outlet />
          </div>
        </main>
        <p className="text-xs text-muted-foreground">
          © {CURRENT_YEAR} {APP_NAME} ·{" "}
          <Link to="/privacidad" className="hover:text-foreground hover:underline">
            Política de privacidad
          </Link>
        </p>
      </div>
      <aside className="relative hidden overflow-hidden bg-foreground text-background lg:flex lg:flex-col lg:justify-center lg:px-16">
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(60%_60%_at_80%_10%,color-mix(in_oklch,var(--primary)_55%,transparent),transparent)]"
        />
        <div className="relative max-w-md">
          <p className="text-3xl font-semibold tracking-tight text-balance">
            “Dejé de perder citas por WhatsApp. Ahora mis clientes reservan solos.”
          </p>
          <p className="mt-4 text-sm text-background/60">Profesional independiente · Quito</p>
          <ul className="mt-12 space-y-4">
            {HIGHLIGHTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-sm text-background/85">
                <span className="flex size-9 items-center justify-center rounded-lg bg-background/10">
                  <Icon className="size-4" aria-hidden />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}
