import { FilePlus2, Printer, ShieldCheck, Stethoscope } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getServiceName } from "@/features/appointments/appointment-utils";
import { useAppointments } from "@/hooks/queries/use-appointments";
import { useClinicalRecord } from "@/hooks/queries/use-clinical";
import { useLookups } from "@/hooks/queries/use-lookups";
import type { Client } from "@/types";
import { ClinicalAttachmentsCard } from "./clinical-attachments-card";
import { ClinicalEvolutionChart } from "./clinical-evolution-chart";
import { ClinicalNoteCard } from "./clinical-note-card";
import { ClinicalNoteDialog } from "./clinical-note-dialog";
import { ClinicalProfileForm } from "./clinical-profile-form";

/** Historia clínica de un paciente: evoluciones y antecedentes. */
export function ClinicalRecordTab({ client }: { client: Client }) {
  const record = useClinicalRecord(client.id);
  const { data: appointments = [] } = useAppointments({ clientId: client.id });
  const { servicesById } = useLookups();
  const [noteOpen, setNoteOpen] = useState(false);

  const serviceOf = (appointmentId: string | null) => {
    const appointment = appointmentId ? appointments.find((a) => a.id === appointmentId) : undefined;
    return appointment ? getServiceName(servicesById, appointment.serviceId) : undefined;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <ShieldCheck className="size-4 shrink-0 text-emerald-600" aria-hidden />
          Sólo la ven tú y las personas autorizadas. Cada acceso queda registrado.
        </p>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link to={`/dashboard/clients/${client.id}/historia-clinica`}>
              <Printer /> Imprimir / PDF
            </Link>
          </Button>
          <Button onClick={() => setNoteOpen(true)}>
            <FilePlus2 /> Nueva evolución
          </Button>
        </div>
      </div>

      {record.isPending ? (
        <div className="grid gap-6 lg:grid-cols-5">
          <Skeleton className="h-96 lg:col-span-3" />
          <Skeleton className="h-96 lg:col-span-2" />
        </div>
      ) : record.isError ? (
        <ErrorState title="No pudimos abrir la historia clínica" description={record.error.message} onRetry={() => record.refetch()} />
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-5">
          <section aria-labelledby="notes-heading" className="space-y-4 lg:col-span-3">
            <ClinicalEvolutionChart record={record.data} />
            <h2 id="notes-heading" className="font-semibold">
              Evoluciones <span className="font-normal text-muted-foreground">({record.data.notes.length})</span>
            </h2>
            {record.data.notes.length === 0 ? (
              <EmptyState
                icon={Stethoscope}
                title="Sin evoluciones todavía"
                description="Registra cada consulta con el formato de tu especialidad: signos vitales, procedimientos, sesiones, receta…"
                action={
                  <Button onClick={() => setNoteOpen(true)}>
                    <FilePlus2 /> Registrar la primera
                  </Button>
                }
              />
            ) : (
              record.data.notes.map((note) => (
                <ClinicalNoteCard
                  key={note.id}
                  note={note}
                  template={record.data.templateVersions[note.templateVersionId]}
                  serviceName={serviceOf(note.appointmentId)}
                />
              ))
            )}
          </section>
          <div className="grid gap-6 lg:col-span-2">
            <ClinicalProfileForm
              key={record.data.profile?.updatedAt ?? "new"}
              clientId={client.id}
              clientDocumentId={client.documentId}
              profile={record.data.profile}
            />
            <ClinicalAttachmentsCard clientId={client.id} record={record.data} />
          </div>
        </div>
      )}

      <ClinicalNoteDialog
        open={noteOpen}
        onOpenChange={setNoteOpen}
        clientId={client.id}
        clientName={client.name}
      />
    </div>
  );
}
