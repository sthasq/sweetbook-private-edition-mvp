import { clearCsrfToken, get, invalidateApiCache, post } from "./client";
import type { AuthUser } from "../types/api";

export function getCurrentUser() {
  return get<AuthUser>("/auth/me", { ttlMs: 15_000 });
}

export async function login(body: { email: string; password: string }) {
  const result = await post<AuthUser>("/auth/login", body);
  clearCsrfToken();
  invalidateApiCache();
  return result;
}

export async function signup(body: {
  email: string;
  password: string;
  displayName: string;
  role: "FAN" | "CREATOR";
  channelHandle?: string;
}) {
  const result = await post<AuthUser>("/auth/signup", body);
  clearCsrfToken();
  invalidateApiCache();
  return result;
}

export async function logout() {
  await post<void>("/auth/logout");
  clearCsrfToken();
  invalidateApiCache();
}
