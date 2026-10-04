import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface QuickAction {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
}

export function QuickActions({ actions }: { actions: QuickAction[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Acciones rápidas</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-2">
        {actions.map(({ label, icon: Icon, onClick }) => (
          <button
            key={label}
            type="button"
            onClick={onClick}
            className="flex flex-col items-start gap-2 rounded-lg border p-3 text-left text-sm font-medium transition-colors outline-none hover:border-primary/40 hover:bg-accent/60 focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <span className="flex size-8 items-center justify-center rounded-md bg-accent text-accent-foreground">
              <Icon className="size-4" aria-hidden />
            </span>
            {label}
          </button>
        ))}
      </CardContent>
    </Card>
  );
}

