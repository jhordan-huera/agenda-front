import { MessageSquarePlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useAddClinicalAddendum } from "@/hooks/queries/use-clinical";
import { getErrorMessage } from "@/lib/data";
import { capitalize, formatDateTime, formatLongDate } from "@/lib/format";
import type { ClinicalNote } from "@/types";
import { NOTE_FIELDS } from "./clinical-labels";

export function ClinicalNoteCard({ note, serviceName }: { note: ClinicalNote; serviceName?: string }) {
  const addAddendum = useAddClinicalAddendum(note.clientId);
  const [writing, setWriting] = useState(false);
  const [text, setText] = useState("");

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
        <CardTitle className="text-base">{capitalize(formatLongDate(note.date))}</CardTitle>
        <CardDescription>
          {serviceName ? `${serviceName} · ` : ""}Registrada por {note.authorName} · {formatDateTime(note.createdAt)}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        <dl className="grid gap-3 text-sm">
          {NOTE_FIELDS.filter(({ key }) => note[key]).map(({ key, label }) => (
            <div key={key}>
              <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
              <dd className="whitespace-pre-line">{note[key]}</dd>
            </div>
          ))}
        </dl>

        {note.addenda.length > 0 && (
          <ul className="grid gap-2 border-t pt-3">
            {note.addenda.map((addendum) => (
              <li key={addendum.id} className="rounded-lg border-l-2 border-amber-500 bg-amber-50/60 px-3 py-2 text-sm">
                <p className="text-xs font-medium text-amber-900">
                  Aclaración · {addendum.authorName} · {formatDateTime(addendum.createdAt)}
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
          <Button type="button" variant="ghost" size="sm" className="justify-self-start text-muted-foreground" onClick={() => setWriting(true)}>
            <MessageSquarePlus /> Añadir aclaración
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
