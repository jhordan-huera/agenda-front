import { formatAttachmentSize, HISTORY_FIELDS, SEX_OPTIONS } from "@/features/clinical/clinical-labels";
import { describeTooth } from "@/features/clinical/odontogram-labels";
import {
  BODY_MAP_VIEW_LABELS,
  COMPACT_FIELD_TYPES,
  computeBmi,
  describeBmi,
  describeClinicalValue,
  questionnaireOptionLabel,
  visibleNoteFields,
} from "@/lib/clinical-templates";
import { capitalize, formatDateTime, formatLongDate, formatNumericDate } from "@/lib/format";
import { questionnaireScore } from "@/lib/validations/clinical";
import type {
  BodyMapMark,
  ClinicalField,
  ClinicalListRow,
  ClinicalNoteData,
  ClinicalTemplateVersion,
  DataExportClinicalRecord,
  DataExportSummary,
  OdontogramValue,
} from "@/types";
import { relativeHref } from "./file-names";
import { escapeHtml as esc, htmlPage } from "./html-page";

/**
 * La historia clínica de un paciente en la descarga de los datos (spec 028): una página HTML que se abre
 * sola en el navegador y se guarda como PDF, con lo mismo que «Imprimir / PDF» (los datos del paciente,
 * los antecedentes, el consentimiento y cada evolución con sus aclaraciones) y los enlaces a sus archivos
 * dentro del ZIP. Cada campo, según su tipo y con las mismas etiquetas y formatos que la ficha
 * (clinical-templates, clinical-labels, odontogram-labels y el puntaje de los cuestionarios), en texto:
 * el odontograma, como la lista de piezas con su estado, y el mapa del cuerpo, como la lista de marcas.
 */

export interface ClinicalHtmlInput {
  record: DataExportClinicalRecord;
  /** Las versiones de formato de sus evoluciones (por id). */
  templateVersions: Record<string, ClinicalTemplateVersion>;
  business: DataExportSummary["business"];
  exportedBy: string;
  exportedAt: string;
  /** Dónde quedó cada archivo en el ZIP, relativo a la página (por id); null: no se pudo incluir. */
  attachmentPaths: Record<string, string | null>;
}

type ListField = Extract<ClinicalField, { type: "list" }>;
type QuestionnaireField = Extract<ClinicalField, { type: "questionnaire" }>;

const EMPTY = '<span class="muted">—</span>';

function listHtml(field: ListField, rows: ClinicalListRow[]): string {
  const cell = (value: ClinicalListRow[string]) => (value === null || value === undefined || value === "" ? EMPTY : esc(String(value)));
  return `<table><thead><tr>${field.columns.map((column) => `<th scope="col">${esc(column.label)}</th>`).join("")}</tr></thead>
<tbody>${rows.map((row) => `<tr>${field.columns.map((column) => `<td>${cell(row[column.id])}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
}

function questionnaireHtml(field: QuestionnaireField, answers: number[]): string {
  const { total, max, label, alerts } = questionnaireScore(field, answers);
  const answer = (index: number) =>
    answers[index] === undefined || answers[index] === null
      ? "Sin responder"
      : `<strong>${esc(questionnaireOptionLabel(field, answers[index]))}</strong> (${answers[index]})`;
  return `<p><strong>${total}/${max}</strong>${label ? ` <span class="muted">· ${esc(label)}</span>` : ""}</p>
${alerts.map((alert) => `<p class="alert">⚠ ${esc(alert)}</p>`).join("")}
${field.prompt ? `<p class="muted small">${esc(field.prompt)}</p>` : ""}
<ol class="small">${field.items.map((item, index) => `<li>${esc(item)} — ${answer(index)}</li>`).join("")}</ol>`;
}

function odontogramHtml(value: OdontogramValue): string {
  const findings = Object.entries(value).sort(([a], [b]) => a.localeCompare(b));
  if (findings.length === 0) return '<span class="muted">Sin hallazgos</span>';
  return `<ul>${findings.map(([tooth, state]) => `<li><strong>${esc(tooth)}:</strong> ${esc(describeTooth(state))}</li>`).join("")}</ul>`;
}

function bodyMapHtml(marks: BodyMapMark[]): string {
  if (marks.length === 0) return '<span class="muted">Sin marcas</span>';
  return `<ol>${marks.map((mark) => `<li>${esc(BODY_MAP_VIEW_LABELS[mark.view] ?? mark.view)}${mark.note ? ` — ${esc(mark.note)}` : ""}</li>`).join("")}</ol>`;
}

/** El valor de un campo, según su tipo. */
function valueHtml(field: ClinicalField, data: ClinicalNoteData): string {
  const value = data[field.id];
  switch (field.type) {
    case "bmi": {
      const bmi = computeBmi(field, data);
      return bmi === null ? EMPTY : esc(describeBmi(bmi));
    }
    case "list":
      return listHtml(field, value as ClinicalListRow[]);
    case "questionnaire":
      return questionnaireHtml(field, value as number[]);
    case "odontogram":
      return odontogramHtml(value as OdontogramValue);
    case "bodymap":
      return bodyMapHtml(value as BodyMapMark[]);
    default:
      return `<span class="pre">${esc(describeClinicalValue(field, value))}</span>`;
  }
}

/** Un valor que no tiene la forma de su campo (no debería pasar): se muestra tal cual, para no perderlo. */
function safeValueHtml(field: ClinicalField, data: ClinicalNoteData): string {
  try {
    return valueHtml(field, data);
  } catch {
    return `<span class="pre">${esc(JSON.stringify(data[field.id]) ?? "")}</span>`;
  }
}

/** El contenido de una evolución, como ClinicalNoteContent: sólo lo que tiene valor, los cortos en cuadrícula. */
function noteContentHtml(fields: ClinicalField[], data: ClinicalNoteData): string {
  const blocks: ClinicalField[][] = [];
  for (const field of visibleNoteFields(fields, data)) {
    const last = blocks.at(-1);
    if (COMPACT_FIELD_TYPES.has(field.type) && last && COMPACT_FIELD_TYPES.has(last[0].type)) last.push(field);
    else blocks.push([field]);
  }
  return `<div class="fields">${blocks
    .map((block) => {
      const [first] = block;
      if (first.type === "section") return `<h4>${esc(first.label)}</h4>`;
      const items = block.map((field) => `<div><dt>${esc(field.label)}</dt><dd>${safeValueHtml(field, data)}</dd></div>`).join("");
      return `<dl class="${COMPACT_FIELD_TYPES.has(first.type) ? "compact" : "fields"}">${items}</dl>`;
    })
    .join("\n")}</div>`;
}

/** La página entera de un paciente. */
export function clinicalRecordHtml(input: ClinicalHtmlInput): string {
  const { record, templateVersions, business, attachmentPaths } = input;
  const { client, profile, notes, attachments } = record;
  const timezone = business.timezone;
  const personal = [
    ["Cédula", profile?.documentId || client.documentId],
    ["Fecha de nacimiento", profile?.birthDate && formatNumericDate(profile.birthDate)],
    ["Sexo", profile?.sex && SEX_OPTIONS.find((option) => option.value === profile.sex)?.label],
    ["Tipo de sangre", profile?.bloodType],
    ["Teléfono", client.phone],
    ["Email", client.email],
    ["Dirección", client.address],
    ["Contacto de emergencia", profile?.emergencyContact],
    ["Consentimiento informado", profile?.consentDate ? `Firmado el ${formatNumericDate(profile.consentDate)}` : "No registrado"],
  ].filter((row): row is [string, string] => Boolean(row[1]));

  const noteHtml = (note: DataExportClinicalRecord["notes"][number]) => {
    const template = templateVersions[note.templateVersionId];
    return `<li>
<h3>${esc(capitalize(formatLongDate(note.date)))}${note.serviceName ? ` · ${esc(note.serviceName)}` : ""}</h3>
<p class="muted small">${esc(template?.name ?? "Evolución")} · Registrada por ${esc(note.authorName)} · ${esc(formatDateTime(note.createdAt, timezone))}</p>
${template ? noteContentHtml(template.fields, note.data) : '<p class="muted">No se pudo cargar el formato de esta evolución.</p>'}
${note.addenda
  .map(
    (addendum) =>
      `<div class="addendum"><p class="small"><strong>Aclaración · ${esc(addendum.authorName)} · ${esc(formatDateTime(addendum.createdAt, timezone))}</strong></p><p class="pre">${esc(addendum.text)}</p></div>`,
  )
  .join("\n")}
</li>`;
  };

  const attachmentHtml = (attachment: DataExportClinicalRecord["attachments"][number]) => {
    const path = attachmentPaths[attachment.id];
    const name = path ? `<a href="${esc(relativeHref(path))}">${esc(attachment.fileName)}</a>` : `<strong>${esc(attachment.fileName)}</strong>`;
    const details = [formatAttachmentSize(attachment.sizeBytes), attachment.uploadedByName, formatDateTime(attachment.createdAt, timezone)];
    return `<li>${name}${attachment.description ? ` — ${esc(attachment.description)}` : ""}
<span class="muted small">(${esc(details.join(" · "))})</span>${path ? "" : ' <span class="missing small">No se pudo incluir en la descarga: ábrelo desde la ficha del paciente.</span>'}</li>`;
  };

  const body = `<header class="top">
<div><p class="eyebrow">Historia clínica</p><h1>${esc(client.name)}</h1></div>
<div class="business"><p><strong>${esc(business.name)}</strong></p>${business.address ? `<p>${esc(business.address)}</p>` : ""}${business.phone ? `<p>${esc(business.phone)}</p>` : ""}</div>
</header>
<section>
<h2>Datos del paciente</h2>
<dl class="grid">${personal.map(([label, value]) => `<div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`).join("")}</dl>
</section>
<section>
<h2>Antecedentes</h2>
<dl class="fields">${HISTORY_FIELDS.map(({ key, label }) => `<div><dt>${esc(label)}</dt><dd class="pre">${esc(profile?.[key] || "Sin registrar")}</dd></div>`).join("")}</dl>
</section>
<section>
<h2>Evoluciones (${notes.length})</h2>
${notes.length === 0 ? '<p class="muted">Sin evoluciones registradas.</p>' : `<ol class="notes">\n${notes.map(noteHtml).join("\n")}\n</ol>`}
</section>
${attachments.length > 0 ? `<section>\n<h2>Archivos (${attachments.length})</h2>\n<ul class="files">${attachments.map(attachmentHtml).join("\n")}</ul>\n</section>` : ""}
<footer>Documento generado el ${esc(formatDateTime(input.exportedAt, timezone))} por ${esc(input.exportedBy)}, al descargar los datos de ${esc(business.name)}. Contiene datos de salud confidenciales.</footer>`;

  return htmlPage(`Historia clínica · ${client.name}`, body);
}
