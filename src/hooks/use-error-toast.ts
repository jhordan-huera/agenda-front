import { useNavigate } from "react-router";
import { toast } from "sonner";
import { DataError, getErrorMessage } from "@/lib/data";

/**
 * Muestra el error de una operación. Si es un límite del plan, ofrece actualizarlo
 * (el límite lo aplicó el backend; aquí sólo se informa).
 */
export function useErrorToast() {
  const navigate = useNavigate();
  return (error: unknown) => {
    if (error instanceof DataError && error.code === "plan_limit") {
      toast.error(error.message, {
        description: "Actualiza tu plan para seguir sumando citas, clientes o usuarios.",
        duration: 10_000,
        action: { label: "Actualizar a PRO", onClick: () => navigate("/dashboard/settings?tab=suscripcion") },
      });
      return;
    }
    toast.error(getErrorMessage(error));
  };
}
