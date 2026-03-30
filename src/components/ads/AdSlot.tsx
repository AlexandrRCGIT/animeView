'use client';

import Link from 'next/link';

interface AdSlotProps {
  /** Размер для отображения, например "728×90" или "300×250" */
  size?: string;
  /** Минимальная высота блока в px */
  minHeight?: number;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Визуальный плейсхолдер рекламного места.
 * Отображается когда реальная реклама ещё не подключена.
 */
export function AdSlot({ size, minHeight = 90, className, style }: AdSlotProps) {
  return (
    <div
      className={className}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight,
        borderRadius: 12,
        border: '1.5px dashed rgba(255,255,255,0.1)',
        background: 'rgba(255,255,255,0.02)',
        padding: '12px 20px',
        gap: 12,
        ...style,
      }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 9h18M9 21V9" />
      </svg>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          Рекламное место{size ? ` · ${size}` : ''}
        </span>
        <Link
          href="/contacts"
          style={{
            fontSize: 11,
            color: 'rgba(108,60,225,0.6)',
            textDecoration: 'none',
            border: '1px solid rgba(108,60,225,0.25)',
            borderRadius: 6,
            padding: '2px 8px',
            whiteSpace: 'nowrap',
            transition: 'color 0.15s, border-color 0.15s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.color = 'rgba(108,60,225,1)';
            e.currentTarget.style.borderColor = 'rgba(108,60,225,0.5)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.color = 'rgba(108,60,225,0.6)';
            e.currentTarget.style.borderColor = 'rgba(108,60,225,0.25)';
          }}
        >
          Разместить рекламу
        </Link>
      </div>
    </div>
  );
}
