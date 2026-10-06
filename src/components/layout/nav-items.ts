import {
  BarChart3,
  Building2,
  CalendarDays,
  Clock,
  ConciergeBell,
  Contact,
  CreditCard,
  History,
  LayoutDashboard,
  Settings,
  Tags,
  UserCog,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { Permission } from "@/lib/permissions";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Sólo activo en coincidencia exacta (para /dashboard). */
  end?: boolean;
  /** Permiso necesario para ver la sección. */
  permission?: Permission;
  /** Sólo en negocios con varias agendas (plan Business). */
  multiAgenda?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { to: "/dashboard", label: "Inicio", icon: LayoutDashboard, end: true },
  { to: "/dashboard/calendar", label: "Agenda", icon: CalendarDays },
  { to: "/dashboard/clients", label: "Clientes", icon: Users },
  { to: "/dashboard/services", label: "Servicios", icon: ConciergeBell, permission: "services.manage" },
  { to: "/dashboard/professionals", label: "Profesionales", icon: Contact, permission: "professionals.manage", multiAgenda: true },
  { to: "/dashboard/schedule", label: "Horarios", icon: Clock, permission: "schedule.manage" },
  { to: "/dashboard/reports", label: "Reportes", icon: BarChart3, permission: "reports.view" },
  { to: "/dashboard/settings", label: "Configuración", icon: Settings },
];

/** Panel de plataforma (super admin). */
export const ADMIN_NAV_ITEMS: NavItem[] = [
  { to: "/admin", label: "Resumen", icon: LayoutDashboard, end: true },
  { to: "/admin/businesses", label: "Negocios", icon: Building2 },
  { to: "/admin/users", label: "Usuarios", icon: UserCog },
  { to: "/admin/plans", label: "Planes", icon: CreditCard },
  { to: "/admin/categories", label: "Categorías", icon: Tags },
  { to: "/admin/activity", label: "Actividad", icon: History },
  { to: "/admin/settings", label: "Configuración", icon: Settings },
];
