import { LogOut } from "lucide-react";
import { useEffect } from "react";
import { useNavigate } from "react-router";
import { FullPageLoader } from "@/components/shared/full-page-loader";
import { Logo } from "@/components/shared/logo";
import { PageTitle } from "@/components/shared/page-title";
import { Button } from "@/components/ui/button";
import { useSession } from "@/features/auth/use-session";
import { OnboardingWizard } from "@/features/onboarding/onboarding-wizard";
import { useCurrentUser } from "@/hooks/queries/use-account";
import { getHomePath } from "@/lib/auth";

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { status, session, signOut } = useSession();
  const { data: user } = useCurrentUser();

  // Sólo para cuentas sin negocio; el super admin y quien ya tiene negocio van a su inicio.
  const home = session ? getHomePath(session) : null;

  useEffect(() => {
    if (status === "unauthenticated") navigate("/login", { replace: true });
    if (status === "authenticated" && home && home !== "/onboarding") navigate(home, { replace: true });
  }, [status, home, navigate]);

  if (status !== "authenticated" || home !== "/onboarding") return <FullPageLoader />;

  return (
    <div className="flex min-h-screen flex-col bg-muted/40">
      <PageTitle title="Configura tu negocio" />
      <header className="flex h-16 items-center justify-between border-b bg-background px-4 sm:px-6">
        <Logo href="/onboarding" />
        <Button variant="ghost" onClick={signOut}>
          <LogOut /> Salir
        </Button>
      </header>
      <main className="flex-1 px-4 py-10 sm:py-16">
        <OnboardingWizard firstName={user?.firstName} />
      </main>
    </div>
  );
}
