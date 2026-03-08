import { NavBar } from '@/components/home/NavBar';

function Block({ width = '100%', height = 16, radius = 10 }: { width?: number | string; height?: number; radius?: number }) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius: radius,
        background: 'linear-gradient(90deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.11) 50%, rgba(255,255,255,0.06) 100%)',
        animation: 'pulse 1.5s ease-in-out infinite',
      }}
    />
  );
}

export default function LoadingAnimePage() {
  return (
    <div style={{ background: '#08080E', minHeight: '100vh', color: '#fff' }}>
      <NavBar />

      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '92px clamp(14px, 4vw, 40px) 72px' }}>
        <div style={{ marginBottom: 24 }}>
          <Block width={88} height={16} radius={8} />
        </div>

        <div style={{ display: 'flex', gap: 'clamp(18px, 4vw, 48px)', alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div style={{ width: 'clamp(150px, 34vw, 220px)' }}>
            <Block width="100%" height={330} radius={16} />
          </div>

          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Block width="56%" height={34} radius={10} />
            <Block width="38%" height={16} radius={8} />
            <Block width="74%" height={18} radius={9} />
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Block width={84} height={24} radius={12} />
              <Block width={84} height={24} radius={12} />
              <Block width={84} height={24} radius={12} />
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <Block width={130} height={42} radius={12} />
              <Block width={140} height={42} radius={12} />
            </div>
            <Block width="100%" height={120} radius={12} />
          </div>
        </div>

        <div style={{ marginTop: 40, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Block width="100%" height={26} radius={10} />
          <Block width="100%" height={460} radius={16} />
        </div>
      </main>
    </div>
  );
}
