import { supabase } from '@/lib/supabase';

const MIN_RATING = 7.5;
const MAX_LEN = 4096;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://anime-view.org';

interface AnimeRow {
  shikimori_id: number;
  title: string;
  anime_status: string | null;
  anime_kind: string | null;
  shikimori_rating: number | null;
  last_season: number | null;
  last_episode: number | null;
  episodes_count: number | null;
}

export async function notifyTelegramDigest(syncedIds: number[]): Promise<void> {
  const botToken = process.env.TG_NOTIFY_BOT_TOKEN;
  const chatId = process.env.TG_NOTIFY_CHAT_ID;

  if (!botToken || !chatId || syncedIds.length === 0) return;

  const { data, error } = await supabase
    .from('anime')
    .select('shikimori_id, title, anime_status, anime_kind, shikimori_rating, last_season, last_episode, episodes_count')
    .in('shikimori_id', syncedIds)
    .gte('shikimori_rating', MIN_RATING)
    .order('shikimori_rating', { ascending: false });

  if (error || !data || data.length === 0) return;

  const ongoings = (data as AnimeRow[]).filter(a => a.anime_status === 'ongoing');
  const newTitles = (data as AnimeRow[]).filter(a => a.anime_status !== 'ongoing');

  const header = `📅 <b>Обновление ${formatDate()}</b>`;
  const lines: string[] = [header];

  if (newTitles.length > 0) {
    lines.push('', '🆕 <b>Новинки</b>');
    for (const a of newTitles) {
      const line = formatLine(a);
      if ((lines.join('\n') + '\n' + line).length > MAX_LEN - 100) break;
      lines.push(line);
    }
  }

  if (ongoings.length > 0) {
    lines.push('', '📺 <b>Онгоинги</b>');
    for (const a of ongoings) {
      const line = formatLine(a);
      if ((lines.join('\n') + '\n' + line).length > MAX_LEN - 50) break;
      lines.push(line);
    }
  }

  const text = lines.join('\n');

  const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    }),
  });

  if (!res.ok) {
    console.error('[notifyTelegram] sendMessage error:', await res.text());
    return;
  }

  console.log(`[notifyTelegram] Sent: ${newTitles.length} new, ${ongoings.length} ongoing`);
}

function formatLine(a: AnimeRow): string {
  const rating = a.shikimori_rating ? `★${a.shikimori_rating.toFixed(1)}` : '';
  const kind = formatKind(a.anime_kind);
  const episode = a.anime_status === 'ongoing' && a.last_episode
    ? ` · S${a.last_season ?? 1}E${a.last_episode}`
    : a.episodes_count ? ` · ${a.episodes_count} эп.` : '';
  const url = `${APP_URL}/anime/${a.shikimori_id}`;

  return `• <a href="${url}">${escapeHtml(a.title)}</a> ${rating}${kind ? ` · ${kind}` : ''}${episode}`;
}

function formatKind(kind: string | null): string {
  const map: Record<string, string> = {
    tv: 'сериал', movie: 'фильм', ova: 'OVA',
    ona: 'ONA', special: 'спешл', music: 'клип',
  };
  return kind ? (map[kind] ?? kind) : '';
}

function formatDate(): string {
  return new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
