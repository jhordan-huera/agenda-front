import { useNavigate } from "react-router";
import { toast } from "sonner";
import { useSession } from "@/features/auth/use-session";

/** Cierra la sesión, limpia la caché y vuelve al login. */
export function useSignOut() {
  const { signOut } = useSession();
  const navigate = useNavigate();
  return async () => {
    await signOut();
    toast.success("Sesión cerrada");
    navigate("/login", { replace: true });
  };
}
