import type { ReactNode } from "react";
import { useSearchParams } from "react-router";
import { ErrorState } from "@/components/shared/error-state";
import { PageHeader } from "@/components/shared/page-header";
import { PageTitle } from "@/components/shared/page-title";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePermissions } from "@/features/auth/use-permissions";
import { ActivityLog } from "@/features/settings/activity-log";
import { BrandColorsSettings } from "@/features/settings/brand-colors-settings";
import { BookingSettingsForm } from "@/features/settings/booking-settings-form";
import { BusinessSettingsForm } from "@/features/settings/business-settings-form";
import { ClinicalSettingsCard } from "@/features/settings/clinical-settings-card";
import { EmailOutbox } from "@/features/settings/email-outbox";
import { NotificationSettingsForm, WhatsAppNoticeSettingsForm } from "@/features/settings/notification-settings-form";
import { ProfileSettingsForm } from "@/features/settings/profile-settings-form";
import { SettingsSectionSkeleton } from "@/features/settings/settings-section";
import { SubscriptionSettings } from "@/features/settings/subscription-settings";
import { TeamSettings } from "@/features/settings/team-settings";
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
  { value: "suscripcion", label: "Suscripción", permission: "billing.manage" },
  { value: "actividad", label: "Actividad", permission: "audit.view" },
];

export default function SettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { can } = usePermissions();
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
      <PageHeader title="Configuración" description="Administra tu perfil, tu negocio, tu equipo y tu suscripción." />

      <Tabs value={tab} onValueChange={(value) => setSearchParams({ tab: value }, { replace: true })}>
        <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
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
              <ProfileSettingsForm user={userQuery.data} />
            )}
          </TabsContent>
          <TabsContent value="negocio" className="grid max-w-3xl gap-6">
            {withBusiness((business) => (
              <>
                <BusinessSettingsForm business={business} />
                <ClinicalSettingsCard business={business} />
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
          <TabsContent value="suscripcion">
            <SubscriptionSettings />
          </TabsContent>
          <TabsContent value="actividad" className="max-w-3xl">
            <ActivityLog />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
