import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { data, DataError } from "@/lib/data";
import type { PatientAccount } from "@/types";

/*
 * La cuenta del paciente (spec 052): /api/patient, con su propia cookie, aparte de la sesión del equipo. Sus claves
 * van aparte de queryKeys porque no son de un negocio.
 *
 * Sin sesión, la cuenta es null, no un error: SessionProvider vuelve a leer la sesión del equipo con cada
 * «unauthorized» que ve en la caché (y la borra si no hay), así que lo del paciente nunca le llega como error. Por lo
 * mismo, entrar, salir y lo del engranaje se llaman directo (sin useMutation).
 */
export const patientKeys = {
  config: ["patient", "config"] as const,
  account: ["patient", "account"] as const,
  cards: ["patient", "cards"] as const,
  reset: (token: string) => ["patient", "reset", token] as const,
};

const isUnauthorized = (error: unknown) => error instanceof DataError && error.code === "unauthorized";

/** La clave pública del CAPTCHA de «Crear mi cuenta» (null: no se pide). */
export function usePatientConfig() {
  return useQuery({
    queryKey: patientKeys.config,
    queryFn: () => data.patient.config(),
    staleTime: Number.POSITIVE_INFINITY,
  });
}

/** La cuenta de la sesión del paciente; null si no entró (o la sesión venció). */
export function usePatientAccount() {
  return useQuery({
    queryKey: patientKeys.account,
    queryFn: async (): Promise<PatientAccount | null> => {
      try {
        return await data.patient.me();
      } catch (error) {
        if (isUnauthorized(error)) return null;
        throw error;
      }
    },
  });
}

/** Sus tarjetas: una por consultorio que escaneó su QR y tiene la tarjeta encendida. */
export function usePatientCards(enabled: boolean) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: patientKeys.cards,
    enabled,
    queryFn: async () => {
      try {
        return await data.patient.cards();
      } catch (error) {
        if (!isUnauthorized(error)) throw error;
        // La sesión venció: vuelve a «Entrar».
        queryClient.setQueryData(patientKeys.account, null);
        return [];
      }
    },
  });
}

/** El enlace del consultorio para crear otra contraseña: si sirve todavía y el nombre para saludar. */
export function usePatientResetInfo(token: string) {
  return useQuery({
    queryKey: patientKeys.reset(token),
    queryFn: () => data.patient.resetInfo(token),
    retry: false,
    staleTime: Number.POSITIVE_INFINITY,
  });
}

/**
 * La sesión del paciente desde la página: `setAccount` al entrar (la cuenta) o al salir (null), `updateAccount` con
 * la cuenta al día (el QR nuevo) y `run` para lo que pide la sesión (el QR nuevo, la contraseña, eliminar la cuenta):
 * si ya venció, vuelve a «Entrar» y lo dice.
 */
export function usePatientSession() {
  const queryClient = useQueryClient();
  const setAccount = useCallback(
    (account: PatientAccount | null) => {
      queryClient.setQueryData(patientKeys.account, account);
      queryClient.removeQueries({ queryKey: patientKeys.cards });
    },
    [queryClient],
  );
  const updateAccount = useCallback(
    (account: PatientAccount) => queryClient.setQueryData(patientKeys.account, account),
    [queryClient],
  );
  const run = useCallback(
    async <T>(action: () => Promise<T>): Promise<T> => {
      try {
        return await action();
      } catch (error) {
        if (!isUnauthorized(error)) throw error;
        setAccount(null);
        throw new DataError("unauthorized", "Tu sesión terminó. Vuelve a entrar con tu teléfono.");
      }
    },
    [setAccount],
  );
  return { setAccount, updateAccount, run };
}
