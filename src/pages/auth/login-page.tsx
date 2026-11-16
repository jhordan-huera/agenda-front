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
      {/*
        Los pacientes a veces llegan aquí buscando cómo reservar (no necesitan cuenta) o su tarjeta de fidelización (su
        cuenta es otra, spec 052). Aparte, bajo una línea: es para otra persona.
      */}
      <div className="mt-8 space-y-2 border-t border-border pt-6 text-sm text-muted-foreground">
        <p>¿Vienes a reservar una cita? No necesitas cuenta: usa el enlace que te compartió tu profesional.</p>
        <p>
          ¿Tienes tarjeta de fidelización?{" "}
          <Link to="/mi-tarjeta" className={AUTH_LINK}>
            Entra aquí
          </Link>
        </p>
      </div>
    </>
  );
}
