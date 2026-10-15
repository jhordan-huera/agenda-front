/// <reference types="node" />
import { ipAddress, rewrite } from "@vercel/functions";

/**
 * Proxy de la API en Vercel (Routing Middleware). El navegador sólo habla con este dominio
 * (cookies propias, sin CORS) y /api/* se reenvía al backend, en API_URL. Al pasar por un proxy
 * Vercel reemplaza la IP del visitante, así que se envía aparte y firmada con PROXY_SECRET
 * (el mismo valor en el backend) para que los límites anti-abuso sean por visitante. En AWS Lambda
 * la API sólo atiende lo que trae esa firma (la Function URL es pública).
 *
 * La firma (spec 009) es HMAC-SHA256 de "<ip>.<segundos>": la API sólo la acepta durante 2 minutos,
 * así que quien vea una petición reenviada no puede inventarse IPs después. Fase 1: también va el
 * PROXY_SECRET de antes, para que no importe si se publica antes el backend o el frontend; se quita
 * (fase 2) cuando los dos estén publicados.
 * En local, el proxy de Vite (vite.config.ts) reenvía sin firma: la API usa la IP de la conexión.
 */
export const config = { matcher: "/api/:path*" };

const encoder = new TextEncoder();

async function signClientIp(ip: string, timestamp: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(`${ip}.${timestamp}`));
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export default async function middleware(request: Request): Promise<Response> {
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
  for (const name of ["x-agendo-client-ip", "x-agendo-client-ts", "x-agendo-client-sig", "x-agendo-proxy-secret"]) {
    headers.delete(name);
  }
  const ip = ipAddress(request) ?? "";
  const secret = process.env.PROXY_SECRET;
  // La firma va siempre (también sin IP): en AWS Lambda la API rechaza (403) lo que no llega por este proxy.
  if (secret) {
    const timestamp = String(Math.floor(Date.now() / 1000));
    if (ip) headers.set("x-agendo-client-ip", ip);
    headers.set("x-agendo-client-ts", timestamp);
    headers.set("x-agendo-client-sig", await signClientIp(ip, timestamp, secret));
    headers.set("x-agendo-proxy-secret", secret); // fase 1 (ver arriba)
  }
  return rewrite(new URL(pathname + search, apiUrl), { request: { headers } });
}
