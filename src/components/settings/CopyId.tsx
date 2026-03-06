'use client';

import { useState } from 'react';

const PREFIXES = ['credentials:', 'discord:', 'telegram:'];

function stripPrefix(id: string) {
  for (const p of PREFIXES) {
    if (id.startsWith(p)) return id.slice(p.length);
  }
  return id;
}

export function CopyId({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const display = stripPrefix(value);

  function copy() {
    navigator.clipboard.writeText(display).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="flex items-center gap-2">
      <code className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-400 font-mono truncate">
        {display}
      </code>
      <button
        onClick={copy}
        className="flex-none px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white text-xs font-medium transition-colors"
      >
        {copied ? 'Скопировано' : 'Копировать'}
      </button>
    </div>
  );
}
