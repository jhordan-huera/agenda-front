import { useNavigate } from "react-router";
import { toast } from "sonner";
import { useSession } from "@/features/auth/use-session";

/**
 * Cierra la sesión, limpia la caché y vuelve al login. Si el servidor no responde (sin conexión), la
 * sesión sigue abierta: se dice claro y se ofrece reintentar, para que nadie deje el panel abierto en
 * un equipo compartido creyendo que lo cerró (spec 009).
 */
export function useSignOut() {
  const { signOut } = useSession();
  const navigate = useNavigate();
  const run = async () => {
    try {
      await signOut();
    } catch {
      toast.error("No se pudo cerrar la sesión. Revisa tu conexión: la sesión sigue abierta.", {
        duration: Infinity,
        action: { label: "Reintentar", onClick: () => void run() },
      });
      return;
    }
    toast.success("Sesión cerrada");
    navigate("/login", { replace: true });
  };
  return run;
}
