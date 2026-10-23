import { LifeBuoy, LogOut } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router";
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
import { BillingScreen } from "@/features/billing/billing-screen";
import { BrandThemeProvider } from "@/features/branding/brand-theme-provider";
import { useInstallableApp } from "@/features/install/use-installable-app";
import { NoticeBell } from "@/features/notices/notice-bell";
import { PushPrompt } from "@/features/push/push-prompt";
import { useCurrentBusiness } from "@/hooks/queries/use-account";
import { isBillingUnavailable, useBusinessBilling } from "@/hooks/queries/use-billing";
import { useToCloseCount } from "@/hooks/queries/use-to-close";
import { DEFAULT_TIMEZONE } from "@/lib/constants/app";
import { TO_CLOSE_PARAM } from "@/lib/constants/notices";
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
  const [searchParams, setSearchParams] = useSearchParams();
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

  // La mensualidad (spec 029): sólo el propietario, nunca en modo soporte (ni el resto del equipo, que sigue
  // trabajando). Desde el día de pago de un cobro sin comprobante, su pantalla va antes que todo, también que
  // la del cierre de mes, y no se cierra hasta subirlo: no hay «Más tarde» ni días de gracia (pedido del
  // dueño del producto, 2026-10-20). Si la API no la tiene o falla, no se bloquea.
  const isOwner = session?.role === "owner" && !support;
  const billing = useBusinessBilling(isOwner);
  // El cobro cuyo comprobante acaba de subir: la pantalla se cierra sin esperar a que la mensualidad se recargue.
  const [sentCharge, setSentCharge] = useState<string | null>(null);
  const billingHidden = !isOwner || isBillingUnavailable(billing.error);
  const billingLoaded = billingHidden || billing.data !== undefined || billing.isError;
  const pendingCharge = billingHidden ? null : (billing.data?.pending ?? null);
  const billingScreen = pendingCharge !== null && pendingCharge.id !== sentCharge;

  // La campana de avisos (spec 014) es del equipo: el super admin en modo soporte no la ve (tiene la suya en /admin).
  const bell = (align: "start" | "end") =>
    session?.support ? null : <NoticeBell scope="business" timezone={business?.timezone ?? DEFAULT_TIMEZONE} align={align} />;

  // Con citas de días anteriores sin cerrar y sin un «Más tarde» reciente: primero, la lista. Con las de un
  // mes anterior (spec 021), siempre, aunque haya un «Más tarde» guardado. En modo soporte nunca (sólo la
  // franja). Mientras llega el contador, la pantalla de carga: así no se ve el panel un instante antes de
  // bloquearlo (también con «Más tarde», porque las del mes anterior bloquean igual).
  const mayBlock = !support && !toClose.hidden;
  const monthLocked = mayBlock && toClose.loaded && toClose.previousMonth > 0;
  const blocked = monthLocked || (mayBlock && !later.active && toClose.loaded && toClose.overdue > 0);
  // Cerró la última de días anteriores (o del mes anterior) en la pantalla: entra al panel, y se le dice por qué.
  const wasBlocked = useRef(false);
  const wasMonthLocked = useRef(false);
  useEffect(() => {
    if (wasBlocked.current && !blocked && toClose.overdue === 0) toast.success("Listo: ya no te quedan citas de días anteriores por cerrar.");
    else if (wasMonthLocked.current && !monthLocked) toast.success("Listo: ya cerraste las citas del mes anterior.");
    wasBlocked.current = blocked;
    wasMonthLocked.current = monthLocked;
  }, [blocked, monthLocked, toClose.overdue]);
  // `?por-cerrar=1` (el aviso de la mañana, spec 021): abre la lista «Por cerrar» y se quita de la dirección.
  // Si el panel está bloqueado, la lista ya está a la vista.
  const openToClose = searchParams.has(TO_CLOSE_PARAM) && toClose.loaded;
  if (openToClose && !blocked && !toClose.hidden && !listOpen) setListOpen(true);
  useEffect(() => {
    if (!openToClose) return;
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        next.delete(TO_CLOSE_PARAM);
        return next;
      },
      { replace: true },
    );
  }, [openToClose, setSearchParams]);
  if ((mayBlock && !toClose.loaded) || !billingLoaded) return <FullPageLoader />;
  const showBanner = !blocked && !toClose.hidden && toClose.overdue > 0;
  const toCloseValue = { count: toClose, open: () => setListOpen(true) };
  const remindLater = () => {
    closeLater(userId, businessId);
    setLater({ path: pathname, active: true });
  };

  return (
    <BrandThemeProvider colors={business?.brandColors} remember="dashboard">
      <WhatsAppNoticeProvider>
        <ToCloseContext.Provider value={toCloseValue}>
          {billingScreen && pendingCharge ? (
            <BillingScreen
              billing={{ ...billing.data!, pending: pendingCharge }}
              timezone={business?.timezone ?? DEFAULT_TIMEZONE}
              onSent={() => setSentCharge(pendingCharge.id)}
            />
          ) : blocked ? (
            <ToCloseScreen overdue={toClose.overdue} previousMonth={toClose.previousMonth} onLater={remindLater} />
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
                    // Y el rol Profesional con su agenda (spec 017), sólo para los resúmenes de su agenda.
                    session?.role === "professional" && session.professionalId && <PushPrompt audience="agenda" />
                  )}
                  {/* Con «Más tarde» (o en modo soporte), la franja con la cifra y el enlace a la lista. */}
                  {showBanner && <ToCloseBanner total={toClose.total} support={support} onOpen={() => setListOpen(true)} />}
                </>
              }
            />
          )}
          {!blocked && !billingScreen && <ToCloseSheet open={listOpen} onOpenChange={setListOpen} />}
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
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-600/25 bg-amber-50 px-4 py-2 text-sm text-amber-950 sm:px-6 lg:px-8 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-200">
      <p className="flex items-center gap-2">
        <LifeBuoy className="size-4 shrink-0" aria-hidden />
        <span>
          Modo soporte: estás gestionando <strong>{businessName}</strong> como super admin. Todo queda en su actividad.
        </span>
      </p>
      <Button size="sm" variant="outline" className="bg-card" onClick={exit}>
        <LogOut /> Salir del modo soporte
      </Button>
    </div>
  );
}
