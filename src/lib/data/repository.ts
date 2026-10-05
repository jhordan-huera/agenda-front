import type {
  AdminBusinessInput,
  AdminMemberInput,
  BusinessCategoryInput,
  BusinessDeletionInput,
  PlanRejectionInput,
  PlatformAdminInput,
  PlatformSettingsInput,
  UserPasswordInput,
} from "@/lib/validations/admin";
import type { AppointmentInput } from "@/lib/validations/appointment";
import type {
  ClinicalAddendumInput,
  ClinicalAttachmentInput,
  ClinicalNoteInput,
  ClinicalProfileInput,
  ClinicalTemplateInput,
} from "@/lib/validations/clinical";
import type { PublicBookingInput } from "@/lib/validations/booking";
import type {
  BookingSettingsInput,
  BusinessProfileInput,
  NotificationSettingsInput,
  OnboardingInput,
  ProfileInput,
} from "@/lib/validations/business";
import type { ClientInput } from "@/lib/validations/client";
import type { BlockedTimeInput, ScheduleDayInput } from "@/lib/validations/schedule";
import type { ServiceInput } from "@/lib/validations/service";
import type {
  AdminAuditLog,
  AdminBusinessDetail,
  AdminBusinessCategory,
  AdminBusinessSummary,
  AdminPlanRequest,
  AdminUserSummary,
  Appointment,
  AppointmentStatus,
  AuditEntityType,
  AuditLogPage,
  BlockedTime,
  BookingConfirmation,
  BrandColors,
  Business,
  BusinessCategoryInfo,
  BusinessRole,
  BusinessStatus,
  Client,
  ClinicalNote,
  ClinicalProfile,
  ClinicalAttachment,
  ClinicalAttachmentUpload,
  ClinicalRecord,
  ClinicalTemplate,
  EmailNotification,
  ISODate,
  PlanChangeRequest,
  PlanId,
  PlanUsage,
  PlatformSettings,
  PlatformStats,
  Professional,
  PublicBusinessProfile,
  PublicClientLookup,
  Schedule,
  Service,
  Subscription,
  TeamMember,
  User,
  WhatsAppNoticeKind,
  PlatformAdmin,
} from "@/types";

/**
 * Contrato de acceso a datos (el "backend" de la aplicación).
 *
 * La implementación (api-repository.ts) llama a la API de agenda-backend, que:
 * - Autorizar: la sesión pertenece al negocio (`businessId`) y su rol tiene permiso.
 * - Validar la entrada con los esquemas Zod (nunca confiar en el formulario).
 * - Aplicar los límites del plan.
 * Las operaciones rechazadas lanzan DataError con códigos: unauthorized, forbidden,
 * validation, conflict, not_found o plan_limit.
 */

export interface UserRepository {
  getById(userId: string): Promise<User | null>;
  /** Sólo el propio usuario puede editar su perfil. */
  update(userId: string, input: ProfileInput): Promise<User>;
}

export interface CreateBusinessInput extends OnboardingInput {
  schedules: ScheduleDayInput[];
  firstService: ServiceInput;
}

export interface UpdateBusinessInput extends Partial<BusinessProfileInput> {
  bookingSettings?: BookingSettingsInput;
  notificationSettings?: NotificationSettingsInput;
  clinicalRecordsEnabled?: boolean;
  /** null: vuelve a los colores de Agenda360. */
  brandColors?: BrandColors | null;
}

export interface BusinessRepository {
  getById(businessId: string): Promise<Business | null>;
  /** Onboarding: crea negocio, membresía owner, profesional, suscripción FREE, horario y primer servicio. */
  create(input: CreateBusinessInput): Promise<Business>;
  update(businessId: string, input: UpdateBusinessInput): Promise<Business>;
  isSlugAvailable(slug: string, excludeBusinessId?: string): Promise<boolean>;
  getProfessional(businessId: string): Promise<Professional | null>;
}

export interface TeamRepository {
  list(businessId: string): Promise<TeamMember[]>;
  updateRole(businessId: string, userId: string, role: Exclude<BusinessRole, "owner">): Promise<void>;
  remove(businessId: string, userId: string): Promise<void>;
  /** Autoriza (o retira) el acceso de un miembro a las historias clínicas. */
  setClinicalAccess(businessId: string, userId: string, access: boolean): Promise<void>;
}

export interface SubscriptionRepository {
  get(businessId: string): Promise<Subscription | null>;
  getUsage(businessId: string): Promise<PlanUsage>;
  /** Solicitud de cambio pendiente del negocio (o null). */
  getPendingRequest(businessId: string): Promise<PlanChangeRequest | null>;
  /** El propietario pide otro plan; el super admin la aprueba o rechaza. */
  requestPlanChange(businessId: string, plan: PlanId): Promise<PlanChangeRequest>;
  cancelPlanRequest(businessId: string): Promise<void>;
}

/**
 * Historia clínica. Exige que el negocio la tenga activada y que el usuario sea el
 * propietario, un miembro autorizado o el super admin en modo soporte. No hay borrado: las
 * evoluciones sólo admiten aclaraciones.
 */
export interface ClinicalRecordRepository {
  /**
   * Formatos de evolución del negocio: los propios primero, luego los recomendados y el resto.
   * Con `includeInactive`, también los propios desactivados (gestión de formatos).
   */
  listTemplates(businessId: string, includeInactive?: boolean): Promise<ClinicalTemplate[]>;
  getTemplate(businessId: string, templateId: string): Promise<ClinicalTemplate>;
  /** Formatos propios: planes Pro y Business, sólo el propietario. Cada cambio crea una versión. */
  createTemplate(businessId: string, input: ClinicalTemplateInput): Promise<ClinicalTemplate>;
  updateTemplate(businessId: string, templateId: string, input: ClinicalTemplateInput): Promise<ClinicalTemplate>;
  setTemplateActive(businessId: string, templateId: string, active: boolean): Promise<ClinicalTemplate>;
  /** Formato de todo el negocio (sólo el propietario; cualquier plan). */
  setDefaultTemplate(businessId: string, templateId: string): Promise<ClinicalTemplate>;
  /** Archivos: pide la URL de subida, el navegador sube y luego se confirma. */
  requestAttachmentUpload(businessId: string, clientId: string, input: ClinicalAttachmentInput): Promise<ClinicalAttachmentUpload>;
  completeAttachmentUpload(businessId: string, attachmentId: string): Promise<ClinicalAttachment>;
  getAttachmentUrl(businessId: string, attachmentId: string): Promise<{ url: string }>;
  /** Devuelve antecedentes y evoluciones, y deja constancia del acceso en la auditoría. */
  get(businessId: string, clientId: string): Promise<ClinicalRecord>;
  saveProfile(businessId: string, clientId: string, input: ClinicalProfileInput): Promise<ClinicalProfile>;
  addNote(businessId: string, clientId: string, input: ClinicalNoteInput): Promise<ClinicalNote>;
  addAddendum(businessId: string, noteId: string, input: ClinicalAddendumInput): Promise<ClinicalNote>;
}

export interface ClientRepository {
  list(businessId: string): Promise<Client[]>;
  getById(businessId: string, clientId: string): Promise<Client | null>;
  create(businessId: string, input: ClientInput): Promise<Client>;
  update(businessId: string, clientId: string, input: ClientInput): Promise<Client>;
  /** Elimina el cliente y su historial de citas. */
  remove(businessId: string, clientId: string): Promise<void>;
}

export interface ServiceRepository {
  list(businessId: string): Promise<Service[]>;
  create(businessId: string, input: ServiceInput): Promise<Service>;
  update(businessId: string, serviceId: string, input: ServiceInput): Promise<Service>;
  /** Falla con `conflict` si el servicio tiene citas asociadas. */
  remove(businessId: string, serviceId: string): Promise<void>;
}

export interface AppointmentFilters {
  from?: ISODate;
  to?: ISODate;
  clientId?: string;
}

export interface AppointmentRepository {
  list(businessId: string, filters?: AppointmentFilters): Promise<Appointment[]>;
  /** Falla con `conflict` si se solapa con otra cita activa y con `plan_limit` si se superó el plan. */
  create(businessId: string, input: AppointmentInput): Promise<Appointment>;
  update(businessId: string, appointmentId: string, input: AppointmentInput): Promise<Appointment>;
  updateStatus(businessId: string, appointmentId: string, status: AppointmentStatus): Promise<Appointment>;
  /** Registra en la actividad que se abrió WhatsApp con el aviso de un cambio de la cita. */
  logWhatsAppNotice(businessId: string, appointmentId: string, kind: WhatsAppNoticeKind): Promise<void>;
}

export interface ScheduleRepository {
  list(businessId: string): Promise<Schedule[]>;
  saveWeek(businessId: string, days: ScheduleDayInput[]): Promise<Schedule[]>;
}

export interface BlockedTimeRepository {
  list(businessId: string): Promise<BlockedTime[]>;
  create(businessId: string, input: BlockedTimeInput): Promise<BlockedTime>;
  remove(businessId: string, blockedTimeId: string): Promise<void>;
}

export interface NotificationRepository {
  /** Emails del negocio y emails de cuenta de sus miembros (bandeja de salida). */
  list(businessId: string): Promise<EmailNotification[]>;
}

export interface AuditLogFilters {
  entityType?: AuditEntityType;
  entityId?: string;
  /** Un usuario, "online" (reservas desde la página pública) o "support" (el super admin). */
  actorId?: string;
  /** Desde y hasta (ISO 8601; `to` no incluido). */
  from?: string;
  to?: string;
  /** Busca en el resumen y en el autor. */
  q?: string;
  /** Id de la última entrada vista ("Cargar más"). */
  cursor?: string;
  /** Por página (máximo 1000). */
  limit?: number;
}

export interface AuditLogRepository {
  /** Actividad del negocio, sin los eventos de sesión (ésos sólo los ve el super admin). */
  list(businessId: string, filters?: AuditLogFilters): Promise<AuditLogPage>;
}

/** Operaciones públicas (sin sesión): página de reservas /book/:slug. */
export interface PublicBookingRepository {
  getProfile(slug: string): Promise<PublicBusinessProfile | null>;
  /**
   * ¿La cédula ya es de un cliente del negocio? Sin datos de contacto (sólo un nombre para saludar).
   * `captchaToken`: token de Turnstile, si el perfil trae `captchaSiteKey` (cada token sirve una vez).
   */
  lookupClient(slug: string, documentId: string, captchaToken?: string): Promise<PublicClientLookup>;
  /** Revalida la disponibilidad y el plan, crea/reutiliza el cliente (por email), crea la cita y envía emails. */
  book(slug: string, input: PublicBookingInput, captchaToken?: string): Promise<BookingConfirmation>;
}

/** Configuración pública de la plataforma (p. ej. si el registro está abierto). Sin sesión. */
export interface PlatformRepository {
  getSettings(): Promise<PlatformSettings>;
  /** Categorías de negocio (todas, con `isActive`). */
  listCategories(): Promise<BusinessCategoryInfo[]>;
}

export interface AdminCreateBusinessResult {
  business: Business;
  ownerEmail: string;
  /** true si el email ya tenía cuenta (se le asignó el negocio y la contraseña elegida). */
  existingAccount: boolean;
}

/** "admin": acciones del super admin · "security": sesiones (con IP y navegador) · "all": todo. */
export type AdminAuditScope = "admin" | "all" | "security";

export interface AdminAuditFilters extends AuditLogFilters {
  scope: AdminAuditScope;
  businessId?: string;
  /** Una acción concreta, p. ej. "session.login_failed". */
  action?: string;
}

/**
 * Panel del super admin (operador de la plataforma). La API exige
 * `platformRole = super_admin` en todas las operaciones.
 */
export interface PlatformAdminRepository {
  getStats(): Promise<PlatformStats>;
  listBusinesses(): Promise<AdminBusinessSummary[]>;
  getBusiness(businessId: string): Promise<AdminBusinessDetail | null>;
  /** Crea el negocio y su propietario (cuenta nueva o una existente sin negocio) con la contraseña elegida. */
  createBusiness(input: AdminBusinessInput): Promise<AdminCreateBusinessResult>;
  /** Suspender bloquea el panel y la página pública del negocio; reactivar lo devuelve a la normalidad. */
  setBusinessStatus(businessId: string, status: BusinessStatus): Promise<Business>;
  changeBusinessPlan(businessId: string, plan: PlanId): Promise<Subscription>;
  /** Para siempre: sus datos, sus archivos y las cuentas de su equipo. Hay que escribir su nombre. */
  deleteBusiness(businessId: string, input: BusinessDeletionInput): Promise<void>;
  listCategories(): Promise<AdminBusinessCategory[]>;
  createCategory(input: BusinessCategoryInput): Promise<BusinessCategoryInfo>;
  updateCategory(categoryId: string, input: BusinessCategoryInput): Promise<BusinessCategoryInfo>;
  /** Falla con `conflict` si algún negocio la usa (hay que desactivarla). */
  deleteCategory(categoryId: string): Promise<void>;
  /** Pendientes primero y resueltas en los últimos 30 días. */
  listPlanRequests(): Promise<AdminPlanRequest[]>;
  /** Aplica el plan solicitado y avisa al propietario por email. */
  approvePlanRequest(requestId: string): Promise<void>;
  rejectPlanRequest(requestId: string, input: PlanRejectionInput): Promise<void>;
  listUsers(): Promise<AdminUserSummary[]>;
  setUserActive(userId: string, isActive: boolean): Promise<User>;
  /** Pone la contraseña que elige el super admin, se la envía por email y cierra sus sesiones. */
  setUserPassword(userId: string, input: UserPasswordInput): Promise<void>;
  /** Equipo de la plataforma: los super admins. */
  listPlatformAdmins(): Promise<PlatformAdmin[]>;
  /** Sólo el super admin principal: otro super admin para el soporte (le llega un email con sus datos). */
  addPlatformAdmin(input: PlatformAdminInput): Promise<PlatformAdmin>;
  /** Crea un miembro del equipo de un negocio con la contraseña que elige el super admin. */
  addBusinessMember(businessId: string, input: AdminMemberInput): Promise<TeamMember>;
  listAuditLogs(filters: AdminAuditFilters): Promise<AuditLogPage<AdminAuditLog>>;
  /** Todos los emails de la plataforma (bandeja de salida global). */
  listEmails(): Promise<EmailNotification[]>;
  updateSettings(input: PlatformSettingsInput): Promise<PlatformSettings>;
}

export interface DataRepository {
  users: UserRepository;
  businesses: BusinessRepository;
  team: TeamRepository;
  subscriptions: SubscriptionRepository;
  clients: ClientRepository;
  clinicalRecords: ClinicalRecordRepository;
  services: ServiceRepository;
  appointments: AppointmentRepository;
  schedules: ScheduleRepository;
  blockedTimes: BlockedTimeRepository;
  notifications: NotificationRepository;
  auditLogs: AuditLogRepository;
  publicBooking: PublicBookingRepository;
  platform: PlatformRepository;
  admin: PlatformAdminRepository;
}
