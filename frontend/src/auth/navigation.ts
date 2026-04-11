import type { AuthUser } from "../types/api";

export function resolvePostAuthPath(
  user: AuthUser,
  next: string | null,
) {
  if (next && next.startsWith("/")) {
    return next;
  }

  if (user.role === "ADMIN") return "/admin/dashboard";
  return user.role === "CREATOR" ? "/studio/orders" : "/me/projects";
}
