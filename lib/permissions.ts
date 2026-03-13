import type { AuthContext } from "@/lib/auth";

export type PermissionAction =
  | "listing:create"
  | "listing:update"
  | "listing:delete"
  | "thread:read"
  | "thread:write";

export function can(auth: AuthContext, action: PermissionAction): boolean {
  const { role } = auth;
  if (role === "admin" || role === "moderator") return true;
  if (role === "member") {
    return (
      action === "listing:create" ||
      action === "listing:update" ||
      action === "listing:delete" ||
      action === "thread:read" ||
      action === "thread:write"
    );
  }
  return false;
}
