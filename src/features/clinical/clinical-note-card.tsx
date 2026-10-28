import { CalendarClock, FileStack, MessageSquarePlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { SubmitButton } from "@/components/shared/submit-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useCurrentBusiness } from "@/hooks/queries/use-account";
import { useAddClinicalAddendum } from "@/hooks/queries/use-clinical";
import { getErrorMessage } from "@/lib/data";
import { capitalize, formatDateTime, formatLongDate } from "@/lib/format";
import type { ClinicalNote, ClinicalTemplateVersion } from "@/types";
import { ClinicalNoteContent } from "./clinical-note-content";
import { ClinicalNoteDateDialog } from "./clinical-note-date-dialog";

interface ClinicalNoteCardProps {
  note: ClinicalNote;
  /** Versión de plantilla con que se escribió (sus campos y su nombre). */
  template?: ClinicalTemplateVersion;
  /** El formato lo creó el negocio (no es de la plataforma). */
  ownTemplate?: boolean;
  serviceName?: string;
}

export function ClinicalNoteCard({ note, template, ownTemplate = false, serviceName }: ClinicalNoteCardProps) {
  const addAddendum = useAddClinicalAddendum(note.clientId);
  // Las horas, en la zona del negocio (no en la del navegador).
  const timezone = useCurrentBusiness().data?.timezone;
  const [writing, setWriting] = useState(false);
  const [text, setText] = useState("");
  const [changingDate, setChangingDate] = useState(false);

  const save = async () => {
    try {
      await addAddendum.mutateAsync({ noteId: note.id, input: { text } });
      setText("");
      setWriting(false);
      toast.success("Aclaración añadida");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <Card className="gap-4" aria-label={`Evolución del ${formatLongDate(note.date)}`}>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <CardTitle className="text-base">
            <span className="sr-only">Consulta del </span>
            {capitalize(formatLongDate(note.date))}
          </CardTitle>
          {template && (
            <div className="flex flex-wrap items-center gap-1.5" title="Formato con que se registró">
              <Badge variant="secondary">
                <FileStack aria-hidden /> {template.name}
              </Badge>
              {ownTemplate && <Badge variant="outline">Creado por ti, versión {template.version}</Badge>}
            </div>
          )}
        </div>
        <CardDescription>
          {serviceName ? `${serviceName} · ` : ""}Registrada el {formatDateTime(note.createdAt, timezone)} por {note.authorName}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        {template ? (
          <ClinicalNoteContent fields={template.fields} data={note.data} />
        ) : (
          <p className="text-sm text-muted-foreground">No se pudo cargar el formato de esta evolución.</p>
        )}

        {note.addenda.length > 0 && (
          <ul className="grid gap-2 border-t pt-3">
            {note.addenda.map((addendum) => (
              <li key={addendum.id} className="rounded-lg border-l-2 border-lilac-ink/50 bg-secondary/70 px-3 py-2 text-sm">
                <p className="text-xs font-medium text-lilac-ink">
                  Aclaración · {addendum.authorName} · {formatDateTime(addendum.createdAt, timezone)}
                </p>
                <p className="mt-0.5 whitespace-pre-line">{addendum.text}</p>
              </li>
            ))}
          </ul>
        )}

        {writing ? (
          <div className="grid gap-2 border-t pt-3">
            <Textarea
              autoFocus
              rows={2}
              aria-label="Aclaración"
              placeholder="Corrección o información adicional…"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setWriting(false)}>
                Cancelar
              </Button>
              <SubmitButton type="button" size="sm" loading={addAddendum.isPending} disabled={text.trim().length < 2} onClick={save}>
                Guardar aclaración
              </SubmitButton>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-1">
            <Button type="button" variant="ghost" size="sm" className="text-muted-foreground" onClick={() => setWriting(true)}>
              <MessageSquarePlus /> Añadir aclaración
            </Button>
            <Button type="button" variant="ghost" size="sm" className="text-muted-foreground" onClick={() => setChangingDate(true)}>
              <CalendarClock /> Cambiar fecha
            </Button>
          </div>
        )}
      </CardContent>
      <ClinicalNoteDateDialog note={note} timezone={timezone} open={changingDate} onOpenChange={setChangingDate} />
    </Card>
  );
}
