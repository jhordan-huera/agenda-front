import { ArrowLeft, Lock, Plus, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import { toast } from "sonner";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { FormField } from "@/components/shared/form-field";
import { PageTitle } from "@/components/shared/page-title";
import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { usePermissions } from "@/features/auth/use-permissions";
import { useClinicalAccess } from "@/features/clinical/use-clinical-access";
import {
  FIELD_TYPES,
  fromDraft,
  newFieldDraft,
  questionnaireDraft,
  toDraft,
  type FieldDraft,
} from "@/features/clinical/templates/template-editor-model";
import { TemplateFieldEditor } from "@/features/clinical/templates/template-field-editor";
import { TemplatePreview } from "@/features/clinical/templates/template-preview";
import { useSubscription } from "@/hooks/queries/use-account";
import { useClinicalTemplate, useClinicalTemplates, useSaveClinicalTemplate } from "@/hooks/queries/use-clinical";
import { getPlan } from "@/lib/constants/plans";
import { getErrorMessage } from "@/lib/data";
import { clinicalTemplateInputSchema } from "@/lib/validations/clinical";
import { validate } from "@/lib/validations/validate";
import type { ClinicalField, ClinicalTemplate } from "@/types";

/** Crear (desde cero o duplicando uno de la plataforma) o editar un formato propio. */
export default function ClinicalTemplateEditorPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const from = searchParams.get("from") ?? undefined;
  const clinicalAccess = useClinicalAccess();
  const { can } = usePermissions();
  const subscription = useSubscription();
  const source = useClinicalTemplate(id ?? from);
  const all = useClinicalTemplates(clinicalAccess, true);

  if (!clinicalAccess || !can("business.manage")) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="Sólo el propietario gestiona los formatos"
        description="Los formatos de historia clínica se crean y editan desde la cuenta del propietario del negocio."
      />
    );
  }
  if ((id || from) && source.isError) return <ErrorState onRetry={() => source.refetch()} />;
  if (((id || from) && source.isPending) || subscription.isPending || all.isPending) return <Skeleton className="h-[600px] rounded-xl" />;
  if (id && source.data?.businessId === null) {
    return (
      <EmptyState
        icon={Lock}
        title="Los formatos de la plataforma no se editan"
        description="Duplícalo para adaptarlo a tu manera de trabajar."
        action={
          <Button asChild>
            <Link to={`/dashboard/clinical-templates/new?from=${id}`}>Duplicar y adaptar</Link>
          </Button>
        }
      />
    );
  }

  // Cuestionarios validados (PHQ-9, GAD-7…) de los formatos de la plataforma, para añadirlos tal cual.
  const questionnaires = [
    ...new Map(
      (all.data ?? [])
        .filter((template) => template.businessId === null)
        .flatMap((template) => template.fields)
        .filter((field): field is Extract<ClinicalField, { type: "questionnaire" }> => field.type === "questionnaire")
        .map((field) => [field.id, field]),
    ).values(),
  ];

  return (
    <TemplateEditor
      key={id ?? from ?? "new"}
      editingId={id}
      source={source.data}
      canEdit={Boolean(subscription.data && getPlan(subscription.data.plan).customClinicalTemplates)}
      questionnaires={questionnaires}
    />
  );
}

interface EditorErrors {
  name?: string;
  description?: string;
  form?: string;
  fields: Record<number, string>;
}

function TemplateEditor({
  editingId,
  source,
  canEdit,
  questionnaires,
}: {
  editingId?: string;
  source?: ClinicalTemplate;
  canEdit: boolean;
  questionnaires: Extract<ClinicalField, { type: "questionnaire" }>[];
}) {
  const navigate = useNavigate();
  const save = useSaveClinicalTemplate();
  const editing = Boolean(editingId);
  const [name, setName] = useState(() => (source ? (editing ? source.name : `${source.name} (mi versión)`) : ""));
  const [description, setDescription] = useState(source?.description ?? "");
  const [drafts, setDrafts] = useState<FieldDraft[]>(() =>
    source
      ? source.fields.map((field) => toDraft(field, editing))
      : [{ ...newFieldDraft("textarea"), label: "Motivo de consulta", required: true }],
  );
  const [errors, setErrors] = useState<EditorErrors>({ fields: {} });

  const fields = drafts.map(fromDraft);
  const update = (index: number, patch: Partial<FieldDraft>) =>
    setDrafts((current) => current.map((draft, i) => (i === index ? { ...draft, ...patch } : draft)));
  const move = (index: number, direction: -1 | 1) =>
    setDrafts((current) => {
      const next = [...current];
      [next[index], next[index + direction]] = [next[index + direction], next[index]];
      return next;
    });
  const add = (draft: FieldDraft) => setDrafts((current) => [...current, draft]);

  const submit = async () => {
    const result = validate(clinicalTemplateInputSchema, { name, description, fields });
    if (!result.success) {
      const next: EditorErrors = { fields: {} };
      for (const [path, message] of Object.entries(result.errors)) {
        const [root, index] = path.split(".");
        if (root === "fields" && index !== undefined) next.fields[Number(index)] ??= message;
        else if (root === "name") next.name = message;
        else if (root === "description") next.description = message;
        else next.form ??= message;
      }
      setErrors(next);
      toast.error("Revisa los campos marcados.");
      requestAnimationFrame(() => document.querySelector("[data-field-error=true], [aria-invalid=true]")?.scrollIntoView({ block: "center", behavior: "smooth" }));
      return;
    }
    setErrors({ fields: {} });
    try {
      const saved = await save.mutateAsync({ id: editingId, input: result.data });
      toast.success(editing ? `Formato guardado (versión ${saved.version})` : "Formato creado");
      navigate("/dashboard/clinical-templates");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const title = editing ? `Editar «${source?.name}»` : source ? `Adaptar «${source.name}»` : "Nuevo formato";

  return (
    <div className="space-y-6">
      <PageTitle title={title} />
      <Button asChild variant="ghost" className="-ml-2">
        <Link to="/dashboard/clinical-templates">
          <ArrowLeft /> Formatos de historia clínica
        </Link>
      </Button>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="text-sm text-muted-foreground">
            {editing
              ? `Versión ${source?.version}. Al guardar cambios se crea la siguiente: las evoluciones ya escritas no cambian.`
              : "Define qué se registra en cada consulta. Podrás cambiarlo cuando quieras."}
          </p>
        </div>
        <SubmitButton type="button" size="lg" loading={save.isPending} disabled={!canEdit} onClick={submit}>
          {editing ? "Guardar cambios" : "Crear formato"}
        </SubmitButton>
      </div>

      {!canEdit && (
        <p className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <Lock className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            Crear y adaptar formatos está en los planes Pro y Business.{" "}
            <Link to="/dashboard/settings?tab=suscripcion" className="font-medium underline">
              Ver planes
            </Link>
          </span>
        </p>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="grid gap-4">
          <Card>
            <CardContent className="grid gap-4 pt-6">
              <FormField label="Nombre del formato" error={errors.name}>
                {(field) => <Input {...field} placeholder="Ej.: Control periodontal" value={name} onChange={(e) => setName(e.target.value)} />}
              </FormField>
              <FormField label="Descripción" optional error={errors.description}>
                {(field) => (
                  <Textarea
                    {...field}
                    rows={2}
                    placeholder="Para qué consultas es"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                )}
              </FormField>
            </CardContent>
          </Card>

          <section aria-labelledby="fields-heading" className="grid gap-3">
            <h2 id="fields-heading" className="font-semibold">
              Campos <span className="font-normal text-muted-foreground">({drafts.length})</span>
            </h2>
            <ol className="grid gap-3">
              {drafts.map((draft, index) => (
                <TemplateFieldEditor
                  key={draft.key}
                  draft={draft}
                  index={index}
                  total={drafts.length}
                  numberFields={drafts.filter((d) => d.type === "number")}
                  error={errors.fields[index]}
                  onChange={(patch) => update(index, patch)}
                  onMove={(direction) => move(index, direction)}
                  onRemove={() => setDrafts((current) => current.filter((_, i) => i !== index))}
                />
              ))}
            </ol>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="outline" className="justify-self-start">
                  <Plus /> Añadir campo
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="max-h-96 w-72 overflow-y-auto">
                {FIELD_TYPES.map(({ type, label, icon: Icon }) => (
                  <DropdownMenuItem key={type} onSelect={() => add(newFieldDraft(type))}>
                    <Icon /> {label}
                  </DropdownMenuItem>
                ))}
                {questionnaires.length > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>Escalas validadas</DropdownMenuLabel>
                    {questionnaires.map((questionnaire) => (
                      <DropdownMenuItem
                        key={questionnaire.id}
                        disabled={drafts.some((draft) => draft.id === questionnaire.id)}
                        onSelect={() => add(questionnaireDraft(questionnaire))}
                      >
                        {questionnaire.label}
                      </DropdownMenuItem>
                    ))}
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            {errors.form && (
              <p className="text-sm font-medium text-destructive" role="alert">
                {errors.form}
              </p>
            )}
          </section>
        </div>

        <Card className="lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto">
          <CardHeader>
            <CardTitle>Vista previa</CardTitle>
            <CardDescription>Así lo verás al registrar una evolución. Puedes probarlo: no se guarda nada.</CardDescription>
          </CardHeader>
          <CardContent>
            <TemplatePreview fields={fields} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
