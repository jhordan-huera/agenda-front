/// <reference types="node" />
import { ipAddress, rewrite } from "@vercel/functions";

/**
 * Proxy de la API en Vercel (Routing Middleware). El navegador sólo habla con este dominio
 * (cookies propias, sin CORS) y /api/* se reenvía al backend, en API_URL. Al pasar por un proxy
 * Vercel reemplaza la IP del visitante, así que se envía aparte y firmada con PROXY_SECRET
 * (el mismo valor en el backend) para que los límites anti-abuso sean por visitante. En AWS Lambda
 * la API sólo atiende lo que trae ese secreto (la Function URL es pública).
 * En local hace lo mismo el proxy de Vite (vite.config.ts).
 */
export const config = { matcher: "/api/:path*" };

export default function middleware(request: Request): Response {
  const apiUrl = process.env.API_URL;
  if (!apiUrl) {
    return Response.json(
      { error: { code: "unavailable", message: "Falta API_URL en la configuración del frontend en Vercel." } },
      { status: 503 },
    );
  }
  const { pathname, search } = new URL(request.url);
  const headers = new Headers(request.headers);
  // Nunca se reenvían tal cual: sólo este proxy puede ponerlas.
  headers.delete("x-agendo-client-ip");
  headers.delete("x-agendo-proxy-secret");
  const ip = ipAddress(request);
  const secret = process.env.PROXY_SECRET;
  // El secreto va siempre: en AWS Lambda la API rechaza (403) lo que no llega por este proxy.
  if (secret) {
    headers.set("x-agendo-proxy-secret", secret);
    if (ip) headers.set("x-agendo-client-ip", ip);
  }
  return rewrite(new URL(pathname + search, apiUrl), { request: { headers } });
}
