import type { AppointmentFilters } from "@/lib/data";
import type { AdminCalendarFilters } from "@/types";

/** Claves de caché. Todas incluyen el businessId: la caché también es multi-tenant. */
export const queryKeys = {
  user: (userId: string) => ["user", userId] as const,
  business: (businessId: string) => ["business", businessId] as const,
  professionals: (businessId: string) => ["professionals", businessId] as const,
  subscription: (businessId: string) => ["subscription", businessId] as const,
  usage: (businessId: string) => ["usage", businessId] as const,
  team: (businessId: string) => ["team", businessId] as const,
  notifications: (businessId: string) => ["notifications", businessId] as const,
  auditLogs: (businessId: string) => ["audit-logs", businessId] as const,
  clients: (businessId: string) => ["clients", businessId] as const,
  client: (businessId: string, clientId: string) => ["clients", businessId, clientId] as const,
  clinicalRecord: (businessId: string, clientId: string) => ["clinical", businessId, clientId] as const,
  clinicalTemplates: (businessId: string) => ["clinical-templates", businessId] as const,
  clinicalTemplateList: (businessId: string, includeInactive: boolean) =>
    ["clinical-templates", businessId, includeInactive ? "all" : "active"] as const,
  clinicalTemplate: (businessId: string, templateId: string) => ["clinical-templates", businessId, "one", templateId] as const,
  services: (businessId: string) => ["services", businessId] as const,
  appointments: (businessId: string) => ["appointments", businessId] as const,
  appointment: (businessId: string, appointmentId: string) => ["appointments", businessId, "one", appointmentId] as const,
  /** Bajo "appointments": se recarga cuando cambia cualquier cita. */
  clientActivity: (businessId: string) => ["appointments", businessId, "client-activity"] as const,
  appointmentList: (businessId: string, filters: AppointmentFilters) =>
    ["appointments", businessId, filters] as const,
  /** Bajo "appointments": un comprobante nuevo llega con la cita recargada. */
  receipts: (businessId: string, appointmentId: string) => ["appointments", businessId, "receipts", appointmentId] as const,
  /**
   * Citas por cerrar (spec 018), de la persona de la sesión (el rol Profesional ve sólo su agenda). Bajo
   * "appointments": cerrar una cita en la ficha o moverla también pone al día la lista y el contador.
   */
  toClose: {
    all: (businessId: string, userId: string) => ["appointments", businessId, "to-close", userId] as const,
    count: (businessId: string, userId: string) => ["appointments", businessId, "to-close", userId, "count"] as const,
    list: (businessId: string, userId: string) => ["appointments", businessId, "to-close", userId, "list"] as const,
  },
  schedules: (businessId: string) => ["schedules", businessId] as const,
  blockedTimes: (businessId: string) => ["blocked-times", businessId] as const,
  publicProfile: (slug: string) => ["public-profile", slug] as const,
  /** El programa de referidos de un negocio (spec 023): la tarjeta del propietario. */
  referrals: (businessId: string) => ["referrals", businessId] as const,
  /** La mensualidad del propietario (spec 029): su tarjeta y la pantalla de pago. */
  billing: (businessId: string) => ["billing", businessId] as const,
  /** El nombre del negocio de un código de referidos (la portada con `?ref=`). */
  referrer: (code: string) => ["referrer", code] as const,
  /** Enlace de pago de una cita (/pago/:token). */
  publicPayment: (token: string) => ["public-payment", token] as const,
  /** Página «Tu cita» (/cita/:token, spec 010). */
  publicAppointment: (token: string) => ["public-appointment", token] as const,
  /** Site Key del CAPTCHA del registro. */
  captchaSiteKey: ["captcha-site-key"] as const,
  platformSettings: ["platform-settings"] as const,
  /** Verificación en dos pasos de la propia cuenta. */
  twoFactor: ["two-factor"] as const,
  /** Avisos en el celular (spec 013): la configuración y este aparato, de la persona de la sesión. */
  push: {
    config: (userId: string) => ["push", userId, "config"] as const,
    device: (userId: string) => ["push", userId, "device"] as const,
  },
  /**
   * Centro de avisos del panel (spec 014): de la persona de la sesión, en un negocio (su id) o en /admin
   * ("admin"). Todo cuelga de `all` para recargarlo de una vez (p. ej. con el aviso del service worker).
   */
  notices: {
    all: (userId: string, scope: string) => ["notices", userId, scope] as const,
    unread: (userId: string, scope: string) => ["notices", userId, scope, "unread"] as const,
    feed: (userId: string, scope: string, filters: object) => ["notices", userId, scope, "feed", filters] as const,
  },
  categories: ["categories"] as const,
  /** Panel del super admin: todo cuelga de "admin" para invalidarlo de una vez. */
  admin: {
    all: ["admin"] as const,
    stats: ["admin", "stats"] as const,
    /** La foto de la analítica de 30 o de 90 días (spec 016). */
    analytics: (days: number) => ["admin", "analytics", days] as const,
    /** El calendario de la plataforma (spec 035): el rango y el panel de un día o una hora. */
    calendar: (from: string, to: string, filters: AdminCalendarFilters) => ["admin", "calendar", from, to, filters] as const,
    calendarDay: (date: string, hour: number | null, filters: AdminCalendarFilters) => ["admin", "calendar", "day", date, hour, filters] as const,
    /** La pantalla «Base de datos» (spec 024). */
    database: ["admin", "database"] as const,
    businesses: ["admin", "businesses"] as const,
    business: (businessId: string) => ["admin", "businesses", businessId] as const,
    users: ["admin", "users"] as const,
    platformAdmins: ["admin", "platform-admins"] as const,
    planRequests: ["admin", "plan-requests"] as const,
    categories: ["admin", "categories"] as const,
    auditLogs: (filters: object) => ["admin", "audit-logs", filters] as const,
    emails: (filter: string) => ["admin", "emails", filter] as const,
    /** «Descuentos por referidos» del Inicio (spec 023). */
    referralRewards: ["admin", "referral-rewards"] as const,
    /** «Cobros» (spec 029), por filtro. */
    billing: (filter: string) => ["admin", "billing", filter] as const,
    /** Las cuentas de Agenda360 para recibir las mensualidades (spec 029). */
    billingAccounts: ["admin", "billing-accounts"] as const,
    /** Los precios de los planes (spec 029, ampliación del 2026-10-20). */
    planPrices: ["admin", "plan-prices"] as const,
  },
};
