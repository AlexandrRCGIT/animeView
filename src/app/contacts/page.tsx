import { BackButton } from '@/components/ui/BackButton';

export const metadata = { title: 'Контакты — AnimeView' };

export default function ContactsPage() {
  return (
    <div style={{ background: '#08080E', minHeight: '100vh', color: '#fff', padding: '92px clamp(14px, 4vw, 40px) 72px' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <div style={{ marginBottom: 32 }}><BackButton /></div>
        <h1 style={{
          fontFamily: 'var(--font-unbounded), sans-serif',
          fontSize: 'clamp(24px, 5vw, 34px)', fontWeight: 800, marginBottom: 12, letterSpacing: '-0.03em',
        }}>Контакты</h1>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 15, marginBottom: 40 }}>
          Свяжитесь с нами по любым вопросам
        </p>

        <div style={{
          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 16, padding: 'clamp(14px, 3vw, 28px) clamp(12px, 3.5vw, 32px)', display: 'flex', flexDirection: 'column', gap: 20,
        }}>
          <div>
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, fontWeight: 600,
              textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Email</p>
            <p style={{ color: '#fff', fontSize: 15 }}>— (будет добавлено)</p>
          </div>
          <div>
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, fontWeight: 600,
              textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Telegram</p>
            <p style={{ color: '#fff', fontSize: 15 }}>— (будет добавлено)</p>
          </div>
          <div>
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, fontWeight: 600,
              textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>По вопросам рекламы</p>
            <p style={{ color: '#fff', fontSize: 15 }}>— (будет добавлено)</p>
          </div>
        </div>
      </div>
    </div>
  );
}
