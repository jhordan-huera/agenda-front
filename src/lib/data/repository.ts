import type {
  AdminBusinessInput,
  AdminMemberInput,
  BusinessOwnerInput,
  BusinessCategoryInput,
  BusinessDeletionInput,
  PlanRejectionInput,
  PlatformAdminInput,
  PlatformSettingsInput,
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
import type { ImageUploadInput } from "@/lib/validations/images";
import type { ReceiptInput } from "@/lib/validations/payment";
import type { ProfessionalInput } from "@/lib/validations/professional";
import type { BlockedTimeInput, ScheduleDayInput } from "@/lib/validations/schedule";
import type { ServiceInput } from "@/lib/validations/service";
import type {
  AddedPlatformAdmin,
  AddedTeamMember,
  AdminAuditLog,
  AdminBusinessDetail,
  AdminBusinessCategory,
  AdminBusinessSummary,
  AdminPlanRequest,
  AdminUserSummary,
  Appointment,
  AppointmentStatus,
  ImageUpload,
  PaymentReceipt,
  PaymentReceiptUpload,
  PublicPayment,
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
  ClientActivity,
  ClinicalNote,
  ClinicalProfile,
  ClinicalAttachment,
  ClinicalAttachmentUpload,
  ClinicalRecord,
  ClinicalTemplate,
  EmailNotification,
  ISODate,
  PlanId,
  PlanUsage,
  PlatformSettings,
  PlatformStats,
  Professional,
  ProfessionalScope,
  PublicBusinessProfile,
  Schedule,
  Service,
  Subscription,
  TeamMember,
  User,
  WhatsAppNoticeKind,
  PasswordLink,
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
  /**
   * Sólo el propio usuario puede editar su perfil. Para cambiar el email hace falta `currentPassword`
   * (falla con `validation` si no viene o no es la correcta).
   */
  update(userId: string, input: ProfileInput & { currentPassword?: string }): Promise<User>;
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
  /** Qué pacientes ve quien tiene el rol Profesional. */
  professionalScope?: ProfessionalScope;
}

export interface BusinessRepository {
  getById(businessId: string): Promise<Business | null>;
  /** Onboarding: crea negocio, membresía owner, profesional, suscripción FREE, horario y primer servicio. */
  create(input: CreateBusinessInput): Promise<Business>;
  update(businessId: string, input: UpdateBusinessInput): Promise<Business>;
  isSlugAvailable(slug: string, excludeBusinessId?: string): Promise<boolean>;
}

/**
 * Profesionales (agendas). Los ve todo el equipo; los gestionan el propietario y los administradores.
 * Cuántos pueden estar activos lo fija el plan (`plan_limit`).
 */
export interface ProfessionalRepository {
  list(businessId: string): Promise<Professional[]>;
  create(businessId: string, input: ProfessionalInput): Promise<Professional>;
  update(businessId: string, professionalId: string, input: ProfessionalInput): Promise<Professional>;
  /** Sólo sin citas (`conflict`): con historial, se desactiva. */
  remove(businessId: string, professionalId: string): Promise<void>;
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
  /** Uso frente a los límites (los planes y precios no se muestran al negocio: los gestiona la plataforma). */
  getUsage(businessId: string): Promise<PlanUsage>;
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
  /** Resumen de las citas de cada cliente, calculado en la API (sin descargar el historial). */
  activity(businessId: string): Promise<ClientActivity[]>;
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
  getById(businessId: string, appointmentId: string): Promise<Appointment | null>;
  /** Falla con `conflict` si se solapa con otra cita activa y con `plan_limit` si se superó el plan. */
  create(businessId: string, input: AppointmentInput): Promise<Appointment>;
  update(businessId: string, appointmentId: string, input: AppointmentInput): Promise<Appointment>;
  updateStatus(businessId: string, appointmentId: string, status: AppointmentStatus): Promise<Appointment>;
  /** Registra en la actividad que se abrió WhatsApp con el aviso de un cambio de la cita. */
  logWhatsAppNotice(businessId: string, appointmentId: string, kind: WhatsAppNoticeKind): Promise<void>;
  /** Llegada del paciente (o quitarla): sólo en citas pendientes o confirmadas. */
  setArrival(businessId: string, appointmentId: string, arrived: boolean): Promise<Appointment>;
  /** Marca la cita como pagada (o lo deshace). */
  setPaid(businessId: string, appointmentId: string, paid: boolean): Promise<Appointment>;
  /** Comprobantes de pago que envió el paciente, del más antiguo al más reciente. */
  listReceipts(businessId: string, appointmentId: string): Promise<PaymentReceipt[]>;
  /** URL de unos minutos para ver el comprobante. */
  getReceiptUrl(businessId: string, receiptId: string): Promise<{ url: string }>;
}

export interface ScheduleRepository {
  list(businessId: string): Promise<Schedule[]>;
  /** El horario semanal de un profesional; devuelve el suyo. */
  saveWeek(businessId: string, professionalId: string, days: ScheduleDayInput[]): Promise<Schedule[]>;
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
   * Revalida la disponibilidad, los topes del día y el plan, une la reserva a la ficha de la cédula
   * (si coinciden su email o su teléfono) o crea el cliente, crea la cita y envía emails.
   * `captchaToken`: token de Turnstile, si el perfil trae `captchaSiteKey` (cada token sirve una vez).
   */
  book(slug: string, input: PublicBookingInput, captchaToken?: string): Promise<BookingConfirmation>;
  /** Site Key del CAPTCHA de las páginas sin negocio (el registro); null: no se pide. */
  getCaptchaSiteKey(): Promise<string | null>;
  /** Enlace de pago de una cita (/pago/:token): datos para transferir y comprobantes enviados. */
  getPayment(token: string): Promise<PublicPayment>;
  requestReceiptUpload(token: string, input: ReceiptInput): Promise<PaymentReceiptUpload>;
  /** Tras subir el archivo: la API comprueba que llegó y avisa al negocio. */
  completeReceiptUpload(token: string, receiptId: string): Promise<PaymentReceipt>;
}

/** Logos y fotos: URL firmada para subir la imagen al almacenamiento y su dirección pública. */
export interface ImageRepository {
  requestUpload(input: ImageUploadInput): Promise<ImageUpload>;
}

/** Configuración pública de la plataforma (p. ej. si el registro está abierto). Sin sesión. */
export interface PlatformRepository {
  getSettings(): Promise<PlatformSettings>;
  /** Categorías de negocio (todas, con `isActive`). */
  listCategories(): Promise<BusinessCategoryInfo[]>;
}

/** El negocio recién creado, aún sin propietario (se agrega con assignBusinessOwner). */
export interface AdminCreateBusinessResult {
  business: Business;
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
  /** Crea el negocio, todavía sin propietario (se agrega después con assignBusinessOwner). */
  createBusiness(input: AdminBusinessInput): Promise<AdminCreateBusinessResult>;
  /** Suspender bloquea el panel y la página pública del negocio; reactivar lo devuelve a la normalidad. */
  setBusinessStatus(businessId: string, status: BusinessStatus): Promise<Business>;
  changeBusinessPlan(businessId: string, plan: PlanId): Promise<Subscription>;
  /** Agendas contratadas por un negocio Business (null: sin tope). */
  setMaxProfessionals(businessId: string, maxProfessionals: number | null): Promise<Subscription>;
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
  /**
   * "Enviar enlace para definir contraseña": le llega por email un enlace de un solo uso (60 minutos) y
   * se devuelve para copiarlo si el email no llega. El super admin nunca elige ni ve contraseñas.
   */
  sendPasswordLink(userId: string): Promise<PasswordLink>;
  /** Equipo de la plataforma: los super admins. */
  listPlatformAdmins(): Promise<PlatformAdmin[]>;
  /** Sólo el super admin principal: otro super admin para el soporte (le llega el enlace para definir su contraseña). */
  addPlatformAdmin(input: PlatformAdminInput): Promise<AddedPlatformAdmin>;
  /** Crea un miembro del equipo de un negocio: le llega un enlace para definir su contraseña. */
  addBusinessMember(businessId: string, input: AdminMemberInput): Promise<AddedTeamMember>;
  /**
   * Propietario de un negocio que aún no lo tiene (cuenta nueva o una existente sin negocio); le
   * llega un email con el enlace para definir su contraseña. Con una sola agenda sin usuario, esa
   * pasa a ser la suya.
   */
  assignBusinessOwner(businessId: string, input: BusinessOwnerInput): Promise<AddedTeamMember>;
  listAuditLogs(filters: AdminAuditFilters): Promise<AuditLogPage<AdminAuditLog>>;
  /** Todos los emails de la plataforma (bandeja de salida global). */
  listEmails(): Promise<EmailNotification[]>;
  updateSettings(input: PlatformSettingsInput): Promise<PlatformSettings>;
}

export interface DataRepository {
  users: UserRepository;
  businesses: BusinessRepository;
  professionals: ProfessionalRepository;
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
  images: ImageRepository;
  platform: PlatformRepository;
  admin: PlatformAdminRepository;
}
