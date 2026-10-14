import { AlertTriangle, ChevronRight, CircleCheck, Info } from "lucide-react";
import { Link } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { AttentionItem } from "./attention";

/** Cuántas cosas se listan; del resto se dice cuántas son. */
const MAX_ITEMS = 6;

/** «Requiere tu atención»: lo primero que mira el super admin al entrar (ver attention.ts). */
export function AttentionCard({ items, loading }: { items: AttentionItem[]; loading: boolean }) {
  const shown = items.slice(0, MAX_ITEMS);
  const rest = items.length - shown.length;
  return (
    <Card className={cn(items.length > 0 && "ring-2 ring-amber-300")}>
      <CardHeader>
        <CardTitle>Requiere tu atención</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-16" />
        ) : items.length === 0 ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <CircleCheck className="size-4 text-emerald-600" aria-hidden />
            Todo en orden: no hay solicitudes pendientes ni negocios que necesiten algo.
          </p>
        ) : (
          <ul className="-mx-3 divide-y">
            {shown.map((item) => {
              const Icon = item.tone === "warning" ? AlertTriangle : Info;
              const content = (
                <>
                  <Icon className={cn("size-4 shrink-0", item.tone === "warning" ? "text-amber-600" : "text-muted-foreground")} aria-hidden />
                  <span className="min-w-0 flex-1 text-sm">{item.text}</span>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                </>
              );
              const className = "flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-muted";
              return (
                <li key={item.id}>
                  {item.href.startsWith("#") ? (
                    <a href={item.href} className={className}>
                      {content}
                    </a>
                  ) : (
                    <Link to={item.href} className={className}>
                      {content}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {rest > 0 && (
          <p className="mt-2 text-sm text-muted-foreground">
            …y {rest} más.{" "}
            <Link to="/admin/businesses" className="font-medium text-primary hover:underline">
              Ver negocios
            </Link>
          </p>
        )}
      </CardContent>
    </Card>
  );
}
