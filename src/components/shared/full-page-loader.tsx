import { Loader2 } from "lucide-react";

export function FullPageLoader({ label = "Cargando…" }: { label?: string }) {
  return (
    <div className="flex min-h-screen flex-1 items-center justify-center" role="status">
      <Loader2 className="size-6 animate-spin text-primary" aria-hidden />
      <span className="sr-only">{label}</span>
    </div>
  );
}
