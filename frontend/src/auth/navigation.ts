import type { AuthUser } from "../types/api";

export function resolvePostAuthPath(
  user: AuthUser,
  next: string | null,
) {
  if (next && next.startsWith("/")) {
    return next;
  }

  return user.role === "CREATOR" ? "/studio" : "/me/projects";
}
