import { useNavigate, useSearchParams } from "react-router";
import { useEffect } from "react";
import { getHomePath, safeNextPath } from "@/lib/auth";
import { useSession } from "./use-session";

/**
 * En las pantallas de acceso: si ya hay sesión, envía a su inicio (panel, plataforma u onboarding), o a
 * `?next=` si es una pantalla de su panel (la de un aviso, spec 013).
 */
export function RedirectIfAuthenticated() {
  const { status, session } = useSession();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const next = searchParams.get("next");

  useEffect(() => {
    if (status === "authenticated" && session) {
      navigate(safeNextPath(next, session) ?? getHomePath(session), { replace: true });
    }
  }, [status, session, navigate, next]);

  return null;
}
