import { useNavigate } from "react-router";
import { useEffect } from "react";
import { getHomePath } from "@/lib/auth";
import { useSession } from "./use-session";

/** En las pantallas de acceso: si ya hay sesión, envía a su inicio (panel, plataforma u onboarding). */
export function RedirectIfAuthenticated() {
  const { status, session } = useSession();
  const navigate = useNavigate();

  useEffect(() => {
    if (status === "authenticated" && session) {
      navigate(getHomePath(session), { replace: true });
    }
  }, [status, session, navigate]);

  return null;
}
