import { createContext, useContext, useState } from "react";

/*
 * El menú que se encoge (spec 036): en la computadora, un botón lo deja como una barra de iconos y la
 * página se ensancha. Se recuerda en este equipo. El cajón del celular lo pinta siempre completo.
 */

const STORAGE_KEY = "agenda360:menu-encogido";

interface SidebarCollapse {
  collapsed: boolean;
  /** null: no se puede encoger (el cajón del celular). */
  toggle: (() => void) | null;
}

export const SidebarCollapseContext = createContext<SidebarCollapse>({ collapsed: false, toggle: null });

export const useSidebarCollapse = () => useContext(SidebarCollapseContext);

/** Lo encogido, guardado en el equipo (sin almacenamiento, empieza completo cada vez). */
export function useStoredCollapse(): [boolean, () => void] {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      return false;
    }
  });
  const toggle = () =>
    setCollapsed((current) => {
      const next = !current;
      try {
        if (next) localStorage.setItem(STORAGE_KEY, "1");
        else localStorage.removeItem(STORAGE_KEY);
      } catch {
        // Sin almacenamiento: vale para esta visita.
      }
      return next;
    });
  return [collapsed, toggle];
}
