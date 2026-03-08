import { BackButton } from '@/components/ui/BackButton';

export const metadata = { title: 'Пользовательское соглашение — AnimeView' };

export default function TermsPage() {
  return (
    <div style={{ background: '#08080E', minHeight: '100vh', color: '#fff', padding: '92px clamp(14px, 4vw, 40px) 72px' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <div style={{ marginBottom: 32 }}><BackButton /></div>
        <h1 style={{
          fontFamily: 'var(--font-unbounded), sans-serif',
          fontSize: 'clamp(24px, 5vw, 34px)', fontWeight: 800, marginBottom: 12, letterSpacing: '-0.03em',
        }}>Пользовательское соглашение</h1>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, marginBottom: 40 }}>
          Последнее обновление: —
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 28,
          color: 'rgba(255,255,255,0.6)', fontSize: 15, lineHeight: 1.7 }}>
          <Section title="1. Принятие условий">
            Текст раздела будет добавлен.
          </Section>
          <Section title="2. Описание сервиса">
            Текст раздела будет добавлен.
          </Section>
          <Section title="3. Права и обязанности пользователя">
            Текст раздела будет добавлен.
          </Section>
          <Section title="4. Ограничение ответственности">
            Текст раздела будет добавлен.
          </Section>
          <Section title="5. Интеллектуальная собственность">
            Текст раздела будет добавлен.
          </Section>
          <Section title="6. Изменение условий">
            Текст раздела будет добавлен.
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 style={{
        fontFamily: 'var(--font-unbounded), sans-serif',
        fontSize: 16, fontWeight: 700, color: '#fff',
        marginBottom: 10, letterSpacing: '-0.01em',
      }}>{title}</h2>
      <p style={{ margin: 0 }}>{children}</p>
    </div>
  );
}
