const ABSOLUTE_URL_PATTERN = /^[a-zA-Z][a-zA-Z\d+.-]*:/;

function normalizeBasePath(rawBasePath: string) {
  if (!rawBasePath || rawBasePath === "/") {
    return "/";
  }

  const withLeadingSlash = rawBasePath.startsWith("/")
    ? rawBasePath
    : `/${rawBasePath}`;
  const trimmed = withLeadingSlash.replace(/\/+$/, "");
  return trimmed.length === 0 ? "/" : trimmed;
}

const appBasePath = normalizeBasePath(import.meta.env.BASE_URL ?? "/");

export function getRouterBasename() {
  return appBasePath === "/" ? undefined : appBasePath;
}

export function resolveAppUrl(path: string) {
  if (!path) {
    return path;
  }

  if (
    ABSOLUTE_URL_PATTERN.test(path) ||
    path.startsWith("//") ||
    path.startsWith("data:")
  ) {
    return path;
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return appBasePath === "/"
    ? normalizedPath
    : `${appBasePath}${normalizedPath}`;
}

export function resolveMediaUrl(
  path: string | null | undefined,
  fallback = "/demo-assets/playpick-hero.svg",
) {
  const nextPath = path && path.trim().length > 0 ? path.trim() : fallback;
  return resolveAppUrl(nextPath);
}

export function toAbsoluteAppUrl(path: string) {
  return new URL(resolveAppUrl(path), window.location.origin).toString();
}
