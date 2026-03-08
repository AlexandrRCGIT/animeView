'use client';

export function WatchButton() {
  return (
    <button
      onClick={() => {
        const el = document.getElementById('player-section');
        if (!el) return;
        const top = el.getBoundingClientRect().top + window.scrollY - 80;
        window.scrollTo({ top, behavior: 'smooth' });
      }}
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
