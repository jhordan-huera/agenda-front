import "@/lib/zod-config";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router/dom";
import { PageAnalytics } from "@/app/page-analytics";
import { AppProviders } from "@/app/providers";
import { router } from "@/app/router";
import { ProductionDbBanner } from "@/components/layout/production-db-banner";
import "./index.css";
// Guarda el aviso de "se puede instalar" aunque llegue antes de que se monte el panel.
import "@/features/install/install-prompt";

// Algunos navegadores (Vivaldi, Safari) siguen mostrando en la pestaña un icono anterior guardado
// en su caché. Al volver a declararlo al arrancar, con una versión en la URL, pintan el actual.
const ICON_VERSION = "calendario-1";
for (const link of document.querySelectorAll<HTMLLinkElement>('link[rel~="icon"]')) {
  link.href = `${link.getAttribute("href")}?v=${ICON_VERSION}`;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppProviders>
      <RouterProvider router={router} />
      <PageAnalytics />
      {import.meta.env.DEV && <ProductionDbBanner />}
    </AppProviders>
  </StrictMode>,
);
