import { useState } from "react";
import { ErrorState } from "@/components/shared/error-state";
import { PageHeader } from "@/components/shared/page-header";
import { PageTitle } from "@/components/shared/page-title";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminAuditList } from "@/features/admin/admin-audit-list";
import { EmailOutboxCard } from "@/features/settings/email-outbox";
import { useAdminAuditLogs, useAdminEmails } from "@/hooks/queries/use-admin";
import type { AdminAuditScope } from "@/lib/data";

export default function AdminActivityPage() {
  const [scope, setScope] = useState<AdminAuditScope>("admin");
  const logs = useAdminAuditLogs(scope);
  const emails = useAdminEmails();

  return (
    <div className="space-y-6">
      <PageTitle title="Actividad de la plataforma" />
      <PageHeader title="Actividad" description="Auditoría de la plataforma y emails enviados por el sistema." />

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Auditoría</CardTitle>
            <CardDescription>
              {scope === "admin" ? "Acciones del super admin." : "Toda la actividad de todos los negocios (últimas 200)."}
            </CardDescription>
            <CardAction>
              <Tabs value={scope} onValueChange={(value) => setScope(value as AdminAuditScope)}>
                <TabsList>
                  <TabsTrigger value="admin" className="px-3">
                    Super admin
                  </TabsTrigger>
                  <TabsTrigger value="all" className="px-3">
                    Todo
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </CardAction>
          </CardHeader>
          <CardContent>
            {logs.isPending ? (
              <Skeleton className="h-72" />
            ) : logs.isError ? (
              <ErrorState onRetry={() => logs.refetch()} />
            ) : (
              <AdminAuditList entries={logs.data} showBusiness />
            )}
          </CardContent>
        </Card>
        <EmailOutboxCard
          outbox={emails}
          description="Todos los emails de la plataforma: altas, contraseñas, reservas y recordatorios."
        />
      </div>
    </div>
  );
}
