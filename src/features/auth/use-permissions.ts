import { hasPermission, type Permission } from "@/lib/permissions";
import { useSession } from "./use-session";

/** Permisos del usuario actual según su rol. El backend vuelve a comprobarlos siempre. */
export function usePermissions() {
  const { session } = useSession();
  const role = session?.role ?? null;
  return { role, can: (permission: Permission) => hasPermission(role, permission) };
}
