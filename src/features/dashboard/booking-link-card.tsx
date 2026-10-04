import { Check, Copy, ExternalLink } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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
    <Card>
      <CardHeader>
        <CardTitle>Tu página de reservas</CardTitle>
        <CardDescription>Compártela para que tus clientes reserven solos.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="truncate rounded-lg bg-muted px-3 py-2 font-mono text-xs">{url.replace(/^https?:\/\//, "")}</p>
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={copy}>
            {copied ? <Check /> : <Copy />} {copied ? "Copiado" : "Copiar"}
          </Button>
          <Button asChild variant="outline" className="flex-1">
            <a href={url} target="_blank" rel="noreferrer">
              <ExternalLink /> Abrir
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
