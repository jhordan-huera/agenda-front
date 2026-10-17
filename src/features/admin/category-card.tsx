import { Clock, Pencil, Stethoscope, Trash2 } from "lucide-react";
import { createElement } from "react";
import { Button } from "@/components/ui/button";
import { getCategoryIcon } from "@/features/categories/category-icons";
import { formatDuration, plural } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AdminBusinessCategory } from "@/types";

interface CategoryCardProps {
  category: AdminBusinessCategory;
  onEdit: () => void;
  onDelete: () => void;
}

/** Una categoría de negocio en el panel de plataforma (spec 007). */
export function CategoryCard({ category, onEdit, onDelete }: CategoryCardProps) {
  const inUse = category.businessCount > 0;
  return (
    <article
      className={cn(
        "flex h-full flex-col rounded-xl bg-card ring-1 ring-foreground/10 transition-shadow hover:shadow-md",
        !category.isActive && "bg-muted/40",
      )}
    >
      <div className="flex items-start gap-3 p-4">
        <span
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-xl",
            category.isActive ? "bg-accent text-ink" : "bg-muted text-muted-foreground",
          )}
          aria-hidden
        >
          {createElement(getCategoryIcon(category.icon), { className: "size-5" })}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className={cn("truncate font-semibold", !category.isActive && "text-muted-foreground")} title={category.name}>
            {category.name}
          </h3>
          <p className="truncate text-xs text-muted-foreground">{category.id}</p>
        </div>
        <div className="-mt-1 -mr-1 flex shrink-0 gap-0.5">
          <Button variant="ghost" size="icon-sm" aria-label={`Editar ${category.name}`} onClick={onEdit}>
            <Pencil />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Eliminar ${category.name}`}
            disabled={inUse}
            title={inUse ? "En uso: desactívala en lugar de eliminarla" : undefined}
            onClick={onDelete}
          >
            <Trash2 />
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 px-4 pb-4">
        {category.isActive ? (
          <span className="inline-flex h-5 items-center rounded-full bg-emerald-50 px-2 text-xs font-medium text-emerald-700 ring-1 ring-emerald-600/20 ring-inset dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/40">
            Activa
          </span>
        ) : (
          <span className="inline-flex h-5 items-center rounded-full bg-zinc-100 px-2 text-xs font-medium text-zinc-600 ring-1 ring-zinc-500/20 ring-inset dark:bg-zinc-500/15 dark:text-zinc-300 dark:ring-zinc-500/40">
            Inactiva
          </span>
        )}
        {category.isHealth && (
          <span className="inline-flex h-5 items-center gap-1 rounded-full bg-accent px-2 text-xs font-medium text-ink ring-1 ring-ink/20 ring-inset">
            <Stethoscope className="size-3" aria-hidden /> Historia clínica
          </span>
        )}
      </div>

      <dl className="mt-auto grid grid-cols-[auto_minmax(0,1fr)] gap-x-8 border-t px-4 py-3 text-xs">
        <div>
          <dt className="text-muted-foreground">Negocios</dt>
          <dd className="mt-0.5 font-medium">{plural(category.businessCount, "negocio", "negocios")}</dd>
        </div>
        <div className="min-w-0">
          <dt className="flex items-center gap-1 text-muted-foreground">
            <Clock className="size-3.5" aria-hidden /> Primer servicio
          </dt>
          <dd className="mt-0.5 truncate font-medium" title={category.suggestedService.name}>
            {category.suggestedService.name} · {formatDuration(category.suggestedService.durationMinutes)}
          </dd>
        </div>
      </dl>
    </article>
  );
}
