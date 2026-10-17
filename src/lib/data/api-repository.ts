import { api } from "@/lib/api/client";
import type {
  AdminAuditLog,
  AdminBusinessDetail,
  AdminBusinessCategory,
  AdminBusinessSummary,
  AdminPlanRequest,
  AdminUserSummary,
  AnalyticsSnapshot,
  Appointment,
  AppointmentSeriesCreated,
  AppointmentSeriesPreview,
  AppointmentsToClose,
  AppointmentsToCloseCount,
  AuditLogPage,
  CloseAllResult,
  ImageUpload,
  PaymentReceipt,
  PaymentReceiptUpload,
  PublicAppointment,
  PublicAppointmentResult,
  PublicPayment,
  BlockedTime,
  BookingConfirmation,
  Business,
  BusinessCategoryInfo,
  Client,
  ClientActivity,
  ClientImportResult,
  ClinicalNote,
  ClinicalProfile,
  ClinicalAttachment,
  ClinicalAttachmentUpload,
  ClinicalRecord,
  ClinicalTemplate,
  EmailNotification,
  PlanUsage,
  PlatformSettings,
  BrandColors,
  PlatformStats,
  Professional,
  PublicBusinessProfile,
  Schedule,
  Service,
  Subscription,
  TeamMember,
  User,
  PlatformAdmin,
  PanelNoticePage,
  PushConfig,
  PushDevice,
} from "@/types";
import { DataError } from "./errors";
import type { AdminCreateBusinessResult, DataRepository, NoticeRepository } from "./repository";

/**
 * Implementación de la capa de datos sobre la API REST de agenda-backend.
 * Las rutas de un negocio cuelgan de /businesses/:businessId; la API comprueba en cada
 * petición que la sesión pertenece al negocio y que su rol tiene permiso.
 */
const business = (businessId: string) => `/businesses/${encodeURIComponent(businessId)}`;
const id = (value: string) => encodeURIComponent(value);

export const apiRepository: DataRepository = {
  users: {
    getById: (userId) => api.get<User | null>(`/users/${id(userId)}`),
    update: (userId, input) => api.put<User>(`/users/${id(userId)}`, input),
  },

  businesses: {
    getById: (businessId) => api.get<Business | null>(business(businessId)),
    create: (input) => api.post<Business>("/businesses", input),
    update: (businessId, input) => api.patch<Business>(business(businessId), input),
    isSlugAvailable: async (slug, excludeBusinessId) =>
      (await api.get<{ available: boolean }>("/businesses/slug-availability", { slug, exclude: excludeBusinessId }))
        .available,
  },

  professionals: {
    list: (businessId) => api.get<Professional[]>(`${business(businessId)}/professionals`),
    create: (businessId, input) => api.post<Professional>(`${business(businessId)}/professionals`, input),
    update: (businessId, professionalId, input) =>
      api.put<Professional>(`${business(businessId)}/professionals/${id(professionalId)}`, input),
    remove: (businessId, professionalId) => api.delete(`${business(businessId)}/professionals/${id(professionalId)}`),
  },

  team: {
    list: (businessId) => api.get<TeamMember[]>(`${business(businessId)}/team`),
    updateRole: (businessId, userId, role) => api.patch<void>(`${business(businessId)}/team/${id(userId)}`, { role }),
    remove: (businessId, userId) => api.delete(`${business(businessId)}/team/${id(userId)}`),
    setClinicalAccess: (businessId, userId, access) =>
      api.patch<void>(`${business(businessId)}/team/${id(userId)}/clinical-access`, { access }),
  },

  subscriptions: {
    get: (businessId) => api.get<Subscription | null>(`${business(businessId)}/subscription`),
    getUsage: (businessId) => api.get<PlanUsage>(`${business(businessId)}/subscription/usage`),
  },

  clients: {
    list: (businessId) => api.get<Client[]>(`${business(businessId)}/clients`),
    getById: (businessId, clientId) => api.get<Client | null>(`${business(businessId)}/clients/${id(clientId)}`),
    activity: (businessId) => api.get<ClientActivity[]>(`${business(businessId)}/clients/activity`),
    create: (businessId, input) => api.post<Client>(`${business(businessId)}/clients`, input),
    update: (businessId, clientId, input) => api.put<Client>(`${business(businessId)}/clients/${id(clientId)}`, input),
    remove: (businessId, clientId) => api.delete(`${business(businessId)}/clients/${id(clientId)}`),
    confirmClaim: (businessId, clientId, input) =>
      api.post<Client>(`${business(businessId)}/clients/${id(clientId)}/confirm-claim`, input),
    importMany: (businessId, input) => api.post<ClientImportResult>(`${business(businessId)}/clients/import`, input),
  },

  clinicalRecords: {
    listTemplates: (businessId, includeInactive) =>
      api.get<ClinicalTemplate[]>(`${business(businessId)}/clinical-templates`, includeInactive ? { all: "1" } : undefined),
    getTemplate: (businessId, templateId) =>
      api.get<ClinicalTemplate>(`${business(businessId)}/clinical-templates/${id(templateId)}`),
    createTemplate: (businessId, input) => api.post<ClinicalTemplate>(`${business(businessId)}/clinical-templates`, input),
    updateTemplate: (businessId, templateId, input) =>
      api.put<ClinicalTemplate>(`${business(businessId)}/clinical-templates/${id(templateId)}`, input),
    setTemplateActive: (businessId, templateId, active) =>
      api.patch<ClinicalTemplate>(`${business(businessId)}/clinical-templates/${id(templateId)}/active`, { active }),
    setDefaultTemplate: (businessId, templateId) =>
      api.put<ClinicalTemplate>(`${business(businessId)}/clinical-default-template`, { templateId }),
    requestAttachmentUpload: (businessId, clientId, input) =>
      api.post<ClinicalAttachmentUpload>(`${business(businessId)}/clients/${id(clientId)}/clinical-record/attachments`, input),
    completeAttachmentUpload: (businessId, attachmentId) =>
      api.post<ClinicalAttachment>(`${business(businessId)}/clinical-attachments/${id(attachmentId)}/complete`),
    getAttachmentUrl: (businessId, attachmentId) =>
      api.get<{ url: string }>(`${business(businessId)}/clinical-attachments/${id(attachmentId)}/url`),
    get: (businessId, clientId) =>
      api.get<ClinicalRecord>(`${business(businessId)}/clients/${id(clientId)}/clinical-record`),
    saveProfile: (businessId, clientId, input) =>
      api.put<ClinicalProfile>(`${business(businessId)}/clients/${id(clientId)}/clinical-record/profile`, input),
    addNote: (businessId, clientId, input) =>
      api.post<ClinicalNote>(`${business(businessId)}/clients/${id(clientId)}/clinical-record/notes`, input),
    addAddendum: (businessId, noteId, input) =>
      api.post<ClinicalNote>(`${business(businessId)}/clinical-notes/${id(noteId)}/addenda`, input),
  },

  services: {
    list: (businessId) => api.get<Service[]>(`${business(businessId)}/services`),
    create: (businessId, input) => api.post<Service>(`${business(businessId)}/services`, input),
    update: (businessId, serviceId, input) =>
      api.put<Service>(`${business(businessId)}/services/${id(serviceId)}`, input),
    remove: (businessId, serviceId) => api.delete(`${business(businessId)}/services/${id(serviceId)}`),
  },

  appointments: {
    getById: (businessId, appointmentId) =>
      api.get<Appointment | null>(`${business(businessId)}/appointments/${id(appointmentId)}`),
    list: (businessId, filters = {}) =>
      api.get<Appointment[]>(`${business(businessId)}/appointments`, {
        from: filters.from,
        to: filters.to,
        clientId: filters.clientId,
      }),
    create: (businessId, input) => api.post<Appointment>(`${business(businessId)}/appointments`, input),
    update: (businessId, appointmentId, input) =>
      api.put<Appointment>(`${business(businessId)}/appointments/${id(appointmentId)}`, input),
    updateStatus: (businessId, appointmentId, status, notify = true, options = {}) =>
      api.patch<Appointment>(`${business(businessId)}/appointments/${id(appointmentId)}/status`, {
        status,
        notify,
        ...(options.onlyIfOpen && { onlyIfOpen: true }),
      }),
    correctStatus: (businessId, appointmentId, input) =>
      api.post<Appointment>(`${business(businessId)}/appointments/${id(appointmentId)}/correct-status`, input),
    listToClose: (businessId, cursor) =>
      api.get<AppointmentsToClose>(`${business(businessId)}/appointments/to-close`, { cursor }),
    countToClose: (businessId) => api.get<AppointmentsToCloseCount>(`${business(businessId)}/appointments/to-close/count`),
    closeAll: (businessId, input) => api.post<CloseAllResult>(`${business(businessId)}/appointments/close-all`, input),
    previewSeries: (businessId, input) =>
      api.post<AppointmentSeriesPreview>(`${business(businessId)}/appointment-series/preview`, input),
    createSeries: (businessId, input) => api.post<AppointmentSeriesCreated>(`${business(businessId)}/appointment-series`, input),
    cancelFollowing: (businessId, appointmentId, notify = true) =>
      api.post<{ cancelled: Appointment[] }>(`${business(businessId)}/appointments/${id(appointmentId)}/cancel-following`, { notify }),
    logWhatsAppNotice: (businessId, appointmentId, kind, clientId) =>
      api.post<void>(`${business(businessId)}/appointments/${id(appointmentId)}/whatsapp-notice`, { kind, clientId }),
    setArrival: (businessId, appointmentId, arrived) =>
      api.patch<Appointment>(`${business(businessId)}/appointments/${id(appointmentId)}/arrival`, { arrived }),
    setPaid: (businessId, appointmentId, paid) =>
      api.patch<Appointment>(`${business(businessId)}/appointments/${id(appointmentId)}/payment`, { paid }),
    listReceipts: (businessId, appointmentId) =>
      api.get<PaymentReceipt[]>(`${business(businessId)}/appointments/${id(appointmentId)}/receipts`),
    getReceiptUrl: (businessId, receiptId) =>
      api.get<{ url: string }>(`${business(businessId)}/payment-receipts/${id(receiptId)}/url`),
  },

  schedules: {
    list: (businessId) => api.get<Schedule[]>(`${business(businessId)}/schedules`),
    saveWeek: (businessId, professionalId, days) =>
      api.put<Schedule[]>(`${business(businessId)}/professionals/${id(professionalId)}/schedule`, days),
  },

  blockedTimes: {
    list: (businessId) => api.get<BlockedTime[]>(`${business(businessId)}/blocked-times`),
    create: (businessId, input) => api.post<BlockedTime>(`${business(businessId)}/blocked-times`, input),
    remove: (businessId, blockedTimeId) => api.delete(`${business(businessId)}/blocked-times/${id(blockedTimeId)}`),
  },

  notifications: {
    list: (businessId) => api.get<EmailNotification[]>(`${business(businessId)}/notifications`),
  },

  auditLogs: {
    list: (businessId, filters = {}) => api.get<AuditLogPage>(`${business(businessId)}/audit-logs`, { ...filters }),
  },

  publicBooking: {
    getProfile: (slug) => api.get<PublicBusinessProfile | null>(`/public/businesses/${id(slug)}`),
    book: (slug, input, captchaToken) =>
      api.post<BookingConfirmation>(`/public/businesses/${id(slug)}/bookings`, { ...input, captchaToken }),
    getCaptchaSiteKey: async () => (await api.get<{ siteKey: string | null }>("/public/captcha")).siteKey,
    getPayment: (token) => api.get<PublicPayment>(`/public/payments/${id(token)}`),
    requestReceiptUpload: (token, input) => api.post<PaymentReceiptUpload>(`/public/payments/${id(token)}/receipts`, input),
    completeReceiptUpload: (token, receiptId) =>
      api.post<PaymentReceipt>(`/public/payments/${id(token)}/receipts/${id(receiptId)}/complete`),
    getAppointment: (token) => api.get<PublicAppointment>(`/public/appointments/${id(token)}`),
    confirmAppointment: (token) => api.post<PublicAppointmentResult>(`/public/appointments/${id(token)}/confirm`),
    cancelAppointment: (token) => api.post<PublicAppointmentResult>(`/public/appointments/${id(token)}/cancel`),
  },

  images: {
    requestUpload: (input) => api.post<ImageUpload>("/images", input),
  },

  platform: {
    getSettings: () => api.get<PlatformSettings>("/public/platform-settings"),
    listCategories: () => api.get<BusinessCategoryInfo[]>("/public/categories"),
  },

  admin: {
    getStats: () => api.get<PlatformStats>("/admin/stats"),
    getAnalytics: (days) => api.get<{ snapshot: AnalyticsSnapshot | null }>("/admin/analytics", { days }).then((result) => result.snapshot),
    listBusinesses: () => api.get<AdminBusinessSummary[]>("/admin/businesses"),
    getBusiness: (businessId) => api.get<AdminBusinessDetail | null>(`/admin/businesses/${id(businessId)}`),
    createBusiness: (input) => api.post<AdminCreateBusinessResult>("/admin/businesses", input),
    setBusinessStatus: (businessId, status) =>
      api.patch<Business>(`/admin/businesses/${id(businessId)}/status`, { status }),
    changeBusinessPlan: (businessId, plan) =>
      api.put<Subscription>(`/admin/businesses/${id(businessId)}/plan`, { plan }),
    setMaxProfessionals: (businessId, maxProfessionals) =>
      api.put<Subscription>(`/admin/businesses/${id(businessId)}/max-professionals`, { maxProfessionals }),
    setClientRequiredFields: (businessId, fields) =>
      api.put<Business>(`/admin/businesses/${id(businessId)}/client-required-fields`, fields),
    setMultiClientAppointments: (businessId, enabled) =>
      api.put<Business>(`/admin/businesses/${id(businessId)}/multi-client-appointments`, { enabled }),
    deleteBusiness: (businessId, input) => api.delete(`/admin/businesses/${id(businessId)}`, input),
    listCategories: () => api.get<AdminBusinessCategory[]>("/admin/categories"),
    createCategory: (input) => api.post<BusinessCategoryInfo>("/admin/categories", input),
    updateCategory: (categoryId, input) => api.put<BusinessCategoryInfo>(`/admin/categories/${id(categoryId)}`, input),
    deleteCategory: (categoryId) => api.delete(`/admin/categories/${id(categoryId)}`),
    listPlanRequests: () => api.get<AdminPlanRequest[]>("/admin/plan-requests"),
    approvePlanRequest: (requestId) => api.post<void>(`/admin/plan-requests/${id(requestId)}/approve`),
    rejectPlanRequest: (requestId, input) => api.post<void>(`/admin/plan-requests/${id(requestId)}/reject`, input),
    listUsers: () => api.get<AdminUserSummary[]>("/admin/users"),
    setUserActive: (userId, isActive) => api.patch<User>(`/admin/users/${id(userId)}/active`, { isActive }),
    setUserPassword: (userId, input) => api.put<void>(`/admin/users/${id(userId)}/password`, input),
    listPlatformAdmins: () => api.get<PlatformAdmin[]>("/admin/platform-admins"),
    addPlatformAdmin: (input) => api.post<PlatformAdmin>("/admin/platform-admins", input),
    addBusinessMember: (businessId, input) =>
      api.post<TeamMember>(`/admin/businesses/${id(businessId)}/members`, input),
    assignBusinessOwner: (businessId, input) =>
      api.post<TeamMember>(`/admin/businesses/${id(businessId)}/owner`, input),
    listAuditLogs: (filters) => api.get<AuditLogPage<AdminAuditLog>>("/admin/audit-logs", { ...filters }),
    listEmails: () => api.get<EmailNotification[]>("/admin/emails"),
    updateSettings: (input) => api.put<PlatformSettings>("/admin/settings", input),
    updatePanelColors: (input) => api.put<{ colors: BrandColors | null }>("/admin/panel-colors", input),
  },

  push: {
    // Un front publicado antes que la API (sin /api/push): como si no hubiera avisos, no se ve nada.
    getConfig: () =>
      api.get<PushConfig>("/push/config").catch((error: unknown) => {
        if (error instanceof DataError && error.code === "not_found") return { available: false, publicKey: null, kinds: [] };
        throw error;
      }),
    saveDevice: (input) => api.put<PushDevice>("/push/device", input),
    updateKinds: (endpoint, mutedKinds) => api.patch<Pick<PushDevice, "mutedKinds">>("/push/device", { endpoint, mutedKinds }),
    turnOff: (endpoint) => api.post<void>("/push/device/off", { endpoint }),
    sendTest: (endpoint) => api.post<{ sent: true }>("/push/device/test", { endpoint }),
  },

  notices: {
    business: (businessId) => noticesAt(`/businesses/${id(businessId)}/notices`),
    platform: noticesAt("/admin/notices"),
  },
};

/** Las cuatro rutas de una campana (la del negocio o la de /admin). */
function noticesAt(base: string): NoticeRepository {
  return {
    unread: () => api.get<{ unread: number }>(`${base}/unread`),
    list: (filters = {}) =>
      api.get<PanelNoticePage>(base, { limit: filters.limit, unread: filters.unread ? 1 : undefined, cursor: filters.cursor }),
    markRead: (noticeId) => api.post<void>(`${base}/${id(noticeId)}/read`),
    markAllRead: () => api.post<void>(`${base}/read-all`),
  };
}
