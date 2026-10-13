import { Link } from "react-router";
import { PageTitle } from "@/components/shared/page-title";
import { AuthCardHeader } from "@/features/auth/auth-card-header";
import { LoginForm } from "@/features/auth/login-form";

export default function LoginPage() {
  return (
    <>
      <PageTitle title="Iniciar sesión" />
      <AuthCardHeader
        eyebrow="Hola de nuevo"
        title="Inicia sesión en tu"
        highlight="agenda"
        description={
          <>
            ¿No tienes cuenta?{" "}
            <Link to="/register" className="font-semibold text-primary hover:underline">
              Regístrate gratis
            </Link>
          </>
        }
      />
      <LoginForm />
      {/* Los pacientes a veces llegan aquí buscando cómo reservar: no necesitan cuenta. */}
      <p className="mt-7 border-t pt-5 text-sm text-muted-foreground">
        ¿Vienes a reservar una cita? No necesitas cuenta: usa el enlace que te compartió tu profesional.
      </p>
    </>
  );
}
