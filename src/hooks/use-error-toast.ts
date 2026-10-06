import { toast } from "sonner";
import { useOpenSupport } from "@/features/support/use-open-support";
import { DataError, getErrorMessage } from "@/lib/data";

/**
 * Muestra el error de una operación. Si es un límite de lo contratado (citas, clientes, usuarios o
 * agendas), ofrece escribir a soporte: los planes no se muestran en la aplicación.
 */
export function useErrorToast() {
  const openSupport = useOpenSupport();
  return (error: unknown) => {
    if (error instanceof DataError && error.code === "plan_limit") {
      toast.error(error.message, {
        description: "Para ampliarlo, escríbenos y lo activamos.",
        duration: 10_000,
        action: { label: "Escribir a soporte", onClick: openSupport },
      });
      return;
    }
    toast.error(getErrorMessage(error));
  };
}
