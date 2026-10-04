import { Compass } from "lucide-react";
import { Link } from "react-router";
import { Logo } from "@/components/shared/logo";
import { PageTitle } from "@/components/shared/page-title";
import { Button } from "@/components/ui/button";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
      <PageTitle title="Página no encontrada" />
      <Logo />
      <Compass className="size-10 text-muted-foreground" aria-hidden />
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Página no encontrada</h1>
        <p className="text-muted-foreground">La dirección que buscas no existe o fue movida.</p>
      </div>
      <Button asChild size="lg">
        <Link to="/">Volver al inicio</Link>
      </Button>
    </div>
  );
}
