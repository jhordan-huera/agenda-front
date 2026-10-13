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

/**
 * Estructura común de los paneles (negocio y plataforma). En escritorio, el menú es una tarjeta blanca
 * flotante a la izquierda y el contenido va sobre el lienzo gris claro; en el móvil, el contenido a
 * pantalla completa y el menú en un cajón.
 */
export function AppShell({ homeHref, renderSidebar, banner }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-canvas lg:pl-[16.75rem] print:bg-white print:pl-0">
      <aside className="fixed inset-y-3 left-3 z-30 hidden w-60 overflow-hidden rounded-2xl border border-sidebar-border shadow-[0_8px_30px_-16px_rgb(16_24_40/0.18)] lg:flex print:hidden">
        {renderSidebar()}
      </aside>

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
