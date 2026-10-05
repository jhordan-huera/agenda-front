import { Menu } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Outlet } from "react-router";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

interface AppShellProps {
  homeHref: string;
  /** Contenido de la barra lateral; en móvil recibe `onNavigate` para cerrar el menú. */
  renderSidebar: (onNavigate?: () => void) => ReactNode;
  /** Aviso fijo sobre el contenido (p. ej. el modo soporte del super admin). */
  banner?: ReactNode;
}

/** Estructura común de los paneles (negocio y plataforma): barra lateral fija y menú móvil. */
export function AppShell({ homeHref, renderSidebar, banner }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    // El contenido es la hoja de papel; la barra lateral, el escritorio con las pestañas de la agenda.
    // Sin borde entre ambos: la pestaña activa es del mismo papel que la hoja y se une a ella.
    <div className="min-h-screen bg-background lg:pl-64 print:bg-white print:pl-0">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:flex print:hidden">{renderSidebar()}</aside>

      {banner && <div className="sticky top-0 z-20 print:hidden">{banner}</div>}

      <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-background/90 px-4 backdrop-blur lg:hidden print:hidden">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Abrir menú">
              <Menu />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 gap-0 p-0" showCloseButton={false}>
            <SheetTitle className="sr-only">Menú de navegación</SheetTitle>
            {renderSidebar(() => setMobileOpen(false))}
          </SheetContent>
        </Sheet>
        <Logo href={homeHref} />
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8 print:max-w-none print:p-0">
        <Outlet />
      </main>
    </div>
  );
}
