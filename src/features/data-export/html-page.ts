/**
 * Las páginas HTML del ZIP de la descarga (spec 028): las historias clínicas y el LEEME. Cada una se abre
 * sola desde el disco, sin internet: UTF-8, los estilos dentro, claros y pensados para imprimir o guardar
 * como PDF (constitución, principio VII: lo impreso y los archivos siguen claros). Todo el texto que viene
 * de los datos pasa por `escapeHtml`.
 */

const ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

/** El texto, seguro dentro de una etiqueta o de un atributo entre comillas. */
export const escapeHtml = (text: string) => text.replace(/[&<>"']/g, (char) => ESCAPES[char]);

const STYLES = `
:root { color-scheme: light; }
* { box-sizing: border-box; }
body { margin: 0; background: #f4f5f8; color: #1f2430; font: 14px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
main { max-width: 820px; margin: 24px auto; padding: 32px; background: #fff; border: 1px solid #e3e5ec; border-radius: 12px; }
h1 { margin: 4px 0 0; font-size: 24px; line-height: 1.25; }
h2 { margin: 28px 0 10px; font-size: 16px; }
h3 { margin: 0; font-size: 15px; }
h4 { margin: 14px 0 6px; padding-bottom: 4px; border-bottom: 1px solid #e3e5ec; font-size: 14px; }
p { margin: 6px 0; }
a { color: #3646b3; }
.eyebrow { margin: 0; color: #5b6172; font-size: 13px; font-weight: 600; }
.muted { color: #5b6172; }
.small { font-size: 12px; }
.pre { white-space: pre-line; }
header.top { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 16px; padding-bottom: 20px; border-bottom: 1px solid #e3e5ec; }
header.top .business { text-align: right; font-size: 12px; color: #5b6172; }
header.top .business strong { color: #1f2430; }
dl { margin: 0; }
dt { color: #5b6172; font-size: 12px; font-weight: 500; }
dd { margin: 0; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 8px 24px; }
.fields { display: grid; gap: 10px; margin-top: 8px; }
.compact { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px 20px; }
ol.notes { margin: 0; padding: 0; list-style: none; display: grid; gap: 20px; }
ol.notes > li { padding-left: 14px; border-left: 2px solid #c9cde0; break-inside: avoid; }
.addendum { margin-top: 8px; padding: 6px 10px; background: #f3f0fb; border-left: 2px solid #8a72c9; border-radius: 4px; font-size: 13px; }
table { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 4px; }
th, td { padding: 4px 8px; border: 1px solid #e3e5ec; text-align: left; vertical-align: top; }
th { background: #f4f5f8; color: #5b6172; font-weight: 500; }
ul, ol { margin: 4px 0; padding-left: 22px; }
.alert { margin: 4px 0; padding: 4px 8px; background: #fdecec; color: #a32020; border-radius: 4px; font-size: 12px; font-weight: 600; }
.files li { margin: 4px 0; }
.missing { color: #a32020; }
footer { margin-top: 28px; padding-top: 12px; border-top: 1px solid #e3e5ec; color: #5b6172; font-size: 12px; }
@media (max-width: 600px) { main { margin: 0; padding: 20px 16px; border: 0; border-radius: 0; } header.top .business { text-align: left; } }
@media print {
  @page { margin: 16mm; }
  body { background: #fff; }
  main { max-width: none; margin: 0; padding: 0; border: 0; }
  a { color: inherit; }
}
`;

/** Una página completa: `title` va escapado; `body`, ya escapado por quien lo arma. */
export function htmlPage(title: string, body: string): string {
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${escapeHtml(title)}</title>
<style>${STYLES}</style>
</head>
<body>
<main>
${body}
</main>
</body>
</html>
`;
}
