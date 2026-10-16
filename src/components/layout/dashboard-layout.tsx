import { LifeBuoy, LogOut } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FullPageLoader } from "@/components/shared/full-page-loader";
import { useSession } from "@/features/auth/use-session";
import { closeLater, isClosingLater } from "@/features/appointments/to-close/close-later";
import { ToCloseBanner } from "@/features/appointments/to-close/to-close-banner";
import { ToCloseContext } from "@/features/appointments/to-close/to-close-context";
import { ToCloseScreen } from "@/features/appointments/to-close/to-close-screen";
import { ToCloseSheet } from "@/features/appointments/to-close/to-close-sheet";
import { WhatsAppNoticeProvider } from "@/features/appointments/whatsapp-notice";
import { BrandThemeProvider } from "@/features/branding/brand-theme-provider";
import { useInstallableApp } from "@/features/install/use-installable-app";
import { NoticeBell } from "@/features/notices/notice-bell";
import { PushPrompt } from "@/features/push/push-prompt";
import { useCurrentBusiness } from "@/hooks/queries/use-account";
import { useToCloseCount } from "@/hooks/queries/use-to-close";
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
  const { pathname } = useLocation();
  // El panel se viste con los colores del negocio (si eligió unos propios).
  const { data: business } = useCurrentBusiness();
  // Citas por cerrar (spec 018): el contador se pide como el de la campana (al entrar, al volver a la
  // pestaña y cada 3 minutos con la pestaña visible). Cada uno ve lo suyo: el rol Profesional, su agenda.
  const toClose = useToCloseCount();
  const [listOpen, setListOpen] = useState(false);
  const userId = session?.userId ?? "";
  const businessId = session?.businessId ?? "";
  const support = Boolean(session?.support);
  // «Más tarde» (4 horas en este aparato) se mira al entrar y al cambiar de página, no en medio de lo que
  // se está haciendo: pasadas las 4 horas, la pantalla vuelve a salir en la siguiente página.
  const [later, setLater] = useState(() => ({ path: pathname, active: isClosingLater(userId, businessId) }));
  if (later.path !== pathname) setLater({ path: pathname, active: isClosingLater(userId, businessId) });

  // La campana de avisos (spec 014) es del equipo: el super admin en modo soporte no la ve (tiene la suya en /admin).
  const bell = (align: "start" | "end") =>
    session?.support ? null : <NoticeBell scope="business" timezone={business?.timezone ?? DEFAULT_TIMEZONE} align={align} />;

  // Con citas de días anteriores sin cerrar y sin un «Más tarde» reciente: primero, la lista. En modo
  // soporte nunca (sólo la franja). Mientras llega el contador, la pantalla de carga: así no se ve el
  // panel un instante antes de bloquearlo.
  const mayBlock = !support && !later.active && !toClose.hidden;
  const blocked = mayBlock && toClose.loaded && toClose.overdue > 0;
  // Cerró la última de días anteriores en la pantalla: entra al panel, y se le dice por qué.
  const wasBlocked = useRef(false);
  useEffect(() => {
    if (wasBlocked.current && !blocked && toClose.overdue === 0) toast.success("Listo: ya no te quedan citas de días anteriores por cerrar.");
    wasBlocked.current = blocked;
  }, [blocked, toClose.overdue]);
  if (mayBlock && !toClose.loaded) return <FullPageLoader />;
  const showBanner = !blocked && !toClose.hidden && toClose.overdue > 0;
  const toCloseValue = { count: toClose, open: () => setListOpen(true) };
  const remindLater = () => {
    closeLater(userId, businessId);
    setLater({ path: pathname, active: true });
  };

  return (
    <BrandThemeProvider colors={business?.brandColors}>
      <WhatsAppNoticeProvider>
        <ToCloseContext.Provider value={toCloseValue}>
          {blocked ? (
            <ToCloseScreen overdue={toClose.overdue} onLater={remindLater} />
          ) : (
            <AppShell
              homeHref="/dashboard"
              renderSidebar={(onNavigate) => <SidebarContent onNavigate={onNavigate} bell={onNavigate ? null : bell("start")} />}
              bell={bell("end")}
              banner={
                <>
                  {session?.support ? (
                    <SupportBanner businessName={session.support.businessName} />
                  ) : session?.role === "owner" ? (
                    // Avisos en el celular (spec 013): el propietario; nunca coincide con el modo soporte.
                    <PushPrompt audience="owner" />
                  ) : (
                    // Y el rol Profesional con su agenda (spec 017), sólo para el resumen de las 8.
                    session?.role === "professional" && session.professionalId && <PushPrompt audience="agenda" />
                  )}
                  {/* Con «Más tarde» (o en modo soporte), la franja con la cifra y el enlace a la lista. */}
                  {showBanner && <ToCloseBanner total={toClose.total} support={support} onOpen={() => setListOpen(true)} />}
                </>
              }
            />
          )}
          {!blocked && <ToCloseSheet open={listOpen} onOpenChange={setListOpen} />}
        </ToCloseContext.Provider>
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
