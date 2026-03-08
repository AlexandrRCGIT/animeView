'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

const TV_STORAGE_KEY = 'animeview_tv_mode';
const TV_QUERY_KEY = 'tv';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

type MoveDirection = 'up' | 'down' | 'left' | 'right';

function isEditableElement(element: HTMLElement | null): boolean {
  if (!element) return false;
  if (element.closest('[data-tv-skip-nav="true"]')) return true;
  const tag = element.tagName.toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
  if (element.isContentEditable) return true;
  return false;
}

function isVisible(element: HTMLElement): boolean {
  if (!(element.offsetWidth || element.offsetHeight || element.getClientRects().length)) return false;
  const style = window.getComputedStyle(element);
  if (style.visibility === 'hidden' || style.display === 'none') return false;
  return !element.hasAttribute('disabled') && element.getAttribute('aria-hidden') !== 'true';
}

function collectFocusable(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(isVisible);
}

function focusElement(element: HTMLElement) {
  element.focus({ preventScroll: true });
  element.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
}

function pickByDirection(current: HTMLElement, candidates: HTMLElement[], direction: MoveDirection): HTMLElement | null {
  const currentRect = current.getBoundingClientRect();
  const currentX = currentRect.left + currentRect.width / 2;
  const currentY = currentRect.top + currentRect.height / 2;

  let best: { element: HTMLElement; score: number } | null = null;

  for (const candidate of candidates) {
    if (candidate === current) continue;
    const rect = candidate.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const dx = x - currentX;
    const dy = y - currentY;

    if (direction === 'up' && dy >= -4) continue;
    if (direction === 'down' && dy <= 4) continue;
    if (direction === 'left' && dx >= -4) continue;
    if (direction === 'right' && dx <= 4) continue;

    const primary = direction === 'up' || direction === 'down' ? Math.abs(dy) : Math.abs(dx);
    const secondary = direction === 'up' || direction === 'down' ? Math.abs(dx) : Math.abs(dy);
    const score = primary * 1000 + secondary;

    if (!best || score < best.score) {
      best = { element: candidate, score };
    }
  }

  return best?.element ?? null;
}

function parseForcedTvMode(search: URLSearchParams): boolean | null {
  const forced = search.get(TV_QUERY_KEY);
  if (forced === '1' || forced === 'true') return true;
  if (forced === '0' || forced === 'false') return false;
  return null;
}

function resolveTvMode(search: URLSearchParams, autoMatch: boolean): boolean {
  const forced = parseForcedTvMode(search);
  if (forced !== null) return forced;

  try {
    const stored = localStorage.getItem(TV_STORAGE_KEY);
    if (stored === '1') return true;
    if (stored === '0') return false;
  } catch {}

  return autoMatch;
}

function ensureFocus() {
  const active = document.activeElement as HTMLElement | null;
  if (active && active !== document.body && isVisible(active)) return;

  const preferred = document.querySelector<HTMLElement>('[data-tv-default="true"]');
  if (preferred && isVisible(preferred)) {
    focusElement(preferred);
    return;
  }

  const mainPreferred = Array.from(
    document.querySelectorAll<HTMLElement>(`main ${FOCUSABLE_SELECTOR}`),
  ).find(isVisible);

  if (mainPreferred) {
    focusElement(mainPreferred);
    return;
  }

  const first = collectFocusable()[0];
  if (first) focusElement(first);
}

export function TvModeProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const serializedSearch = useMemo(() => searchParams.toString(), [searchParams]);
  const [isTvMode, setIsTvMode] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(min-width: 1200px) and (hover: none) and (pointer: coarse)');
    const sync = () => {
      const search = new URLSearchParams(serializedSearch);
      const forced = parseForcedTvMode(search);
      if (forced !== null) {
        try {
          localStorage.setItem(TV_STORAGE_KEY, forced ? '1' : '0');
        } catch {}
      }
      const mode = resolveTvMode(search, media.matches);
      setIsTvMode(mode);
    };

    sync();
    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', sync);
      return () => media.removeEventListener('change', sync);
    }

    media.addListener(sync);
    return () => media.removeListener(sync);
  }, [serializedSearch]);

  useEffect(() => {
    document.documentElement.classList.toggle('tv-mode', isTvMode);
    document.body.classList.toggle('tv-mode', isTvMode);
    document.body.dataset.tvMode = isTvMode ? '1' : '0';
  }, [isTvMode]);

  useEffect(() => {
    if (!isTvMode) return;

    const timer = window.setTimeout(() => ensureFocus(), 80);
    return () => window.clearTimeout(timer);
  }, [isTvMode, pathname, serializedSearch]);

  useEffect(() => {
    if (!isTvMode) return;

    function onKeyDown(event: KeyboardEvent) {
      const active = document.activeElement as HTMLElement | null;
      if (isEditableElement(active)) return;
      if (active?.tagName === 'IFRAME') return;

      const keyDirectionMap: Record<string, MoveDirection> = {
        ArrowUp: 'up',
        ArrowDown: 'down',
        ArrowLeft: 'left',
        ArrowRight: 'right',
      };

      const direction = keyDirectionMap[event.key];
      if (direction) {
        event.preventDefault();
        const focusables = collectFocusable();
        if (!focusables.length) return;

        if (!active || !focusables.includes(active)) {
          focusElement(focusables[0]);
          return;
        }

        const byDirection = pickByDirection(active, focusables, direction);
        if (byDirection) {
          focusElement(byDirection);
          return;
        }

        const idx = focusables.indexOf(active);
        const fallback =
          direction === 'down' || direction === 'right'
            ? focusables[Math.min(idx + 1, focusables.length - 1)]
            : focusables[Math.max(idx - 1, 0)];
        if (fallback) focusElement(fallback);
        return;
      }

      if (event.key === 'Enter' || event.key === ' ') {
        if (!active) return;
        const tag = active.tagName.toLowerCase();
        if (tag === 'button' || tag === 'a' || active.getAttribute('role') === 'button') {
          event.preventDefault();
          active.click();
        }
        return;
      }

      if (event.key === 'BrowserBack' || event.key === 'GoBack' || event.key === 'Backspace') {
        event.preventDefault();
        if (window.history.length > 1) {
          window.history.back();
        } else {
          window.location.href = '/';
        }
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isTvMode]);

  return children;
}
