import type { AuthContext } from "@/lib/auth";

export type PermissionAction =
  | "listing:create"
  | "listing:update"
  | "listing:delete"
  | "thread:read"
  | "thread:write";

export function can(auth: AuthContext, action: PermissionAction) {
  void auth;
  void action;
  return false;
}
