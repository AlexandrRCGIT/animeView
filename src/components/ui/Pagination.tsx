import Link from 'next/link';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  baseUrl: string;
  /** Полная строка query-параметров (без page). Сохраняет все фильтры при переходе. */
  searchString?: string;
}

export function Pagination({ currentPage, totalPages, baseUrl, searchString = '' }: PaginationProps) {
  if (totalPages <= 1) return null;

  function buildUrl(page: number): string {
    const params = new URLSearchParams(searchString);
    params.set('page', String(page));
    return `${baseUrl}?${params}`;
  }

  const WINDOW = 5;
  const half   = Math.floor(WINDOW / 2);
  let start    = Math.max(1, currentPage - half);
  let end      = Math.min(totalPages, start + WINDOW - 1);
  if (end - start < WINDOW - 1) start = Math.max(1, end - WINDOW + 1);
  const pages = Array.from({ length: end - start + 1 }, (_, i) => start + i);

  const btnBase: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    minWidth: 40, height: 40, borderRadius: 10,
    fontSize: 14, fontWeight: 500, textDecoration: 'none', transition: 'all 0.2s',
  };

  return (
    <nav aria-label="Пагинация" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
      {/* ← Назад */}
      {currentPage > 1 ? (
        <Link href={buildUrl(currentPage - 1)} style={{
          ...btnBase, padding: '0 16px',
          background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
          color: 'rgba(255,255,255,0.6)',
        }}>← Назад</Link>
      ) : (
        <span style={{
          ...btnBase, padding: '0 16px',
          background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)',
          color: 'rgba(255,255,255,0.2)', cursor: 'not-allowed',
        }}>← Назад</span>
      )}

      {/* Номера */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {pages.map(p =>
          p === currentPage ? (
            <span key={p} aria-current="page" style={{
              ...btnBase,
              background: '#6C3CE1', border: '1px solid #6C3CE1',
              color: '#fff', fontWeight: 700,
            }}>{p}</span>
          ) : (
            <Link key={p} href={buildUrl(p)} style={{
              ...btnBase,
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
              color: 'rgba(255,255,255,0.5)',
            }}>{p}</Link>
          )
        )}
      </div>

      {/* Вперёд → */}
      {currentPage < totalPages ? (
        <Link href={buildUrl(currentPage + 1)} style={{
          ...btnBase, padding: '0 16px',
          background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
          color: 'rgba(255,255,255,0.6)',
        }}>Вперёд →</Link>
      ) : (
        <span style={{
          ...btnBase, padding: '0 16px',
          background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)',
          color: 'rgba(255,255,255,0.2)', cursor: 'not-allowed',
        }}>Вперёд →</span>
      )}
    </nav>
  );
}
