import { ImageResponse } from 'next/og';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#08080E',
        }}
      >
        {/* Фоновый градиент */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(ellipse 80% 60% at 70% 30%, #6C3CE133, transparent 70%), radial-gradient(ellipse 60% 80% at 20% 80%, #E13C6E22, transparent 60%)',
          }}
        />

        {/* Логотип */}
        <div
          style={{
            width: 120,
            height: 120,
            borderRadius: 28,
            background: 'linear-gradient(135deg, #E13C6E, #6C3CE1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 72,
            fontWeight: 900,
            color: 'white',
            marginBottom: 40,
            boxShadow: '0 0 80px #6C3CE166',
          }}
        >
          A
        </div>

        {/* Название */}
        <div
          style={{
            fontSize: 72,
            fontWeight: 800,
            color: 'white',
            letterSpacing: '-2px',
          }}
        >
          AnimeView
        </div>

        {/* Подпись */}
        <div
          style={{
            fontSize: 32,
            color: 'rgba(255,255,255,0.45)',
            marginTop: 20,
          }}
        >
          Смотри аниме онлайн — бесплатно
        </div>
      </div>
    ),
    { ...size },
  );
}
