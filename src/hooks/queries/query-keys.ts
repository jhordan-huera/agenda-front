import type { AppointmentFilters } from "@/lib/data";

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
  schedules: (businessId: string) => ["schedules", businessId] as const,
  blockedTimes: (businessId: string) => ["blocked-times", businessId] as const,
  publicProfile: (slug: string) => ["public-profile", slug] as const,
  /** Enlace de pago de una cita (/pago/:token). */
  publicPayment: (token: string) => ["public-payment", token] as const,
  platformSettings: ["platform-settings"] as const,
  /** Verificación en dos pasos de la propia cuenta. */
  twoFactor: ["two-factor"] as const,
  categories: ["categories"] as const,
  /** Panel del super admin: todo cuelga de "admin" para invalidarlo de una vez. */
  admin: {
    all: ["admin"] as const,
    stats: ["admin", "stats"] as const,
    businesses: ["admin", "businesses"] as const,
    business: (businessId: string) => ["admin", "businesses", businessId] as const,
    users: ["admin", "users"] as const,
    platformAdmins: ["admin", "platform-admins"] as const,
    planRequests: ["admin", "plan-requests"] as const,
    categories: ["admin", "categories"] as const,
    auditLogs: (filters: object) => ["admin", "audit-logs", filters] as const,
    emails: ["admin", "emails"] as const,
  },
};
