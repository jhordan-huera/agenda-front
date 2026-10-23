import { Outlet, ScrollRestoration } from "react-router";
import { OfflineBanner } from "@/components/shared/offline-banner";
import { BrandBootRouteSync } from "@/features/branding/brand-boot";
import { ThemeRouteSync } from "@/features/theme/theme-mode-provider";

export function RootLayout() {
  return (
    <>
      <ThemeRouteSync />
      <BrandBootRouteSync />
      <Outlet />
      <ScrollRestoration />
      <OfflineBanner />
    </>
  );
}
