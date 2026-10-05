import type { ComponentType } from "react";
import { createBrowserRouter } from "react-router";
import { FullPageLoader } from "@/components/shared/full-page-loader";
import { AuthLayout } from "@/components/layout/auth-layout";
import { RootLayout } from "@/components/layout/root-layout";
import { isStaleAssetError, reloadForNewVersion } from "@/lib/new-version";
import ForgotPasswordPage from "@/pages/auth/forgot-password-page";
import LoginPage from "@/pages/auth/login-page";
import RegisterPage from "@/pages/auth/register-page";
import LandingPage from "@/pages/landing-page";
import NotFoundPage from "@/pages/not-found-page";
import RouteErrorPage from "@/pages/route-error-page";

/**
 * Carga diferida de una página (code splitting por ruta). Si la pestaña es de antes de un
 * despliegue, la página ya no existe en el servidor: se recarga para traer la versión nueva.
 */
const lazyPage = (load: () => Promise<{ default: ComponentType }>) => async () => {
  try {
    return { Component: (await load()).default };
  } catch (error) {
    if (isStaleAssetError(error) && reloadForNewVersion()) return new Promise<never>(() => {});
    throw error;
  }
};

export const router = createBrowserRouter([
  {
    Component: RootLayout,
    ErrorBoundary: RouteErrorPage,
    HydrateFallback: FullPageLoader,
    children: [
      { path: "/", Component: LandingPage },
      {
        Component: AuthLayout,
        children: [
          { path: "/login", Component: LoginPage },
          { path: "/register", Component: RegisterPage },
          { path: "/forgot-password", Component: ForgotPasswordPage },
        ],
      },
      { path: "/onboarding", lazy: lazyPage(() => import("@/pages/onboarding-page")) },
      {
        path: "/dashboard",
        lazy: lazyPage(() => import("@/components/layout/dashboard-layout")),
        children: [
          { index: true, lazy: lazyPage(() => import("@/pages/dashboard/dashboard-page")) },
          { path: "calendar", lazy: lazyPage(() => import("@/pages/dashboard/calendar-page")) },
          { path: "clients", lazy: lazyPage(() => import("@/pages/dashboard/clients-page")) },
          { path: "clients/:id", lazy: lazyPage(() => import("@/pages/dashboard/client-detail-page")) },
          { path: "clients/:id/historia-clinica", lazy: lazyPage(() => import("@/pages/dashboard/clinical-print-page")) },
          { path: "services", lazy: lazyPage(() => import("@/pages/dashboard/services-page")) },
          { path: "schedule", lazy: lazyPage(() => import("@/pages/dashboard/schedule-page")) },
          { path: "reports", lazy: lazyPage(() => import("@/pages/dashboard/reports-page")) },
          { path: "settings", lazy: lazyPage(() => import("@/pages/dashboard/settings-page")) },
          { path: "clinical-templates", lazy: lazyPage(() => import("@/pages/dashboard/clinical-templates-page")) },
          { path: "clinical-templates/new", lazy: lazyPage(() => import("@/pages/dashboard/clinical-template-editor-page")) },
          { path: "clinical-templates/:id", lazy: lazyPage(() => import("@/pages/dashboard/clinical-template-editor-page")) },
        ],
      },
      {
        // Panel de plataforma: sólo super admin (el layout redirige al resto; el backend lo vuelve a comprobar).
        path: "/admin",
        lazy: lazyPage(() => import("@/components/layout/admin-layout")),
        children: [
          { index: true, lazy: lazyPage(() => import("@/pages/admin/admin-overview-page")) },
          { path: "businesses", lazy: lazyPage(() => import("@/pages/admin/admin-businesses-page")) },
          { path: "businesses/:id", lazy: lazyPage(() => import("@/pages/admin/admin-business-detail-page")) },
          { path: "users", lazy: lazyPage(() => import("@/pages/admin/admin-users-page")) },
          { path: "plans", lazy: lazyPage(() => import("@/pages/admin/admin-plans-page")) },
          { path: "categories", lazy: lazyPage(() => import("@/pages/admin/admin-categories-page")) },
          { path: "activity", lazy: lazyPage(() => import("@/pages/admin/admin-activity-page")) },
          { path: "settings", lazy: lazyPage(() => import("@/pages/admin/admin-settings-page")) },
        ],
      },
      { path: "/book/:username", lazy: lazyPage(() => import("@/pages/booking-page")) },
      { path: "*", Component: NotFoundPage },
    ],
  },
]);
