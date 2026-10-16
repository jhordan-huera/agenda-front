import { LifeBuoy, LogOut } from "lucide-react";
import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { FullPageLoader } from "@/components/shared/full-page-loader";
import { useSession } from "@/features/auth/use-session";
import { WhatsAppNoticeProvider } from "@/features/appointments/whatsapp-notice";
import { BrandThemeProvider } from "@/features/branding/brand-theme-provider";
import { useInstallableApp } from "@/features/install/use-installable-app";
import { NoticeBell } from "@/features/notices/notice-bell";
import { PushPrompt } from "@/features/push/push-prompt";
import { useCurrentBusiness } from "@/hooks/queries/use-account";
import { DEFAULT_TIMEZONE } from "@/lib/constants/app";
import { getHomePath, loginPathFor } from "@/lib/auth";
import { AppShell } from "./app-shell";
import { SidebarContent } from "./sidebar-content";
import { SuspendedBusinessScreen } from "./suspended-business-screen";

/** Layout del panel del negocio: protege las rutas y muestra la navegación. */
export default function DashboardLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { status, session } = useSession();
  useInstallableApp();

  // Modo soporte sin la verificación en dos pasos (obligatoria): la API lo rechaza; en /admin se activa.
  const needsTwoFactor = Boolean(session?.support && session.twoFactorSetupRequired);

  useEffect(() => {
    // Sin sesión (p. ej. al tocar un aviso con la sesión caducada): al entrar, vuelve a esta pantalla (spec 013).
    if (status === "unauthenticated") navigate(loginPathFor(location.pathname, location.search), { replace: true });
    if (status === "authenticated" && session && !session.businessId) navigate(getHomePath(session), { replace: true });
    if (status === "authenticated" && needsTwoFactor) navigate("/admin", { replace: true });
  }, [status, session, needsTwoFactor, navigate, location.pathname, location.search]);

  if (status !== "authenticated" || !session?.businessId || needsTwoFactor) return <FullPageLoader />;
  if (session.businessStatus === "suspended" && !session.support) return <SuspendedBusinessScreen />;
  return <DashboardShell />;
}

function DashboardShell() {
  const { session } = useSession();
  // El panel se viste con los colores del negocio (si eligió unos propios).
  const { data: business } = useCurrentBusiness();
  // La campana de avisos (spec 014) es del equipo: el super admin en modo soporte no la ve (tiene la suya en /admin).
  const bell = (align: "start" | "end") =>
    session?.support ? null : <NoticeBell scope="business" timezone={business?.timezone ?? DEFAULT_TIMEZONE} align={align} />;
  return (
    <BrandThemeProvider colors={business?.brandColors}>
      <WhatsAppNoticeProvider>
        <AppShell
          homeHref="/dashboard"
          renderSidebar={(onNavigate) => <SidebarContent onNavigate={onNavigate} bell={onNavigate ? null : bell("start")} />}
          bell={bell("end")}
          banner={
            session?.support ? (
              <SupportBanner businessName={session.support.businessName} />
            ) : session?.role === "owner" ? (
              // Avisos en el celular (spec 013): el propietario; nunca coincide con el modo soporte.
              <PushPrompt audience="owner" />
            ) : (
              // Y el rol Profesional con su agenda (spec 017), sólo para el resumen de las 8.
              session?.role === "professional" && session.professionalId && <PushPrompt audience="agenda" />
            )
          }
        />
      </WhatsAppNoticeProvider>
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
