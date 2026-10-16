import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useMediaQuery } from "@/hooks/use-media-query";
import { ToCloseList } from "./to-close-list";

const TITLE = "Por cerrar";
const DESCRIPTION = "Las citas que ya terminaron y siguen pendientes o confirmadas. Marca cómo terminó cada una.";

/** La lista «Por cerrar» (spec 018): en un diálogo en la computadora y en un Sheet desde abajo en el celular. */
export function ToCloseSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[min(46rem,calc(100dvh-2rem))] gap-5 overflow-y-auto p-5 sm:max-w-2xl">
          <DialogHeader className="pr-8">
            <DialogTitle className="text-lg font-semibold">{TITLE}</DialogTitle>
            <DialogDescription>{DESCRIPTION}</DialogDescription>
          </DialogHeader>
          <ToCloseList />
        </DialogContent>
      </Dialog>
    );
  }
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[92dvh] gap-0 overflow-y-auto rounded-t-2xl p-0">
        <SheetHeader className="border-b pr-12">
          <SheetTitle className="text-base font-semibold">{TITLE}</SheetTitle>
          <SheetDescription>{DESCRIPTION}</SheetDescription>
        </SheetHeader>
        <ToCloseList className="p-4" />
      </SheetContent>
    </Sheet>
  );
}
