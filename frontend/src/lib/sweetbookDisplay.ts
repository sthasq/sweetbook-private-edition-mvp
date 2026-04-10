import type { SweetbookBookSpec, SweetbookTemplate } from "../types/api";

export function formatBookSpecLabel(
  bookSpecUid: string | null | undefined,
  bookSpecs: SweetbookBookSpec[],
) {
  if (!bookSpecUid) {
    return "설정 전";
  }

  const matched = bookSpecs.find((spec) => spec.uid === bookSpecUid);
  if (matched?.name?.trim()) {
    return matched.name.trim();
  }

  return humanizeBookSpecUid(bookSpecUid);
}

export function formatTemplateLabel(
  templateUid: string | null | undefined,
  role: "cover" | "content",
  templates: SweetbookTemplate[],
) {
  if (!templateUid) {
    return "설정 전";
  }

  const matched = templates.find((template) => template.uid === templateUid);
  if (matched) {
    return humanizeTemplateLabel(matched, role);
  }

  return role === "cover" ? "기본 표지 템플릿" : "기본 내지 템플릿";
}

function humanizeBookSpecUid(value: string) {
  switch (value) {
    case "SQUAREBOOK_HC":
      return "정사각 하드커버";
    case "SQUAREBOOK_SC":
      return "정사각 소프트커버";
    default:
      return value.includes("_")
        ? value
            .split("_")
            .filter(Boolean)
            .map((part) => {
              const lower = part.toLowerCase();
              if (lower === "hc") return "하드커버";
              if (lower === "sc") return "소프트커버";
              return lower.charAt(0).toUpperCase() + lower.slice(1);
            })
            .join(" ")
        : "기본 규격";
  }
}

function humanizeTemplateLabel(
  template: SweetbookTemplate,
  role: "cover" | "content",
) {
  const name = template.name?.trim() ?? "";
  const category = normalizeCategory(template.category);

  if (name === "표지") {
    return category ? `${category} 표지 템플릿` : "기본 표지 템플릿";
  }

  if (/^내지a$/i.test(name)) {
    return category ? `${category} 기본 내지 템플릿` : "기본 내지 템플릿";
  }

  if (/^내지b$/i.test(name)) {
    return category ? `${category} 확장 내지 템플릿` : "확장 내지 템플릿";
  }

  if (/gallery/i.test(name)) {
    return category ? `${category} 갤러리 내지 템플릿` : "갤러리 내지 템플릿";
  }

  if (/cover/i.test(name) && role === "content") {
    return category ? `${category} 오프닝 내지 템플릿` : "오프닝 내지 템플릿";
  }

  if (name === "빈내지") {
    return category ? `${category} 빈 내지 템플릿` : "빈 내지 템플릿";
  }

  if (name === "발행면") {
    return category ? `${category} 발행 페이지` : "발행 페이지";
  }

  if (name === "간지") {
    return category ? `${category} 구분 페이지` : "구분 페이지";
  }

  const normalized = normalizeName(name);
  if (normalized) {
    return category && !normalized.startsWith(category)
      ? `${category} ${normalized}`
      : normalized;
  }

  return role === "cover" ? "기본 표지 템플릿" : "기본 내지 템플릿";
}

function normalizeCategory(value: string | null | undefined) {
  const normalized = normalizeName(value ?? "");
  if (!normalized) {
    return "";
  }

  return normalized
    .replace(/([가-힣A-Za-z]+)([A-Z])$/u, "$1 $2")
    .replace(/([가-힣A-Za-z]+)(\d)$/u, "$1 $2");
}

function normalizeName(value: string) {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .trim();
}
