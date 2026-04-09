import { get, post } from "./client";
import type { AuthUser } from "../types/api";

export function getCurrentUser() {
  return get<AuthUser>("/auth/me");
}

export function login(body: { email: string; password: string }) {
  return post<AuthUser>("/auth/login", body);
}

export function signup(body: {
  email: string;
  password: string;
  displayName: string;
  role: "FAN" | "CREATOR";
  channelHandle?: string;
}) {
  return post<AuthUser>("/auth/signup", body);
}

export function logout() {
  return post<void>("/auth/logout");
}
