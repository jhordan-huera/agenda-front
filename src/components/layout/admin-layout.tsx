import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router";
import { FullPageLoader } from "@/components/shared/full-page-loader";
import { useSession } from "@/features/auth/use-session";
import { BrandThemeProvider } from "@/features/branding/brand-theme-provider";
import { NoticeBell } from "@/features/notices/notice-bell";
import { useInstallableApp } from "@/features/install/use-installable-app";
import { PushPrompt } from "@/features/push/push-prompt";
import { getHomePath, loginPathFor } from "@/lib/auth";
import { DEFAULT_TIMEZONE } from "@/lib/constants/app";
import { AdminSidebar } from "./admin-sidebar";
import { AppShell } from "./app-shell";
import { TwoFactorRequiredScreen } from "./two-factor-required-screen";

/**
 * Layout del panel de plataforma (/admin). Sólo el super admin entra; el resto vuelve
 * a su inicio. Es una mejora de experiencia: el backend rechaza igualmente cada operación.
 * Sin la verificación en dos pasos (obligatoria), primero tiene que activarla.
 */
export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { status, session } = useSession();
  const isSuperAdmin = session?.platformRole === "super_admin";
  useInstallableApp();

  useEffect(() => {
    // Sin sesión: al entrar, vuelve a esta pantalla (p. ej. la de un aviso, spec 013).
    if (status === "unauthenticated") navigate(loginPathFor(location.pathname, location.search), { replace: true });
    if (status === "authenticated" && session && !isSuperAdmin) navigate(getHomePath(session), { replace: true });
  }, [status, session, isSuperAdmin, navigate, location.pathname, location.search]);

  if (status !== "authenticated" || !isSuperAdmin) return <FullPageLoader />;
  if (session.twoFactorSetupRequired) return <TwoFactorRequiredScreen />;
  // Los colores que eligió este super admin para su panel (spec 007); sin ellos, los de Agenda360.
  return (
    <BrandThemeProvider colors={session.panelColors}>
      <AppShell
        homeHref="/admin"
        renderSidebar={(onNavigate) => (
          <AdminSidebar onNavigate={onNavigate} bell={onNavigate ? null : <NoticeBell scope="platform" timezone={DEFAULT_TIMEZONE} align="start" />} />
        )}
        bell={<NoticeBell scope="platform" timezone={DEFAULT_TIMEZONE} align="end" />}
        banner={<PushPrompt audience="platform" />}
      />
    </BrandThemeProvider>
  );
}
