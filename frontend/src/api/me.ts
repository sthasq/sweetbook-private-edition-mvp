import { get } from "./client";
import type { MyProjectSummary } from "../types/api";

export function getMyProjects() {
  return get<MyProjectSummary[]>("/me/projects", { ttlMs: 20_000 });
}
