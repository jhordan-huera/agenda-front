import { Check, Copy, ExternalLink } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function BookingLinkCard({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false);
  const url = `${window.location.origin}/book/${slug}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Enlace copiado");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("No se pudo copiar el enlace");
    }
  };

  return (
    <section aria-labelledby="booking-link-heading" className="rounded-2xl bg-accent p-5 sm:p-6">
      <h2 id="booking-link-heading" className="text-base font-bold tracking-[-0.01em]">
        Tu página de reservas
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">Compártela por WhatsApp para que tus clientes reserven solos.</p>
      <p className="mt-4 truncate rounded-xl bg-card px-3 py-2.5 text-sm font-semibold text-ink shadow-[0_1px_2px_rgb(16_24_40/0.05)]">
        {url.replace(/^https?:\/\//, "")}
      </p>
      <div className="mt-3 flex gap-2">
        <Button variant="outline" className="flex-1 bg-card" onClick={copy}>
          {copied ? <Check /> : <Copy />} {copied ? "Copiado" : "Copiar"}
        </Button>
        <Button asChild variant="outline" className="flex-1 bg-card">
          <a href={url} target="_blank" rel="noreferrer">
            <ExternalLink /> Abrir
          </a>
        </Button>
      </div>
    </section>
  );
}
