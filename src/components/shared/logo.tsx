import { Link } from "react-router";
import { CalendarCheck2 } from "lucide-react";
import { APP_NAME } from "@/lib/constants/app";
import { cn } from "@/lib/utils";

interface LogoProps {
  href?: string;
  className?: string;
}

export function Logo({ href = "/", className }: LogoProps) {
  return (
    <Link
      to={href}
      className={cn("inline-flex items-center gap-2 rounded-md font-semibold tracking-tight", className)}
    >
      <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
        <CalendarCheck2 className="size-4.5" aria-hidden />
      </span>
      <span className="text-lg">{APP_NAME}</span>
    </Link>
  );
}
