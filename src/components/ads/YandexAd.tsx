'use client';

import { useEffect } from 'react';

interface YandexAdProps {
  blockId: string;
  className?: string;
  style?: React.CSSProperties;
}

export function YandexAd({ blockId, className, style }: YandexAdProps) {
  const containerId = `yandex_rtb_${blockId}`;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const w = window as unknown as { yaContextCb?: Array<() => void>; Ya?: { Context?: { AdvManager?: { render: (opts: Record<string, string>) => void } } } };
    if (!w.yaContextCb) return;
    w.yaContextCb.push(() => {
      w.Ya?.Context?.AdvManager?.render({
        blockId,
        renderTo: containerId,
      });
    });
  }, [blockId, containerId]);

  return (
    <div className={className} style={style}>
      <div id={containerId} />
    </div>
  );
}
