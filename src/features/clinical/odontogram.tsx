import { Eraser } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { OdontogramValue, ToothState, ToothSurface, ToothSurfaceState, ToothWholeState } from "@/types";
import { describeTooth, SURFACE_STATES, WHOLE_STATES } from "./odontogram-labels";

/*
 * Odontograma con numeración FDI. Cada pieza es un cuadrado de 5 superficies: el centro es la
 * oclusal/incisal; vestibular arriba en el maxilar y abajo en la mandíbula; mesial hacia la línea media.
 */

const ROWS = {
  upper: [["18", "17", "16", "15", "14", "13", "12", "11"], ["21", "22", "23", "24", "25", "26", "27", "28"]],
  upperPrimary: [["55", "54", "53", "52", "51"], ["61", "62", "63", "64", "65"]],
  lowerPrimary: [["85", "84", "83", "82", "81"], ["71", "72", "73", "74", "75"]],
  lower: [["48", "47", "46", "45", "44", "43", "42", "41"], ["31", "32", "33", "34", "35", "36", "37", "38"]],
} as const;

const isUpper = (tooth: string) => ["1", "2", "5", "6"].includes(tooth[0]);
/** Lado derecho del paciente (izquierda del dibujo): su mesial queda a la derecha del cuadrado. */
const isPatientRight = (tooth: string) => ["1", "4", "5", "8"].includes(tooth[0]);

type Position = "top" | "bottom" | "left" | "right" | "center";

function surfaceAt(tooth: string, position: Position): ToothSurface {
  if (position === "center") return "O";
  if (position === "top") return isUpper(tooth) ? "V" : "L";
  if (position === "bottom") return isUpper(tooth) ? "L" : "V";
  const mesialRight = isPatientRight(tooth);
  if (position === "right") return mesialRight ? "M" : "D";
  return mesialRight ? "D" : "M";
}

const SURFACE_COLOR = Object.fromEntries(SURFACE_STATES.map((state) => [state.value, state.color])) as Record<ToothSurfaceState, string>;

function polygons(size: number) {
  const a = size * 0.3;
  const s = size;
  return {
    top: `0,0 ${s},0 ${s - a},${a} ${a},${a}`,
    bottom: `${a},${s - a} ${s - a},${s - a} ${s},${s} 0,${s}`,
    left: `0,0 ${a},${a} ${a},${s - a} 0,${s}`,
    right: `${s},0 ${s},${s} ${s - a},${s - a} ${s - a},${a}`,
    center: `${a},${a} ${s - a},${a} ${s - a},${s - a} ${a},${s - a}`,
  } satisfies Record<Position, string>;
}

/** Una pieza dibujada en SVG (en el origen; el llamador la posiciona). */
function ToothShape({
  tooth,
  state,
  size,
  onSurface,
}: {
  tooth: string;
  state?: ToothState;
  size: number;
  onSurface?: (surface: ToothSurface) => void;
}) {
  const shapes = polygons(size);
  const whole = state?.whole;
  const faded = whole === "ausente" || whole === "extraccion";
  return (
    <g opacity={whole === "ausente" ? 0.45 : 1}>
      {(Object.keys(shapes) as Position[]).map((position) => {
        const surface = surfaceAt(tooth, position);
        const surfaceState = state?.surfaces?.[surface];
        return (
          <polygon
            key={position}
            points={shapes[position]}
            fill={surfaceState && !faded ? SURFACE_COLOR[surfaceState] : "#ffffff"}
            stroke="#94a3b8"
            strokeWidth={1}
            className={onSurface ? "cursor-pointer hover:opacity-80" : undefined}
            onClick={onSurface ? () => onSurface(surface) : undefined}
          >
            {onSurface && <title>{`Superficie ${surface}`}</title>}
          </polygon>
        );
      })}
      {whole === "corona" && <circle cx={size / 2} cy={size / 2} r={size * 0.62} fill="none" stroke="#2563eb" strokeWidth={2} />}
      {whole === "endodoncia" && <rect x={-2} y={-2} width={size + 4} height={size + 4} fill="none" stroke="#9333ea" strokeWidth={2.5} />}
      {whole === "implante" && (
        <text x={size / 2} y={size / 2 + 4} textAnchor="middle" fontSize={size * 0.35} fontWeight={700} fill="#2563eb">
          I
        </text>
      )}
      {(whole === "extraccion" || whole === "ausente") && (
        <g stroke={whole === "extraccion" ? "#dc2626" : "#475569"} strokeWidth={2.5} strokeLinecap="round">
          <line x1={2} y1={2} x2={size - 2} y2={size - 2} />
          <line x1={size - 2} y1={2} x2={2} y2={size - 2} />
        </g>
      )}
    </g>
  );
}

const TOOTH = 30;
const GAP = 6;
const MIDLINE = 14;

/** Odontograma completo en SVG (se adapta al ancho). Al tocar una pieza se llama a `onSelect`. */
function OdontogramChart({
  value,
  showPrimary,
  selected,
  onSelect,
  className,
}: {
  value: OdontogramValue;
  showPrimary: boolean;
  selected?: string | null;
  onSelect?: (tooth: string) => void;
  className?: string;
}) {
  const rows = showPrimary
    ? [ROWS.upper, ROWS.upperPrimary, ROWS.lowerPrimary, ROWS.lower]
    : [ROWS.upper, ROWS.lower];
  const width = 16 * TOOTH + 15 * GAP + MIDLINE;
  const rowHeight = TOOTH + 18;
  const height = rows.length * rowHeight + (showPrimary ? 6 : 10);

  return (
    <svg viewBox={`-4 -2 ${width + 8} ${height + 4}`} className={cn("w-full", className)} role="img" aria-label="Odontograma">
      {rows.map((halves, rowIndex) => {
        const upperRow = rowIndex < rows.length / 2;
        const y = rowIndex * rowHeight + (rowIndex >= rows.length / 2 ? (showPrimary ? 6 : 10) : 0);
        const teethInHalf = halves[0].length;
        // Las filas de temporales (5 piezas) se centran respecto de las permanentes (8).
        const offset = (8 - teethInHalf) * (TOOTH + GAP);
        return (
          <g key={rowIndex}>
            {halves.map((half, sideIndex) =>
              half.map((tooth, i) => {
                const x =
                  sideIndex === 0
                    ? offset + i * (TOOTH + GAP)
                    : 8 * (TOOTH + GAP) - GAP + MIDLINE + i * (TOOTH + GAP);
                // Maxilar: número arriba y pieza debajo; mandíbula: pieza arriba y número debajo.
                const numberY = upperRow ? 9 : TOOTH + 15;
                const toothY = upperRow ? 14 : 4;
                return (
                  <g
                    key={tooth}
                    transform={`translate(${x}, ${y})`}
                    className={onSelect ? "cursor-pointer" : undefined}
                    onClick={onSelect ? () => onSelect(tooth) : undefined}
                    role={onSelect ? "button" : undefined}
                    aria-label={onSelect ? `Pieza ${tooth}${value[tooth] ? `: ${describeTooth(value[tooth])}` : ""}` : undefined}
                    tabIndex={onSelect ? 0 : undefined}
                    onKeyDown={
                      onSelect
                        ? (event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              onSelect(tooth);
                            }
                          }
                        : undefined
                    }
                  >
                    <text
                      x={TOOTH / 2}
                      y={numberY}
                      textAnchor="middle"
                      fontSize={9}
                      fill={selected === tooth ? "#4f46e5" : "#64748b"}
                      fontWeight={selected === tooth ? 700 : 400}
                    >
                      {tooth}
                    </text>
                    <g transform={`translate(0, ${toothY})`}>
                      {selected === tooth && (
                        <rect x={-3} y={-3} width={TOOTH + 6} height={TOOTH + 6} rx={4} fill="none" stroke="#4f46e5" strokeWidth={2} />
                      )}
                      <ToothShape tooth={tooth} state={value[tooth]} size={TOOTH} />
                    </g>
                  </g>
                );
              }),
            )}
          </g>
        );
      })}
      <line x1={8 * (TOOTH + GAP) - GAP + MIDLINE / 2} y1={0} x2={8 * (TOOTH + GAP) - GAP + MIDLINE / 2} y2={height} stroke="#cbd5e1" strokeDasharray="3 3" />
    </svg>
  );
}

export function OdontogramLegend() {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground" aria-label="Leyenda del odontograma">
      {SURFACE_STATES.map((state) => (
        <li key={state.value} className="flex items-center gap-1.5">
          <span className="size-3 rounded-sm border" style={{ background: state.color }} aria-hidden /> {state.label}
        </li>
      ))}
      {WHOLE_STATES.map((state) => (
        <li key={state.value} className="flex items-center gap-1.5">
          <span className="text-[11px] font-semibold" style={{ color: state.color }} aria-hidden>
            {state.symbol}
          </span>
          {state.label}
        </li>
      ))}
    </ul>
  );
}

const hasPrimary = (value: OdontogramValue) => Object.keys(value).some((tooth) => Number(tooth[0]) >= 5);

/** Odontograma de sólo lectura con la lista de hallazgos (ficha e impresión). */
export function OdontogramView({ value }: { value: OdontogramValue }) {
  const findings = Object.entries(value).sort(([a], [b]) => a.localeCompare(b));
  return (
    <div className="grid gap-2">
      <OdontogramChart value={value} showPrimary={hasPrimary(value)} className="max-w-xl" />
      <OdontogramLegend />
      <ul className="grid gap-0.5 text-sm">
        {findings.map(([tooth, state]) => (
          <li key={tooth}>
            <span className="font-medium">{tooth}:</span> {describeTooth(state)}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Odontograma editable: se toca una pieza y se marcan sus superficies y su estado en el panel. */
export function OdontogramInput({ value, onChange }: { value: OdontogramValue; onChange: (value: OdontogramValue) => void }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [surfaceTool, setSurfaceTool] = useState<ToothSurfaceState | null>("caries");
  const [showPrimary, setShowPrimary] = useState(() => hasPrimary(value));
  const state = selected ? (value[selected] ?? {}) : {};

  const update = (tooth: string, next: ToothState) => {
    const clean: ToothState = {
      ...(next.surfaces && Object.keys(next.surfaces).length ? { surfaces: next.surfaces } : {}),
      ...(next.whole ? { whole: next.whole } : {}),
      ...(next.note ? { note: next.note } : {}),
    };
    const rest = { ...value };
    delete rest[tooth];
    onChange(Object.keys(clean).length ? { ...rest, [tooth]: clean } : rest);
  };

  const paintSurface = (surface: ToothSurface) => {
    if (!selected) return;
    const surfaces = { ...state.surfaces };
    // Tocar con la misma herramienta la quita; con "Sano" (null) siempre la limpia.
    if (!surfaceTool || surfaces[surface] === surfaceTool) delete surfaces[surface];
    else surfaces[surface] = surfaceTool;
    update(selected, { ...state, surfaces });
  };

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">Toca una pieza para marcar sus hallazgos.</p>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <input type="checkbox" checked={showPrimary} onChange={(e) => setShowPrimary(e.target.checked)} />
          Mostrar piezas temporales
        </label>
      </div>
      <div className="overflow-x-auto rounded-lg border bg-background p-2">
        <OdontogramChart value={value} showPrimary={showPrimary} selected={selected} onSelect={setSelected} className="min-w-[520px]" />
      </div>
      <OdontogramLegend />

      {selected && (
        <div className="grid gap-3 rounded-lg border bg-muted/30 p-3 sm:grid-cols-[132px_1fr]">
          <div className="grid justify-items-center gap-1">
            <p className="text-sm font-semibold">Pieza {selected}</p>
            <svg viewBox="-6 -6 132 132" className="size-32" role="group" aria-label={`Superficies de la pieza ${selected}`}>
              <ToothShape tooth={selected} state={state} size={120} onSurface={paintSurface} />
            </svg>
            <p className="text-[11px] text-muted-foreground">Toca las superficies</p>
          </div>
          <div className="grid content-start gap-3">
            <div className="grid gap-1.5">
              <p className="text-xs font-medium">Superficies</p>
              <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Herramienta de superficie">
                {SURFACE_STATES.map((tool) => (
                  <button
                    key={tool.value}
                    type="button"
                    role="radio"
                    aria-checked={surfaceTool === tool.value}
                    onClick={() => setSurfaceTool(tool.value)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs",
                      surfaceTool === tool.value ? "border-primary ring-2 ring-primary/30" : "bg-background hover:bg-muted",
                    )}
                  >
                    <span className="size-2.5 rounded-sm" style={{ background: tool.color }} aria-hidden /> {tool.label}
                  </button>
                ))}
                <button
                  type="button"
                  role="radio"
                  aria-checked={surfaceTool === null}
                  onClick={() => setSurfaceTool(null)}
                  className={cn(
                    "flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs",
                    surfaceTool === null ? "border-primary ring-2 ring-primary/30" : "bg-background hover:bg-muted",
                  )}
                >
                  <Eraser className="size-3" aria-hidden /> Sana
                </button>
              </div>
            </div>
            <div className="grid gap-1.5">
              <p className="text-xs font-medium">Pieza completa</p>
              <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Estado de la pieza">
                {WHOLE_STATES.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={state.whole === option.value}
                    onClick={() => update(selected, { ...state, whole: state.whole === option.value ? undefined : (option.value as ToothWholeState) })}
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-xs",
                      state.whole === option.value ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-muted",
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            <Input
              aria-label={`Nota de la pieza ${selected}`}
              placeholder="Nota de la pieza (opcional)"
              maxLength={200}
              value={state.note ?? ""}
              onChange={(e) => update(selected, { ...state, note: e.target.value })}
            />
            <div className="flex gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => update(selected, {})}>
                Dejar sana
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setSelected(null)}>
                Listo
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
