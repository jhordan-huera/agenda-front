import { Loader2 } from "lucide-react";
import type { ComponentProps } from "react";
import { Button } from "@/components/ui/button";

interface SubmitButtonProps extends ComponentProps<typeof Button> {
  loading?: boolean;
  loadingText?: string;
}

export function SubmitButton({ loading, loadingText, children, disabled, ...props }: SubmitButtonProps) {
  return (
    <Button type="submit" disabled={loading || disabled} aria-busy={loading} {...props}>
      {loading && <Loader2 className="animate-spin" aria-hidden />}
      {loading && loadingText ? loadingText : children}
    </Button>
  );
}
