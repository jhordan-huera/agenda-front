import { ArrowRight, WalletCards } from "lucide-react";
import { Link } from "react-router";
import { CardTitleIcon } from "@/components/shared/card-title-icon";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { plural } from "@/lib/format";
import type { PlatformStats } from "@/types";

/**
 * Los cobros de las mensualidades en el Inicio de /admin (spec 029), arriba, como las solicitudes de plan:
 * «2 comprobantes por revisar · 1 atrasado», con el enlace a «Cobros». Sin nada pendiente, no ocupa lugar.
 */
export function BillingOverviewCard({ billing }: { billing: PlatformStats["billing"] }) {
  if (!billing || billing.inReview + billing.overdue === 0) return null;
  const parts = [
    billing.inReview > 0 && plural(billing.inReview, "comprobante por revisar", "comprobantes por revisar"),
    billing.overdue > 0 && plural(billing.overdue, "atrasado", "atrasados"),
  ].filter(Boolean);
  // Con comprobantes, abre los por revisar; si no, los atrasados.
  const to = billing.inReview > 0 ? "/admin/billing" : "/admin/billing?estado=atrasados";
  return (
    <Card className="ring-2 ring-amber-400 dark:ring-amber-500/60">
      <CardHeader>
        <CardTitle className="flex items-center gap-2.5">
          <CardTitleIcon icon={WalletCards} /> Cobros de las mensualidades
        </CardTitle>
        <CardDescription>{parts.join(" · ")}</CardDescription>
        <CardAction>
          <Button asChild size="sm">
            <Link to={to}>
              {billing.inReview > 0 ? "Revisar" : "Ver atrasados"} <ArrowRight aria-hidden />
            </Link>
          </Button>
        </CardAction>
      </CardHeader>
    </Card>
  );
}
