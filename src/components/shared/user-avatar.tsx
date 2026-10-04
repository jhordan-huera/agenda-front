import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/lib/format";

interface UserAvatarProps {
  name: string;
  src?: string | null;
  size?: "sm" | "default" | "lg";
  className?: string;
}

export function UserAvatar({ name, src, size = "default", className }: UserAvatarProps) {
  return (
    <Avatar size={size} className={className}>
      {src && <AvatarImage src={src} alt={name} />}
      <AvatarFallback className="bg-accent font-medium text-accent-foreground">
        {getInitials(name)}
      </AvatarFallback>
    </Avatar>
  );
}
