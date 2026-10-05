import { Trash2 } from "lucide-react";
import type { MouseEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { BodyMapMark } from "@/types";

/*
 * Mapa del cuerpo: silueta de frente y de espalda. Cada marca guarda la vista y su posición
 * relativa (0 a 1), así se dibuja igual a cualquier tamaño.
 */

const VIEW_WIDTH = 100;
const VIEW_HEIGHT = 220;
const VIEWS: { view: BodyMapMark["view"]; label: string }[] = [
  { view: "front", label: "Frente" },
  { view: "back", label: "Espalda" },
];

/** Silueta humana sencilla (cabeza, tronco, brazos y piernas). */
function Silhouette() {
  return (
    <g fill="#e2e8f0" stroke="#94a3b8" strokeWidth={1}>
      <circle cx={50} cy={18} r={12} />
      <rect x={45} y={29} width={10} height={8} rx={2} />
      <path d="M30 38 Q50 33 70 38 L72 92 Q72 108 64 112 L36 112 Q28 108 28 92 Z" />
      <path d="M30 40 L18 82 L13 112 L19 113 L26 86 L33 58 Z" />
      <path d="M70 40 L82 82 L87 112 L81 113 L74 86 L67 58 Z" />
      <path d="M36 110 L49 110 L47 160 L45 210 L36 210 L37 160 Z" />
      <path d="M51 110 L64 110 L63 160 L64 210 L55 210 L53 160 Z" />
    </g>
  );
}

function MarkDot({ index, mark }: { index: number; mark: BodyMapMark }) {
  return (
    <g transform={`translate(${mark.x * VIEW_WIDTH}, ${mark.y * VIEW_HEIGHT})`}>
      <circle r={5.5} fill="#dc2626" stroke="#fff" strokeWidth={1.2} />
      <text y={2.6} textAnchor="middle" fontSize={7} fontWeight={700} fill="#fff">
        {index + 1}
      </text>
    </g>
  );
}

function BodyFigures({ marks, onAdd, className }: { marks: BodyMapMark[]; onAdd?: (mark: BodyMapMark) => void; className?: string }) {
  const add = (view: BodyMapMark["view"]) => (event: MouseEvent<SVGSVGElement>) => {
    if (!onAdd) return;
    const box = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - box.left) / box.width;
    const y = (event.clientY - box.top) / box.height;
    onAdd({ view, x: Math.min(1, Math.max(0, x)), y: Math.min(1, Math.max(0, y)), note: "" });
  };
  return (
    <div className={cn("grid grid-cols-2 gap-3", className)}>
      {VIEWS.map(({ view, label }) => (
        <figure key={view} className="grid justify-items-center gap-1">
          <svg
            viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
            className={cn("h-56 w-auto rounded-lg border bg-background", onAdd && "cursor-crosshair")}
            role={onAdd ? "button" : "img"}
            aria-label={onAdd ? `${label}: toca para marcar` : `${label} con ${marks.filter((m) => m.view === view).length} marcas`}
            onClick={add(view)}
          >
            <Silhouette />
            {marks.map((mark, index) => (mark.view === view ? <MarkDot key={index} index={index} mark={mark} /> : null))}
          </svg>
          <figcaption className="text-xs text-muted-foreground">{label}</figcaption>
        </figure>
      ))}
    </div>
  );
}

const viewLabel = (view: BodyMapMark["view"]) => (view === "front" ? "Frente" : "Espalda");

/** Mapa de sólo lectura con la lista de marcas (ficha e impresión). */
export function BodyMapView({ marks }: { marks: BodyMapMark[] }) {
  return (
    <div className="grid gap-2">
      <BodyFigures marks={marks} className="max-w-xs" />
      <ol className="grid gap-0.5 text-sm">
        {marks.map((mark, index) => (
          <li key={index}>
            <span className="font-medium">{index + 1}.</span> {viewLabel(mark.view)}
            {mark.note && ` — ${mark.note}`}
          </li>
        ))}
      </ol>
    </div>
  );
}

/** Mapa editable: tocar la silueta añade una marca numerada con su nota. */
export function BodyMapInput({ value, onChange }: { value: BodyMapMark[]; onChange: (value: BodyMapMark[]) => void }) {
  return (
    <div className="grid gap-3">
      <p className="text-xs text-muted-foreground">Toca la silueta donde está la lesión o el dolor.</p>
      <BodyFigures marks={value} onAdd={(mark) => onChange([...value, mark])} className="max-w-sm" />
      {value.length > 0 && (
        <ol className="grid gap-2">
          {value.map((mark, index) => (
            <li key={index} className="flex items-center gap-2">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white">
                {index + 1}
              </span>
              <span className="w-14 shrink-0 text-xs text-muted-foreground">{viewLabel(mark.view)}</span>
              <Input
                aria-label={`Nota de la marca ${index + 1}`}
                placeholder="Qué hay en este punto (p. ej. contusión, dolor 7/10)"
                maxLength={200}
                value={mark.note}
                onChange={(e) => onChange(value.map((m, i) => (i === index ? { ...m, note: e.target.value } : m)))}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Quitar la marca ${index + 1}`}
                onClick={() => onChange(value.filter((_, i) => i !== index))}
              >
                <Trash2 />
              </Button>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
