import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router/dom";
import { PageAnalytics } from "@/app/page-analytics";
import { AppProviders } from "@/app/providers";
import { router } from "@/app/router";
import { ProductionDbBanner } from "@/components/layout/production-db-banner";
import { installGlobalErrorHandlers, recordPage } from "@/lib/error-reports";
import "./index.css";
// Guarda el aviso de "se puede instalar" aunque llegue antes de que se monte el panel.
import "@/features/install/install-prompt";
// Al tocar un aviso en el celular con la app abierta, abre su pantalla sin recargar (spec 013).
import "@/features/push/notification-navigation";

// Algunos navegadores (Vivaldi, Safari) siguen mostrando en la pestaña un icono anterior guardado
// en su caché. Al volver a declararlo al arrancar, con una versión en la URL, pintan el actual.
// Sube con cada icono nuevo: "tomate-1" es el de la spec 033.
const ICON_VERSION = "tomate-1";
for (const link of document.querySelectorAll<HTMLLinkElement>('link[rel~="icon"]')) {
  link.href = `${link.getAttribute("href")}?v=${ICON_VERSION}`;
}

// Avisos de errores a Sentry (spec 044): los errores sin atrapar y las páginas recorridas (limpias), por si
// hay que avisar de uno. Sentry se descarga sólo con el primer error.
installGlobalErrorHandlers();
recordPage(window.location.pathname);
router.subscribe((state) => recordPage(state.location.pathname));

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppProviders>
      <RouterProvider router={router} />
      <PageAnalytics />
      {import.meta.env.DEV && <ProductionDbBanner />}
    </AppProviders>
  </StrictMode>,
);
