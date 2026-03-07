function SkeletonCard({ index }: { index: number }) {
  return (
    <div
      key={index}
      style={{
        borderRadius: 16,
        overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(255,255,255,0.03)',
      }}
    >
      <div
        style={{
          aspectRatio: '2/3',
          background:
            'linear-gradient(90deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.12) 50%, rgba(255,255,255,0.05) 100%)',
          backgroundSize: '220% 100%',
          animation: 'catalog-shimmer 1.2s linear infinite',
        }}
      />
      <div style={{ padding: '12px 14px 14px' }}>
        <div
          style={{
            height: 14,
            width: '85%',
            borderRadius: 6,
            background: 'rgba(255,255,255,0.1)',
            marginBottom: 8,
          }}
        />
        <div
          style={{
            height: 11,
            width: '50%',
            borderRadius: 6,
            background: 'rgba(255,255,255,0.08)',
          }}
        />
      </div>
    </div>
  );
}

export default function LoadingSearchPage() {
  return (
    <div style={{ background: '#08080E', minHeight: '100vh', color: '#fff' }}>
      <style>{`
        @keyframes catalog-shimmer {
          from { background-position: 200% 0; }
          to { background-position: -200% 0; }
        }
      `}</style>

      <main style={{ maxWidth: 1400, margin: '0 auto', padding: '100px 40px 80px' }}>
        <div style={{ marginBottom: 40 }}>
          <div
            style={{
              width: 260,
              height: 34,
              borderRadius: 10,
              background: 'rgba(255,255,255,0.08)',
              marginBottom: 12,
            }}
          />
          <div
            style={{
              width: 140,
              height: 14,
              borderRadius: 8,
              background: 'rgba(255,255,255,0.06)',
            }}
          />
        </div>

        <div
          style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 20,
            padding: '28px 32px',
            marginBottom: 36,
            height: 190,
          }}
        />

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(185px, 1fr))',
            gap: 20,
          }}
        >
          {Array.from({ length: 24 }, (_, i) => (
            <SkeletonCard key={i} index={i} />
          ))}
        </div>
      </main>
    </div>
  );
}
