import Link from 'next/link';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  baseUrl: string;
  extraParams?: Record<string, string>;
}

export function Pagination({
  currentPage,
  totalPages,
  baseUrl,
  extraParams = {},
}: PaginationProps) {
  if (totalPages <= 1) return null;

  function buildUrl(page: number): string {
    const params = new URLSearchParams({ ...extraParams, page: String(page) });
    return `${baseUrl}?${params}`;
  }

  // Окно из 5 страниц, центрированное на текущей
  const WINDOW = 5;
  const half = Math.floor(WINDOW / 2);
  let start = Math.max(1, currentPage - half);
  let end = Math.min(totalPages, start + WINDOW - 1);
  if (end - start < WINDOW - 1) {
    start = Math.max(1, end - WINDOW + 1);
  }
  const pages = Array.from({ length: end - start + 1 }, (_, i) => start + i);

  const hasPrev = currentPage > 1;
  const hasNext = currentPage < totalPages;

  return (
    <nav aria-label="Пагинация" className="flex items-center justify-center gap-2 pt-4">
      {/* ← Назад */}
      {hasPrev ? (
        <Link
          href={buildUrl(currentPage - 1)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-sm font-medium transition-colors"
        >
          ← Назад
        </Link>
      ) : (
        <span className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-zinc-900 text-zinc-600 text-sm font-medium cursor-not-allowed">
          ← Назад
        </span>
      )}

      {/* Номера страниц */}
      <div className="flex items-center gap-2">
        {pages.map((p) =>
          p === currentPage ? (
            <span
              key={p}
              aria-current="page"
              className="flex items-center justify-center px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-bold min-w-12"
            >
              {p}
            </span>
          ) : (
            <Link
              key={p}
              href={buildUrl(p)}
              className="flex items-center justify-center px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white text-sm font-medium transition-colors min-w-12"
            >
              {p}
            </Link>
          )
        )}
      </div>

      {/* Вперёд → */}
      {hasNext ? (
        <Link
          href={buildUrl(currentPage + 1)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-sm font-medium transition-colors"
        >
          Вперёд →
        </Link>
      ) : (
        <span className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-zinc-900 text-zinc-600 text-sm font-medium cursor-not-allowed">
          Вперёд →
        </span>
      )}
    </nav>
  );
}
