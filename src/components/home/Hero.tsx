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
  const [textKey, setTextKey] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 900px)');
    const apply = () => setIsMobile(media.matches);
    apply();
    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', apply);
      return () => media.removeEventListener('change', apply);
    }
    media.addListener(apply);
    return () => media.removeListener(apply);
  }, []);

  useEffect(() => {
    if (animes.length <= 1) return;
    const interval = setInterval(() => {
      setActiveIndex(prev => (prev + 1) % animes.length);
      setTextKey(prev => prev + 1);
    }, 5000);
    return () => clearInterval(interval);
  }, [animes.length]);

  function goTo(i: number) {
    setActiveIndex(i);
    setTextKey(prev => prev + 1);
  }

  if (!animes.length) return null;
  const current = animes[activeIndex];

  return (
    <section style={{
      position: 'relative', height: '100vh', minHeight: isMobile ? 620 : 700,
      overflow: 'hidden', display: 'flex', alignItems: 'flex-end',
    }}>
      {/* Фоновые слои — все рендерятся, активный плавно появляется */}
      {animes.map((a, i) => {
        const img = proxifyImageUrl(a.image);
        const hasBanner = Boolean(a.banner);
        return (
          <div
            key={a.id}
            style={{
              position: 'absolute', inset: 0,
              opacity: i === activeIndex ? 1 : 0,
              transition: 'opacity 0.9s ease-in-out',
            }}
          >
            {/* Базовый фон */}
            <div style={{
              position: 'absolute', inset: 0,
              backgroundImage: hasBanner
                ? `radial-gradient(ellipse 80% 60% at 70% 30%, ${a.color}33, transparent 70%), radial-gradient(ellipse 60% 80% at 20% 80%, ${a.color}22, transparent 60%), linear-gradient(180deg, #08080E 0%, #0D0D16 100%)`
                : `linear-gradient(180deg, rgba(8,8,14,0.35) 0%, rgba(8,8,14,0.94) 75%, rgba(8,8,14,1) 100%), url('${img}')`,
              backgroundSize: hasBanner ? 'auto' : 'cover',
              backgroundPosition: hasBanner ? 'center' : 'center 20%',
            }} />
            {/* Баннер */}
            {hasBanner && (
              <div style={{
                position: 'absolute', inset: 0,
                backgroundImage: `linear-gradient(180deg, rgba(8,8,14,0.3) 0%, rgba(8,8,14,0.92) 75%, rgba(8,8,14,1) 100%), url('${proxifyImageUrl(a.banner!)}')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center 20%',
                opacity: 0.45,
                filter: 'saturate(1.1)',
              }} />
            )}
          </div>
        );
      })}

      {/* Декоративные окружности */}
      {!isMobile && (
        <>
          <div style={{
            position: 'absolute', top: '15%', right: '8%',
            width: 400, height: 400, borderRadius: '50%',
            border: `1px solid ${current.color}22`,
            transition: 'border-color 0.9s', pointerEvents: 'none', zIndex: 1,
          }} />
          <div style={{
            position: 'absolute', top: '25%', right: '12%',
            width: 250, height: 250, borderRadius: '50%',
            border: `1px solid ${current.color}33`,
            transition: 'border-color 0.9s', pointerEvents: 'none', zIndex: 1,
          }} />
        </>
      )}

      {/* Постеры — все рендерятся, активный плавно появляется */}
      {!isMobile && animes.map((a, i) => {
        const img = proxifyImageUrl(a.image);
        return (
          <div
            key={a.id}
            style={{
              position: 'absolute', top: '8%', right: '5%',
              width: 320, height: 450, borderRadius: 20,
              overflow: 'hidden',
              opacity: i === activeIndex ? 0.25 : 0,
              transition: 'opacity 0.9s ease-in-out',
              maskImage: 'linear-gradient(to bottom, black 50%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(to bottom, black 50%, transparent 100%)',
              pointerEvents: 'none', zIndex: 1,
            }}
          >
            <Image
              src={img}
              alt=""
              fill
              className="object-cover"
              sizes="320px"
              priority={i === 0}
              loading={i === 0 ? 'eager' : 'lazy'}
              unoptimized={img.startsWith('/api/image?')}
            />
          </div>
        );
      })}

      {/* Основной контент */}
      <div style={{
        position: 'relative', zIndex: 2,
        padding: `0 clamp(14px, 4vw, 40px) ${isMobile ? '20px' : '80px'}`,
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        gap: isMobile ? 18 : 60,
        alignItems: isMobile ? 'stretch' : 'flex-end',
        width: '100%', maxWidth: 1400, margin: '0 auto',
      }}>
        {/* Текст — перерендеривается с fade при смене слайда */}
        <div
          key={textKey}
          style={{
            flex: 1,
            animation: 'heroFadeIn 0.6s ease forwards',
          }}
        >
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
            fontSize: 'clamp(14px, 2.2vw, 18px)', color: 'rgba(255,255,255,0.3)',
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
                border: 'none', borderRadius: 14, padding: isMobile ? '12px 18px' : '14px 28px',
                color: '#fff', fontSize: isMobile ? 14 : 15, fontWeight: 700,
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
        <div style={{
          display: 'flex',
          gap: 12,
          paddingBottom: 4,
          flexShrink: 0,
          width: isMobile ? '100%' : undefined,
          overflowX: isMobile ? 'auto' : 'visible',
        }}>
          {animes.map((a, i) => (
            <button
              key={a.id}
              onClick={() => goTo(i)}
              style={{
                width: i === activeIndex ? (isMobile ? 98 : 120) : (isMobile ? 62 : 70),
                height: isMobile ? 140 : 170, borderRadius: 14,
                overflow: 'hidden', cursor: 'pointer',
                border: i === activeIndex ? `2px solid ${a.color}` : '2px solid transparent',
                boxShadow: i === activeIndex ? `0 0 24px ${a.color}44` : 'none',
                transition: 'all 0.4s cubic-bezier(0.4,0,0.2,1)',
                position: 'relative', flexShrink: 0,
                background: 'none', padding: 0,
              }}
            >
              <Image
                src={proxifyImageUrl(a.image, 240)}
                alt={a.title}
                fill
                className="object-cover"
                sizes="120px"
                unoptimized
                priority={i === 0}
                loading={i === 0 ? 'eager' : 'lazy'}
              />
              <div style={{
                position: 'absolute', inset: 0,
                background: i === activeIndex
                  ? 'linear-gradient(transparent 50%, rgba(0,0,0,0.8))'
                  : 'rgba(0,0,0,0.5)',
                transition: 'background 0.4s',
              }} />
              <span style={{
                position: 'absolute', top: 8, left: 0, right: 0,
                textAlign: 'center',
                fontFamily: 'var(--font-unbounded), sans-serif',
                fontSize: 20, fontWeight: 800,
                color: i === activeIndex ? a.color : `${a.color}88`,
                transition: 'color 0.4s',
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

      <style>{`
        @keyframes heroFadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </section>
  );
}
