const BASE = "/api";

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  if (!res.ok) {
    const contentType = res.headers.get("content-type") ?? "";
    let body: unknown = null;

    if (contentType.includes("json")) {
      body = await res.json().catch(() => null);
    } else {
      body = await res.text();
    }

    const message =
      body &&
      typeof body === "object" &&
      "detail" in body &&
      typeof body.detail === "string"
        ? body.detail
        : typeof body === "string" && body
          ? body
          : `${res.status} ${res.statusText}`;

    throw new ApiError(res.status, message, body);
  }
  if (res.status === 204) return undefined as T;
  if (!res.headers.get("content-type")?.includes("json")) {
    return undefined as T;
  }
  return res.json();
}

export function get<T>(path: string) {
  return request<T>(path);
}

export function post<T>(path: string, body?: unknown) {
  return request<T>(path, {
    method: "POST",
    body: body != null ? JSON.stringify(body) : undefined,
  });
}

export function patch<T>(path: string, body?: unknown) {
  return request<T>(path, {
    method: "PATCH",
    body: body != null ? JSON.stringify(body) : undefined,
  });
}
