'use client';

export function WatchButton() {
  return (
    <button
      onClick={() =>
        document.getElementById('player-section')?.scrollIntoView({ behavior: 'smooth' })
      }
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        padding: '10px 24px', borderRadius: 10, border: 'none',
        background: 'var(--accent)', color: '#fff',
        fontSize: 14, fontWeight: 700, cursor: 'pointer',
        transition: 'opacity 0.15s', alignSelf: 'flex-start',
      }}
    >
      ▶ Смотреть
    </button>
  );
}
