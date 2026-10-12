import { useState } from "react";
import { toast } from "sonner";
import { SubmitButton } from "@/components/shared/submit-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useCurrentBusiness } from "@/hooks/queries/use-account";
import { useSaveClient } from "@/hooks/queries/use-clients";
import { CLIENT_REQUIRED_FIELD_OPTIONS, clientRequiredFieldsOf } from "@/lib/constants/business";
import { getErrorMessage } from "@/lib/data";
import type { Client } from "@/types";

/** "cédula", "cédula y email", "cédula, email y teléfono". */
const listLabels = (labels: string[]) =>
  labels.length <= 1 ? (labels[0] ?? "") : `${labels.slice(0, -1).join(", ")} y ${labels.at(-1)}`;

export function ClientNotesCard({ client }: { client: Client }) {
  const saveClient = useSaveClient();
  const { data: business } = useCurrentBusiness();
  const [notes, setNotes] = useState(client.notes);
  // Si las notas guardadas cambian (p. ej. al editar el cliente desde su diálogo), el borrador
  // vuelve a partir de ellas: si no, mostraba las de antes y "Guardar" las habría restaurado.
  const [savedNotes, setSavedNotes] = useState(client.notes);
  if (savedNotes !== client.notes) {
    setSavedNotes(client.notes);
    setNotes(client.notes);
  }
  const changed = notes.trim() !== client.notes;

  const save = async () => {
    // Las notas se guardan con la ficha entera: si le falta un dato que el negocio exige (p. ej. un
    // cliente antiguo sin cédula), hay que completarlo antes, como al editarlo.
    if (!business) return;
    const required = clientRequiredFieldsOf(business);
    const missing = CLIENT_REQUIRED_FIELD_OPTIONS.filter((field) => required[field.key] && !client[field.key].trim());
    if (missing.length) {
      toast.error(
        `Para guardar las notas, completa primero con «Editar» lo que le falta: ${listLabels(missing.map((field) => field.label.toLowerCase()))}.`,
      );
      return;
    }
    try {
      const { id, name, documentId, email, phone, address, isActive } = client;
      await saveClient.mutateAsync({
        id,
        input: { name, documentId, email, phone, address, isActive, notes: notes.trim() },
      });
      toast.success("Notas guardadas");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notas</CardTitle>
        <CardDescription>Información privada sobre el cliente.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Textarea
          aria-label="Notas del cliente"
          rows={5}
          placeholder="Preferencias, antecedentes, indicaciones…"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <SubmitButton
          type="button"
          size="sm"
          className="w-full"
          disabled={!changed || !business}
          loading={saveClient.isPending}
          onClick={save}
        >
          Guardar notas
        </SubmitButton>
      </CardContent>
    </Card>
  );
}
