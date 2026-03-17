'use client';

import Link from 'next/link';
import Script from 'next/script';

export function HomeFooter() {
  return (
    <footer style={{
      width: 'min(1400px, calc(100% - clamp(28px, 8vw, 80px)))',
      padding: 'clamp(16px, 4vw, 40px)',
      margin: '0 auto',
      borderTop: '1px solid rgba(255,255,255,0.06)',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      flexWrap: 'wrap', gap: 16,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 24, height: 24, borderRadius: 6,
          background: 'linear-gradient(135deg, #E13C6E, #6C3CE1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 900, color: '#fff',
          fontFamily: 'var(--font-unbounded), sans-serif',
        }}>A</div>
        <span style={{
          fontFamily: 'var(--font-unbounded), sans-serif',
          fontWeight: 600, fontSize: 14, color: 'rgba(255,255,255,0.4)',
        }}>AnimeView</span>
      </div>
      <div style={{ display: 'flex', gap: 24 }}>
        {[
          { label: 'Каталог', href: '/search' },
          { label: 'Избранное', href: '/favorites' },
        ].map(({ label, href }) => (
          <Link key={label} href={href} style={{
            color: 'rgba(255,255,255,0.3)', fontSize: 13,
            textDecoration: 'none', transition: 'color 0.2s',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.6)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.3)')}
          >{label}</Link>
        ))}
      </div>

      <div style={{ display: 'inline-flex', alignItems: 'center' }}>
        <Script
          id="prcy-sqi-counter"
          strategy="afterInteractive"
        >
          {`!function(e,t,r){e.PrcyCounterObject=r,e[r]=e[r]||function(){(e[r].q=e[r].q||[]).push(arguments)};var c=document.createElement("script");c.type="text/javascript",c.async=1,c.src=t;var n=document.getElementsByTagName("script")[0];n.parentNode.insertBefore(c,n)}(window,"https://a.pr-cy.ru/assets/js/counter.sqi.min.js","prcyCounter"),prcyCounter("anime-view.org","prcyru-sqi-counter",1);`}
        </Script>
        <div id="prcyru-sqi-counter" />
        <noscript>
          <a href="https://pr-cy.ru/" target="_blank" rel="noreferrer">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://a.pr-cy.ru/assets/img/analysis-counter.png"
              width={88}
              height={31}
              alt="Проверка икс"
            />
          </a>
        </noscript>
      </div>
    </footer>
  );
}
