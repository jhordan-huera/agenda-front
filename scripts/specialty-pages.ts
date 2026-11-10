/**
 * Las páginas por especialidad (spec 041) para Google y para compartir. WhatsApp y las redes no ejecutan la
 * página: leen el HTML tal como llega. Por eso, al compilar, el plugin `agenda:specialty-pages` de vite.config.ts
 * crea un HTML por especialidad (el index.html del build con su título, su descripción y las etiquetas para
 * compartir) y vercel.json sirve cada dirección con el suyo. También el mapa del sitio y robots.txt.
 * Lo comprueba `npm run check:specialties` (scripts/check-specialties.ts).
 */
import { SPECIALTIES, type Specialty } from "../src/features/landing/specialties.ts";

/** Donde quedan en el build: /especialidades/<nombre>.html. */
export const SPECIALTY_HTML_DIR = "especialidades";

/** Las páginas públicas del mapa del sitio. Nunca las privadas (/pago, /cita, el panel). */
export const SITEMAP_PATHS = ["/", ...SPECIALTIES.map((specialty) => `/${specialty.slug}`), "/privacidad"];

/**
 * La dirección pública de la web: SITE_URL, o la de producción que da Vercel al compilar
 * (VERCEL_PROJECT_PRODUCTION_URL, sin el https), o la de siempre.
 */
export function siteUrlFrom(env: Record<string, string | undefined>): string {
  const url = env.SITE_URL || (env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${env.VERCEL_PROJECT_PRODUCTION_URL}` : "https://agenda-3-6-0.vercel.app");
  return url.replace(/\/+$/, "");
}

const escapeAttribute = (value: string) => value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const TITLE = /<title>[^<]*<\/title>/;
const DESCRIPTION = /<meta\s+name="description"\s+content="[^"]*"\s*\/>/;

/**
 * El HTML de una especialidad: el del build con su título, su descripción y las etiquetas para compartir. Si el
 * index.html cambia y ya no tiene el título o la descripción, falla el build en vez de publicar una página rota.
 */
export function specialtyHtml(indexHtml: string, specialty: Specialty, siteUrl: string): string {
  if (!TITLE.test(indexHtml) || !DESCRIPTION.test(indexHtml)) {
    throw new Error("index.html ya no tiene <title> o <meta name=\"description\">: revisa scripts/specialty-pages.ts.");
  }
  const url = `${siteUrl}/${specialty.slug}`;
  const title = escapeAttribute(specialty.meta.title);
  const description = escapeAttribute(specialty.meta.description);
  const tags = [
    `<meta name="description" content="${description}" />`,
    `<link rel="canonical" href="${url}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="Agenda360" />`,
    `<meta property="og:locale" content="es_EC" />`,
    `<meta property="og:title" content="${title}" />`,
    `<meta property="og:description" content="${description}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:image" content="${siteUrl}/icon-app-512.png" />`,
    `<meta name="twitter:card" content="summary" />`,
  ].join("\n    ");
  return indexHtml.replace(TITLE, `<title>${title}</title>`).replace(DESCRIPTION, tags);
}

export function sitemapXml(siteUrl: string): string {
  const urls = SITEMAP_PATHS.map((path) => `  <url><loc>${siteUrl}${path === "/" ? "/" : path}</loc></url>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

/** Todo se puede leer menos el panel; /pago y /cita ya piden no guardarse (X-Robots-Tag en vercel.json). */
export function robotsTxt(siteUrl: string): string {
  return `User-agent: *\nAllow: /\nDisallow: /dashboard\nDisallow: /admin\n\nSitemap: ${siteUrl}/sitemap.xml\n`;
}
