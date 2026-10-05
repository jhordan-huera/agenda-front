import type { ReactNode } from "react";

export function AuthCardHeader({ title, description }: { title: string; description: ReactNode }) {
  return (
    <div className="mb-8 space-y-2">
      <h1 className="text-3xl font-extrabold tracking-[-0.02em]">{title}</h1>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
}
