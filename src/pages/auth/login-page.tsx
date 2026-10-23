import { Link } from "react-router";
import { PageTitle } from "@/components/shared/page-title";
import { AuthCardHeader } from "@/features/auth/auth-card-header";
import { AUTH_LINK } from "@/features/auth/auth-styles";
import { LoginForm } from "@/features/auth/login-form";

export default function LoginPage() {
  return (
    <>
      <PageTitle title="Iniciar sesión" />
      <AuthCardHeader
        title="Inicia sesión en tu agenda"
        description={
          <>
            ¿No tienes cuenta?{" "}
            <Link to="/register" className={AUTH_LINK}>
              Regístrate gratis
            </Link>
          </>
        }
      />
      <LoginForm />
      {/* Los pacientes a veces llegan aquí buscando cómo reservar: no necesitan cuenta. Aparte, bajo una línea: es para otra persona. */}
      <p className="mt-8 border-t border-border pt-6 text-sm text-muted-foreground">
        ¿Vienes a reservar una cita? No necesitas cuenta: usa el enlace que te compartió tu profesional.
      </p>
    </>
  );
}
