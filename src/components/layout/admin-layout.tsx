import { useEffect } from "react";
import { useNavigate } from "react-router";
import { FullPageLoader } from "@/components/shared/full-page-loader";
import { useSession } from "@/features/auth/use-session";
import { useInstallableApp } from "@/features/install/use-installable-app";
import { getHomePath } from "@/lib/auth";
import { AdminSidebar } from "./admin-sidebar";
import { AppShell } from "./app-shell";

/**
 * Layout del panel de plataforma (/admin). Sólo el super admin entra; el resto vuelve
 * a su inicio. Es una mejora de experiencia: el backend rechaza igualmente cada operación.
 */
export default function AdminLayout() {
  const navigate = useNavigate();
  const { status, session } = useSession();
  const isSuperAdmin = session?.platformRole === "super_admin";
  useInstallableApp();

  useEffect(() => {
    if (status === "unauthenticated") navigate("/login", { replace: true });
    if (status === "authenticated" && session && !isSuperAdmin) navigate(getHomePath(session), { replace: true });
  }, [status, session, isSuperAdmin, navigate]);

  if (status !== "authenticated" || !isSuperAdmin) return <FullPageLoader />;
  return <AppShell homeHref="/admin" renderSidebar={(onNavigate) => <AdminSidebar onNavigate={onNavigate} />} />;
}
