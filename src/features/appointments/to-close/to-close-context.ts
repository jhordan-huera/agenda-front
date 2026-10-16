import { createContext, useContext } from "react";
import type { ToCloseCount } from "@/hooks/queries/use-to-close";

/**
 * La lista «Por cerrar» (spec 018) del panel: la abren el botón «Por cerrar (N)» de la agenda y la franja
 * «Tienes N citas por cerrar». La provee DashboardShell; fuera del panel no hay lista.
 */
export interface ToCloseContextValue {
  count: ToCloseCount;
  /** Abre la lista (en un Sheet en el celular). */
  open: () => void;
}

export const ToCloseContext = createContext<ToCloseContextValue | null>(null);

export const useToClose = () => useContext(ToCloseContext);
