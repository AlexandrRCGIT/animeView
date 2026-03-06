'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { proxifyImageUrl } from '@/lib/image-proxy';

export interface HeroAnime {
  id: number;
  title: string;
  titleJp: string;
  episodes: number;
  rating: number;
  genres: string[];
  year: number;
  studio: string;
  image: string;
  banner?: string | null;
  color: string;
}

interface Props {
  animes: HeroAnime[];
}

export function Hero({ animes }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const currentImage = proxifyImageUrl(animes[activeIndex]?.image ?? '');
  const currentImageUnoptimized = currentImage.startsWith('/api/image?');

  useEffect(() => {
    if (animes.length <= 1) return;
    const interval = setInterval(() => {
      setActiveIndex(prev => (prev + 1) % animes.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [animes.length]);

  if (!animes.length) return null;
  const current = animes[activeIndex];
  const hasBanner = Boolean(current.banner);

  return (
    <section style={{
      position: 'relative', height: '100vh', minHeight: 700,
      overflow: 'hidden', display: 'flex', alignItems: 'flex-end',
    }}>
      {/* Базовый фон: при наличии баннера оставляем фирменный градиент,
          иначе используем только изображение текущего тайтла. */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: hasBanner
          ? `radial-gradient(ellipse 80% 60% at 70% 30%, ${current.color}33, transparent 70%), radial-gradient(ellipse 60% 80% at 20% 80%, ${current.color}22, transparent 60%), linear-gradient(180deg, #08080E 0%, #0D0D16 100%)`
          : `linear-gradient(180deg, rgba(8,8,14,0.35) 0%, rgba(8,8,14,0.94) 75%, rgba(8,8,14,1) 100%), url('${currentImage}')`,
        backgroundSize: hasBanner ? 'auto' : 'cover',
        backgroundPosition: hasBanner ? 'center' : 'center 20%',
        transition: 'all 0.8s cubic-bezier(0.4,0,0.2,1)',
      }} />

      {/* Широкий баннер (если есть) */}
      {hasBanner && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `linear-gradient(180deg, rgba(8,8,14,0.3) 0%, rgba(8,8,14,0.92) 75%, rgba(8,8,14,1) 100%), url('${proxifyImageUrl(current.banner)}')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center 20%',
            opacity: 0.45,
            filter: 'saturate(1.1)',
            transition: 'opacity 0.6s',
          }}
        />
      )}

      {/* Декоративные окружности */}
      <div style={{
        position: 'absolute', top: '15%', right: '8%',
        width: 400, height: 400, borderRadius: '50%',
        border: `1px solid ${current.color}22`,
        transition: 'all 0.8s', pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', top: '25%', right: '12%',
        width: 250, height: 250, borderRadius: '50%',
        border: `1px solid ${current.color}33`,
        transition: 'all 0.8s', pointerEvents: 'none',
      }} />

      {/* Постер аниме (справа, большой, полупрозрачный) */}
      <div style={{
        position: 'absolute', top: '8%', right: '5%',
        width: 320, height: 450, borderRadius: 20,
        overflow: 'hidden', opacity: 0.25,
        maskImage: 'linear-gradient(to bottom, black 50%, transparent 100%)',
        WebkitMaskImage: 'linear-gradient(to bottom, black 50%, transparent 100%)',
        transition: 'opacity 0.5s',
        pointerEvents: 'none',
      }}>
        <Image
          src={currentImage}
          alt=""
          fill
          className="object-cover"
          sizes="320px"
          priority
          unoptimized={currentImageUnoptimized}
        />
      </div>

      {/* Основной контент */}
      <div style={{
        position: 'relative', zIndex: 2,
        padding: '0 40px 80px',
        display: 'flex', gap: 60, alignItems: 'flex-end',
        width: '100%', maxWidth: 1400, margin: '0 auto',
      }}>
        {/* Текстовая часть */}
        <div style={{ flex: 1 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: `${current.color}22`, border: `1px solid ${current.color}44`,
            borderRadius: 20, padding: '6px 14px', marginBottom: 20,
          }}>
            <div style={{
              width: 6, height: 6, borderRadius: '50%',
              background: current.color, boxShadow: `0 0 8px ${current.color}`,
            }} />
            <span style={{
              color: current.color, fontSize: 12, fontWeight: 600,
              fontFamily: 'var(--font-geist), sans-serif',
              letterSpacing: '0.05em', textTransform: 'uppercase',
            }}>В тренде #{activeIndex + 1}</span>
          </div>

          <h1 style={{
            fontFamily: 'var(--font-unbounded), sans-serif',
            fontSize: 'clamp(36px, 5vw, 56px)', fontWeight: 800,
            color: '#fff', lineHeight: 1.05, margin: '0 0 8px',
            letterSpacing: '-0.03em',
          }}>{current.title}</h1>

          <p style={{
            fontFamily: 'var(--font-noto-jp), sans-serif',
            fontSize: 18, color: 'rgba(255,255,255,0.3)',
            margin: '0 0 24px', letterSpacing: '0.05em',
          }}>{current.titleJp}</p>

          <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 28, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill={current.color}>
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
              <span style={{ color: '#fff', fontSize: 15, fontWeight: 700 }}>
                {current.rating.toFixed(1)}
              </span>
            </div>
            {current.episodes > 0 && <>
              <span style={{ color: 'rgba(255,255,255,0.2)' }}>•</span>
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>{current.episodes} эп.</span>
            </>}
            {current.studio && <>
              <span style={{ color: 'rgba(255,255,255,0.2)' }}>•</span>
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>{current.studio}</span>
            </>}
            {current.year > 0 && <>
              <span style={{ color: 'rgba(255,255,255,0.2)' }}>•</span>
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>{current.year}</span>
            </>}
          </div>

          {current.genres.length > 0 && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 32, flexWrap: 'wrap' }}>
              {current.genres.slice(0, 4).map(g => (
                <span key={g} style={{
                  padding: '5px 12px', borderRadius: 8,
                  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)',
                  color: 'rgba(255,255,255,0.6)', fontSize: 13,
                }}>{g}</span>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Link
              href={`/anime/${current.id}`}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 10,
                background: `linear-gradient(135deg, ${current.color}, ${current.color}CC)`,
                border: 'none', borderRadius: 14, padding: '14px 28px',
                color: '#fff', fontSize: 15, fontWeight: 700,
                textDecoration: 'none',
                boxShadow: `0 4px 24px ${current.color}44`,
                transition: 'transform 0.2s, box-shadow 0.2s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = `0 8px 32px ${current.color}66`;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = `0 4px 24px ${current.color}44`;
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff"><path d="M8 5v14l11-7z"/></svg>
              Смотреть
            </Link>
          </div>
        </div>

        {/* Мини-карусель */}
        <div style={{ display: 'flex', gap: 12, paddingBottom: 4, flexShrink: 0 }}>
          {animes.map((a, i) => (
            <button
              key={a.id}
              onClick={() => setActiveIndex(i)}
              style={{
                width: i === activeIndex ? 120 : 70,
                height: 170, borderRadius: 14,
                overflow: 'hidden', cursor: 'pointer',
                border: i === activeIndex ? `2px solid ${a.color}` : '2px solid transparent',
                boxShadow: i === activeIndex ? `0 0 24px ${a.color}44` : 'none',
                transition: 'all 0.4s cubic-bezier(0.4,0,0.2,1)',
                position: 'relative', flexShrink: 0,
                background: 'none', padding: 0,
              }}
            >
              <Image
                src={proxifyImageUrl(a.image)}
                alt={a.title}
                fill
                className="object-cover"
                sizes="120px"
                unoptimized={proxifyImageUrl(a.image).startsWith('/api/image?')}
              />
              <div style={{
                position: 'absolute', inset: 0,
                background: i === activeIndex
                  ? 'linear-gradient(transparent 50%, rgba(0,0,0,0.8))'
                  : 'rgba(0,0,0,0.5)',
              }} />
              <span style={{
                position: 'absolute', top: 8, left: 0, right: 0,
                textAlign: 'center',
                fontFamily: 'var(--font-unbounded), sans-serif',
                fontSize: 20, fontWeight: 800,
                color: i === activeIndex ? a.color : `${a.color}88`,
              }}>{i + 1}</span>
              {i === activeIndex && (
                <p style={{
                  position: 'absolute', bottom: 8, left: 0, right: 0,
                  textAlign: 'center',
                  fontSize: 10, color: '#fff', fontWeight: 600, margin: 0,
                  padding: '0 6px',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>{a.title}</p>
              )}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
