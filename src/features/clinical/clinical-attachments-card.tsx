import { FileImage, FileText, Lock, Paperclip, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useBusinessId } from "@/features/auth/use-session";
import { openClinicalAttachment, useUploadClinicalAttachment } from "@/hooks/queries/use-clinical";
import { getErrorMessage } from "@/lib/data";
import { formatDateTime } from "@/lib/format";
import { CLINICAL_ATTACHMENT_MAX_BYTES } from "@/lib/validations/clinical";
import type { ClinicalAttachment, ClinicalRecord } from "@/types";

const ACCEPT = ".jpg,.jpeg,.png,.webp,.heic,.pdf,image/jpeg,image/png,image/webp,image/heic,application/pdf";

function formatSize(bytes: number): string {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;
}

function AttachmentRow({ attachment }: { attachment: ClinicalAttachment }) {
  const businessId = useBusinessId();
  const Icon = attachment.contentType === "application/pdf" ? FileText : FileImage;
  const open = async () => {
    try {
      await openClinicalAttachment(businessId, attachment.id);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };
  return (
    <li className="flex items-start gap-3 py-2.5">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-primary">
        <Icon className="size-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium" title={attachment.fileName}>
          {attachment.fileName}
        </p>
        {attachment.description && <p className="text-sm text-muted-foreground">{attachment.description}</p>}
        <p className="text-xs text-muted-foreground">
          {formatSize(attachment.sizeBytes)} · {attachment.uploadedByName} · {formatDateTime(attachment.createdAt)}
        </p>
      </div>
      <Button type="button" variant="outline" size="sm" onClick={open}>
        Ver
      </Button>
    </li>
  );
}

/** Archivos del paciente: radiografías, exámenes, fotos, consentimientos escaneados. */
export function ClinicalAttachmentsCard({ clientId, record }: { clientId: string; record: ClinicalRecord }) {
  const upload = useUploadClinicalAttachment(clientId);
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [description, setDescription] = useState("");
  const [progress, setProgress] = useState<number | null>(null);

  const submit = async () => {
    if (!file) return;
    if (file.size > CLINICAL_ATTACHMENT_MAX_BYTES) {
      toast.error("El archivo supera los 15 MB.");
      return;
    }
    setProgress(0);
    try {
      await upload.mutateAsync({ file, description, onProgress: setProgress });
      toast.success("Archivo subido");
      setFile(null);
      setDescription("");
      if (inputRef.current) inputRef.current.value = "";
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setProgress(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Paperclip className="size-4 text-primary" aria-hidden /> Archivos
        </CardTitle>
        <CardDescription>Radiografías, exámenes, fotos o consentimientos escaneados. No se pueden borrar.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {record.attachmentAccess === "available" ? (
          <div className="grid gap-2 rounded-lg border border-dashed p-3">
            <Input
              ref={inputRef}
              type="file"
              accept={ACCEPT}
              aria-label="Archivo"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            {file && (
              <>
                <Input
                  aria-label="Descripción del archivo"
                  placeholder="Descripción (opcional): radiografía panorámica, examen de sangre…"
                  maxLength={200}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
                {progress !== null && <Progress value={progress} aria-label="Progreso de la subida" />}
                <SubmitButton type="button" size="sm" className="justify-self-start" loading={upload.isPending} onClick={submit}>
                  <Upload /> Subir {formatSize(file.size)}
                </SubmitButton>
              </>
            )}
            <p className="text-xs text-muted-foreground">JPG, PNG, WebP, HEIC o PDF. Máximo 15 MB.</p>
          </div>
        ) : (
          <p className="flex items-start gap-2 rounded-lg bg-muted/60 px-3 py-2 text-sm text-muted-foreground">
            <Lock className="mt-0.5 size-4 shrink-0" aria-hidden />
            {record.attachmentAccess === "upgrade" ? (
              <span>
                Subir archivos está en los planes Pro y Business.{" "}
                <Link to="/dashboard/settings?tab=suscripcion" className="font-medium text-primary hover:underline">
                  Ver planes
                </Link>
              </span>
            ) : (
              <span>El almacenamiento de archivos aún no está configurado. Escribe a soporte.</span>
            )}
          </p>
        )}
        {record.attachments.length > 0 ? (
          <ul className="divide-y">
            {record.attachments.map((attachment) => (
              <AttachmentRow key={attachment.id} attachment={attachment} />
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Sin archivos todavía.</p>
        )}
      </CardContent>
    </Card>
  );
}
