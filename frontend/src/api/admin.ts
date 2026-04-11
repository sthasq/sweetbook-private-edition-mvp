import { get, post } from "./client";
import type {
  AdminDashboard,
  AdminCreatorSettlement,
  AdminOrderSummary,
  AdminWebhookEvent,
  AdminUserSummary,
} from "../types/api";

export function getAdminDashboard() {
  return get<AdminDashboard>("/admin/dashboard");
}

export function getAdminSettlements() {
  return get<AdminCreatorSettlement[]>("/admin/settlements");
}

export function getAdminOrders() {
  return get<AdminOrderSummary[]>("/admin/orders");
}

export function getAdminWebhooks() {
  return get<AdminWebhookEvent[]>("/admin/webhooks");
}

export function getAdminUsers() {
  return get<AdminUserSummary[]>("/admin/users");
}

export function verifyCreator(creatorId: number) {
  return post<void>(`/admin/creators/${creatorId}/verify`);
}
