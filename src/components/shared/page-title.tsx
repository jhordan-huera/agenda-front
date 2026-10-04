import { APP_NAME } from "@/lib/constants/app";

/** Título de la pestaña. React 19 lo mueve automáticamente al <head>. */
export function PageTitle({ title }: { title?: string }) {
  return <title>{title ? `${title} · ${APP_NAME}` : `${APP_NAME} · Agenda y reservas online para profesionales`}</title>;
}
