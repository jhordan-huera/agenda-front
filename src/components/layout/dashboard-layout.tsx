import { LifeBuoy, LogOut } from "lucide-react";
import { useEffect } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { FullPageLoader } from "@/components/shared/full-page-loader";
import { useSession } from "@/features/auth/use-session";
import { BrandThemeProvider } from "@/features/branding/brand-theme-provider";
import { useCurrentBusiness } from "@/hooks/queries/use-account";
import { getHomePath } from "@/lib/auth";
import { AppShell } from "./app-shell";
import { SidebarContent } from "./sidebar-content";
import { SuspendedBusinessScreen } from "./suspended-business-screen";

/** Layout del panel del negocio: protege las rutas y muestra la navegación. */
export default function DashboardLayout() {
  const navigate = useNavigate();
  const { status, session } = useSession();

  useEffect(() => {
    if (status === "unauthenticated") navigate("/login", { replace: true });
    if (status === "authenticated" && session && !session.businessId) navigate(getHomePath(session), { replace: true });
  }, [status, session, navigate]);

  if (status !== "authenticated" || !session?.businessId) return <FullPageLoader />;
  if (session.businessStatus === "suspended" && !session.support) return <SuspendedBusinessScreen />;
  return <DashboardShell />;
}

function DashboardShell() {
  const { session } = useSession();
  // El panel se viste con los colores del negocio (si eligió unos propios).
  const { data: business } = useCurrentBusiness();
  return (
    <BrandThemeProvider colors={business?.brandColors}>
      <AppShell
        homeHref="/dashboard"
        renderSidebar={(onNavigate) => <SidebarContent onNavigate={onNavigate} />}
        banner={session?.support && <SupportBanner businessName={session.support.businessName} />}
      />
    </BrandThemeProvider>
  );
}

/** Modo soporte: el super admin está gestionando este negocio como si fuera su propietario. */
function SupportBanner({ businessName }: { businessName: string }) {
  const navigate = useNavigate();
  const { session, exitSupport } = useSession();
  const exit = () => {
    const businessId = session?.businessId;
    exitSupport();
    navigate(businessId ? `/admin/businesses/${businessId}` : "/admin", { replace: true });
  };
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-600/25 bg-amber-50 px-4 py-2 text-sm text-amber-950 sm:px-6 lg:px-8">
      <p className="flex items-center gap-2">
        <LifeBuoy className="size-4 shrink-0" aria-hidden />
        <span>
          Modo soporte: estás gestionando <strong>{businessName}</strong> como super admin. Todo queda en su actividad.
        </span>
      </p>
      <Button size="sm" variant="outline" className="bg-white" onClick={exit}>
        <LogOut /> Salir del modo soporte
      </Button>
    </div>
  );
}
