import { clampPage, getTotalPages } from "../lib/pagination";

export default function PaginationControls({
  page,
  pageSize,
  totalItems,
  itemLabel,
  onPageChange,
  className = "",
}: {
  page: number;
  pageSize: number;
  totalItems: number;
  itemLabel: string;
  onPageChange: (nextPage: number) => void;
  className?: string;
}) {
  const totalPages = getTotalPages(totalItems, pageSize);
  if (totalItems <= pageSize) {
    return null;
  }

  const currentPage = clampPage(page, totalItems, pageSize);
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);
  const pageNumbers = buildPageNumbers(currentPage, totalPages);

  return (
    <div className={`flex flex-col gap-3 border-t border-stone-200/70 pt-4 sm:flex-row sm:items-center sm:justify-between ${className}`.trim()}>
      <p className="text-xs text-warm-500">
        {itemLabel} {startItem}-{endItem} / 전체 {totalItems}
      </p>
      <div className="flex items-center gap-2 self-start sm:self-auto">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-600 transition hover:border-brand-300 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-45"
        >
          이전
        </button>
        <div className="flex items-center gap-1">
          {pageNumbers.map((value, index) =>
            value === "ellipsis" ? (
              <span key={`${value}-${index}`} className="px-1 text-xs text-stone-400">
                …
              </span>
            ) : (
              <button
                key={value}
                type="button"
                onClick={() => onPageChange(value)}
                className={`h-8 min-w-8 rounded-full px-2 text-xs font-semibold transition ${
                  value === currentPage
                    ? "bg-brand-600 text-white"
                    : "bg-stone-100 text-stone-600 hover:bg-brand-50 hover:text-brand-700"
                }`}
              >
                {value}
              </button>
            ),
          )}
        </div>
        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-600 transition hover:border-brand-300 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-45"
        >
          다음
        </button>
      </div>
    </div>
  );
}

function buildPageNumbers(currentPage: number, totalPages: number) {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const start = Math.max(1, currentPage - 1);
  const end = Math.min(totalPages, currentPage + 1);
  const pages: Array<number | "ellipsis"> = [1];

  if (start > 2) {
    pages.push("ellipsis");
  }

  for (let page = Math.max(2, start); page <= Math.min(totalPages - 1, end); page += 1) {
    pages.push(page);
  }

  if (end < totalPages - 1) {
    pages.push("ellipsis");
  }

  pages.push(totalPages);
  return pages;
}
