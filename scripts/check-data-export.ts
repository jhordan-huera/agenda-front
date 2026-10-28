/**
 * La descarga de los datos (spec 028), de ida y vuelta: `npm run check:data-export`.
 *
 * - pacientes.xlsx: la importación de pacientes (guessColumns) reconoce sola los títulos de sus columnas de
 *   datos; y el Excel que escribe la descarga, leído con el mismo código que la pantalla de importar
 *   (readSpreadsheet → findHeaderRow → rowFromCells → classifyImportRows), devuelve los mismos pacientes
 *   y se importa sin cambios (en un negocio vacío entran todos; en el mismo negocio, todos «ya existían»).
 * - clinical-html.ts: una evolución con cada tipo de campo de los formatos (texto, número con unidad,
 *   escala, opciones, sí/no, fecha, lista con columnas, cuestionario con total, interpretación, alertas
 *   y respuestas, IMC, odontograma, mapa del cuerpo y secciones) se pinta entera, la página es
 *   independiente y todo el texto va escapado: ningún `<script>` de los datos llega a la página.
 * - LEEME.html y los nombres de archivo seguros.
 *
 * Node ejecuta los .ts directamente; el gancho de abajo resuelve el alias `@/` y los imports sin
 * extensión de src/ como lo hace Vite. Sale con código 1 si algo falla.
 */
import { existsSync } from "node:fs";
import { registerHooks } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SRC = path.resolve(import.meta.dirname, "../src");
registerHooks({
  resolve(specifier, context, nextResolve) {
    const parent = context.parentURL?.startsWith("file:") ? fileURLToPath(context.parentURL) : "";
    const base = specifier.startsWith("@/")
      ? path.join(SRC, specifier.slice(2))
      : specifier.startsWith(".") && parent.startsWith(SRC) && !/\.[cm]?[jt]sx?$/.test(specifier)
        ? path.resolve(path.dirname(parent), specifier)
        : null;
    if (!base) return nextResolve(specifier, context);
    const found = [`${base}.ts`, path.join(base, "index.ts")].find((candidate) => existsSync(candidate));
    // Los .tsx (componentes) no se pueden ejecutar con Node: lo que se prueba aquí no debe depender de ellos.
    if (!found) throw new Error(`${specifier} (desde ${path.relative(SRC, parent)}): no es un .ts de src/.`);
    return nextResolve(pathToFileURL(found).href, context);
  },
});

const { classifyImportRows, findHeaderRow, guessColumns, rowFromCells } = await import("../src/lib/validations/client-import.ts");
const { DEFAULT_CLIENT_REQUIRED_FIELDS } = await import("../src/lib/constants/business.ts");
const { readSpreadsheet } = await import("../src/features/clients/import/read-spreadsheet.ts");
const { CLIENT_IMPORT_HEADERS, CLIENT_SHEET_HEADERS, clientRows, xlsxFile, CLIENT_COLUMN_WIDTHS } = await import(
  "../src/features/data-export/sheets.ts"
);
const { clinicalRecordHtml } = await import("../src/features/data-export/clinical-html.ts");
const { readmeHtml } = await import("../src/features/data-export/readme-html.ts");
const { patientFileName, safeFileName, splitExtension, uniqueNames } = await import("../src/features/data-export/file-names.ts");
type ClinicalField = import("../src/types/index.ts").ClinicalField;
type DataExportClient = import("../src/types/index.ts").DataExportClient;
type DataExportSummary = import("../src/types/index.ts").DataExportSummary;

let failures = 0;
const ok = (cond: unknown, label: string, extra?: unknown) => {
  if (cond) console.log("  ✓", label);
  else {
    failures++;
    console.log("  ✗", label, extra === undefined ? "" : JSON.stringify(extra).slice(0, 600));
  }
};

const TIMEZONE = "America/Guayaquil";
const XSS = '<script>alert("x")</script>';

console.log("pacientes.xlsx: los títulos");
const guessed = guessColumns(CLIENT_SHEET_HEADERS);
ok(
  JSON.stringify(guessed.slice(0, CLIENT_IMPORT_HEADERS.length)) === JSON.stringify(["name", "documentId", "email", "phone", "address", "notes"]),
  `la importación reconoce sola las columnas de datos (${CLIENT_IMPORT_HEADERS.join(", ")})`,
  guessed,
);
ok(guessed.slice(CLIENT_IMPORT_HEADERS.length).every((target) => target === "ignore"), "y deja en «No importar» Activo, Por verificar y Fecha de alta", guessed);
ok(findHeaderRow([[...CLIENT_SHEET_HEADERS]]) === 0, "la fila de títulos es la primera");

console.log("pacientes.xlsx: de ida y vuelta");
// Cédulas ecuatorianas válidas que empiezan por 0 (Excel se lo quitaría a un número).
const clients: DataExportClient[] = [
  {
    id: "1", name: "Lucía Benítez Ñúñez", documentId: "0912345675", email: "lucia.benitez@correo.ec", phone: "0991234567",
    address: "Av. 9 de Octubre 1520, Guayaquil", notes: "Alérgica a la penicilina.\nPrefiere las mañanas.", isActive: true,
    pendingVerification: false, createdAt: "2026-03-05T03:30:00.000Z",
  },
  {
    id: "2", name: "Andrés O'Connor", documentId: "1710034065", email: "andres@correo.ec", phone: "+593 98 765 4321",
    address: "", notes: "", isActive: false, pendingVerification: false, createdAt: "2026-10-01T15:00:00.000Z",
  },
  {
    id: "3", name: "Reserva Por Verificar", documentId: "", email: "verificar@correo.ec", phone: "0987654321",
    address: "", notes: "", isActive: true, pendingVerification: true, createdAt: "2026-10-19T12:00:00.000Z",
  },
];
const xlsx = await xlsxFile(clientRows(clients, TIMEZONE), "Pacientes", CLIENT_COLUMN_WIDTHS);
ok(xlsx.length > 0 && xlsx[0] === 0x50 && xlsx[1] === 0x4b, "write-excel-file escribe el .xlsx (un ZIP)", xlsx.length);
const { sheets } = await readSpreadsheet(new File([xlsx as Uint8Array<ArrayBuffer>], "pacientes.xlsx"));
const rows = sheets[0]?.rows ?? [];
const headerIndex = findHeaderRow(rows);
ok(sheets.length === 1 && sheets[0].name === "Pacientes" && headerIndex === 0, "la importación lo lee: una hoja «Pacientes» con los títulos arriba", { sheets: sheets.map((s) => s.name), headerIndex });
const columns = guessColumns(rows[headerIndex] ?? []);
const back = rows.slice(headerIndex + 1).map((cells, index) => rowFromCells(cells, rows[headerIndex], columns, index + 2));
const sorted = clients.toSorted((a, b) => a.name.localeCompare(b.name, "es"));
const same = back.length === sorted.length && back.every((row, i) => {
  const client = sorted[i];
  return row.name === client.name && row.documentId === client.documentId && row.email === client.email && row.phone === client.phone &&
    row.address === client.address && row.notes === client.notes;
});
ok(same, "devuelve los mismos pacientes: nombre, cédula (con su 0), email, teléfono, dirección y notas de varias líneas", back);
const extras = Object.fromEntries(rows.slice(1).map((cells) => [cells[0], cells.slice(6).join(" | ")]));
ok(
  extras["Lucía Benítez Ñúñez"] === "Sí | No | 04/03/2026" && extras["Andrés O'Connor"] === "No | No | 01/10/2026" &&
    extras["Reserva Por Verificar"] === "Sí | Sí | 19/10/2026",
  "Activo, Por verificar y la fecha de alta en la zona del negocio (las 03:30 UTC del 5 de marzo son el 4 en Guayaquil)",
  extras,
);
const fresh = classifyImportRows(back, { required: DEFAULT_CLIENT_REQUIRED_FIELDS, timezone: TIMEZONE, existing: [], remaining: null, allowIncomplete: true });
ok(fresh.created === clients.length && fresh.errors.length === 0, "en un negocio vacío se importan todos, sin errores", fresh);
const again = classifyImportRows(back, {
  required: DEFAULT_CLIENT_REQUIRED_FIELDS,
  timezone: TIMEZONE,
  existing: clients.map((client) => ({ id: client.id, documentId: client.documentId, name: client.name, email: client.email, phone: client.phone })),
  remaining: null,
  allowIncomplete: true,
});
ok(again.created === 0 && again.existing.length === clients.length, "y en el mismo negocio, todos «ya existían»: no se cambia nada", again);

console.log("clinical-html.ts: cada tipo de campo");
const fields: ClinicalField[] = [
  { id: "s1", type: "section", label: `Motivo ${XSS}` },
  { id: "reason", type: "text", label: "Motivo de consulta" },
  { id: "story", type: "textarea", label: "Evolución" },
  { id: "weight", type: "number", label: "Peso", unit: "kg" },
  { id: "height", type: "number", label: "Talla", unit: "cm" },
  { id: "pain", type: "scale", label: "Dolor", min: 0, max: 10 },
  { id: "area", type: "select", label: "Zona", options: ["Lumbar", "Cervical"] },
  { id: "habits", type: "multiselect", label: "Hábitos", options: ["Fuma", "Deporte", "Café"] },
  { id: "pregnant", type: "boolean", label: "Embarazo" },
  { id: "next", type: "date", label: "Próximo control" },
  { id: "s2", type: "section", label: "Tratamiento" },
  { id: "recipe", type: "list", label: "Receta", columns: [{ id: "drug", label: "Medicamento", type: "text" }, { id: "qty", label: "Cantidad", type: "number" }] },
  {
    id: "phq", type: "questionnaire", label: "PHQ-2", prompt: "Durante las últimas 2 semanas…",
    items: ["Poco interés en hacer cosas", "Sentirse triste"],
    options: [{ label: "Nunca", points: 0 }, { label: "Varios días", points: 1 }, { label: "Casi todos los días", points: 3 }],
    ranges: [{ min: 0, max: 2, label: "Mínima" }, { min: 3, max: 6, label: "Moderada" }],
    alerts: [{ item: 1, minPoints: 3, message: "Revisar el ánimo en la próxima sesión" }],
  },
  { id: "bmi", type: "bmi", label: "IMC", weightField: "weight", heightField: "height" },
  { id: "teeth", type: "odontogram", label: "Odontograma" },
  { id: "map", type: "bodymap", label: "Mapa del dolor" },
  { id: "empty", type: "text", label: "Campo sin valor" },
  { id: "s3", type: "section", label: "Sección vacía" },
  { id: "empty2", type: "textarea", label: "Otro sin valor" },
];
const html = clinicalRecordHtml({
  record: {
    client: { id: "p1", name: `Lucía ${XSS}`, documentId: "0912345675", email: "lucia@correo.ec", phone: "0991234567", address: "Calle <b>1</b>" },
    profile: {
      businessId: "b", clientId: "p1", documentId: "0912345675", birthDate: "1988-04-12", sex: "female", bloodType: "O+",
      emergencyContact: "Mamá · 0990000000", allergies: `Penicilina ${XSS}`, conditions: "", medications: "", surgeries: "", familyHistory: "",
      consentDate: "2026-01-10", updatedAt: "2026-01-10T15:00:00.000Z", updatedByName: "Ricardo Paredes",
    },
    notes: [
      {
        id: "n1", businessId: "b", clientId: "p1", appointmentId: "a1", date: "2026-03-05", templateVersionId: "v1",
        data: {
          reason: `Dolor ${XSS}`,
          story: "Primera línea\nSegunda línea",
          weight: 72,
          height: 170,
          pain: 7,
          area: "Lumbar",
          habits: ["Fuma", "Café"],
          pregnant: false,
          next: "2026-04-01",
          recipe: [{ drug: `Ibuprofeno ${XSS}`, qty: 20 }, { drug: "Paracetamol", qty: null }],
          phq: [1, 3],
          teeth: { "46": { surfaces: { O: "obturado" } }, "18": { whole: "ausente", note: `Nota ${XSS}` } },
          map: [{ view: "back", x: 0.5, y: 0.4, note: `Contractura ${XSS}` }, { view: "front", x: 0.3, y: 0.2, note: "" }],
        },
        authorId: "u1", authorName: "Dra. Valeria Cruz", createdAt: "2026-03-05T15:20:00.000Z", serviceName: "Consulta odontológica",
        addenda: [{ id: "ad1", text: `Aclaración ${XSS}`, authorId: "u1", authorName: "Dra. Valeria Cruz", createdAt: "2026-03-06T14:00:00.000Z" }],
      },
    ],
    attachments: [
      { id: "f1", clientId: "p1", fileName: "Radiografía #1.pdf", contentType: "application/pdf", sizeBytes: 2_516_582, description: `Panorámica ${XSS}`, uploadedByName: "Ricardo Paredes", createdAt: "2026-03-05T16:00:00.000Z" },
      { id: "f2", clientId: "p1", fileName: `Foto ${XSS}.jpg`, contentType: "image/jpeg", sizeBytes: 300_000, description: "", uploadedByName: "Ricardo Paredes", createdAt: "2026-03-05T16:05:00.000Z" },
    ],
  },
  templateVersions: { v1: { id: "v1", templateId: "t1", name: `Formato ${XSS}`, version: 1, fields } },
  business: { name: `Clínica ${XSS}`, slug: "clinica", timezone: TIMEZONE, currency: "USD", address: "Av. Siempre Viva", phone: "042000000" },
  exportedBy: `Ricardo ${XSS}`,
  exportedAt: "2026-10-20T20:00:00.000Z",
  attachmentPaths: { f1: "archivos/Lucía - 0912345675/Radiografía #1.pdf", f2: null },
});
ok(!/<script/i.test(html) && (html.match(/&lt;script&gt;/g) ?? []).length >= 14, "todo el texto va escapado: ningún <script> de los datos llega a la página", (html.match(/&lt;script&gt;/g) ?? []).length);
ok(!html.includes("Calle <b>1</b>") && html.includes("Calle &lt;b&gt;1&lt;/b&gt;"), "tampoco otras etiquetas");
ok(
  html.startsWith("<!doctype html>") && html.includes('<meta charset="utf-8">') && html.includes("<style>") && !/<link|\ssrc=|<script/i.test(html),
  "una página independiente: UTF-8, los estilos dentro y nada de afuera",
);
ok(html.includes("color-scheme: light") && html.includes("@media print"), "clara y para imprimir");
const has = (label: string, ...needles: string[]) => ok(needles.every((needle) => html.includes(needle)), label, needles.filter((needle) => !html.includes(needle)));
has("los datos del paciente, el consentimiento y los antecedentes", "Historia clínica", "0912345675", "12/04/1988", "Femenino", "O+", "Firmado el 10/01/2026", "Alergias", "Penicilina &lt;script&gt;", "Sin registrar");
has("la evolución: fecha, servicio, formato, autor", "Jueves, 5 de marzo de 2026 · Consulta odontológica", "Formato &lt;script&gt;", "Registrada el ", " por Dra. Valeria Cruz");
has("texto y texto largo (con sus saltos de línea)", "Dolor &lt;script&gt;", 'class="pre">Primera línea\nSegunda línea');
has("número con su unidad", "72 kg", "170 cm");
has("escala", "7/10");
has("opción y varias opciones", ">Lumbar<", "Fuma, Café");
has("sí/no", ">No<");
has("fecha", "01/04/2026");
has("lista con sus columnas", "<th scope=\"col\">Medicamento</th>", "<th scope=\"col\">Cantidad</th>", "Ibuprofeno &lt;script&gt;", "<td>20</td>", '<td><span class="muted">—</span></td>');
has("cuestionario: total, interpretación, alerta y respuestas", "<strong>4/6</strong>", "· Moderada", "Revisar el ánimo en la próxima sesión", "Durante las últimas 2 semanas…", "Poco interés en hacer cosas — <strong>Varios días</strong> (1)", "Sentirse triste — <strong>Casi todos los días</strong> (3)");
has("IMC calculado de peso y talla", "24,9 · Normal");
has("odontograma: piezas y estado", "<strong>18:</strong> Ausente · Nota &lt;script&gt;", "<strong>46:</strong> Obturación (oclusal)");
has("mapa del cuerpo: vistas y notas", "<li>Espalda — Contractura &lt;script&gt;", "<li>Frente</li>");
has("secciones", "<h4>Motivo &lt;script&gt;", "<h4>Tratamiento</h4>");
ok(!html.includes("Campo sin valor") && !html.includes("Sección vacía"), "lo que no tiene valor no sale (como en la ficha)");
has("las aclaraciones", "Aclaración · Dra. Valeria Cruz", "Aclaración &lt;script&gt;");
has(
  "los archivos: el incluido con su enlace relativo y el que falló, avisado",
  'href="archivos/Luc%C3%ADa%20-%200912345675/Radiograf%C3%ADa%20%231.pdf"',
  "2,4 MB",
  "No se pudo incluir en la descarga",
);
has("el pie: cuándo, quién y que es confidencial", "Ricardo &lt;script&gt;", "Contiene datos de salud confidenciales");
let broken = "";
try {
  broken = clinicalRecordHtml({
    record: {
      client: { id: "p2", name: "Datos raros", documentId: "", email: "", phone: "", address: "" },
      profile: null,
      notes: [{ id: "n2", businessId: "b", clientId: "p2", appointmentId: null, date: "2026-03-05", templateVersionId: "v1", data: { recipe: "no es una lista", teeth: 5 } as never, authorId: "u", authorName: "A", createdAt: "2026-03-05T15:20:00.000Z", serviceName: null, addenda: [] }],
      attachments: [],
    },
    templateVersions: { v1: { id: "v1", templateId: "t1", name: "F", version: 1, fields } },
    business: { name: "B", slug: "b", timezone: TIMEZONE, currency: "USD", address: "", phone: "" },
    exportedBy: "R",
    exportedAt: "2026-10-20T20:00:00.000Z",
    attachmentPaths: {},
  });
} catch (error) {
  broken = `ERROR ${error}`;
}
ok(broken.includes("no es una lista") && !broken.startsWith("ERROR"), "un valor con otra forma no rompe la página: se muestra tal cual", broken.slice(0, 200));

console.log("LEEME.html y los nombres de archivo");
const summary: DataExportSummary = {
  scope: "business",
  business: { name: `Clínica ${XSS}`, slug: "clinica", timezone: TIMEZONE, currency: "USD", address: "", phone: "" },
  exportedBy: "Ricardo Paredes",
  exportedAt: "2026-10-20T20:00:00.000Z",
  clinical: "included",
  counts: { clients: 1250, appointments: 3400, clinicalRecords: 85, attachments: 40 },
};
const readme = readmeHtml({ summary, included: { ...summary.counts, attachments: 39 }, missing: [{ patient: `Ana ${XSS}`, fileName: "rx.pdf" }] });
ok(!/<script/i.test(readme), "el LEEME escapa todo");
ok(
  ["pacientes.xlsx", "1.250 pacientes", "citas.xlsx", "3.400 citas", "85 historias clínicas", "39 archivos", "Guardar como PDF", "Archivos que no se pudieron incluir (1)", "rx.pdf", "20 oct 2026"].every((text) => readme.includes(text)),
  "dice qué trae cada archivo, cómo guardar una historia como PDF, la fecha y los archivos que faltaron",
);
ok(
  readmeHtml({ summary: { ...summary, scope: "agenda", clinical: "no_access" }, included: summary.counts, missing: [] }).includes("no tienes acceso"),
  "sin acceso clínico, el LEEME lo dice",
);
ok(safeFileName('Ana/Lucía: "x"? <y>|z*', "P") === "Ana Lucía x y z", "los nombres pierden lo que los sistemas no aceptan", safeFileName('Ana/Lucía: "x"? <y>|z*', "P"));
ok(safeFileName("CON", "P") === "CON_" && safeFileName(" ... ", "Paciente") === "Paciente" && safeFileName("Fin.", "P") === "Fin", "ni nombres reservados de Windows, ni vacíos, ni con punto al final");
ok(patientFileName({ name: "Lucía Benítez", documentId: "0912345675" }) === "Lucía Benítez - 0912345675" && patientFileName({ name: "Sin Cédula", documentId: "" }) === "Sin Cédula", "cada historia lleva el nombre y la cédula del paciente");
const names = uniqueNames();
const given = [names("Ana", ".html"), names("ana", ".html"), names("Ana", ".html"), names("Ana", ".pdf")];
ok(JSON.stringify(given) === JSON.stringify(["Ana.html", "ana (2).html", "Ana (3).html", "Ana.pdf"]), "los repetidos se numeran, sin distinguir mayúsculas", given);
ok(JSON.stringify(splitExtension("Radiografía final.PDF")) === JSON.stringify(["Radiografía final", ".pdf"]) && splitExtension("sin-extension")[1] === "", "la extensión se separa del nombre");

if (failures) {
  console.error(`\n${failures} comprobación(es) fallaron`);
  process.exit(1);
}
console.log("\nTodo bien: pacientes.xlsx se vuelve a importar y las historias se pintan enteras y escapadas.");
