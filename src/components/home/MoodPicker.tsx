'use client';

import Link from 'next/link';

const MOODS = [
  { emoji: '⚔️', label: 'Эпичные бои',       color: '#E13C3C', href: '/search?genre=1' },
  { emoji: '💕', label: 'Для души',           color: '#E13CA8', href: '/search?genre=22' },
  { emoji: '😂', label: 'Поржать',            color: '#E1C13C', href: '/search?genre=4' },
  { emoji: '🧠', label: 'Подумать',           color: '#3C7EE1', href: '/search?genre=40' },
  { emoji: '😱', label: 'Пощекотать нервы',  color: '#6C3CE1', href: '/search?genre=14' },
  { emoji: '🌸', label: 'Расслабиться',       color: '#3CE1A8', href: '/search?genre=36' },
];

export function MoodPicker() {
  return (
    <section style={{ padding: '0 clamp(14px, 4vw, 40px)', maxWidth: 1400, margin: '0 auto 60px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <h2 style={{
          fontFamily: 'var(--font-unbounded), sans-serif', fontSize: 'clamp(18px, 2.8vw, 22px)', fontWeight: 700,
          color: '#fff', margin: 0, letterSpacing: '-0.02em',
        }}>Что хочется?</h2>
        <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
      </div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {MOODS.map(m => (
          <Link
            key={m.label}
            href={m.href}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 10,
              background: `${m.color}11`, border: `1px solid ${m.color}33`,
              borderRadius: 14, padding: '10px clamp(12px, 3vw, 20px)',
              textDecoration: 'none',
              transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
            }}
            onMouseEnter={e => {
              const el = e.currentTarget;
              el.style.background = `${m.color}22`;
              el.style.borderColor = `${m.color}66`;
              el.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={e => {
              const el = e.currentTarget;
              el.style.background = `${m.color}11`;
              el.style.borderColor = `${m.color}33`;
              el.style.transform = 'translateY(0)';
            }}
          >
            <span style={{ fontSize: 22 }}>{m.emoji}</span>
            <span style={{
              color: m.color, fontSize: 14, fontWeight: 600,
            }}>{m.label}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
