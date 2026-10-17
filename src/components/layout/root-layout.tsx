import { Outlet, ScrollRestoration } from "react-router";
import { OfflineBanner } from "@/components/shared/offline-banner";
import { ThemeRouteSync } from "@/features/theme/theme-mode-provider";

export function RootLayout() {
  return (
    <>
      <ThemeRouteSync />
      <Outlet />
      <ScrollRestoration />
      <OfflineBanner />
    </>
  );
}
