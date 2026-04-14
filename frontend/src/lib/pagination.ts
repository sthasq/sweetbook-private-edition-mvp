export function getTotalPages(totalItems: number, pageSize: number) {
  if (pageSize <= 0) {
    return 1;
  }
  return Math.max(1, Math.ceil(totalItems / pageSize));
}

export function clampPage(page: number, totalItems: number, pageSize: number) {
  const totalPages = getTotalPages(totalItems, pageSize);
  return Math.min(Math.max(page, 1), totalPages);
}

export function paginateItems<T>(items: T[], page: number, pageSize: number) {
  const currentPage = clampPage(page, items.length, pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;

  return {
    currentPage,
    items: items.slice(startIndex, endIndex),
    pageSize,
    totalItems: items.length,
    totalPages: getTotalPages(items.length, pageSize),
    visibleStart: items.length === 0 ? 0 : startIndex + 1,
    visibleEnd: Math.min(endIndex, items.length),
  };
}
