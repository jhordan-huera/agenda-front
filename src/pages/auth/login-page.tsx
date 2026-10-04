import { Link } from "react-router";
import { PageTitle } from "@/components/shared/page-title";
import { AuthCardHeader } from "@/features/auth/auth-card-header";
import { LoginForm } from "@/features/auth/login-form";

export default function LoginPage() {
  return (
    <>
      <PageTitle title="Iniciar sesión" />
      <AuthCardHeader
        title="Inicia sesión"
        description={
          <>
            ¿No tienes cuenta?{" "}
            <Link to="/register" className="font-medium text-primary hover:underline">
              Regístrate gratis
            </Link>
          </>
        }
      />
      <LoginForm />
    </>
  );
}
