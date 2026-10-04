import { ArrowLeft, Printer, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { PageTitle } from "@/components/shared/page-title";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getServiceName } from "@/features/appointments/appointment-utils";
import { HISTORY_FIELDS, NOTE_FIELDS, SEX_OPTIONS } from "@/features/clinical/clinical-labels";
import { useClinicalAccess } from "@/features/clinical/use-clinical-access";
import { useCurrentBusiness, useCurrentUser } from "@/hooks/queries/use-account";
import { useAppointments } from "@/hooks/queries/use-appointments";
import { useClient } from "@/hooks/queries/use-clients";
import { useClinicalRecord } from "@/hooks/queries/use-clinical";
import { useLookups } from "@/hooks/queries/use-lookups";
import { capitalize, formatDateTime, formatLongDate, formatNumericDate, getFullName } from "@/lib/format";

/** Historia clínica en formato documento para el archivo del profesional: imprimir o guardar como PDF. */
export default function ClinicalPrintPage() {
  const { id = "" } = useParams<{ id: string }>();
  const clinicalAccess = useClinicalAccess();
  const { data: business } = useCurrentBusiness();
  const { data: user } = useCurrentUser();
  const clientQuery = useClient(id);
  const record = useClinicalRecord(id, clinicalAccess);
  const { data: appointments = [] } = useAppointments({ clientId: id });
  const { servicesById } = useLookups();
  const [generatedAt] = useState(() => new Date().toISOString());

  if (!clinicalAccess) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="No tienes acceso a las historias clínicas"
        description="Pide al propietario del negocio que te lo habilite en Configuración → Equipo."
      />
    );
  }
  if (clientQuery.isPending || record.isPending) return <Skeleton className="h-[600px] rounded-xl" />;
  if (record.isError || !clientQuery.data) return <ErrorState onRetry={() => record.refetch()} />;

  const client = clientQuery.data;
  const { profile, notes } = record.data;
  const chronological = notes.toReversed();
  const serviceOf = (appointmentId: string | null) => {
    const appointment = appointmentId ? appointments.find((a) => a.id === appointmentId) : undefined;
    return appointment ? getServiceName(servicesById, appointment.serviceId) : null;
  };
  const personal = [
    ["Cédula / documento", profile?.documentId],
    ["Fecha de nacimiento", profile?.birthDate && formatNumericDate(profile.birthDate)],
    ["Sexo", profile?.sex && SEX_OPTIONS.find((o) => o.value === profile.sex)?.label],
    ["Tipo de sangre", profile?.bloodType],
    ["Teléfono", client.phone],
    ["Email", client.email],
    ["Dirección", client.address],
    ["Contacto de emergencia", profile?.emergencyContact],
    ["Consentimiento informado", profile?.consentDate ? `Firmado el ${formatNumericDate(profile.consentDate)}` : "No registrado"],
  ].filter((row): row is [string, string] => Boolean(row[1]));

  return (
    <div className="space-y-6">
      <PageTitle title={`Historia clínica · ${client.name}`} />
      <div className="flex items-center justify-between gap-3 print:hidden">
        <Button asChild variant="ghost">
          <Link to={`/dashboard/clients/${client.id}?tab=historia`}>
            <ArrowLeft /> Volver a la ficha
          </Link>
        </Button>
        <Button onClick={() => window.print()}>
          <Printer /> Imprimir / Guardar PDF
        </Button>
      </div>

      <article className="mx-auto max-w-3xl space-y-8 rounded-xl border bg-background p-8 text-sm print:max-w-none print:rounded-none print:border-0 print:p-0">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b pb-6">
          <div>
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Historia clínica</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">{client.name}</h1>
          </div>
          <div className="text-right text-xs text-muted-foreground">
            <p className="font-medium text-foreground">{business?.name}</p>
            {business?.address && <p>{business.address}</p>}
            {business?.phone && <p>{business.phone}</p>}
          </div>
        </header>

        <section aria-labelledby="print-personal">
          <h2 id="print-personal" className="mb-3 font-semibold">
            Datos del paciente
          </h2>
          <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
            {personal.map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section aria-labelledby="print-history">
          <h2 id="print-history" className="mb-3 font-semibold">
            Antecedentes
          </h2>
          <dl className="grid gap-2">
            {HISTORY_FIELDS.map(({ key, label }) => (
              <div key={key}>
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className="whitespace-pre-line">{profile?.[key] || "Sin registrar"}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section aria-labelledby="print-notes">
          <h2 id="print-notes" className="mb-3 font-semibold">
            Evoluciones ({notes.length})
          </h2>
          {chronological.length === 0 && <p className="text-muted-foreground">Sin evoluciones registradas.</p>}
          <ol className="space-y-5">
            {chronological.map((note) => (
              <li key={note.id} className="break-inside-avoid border-l-2 pl-4">
                <p className="font-medium">
                  {capitalize(formatLongDate(note.date))}
                  {serviceOf(note.appointmentId) && ` · ${serviceOf(note.appointmentId)}`}
                </p>
                <p className="text-xs text-muted-foreground">Registrada por {note.authorName}</p>
                <dl className="mt-2 grid gap-1.5">
                  {NOTE_FIELDS.filter(({ key }) => note[key]).map(({ key, label }) => (
                    <div key={key}>
                      <dt className="text-xs text-muted-foreground">{label}</dt>
                      <dd className="whitespace-pre-line">{note[key]}</dd>
                    </div>
                  ))}
                </dl>
                {note.addenda.map((addendum) => (
                  <p key={addendum.id} className="mt-2 text-xs">
                    <span className="font-medium">Aclaración ({addendum.authorName}, {formatDateTime(addendum.createdAt)}):</span>{" "}
                    {addendum.text}
                  </p>
                ))}
              </li>
            ))}
          </ol>
        </section>

        <footer className="border-t pt-4 text-xs text-muted-foreground">
          Documento generado el {formatDateTime(generatedAt)}
          {user && ` por ${getFullName(user)}`}. Contiene datos de salud confidenciales.
        </footer>
      </article>
    </div>
  );
}
