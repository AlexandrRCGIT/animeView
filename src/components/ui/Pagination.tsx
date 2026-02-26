import Link from 'next/link';

interface PaginationProps {
  currentPage: number;
  hasNextPage: boolean;
  baseUrl: string;        // например "/" или "/search"
  extraParams?: Record<string, string>; // дополнительные query-параметры (например q=naruto)
}

export function Pagination({
  currentPage,
  hasNextPage,
  baseUrl,
  extraParams = {},
}: PaginationProps) {
  if (currentPage === 1 && !hasNextPage) return null;

  function buildUrl(page: number): string {
    const params = new URLSearchParams({ ...extraParams, page: String(page) });
    return `${baseUrl}?${params}`;
  }

  const hasPrev = currentPage > 1;

  return (
    <nav
      aria-label="Пагинация"
      className="flex items-center justify-center gap-2 pt-4"
    >
      {/* Предыдущая */}
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

      {/* Текущая страница */}
      <span className="px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-bold min-w-[3rem] text-center">
        {currentPage}
      </span>

      {/* Следующая */}
      {hasNextPage ? (
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
