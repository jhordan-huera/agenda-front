import { TrendingUp } from "lucide-react";
import { useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CHART_COLORS } from "@/features/reports/chart-colors";
import { computeBmi, formatClinicalNumber } from "@/lib/clinical-templates";
import { formatNumericDate } from "@/lib/format";
import { questionnaireScore } from "@/lib/validations/clinical";
import type { ClinicalRecord } from "@/types";

interface Point {
  date: string;
  label: string;
  value: number;
}

interface Series {
  key: string;
  label: string;
  unit: string;
  /** Orden en el selector: puntajes y escalas antes que números sueltos (p. ej. "Sesión n.º"). */
  priority: number;
  points: Point[];
}

const PRIORITY = { questionnaire: 0, bmi: 1, scale: 2, number: 3 } as const;

/**
 * Series numéricas de las evoluciones del paciente: números, escalas, IMC y puntajes de
 * cuestionarios, por formato y campo. Sólo las que tienen al menos dos mediciones.
 */
function buildClinicalSeries(record: ClinicalRecord): Series[] {
  const byKey = new Map<string, Series & { templateName: string }>();
  for (const note of record.notes.toReversed()) {
    const version = record.templateVersions[note.templateVersionId];
    if (!version) continue;
    for (const field of version.fields) {
      let value: number | null = null;
      let unit = "";
      const raw = note.data[field.id];
      if (field.type === "number" && typeof raw === "number") [value, unit] = [raw, field.unit ?? ""];
      else if (field.type === "scale" && typeof raw === "number") [value, unit] = [raw, `/${field.max}`];
      else if (field.type === "bmi") value = computeBmi(field, note.data);
      else if (field.type === "questionnaire" && Array.isArray(raw)) {
        const score = questionnaireScore(field, raw as number[]);
        [value, unit] = [score.total, `/${score.max}`];
      }
      if (value === null) continue;
      const key = `${version.templateId}:${field.id}`;
      const priority = PRIORITY[field.type as keyof typeof PRIORITY];
      const series = byKey.get(key) ?? { key, label: field.label, unit, priority, templateName: version.name, points: [] };
      series.label = field.label;
      series.unit = unit;
      series.points.push({ date: note.date, label: formatNumericDate(note.date).slice(0, 5), value });
      byKey.set(key, series);
    }
  }
  const all = [...byKey.values()].filter((series) => series.points.length >= 2).sort((a, b) => a.priority - b.priority);
  // Si dos formatos miden lo mismo ("Peso"), se distinguen por el formato.
  return all.map(({ templateName, ...series }) => ({
    ...series,
    label: all.filter((other) => other.label === series.label).length > 1 ? `${series.label} (${templateName})` : series.label,
  }));
}

function PointTooltip({ active, payload, unit }: TooltipContentProps & { unit: string }) {
  const point = payload?.[0]?.payload as Point | undefined;
  if (!active || !point) return null;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="text-muted-foreground">{formatNumericDate(point.date)}</p>
      <p className="text-sm font-semibold tabular-nums">
        {formatClinicalNumber(point.value)} {unit}
      </p>
    </div>
  );
}

/** Gráfico de la evolución de una medida (peso, dolor, puntaje PHQ-9…) a lo largo de las consultas. */
export function ClinicalEvolutionChart({ record }: { record: ClinicalRecord }) {
  const series = buildClinicalSeries(record);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  if (series.length === 0) return null;
  const current = series.find((s) => s.key === selectedKey) ?? series[0];

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
        <div className="grid gap-1">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="size-4 text-primary" aria-hidden /> Evolución
          </CardTitle>
          <CardDescription>
            {current.points.length} mediciones · {formatNumericDate(current.points[0].date)} a{" "}
            {formatNumericDate(current.points.at(-1)!.date)}
          </CardDescription>
        </div>
        <Select value={current.key} onValueChange={setSelectedKey}>
          <SelectTrigger aria-label="Medida" className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent position="popper">
            {series.map((option) => (
              <SelectItem key={option.key} value={option.key}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        <div className="h-48" role="img" aria-label={`${current.label}: ${current.points.map((p) => `${formatNumericDate(p.date)} ${p.value}`).join(", ")}`}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={current.points} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
              <CartesianGrid vertical={false} stroke={CHART_COLORS.grid} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: CHART_COLORS.tick }} tickLine={false} axisLine={{ stroke: CHART_COLORS.axis }} />
              <YAxis tick={{ fontSize: 11, fill: CHART_COLORS.tick }} tickLine={false} axisLine={false} width={44} domain={["auto", "auto"]} />
              <Tooltip content={(props) => <PointTooltip {...props} unit={current.unit} />} />
              <Line type="monotone" dataKey="value" stroke={CHART_COLORS.series} strokeWidth={2} dot={{ r: 3.5, fill: CHART_COLORS.series }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
