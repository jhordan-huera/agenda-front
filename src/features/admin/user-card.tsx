import { UserAvatar } from "@/components/shared/user-avatar";
import { formatNumericDate, getFullName, toZonedDate } from "@/lib/format";
import type { AdminUserSummary } from "@/types";
import { UserStatusBadge } from "./business-badges";
import { UserActions, UserBusinesses } from "./user-parts";

interface UserCardProps {
  row: AdminUserSummary;
  onPassword: () => void;
  onToggle: () => void;
}

/** Una cuenta en la lista del super admin (spec 007), con su negocio y rol y sus acciones. */
export function UserCard({ row, onPassword, onToggle }: UserCardProps) {
  const { user } = row;
  const name = getFullName(user);
  return (
    <article className="flex h-full flex-col rounded-xl bg-card ring-1 ring-foreground/10 transition-shadow hover:shadow-md">
      <div className="flex items-start gap-3 p-4 pb-3">
        <UserAvatar name={name} src={user.avatarUrl} className="size-11" />
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold" title={name}>
            {name}
          </h3>
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
        </div>
        <UserActions row={row} onPassword={onPassword} onToggle={onToggle} />
      </div>
      <div className="space-y-0.5 px-4 pb-4 text-sm">
        <UserBusinesses row={row} />
      </div>
      <div className="mt-auto flex items-center justify-between gap-3 border-t px-4 py-3 text-xs text-muted-foreground">
        <span>Alta {formatNumericDate(toZonedDate(user.createdAt))}</span>
        <UserStatusBadge active={user.isActive} />
      </div>
    </article>
  );
}
