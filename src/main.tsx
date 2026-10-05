import "@/lib/zod-config";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router/dom";
import { AppProviders } from "@/app/providers";
import { router } from "@/app/router";
import "./index.css";

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
    </AppProviders>
  </StrictMode>,
);
