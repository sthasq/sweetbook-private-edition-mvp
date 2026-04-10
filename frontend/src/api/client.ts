const BASE = "/api";
const responseCache = new Map<string, { expiresAt: number; data: unknown }>();
const inflightRequests = new Map<string, Promise<unknown>>();

type CacheOptions = {
  ttlMs?: number;
};

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

function getCacheKey(path: string) {
  return `GET:${path}`;
}

function readCached<T>(path: string) {
  const entry = responseCache.get(getCacheKey(path));
  if (!entry) {
    return null;
  }

  if (entry.expiresAt <= Date.now()) {
    responseCache.delete(getCacheKey(path));
    return null;
  }

  return entry.data as T;
}

function writeCached<T>(path: string, data: T, ttlMs: number) {
  responseCache.set(getCacheKey(path), {
    expiresAt: Date.now() + ttlMs,
    data,
  });
}

export function invalidateApiCache(matcher?: string | RegExp | ((path: string) => boolean)) {
  if (!matcher) {
    responseCache.clear();
    inflightRequests.clear();
    return;
  }

  const keys = new Set([
    ...responseCache.keys(),
    ...inflightRequests.keys(),
  ]);

  for (const key of keys) {
    const path = key.replace(/^GET:/, "");
    const matched =
      typeof matcher === "string"
        ? path.startsWith(matcher)
        : matcher instanceof RegExp
          ? matcher.test(path)
          : matcher(path);

    if (matched) {
      responseCache.delete(key);
      inflightRequests.delete(key);
    }
  }
}

export function get<T>(path: string, options?: CacheOptions) {
  const ttlMs = options?.ttlMs ?? 0;
  if (ttlMs <= 0) {
    return request<T>(path);
  }

  const cached = readCached<T>(path);
  if (cached != null) {
    return Promise.resolve(cached);
  }

  const cacheKey = getCacheKey(path);
  const existingRequest = inflightRequests.get(cacheKey);
  if (existingRequest) {
    return existingRequest as Promise<T>;
  }

  const pendingRequest = request<T>(path)
    .then((data) => {
      writeCached(path, data, ttlMs);
      return data;
    })
    .finally(() => {
      inflightRequests.delete(cacheKey);
    });

  inflightRequests.set(cacheKey, pendingRequest);
  return pendingRequest;
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
