import { Menu } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Outlet } from "react-router";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { SidebarCollapseContext, useStoredCollapse } from "./sidebar-collapse-context";

interface AppShellProps {
  homeHref: string;
  /** Contenido de la barra lateral; en móvil recibe `onNavigate` para cerrar el menú. */
  renderSidebar: (onNavigate?: () => void) => ReactNode;
  /** Aviso fijo sobre el contenido (p. ej. el modo soporte del super admin). */
  banner?: ReactNode;
  /** La campana de avisos (spec 014) en la barra de arriba del celular; en la computadora va en el menú. */
  bell?: ReactNode;
}

/**
 * Estructura común de los paneles (negocio y plataforma). En escritorio, el menú es una tarjeta blanca
 * flotante a la izquierda y el contenido va sobre el lienzo gris claro; en el móvil, el contenido a
 * pantalla completa y el menú en un cajón. En escritorio el menú se puede encoger a una barra de iconos
 * (spec 036): el contenido se ensancha. El cajón del celular lo muestra siempre completo.
 */
export function AppShell({ homeHref, renderSidebar, banner, bell }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, toggle] = useStoredCollapse();

  return (
    <div
      className={cn(
        "min-h-screen bg-canvas transition-[padding] duration-200 ease-out motion-reduce:transition-none print:bg-white print:pl-0",
        collapsed ? "lg:pl-[5.75rem]" : "lg:pl-[16.75rem]",
      )}
    >
      <aside
        className={cn(
          "fixed inset-y-3 left-3 z-30 hidden overflow-hidden rounded-2xl border border-sidebar-border shadow-[0_8px_30px_-16px_rgb(16_24_40/0.18)] transition-[width] duration-200 ease-out motion-reduce:transition-none lg:flex print:hidden",
          collapsed ? "w-16" : "w-60",
        )}
      >
        <SidebarCollapseContext value={{ collapsed, toggle }}>{renderSidebar()}</SidebarCollapseContext>
      </aside>

      {/* En el móvil la cabecera ya queda fija arriba: el aviso (p. ej. el modo soporte) se va al desplazar. */}
      {banner && <div className="z-20 lg:sticky lg:top-0 print:hidden">{banner}</div>}

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
        {bell && <div className="ml-auto">{bell}</div>}
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8 print:max-w-none print:p-0">
        <Outlet />
      </main>
    </div>
  );
}
