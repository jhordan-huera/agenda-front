import { Outlet, ScrollRestoration } from "react-router";
import { OfflineBanner } from "@/components/shared/offline-banner";

export function RootLayout() {
  return (
    <>
      <Outlet />
      <ScrollRestoration />
      <OfflineBanner />
    </>
  );
}
