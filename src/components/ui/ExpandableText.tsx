'use client';

import { useState } from 'react';

interface ExpandableTextProps {
  text: string;
  limit?: number; // символов до обрезки
  className?: string;
}

export function ExpandableText({ text, limit = 220, className = '' }: ExpandableTextProps) {
  const [expanded, setExpanded] = useState(false);

  const isLong = text.length > limit;
  const visible = !isLong || expanded ? text : text.slice(0, limit).trimEnd() + '…';

  return (
    <div className={className}>
      <p className="text-xs text-zinc-500 leading-relaxed">
        {visible}
      </p>
      {isLong && (
        <button
          onClick={(e) => {
            e.preventDefault(); // не переходить по ссылке карточки
            setExpanded((v) => !v);
          }}
          className="mt-1 text-xs text-violet-400 hover:text-violet-300 transition-colors font-medium"
        >
          {expanded ? 'Скрыть' : 'Больше'}
        </button>
      )}
    </div>
  );
}
