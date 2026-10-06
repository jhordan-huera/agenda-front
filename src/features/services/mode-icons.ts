import { Home, Store, Video, type LucideIcon } from "lucide-react";
import type { ServiceMode } from "@/types";

/** Ícono de cada modalidad (en el local, a domicilio, virtual). */
export const MODE_ICONS: Record<ServiceMode, LucideIcon> = {
  business: Store,
  home: Home,
  virtual: Video,
};
