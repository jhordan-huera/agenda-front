/**
 * La dirección pública de Agenda360 para lo que se imprime o se comparte (los QR y el enlace de reservas). En lo que se
 * publica, la del sitio (SITE_URL o la de producción de Vercel, ver vite.config.ts): una lámina descargada desde una
 * vista previa o desde este equipo no apunta a esa dirección. En desarrollo, la de la página (para probar desde el
 * celular).
 */
export function publicOrigin(): string {
  return import.meta.env.VITE_PUBLIC_SITE_URL || window.location.origin;
}
