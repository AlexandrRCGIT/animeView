const STATS = [
  { value: '15 000+', label: 'Тайтлов', icon: '📺' },
  { value: '100%',    label: 'Бесплатно', icon: '🎉' },
  { value: '24/7',    label: 'Новые серии', icon: '🔥' },
  { value: 'HD',      label: 'Качество', icon: '✨' },
];

export function StatsBar() {
  return (
    <section style={{
      padding: '40px', maxWidth: 1400, margin: '0 auto 60px',
      background: 'rgba(255,255,255,0.02)', borderRadius: 20,
      border: '1px solid rgba(255,255,255,0.05)',
      display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: 24,
    }}>
      {STATS.map(s => (
        <div key={s.label} style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>{s.icon}</div>
          <div style={{
            fontFamily: 'var(--font-unbounded), sans-serif',
            fontSize: 28, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em',
          }}>{s.value}</div>
          <div style={{
            color: 'rgba(255,255,255,0.4)', fontSize: 13, marginTop: 4,
          }}>{s.label}</div>
        </div>
      ))}
    </section>
  );
}
