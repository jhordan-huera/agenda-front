import type {
  AdminBusinessInput,
  AdminMemberInput,
  BusinessOwnerInput,
  BusinessCategoryInput,
  BusinessDeletionInput,
  PanelColorsInput,
  PlanRejectionInput,
  PlatformAdminInput,
  PlatformSettingsInput,
  UserPasswordInput,
} from "@/lib/validations/admin";
import type {
  AppointmentCorrectionInput,
  AppointmentInput,
  AppointmentSeriesInput,
  AppointmentSeriesPreviewInput,
  CloseAllInput,
} from "@/lib/validations/appointment";
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
import type { ClientInput, ConfirmClaimInput } from "@/lib/validations/client";
import type { ClientImportInput } from "@/lib/validations/client-import";
import type { ImageUploadInput } from "@/lib/validations/images";
import type { ReceiptInput } from "@/lib/validations/payment";
import type { ProfessionalInput } from "@/lib/validations/professional";
import type { BlockedTimeInput, ScheduleDayInput } from "@/lib/validations/schedule";
import type { ServiceInput } from "@/lib/validations/service";
import type {
  AdminAuditLog,
  AdminBusinessDetail,
  AdminBusinessCategory,
  AdminBusinessReferrals,
  AdminBusinessSummary,
  AdminPlanRequest,
  AdminUserSummary,
  AnalyticsPeriodDays,
  AnalyticsSnapshot,
  Appointment,
  AppointmentSeriesCreated,
  AppointmentSeriesPreview,
  AppointmentStatus,
  AppointmentsToClose,
  AppointmentsToCloseCount,
  CloseAllResult,
  ImageUpload,
  PaymentReceipt,
  PaymentReceiptUpload,
  PublicAppointment,
  PublicAppointmentResult,
  PublicPayment,
  AuditEntityType,
  AuditLogPage,
  BlockedTime,
  BookingConfirmation,
  BrandColors,
  Business,
  BusinessCategoryInfo,
  BusinessReferrals,
  BusinessRole,
  BusinessStatus,
  Client,
  ClientActivity,
  ClientImportResult,
  ClientRequiredFields,
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
  ReferralReward,
  Schedule,
  Service,
  Subscription,
  TeamMember,
  User,
  WhatsAppNoticeKind,
  PlatformAdmin,
  PushConfig,
  PushDevice,
  PushKind,
  PanelNoticePage,
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
  /** El programa de referidos (spec 023): sólo el propietario (`forbidden` a los demás roles). */
  getReferrals(businessId: string): Promise<BusinessReferrals>;
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
  /**
   * «Es el mismo paciente»: une un paciente «Por verificar» a la ficha cuya cédula escribió (spec
   * 009). Devuelve la ficha (con el email o el teléfono nuevos, si se pidió).
   */
  confirmClaim(businessId: string, clientId: string, input: ConfirmClaimInput): Promise<Client>;
  /**
   * Importa pacientes desde las filas de un Excel o un CSV (spec 012), todo o nada: crea los válidos y
   * nuevos y no toca los que ya existían. Sin emails a los pacientes.
   */
  importMany(businessId: string, input: ClientImportInput): Promise<ClientImportResult>;
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
  /**
   * `notify: false`: corrige un error sin avisar al paciente (spec 008). `onlyIfOpen` (la lista «Por
   * cerrar», spec 018): falla con `conflict` si otra persona ya la cerró, y su estado se respeta.
   */
  updateStatus(
    businessId: string,
    appointmentId: string,
    status: AppointmentStatus,
    notify?: boolean,
    options?: { onlyIfOpen?: boolean },
  ): Promise<Appointment>;
  /**
   * «Corregir estado» de una cita completada (spec 020): sólo el propietario (y el super admin en modo
   * soporte), a Confirmada, No asistió o Cancelada, con un motivo que queda en la actividad. Los demás roles
   * reciben `forbidden`; una cita que no está completada, `conflict`. `notify`, por defecto, no.
   */
  correctStatus(businessId: string, appointmentId: string, input: AppointmentCorrectionInput): Promise<Appointment>;
  /**
   * La lista «Por cerrar» (spec 018): las citas que ya terminaron y siguen Pendiente o Confirmada, de la
   * más vieja a la más nueva, en tandas de 50 (`cursor`: el `nextCursor` de la anterior). El rol
   * Profesional recibe sólo las de su agenda; sin agenda asignada, `forbidden`.
   */
  listToClose(businessId: string, cursor?: string): Promise<AppointmentsToClose>;
  /** Sólo las cifras de la lista (el contador del panel): una consulta barata, sin nombres. */
  countToClose(businessId: string): Promise<AppointmentsToCloseCount>;
  /**
   * «Marcar todas como completadas»: las que se ven en la lista, en una transacción. Las que alguien ya
   * cerró (o no son de su agenda) vuelven en `skipped`, sin tocarlas. Al paciente sólo se le escribe con `notify`.
   */
  closeAll(businessId: string, input: CloseAllInput): Promise<CloseAllResult>;
  /** La lista de fechas de una serie, antes de crearla (spec 011): no cambia nada. */
  previewSeries(businessId: string, input: AppointmentSeriesPreviewInput): Promise<AppointmentSeriesPreview>;
  /**
   * Crea la serie con las fechas que quedaron en la lista. Las que se ocuparon mientras tanto vuelven en
   * `skipped`; si no se puede crear ninguna, falla con `conflict` (o `plan_limit`).
   */
  createSeries(businessId: string, input: AppointmentSeriesInput): Promise<AppointmentSeriesCreated>;
  /** «Cancelar ésta y las siguientes» de una serie: las citas canceladas, en orden. `notify`: «Avisar al paciente». */
  cancelFollowing(businessId: string, appointmentId: string, notify?: boolean): Promise<{ cancelled: Appointment[] }>;
  /** Registra en la actividad que se abrió WhatsApp con el aviso de un cambio de la cita. */
  /** `clientId`: a cuál de los pacientes de la cita (con varios pacientes, un registro por cada uno). */
  logWhatsAppNotice(businessId: string, appointmentId: string, kind: WhatsAppNoticeKind, clientId?: string): Promise<void>;
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
  /** Página «Tu cita» (/cita/:token, spec 010): la cita de ese enlace y lo que puede hacer quien lo abre. */
  getAppointment(token: string): Promise<PublicAppointment>;
  /** «Confirmo que voy»: una marca aparte, no cambia el estado de la cita. Repetirlo no cambia nada. */
  confirmAppointment(token: string): Promise<PublicAppointmentResult>;
  /** «Cancelar mi cita»: sólo el paciente principal, si el negocio lo permite y aún está en plazo. */
  cancelAppointment(token: string): Promise<PublicAppointmentResult>;
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
  /** El negocio de un código de referidos (spec 023), sólo si está activo; null si no. */
  getReferrer(code: string): Promise<{ name: string } | null>;
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
  /**
   * La analítica (spec 016): la última foto de ese periodo, que prepara el cron cada mañana (la API no
   * calcula nada). null: todavía no hay ninguna.
   */
  getAnalytics(days: AnalyticsPeriodDays): Promise<AnalyticsSnapshot | null>;
  listBusinesses(): Promise<AdminBusinessSummary[]>;
  getBusiness(businessId: string): Promise<AdminBusinessDetail | null>;
  /** Crea el negocio, todavía sin propietario (se agrega después con assignBusinessOwner). */
  createBusiness(input: AdminBusinessInput): Promise<AdminCreateBusinessResult>;
  /** Suspender bloquea el panel y la página pública del negocio; reactivar lo devuelve a la normalidad. */
  setBusinessStatus(businessId: string, status: BusinessStatus): Promise<Business>;
  changeBusinessPlan(businessId: string, plan: PlanId): Promise<Subscription>;
  /** Agendas contratadas por un negocio Business (null: sin tope). */
  setMaxProfessionals(businessId: string, maxProfessionals: number | null): Promise<Subscription>;
  /**
   * Datos del paciente obligatorios al crearlo o editarlo desde el panel del negocio (el nombre lo es
   * siempre). Sólo el super admin: el negocio no lo cambia, ni desde su configuración.
   */
  setClientRequiredFields(businessId: string, fields: ClientRequiredFields): Promise<Business>;
  /**
   * Citas con varios pacientes (sesiones de pareja, hasta 3 por cita) en el negocio. Sólo el super admin:
   * el negocio no lo cambia.
   */
  setMultiClientAppointments(businessId: string, enabled: boolean): Promise<Business>;
  /** «Recomendado por» (spec 023): otro negocio o null. Queda en la actividad. */
  setReferredBy(businessId: string, referredBy: string | null): Promise<AdminBusinessReferrals>;
  /** «Descuentos por referidos» (spec 023): los ganados y pendientes de aplicar. */
  listReferralRewards(): Promise<ReferralReward[]>;
  /** «Marcar como aplicado» (`conflict` si no se ganó o ya se aplicó). Queda en la actividad. */
  applyReferralReward(businessId: string): Promise<void>;
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
  /**
   * Propietario de un negocio que aún no lo tiene (cuenta nueva o una existente sin negocio); le
   * llega un email con su acceso. Con una sola agenda sin usuario, esa pasa a ser la suya.
   */
  assignBusinessOwner(businessId: string, input: BusinessOwnerInput): Promise<TeamMember>;
  listAuditLogs(filters: AdminAuditFilters): Promise<AuditLogPage<AdminAuditLog>>;
  /** Todos los emails de la plataforma (bandeja de salida global). */
  listEmails(): Promise<EmailNotification[]>;
  updateSettings(input: PlatformSettingsInput): Promise<PlatformSettings>;
  /** Colores del panel de plataforma de la cuenta que lo pide (spec 007). */
  updatePanelColors(input: PanelColorsInput): Promise<{ colors: BrandColors | null }>;
}

/** El aparato (este navegador) en el servicio de avisos: lo que da `PushSubscription.toJSON()`. */
export interface PushDeviceInput {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  /** La dirección anterior, si el servicio de avisos la renovó (conserva los tipos). */
  previousEndpoint?: string;
}

/**
 * Avisos en el celular (spec 013): sólo el propietario de un negocio y el super admin. El aparato se
 * identifica por su dirección, siempre en el cuerpo de la petición.
 */
export interface PushRepository {
  /** La clave pública y los tipos del rol. Si la API todavía no tiene avisos (404), `available: false`. */
  getConfig(): Promise<PushConfig>;
  /** Activa o actualiza este aparato (y quita la pausa de «Cerrar sesión»). */
  saveDevice(input: PushDeviceInput): Promise<PushDevice>;
  /** Los tipos apagados en este aparato. */
  updateKinds(endpoint: string, mutedKinds: PushKind[]): Promise<Pick<PushDevice, "mutedKinds">>;
  /** «Desactivar en este celular». Sin error si ya no existía. */
  turnOff(endpoint: string): Promise<void>;
  /** El aviso de prueba, al momento. Falla con `conflict` si el aparato ya no existe y `push_failed` si no salió. */
  sendTest(endpoint: string): Promise<{ sent: true }>;
}

/** Qué avisos pedir (GET …/notices). */
export interface NoticeListFilters {
  /** De 1 a 50; 20 por defecto (la lista de la campana). */
  limit?: number;
  /** Sólo los no leídos. */
  unread?: boolean;
  /** El `nextCursor` de la página anterior («Cargar más»). */
  cursor?: string;
}

/**
 * La campana de una persona (spec 014): la del negocio (`/businesses/:id/notices`, cualquier rol del
 * equipo; el super admin en modo soporte recibe `forbidden`) o la de /admin (`/admin/notices`). Cada
 * persona recibe lo suyo y lleva su propio leído. Leer no va a la actividad.
 */
export interface NoticeRepository {
  /** El contador: una consulta barata, sin textos. */
  unread(): Promise<{ unread: number }>;
  list(filters?: NoticeListFilters): Promise<PanelNoticePage>;
  /** Al tocarlo. Repetirlo no cambia nada; `not_found` si no existe o no es de esta persona. */
  markRead(noticeId: string): Promise<void>;
  /** «Marcar todo como leído». */
  markAllRead(): Promise<void>;
}

/** El centro de avisos del panel (spec 014): la campana del negocio y la de /admin. */
export interface NoticesRepository {
  business(businessId: string): NoticeRepository;
  platform: NoticeRepository;
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
  push: PushRepository;
  notices: NoticesRepository;
}
