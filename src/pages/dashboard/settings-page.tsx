import type { ReactNode } from "react";
import { useSearchParams } from "react-router";
import { ErrorState } from "@/components/shared/error-state";
import { PageHeader } from "@/components/shared/page-header";
import { PageTitle } from "@/components/shared/page-title";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePermissions } from "@/features/auth/use-permissions";
import { useSession } from "@/features/auth/use-session";
import { DataExportCard } from "@/features/data-export/data-export-card";
import { PushSettingsCard } from "@/features/push/push-settings-card";
import { ActivityLog } from "@/features/settings/activity-log";
import { BrandColorsSettings } from "@/features/settings/brand-colors-settings";
import { BookingSettingsForm } from "@/features/settings/booking-settings-form";
import { BusinessSettingsForm } from "@/features/settings/business-settings-form";
import { ClinicalSettingsCard } from "@/features/settings/clinical-settings-card";
import { EmailOutbox } from "@/features/settings/email-outbox";
import { NotificationSettingsForm, WhatsAppNoticeSettingsForm } from "@/features/settings/notification-settings-form";
import { OwnAgendaCard } from "@/features/settings/own-agenda-card";
import { ProfileSettingsForm } from "@/features/settings/profile-settings-form";
import { ReferralCard } from "@/features/settings/referral-card";
import { SettingsSectionSkeleton } from "@/features/settings/settings-section";
import { TeamSettings } from "@/features/settings/team-settings";
import { ThemeModeCard } from "@/features/settings/theme-mode-card";
import { useCurrentBusiness, useCurrentUser } from "@/hooks/queries/use-account";
import type { Permission } from "@/lib/permissions";
import type { Business } from "@/types";

const TABS: { value: string; label: string; permission?: Permission }[] = [
  { value: "perfil", label: "Perfil" },
  { value: "negocio", label: "Negocio", permission: "business.manage" },
  { value: "agenda", label: "Agenda", permission: "business.manage" },
  { value: "colores", label: "Colores", permission: "business.manage" },
  { value: "notificaciones", label: "Notificaciones", permission: "business.manage" },
  { value: "equipo", label: "Equipo", permission: "team.manage" },
  { value: "actividad", label: "Actividad", permission: "audit.view" },
];

export default function SettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { can } = usePermissions();
  const { session } = useSession();
  // Avisos en el celular (spec 013): el propietario, en Notificaciones, y el rol Profesional (spec 017,
  // sólo los resúmenes de su agenda: el de las 8 y el de la mañana), en Perfil, que es su única pestaña.
  // Nunca el super admin en modo soporte.
  const pushAudience = session?.support ? null : session?.role === "owner" ? "owner" : session?.role === "professional" ? "agenda" : null;
  const userQuery = useCurrentUser();
  const businessQuery = useCurrentBusiness();

  const tabs = TABS.filter((tab) => !tab.permission || can(tab.permission));
  const tabParam = searchParams.get("tab");
  const tab = tabs.some((t) => t.value === tabParam) ? tabParam! : "perfil";

  const withBusiness = (render: (business: Business) => ReactNode) =>
    businessQuery.isPending ? (
      <SettingsSectionSkeleton />
    ) : businessQuery.isError || !businessQuery.data ? (
      <ErrorState onRetry={() => businessQuery.refetch()} />
    ) : (
      render(businessQuery.data)
    );

  return (
    <div className="space-y-6">
      <PageTitle title="Configuración" />
      <PageHeader title="Configuración" description="Administra tu perfil, tu negocio y tu equipo." />

      <Tabs value={tab} onValueChange={(value) => setSearchParams({ tab: value }, { replace: true })}>
        {/* En el móvil las pestañas no caben en una fila: van en cuadrícula, todas a la vista. */}
        <TabsList className="grid w-full grid-cols-3 gap-1 group-data-horizontal/tabs:h-auto sm:hidden">
          {tabs.map((option) => (
            <TabsTrigger key={option.value} value={option.value} className="h-9 px-1">
              {option.label}
            </TabsTrigger>
          ))}
        </TabsList>
        <div className="hidden overflow-x-auto sm:block">
          <TabsList variant="folder">
            {tabs.map((option) => (
              <TabsTrigger key={option.value} value={option.value} className="px-3">
                {option.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <div className="mt-4">
          <TabsContent value="perfil" className="grid max-w-3xl gap-6">
            {userQuery.isPending ? (
              <SettingsSectionSkeleton />
            ) : userQuery.isError || !userQuery.data ? (
              <ErrorState onRetry={() => userQuery.refetch()} />
            ) : (
              <>
                <ProfileSettingsForm user={userQuery.data} />
                <OwnAgendaCard />
              </>
            )}
            {/* El modo de pantalla es de cada persona (spec 019): lo ve cada rol, también en modo soporte. */}
            <ThemeModeCard />
            {pushAudience === "agenda" && <PushSettingsCard audience="agenda" />}
            {/* «Descargar mis datos» (spec 028): sólo el rol Profesional, lo de su agenda. Nunca en modo soporte. */}
            <DataExportCard place="profile" />
          </TabsContent>
          <TabsContent value="negocio" className="grid max-w-3xl gap-6">
            {withBusiness((business) => (
              <>
                <BusinessSettingsForm business={business} />
                <ClinicalSettingsCard business={business} />
                {/* El programa de referidos (spec 023): sólo el propietario. */}
                <ReferralCard />
                {/* «Descargar los datos del negocio» (spec 028): sólo el propietario, nunca en modo soporte. */}
                <DataExportCard place="business" />
              </>
            ))}
          </TabsContent>
          <TabsContent value="agenda" className="max-w-3xl">
            {withBusiness((business) => <BookingSettingsForm business={business} />)}
          </TabsContent>
          <TabsContent value="colores" className="max-w-5xl">
            {withBusiness((business) => <BrandColorsSettings business={business} />)}
          </TabsContent>
          <TabsContent value="notificaciones" className="grid max-w-3xl gap-6">
            {pushAudience === "owner" && <PushSettingsCard audience="owner" />}
            {withBusiness((business) => (
              <>
                <NotificationSettingsForm business={business} />
                <WhatsAppNoticeSettingsForm business={business} />
              </>
            ))}
            <EmailOutbox />
          </TabsContent>
          <TabsContent value="equipo" className="max-w-3xl">
            <TeamSettings />
          </TabsContent>
          <TabsContent value="actividad" className="max-w-3xl">
            <ActivityLog />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
