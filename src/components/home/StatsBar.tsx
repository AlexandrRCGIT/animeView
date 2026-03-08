const STATS = [
  { value: '1 000+',  label: 'Тайтлов', icon: '📺' },
  { value: '100%',    label: 'Бесплатно', icon: '🎉' },
  { value: '24/7',    label: 'Новые серии', icon: '🔥' },
  { value: 'HD',      label: 'Качество', icon: '✨' },
];

export function StatsBar() {
  return (
    <section style={{
      width: 'min(1400px, calc(100% - clamp(28px, 8vw, 80px)))',
      padding: 'clamp(16px, 4vw, 40px)',
      margin: '0 auto 60px',
      background: 'rgba(255,255,255,0.02)', borderRadius: 20,
      border: '1px solid rgba(255,255,255,0.05)',
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
      gap: 24,
    }}>
      {STATS.map(s => (
        <div key={s.label} style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>{s.icon}</div>
          <div style={{
            fontFamily: 'var(--font-unbounded), sans-serif',
            fontSize: 'clamp(22px, 5vw, 28px)', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em',
          }}>{s.value}</div>
          <div style={{
            color: 'rgba(255,255,255,0.4)', fontSize: 13, marginTop: 4,
          }}>{s.label}</div>
        </div>
      ))}
    </section>
  );
}
