import { formatCount, formatDateTime } from "@/lib/format";
import type { DataExportSummary } from "@/types";
import { escapeHtml as esc, htmlPage } from "./html-page";

/**
 * LEEME.html, en la raíz del ZIP de la descarga (spec 028): qué trae cada archivo, cómo guardar una
 * historia como PDF, la fecha de la descarga y los archivos adjuntos que no se pudieron incluir.
 */

export interface ReadmeInput {
  summary: DataExportSummary;
  /** Lo que se metió en el ZIP de verdad (puede faltar algún archivo adjunto). */
  included: { clients: number; appointments: number; clinicalRecords: number; attachments: number };
  /** Los archivos adjuntos que fallaron: de qué paciente y cuál. */
  missing: { patient: string; fileName: string }[];
}

const CLINICAL_MISSING: Record<Exclude<DataExportSummary["clinical"], "included">, string> = {
  no_access: "No trae historias clínicas: no tienes acceso a ellas. Si las necesitas, pídele al propietario que te lo habilite.",
  disabled: "No trae historias clínicas: no están activadas en el negocio.",
};

const count = (value: number, singular: string, pluralForm: string) => `${formatCount(value)} ${value === 1 ? singular : pluralForm}`;

export function readmeHtml({ summary, included, missing }: ReadmeInput): string {
  const { business } = summary;
  const agenda = summary.scope === "agenda";
  const when = formatDateTime(summary.exportedAt, business.timezone);
  const items = [
    `<li><strong>pacientes.xlsx</strong>: ${esc(count(included.clients, "paciente", "pacientes"))}, con sus datos de contacto, sus notas, si está activo, si está «Por verificar» y la fecha de alta. Tiene las columnas de la importación de pacientes de Agenda360: se puede volver a subir tal cual.</li>`,
    `<li><strong>citas.xlsx</strong>: ${esc(count(included.appointments, "cita", "citas"))}, con la fecha y la hora, los pacientes, el servicio, el profesional, el estado, la modalidad, el precio, si se pagó y las notas.</li>`,
    summary.clinical === "included"
      ? `<li><strong>historias-clinicas/</strong>: ${esc(count(included.clinicalRecords, "historia clínica", "historias clínicas"))}, una página por paciente con sus antecedentes, el consentimiento y todas sus evoluciones con sus aclaraciones, como «Imprimir / PDF».${
          summary.counts.attachments > 0
            ? ` En <strong>historias-clinicas/archivos/</strong>, los archivos originales de cada paciente (${esc(count(included.attachments, "archivo", "archivos"))}): PDF y fotos.`
            : ""
        }</li>`
      : `<li>${esc(CLINICAL_MISSING[summary.clinical])}</li>`,
  ];
  const body = `<header class="top">
<div><p class="eyebrow">Agenda360</p><h1>${esc(agenda ? `Tus datos en ${business.name}` : `Los datos de ${business.name}`)}</h1></div>
</header>
<p>Descargados el ${esc(when)} por ${esc(summary.exportedBy)}.${agenda ? " Sólo trae lo de tu agenda: tus pacientes, tus citas y las historias de esos pacientes." : ""}</p>
<section>
<h2>Qué trae</h2>
<ul>${items.join("\n")}</ul>
</section>
${
  summary.clinical === "included"
    ? `<section>
<h2>Cómo guardar una historia como PDF</h2>
<ol>
<li>Abre la carpeta <strong>historias-clinicas</strong> y haz doble clic en la página del paciente: se abre en el navegador, sin internet.</li>
<li>Elige <strong>Imprimir</strong> (Ctrl + P en Windows, ⌘ + P en Mac).</li>
<li>Como destino o impresora, elige <strong>Guardar como PDF</strong>.</li>
</ol>
<p class="muted small">Los enlaces de cada historia abren sus archivos, siempre que mantengas juntas las carpetas del ZIP.</p>
</section>`
    : ""
}
${
  missing.length > 0
    ? `<section>
<h2>Archivos que no se pudieron incluir (${missing.length})</h2>
<p>No se pudieron descargar. Puedes volver a descargar los datos o abrirlos desde la ficha de cada paciente.</p>
<ul>${missing.map((file) => `<li>${esc(file.patient)}: ${esc(file.fileName)}</li>`).join("")}</ul>
</section>`
    : ""
}
<footer>Contiene datos personales${summary.clinical === "included" ? " y de salud" : ""} de los pacientes: guárdalo en un lugar seguro y no lo compartas. La descarga quedó registrada en la actividad del negocio.</footer>`;
  return htmlPage(`Léeme · ${business.name}`, body);
}
