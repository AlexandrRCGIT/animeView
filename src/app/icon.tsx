import { ImageResponse } from 'next/og';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: 'linear-gradient(135deg, #6C3CE1 0%, #3C7EE1 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span
          style={{
            color: '#fff',
            fontSize: 20,
            fontWeight: 900,
            fontFamily: 'sans-serif',
            letterSpacing: '-1px',
          }}
        >
          A
        </span>
      </div>
    ),
    { ...size },
  );
}
