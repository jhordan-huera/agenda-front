import { createContext, useContext } from "react";

/**
 * La pantalla de la mensualidad (spec 029), desde dentro del panel: la tarjeta de Configuración → Negocio la
 * vuelve a abrir con «Pagar ahora» (quita el «Más tarde» de ese cobro). Fuera del panel, no hace nada.
 */
export const BillingScreenContext = createContext<{ open: (chargeId: string) => void }>({ open: () => undefined });

export const useBillingScreen = () => useContext(BillingScreenContext);
